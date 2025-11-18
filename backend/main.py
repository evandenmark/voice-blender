# mcd_server.py
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import librosa
import soundfile as sf
import io

app = FastAPI()

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,          # or ["*"] to allow all, for dev
    allow_credentials=True,
    allow_methods=["*"],            # GET, POST, etc.
    allow_headers=["*"],            # Authorization, Content-Type, etc.
)

def get_mfcc_from_bytes(raw_bytes, target_sr=16000, n_mfcc=13):
    """Convert raw audio bytes to MFCC matrix (frames, coeffs)."""
    buf = io.BytesIO(raw_bytes)
    y, sr = sf.read(buf, always_2d=False)

    # If stereo, convert to mono
    if y.ndim > 1:
        y = np.mean(y, axis=1)

    # Resample if needed
    if sr != target_sr:
        y = librosa.resample(y, orig_sr=sr, target_sr=target_sr)
        sr = target_sr

     # Trim leading / trailing silence to reduce huge silent regions
    y, _ = librosa.effects.trim(y, top_db=30)

    # Compute MFCCs: shape (n_mfcc, n_frames)
    mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=n_mfcc)
    # Transpose to (frames, coeffs)
    return mfcc.T

def mcd(mfcc1, mfcc2):
    """
    Mel-cepstral distortion between two MFCC sequences.
    mfcc1, mfcc2: shape (frames, coeffs)
    """
    # Align in time: use min number of frames
    min_frames = min(len(mfcc1), len(mfcc2))
    mfcc1 = mfcc1[:min_frames]
    mfcc2 = mfcc2[:min_frames]

    # Exclude c0 (zeroth coefficient) as it represents log energy
    # Standard MCD formula uses only c1, c2, ..., cK (coefficients 1 to K)
    mfcc1_no_c0 = mfcc1[:, 1:]  # Skip first column (c0)
    mfcc2_no_c0 = mfcc2[:, 1:]  # Skip first column (c0)

    diff = mfcc1_no_c0 - mfcc2_no_c0  # (frames, coeffs-1)
    diff_sq = diff ** 2
    # Sum over coeffs, then apply MCD formula per-frame
    # Formula: MCD = (10/ln(10)) * sqrt(2 * sum_k (c1_k - c2_k)^2)
    mcd_frame = (10.0 / np.log(10)) * np.sqrt(2.0 * np.sum(diff_sq, axis=1))
    # Return average MCD over time
    return float(np.mean(mcd_frame))

def mcd_dtw(mfcc1, mfcc2):
    """
    Mel-Cepstral Distortion with Dynamic Time Warping alignment.

    mfcc1, mfcc2: arrays of shape (frames, coeffs)
    Uses coefficients 1–12 (excludes c0) and aligns time using DTW.
    """
    # Use only coeffs 1..12, exclude c0 (energy)
    mfcc1 = mfcc1[:, 1:13]
    mfcc2 = mfcc2[:, 1:13]

    # Librosa's DTW expects (features, time) so transpose:
    # X: (n_features, n_frames)
    X = mfcc1.T
    Y = mfcc2.T

    # Compute DTW alignment path using Euclidean distance in MFCC space
    # D: cost matrix, wp: warping path as list of (i, j) frame indices
    D, wp = librosa.sequence.dtw(X=X, Y=Y, metric="euclidean")

    # wp is from end to start; order doesn’t matter for the mean, but
    # you can reverse it if you like:
    # wp = wp[::-1]

    # Accumulate per-pair MCD along the path
    mcd_values = []
    for i, j in wp:
        # i, j are indices into frames
        diff = mfcc1[i] - mfcc2[j]          # (12,)
        diff_sq_sum = np.sum(diff ** 2)
        # Classic MCD formula for a single frame pair:
        mcd_ij = (10.0 / np.log(10)) * np.sqrt(2.0 * diff_sq_sum)
        mcd_values.append(mcd_ij)

    if len(mcd_values) == 0:
        return 0.0

    return float(np.mean(mcd_values))


@app.post("/mcd")
async def compute_mcd(
    voice_ref: UploadFile = File(...),   # e.g., voice A
    voice_test: UploadFile = File(...)   # e.g., blend or voice B
):
    """Compute MCD between two uploaded audio files."""
    raw_ref = await voice_ref.read()
    raw_test = await voice_test.read()

    mfcc_ref = get_mfcc_from_bytes(raw_ref)
    mfcc_test = get_mfcc_from_bytes(raw_test)

    # value = mcd(mfcc_ref, mfcc_test)
    # DTW-based MCD
    value = mcd_dtw(mfcc_ref, mfcc_test)

    return JSONResponse({
        "mcd": value
    })

# ElevenLabs & Cartesia Voice Blender

A React-based UI for blending multiple voices using the ElevenLabs API. Select two voices and use the interactive 2D slider to control the blend ratio.

## Substack

A detailed review of this experiment can be found on [Substack](https://evandenmark.substack.com/p/voice-blending-with-elevenlabs-cartesia). 


## Features

- Select from available ElevenLabs voices
- Draggable slider for voice blending control
- Real-time audio generation and playback
- Audio Analysis of blended results

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure API Key:**
   Create a `.env` file in the root directory:
   ```
   VITE_ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
   VITE_CARTESIA_API_KEY=your_cartesia_api_key
   ```

3. **Install the spectrogram viewer**
   ```
   npm i react-audio-spectrogram-player
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   Navigate to the URL shown in the terminal (typically `http://localhost:5173`)

## Run the Backend Python server

1. **Install dependencies**
```
pip install fastapi uvicorn librosa soundfile numpy
```

2. **Run the backend server**
```
python -m uvicorn backend.main:app --reload --port 8000
```

3. This should run the backend API on `localhost:8000`

## Usage

1. Select two voices from the dropdown menus
2. Drag the handle in the slider to adjust the blend ratio:
   - Moving left/right adjusts the ratio between Voice 1 and Voice 2
3. Choose the Blending Method algorithm
4. Click "Blend Voices" to generate the blended audio
5. Play the result using the audio player

## Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.


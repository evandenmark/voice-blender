import { useState, useEffect } from 'react'
import { getVoices, blendVoices } from '../services/elevenlabs'
import TwoDSlider from './TwoDSlider'
import SpectrogramPlayer from "react-audio-spectrogram-player";
import './VoiceBlender.css'

function VoiceBlender() {
  const [voices, setVoices] = useState([])
  const [selectedVoices, setSelectedVoices] = useState([null, null])
  const [selectedVoiceNames, setSelectedVoiceNames] = useState(['', ''])
  const [blendPosition, setBlendPosition] = useState({ x: 0.5, y: 0.5 })
  const [text, setText] = useState('Hello, this is a blended voice demonstration.')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [audioUrl, setAudioUrl] = useState(null)
  const [primarySampleUrl, setPrimarySampleUrl] = useState(null)
  const [secondarySampleUrl, setSecondarySampleUrl] = useState(null)
  const [blendMethod, setBlendMethod] = useState("speech2speech")
  const [showSpectrogram, setShowSpectrogram] = useState(false)
  const [primaryMCD, setPrimaryMCD] = useState(null)
  const [secondaryMCD, setSecondaryMCD] = useState(null)
  // Mapping of voice_id to voice name for quick lookup
  const voiceIdToName = voices.reduce((map, voice) => {
    map[voice.voice_id] = voice.name
    return map
  }, {})

  useEffect(() => {
    loadVoices()
  }, [])

  const loadVoices = async () => {
    try {
      setLoading(true)
      setError(null)
      const voiceList = await getVoices()
      setVoices(voiceList)
    } catch (err) {
      setError(`Failed to load voices: ${err.message}`)
      console.error('Error loading voices:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleVoiceSelect = (index, voiceId) => {
    const newSelected = [...selectedVoices]
    newSelected[index] = voiceId
    setSelectedVoices(newSelected)

    const newSelectedVoiceNames = [...selectedVoiceNames]
    newSelectedVoiceNames[index] = voiceIdToName[voiceId] || 'Unknown Voice'
    setSelectedVoiceNames(newSelectedVoiceNames)
  }

  const handleBlend = async () => {
    if (!selectedVoices[0] || !selectedVoices[1]) {
      setError('Please select two voices')
      return
    }

    if (!text.trim()) {
      setError('Please enter text to speak')
      return
    }

    try {
      setLoading(true)
      setError(null)
      const result = await blendVoices(selectedVoices, blendPosition, text, blendMethod, voiceIdToName, primaryMCD, secondaryMCD)
      if (result.audioUrl) {
        setAudioUrl(result.audioUrl)
        // Set primary and secondary sample URLs if available
        if (result.primarySampleUrl) {
          setPrimarySampleUrl(result.primarySampleUrl)
        }
        if (result.secondarySampleUrl) {
          setSecondarySampleUrl(result.secondarySampleUrl)
        }
        setPrimaryMCD(result.primaryMCD)
        setSecondaryMCD(result.secondaryMCD)
      } else {
        setError('Blending completed but no audio URL returned')
      }
    } catch (err) {
      setError(`Failed to blend voices: ${err.message}`)
      console.error('Error blending voices:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSliderChange = (position) => {
    setBlendPosition(position)
  }

  return (
    <div className="voice-blender">
      <div className="voice-selection">
        <h2>Select Voices</h2>
        <div className="voice-selectors">
          {[0, 1].map((index) => (
            <div key={index} className="voice-selector">
              <label>Voice {index + 1}:</label>
              <select
                value={selectedVoices[index] || ''}
                onChange={(e) => handleVoiceSelect(index, e.target.value)}
                disabled={loading}
              >
                <option value="">-- Select a voice --</option>
                {voices.map((voice) => (
                  <option key={voice.voice_id} value={voice.voice_id}>
                    {voice.name}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      <div className="text-input-section">
        <h2>Text to Speak</h2>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter the text you want the blended voice to speak..."
          disabled={loading}
          className="text-input"
          rows={4}
        />
      </div>
      <div className="blend-method-section">
        <h2>Blend Method</h2>
        <div className="view-toggle">
        <button
          type="button"
          className={`blend-method-btn${blendMethod === "speech2speech" ? " active" : ""}`}
          onClick={() => setBlendMethod("speech2speech")}
          disabled={loading}
        >
          11Labs: Speech
        </button>
        <button
          type="button"
          className={`blend-method-btn${blendMethod === "text" ? " active" : ""}`}
          onClick={() => setBlendMethod("text")}
          disabled={loading}
        >
          11Labs: Text
        </button>
        <button
          type="button"
          className={`blend-method-btn${blendMethod === "ivc" ? " active" : ""}`}
          onClick={() => {
            setBlendMethod("ivc");
            setBlendPosition({ x: 0.5, y: 0.5 });
        }}
          disabled={loading}
        >
          11Labs: IVC
        </button>
        <button
          type="button"
          className={`blend-method-btn${blendMethod === "cartesia" ? " active" : ""}`}
          onClick={() => setBlendMethod("cartesia")}
          disabled={loading}
        >
          Cartesia
        </button>
        </div>
      </div>

      <div className="blend-control">
        <h2>Blend Control</h2>
        <p className="blend-info">
          Drag the handle to adjust the blend ratio between the two voices. For IVC, the handle is fixed at 50%.
        </p>
        <TwoDSlider
          position={blendPosition}
          onChange={handleSliderChange}
          disabled={loading || blendMethod === "ivc"}
        />
        <div className="blend-values">
          <div>Voice 1: {Math.round((1 - blendPosition.x) * 100)}%</div>
          <div>Voice 2: {Math.round(blendPosition.x * 100)}%</div>
        </div>
      </div>

      <div className="actions">
        <button
          onClick={handleBlend}
          disabled={loading || !selectedVoices[0] || !selectedVoices[1] || !text.trim()}
          className="blend-button"
        >
          {loading ? 'Blending...' : 'Blend Voices'}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {(primarySampleUrl || secondarySampleUrl || audioUrl) && (
        <div className="view-toggle">
          <button
            type="button"
            className={`view-toggle-btn${!showSpectrogram ? " active" : ""}`}
            onClick={() => setShowSpectrogram(false)}
          >
            Audio Player
          </button>
          <button
            type="button"
            className={`view-toggle-btn${showSpectrogram ? " active" : ""}`}
            onClick={() => setShowSpectrogram(true)}
          >
            Spectrogram
          </button>
        </div>
      )}

      {primarySampleUrl && (
        <div className="audio-player">
          <h3>Primary Voice</h3>
          {showSpectrogram ? (
            <SpectrogramPlayer
              src={primarySampleUrl}
              navigator={true}
            />
          ) : (
            <audio controls src={primarySampleUrl} className="audio-element">
              Your browser does not support the audio element.
            </audio>
          )}
        </div>
      )}

      {secondarySampleUrl && (
        <div className="audio-player">
          <h3>Secondary Voice</h3>
          {showSpectrogram ? (
            <SpectrogramPlayer
              src={secondarySampleUrl}
              navigator={true}
            />
          ) : (
            <audio controls src={secondarySampleUrl} className="audio-element">
              Your browser does not support the audio element.
            </audio>
          )}
        </div>
      )}

      {audioUrl && (
        <div className="audio-player">
          <h3>Blended Voice Result</h3>
          {showSpectrogram ? (
            <SpectrogramPlayer
              src={audioUrl}
              navigator={true}
            />
          ) : (
            <audio controls src={audioUrl} className="audio-element">
              Your browser does not support the audio element.
            </audio>
          )}
        </div>
      )}
      {
        showSpectrogram && primaryMCD !== null && secondaryMCD !== null && (
          <div className="mcd-values">
            <div><b>Primary MCD:</b> {Math.round(primaryMCD)}</div>
            <div><b>Secondary MCD:</b> {Math.round(secondaryMCD)}</div>
            <div><b>Abs Difference:</b> {Math.round(Math.abs(primaryMCD - secondaryMCD))}</div>
          </div>
        )
      }
    </div>
  )
}

export default VoiceBlender


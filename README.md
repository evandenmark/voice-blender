<<<<<<< HEAD
# voice-blender
Blending two voices together, using ElevenLabs and Cartesia
=======
# ElevenLabs Voice Blender

A React-based UI for blending multiple voices using the ElevenLabs API. Select two voices and use the interactive 2D slider to control the blend ratio.

## Features

- 🎙️ Select from available ElevenLabs voices
- 🎚️ Interactive 2D draggable slider for voice blending control
- 🎵 Real-time audio generation and playback
- 🎨 Modern, responsive UI

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure API Key:**
   Create a `.env` file in the root directory:
   ```
   VITE_ELEVENLABS_API_KEY=your_api_key_here
   ```
   Replace `your_api_key_here` with your actual ElevenLabs API key.

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to the URL shown in the terminal (typically `http://localhost:5173`)

## Usage

1. Select two voices from the dropdown menus
2. Drag the handle in the 2D slider to adjust the blend ratio:
   - Moving left/right adjusts the ratio between Voice 1 and Voice 2
   - Moving up/down can be used for additional control (currently mapped to the same blend ratio)
3. Click "Blend Voices" to generate the blended audio
4. Play the result using the audio player

## Project Structure

```
src/
  ├── components/
  │   ├── VoiceBlender.jsx    # Main voice blending component
  │   └── TwoDSlider.jsx      # 2D draggable slider component
  ├── services/
  │   └── elevenlabs.js       # ElevenLabs API integration
  ├── App.jsx                 # Main app component
  ├── main.jsx                # Entry point
  └── index.css               # Global styles
```

## Notes

- The current implementation uses ElevenLabs' text-to-speech API with the primary voice based on the blend ratio
- Full voice blending capabilities may require ElevenLabs' voice cloning or remixing features
- The 2D slider currently uses the X-axis for blend control; the Y-axis can be extended for additional parameters

## Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

>>>>>>> 7dc9388 (first three methods of ElevenLabs working)

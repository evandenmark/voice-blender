import VoiceBlender from './components/VoiceBlender'
import './App.css'

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>🎙️ ElevenLabs Voice Blender</h1>
        <p>Select voices and blend them using the 2D slider</p>
      </header>
      <main className="app-main">
        <VoiceBlender />
      </main>
    </div>
  )
}

export default App


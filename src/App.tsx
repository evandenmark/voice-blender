import VoiceBlender from './components/VoiceBlender'
import './App.css'

function App(): JSX.Element {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Voice Blender</h1>
      </header>
      <main className="app-main">
        <VoiceBlender />
      </main>
    </div>
  )
}

export default App


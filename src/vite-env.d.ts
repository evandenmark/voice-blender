/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ELEVENLABS_API_KEY: string
  readonly VITE_CARTESIA_API_KEY: string
  readonly VITE_CARTESIA_VERSION: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}


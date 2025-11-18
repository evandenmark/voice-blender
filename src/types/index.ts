/**
 * Type definitions for the Voice Blender application
 */

export interface Voice {
  voice_id: string
  name: string
  [key: string]: unknown
}

export interface BlendPosition {
  x: number
  y: number
}

export type BlendMethod = 'speech2speech' | 'text' | 'ivc' | 'cartesia'

export interface BlendResult {
  audioUrl: string
  primarySampleUrl: string
  secondarySampleUrl: string
  primaryMCD: number | null
  secondaryMCD: number | null
}

export interface VoiceSettings {
  stability: number
  similarity_boost: number
}

export interface ElevenLabsVoiceResponse {
  voices: Voice[]
}

export interface MCDResponse {
  mcd: number
}

export interface CartesiaCloneResponse {
  id: string
  message?: string
  [key: string]: unknown
}

export interface CartesiaMixResponse {
  embedding: number[]
  message?: string
  [key: string]: unknown
}

export interface CartesiaVoiceResponse {
  id: string
  message?: string
  [key: string]: unknown
}

export interface ElevenLabsDesignResponse {
  previews: Array<{
    generated_voice_id: string
    [key: string]: unknown
  }>
  [key: string]: unknown
}

export interface ElevenLabsAddVoiceResponse {
  voice_id: string
  [key: string]: unknown
}


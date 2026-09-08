export type GenerationJobType = 'story' | 'image' | 'video' | 'voice' | 'music'

export type GenerationRequest = {
  projectId: string
  prompt: string
  style?: string
  durationSeconds?: number
}

export type GenerationJob = {
  id: string
  projectId: string
  type: GenerationJobType
  status: 'queued' | 'running' | 'completed' | 'failed'
  progress: number
  assetPathname?: string
  error?: string
}

export interface StoryGenerationService {
  createStory(request: GenerationRequest): Promise<GenerationJob>
}

export interface ImageGenerationService {
  createImage(request: GenerationRequest): Promise<GenerationJob>
}

export interface VideoGenerationService {
  createVideo(request: GenerationRequest): Promise<GenerationJob>
}

export interface VoiceGenerationService {
  createVoice(request: GenerationRequest): Promise<GenerationJob>
}

export interface MusicGenerationService {
  createMusic(request: GenerationRequest): Promise<GenerationJob>
}

export type CinemaForgeProviders = {
  story: StoryGenerationService
  image: ImageGenerationService
  video: VideoGenerationService
  voice: VoiceGenerationService
  music: MusicGenerationService
}

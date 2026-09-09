export type GenerationJobType = 'story' | 'storyboard' | 'image' | 'video' | 'voice' | 'music' | 'export'
export type GenerationJobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
export type GenerationRequest = { projectId: string; prompt: string; type: GenerationJobType; style?: string; genre?: string; durationSeconds?: number }
export type GenerationResult = { provider: string; type: GenerationJobType; title: string; text?: string; output?: Record<string, unknown> }
export type Provider = { generate(request: GenerationRequest): Promise<GenerationResult> }
export interface StoryGenerationService extends Provider { }
export interface ImageGenerationService extends Provider { }
export interface VideoGenerationService extends Provider { }
export interface VoiceGenerationService extends Provider { }
export interface MusicGenerationService extends Provider { }
export type CinemaForgeProviders = { story: StoryGenerationService; image: ImageGenerationService; video: VideoGenerationService; voice: VoiceGenerationService; music: MusicGenerationService }

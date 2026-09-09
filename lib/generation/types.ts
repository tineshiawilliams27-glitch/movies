export const generationJobTypes = ['story', 'storyboard', 'image', 'video', 'voice', 'music', 'export'] as const
export type GenerationJobType = typeof generationJobTypes[number]

export function isGenerationJobType(value: unknown): value is GenerationJobType {
  return typeof value === 'string' && generationJobTypes.includes(value as GenerationJobType)
}
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

import type { GenerationJobType, GenerationRequest, GenerationResult, Provider } from './types'

const labels: Record<GenerationJobType, string> = { story: 'story treatment', storyboard: 'storyboard', image: 'visual frame', video: 'motion clip', voice: 'voice track', music: 'music bed', export: 'movie export' }

export const mockProvider: Provider = {
  async generate(request: GenerationRequest): Promise<GenerationResult> {
    const type = request.type
    return { provider: 'mock', type, title: `Generated ${labels[type]}`, text: type === 'story' ? `A ${request.style ?? 'cinematic'} ${request.genre ?? 'film'} about ${request.prompt}.` : undefined, output: { mock: true, prompt: request.prompt, durationSeconds: request.durationSeconds ?? 8 } }
  },
}

export function getProvider(type: GenerationJobType): Provider {
  if (!labels[type]) throw new Error(`Unsupported generation type: ${type}`)
  return mockProvider
}

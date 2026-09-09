import type { GenerationJobType, GenerationRequest, GenerationResult, Provider } from './types'

const labels: Record<GenerationJobType, string> = { story: 'story treatment', storyboard: 'storyboard', image: 'visual frame', video: 'motion clip', voice: 'voice track', music: 'music bed', export: 'movie export' }
const openAiBaseUrl = 'https://api.openai.com/v1'

type OpenAIVideo = { id: string; status: string; progress?: number; error?: { message?: string }; expires_at?: number }

function openAiHeaders() {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('OPENAI_API_KEY is not configured')
  return { Authorization: `Bearer ${key}` }
}

export async function createOpenAIVideo(request: GenerationRequest) {
  const form = new FormData()
  form.set('model', process.env.OPENAI_VIDEO_MODEL ?? 'sora-2')
  form.set('prompt', request.prompt)
  form.set('seconds', String(Math.min(Math.max(request.durationSeconds ?? 8, 1), 20)))
  form.set('size', '1280x720')
  const response = await fetch(`${openAiBaseUrl}/videos`, { method: 'POST', headers: openAiHeaders(), body: form })
  const data = await response.json() as OpenAIVideo & { message?: string }
  if (!response.ok) throw new Error(data.error?.message ?? data.message ?? 'OpenAI video request failed')
  return data
}

export async function getOpenAIVideo(id: string) {
  const response = await fetch(`${openAiBaseUrl}/videos/${encodeURIComponent(id)}`, { headers: openAiHeaders(), cache: 'no-store' })
  const data = await response.json() as OpenAIVideo & { message?: string }
  if (!response.ok) throw new Error(data.error?.message ?? data.message ?? 'OpenAI video status failed')
  return data
}

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

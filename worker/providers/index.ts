import { getToken } from '@vercel/connect'
import { put } from '@vercel/blob'

export type ProviderContext = { jobId: string; payload: Record<string, unknown> }
export type ProviderResult = { result: Record<string, unknown> }
export type GenerationProvider = (context: ProviderContext) => Promise<ProviderResult>

const replicateConnector = 'api.replicate.com/film-studio-video-generation'
const replicateModel = process.env.REPLICATE_VIDEO_MODEL || 'minimax/video-01'

export const gatewayTextProvider: GenerationProvider = async ({ payload }) => ({
  result: { provider: 'vercel-ai-gateway', model: 'openai/gpt-5-mini', prompt: payload.prompt ?? '' },
})

async function replicateVideoProvider({ jobId, payload }: ProviderContext): Promise<ProviderResult> {
  const token = await getToken(replicateConnector, { subject: { type: 'app' }, scopes: ['*'] })
  const input = {
    prompt: String(payload.prompt ?? 'Cinematic storyboard shot with natural movement and consistent visual identity.'),
    duration: Number(payload.durationSeconds ?? 4),
  }
  const [owner, model] = replicateModel.split('/')
  if (!owner || !model) throw new Error('REPLICATE_VIDEO_MODEL must use owner/model format.')
  const created = await fetch(`https://api.replicate.com/v1/models/${owner}/${model}/predictions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ input }),
  })
  if (!created.ok) throw new Error(`Replicate prediction failed with ${created.status}.`)
  let prediction = await created.json() as { id: string; status: string; output?: string | string[]; error?: string }
  for (let attempt = 0; attempt < 60 && ['starting', 'processing'].includes(prediction.status); attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 5000))
    const response = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, { headers: { Authorization: `Bearer ${token}` } })
    if (!response.ok) throw new Error(`Replicate polling failed with ${response.status}.`)
    prediction = await response.json()
  }
  if (prediction.status !== 'succeeded' || !prediction.output) throw new Error(prediction.error || `Replicate ended with ${prediction.status}.`)
  const outputUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output
  const clip = await fetch(outputUrl)
  if (!clip.ok) throw new Error('Replicate returned an unreadable clip.')
  const blob = await put(`film-clips/${jobId}.mp4`, await clip.blob(), { access: 'private', contentType: 'video/mp4', addRandomSuffix: false })
  return { result: { provider: 'replicate', predictionId: prediction.id, assetUrl: blob.url, status: prediction.status } }
}

export const demoProvider: GenerationProvider = async ({ jobId }) => ({ result: { mode: 'demo', jobId, outputs: [] } })

export function unavailableProvider(name: string): GenerationProvider {
  return async () => { throw new Error(`${name} provider is not configured.`) }
}

export function providerFor(type: string): GenerationProvider {
  if (type === 'VIDEO_GENERATION') return replicateVideoProvider
  if (type === 'PIPELINE_GENERATION' || type === 'TEXT_GENERATION') return gatewayTextProvider
  return unavailableProvider(type)
}

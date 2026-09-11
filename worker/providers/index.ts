import { getToken } from '@vercel/connect'
import { put } from '@vercel/blob'

export type ProviderContext = { jobId: string; payload: Record<string, unknown> }
export type ProviderResult = { result: Record<string, unknown>; status?: 'OK' | 'NOT_CONFIGURED' }
export type GenerationProvider = (context: ProviderContext) => Promise<ProviderResult>

const replicateConnector = 'api.replicate.com/film-studio-video-generation'
const videoProvider = (process.env.VIDEO_PROVIDER || 'local').trim().toLowerCase()
const imageProvider = (process.env.IMAGE_PROVIDER || 'http').trim().toLowerCase()
const audioProvider = (process.env.AUDIO_PROVIDER || process.env.VOICE_PROVIDER || 'http').trim().toLowerCase()
const replicateModel = process.env.REPLICATE_VIDEO_MODEL?.trim()
const imageEndpoint = process.env.IMAGE_PROVIDER_URL?.trim()
const audioEndpoint = process.env.AUDIO_PROVIDER_URL?.trim()

const providerConfig = {
  VIDEO_GENERATION: videoProvider,
  IMAGE_GENERATION: imageProvider,
  AUDIO_GENERATION: audioProvider,
  VIDEO_EXPORT: (process.env.VIDEO_EXPORT_PROVIDER || 'local').trim().toLowerCase(),
} as const

export const gatewayTextProvider: GenerationProvider = async ({ payload }) => ({
  result: { provider: 'vercel-ai-gateway', model: 'openai/gpt-5-mini', prompt: payload.prompt ?? '' },
})

async function replicateVideoProvider({ jobId, payload }: ProviderContext): Promise<ProviderResult> {
  if (!replicateModel) return { status: 'NOT_CONFIGURED', result: { code: 'VIDEO_PROVIDER_NOT_CONFIGURED', message: 'Set REPLICATE_VIDEO_MODEL to enable video generation.' } }
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
  return { result: { provider: 'replicate', predictionId: prediction.id, assetPathname: blob.pathname, status: prediction.status } }
}

export function unavailableProvider(name: string): GenerationProvider {
  return async () => ({ status: 'NOT_CONFIGURED', result: { code: 'PROVIDER_NOT_CONFIGURED', provider: name, message: `${name} provider is not configured.` } })
}

async function httpMediaProvider({ jobId, payload }: ProviderContext, endpoint: string, kind: 'IMAGE' | 'AUDIO'): Promise<ProviderResult> {
  const response = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jobId, ...payload }) })
  if (!response.ok) throw new Error(`${kind} provider failed with ${response.status}.`)
  const data = await response.json() as { url?: string; assetPathname?: string; mimeType?: string; durationSeconds?: number }
  if (typeof data.assetPathname === 'string') return { result: { provider: endpoint, assetPathname: data.assetPathname, kind } }
  if (!data.url) throw new Error(`${kind} provider must return url or assetPathname.`)
  const media = await fetch(data.url)
  if (!media.ok) throw new Error(`${kind} provider returned an unreadable asset.`)
  const blob = await put(`film-${kind.toLowerCase()}/${jobId}`, await media.blob(), { access: 'private', contentType: data.mimeType || media.headers.get('content-type') || (kind === 'IMAGE' ? 'image/png' : 'audio/mpeg'), addRandomSuffix: false })
  return { result: { provider: endpoint, assetPathname: blob.pathname, kind, durationSeconds: data.durationSeconds } }
}

const imageGenerationProvider: GenerationProvider = async (context) => imageEndpoint ? httpMediaProvider(context, imageEndpoint, 'IMAGE') : unavailableProvider('IMAGE_GENERATION (IMAGE_PROVIDER_URL)')(context)
const audioGenerationProvider: GenerationProvider = async (context) => audioEndpoint ? httpMediaProvider(context, audioEndpoint, 'AUDIO') : unavailableProvider('AUDIO_GENERATION (AUDIO_PROVIDER_URL)')(context)
const videoExportProvider: GenerationProvider = async ({ jobId, payload }) => {
  const manifest = { jobId, format: payload.format || 'mp4', resolution: payload.resolution || '1080p', frameRate: payload.frameRate || 24, aspectRatio: payload.aspectRatio || '16:9', createdAt: new Date().toISOString(), status: 'READY' }
  const blob = await put(`film-exports/${jobId}.json`, JSON.stringify(manifest), { access: 'private', contentType: 'application/json', addRandomSuffix: false })
  return { result: { provider: 'local-export', assetPathname: blob.pathname, manifest } }
}

export function providerFor(type: string): GenerationProvider {
  if (type === 'PIPELINE_GENERATION' || type === 'TEXT_GENERATION') return gatewayTextProvider
  const configured = providerConfig[type as keyof typeof providerConfig]
  if (type === 'VIDEO_GENERATION' && configured === 'replicate') return replicateVideoProvider
  if (type === 'IMAGE_GENERATION' && configured === 'http') return imageGenerationProvider
  if ((type === 'AUDIO_GENERATION' || type === 'VOICE_GENERATION') && configured === 'http') return audioGenerationProvider
  if (type === 'VIDEO_EXPORT' && configured === 'local') return videoExportProvider
  return unavailableProvider(`${type} (${configured || 'unknown'})`)
}

export function configuredProviders() {
  return { ...providerConfig }
}

import { getToken } from '@vercel/connect'
import { get, put } from '@vercel/blob'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegPath from 'ffmpeg-static'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { db } from '../../lib/db'
import { filmCharacters, mediaAssets, scenes, timelineItems } from '../../lib/db/schema'
import { and, asc, eq } from 'drizzle-orm'

export type ProviderContext = { jobId: string; payload: Record<string, unknown> }
export type ProviderResult = { result: Record<string, unknown>; status?: 'OK' | 'NOT_CONFIGURED' }
export type GenerationProvider = (context: ProviderContext) => Promise<ProviderResult>

const replicateConnector = 'api.replicate.com/film-studio-video-generation'
const configured = (value: string | undefined, fallback: string) => (value ?? fallback).trim().toLowerCase()
const videoProvider = configured(process.env.VIDEO_PROVIDER ?? process.env.VIDEO_PROVIDER_3, 'replicate')
const imageProvider = configured(process.env.IMAGE_PROVIDER, 'replicate')
const voiceProvider = configured(process.env.VOICE_PROVIDER ?? process.env.AUDIO_PROVIDER, 'elevenlabs')
const replicateModel = process.env.REPLICATE_VIDEO_MODEL?.trim()
const replicateImageModel = (process.env.REPLICATE_IMAGE_MODEL || 'black-forest-labs/flux-dev').trim()
const imageEndpoint = process.env.IMAGE_PROVIDER_URL?.trim()
const audioEndpoint = process.env.AUDIO_PROVIDER_URL?.trim()
const elevenLabsApiKey = (process.env.ELEVENLABS_API_KEY || process.env.API_KEY || '').trim()
const elevenLabsVoiceId = (process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM').trim()
const elevenLabsModelId = (process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2').trim()

const providerConfig = {
  VIDEO_GENERATION: videoProvider,
  IMAGE_GENERATION: imageProvider,
  AUDIO_GENERATION: voiceProvider,
  VOICE_GENERATION: voiceProvider,
  VIDEO_EXPORT: configured(process.env.VIDEO_EXPORT_PROVIDER, 'local'),
} as const

export const gatewayTextProvider: GenerationProvider = async ({ payload }) => ({
  result: { provider: 'vercel-ai-gateway', model: 'openai/gpt-5-mini', prompt: payload.prompt ?? '' },
})

const sceneBreakdownProvider: GenerationProvider = async ({ payload }) => {
  const userId = typeof payload.userId === 'string' ? payload.userId : ''
  const projectId = typeof payload.projectId === 'string' ? payload.projectId : ''
  const shots = Array.isArray(payload.shots) ? payload.shots : []
  if (!userId || !projectId || shots.length === 0) throw new Error('Scene breakdown requires an owner, project, and generated shots.')
  const grouped = new Map<string, Record<string, unknown>>()
  for (const item of shots) {
    if (!item || typeof item !== 'object') continue
    const shot = item as Record<string, unknown>
    const label = typeof shot.sceneLabel === 'string' && shot.sceneLabel.trim() ? shot.sceneLabel.trim() : 'Scene'
    const current = grouped.get(label)
    if (current) {
      current.description = `${String(current.description || '')}\n\n${String(shot.description || '')}`.trim()
      current.dialogue = `${String(current.dialogue || '')}\n${String(shot.dialogue || '')}`.trim()
      current.durationSeconds = Number(current.durationSeconds || 0) + Number(shot.durationSeconds || 0)
    } else grouped.set(label, { title: typeof shot.title === 'string' ? shot.title : label, description: shot.description || '', dialogue: shot.dialogue || '', location: shot.location || label, durationSeconds: Number(shot.durationSeconds || 0), metadata: { source: 'SCENE_BREAKDOWN', shotNumbers: [shot.shotNumber] } })
  }
  const generatedScenes = Array.from(grouped.values())
  await db.transaction(async (tx) => {
    await tx.delete(scenes).where(and(eq(scenes.projectId, projectId), eq(scenes.userId, userId)))
    for (const [index, scene] of generatedScenes.entries()) {
      await tx.insert(scenes).values({
        userId,
        projectId,
        sceneNumber: index + 1,
        title: String(scene.title),
        description: String(scene.description),
        dialogue: String(scene.dialogue),
        location: String(scene.location),
        durationSeconds: String(scene.durationSeconds),
        metadata: { ...(scene.metadata as Record<string, unknown>), generatedAt: new Date().toISOString() },
      })
    }
  })
  return { result: { provider: 'scene-breakdown-worker', scenesCreated: generatedScenes.length, replacedExistingScenes: true } }
}

async function persistGeneratedMedia(payload: Record<string, unknown>, pathname: string, contentType: string, kind: string, metadata: Record<string, unknown> = {}) {
  const userId = typeof payload.userId === 'string' ? payload.userId : ''
  const projectId = typeof payload.projectId === 'string' ? payload.projectId : ''
  if (!userId || !projectId) throw new Error(`${kind} generation requires project and user context.`)
  const [asset] = await db.insert(mediaAssets).values({ userId, projectId, kind, pathname, contentType, durationSeconds: typeof payload.durationSeconds === 'number' ? String(payload.durationSeconds) : undefined, metadata }).returning({ id: mediaAssets.id })
  return asset.id
}

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
  const assetId = await persistGeneratedMedia(payload, blob.pathname, 'video/mp4', 'VIDEO_CLIP', { provider: 'replicate', predictionId: prediction.id })
  return { result: { provider: 'replicate', predictionId: prediction.id, assetPathname: blob.pathname, assetId, status: prediction.status } }
}

export function unavailableProvider(name: string): GenerationProvider {
  return async () => ({ status: 'NOT_CONFIGURED', result: { code: 'PROVIDER_NOT_CONFIGURED', provider: name, message: `${name} provider is not configured.` } })
}

async function httpMediaProvider({ jobId, payload }: ProviderContext, endpoint: string, kind: 'IMAGE' | 'AUDIO'): Promise<ProviderResult> {
  const response = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jobId, ...payload }) })
  if (!response.ok) throw new Error(`${kind} provider failed with ${response.status}.`)
  const data = await response.json() as { url?: string; assetPathname?: string; mimeType?: string; durationSeconds?: number }
  if (typeof data.assetPathname === 'string') {
    const assetId = await persistGeneratedMedia(payload, data.assetPathname, data.mimeType || (kind === 'IMAGE' ? 'image/png' : 'audio/mpeg'), kind === 'IMAGE' ? 'IMAGE_GENERATED' : 'AUDIO_GENERATED', { provider: endpoint })
    return { result: { provider: endpoint, assetPathname: data.assetPathname, assetId, kind } }
  }
  if (!data.url) throw new Error(`${kind} provider must return url or assetPathname.`)
  const media = await fetch(data.url)
  if (!media.ok) throw new Error(`${kind} provider returned an unreadable asset.`)
  const blob = await put(`film-${kind.toLowerCase()}/${jobId}`, await media.blob(), { access: 'private', contentType: data.mimeType || media.headers.get('content-type') || (kind === 'IMAGE' ? 'image/png' : 'audio/mpeg'), addRandomSuffix: false })
  const assetId = await persistGeneratedMedia(payload, blob.pathname, data.mimeType || media.headers.get('content-type') || (kind === 'IMAGE' ? 'image/png' : 'audio/mpeg'), kind === 'IMAGE' ? 'IMAGE_GENERATED' : 'AUDIO_GENERATED', { provider: endpoint })
  return { result: { provider: endpoint, assetPathname: blob.pathname, assetId, kind, durationSeconds: data.durationSeconds } }
}

const replicateImageProvider: GenerationProvider = async ({ jobId, payload }) => {
  const token = await getToken(replicateConnector, { subject: { type: 'app' }, scopes: ['*'] })
  const [owner, model] = replicateImageModel.split('/')
  if (!owner || !model) throw new Error('REPLICATE_IMAGE_MODEL must use owner/model format.')
  const created = await fetch(`https://api.replicate.com/v1/models/${owner}/${model}/predictions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: {
      prompt: String(payload.prompt ?? 'Cinematic storyboard frame with consistent character identity and clear composition.'),
      aspect_ratio: String(payload.aspectRatio ?? '16:9'),
      output_format: 'png',
      safety_tolerance: 2,
    } }),
  })
  if (!created.ok) throw new Error(`Replicate image prediction failed with ${created.status}.`)
  let prediction = await created.json() as { id: string; status: string; output?: string | string[]; error?: string }
  for (let attempt = 0; attempt < 60 && ['starting', 'processing'].includes(prediction.status); attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 2000))
    const response = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, { headers: { Authorization: `Bearer ${token}` } })
    if (!response.ok) throw new Error(`Replicate image polling failed with ${response.status}.`)
    prediction = await response.json()
  }
  if (prediction.status !== 'succeeded' || !prediction.output) throw new Error(prediction.error || `Replicate image generation ended with ${prediction.status}.`)
  const outputUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output
  const image = await fetch(outputUrl)
  if (!image.ok) throw new Error('Replicate returned an unreadable storyboard image.')
  const contentType = image.headers.get('content-type') || 'image/png'
  const blob = await put(`storyboard-images/${jobId}.png`, await image.blob(), { access: 'private', contentType, addRandomSuffix: false })
  const assetId = await persistGeneratedMedia(payload, blob.pathname, contentType, 'IMAGE_GENERATED', { provider: 'replicate', model: replicateImageModel, predictionId: prediction.id, shotNumber: payload.shotNumber })
  return { result: { provider: 'replicate', model: replicateImageModel, predictionId: prediction.id, assetPathname: blob.pathname, assetId, kind: 'IMAGE' } }
}

const characterImageProvider: GenerationProvider = async ({ jobId, payload }) => {
  const token = await getToken(replicateConnector, { subject: { type: 'app' }, scopes: ['*'] })
  const [owner, model] = replicateImageModel.split('/')
  if (!owner || !model) throw new Error('REPLICATE_IMAGE_MODEL must use owner/model format.')
  const prompt = String(payload.prompt ?? 'Photorealistic cinematic character portrait, natural skin texture, expressive eyes, realistic wardrobe, studio lighting, 85mm lens, no text, no watermark.')
  const created = await fetch(`https://api.replicate.com/v1/models/${owner}/${model}/predictions`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ input: { prompt, aspect_ratio: '4:3', output_format: 'png', safety_tolerance: 2 } }) })
  if (!created.ok) throw new Error(`Replicate character image request failed with ${created.status}.`)
  let prediction = await created.json() as { id: string; status: string; output?: string | string[]; error?: string }
  for (let attempt = 0; attempt < 60 && ['starting', 'processing'].includes(prediction.status); attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 2000))
    const response = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, { headers: { Authorization: `Bearer ${token}` } })
    if (!response.ok) throw new Error(`Replicate character image polling failed with ${response.status}.`)
    prediction = await response.json()
  }
  if (prediction.status !== 'succeeded' || !prediction.output) throw new Error(prediction.error || `Replicate ended with ${prediction.status}.`)
  const outputUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output
  const image = await fetch(outputUrl)
  if (!image.ok) throw new Error('Replicate returned an unreadable character image.')
  const blob = await put(`projects/${payload.projectId}/characters/${payload.characterId}/${jobId}.png`, await image.blob(), { access: 'private', contentType: 'image/png', addRandomSuffix: false })
  const assetId = await persistGeneratedMedia(payload, blob.pathname, 'image/png', 'CHARACTER_REFERENCE', { provider: 'replicate', model: replicateImageModel, predictionId: prediction.id, characterId: payload.characterId })
  const characterId = typeof payload.characterId === 'string' ? payload.characterId : ''
  const projectId = typeof payload.projectId === 'string' ? payload.projectId : ''
  const userId = typeof payload.userId === 'string' ? payload.userId : ''
  if (!characterId || !projectId || !userId) throw new Error('Character image generation requires character, project, and user context.')
  await db.update(filmCharacters).set({ referenceAssetId: assetId, updatedAt: new Date() }).where(and(eq(filmCharacters.id, characterId), eq(filmCharacters.projectId, projectId), eq(filmCharacters.userId, userId)))
  return { result: { provider: 'replicate', model: replicateImageModel, predictionId: prediction.id, assetPathname: blob.pathname, assetId, kind: 'CHARACTER_REFERENCE' } }
}

const imageGenerationProvider: GenerationProvider = async (context) => imageEndpoint ? httpMediaProvider(context, imageEndpoint, 'IMAGE') : unavailableProvider('IMAGE_GENERATION (IMAGE_PROVIDER_URL)')(context)
const elevenLabsAudioProvider: GenerationProvider = async ({ jobId, payload }) => {
  if (!elevenLabsApiKey) return { status: 'NOT_CONFIGURED', result: { code: 'ELEVENLABS_NOT_CONFIGURED', message: 'Set ELEVENLABS_API_KEY to enable realistic voice generation.' } }
  const text = String(payload.text ?? payload.dialogue ?? payload.prompt ?? '').trim()
  if (!text) throw new Error('Voice generation requires dialogue text.')
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(elevenLabsVoiceId)}`, {
    method: 'POST',
    headers: { 'xi-api-key': elevenLabsApiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: elevenLabsModelId, voice_settings: { stability: 0.48, similarity_boost: 0.78, style: 0.2, use_speaker_boost: true } }),
  })
  if (!response.ok) throw new Error(`ElevenLabs voice generation failed with ${response.status}.`)
  const blob = await put(`voice-over/${jobId}.mp3`, await response.blob(), { access: 'private', contentType: 'audio/mpeg', addRandomSuffix: false })
  const assetId = await persistGeneratedMedia(payload, blob.pathname, 'audio/mpeg', 'AUDIO_GENERATED', { provider: 'elevenlabs', voiceId: elevenLabsVoiceId, modelId: elevenLabsModelId, text })
  return { result: { provider: 'elevenlabs', voiceId: elevenLabsVoiceId, modelId: elevenLabsModelId, assetPathname: blob.pathname, assetId, kind: 'AUDIO' } }
}

const audioGenerationProvider: GenerationProvider = async (context) => audioEndpoint ? httpMediaProvider(context, audioEndpoint, 'AUDIO') : unavailableProvider('AUDIO_GENERATION (AUDIO_PROVIDER_URL)')(context)
const videoExportProvider: GenerationProvider = async ({ jobId, payload }) => {
  if (!ffmpegPath) throw new Error('FFmpeg binary is unavailable in this runtime.')
  const executablePath = ffmpegPath
  const projectId = typeof payload.projectId === 'string' ? payload.projectId : ''
  const userId = typeof payload.userId === 'string' ? payload.userId : ''
  if (!projectId || !userId) throw new Error('Video export requires project and user context.')
  const items = await db.select().from(timelineItems).where(and(eq(timelineItems.projectId, projectId), eq(timelineItems.userId, userId))).orderBy(asc(timelineItems.startSeconds), asc(timelineItems.id))
  const videoItems = items.filter((item) => item.trackType === 'VIDEO' && item.content)
  if (videoItems.length === 0) throw new Error('No video assets are available for export.')
  const workdir = await mkdtemp(join(tmpdir(), 'film-export-'))
  try {
    const inputs: string[] = []
    for (const [index, item] of videoItems.entries()) {
      const [linkedAsset] = item.assetId ? await db.select({ pathname: mediaAssets.pathname }).from(mediaAssets).where(and(eq(mediaAssets.id, item.assetId), eq(mediaAssets.projectId, projectId), eq(mediaAssets.userId, userId))).limit(1) : []
      const pathname = linkedAsset?.pathname ?? item.content
      const asset = await get(pathname, { access: 'private' })
      if (!asset) throw new Error(`Timeline asset ${item.label || index + 1} was not found.`)
      const extension = pathname.endsWith('.mp4') ? 'mp4' : 'bin'
      const inputPath = join(workdir, `input-${index}.${extension}`)
      const buffer = Buffer.from(await new Response(asset.stream).arrayBuffer())
      await writeFile(inputPath, buffer)
      inputs.push(inputPath)
    }
    const outputPath = join(workdir, 'film.mp4')
    await new Promise<void>((resolve, reject) => {
      const width = payload.aspectRatio === '9:16' ? 1080 : 1920
      const height = payload.aspectRatio === '9:16' ? 1920 : 1080
      const frameRate = Number(payload.frameRate) || 24
      const videoFilters = inputs.map((_, index) => `[${index}:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=black,fps=${frameRate},format=yuv420p,setpts=PTS-STARTPTS[v${index}]`).join(';')
      const concatInputs = inputs.map((_, index) => `[v${index}]`).join('')
      const filterComplex = `${videoFilters};${concatInputs}concat=n=${inputs.length}:v=1:a=0[vout]`
      let command = ffmpeg().setFfmpegPath(executablePath)
      for (const input of inputs) command = command.input(input)
      command = command.input('anullsrc=channel_layout=stereo:sample_rate=48000').inputOptions(['-f', 'lavfi'])
      command.outputOptions(['-filter_complex', filterComplex, '-map', '[vout]', '-map', `${inputs.length}:a:0`, '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-shortest', '-movflags', '+faststart']).on('end', () => resolve()).on('error', reject).save(outputPath)
    })
    const blob = await put(`film-exports/${jobId}.mp4`, await (await import('node:fs/promises')).readFile(outputPath), { access: 'private', contentType: 'video/mp4', addRandomSuffix: false })
    const [media] = await db.insert(mediaAssets).values({ userId, projectId, kind: 'VIDEO_EXPORT', pathname: blob.pathname, contentType: 'video/mp4', metadata: { jobId, sourceCount: inputs.length } }).returning({ id: mediaAssets.id })
    const manifest = { jobId, projectId, format: payload.format || 'mp4', resolution: payload.resolution || '1080p', frameRate: payload.frameRate || 24, aspectRatio: payload.aspectRatio || '16:9', createdAt: new Date().toISOString(), status: 'READY', assetPathname: blob.pathname, mediaId: media?.id, sourceCount: inputs.length }
    return { result: { provider: 'ffmpeg', assetPathname: blob.pathname, mediaId: media?.id, manifest } }
  } finally { await rm(workdir, { recursive: true, force: true }) }
}

export function providerFor(type: string): GenerationProvider {
  if (type === 'SCENE_BREAKDOWN') return sceneBreakdownProvider
  if (type === 'PIPELINE_GENERATION' || type === 'TEXT_GENERATION') return gatewayTextProvider
  const configured = providerConfig[type as keyof typeof providerConfig]
  if (type === 'VIDEO_GENERATION' && configured === 'replicate') return replicateVideoProvider
  if (type === 'IMAGE_GENERATION' && configured === 'http' && imageEndpoint) return imageGenerationProvider
  if (type === 'IMAGE_GENERATION' && configured === 'replicate') return replicateImageProvider
  if (type === 'CHARACTER_IMAGE_GENERATION' && configured === 'replicate') return characterImageProvider
  if ((type === 'AUDIO_GENERATION' || type === 'VOICE_GENERATION') && configured === 'http' && audioEndpoint) return audioGenerationProvider
  if ((type === 'AUDIO_GENERATION' || type === 'VOICE_GENERATION') && configured === 'elevenlabs') return elevenLabsAudioProvider
  if ((type === 'TIMELINE' || type === 'VIDEO_EXPORT') && configured === 'local') return videoExportProvider
  return unavailableProvider(`${type} (${configured || 'unknown'})`)
}

export function configuredProviders() {
  return { ...providerConfig }
}

import { getReplicateModelSchema, replicateHeaders, requireReplicateToken } from './replicate'
import { getElevenLabsApiKey, elevenLabsHeaders } from './elevenlabs'
import { localProviderName } from './local'
import { get, put } from '@vercel/blob'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegPath from 'ffmpeg-static'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { db } from '../../lib/db'
import { filmCharacters, mediaAssets, scenes, timelineItems } from '../../lib/db/schema'
import { and, asc, desc, eq } from 'drizzle-orm'

export type ProviderContext = { jobId: string; payload: Record<string, unknown> }
export type ProviderResult = { result: Record<string, unknown>; status?: 'OK' | 'NOT_CONFIGURED' }
export type GenerationProvider = (context: ProviderContext & { onProgress?: (progress: number, stage?: string) => Promise<void> }) => Promise<ProviderResult>

const configured = (value: string | undefined, fallback: string) => (value ?? fallback).trim().toLowerCase()
const videoProvider = configured(process.env.VIDEO_PROVIDER ?? process.env.VIDEO_PROVIDER_3, 'replicate')
const imageProvider = configured(process.env.IMAGE_PROVIDER, 'replicate')
const voiceProvider = configured(process.env.VOICE_PROVIDER ?? process.env.AUDIO_PROVIDER, 'elevenlabs')
const replicateModel = process.env.REPLICATE_VIDEO_MODEL?.trim()
const protofaceEndpoint = (process.env.PROTOFACE_API_URL || 'https://api.protoface.com/v1/runs').trim()
const protofaceApiKey = (process.env.PROTOFACE_API_KEY || process.env.API_KEY || '').trim()
const protofaceModel = (process.env.PROTOFACE_VIDEO_MODEL || 'video-generation').trim()
const protofaceImageModel = (process.env.PROTOFACE_IMAGE_MODEL || 'openai/gpt-image-2').trim()
const replicateImageModel = (process.env.REPLICATE_IMAGE_MODEL || 'black-forest-labs/flux-dev').trim()
const imageEndpoint = process.env.IMAGE_PROVIDER_URL?.trim()
const audioEndpoint = process.env.AUDIO_PROVIDER_URL?.trim()
const elevenLabsApiKey = getElevenLabsApiKey()
const elevenLabsVoiceId = (process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM').trim()
const elevenLabsModelId = (process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2').trim()

const providerConfig = {
  VIDEO_GENERATION: videoProvider,
  IMAGE_GENERATION: imageProvider,
  VOICE_GENERATION: voiceProvider,
  TIMELINE_BUILD: configured(process.env.TIMELINE_PROVIDER, localProviderName),
  VIDEO_EXPORT: configured(process.env.VIDEO_EXPORT_PROVIDER, localProviderName),
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
    } else grouped.set(label, { title: typeof shot.title === 'string' ? shot.title : label, description: shot.description || '', dialogue: shot.dialogue || '', location: shot.location || label, durationSeconds: Number(shot.durationSeconds || 0), metadata: { source: 'SCENE_GENERATION', shotNumbers: [shot.shotNumber] } })
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
  const [asset] = await db.insert(mediaAssets).values({ userId, projectId, kind, pathname, contentType, durationSeconds: typeof payload.durationSeconds === 'number' ? String(payload.durationSeconds) : undefined, metadata: { ...metadata, sourceJobId: typeof payload.jobId === 'string' ? payload.jobId : undefined, projectId, contentType } }).returning({ id: mediaAssets.id })
  return asset.id
}

async function replicateVideoProvider({ jobId, payload, onProgress }: ProviderContext & { onProgress?: (progress: number, stage?: string) => Promise<void> }): Promise<ProviderResult> {
  if (!replicateModel) return { status: 'NOT_CONFIGURED', result: { code: 'VIDEO_PROVIDER_NOT_CONFIGURED', message: 'Set REPLICATE_VIDEO_MODEL to enable video generation.' } }
  const token = requireReplicateToken()
  const [owner, model] = replicateModel.split('/')
  if (!owner || !model) throw new Error('REPLICATE_VIDEO_MODEL must use owner/model format.')
  const modelSchema = await getReplicateModelSchema(token, replicateModel)
  const inputSchema = modelSchema.info.latest_version?.openapi_schema?.components?.schemas?.Input
  const properties = inputSchema?.properties ?? {}
  const input: Record<string, unknown> = { prompt: String(payload.prompt ?? 'Cinematic storyboard shot with natural movement and consistent visual identity.') }
  const referenceUrls: string[] = Array.isArray(payload.referenceImageUrls)
    ? payload.referenceImageUrls.filter((value): value is string => typeof value === 'string' && value.startsWith('http'))
    : Array.isArray(payload.characterReferences)
      ? (await Promise.all(payload.characterReferences.map(async (reference): Promise<string | null> => {
        if (!reference || typeof reference !== 'object' || !('referenceAssetId' in reference) || typeof reference.referenceAssetId !== 'string') return null
        const [asset] = await db.select({ pathname: mediaAssets.pathname }).from(mediaAssets).where(and(eq(mediaAssets.id, reference.referenceAssetId), eq(mediaAssets.projectId, String(payload.projectId)), eq(mediaAssets.userId, String(payload.userId)))).limit(1)
        if (!asset?.pathname) return null
        const blob = await get(asset.pathname, { access: 'private' })
        return blob && 'blob' in blob && typeof blob.blob.url === 'string' ? blob.blob.url : null
      }))).filter((value): value is string => Boolean(value))
      : []
  if (referenceUrls.length > 0) {
    if (Object.prototype.hasOwnProperty.call(properties, 'image')) input.image = referenceUrls[0]
    else if (Object.prototype.hasOwnProperty.call(properties, 'image_url')) input.image_url = referenceUrls[0]
    else if (Object.prototype.hasOwnProperty.call(properties, 'reference_images')) input.reference_images = referenceUrls
  }
  const duration = Math.min(10, Math.max(1, Number(payload.durationSeconds) || 4))
  if (Object.prototype.hasOwnProperty.call(properties, 'duration')) input.duration = duration
  else if (Object.prototype.hasOwnProperty.call(properties, 'duration_seconds')) input.duration_seconds = duration
  else if ((inputSchema?.required ?? []).includes('duration')) throw new Error(`Replicate video model ${replicateModel} requires a duration input, but its schema is not supported.`)
  const unsupportedRequired = (inputSchema?.required ?? []).filter((field) => !(field in input) && field !== 'image')
  if (unsupportedRequired.length > 0) throw new Error(`Replicate video model ${replicateModel} requires unsupported inputs: ${unsupportedRequired.join(', ')}.`)
  const created = await fetch(`https://api.replicate.com/v1/models/${owner}/${model}/predictions`, {
    method: 'POST',
    headers: replicateHeaders(token, true),
    body: JSON.stringify({ input }),
  })
  if (!created.ok) throw new Error(`Replicate prediction failed with ${created.status}.`)
  let prediction = await created.json() as { id: string; status: string; output?: string | string[]; error?: string }
  for (let attempt = 0; attempt < 60 && ['starting', 'processing'].includes(prediction.status); attempt += 1) {
    await onProgress?.(Math.min(95, 15 + Math.round((attempt / 60) * 80)), prediction.status === 'starting' ? 'Starting video provider' : 'Rendering video clip')
    await new Promise((resolve) => setTimeout(resolve, 5000))
    const response = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, { headers: replicateHeaders(token) })
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

async function httpMediaProvider({ jobId, payload, onProgress }: ProviderContext & { onProgress?: (progress: number, stage?: string) => Promise<void> }, endpoint: string, kind: 'IMAGE' | 'AUDIO'): Promise<ProviderResult> {
  const response = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jobId, ...payload }) })
  if (!response.ok) throw new Error(`${kind} provider failed with ${response.status}.`)
  const data = await response.json() as { url?: string; assetPathname?: string; mimeType?: string; durationSeconds?: number; progress?: number; stage?: string }
  if (typeof data.progress === 'number') await onProgress?.(Math.max(0, Math.min(100, data.progress)), data.stage)
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

const protofaceVideoProvider: GenerationProvider = async ({ jobId, payload, onProgress }) => {
  if (!protofaceApiKey) return { status: 'NOT_CONFIGURED', result: { code: 'PROTOFACE_NOT_CONFIGURED', message: 'Set PROTOFACE_API_KEY to enable Protoface video generation.' } }
  const prompt = String(payload.prompt ?? 'Cinematic storyboard shot with natural movement and consistent visual identity.')
  const durationSeconds = Math.min(10, Math.max(1, Number(payload.durationSeconds) || 4))
  const referenceImageUrls = Array.isArray(payload.referenceImageUrls) ? payload.referenceImageUrls.filter((value): value is string => typeof value === 'string' && value.startsWith('http')) : []
  const created = await fetch(protofaceEndpoint, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${protofaceApiKey}` }, body: JSON.stringify({ model: protofaceModel, prompt, duration: durationSeconds, duration_seconds: durationSeconds, ...(referenceImageUrls.length ? { image_url: referenceImageUrls[0], reference_images: referenceImageUrls } : {}), metadata: { jobId } }) })
  if (!created.ok) throw new Error(`Protoface video request failed with ${created.status}.`)
  let operation = await created.json() as { id?: string; status?: string; output?: string | { url?: string }; output_url?: string; video_url?: string; video?: { url?: string; content_type?: string; file_name?: string }; error?: string; progress?: number }
  const operationId = operation.id
  if (!operationId && !(operation.output_url || operation.video_url || operation.video?.url || (typeof operation.output === 'string') || operation.output?.url)) throw new Error('Protoface returned no operation ID or video URL.')
  for (let attempt = 0; operationId && attempt < 90 && !['succeeded', 'completed', 'failed', 'error', 'cancelled'].includes(String(operation.status).toLowerCase()); attempt += 1) {
    await onProgress?.(Math.min(95, 10 + Math.round((attempt / 90) * 85)), operation.status === 'queued' ? 'Queued with Protoface' : 'Rendering video with Protoface')
    await new Promise((resolve) => setTimeout(resolve, 3000))
    const response = await fetch(`${protofaceEndpoint.replace(/\/$/, '')}/${encodeURIComponent(operationId)}`, { headers: { authorization: `Bearer ${protofaceApiKey}` } })
    if (!response.ok) throw new Error(`Protoface polling failed with ${response.status}.`)
    operation = await response.json()
  }
  if (['failed', 'error', 'cancelled'].includes(String(operation.status).toLowerCase())) throw new Error(operation.error || `Protoface ended with ${operation.status}.`)
  const outputUrl = operation.video?.url || operation.output_url || operation.video_url || (typeof operation.output === 'string' ? operation.output : operation.output?.url)
  if (!outputUrl) throw new Error('Protoface completed without a video URL.')
  const video = await fetch(outputUrl)
  if (!video.ok) throw new Error('Protoface returned an unreadable video.')
  await onProgress?.(96, 'Saving Protoface video')
  const contentType = operation.video?.content_type || 'video/mp4'
  const blob = await put(`film-clips/${jobId}.mp4`, await video.blob(), { access: 'private', contentType, addRandomSuffix: false })
  const assetId = await persistGeneratedMedia(payload, blob.pathname, contentType, 'VIDEO_CLIP', { provider: 'protoface', model: protofaceModel, operationId, fileName: operation.video?.file_name })
  return { result: { provider: 'protoface', model: protofaceModel, operationId, assetPathname: blob.pathname, assetId, status: operation.status || 'completed' } }
}

const protofaceImageProvider: GenerationProvider = async ({ jobId, payload, onProgress }) => {
  if (!protofaceApiKey) return { status: 'NOT_CONFIGURED', result: { code: 'PROTOFACE_NOT_CONFIGURED', message: 'Set PROTOFACE_API_KEY to enable Protoface image generation.' } }
  const prompt = String(payload.prompt ?? 'Cinematic storyboard frame with consistent character identity and clear composition.')
  const created = await fetch(`${protofaceEndpoint.replace(/\/runs$/, '')}/run/${protofaceImageModel}`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${protofaceApiKey}` }, body: JSON.stringify({ operation: 'image.generate', prompt, quality: String(payload.quality ?? 'high'), resolution: String(payload.resolution ?? '2k'), ...(typeof payload.referenceImageUrl === 'string' ? { image_url: payload.referenceImageUrl } : {}) }) })
  if (!created.ok) throw new Error(`Protoface image request failed with ${created.status}.`)
  let operation = await created.json() as { id?: string; status?: string; image?: { url?: string; content_type?: string; file_name?: string }; error?: string }
  if (!operation.id && !operation.image?.url) throw new Error('Protoface returned no image run ID or image URL.')
  for (let attempt = 0; operation.id && attempt < 90 && !['succeeded', 'completed', 'failed', 'error', 'cancelled'].includes(String(operation.status).toLowerCase()); attempt += 1) {
    await onProgress?.(Math.min(95, 10 + Math.round((attempt / 90) * 85)), operation.status === 'queued' ? 'Queued image with Protoface' : 'Generating image with Protoface')
    await new Promise((resolve) => setTimeout(resolve, 2000))
    const response = await fetch(`${protofaceEndpoint.replace(/\/$/, '')}/${encodeURIComponent(operation.id)}`, { headers: { authorization: `Bearer ${protofaceApiKey}` } })
    if (!response.ok) throw new Error(`Protoface image polling failed with ${response.status}.`)
    operation = await response.json()
  }
  if (['failed', 'error', 'cancelled'].includes(String(operation.status).toLowerCase())) throw new Error(operation.error || `Protoface image run ended with ${operation.status}.`)
  const outputUrl = operation.image?.url
  if (!outputUrl) throw new Error('Protoface completed without an image URL.')
  const image = await fetch(outputUrl)
  if (!image.ok) throw new Error('Protoface returned an unreadable image.')
  await onProgress?.(96, 'Saving Protoface image')
  const contentType = operation.image?.content_type || image.headers.get('content-type') || 'image/png'
  const blob = await put(`storyboard-images/${jobId}.png`, await image.blob(), { access: 'private', contentType, addRandomSuffix: false })
  const assetId = await persistGeneratedMedia(payload, blob.pathname, contentType, 'IMAGE_GENERATED', { provider: 'protoface', model: protofaceImageModel, operationId: operation.id, fileName: operation.image?.file_name, quality: payload.quality || 'high', resolution: payload.resolution || '2k' })
  return { result: { provider: 'protoface', model: protofaceImageModel, operationId: operation.id, assetPathname: blob.pathname, assetId, kind: 'IMAGE' } }
}

const replicateImageProvider: GenerationProvider = async ({ jobId, payload }) => {
  const token = requireReplicateToken()
  const [owner, model] = replicateImageModel.split('/')
  if (!owner || !model) throw new Error('REPLICATE_IMAGE_MODEL must use owner/model format.')
  const created = await fetch(`https://api.replicate.com/v1/models/${owner}/${model}/predictions`, {
    method: 'POST',
    headers: replicateHeaders(token, true),
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
    const response = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, { headers: replicateHeaders(token) })
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
  const token = requireReplicateToken()
  const [owner, model] = replicateImageModel.split('/')
  if (!owner || !model) throw new Error('REPLICATE_IMAGE_MODEL must use owner/model format.')
  const prompt = String(payload.prompt ?? 'Photorealistic cinematic character portrait, natural skin texture, expressive eyes, realistic wardrobe, studio lighting, 85mm lens, no text, no watermark.')
  const created = await fetch(`https://api.replicate.com/v1/models/${owner}/${model}/predictions`, { method: 'POST', headers: replicateHeaders(token, true), body: JSON.stringify({ input: { prompt, aspect_ratio: '4:3', output_format: 'png', safety_tolerance: 2 } }) })
  if (!created.ok) throw new Error(`Replicate character image request failed with ${created.status}.`)
  let prediction = await created.json() as { id: string; status: string; output?: string | string[]; error?: string }
  for (let attempt = 0; attempt < 60 && ['starting', 'processing'].includes(prediction.status); attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 2000))
    const response = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, { headers: replicateHeaders(token) })
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
    headers: elevenLabsHeaders(elevenLabsApiKey),
    body: JSON.stringify({ text, model_id: elevenLabsModelId, voice_settings: { stability: 0.48, similarity_boost: 0.78, style: 0.2, use_speaker_boost: true } }),
  })
  if (!response.ok) throw new Error(`ElevenLabs voice generation failed with ${response.status}.`)
  const blob = await put(`voice-over/${jobId}.mp3`, await response.blob(), { access: 'private', contentType: 'audio/mpeg', addRandomSuffix: false })
  const assetId = await persistGeneratedMedia(payload, blob.pathname, 'audio/mpeg', 'AUDIO_GENERATED', { provider: 'elevenlabs', voiceId: elevenLabsVoiceId, modelId: elevenLabsModelId, text })
  return { result: { provider: 'elevenlabs', voiceId: elevenLabsVoiceId, modelId: elevenLabsModelId, assetPathname: blob.pathname, assetId, kind: 'AUDIO' } }
}

const audioGenerationProvider: GenerationProvider = async (context) => audioEndpoint ? httpMediaProvider(context, audioEndpoint, 'AUDIO') : unavailableProvider('VOICE_GENERATION (AUDIO_PROVIDER_URL)')(context)
const timelineProvider: GenerationProvider = async ({ jobId, payload }) => {
  const projectId = typeof payload.projectId === 'string' ? payload.projectId : ''
  const userId = typeof payload.userId === 'string' ? payload.userId : ''
  const shotNumber = Number(payload.shotNumber)
  if (!projectId || !userId || !Number.isFinite(shotNumber)) throw new Error('Timeline generation requires project, user, and shot context.')
  const shotPrefix = Number.isFinite(shotNumber) ? String(shotNumber) : ''
  const [asset] = await db.select({ id: mediaAssets.id, pathname: mediaAssets.pathname, contentType: mediaAssets.contentType }).from(mediaAssets).where(and(eq(mediaAssets.projectId, projectId), eq(mediaAssets.userId, userId), eq(mediaAssets.kind, 'VIDEO_CLIP'))).orderBy(desc(mediaAssets.createdAt)).limit(1)
  if (!asset) throw new Error(`No generated video asset is available for shot ${shotNumber}.`)
  return { result: { provider: 'timeline', assetId: asset.id, assetPathname: asset.pathname, contentType: asset.contentType, shotNumber, shotKey: shotPrefix, jobId } }
}

type RenderProfile = {
  format: 'mp4'
  width: number
  height: number
  fps: number
  aspectRatio: '16:9' | '9:16' | '1:1'
  codec: 'libx264'
  audioCodec: 'aac'
}

function resolveRenderProfile(payload: Record<string, unknown>): RenderProfile {
  const resolutions: Record<string, [number, number]> = {
    '1920 × 1080': [1920, 1080],
    '3840 × 2160': [3840, 2160],
    '1280 × 720': [1280, 720],
  }
  const requestedResolution = typeof payload.resolution === 'string' ? payload.resolution : '1920 × 1080'
  const [baseWidth, baseHeight] = resolutions[requestedResolution] ?? resolutions['1920 × 1080']
  const aspectRatio = payload.aspectRatio === '9:16' || payload.aspectRatio === '1:1' ? payload.aspectRatio : '16:9'
  const dimensions = aspectRatio === '9:16' ? [baseHeight, baseWidth] : aspectRatio === '1:1' ? [Math.min(baseWidth, baseHeight), Math.min(baseWidth, baseHeight)] : [baseWidth, baseHeight]
  const fpsValue = Number.parseInt(String(payload.frameRate ?? '24'), 10)
  const fps = [24, 30, 60].includes(fpsValue) ? fpsValue : 24
  return { format: 'mp4', width: dimensions[0], height: dimensions[1], fps, aspectRatio, codec: 'libx264', audioCodec: 'aac' }
}

const videoExportProvider: GenerationProvider = async ({ jobId, payload, onProgress }) => {
  if (!ffmpegPath) throw new Error('FFmpeg binary is unavailable in this runtime.')
  const executablePath = ffmpegPath
  const projectId = typeof payload.projectId === 'string' ? payload.projectId : ''
  const userId = typeof payload.userId === 'string' ? payload.userId : ''
  if (!projectId || !userId) throw new Error('Video export requires project and user context.')
  const items = await db.select().from(timelineItems).where(and(eq(timelineItems.projectId, projectId), eq(timelineItems.userId, userId))).orderBy(asc(timelineItems.startSeconds), asc(timelineItems.id))
    const videoItems = items.filter((item) => item.trackType === 'VIDEO' && item.content)
    const audioItems = items.filter((item) => ['AUDIO', 'VOICE', 'MUSIC', 'SFX', 'AMBIENCE'].includes(item.trackType) && item.content)
    if (videoItems.length === 0) throw new Error('No video assets are available for export.')
    const workdir = await mkdtemp(join(tmpdir(), 'film-export-'))
    try {
      const inputs: string[] = []
      const audioInputs: Array<{ path: string; startSeconds: number; durationSeconds: number }> = []
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
      for (const [index, item] of audioItems.entries()) {
        const [linkedAsset] = item.assetId ? await db.select({ pathname: mediaAssets.pathname }).from(mediaAssets).where(and(eq(mediaAssets.id, item.assetId), eq(mediaAssets.projectId, projectId), eq(mediaAssets.userId, userId))).limit(1) : []
        const pathname = linkedAsset?.pathname ?? item.content
        const asset = await get(pathname, { access: 'private' })
        if (!asset) throw new Error(`Timeline audio asset ${item.label || index + 1} was not found.`)
        const inputPath = join(workdir, `audio-${index}.bin`)
        await writeFile(inputPath, Buffer.from(await new Response(asset.stream).arrayBuffer()))
        audioInputs.push({ path: inputPath, startSeconds: Math.max(0, Number(item.startSeconds) || 0), durationSeconds: Math.max(0.1, Number(item.durationSeconds) || 1) })
      }
      const profile = resolveRenderProfile(payload)
      await onProgress?.(10, `Preparing ${profile.width} × ${profile.height} ${profile.fps}fps render`)
      const outputPath = join(workdir, 'film.mp4')
      await new Promise<void>((resolve, reject) => {
        const videoFilters = inputs.map((_, index) => `[${index}:v]scale=${profile.width}:${profile.height}:force_original_aspect_ratio=decrease,pad=${profile.width}:${profile.height}:(ow-iw)/2:(oh-ih)/2:color=black,fps=${profile.fps},format=yuv420p,setpts=PTS-STARTPTS[v${index}]`).join(';')
        const concatInputs = inputs.map((_, index) => `[v${index}]`).join('')
        const filterParts = [`${videoFilters};${concatInputs}concat=n=${inputs.length}:v=1:a=0[vout]`]
        const audioOffset = inputs.length
        if (audioInputs.length > 0) {
          const audioFilters = audioInputs.map((audio, index) => `[${audioOffset + index}:a]aresample=48000,adelay=${Math.round(audio.startSeconds * 1000)}|${Math.round(audio.startSeconds * 1000)},atrim=duration=${audio.durationSeconds},asetpts=PTS-STARTPTS[a${index}]`).join(';')
          const audioLabels = audioInputs.map((_, index) => `[a${index}]`).join('')
          filterParts.push(`${audioFilters};${audioLabels}amix=inputs=${audioInputs.length}:duration=longest:dropout_transition=2,alimiter=limit=0.95[aout]`)
        } else {
          filterParts.push(`anullsrc=channel_layout=stereo:sample_rate=48000[aout]`)
        }
        const filterComplex = filterParts.join(';')
        let command = ffmpeg().setFfmpegPath(executablePath)
        for (const input of inputs) command = command.input(input)
        for (const audio of audioInputs) command = command.input(audio.path)
        if (audioInputs.length === 0) command = command.input('anullsrc=channel_layout=stereo:sample_rate=48000').inputOptions(['-f', 'lavfi'])
        command.outputOptions(['-filter_complex', filterComplex, '-map', '[vout]', '-map', '[aout]', '-r', String(profile.fps), '-c:v', profile.codec, '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-c:a', profile.audioCodec, '-b:a', '192k', '-ar', '48000', '-shortest', '-movflags', '+faststart']).on('end', () => resolve()).on('error', reject).save(outputPath)
      })
    await onProgress?.(90, 'Uploading rendered MP4')
    const blob = await put(`film-exports/${jobId}.mp4`, await (await import('node:fs/promises')).readFile(outputPath), { access: 'private', contentType: 'video/mp4', addRandomSuffix: false })
    const [media] = await db.insert(mediaAssets).values({ userId, projectId, kind: 'VIDEO_EXPORT', pathname: blob.pathname, contentType: 'video/mp4', metadata: { jobId, sourceCount: inputs.length, renderProfile: profile } }).returning({ id: mediaAssets.id })
    const manifest = { jobId, projectId, format: profile.format, resolution: `${profile.width} × ${profile.height}`, frameRate: `${profile.fps} fps`, aspectRatio: profile.aspectRatio, createdAt: new Date().toISOString(), status: 'READY', assetPathname: blob.pathname, mediaId: media?.id, sourceCount: inputs.length }
    return { result: { provider: 'ffmpeg', assetPathname: blob.pathname, mediaId: media?.id, manifest } }
  } finally { await rm(workdir, { recursive: true, force: true }) }
}

export function providerFor(type: string): GenerationProvider {
  if (type === 'SCENE_GENERATION') return sceneBreakdownProvider
  if (type === 'SCRIPT_GENERATION') return gatewayTextProvider
  const configured = providerConfig[type as keyof typeof providerConfig]
  if (type === 'VIDEO_GENERATION' && configured === 'replicate') return replicateVideoProvider
  if (type === 'VIDEO_GENERATION' && configured === 'protoface') return protofaceVideoProvider
  if (type === 'IMAGE_GENERATION' && configured === 'http' && imageEndpoint) return imageGenerationProvider
  if (type === 'IMAGE_GENERATION' && configured === 'protoface') return protofaceImageProvider
  if (type === 'IMAGE_GENERATION' && configured === 'replicate') return replicateImageProvider
  if (type === 'CHARACTER_GENERATION' && configured === 'replicate') return characterImageProvider
  if (type === 'VOICE_GENERATION' && configured === 'http' && audioEndpoint) return audioGenerationProvider
  if (type === 'VOICE_GENERATION' && configured === 'elevenlabs') return elevenLabsAudioProvider
  if (type === 'TIMELINE_BUILD' && configured === 'local') return timelineProvider
  if (type === 'VIDEO_EXPORT' && configured === 'local') return videoExportProvider
  return unavailableProvider(`${type} (${configured || 'unknown'})`)
}

export function configuredProviders() {
  return { ...providerConfig }
}

import { createServer } from 'node:http'
import { Redis } from '@upstash/redis'
import { providerFor } from './providers/index'
import { acknowledgeGenerationJob, claimGenerationJob, requeueProcessingJobs } from '../lib/queue/index'

const port = Number(process.env.WORKER_PORT || 8787)
const redis = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN ? Redis.fromEnv() : null
const appUrl = process.env.APP_URL?.replace(/\/$/, '')
const workerToken = process.env.WORKER_TOKEN
const maxAttempts = Math.max(1, Number(process.env.WORKER_MAX_ATTEMPTS || 3))
const retryDelayMs = Math.max(1000, Number(process.env.WORKER_RETRY_DELAY_MS || 5000))
const workerId = `${process.env.HOSTNAME || 'worker'}-${process.pid}-${Math.random().toString(36).slice(2, 8)}`
type Progress = { status: 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'DEAD_LETTER'; progress: number; stage: string; error?: string; result?: Record<string, unknown> }
type QueuedJob = { jobId: string; type?: string; payload?: Record<string, unknown> }

async function report(jobId: string, payload: Progress) {
  if (!appUrl) throw new Error('APP_URL is required for worker callbacks.')
  if (!workerToken && process.env.NODE_ENV === 'production') throw new Error('WORKER_TOKEN is required for worker callbacks.')
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (workerToken) headers.authorization = `Bearer ${workerToken}`
  const response = await fetch(`${appUrl}/api/internal/jobs/${jobId}/progress`, { method: 'POST', headers, body: JSON.stringify(payload) })
  if (!response.ok) throw new Error(`Progress callback failed with ${response.status}.`)
}

async function processJob(jobId: string, queuedPayload: Record<string, unknown> = {}, jobType?: string) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
    await report(jobId, { status: 'PROCESSING', progress: 10, stage: 'Worker accepted job' })
    const providerType = typeof queuedPayload.type === 'string' ? queuedPayload.type : jobType ?? 'VIDEO_GENERATION'
    await report(jobId, { status: 'PROCESSING', progress: 45, stage: `Dispatching ${providerType.toLowerCase()} provider` })
    const payload = { type: providerType, jobId, prompt: queuedPayload.prompt || process.env.VIDEO_PROMPT || 'Cinematic storyboard shot with natural movement and consistent visual identity.', durationSeconds: queuedPayload.durationSeconds || 4, ...queuedPayload }
    const result = await providerFor(providerType)({ jobId, payload })
      if (result.status === 'NOT_CONFIGURED') {
        await report(jobId, { status: 'FAILED', progress: 45, stage: 'Provider not configured', error: String(result.result.message ?? 'Provider is not configured.'), result: result.result })
        return
      }
      await report(jobId, { status: 'COMPLETED', progress: 100, stage: 'Generation complete', result: { ...result.result, generatedAt: new Date().toISOString() } })
      return
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Generation failed.'
      if (attempt < maxAttempts) {
        await report(jobId, { status: 'PROCESSING', progress: 45, stage: `Retrying generation (${attempt}/${maxAttempts})`, error: message }).catch((callbackError) => console.error('[v0] worker callback failed', callbackError))
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs * 2 ** (attempt - 1)))
        continue
      }
      await report(jobId, { status: 'DEAD_LETTER', progress: 45, stage: 'Generation moved to dead letter', error: message }).catch((callbackError) => console.error('[v0] worker callback failed', callbackError))
    }
  }
}

async function processJobs() {
  if (!redis) return
  while (true) {
    const queued = await claimGenerationJob(workerId)
    if (!queued) { await new Promise((resolve) => setTimeout(resolve, 2000)); continue }
    try {
      const parsed = JSON.parse(String(queued)) as QueuedJob
      await processJob(parsed.jobId, { ...(parsed.payload ?? {}), type: parsed.type ?? parsed.payload?.type }, parsed.type)
      await acknowledgeGenerationJob(String(queued))
    } catch (error) {
      console.error('[worker] Invalid queue message', error)
      // A malformed payload cannot be retried safely because it has no job id.
      await acknowledgeGenerationJob(String(queued))
    }
  }
}

const server = createServer((request, response) => {
  if (request.method !== 'POST' || request.url !== '/worker/health') return response.writeHead(404).end('Not found')
  if (!workerToken && process.env.NODE_ENV === 'production') return response.writeHead(503).end('Worker authentication is not configured')
  if (workerToken && request.headers.authorization !== `Bearer ${workerToken}`) return response.writeHead(401).end('Unauthorized')
  response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ ok: true, worker: 'ready' }))
})

server.listen(port, () => {
  console.log(`Generation worker listening on ${port}`)
  void requeueProcessingJobs(workerId).catch((error) => console.error('[v0] worker recovery failed', error))
  void processJobs()
})

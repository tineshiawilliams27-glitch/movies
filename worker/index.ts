import { createServer } from 'node:http'
import { Redis } from '@upstash/redis'
import { demoProvider, providerFor } from './providers/index'

const port = Number(process.env.WORKER_PORT || 8787)
const redis = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN ? Redis.fromEnv() : null
const appUrl = process.env.APP_URL?.replace(/\/$/, '')
const workerToken = process.env.WORKER_TOKEN
const demoMode = process.env.DEMO_MODE === 'true'

type Progress = { status: 'PROCESSING' | 'COMPLETED' | 'FAILED'; progress: number; stage: string; error?: string; result?: Record<string, unknown> }

async function report(jobId: string, payload: Progress) {
  if (!appUrl) throw new Error('APP_URL is required for worker callbacks.')
  const response = await fetch(`${appUrl}/api/internal/jobs/${jobId}/progress`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${workerToken ?? ''}` }, body: JSON.stringify(payload) })
  if (!response.ok) throw new Error(`Progress callback failed with ${response.status}.`)
}

async function processJob(jobId: string) {
  try {
    await report(jobId, { status: 'PROCESSING', progress: 10, stage: 'Worker accepted job' })
    await report(jobId, { status: 'PROCESSING', progress: 45, stage: demoMode ? 'Running deterministic demo provider' : 'Dispatching generation provider' })
    const payload = { type: 'GENERATION_JOB', jobId }
    const result = demoMode ? await demoProvider({ jobId, payload }) : await providerFor('VIDEO_GENERATION')({ jobId, payload })
    await report(jobId, { status: 'COMPLETED', progress: 100, stage: 'Generation complete', result: { ...result.result, generatedAt: new Date().toISOString() } })
  } catch (error) {
    await report(jobId, { status: 'FAILED', progress: 45, stage: 'Generation failed', error: error instanceof Error ? error.message : 'Generation failed.' }).catch((callbackError) => console.error('[v0] worker callback failed', callbackError))
  }
}

async function processJobs() {
  if (!redis) return
  while (true) {
    const jobId = await redis.rpop<string>('lumen-forge:generation-jobs')
    if (!jobId) { await new Promise((resolve) => setTimeout(resolve, 2000)); continue }
    await processJob(String(jobId))
  }
}

const server = createServer((request, response) => {
  if (request.method !== 'POST' || request.url !== '/worker/health') return response.writeHead(404).end('Not found')
  if (!workerToken && process.env.NODE_ENV === 'production') return response.writeHead(503).end('Worker authentication is not configured')
  if (workerToken && request.headers.authorization !== `Bearer ${workerToken}`) return response.writeHead(401).end('Unauthorized')
  response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ ok: true, worker: 'ready', demoMode }))
})

server.listen(port, () => { console.log(`GPU worker listening on ${port}`); void processJobs() })

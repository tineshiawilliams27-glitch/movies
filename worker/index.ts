import { createServer } from 'node:http'
import { Redis } from '@upstash/redis'

const port = Number(process.env.WORKER_PORT || 8787)
const redis = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN ? Redis.fromEnv() : null
const appUrl = process.env.APP_URL?.replace(/\/$/, '')
const workerToken = process.env.WORKER_TOKEN

async function report(jobId: string, payload: Record<string, unknown>) {
  if (!appUrl) return
  await fetch(`${appUrl}/api/internal/jobs/${jobId}/progress`, { method: 'POST', headers: { 'content-type': 'application/json', ...(workerToken ? { authorization: `Bearer ${workerToken}` } : {}) }, body: JSON.stringify(payload) })
}

async function processJobs() {
  if (!redis) return
  while (true) {
    const jobId = await redis.rpop<string>('lumen-forge:generation-jobs')
    if (!jobId) { await new Promise((resolve) => setTimeout(resolve, 2000)); continue }
    const id = String(jobId)
    await report(id, { status: 'PROCESSING', progress: 10, stage: 'Worker accepted job' })
    await report(id, { status: 'PROCESSING', progress: 35, stage: 'Preparing generation inputs' })
    await report(id, { status: 'FAILED', progress: 35, stage: 'Waiting for configured AI provider', error: 'No GPU provider adapter is configured. Set VIDEO_PROVIDER or enable DEMO_MODE on the worker.' })
  }
}

const server = createServer(async (request, response) => {
  if (request.method !== 'POST' || request.url !== '/worker/health') {
    response.writeHead(404).end('Not found')
    return
  }
  if (workerToken && request.headers.authorization !== `Bearer ${workerToken}`) {
    response.writeHead(401).end('Unauthorized')
    return
  }
  response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ ok: true, worker: 'ready' }))
})

server.listen(port, () => {
  console.log(`GPU worker listening on ${port}`)
  void processJobs()
})

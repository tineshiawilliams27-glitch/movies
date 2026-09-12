import { createServer } from 'node:http'
import { dequeueJob, getQueueKey } from './queue'
import { claimJob, getJob } from './jobs'
import { processGenerationJob } from '../workflows/generation'

const port = Number(process.env.PORT || 8080)
const pollMs = Math.max(250, Number(process.env.WORKER_POLL_INTERVAL_MS || 1000))
const concurrency = {
  text: Math.max(1, Number(process.env.WORKER_TEXT_CONCURRENCY || 4)),
  image: Math.max(1, Number(process.env.WORKER_IMAGE_CONCURRENCY || 3)),
  voice: Math.max(1, Number(process.env.WORKER_VOICE_CONCURRENCY || 3)),
  video: Math.max(1, Number(process.env.WORKER_VIDEO_CONCURRENCY || 2)),
  export: Math.max(1, Number(process.env.WORKER_EXPORT_CONCURRENCY || 1)),
}
const active = new Map<keyof typeof concurrency, number>(Object.keys(concurrency).map((key) => [key as keyof typeof concurrency, 0]))

function poolFor(type: string): keyof typeof concurrency {
  if (type === 'VIDEO_GENERATION') return 'video'
  if (type === 'IMAGE_GENERATION' || type === 'CHARACTER_GENERATION') return 'image'
  if (type === 'VOICE_GENERATION') return 'voice'
  if (type === 'VIDEO_EXPORT') return 'export'
  return 'text'
}

function canStart(pool: keyof typeof concurrency) {
  return (active.get(pool) ?? 0) < concurrency[pool]
}

async function processNextJob() {
  for (const pool of Object.keys(concurrency) as Array<keyof typeof concurrency>) {
    if (!canStart(pool)) continue
    const jobId = await dequeueJob()
    if (!jobId) return
    void processJob(jobId, pool)
  }
}

async function processJob(jobId: string, reservedPool: keyof typeof concurrency) {
  active.set(reservedPool, (active.get(reservedPool) ?? 0) + 1)
  let actualPool = reservedPool
  let transferred = false
  try {
    const claimed = await claimJob(jobId)
    if (!claimed) return
    const job = await getJob(jobId)
    actualPool = poolFor(job.type)
    if (actualPool !== reservedPool) {
      active.set(reservedPool, Math.max(0, (active.get(reservedPool) ?? 1) - 1))
      if (!canStart(actualPool)) {
        await updateJobAfterFailure(jobId, 'The worker is at capacity for this job type.')
        return
      }
      active.set(actualPool, (active.get(actualPool) ?? 0) + 1)
      transferred = true
    }
    await processGenerationJob(job.id, job.userId, job.type, job.payload)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Worker processing failed.'
    console.error('[worker] job failed', message)
    await updateJobAfterFailure(jobId, message)
  } finally {
    if (!transferred) active.set(reservedPool, Math.max(0, (active.get(reservedPool) ?? 1) - 1))
    else active.set(actualPool, Math.max(0, (active.get(actualPool) ?? 1) - 1))
  }
}

async function updateJobAfterFailure(jobId: string, message: string) {
  try {
    await fetch(`${(process.env.WORKER_API_URL || 'http://localhost:3000').replace(/\/$/, '')}/api/internal/jobs/${jobId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-worker-secret': process.env.WORKER_API_SECRET || '' }, body: JSON.stringify({ status: 'DEAD_LETTER', error: message, stage: 'Worker failed' }) })
  } catch (updateError) {
    console.error('[worker] failed to update job state', updateError)
  }
}

const server = createServer(async (request, response) => {
  if (request.method === 'GET' && request.url === '/health') {
    try {
      const status = process.env.WORKER_API_SECRET ? 'ready' : 'misconfigured'
      response.writeHead(status === 'ready' ? 200 : 503, { 'content-type': 'application/json' })
      response.end(JSON.stringify({ status, queue: getQueueKey(), pollMs }))
    } catch (error) {
      response.writeHead(503, { 'content-type': 'application/json' })
      response.end(JSON.stringify({ status: 'unhealthy', error: error instanceof Error ? error.message : 'Worker health check failed.' }))
    }
    return
  }
  if (request.method === 'GET' && request.url === '/ready') {
    const provided = request.headers['x-worker-secret']
    if (!process.env.WORKER_API_SECRET || provided !== process.env.WORKER_API_SECRET) {
      response.writeHead(401)
      response.end()
      return
    }
    response.writeHead(200, { 'content-type': 'application/json' })
    response.end(JSON.stringify({ status: 'ready', queue: getQueueKey() }))
    return
  }
  response.writeHead(404)
  response.end()
})

const interval = setInterval(() => void processNextJob(), pollMs)
server.listen(port, () => console.log(`[worker] listening on ${port}`))

async function shutdown(signal: string) {
  clearInterval(interval)
  server.close(() => {
    console.log(`[worker] ${signal}; shutdown complete`)
    process.exit(0)
  })
}
process.once('SIGTERM', () => void shutdown('SIGTERM'))
process.once('SIGINT', () => void shutdown('SIGINT'))

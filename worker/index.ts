import { createServer } from 'node:http'
import { dequeueJob, getQueueKey } from './queue'
import { claimJob, getJob } from './jobs'
import { processGenerationJob } from '../workflows/generation'

const port = Number(process.env.PORT || 8080)
const pollMs = Math.max(250, Number(process.env.WORKER_POLL_INTERVAL_MS || 1000))
let running = false

async function processNextJob() {
  if (running) return
  running = true
  let jobId: string | null = null
  try {
    jobId = await dequeueJob()
    if (!jobId) return
    const claimed = await claimJob(jobId)
    if (!claimed) return
    const job = await getJob(jobId)
    await processGenerationJob(job.id, job.userId, job.type, job.payload)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Worker processing failed.'
    console.error('[worker] job failed', message)
    if (jobId) {
      try {
        await fetch(`${(process.env.WORKER_API_URL || 'http://localhost:3000').replace(/\/$/, '')}/api/internal/jobs/${jobId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-worker-secret': process.env.WORKER_API_SECRET || '' }, body: JSON.stringify({ status: 'DEAD_LETTER', error: message, stage: 'Worker failed' }) })
      } catch (updateError) {
        console.error('[worker] failed to update job state', updateError)
      }
    }
  } finally {
    running = false
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

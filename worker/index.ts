import { createServer } from 'node:http'
import { dequeueJob, getQueueKey } from './queue'
import { getJob } from './jobs'
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

const server = createServer((request, response) => {
  if (request.method === 'GET' && request.url === '/health') {
    response.writeHead(200, { 'content-type': 'application/json' })
    response.end(JSON.stringify({ status: 'healthy', queue: getQueueKey() }))
    return
  }
  response.writeHead(404)
  response.end()
})

server.listen(port, () => {
  console.log(`[worker] listening on ${port}`)
  setInterval(() => void processNextJob(), pollMs)
})

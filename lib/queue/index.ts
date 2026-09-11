import { Redis } from '@upstash/redis'

const redis = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN ? Redis.fromEnv() : null

const QUEUE_KEY = 'lumen-forge:generation-jobs'
const PROCESSING_KEY = 'lumen-forge:generation-jobs:processing'

export async function enqueueGenerationJob(jobId: string, payload?: Record<string, unknown>, type?: string) {
  if (!redis) throw new Error('Queue is not configured. Set KV_REST_API_URL and KV_REST_API_TOKEN.')
  await redis.lpush(QUEUE_KEY, JSON.stringify({ jobId, type, payload: payload ?? {} }))
}

export async function claimGenerationJob() {
  if (!redis) return null
  return redis.lmove<string>(QUEUE_KEY, PROCESSING_KEY, 'right', 'left')
}

export async function acknowledgeGenerationJob(queued: string) {
  if (!redis) return
  await redis.lrem(PROCESSING_KEY, 1, queued)
}

export async function requeueProcessingJobs() {
  if (!redis) return
  const processing = await redis.lrange<string>(PROCESSING_KEY, 0, -1)
  if (processing.length === 0) return
  await redis.del(PROCESSING_KEY)
  await redis.lpush(QUEUE_KEY, ...processing)
}

export { redis }

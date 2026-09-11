import { Redis } from '@upstash/redis'

const queueKey = process.env.WORKER_QUEUE_KEY || 'generation:pending'
let redis: Redis | undefined

function requireRedis() {
  if (redis) return redis
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) throw new Error('Redis queue is not configured. Set KV_REST_API_URL and KV_REST_API_TOKEN.')
  redis = new Redis({ url, token })
  return redis
}

export async function enqueueJob(jobId: string) {
  await requireRedis().rpush(queueKey, jobId)
}

export async function dequeueJob() {
  const result = await requireRedis().lpop<string>(queueKey)
  return result ?? null
}

export function getQueueKey() {
  return queueKey
}

export function getRedis() {
  return requireRedis()
}

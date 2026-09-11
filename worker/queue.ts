import { Redis } from '@upstash/redis'

const queueKey = process.env.WORKER_QUEUE_KEY || 'generation:pending'
const redis = Redis.fromEnv()

export async function enqueueJob(jobId: string) {
  await redis.rpush(queueKey, jobId)
}

export async function dequeueJob() {
  const result = await redis.lpop<string>(queueKey)
  return result ?? null
}

export function getQueueKey() {
  return queueKey
}

export function getRedis() {
  return redis
}

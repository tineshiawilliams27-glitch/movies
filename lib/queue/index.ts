import { Redis } from '@upstash/redis'

const redis = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN ? Redis.fromEnv() : null

export async function enqueueGenerationJob(jobId: string, payload?: Record<string, unknown>) {
  if (!redis) throw new Error('Queue is not configured. Set KV_REST_API_URL and KV_REST_API_TOKEN.')
  await redis.lpush('lumen-forge:generation-jobs', JSON.stringify({ jobId, payload: payload ?? {} }))
}

export { redis }

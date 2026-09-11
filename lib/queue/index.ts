import { Redis } from '@upstash/redis'

const redis = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN ? Redis.fromEnv() : null

const QUEUE_KEY = 'lumen-forge:generation-jobs'
const PROCESSING_KEY = 'lumen-forge:generation-jobs:processing'
const CLAIMS_KEY = 'lumen-forge:generation-jobs:claims'
const RECOVERY_LOCK_KEY = 'lumen-forge:generation-jobs:recovery-lock'
const CLAIM_LEASE_MS = Math.max(30_000, Number(process.env.WORKER_CLAIM_LEASE_MS || 300_000))

type ClaimState = { workerId: string; claimedAt: number; attempts: number }

export async function enqueueGenerationJob(jobId: string, payload?: Record<string, unknown>, type?: string) {
  if (!redis) throw new Error('Queue is not configured. Set KV_REST_API_URL and KV_REST_API_TOKEN.')
  await redis.lpush(QUEUE_KEY, JSON.stringify({ jobId, type, payload: payload ?? {} }))
}

export async function claimGenerationJob(workerId: string) {
  if (!redis) return null
  const queued = await redis.lmove<string>(QUEUE_KEY, PROCESSING_KEY, 'right', 'left')
  if (!queued) return null
  const now = Date.now()
  const jobId = (() => {
    try { return JSON.parse(String(queued)).jobId as string } catch { return String(queued) }
  })()
  const previousAttempts = Number(await redis.hget<string>(CLAIMS_KEY, jobId) || 0)
  const state: ClaimState = { workerId, claimedAt: now, attempts: previousAttempts + 1 }
  await redis.hset(CLAIMS_KEY, { [jobId]: JSON.stringify(state) })
  return queued
}

export async function acknowledgeGenerationJob(queued: string) {
  if (!redis) return
  await redis.lrem(PROCESSING_KEY, 1, queued)
  try {
    const jobId = JSON.parse(String(queued)).jobId as string
    await redis.hdel(CLAIMS_KEY, jobId)
  } catch { /* malformed messages have no claim to clean up */ }
}

export async function requeueProcessingJobs(workerId: string) {
  if (!redis) return
  const lock = await redis.set(RECOVERY_LOCK_KEY, workerId, { nx: true, ex: 30 })
  if (!lock) return
  try {
    const processing = await redis.lrange<string>(PROCESSING_KEY, 0, -1)
    const stale: string[] = []
    for (const queued of processing) {
      let jobId: string
      try { jobId = JSON.parse(String(queued)).jobId as string } catch { stale.push(String(queued)); continue }
      const rawState = await redis.hget<string>(CLAIMS_KEY, jobId)
      let state: ClaimState | null = null
      try { state = rawState ? JSON.parse(rawState) as ClaimState : null } catch { state = null }
      if (!state || Date.now() - state.claimedAt >= CLAIM_LEASE_MS) stale.push(String(queued))
    }
    for (const queued of stale) {
      await redis.lrem(PROCESSING_KEY, 1, queued)
      await redis.lpush(QUEUE_KEY, queued)
    }
  } finally {
    await redis.del(RECOVERY_LOCK_KEY)
  }
}

export { redis }

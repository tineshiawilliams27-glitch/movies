import { enqueueJob } from './queue'

type WorkerJob = {
  id: string
  userId: string
  type: string
  payload: Record<string, unknown>
  workerId?: string | null
  leaseExpiresAt?: string | null
}

const apiUrl = (process.env.WORKER_API_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')
const workerSecret = process.env.WORKER_API_SECRET
export const workerId = process.env.WORKER_ID || `worker-${process.pid}`
export const leaseMs = Math.max(30_000, Number(process.env.WORKER_LEASE_MS || 300_000))

async function request(path: string, init?: RequestInit) {
  if (!workerSecret) throw new Error('WORKER_API_SECRET is required by the worker.')
  const response = await fetch(`${apiUrl}${path}`, { ...init, headers: { 'Content-Type': 'application/json', 'x-worker-secret': workerSecret, 'x-worker-id': workerId, ...(init?.headers || {}) } })
  if (!response.ok) throw new Error(`Worker API request failed (${response.status}).`)
  return response.json() as Promise<Record<string, unknown>>
}

export async function getJob(jobId: string) {
  const result = await request(`/api/internal/jobs/${encodeURIComponent(jobId)}`)
  return result.job as WorkerJob
}

export async function updateJob(jobId: string, values: Record<string, unknown>) {
  await request(`/api/internal/jobs/${encodeURIComponent(jobId)}`, { method: 'PATCH', body: JSON.stringify({ ...values, workerId, leaseExpiresAt: new Date(Date.now() + leaseMs).toISOString() }) })
}

export async function recoverExpiredJobs() {
  try {
    const result = await request('/api/internal/jobs/recover', { method: 'POST' })
    for (const jobId of (result.recovered as string[] | undefined) || []) await enqueueJob(jobId)
  } catch {
    // Recovery is retried on the next polling cycle.
  }
}

export async function claimJob(jobId: string) {
  try {
    const result = await request(`/api/internal/jobs/${encodeURIComponent(jobId)}`, { method: 'PATCH', body: JSON.stringify({ expectedStatus: 'QUEUED', status: 'PROCESSING', stage: 'Claimed by worker', progress: 1, workerId, leaseExpiresAt: new Date(Date.now() + leaseMs).toISOString(), incrementAttempts: true }) })
    return Boolean(result.job)
  } catch {
    return false
  }
}

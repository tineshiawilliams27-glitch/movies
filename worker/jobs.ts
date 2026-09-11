type WorkerJob = {
  id: string
  userId: string
  type: string
  payload: Record<string, unknown>
}

const apiUrl = (process.env.WORKER_API_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')
const workerSecret = process.env.WORKER_API_SECRET

async function request(path: string, init?: RequestInit) {
  if (!workerSecret) throw new Error('WORKER_API_SECRET is required by the worker.')
  const response = await fetch(`${apiUrl}${path}`, { ...init, headers: { 'Content-Type': 'application/json', 'x-worker-secret': workerSecret, ...(init?.headers || {}) } })
  if (!response.ok) throw new Error(`Worker API request failed (${response.status}).`)
  return response.json() as Promise<Record<string, unknown>>
}

export async function getJob(jobId: string) {
  const result = await request(`/api/internal/jobs/${encodeURIComponent(jobId)}`)
  return result.job as WorkerJob
}

export async function updateJob(jobId: string, values: Record<string, unknown>) {
  await request(`/api/internal/jobs/${encodeURIComponent(jobId)}`, { method: 'PATCH', body: JSON.stringify(values) })
}

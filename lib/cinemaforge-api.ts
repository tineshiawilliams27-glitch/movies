export type ProjectRecord = {
  id: string
  title: string
  genre: string
  visualStyle: string
  status: string
  logline?: string | null
  updatedAt?: string
}

export type SceneRecord = { id: string; position: number; title: string; description: string; shotPrompt?: string | null; narration?: string | null }
export type AssetRecord = { id: string; projectId: string; type: string; pathname: string; mimeType: string; size?: number | null }
export type JobRecord = { id: string; projectId: string; type: string; status: string; progress: number; message?: string | null; error?: string | null; payload?: Record<string, unknown> | null }
export type ExportRecord = { id: string; projectId: string; status: string; progress: number; outputAssetId?: string | null; error?: string | null; url?: string | null }

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, headers: { ...(init?.body instanceof FormData ? {} : { 'content-type': 'application/json' }), ...init?.headers } })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : `Request failed (${response.status})`)
  return data as T
}

export const cinemaApi = {
  listProjects: () => request<{ projects: ProjectRecord[] }>('/api/projects'),
  createProject: (input: { title: string; genre: string; visualStyle: string }) => request<{ project: ProjectRecord }>('/api/projects', { method: 'POST', body: JSON.stringify(input) }),
  listScenes: (projectId: string) => request<{ scenes: SceneRecord[] }>(`/api/storyboard?projectId=${encodeURIComponent(projectId)}`),
  createScenes: (projectId: string, count = 4) => request<{ scenes: SceneRecord[] }>('/api/storyboard', { method: 'POST', body: JSON.stringify({ projectId, count }) }),
  uploadAsset: (projectId: string, file: File) => { const form = new FormData(); form.set('projectId', projectId); form.set('file', file); return request<{ asset: AssetRecord }>('/api/assets', { method: 'POST', body: form }) },
  startGeneration: (projectId: string, prompt: string, type = 'story') => request<{ job: JobRecord; result?: Record<string, unknown> }>('/api/generation', { method: 'POST', body: JSON.stringify({ projectId, prompt, type }) }),
  getGeneration: (id: string) => request<{ job: JobRecord }>(`/api/generation/${id}`),
  updateGeneration: (id: string, action: 'cancel' | 'retry') => request<{ job: JobRecord }>(`/api/generation/${id}?action=${action}`, { method: 'POST' }),
  startExport: (projectId: string) => request<{ export: ExportRecord }>('/api/exports', { method: 'POST', body: JSON.stringify({ projectId }) }),
  getExport: (id: string) => request<{ export: ExportRecord }>(`/api/exports/${id}`),
}

export function isTerminal(status: string) { return ['completed', 'complete', 'failed', 'cancelled'].includes(status.toLowerCase()) }
export function getResultUrl(value: ExportRecord) { return value.url ?? (value as ExportRecord & { outputUrl?: string }).outputUrl ?? null }

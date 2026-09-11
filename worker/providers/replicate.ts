export function getReplicateToken() {
  return (process.env.REPLICATE_API_TOKEN || '').trim()
}

export function replicateHeaders(token: string, json = false) {
  return { Authorization: `Bearer ${token}`, ...(json ? { 'Content-Type': 'application/json' } : {}) }
}

export function requireReplicateToken() {
  const token = getReplicateToken()
  if (!token) throw new Error('Replicate is not configured. Set REPLICATE_API_TOKEN or connect Replicate through the deployment provider.')
  return token
}

export async function getReplicateModelSchema(token: string, model: string) {
  const [owner, name] = model.split('/')
  if (!owner || !name) throw new Error('Replicate model must use owner/model format.')
  const response = await fetch(`https://api.replicate.com/v1/models/${owner}/${name}`, { headers: replicateHeaders(token) })
  if (!response.ok) throw new Error(`Unable to inspect Replicate model ${model} (${response.status}).`)
  return { owner, name, info: await response.json() as { latest_version?: { openapi_schema?: { components?: { schemas?: { Input?: { properties?: Record<string, unknown>; required?: string[] } } } } } } }
}

const required = ['DATABASE_URL', 'BETTER_AUTH_SECRET'] as const

export function validateProductionEnv() {
  if (process.env.NODE_ENV !== 'production') return { ok: true as const, missing: [] as string[] }
  const missing = required.filter((key) => !process.env[key])
  return { ok: missing.length === 0, missing }
}

export function requireEnv(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

import { betterAuth } from 'better-auth'
import { pool } from '@/lib/db'

const toOrigin = (value?: string) => {
  if (!value) return undefined
  try {
    return new URL(value.includes('://') ? value : `https://${value}`).origin
  } catch {
    return undefined
  }
}
const origins = (...values: Array<string | undefined>) => values.flatMap((value) => {
  const origin = toOrigin(value)
  return origin ? [origin] : []
})
const productionOrigins = origins(
  process.env.VERCEL_PROJECT_PRODUCTION_URL,
  process.env.VERCEL_URL,
)
const baseURL = toOrigin(process.env.BETTER_AUTH_URL) ?? productionOrigins[0] ?? toOrigin(process.env.V0_RUNTIME_URL)

if (!process.env.BETTER_AUTH_SECRET) throw new Error('BETTER_AUTH_SECRET is required to start CinemaForge')
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required to start CinemaForge')

const socialProviders = {
  ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? { google: { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET } } : {}),
  ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET ? { github: { clientId: process.env.GITHUB_CLIENT_ID, clientSecret: process.env.GITHUB_CLIENT_SECRET } } : {}),
}

export const auth = betterAuth({
  baseURL,
  database: pool,
  emailAndPassword: { enabled: true, autoSignIn: true },
  socialProviders,
  trustedOrigins: process.env.NODE_ENV === 'development'
    ? ['http://localhost:3000', ...origins(process.env.V0_RUNTIME_URL, process.env.V0_DEV_APP_URL, process.env.V0_BUILD_URL, process.env.V0_SANDBOX_URL)]
    : productionOrigins,
  session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
  ...(process.env.NODE_ENV === 'development' ? { advanced: { defaultCookieAttributes: { sameSite: 'none' as const, secure: true } } } : {}),
})

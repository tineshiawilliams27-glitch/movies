import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextResponse } from 'next/server'

const redisUrl = process.env.KV_REST_API_URL
const redisToken = process.env.KV_REST_API_TOKEN
const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : undefined
const limiters = new Map<string, Ratelimit>()

type RateLimitPolicy = {
  name: string
  requests: number
  window: Parameters<typeof Ratelimit.slidingWindow>[1]
}

function getLimiter(policy: RateLimitPolicy) {
  if (!redis) throw new Error('Rate limiting is not configured. Set KV_REST_API_URL and KV_REST_API_TOKEN.')
  const existing = limiters.get(policy.name)
  if (existing) return existing
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(policy.requests, policy.window),
    prefix: `movies:ratelimit:${policy.name}`,
    analytics: true,
  })
  limiters.set(policy.name, limiter)
  return limiter
}

export const rateLimitPolicies = {
  normal: { name: 'normal', requests: 60, window: '1 m' },
  ai: { name: 'ai', requests: 5, window: '10 m' },
  image: { name: 'image', requests: 10, window: '1 h' },
  upload: { name: 'upload', requests: 20, window: '10 m' },
} satisfies Record<string, RateLimitPolicy>

export async function checkRateLimit(identifier: string, policy: RateLimitPolicy) {
  return getLimiter(policy).limit(identifier)
}

export function rateLimitResponse(reset: number) {
  const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000))
  return NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } },
  )
}

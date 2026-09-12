import { NextResponse } from 'next/server'
import { and, eq, lt, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { generationJobs } from '@/lib/db/schema'

function authorized(request: Request) {
  const secret = process.env.WORKER_API_SECRET
  return Boolean(secret && request.headers.get('authorization') === `Bearer ${secret}`)
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  const now = new Date()
  const maxAttempts = Math.max(1, Number(process.env.WORKER_MAX_ATTEMPTS || 3))
  const recovered = await db.update(generationJobs).set({ status: 'QUEUED', workerId: null, leaseExpiresAt: null, availableAt: now, stage: 'Retry queued', error: null, updatedAt: now }).where(and(eq(generationJobs.status, 'PROCESSING'), lt(generationJobs.leaseExpiresAt, now), sql`${generationJobs.attempts} < ${maxAttempts}`)).returning({ id: generationJobs.id })
  const deadLettered = await db.update(generationJobs).set({ status: 'DEAD_LETTER', workerId: null, leaseExpiresAt: null, stage: 'Retry limit exceeded', error: 'Worker lease expired too many times.', updatedAt: now }).where(and(eq(generationJobs.status, 'PROCESSING'), lt(generationJobs.leaseExpiresAt, now), sql`${generationJobs.attempts} >= ${maxAttempts}`)).returning({ id: generationJobs.id })
  return NextResponse.json({ recovered: recovered.map((job) => job.id), deadLettered: deadLettered.map((job) => job.id) })
}

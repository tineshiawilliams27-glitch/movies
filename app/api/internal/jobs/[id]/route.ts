import { NextResponse } from 'next/server'
import { and, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { generationJobs } from '@/lib/db/schema'

function authorized(request: Request) {
  return Boolean(process.env.WORKER_API_SECRET && request.headers.get('x-worker-secret') === process.env.WORKER_API_SECRET)
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Job not found.' }, { status: 404 })
  const [job] = await db.select({ id: generationJobs.id, userId: generationJobs.userId, type: generationJobs.type, payload: generationJobs.payload, workerId: generationJobs.workerId, leaseExpiresAt: generationJobs.leaseExpiresAt }).from(generationJobs).where(eq(generationJobs.id, id)).limit(1)
  if (!job) return NextResponse.json({ error: 'Job not found.' }, { status: 404 })
  return NextResponse.json({ job })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  const { id } = await params
  const body = await request.json().catch(() => null)
  const parsed = z.object({ status: z.string().optional(), expectedStatus: z.string().optional(), progress: z.number().min(0).max(100).optional(), stage: z.string().max(500).optional(), error: z.string().max(4000).nullable().optional(), workerId: z.string().max(200).optional(), leaseExpiresAt: z.coerce.date().optional(), incrementAttempts: z.boolean().optional() }).safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid job update.' }, { status: 400 })
  const { expectedStatus, incrementAttempts, ...values } = parsed.data
  const workerId = request.headers.get('x-worker-id')
  if (values.workerId && values.workerId !== workerId) return NextResponse.json({ error: 'Worker identity mismatch.' }, { status: 403 })
  const where = and(eq(generationJobs.id, id), expectedStatus ? eq(generationJobs.status, expectedStatus) : undefined, expectedStatus === 'PROCESSING' && workerId ? eq(generationJobs.workerId, workerId) : undefined)
  const [job] = await db.update(generationJobs).set({ ...values, ...(incrementAttempts ? { attempts: sql`${generationJobs.attempts} + 1` } : {}), updatedAt: new Date() }).where(where).returning({ id: generationJobs.id })
  if (!job) return NextResponse.json({ error: 'Job not found.' }, { status: 404 })
  return NextResponse.json({ job })
}

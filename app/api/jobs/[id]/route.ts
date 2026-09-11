import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { generationJobs } from '@/lib/db/schema'
import { enqueueGenerationJob } from '@/lib/queue'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 })
  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Job not found.' }, { status: 404 })
  const [job] = await db.select().from(generationJobs).where(and(eq(generationJobs.id, id), eq(generationJobs.userId, session.user.id))).limit(1)
  if (!job) return NextResponse.json({ error: 'Job not found.' }, { status: 404 })
  if (job.status !== 'DEAD_LETTER' && job.status !== 'FAILED') return NextResponse.json({ error: 'Only failed jobs can be replayed.' }, { status: 409 })
  const [replayed] = await db.update(generationJobs).set({ status: 'QUEUED', progress: 0, stage: 'Queued for replay', attempts: 0, error: null, updatedAt: new Date() }).where(and(eq(generationJobs.id, id), eq(generationJobs.userId, session.user.id))).returning()
  if (!replayed) return NextResponse.json({ error: 'Job could not be replayed.' }, { status: 500 })
  try {
    await enqueueGenerationJob(replayed.id, replayed.payload as Record<string, unknown>, replayed.type)
  } catch (error) {
    await db.update(generationJobs).set({ status: 'DEAD_LETTER', stage: 'Replay enqueue failed', error: error instanceof Error ? error.message : 'Queue unavailable.', updatedAt: new Date() }).where(eq(generationJobs.id, replayed.id))
    return NextResponse.json({ error: 'Job could not be requeued.' }, { status: 503 })
  }
  return NextResponse.json({ job: replayed })
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 })
  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Job not found.' }, { status: 404 })
  const [job] = await db.select().from(generationJobs).where(and(eq(generationJobs.id, id), eq(generationJobs.userId, session.user.id))).limit(1)
  if (!job) return NextResponse.json({ error: 'Job not found.' }, { status: 404 })
  return NextResponse.json({ job })
}

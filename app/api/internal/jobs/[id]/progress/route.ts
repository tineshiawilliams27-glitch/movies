import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { generationJobs } from '@/lib/db/schema'

const progressSchema = z.object({ status: z.enum(['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED']), progress: z.number().int().min(0).max(100), stage: z.string().min(1).max(120), error: z.string().max(2000).optional(), result: z.record(z.string(), z.unknown()).optional() })

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const workerToken = process.env.WORKER_TOKEN
  if (!workerToken && process.env.NODE_ENV === 'production') return NextResponse.json({ error: 'Worker authentication is not configured.' }, { status: 503 })
  if (workerToken && request.headers.get('authorization') !== `Bearer ${workerToken}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const parsed = progressSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid progress payload.' }, { status: 400 })
  const { id } = await params
  const [job] = await db.update(generationJobs).set({ ...parsed.data, updatedAt: new Date() }).where(eq(generationJobs.id, id)).returning()
  if (!job) return NextResponse.json({ error: 'Job not found.' }, { status: 404 })
  return NextResponse.json({ job })
}

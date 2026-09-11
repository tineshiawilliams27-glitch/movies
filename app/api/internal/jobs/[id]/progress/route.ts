import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { generationJobs, storyboardShots, timelineItems } from '@/lib/db/schema'

const progressSchema = z.object({
  status: z.enum(['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'DEAD_LETTER']),
  progress: z.number().int().min(0).max(100),
  stage: z.string().trim().min(1).max(120),
  error: z.string().trim().max(2000).optional(),
  result: z.record(z.string().max(120), z.unknown()).refine((value) => Object.keys(value).length <= 50, { message: 'Job result may contain at most 50 fields.' }).refine((value) => JSON.stringify(value).length <= 100000, { message: 'Job result is too large.' }).optional(),
})

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const workerToken = process.env.WORKER_TOKEN
  if (!workerToken && process.env.NODE_ENV === 'production') return NextResponse.json({ error: 'Worker authentication is not configured.' }, { status: 503 })
  if (workerToken && request.headers.get('authorization') !== `Bearer ${workerToken}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const parsed = progressSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid progress payload.' }, { status: 400 })
  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Job not found.' }, { status: 404 })
  const [current] = await db.select().from(generationJobs).where(eq(generationJobs.id, id)).limit(1)
  if (!current) return NextResponse.json({ error: 'Job not found.' }, { status: 404 })
  const terminalStatuses = new Set(['COMPLETED', 'FAILED', 'CANCELLED', 'DEAD_LETTER'])
  if (terminalStatuses.has(current.status) || parsed.data.progress < current.progress) return NextResponse.json({ job: current, ignored: true }, { status: 200 })
  const [job] = await db.update(generationJobs).set({ ...parsed.data, updatedAt: new Date() }).where(and(eq(generationJobs.id, id), eq(generationJobs.progress, current.progress), eq(generationJobs.status, current.status))).returning()
  if (!job) return NextResponse.json({ error: 'Progress update conflicted with a newer update.' }, { status: 409 })
  const payload = (job.payload ?? {}) as Record<string, unknown>
  const result = (parsed.data.result ?? {}) as Record<string, unknown>
  const shotNumber = Number(payload.shotNumber)
  if (job.type === 'VIDEO_GENERATION' && Number.isInteger(shotNumber) && shotNumber > 0) {
    await db.update(storyboardShots).set({ status: parsed.data.status, clipAssetId: typeof result.assetId === 'string' ? result.assetId : undefined, updatedAt: new Date() }).where(and(eq(storyboardShots.projectId, job.projectId), eq(storyboardShots.userId, job.userId), eq(storyboardShots.shotNumber, shotNumber)))
    if (parsed.data.status === 'COMPLETED' && typeof result.assetPathname === 'string' && result.assetPathname.trim().length > 0 && result.assetPathname.length <= 2000) {
      const [existingTimelineItem] = await db.select({ id: timelineItems.id }).from(timelineItems).where(and(eq(timelineItems.projectId, job.projectId), eq(timelineItems.userId, job.userId), eq(timelineItems.trackType, 'VIDEO'), eq(timelineItems.label, `Shot ${shotNumber}`), eq(timelineItems.content, result.assetPathname))).limit(1)
      if (!existingTimelineItem) {
        await db.insert(timelineItems).values({ userId: job.userId, projectId: job.projectId, trackType: 'VIDEO', label: `Shot ${shotNumber}`, startSeconds: '0', durationSeconds: String(payload.durationSeconds ?? 4), content: result.assetPathname, metadata: { jobId: job.id, provider: result.provider ?? 'replicate' } })
      }
    }
  }
  return NextResponse.json({ job })
}

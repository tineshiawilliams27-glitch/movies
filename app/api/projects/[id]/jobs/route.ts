import { NextResponse } from 'next/server'
import { and, desc, eq, sql } from 'drizzle-orm'
import { headers } from 'next/headers'
import { generationJobTypeSchema } from '@/lib/generation/contracts'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { generationJobs, generationOutbox, projects, scenes } from '@/lib/db/schema'
import { start } from 'workflow/api'
import { processGenerationJob } from '@/workflows/generation'
import { checkRateLimit, rateLimitPolicies, rateLimitResponse } from '@/lib/rate-limit'

const createJobSchema = z.object({
  type: generationJobTypeSchema,
  sceneId: z.string().uuid().optional(),
  idempotencyKey: z.string().trim().min(1).max(200).optional(),
  payload: z.record(z.string().max(120), z.unknown()).refine((value) => Object.keys(value).length <= 100, { message: 'Job payload may contain at most 100 fields.' }).refine((value) => JSON.stringify(value).length <= 100000, { message: 'Job payload is too large.' }).default({}),
})

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 })
  const rate = await checkRateLimit(`user:${session.user.id}`, rateLimitPolicies.normal)
  if (!rate.success) return rateLimitResponse(rate.reset)
  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Project not found.' }, { status: 404 })
  const sceneIdValue = new URL(request.url).searchParams.get('sceneId')
  if (sceneIdValue && !z.string().uuid().safeParse(sceneIdValue).success) return NextResponse.json({ error: 'Invalid scene ID.' }, { status: 400 })
  const sceneId = sceneIdValue || undefined
  const jobs = await db.select().from(generationJobs).where(and(eq(generationJobs.projectId, id), eq(generationJobs.userId, session.user.id), sceneId ? eq(generationJobs.sceneId, sceneId) : undefined)).orderBy(desc(generationJobs.createdAt)).limit(50)
  return NextResponse.json({ jobs: Array.isArray(jobs) ? jobs : [] })
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 })
  const rate = await checkRateLimit(`user:${session.user.id}`, rateLimitPolicies.ai)
  if (!rate.success) return rateLimitResponse(rate.reset)
  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Project not found.' }, { status: 404 })
  const parsed = createJobSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid generation job payload.', issues: parsed.error.issues }, { status: 400 })
  const [project] = await db.select({ id: projects.id }).from(projects).where(and(eq(projects.id, id), eq(projects.userId, session.user.id))).limit(1)
  if (!project) return NextResponse.json({ error: 'Project not found.' }, { status: 404 })
  if (parsed.data.sceneId) {
    const [scene] = await db.select({ id: scenes.id }).from(scenes).where(and(eq(scenes.id, parsed.data.sceneId), eq(scenes.projectId, id), eq(scenes.userId, session.user.id))).limit(1)
    if (!scene) return NextResponse.json({ error: 'Scene not found.' }, { status: 404 })
  }
  const { job, created } = await db.transaction(async (tx) => {
    const [existing] = await tx.select().from(generationJobs).where(and(eq(generationJobs.projectId, id), eq(generationJobs.userId, session.user.id), parsed.data.idempotencyKey ? eq(generationJobs.idempotencyKey, parsed.data.idempotencyKey) : sql`false`)).limit(1)
    if (existing) return { job: existing, created: false }
    const [createdJob] = await tx.insert(generationJobs).values({ userId: session.user.id, projectId: id, sceneId: parsed.data.sceneId, type: parsed.data.type, idempotencyKey: parsed.data.idempotencyKey, payload: { ...parsed.data.payload, projectId: id, userId: session.user.id } }).returning()
    if (!createdJob) throw new Error('Generation job could not be created.')
    await tx.insert(generationOutbox).values({ jobId: createdJob.id, eventType: 'GENERATION_JOB_QUEUED', payload: { jobId: createdJob.id, type: parsed.data.type, payload: parsed.data.payload } })
    return { job: createdJob, created: true }
  })
  if (!job?.id) return NextResponse.json({ error: 'Generation job could not be created.' }, { status: 500 })
  if (!created) return NextResponse.json({ job, deduplicated: true }, { status: 200 })
  const run = await start(processGenerationJob, [job.id, session.user.id, job.type, job.payload as Record<string, unknown>])
  return NextResponse.json({ job, workflowRunId: run.runId }, { status: 201 })
}

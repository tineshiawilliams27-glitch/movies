import { NextResponse } from 'next/server'
import { and, desc, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { generationJobs, projects, scenes } from '@/lib/db/schema'
import { enqueueGenerationJob } from '@/lib/queue'

const createJobSchema = z.object({
  type: z.enum(['STORY_GENERATION', 'IMAGE_GENERATION', 'VIDEO_GENERATION', 'VOICE_GENERATION', 'VIDEO_RENDER', 'VIDEO_EXPORT']),
  sceneId: z.string().uuid().optional(),
  payload: z.record(z.string(), z.unknown()).default({}),
})

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 })
  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Project not found.' }, { status: 404 })
  const [project] = await db.select({ id: projects.id }).from(projects).where(and(eq(projects.id, id), eq(projects.userId, session.user.id))).limit(1)
  if (!project) return NextResponse.json({ error: 'Project not found.' }, { status: 404 })
  const sceneIdValue = new URL(request.url).searchParams.get('sceneId')
  if (sceneIdValue && !z.string().uuid().safeParse(sceneIdValue).success) return NextResponse.json({ error: 'Invalid scene ID.' }, { status: 400 })
  const sceneId = sceneIdValue || undefined
  const jobs = await db.select().from(generationJobs).where(and(eq(generationJobs.projectId, id), eq(generationJobs.userId, session.user.id), sceneId ? eq(generationJobs.sceneId, sceneId) : undefined)).orderBy(desc(generationJobs.createdAt)).limit(50)
  return NextResponse.json({ jobs: Array.isArray(jobs) ? jobs : [] })
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 })
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
  const [job] = await db.insert(generationJobs).values({ userId: session.user.id, projectId: id, sceneId: parsed.data.sceneId, type: parsed.data.type, payload: parsed.data.payload }).returning()
  if (!job?.id) return NextResponse.json({ error: 'Generation job could not be created.' }, { status: 500 })
  try {
    await enqueueGenerationJob(job.id, parsed.data.payload, parsed.data.type)
  } catch (error) {
    console.error('[v0] queue enqueue failed', error)
    const [failedJob] = await db.update(generationJobs).set({ status: 'FAILED', stage: 'Queue unavailable', error: 'The generation queue could not accept this job.', updatedAt: new Date() }).where(eq(generationJobs.id, job.id)).returning()
    return NextResponse.json({ job: failedJob }, { status: 503 })
  }
  return NextResponse.json({ job }, { status: 201 })
}

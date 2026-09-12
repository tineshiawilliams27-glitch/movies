import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { eq, and } from 'drizzle-orm'
import { start } from 'workflow/api'
import { processGenerationJob } from '@/workflows/generation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { characters, generationJobs, generationOutbox, projects } from '@/lib/db/schema'
import { checkRateLimit, rateLimitPolicies, rateLimitResponse } from '@/lib/rate-limit'

export async function POST(request: Request, context: { params: Promise<{ id: string; characterId: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 })
  const rate = await checkRateLimit(`user:${session.user.id}`, rateLimitPolicies.image)
  if (!rate.success) return rateLimitResponse(rate.reset)

  const { id, characterId } = await context.params
  const [record] = await db.select({ character: characters, project: projects }).from(characters).innerJoin(projects, eq(projects.id, characters.projectId)).where(and(eq(characters.id, characterId), eq(characters.projectId, id), eq(characters.userId, session.user.id), eq(projects.userId, session.user.id))).limit(1)
  if (!record) return NextResponse.json({ error: 'Character not found.' }, { status: 404 })

  const body = await request.json().catch(() => ({})) as { prompt?: string }
  const prompt = body.prompt?.trim() || `Photorealistic cinematic character portrait for a film. Name: ${record.character.name}. Description: ${record.character.description}. Appearance: ${record.character.appearance}. Voice and personality: ${record.character.voice}. Natural skin texture, expressive eyes, realistic wardrobe, studio portrait lighting, 85mm lens, shallow depth of field, no text, no watermark.`

  try {
    const payload = { userId: session.user.id, projectId: id, characterId, prompt }
    const idempotencyKey = `character-image:${characterId}:${Buffer.from(prompt).toString('base64url').slice(0, 80)}`
    const [existing] = await db.select().from(generationJobs).where(and(eq(generationJobs.projectId, id), eq(generationJobs.userId, session.user.id), eq(generationJobs.idempotencyKey, idempotencyKey))).limit(1)
    if (existing) return NextResponse.json({ job: existing, deduplicated: true }, { status: 200 })
    const [job] = await db.insert(generationJobs).values({ userId: session.user.id, projectId: id, type: 'CHARACTER_GENERATION', idempotencyKey, payload }).returning()
    if (!job) return NextResponse.json({ error: 'Character image job could not be created.' }, { status: 500 })
    await db.insert(generationOutbox).values({ jobId: job.id, eventType: 'GENERATION_JOB_QUEUED', payload: { jobId: job.id, type: job.type, payload } })
    const run = await start(processGenerationJob, [job.id, session.user.id, job.type, payload])
    return NextResponse.json({ job, workflowRunId: run.runId }, { status: 202 })
  } catch (error) {
    console.error('[v0] character image job enqueue failed', error)
    return NextResponse.json({ error: 'Unable to queue character image generation.' }, { status: 502 })
  }
}

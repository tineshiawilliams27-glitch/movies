import { NextResponse } from 'next/server'
import { and, desc, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { generateText, Output } from 'ai'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { filmBibles, filmCharacters, generationJobs, generationOutbox, generationRuns, projects, storyboardShots } from '@/lib/db/schema'
import { enqueueGenerationJob } from '@/lib/queue'

const requestSchema = z.object({
  kind: z.enum(['story', 'scene', 'character', 'visual', 'audio', 'pipeline']),
  prompt: z.string().trim().min(1).max(12000),
})

const pipelineSchema = z.object({
  logline: z.string(),
  premise: z.string(),
  themes: z.array(z.string().max(500)).max(20),
  midpoint: z.string().max(4000),
  climax: z.string(),
  acts: z.array(z.object({ title: z.string().max(200), summary: z.string().max(4000), beats: z.array(z.string().max(1000)).max(20) })).max(12),
  screenplay: z.string().max(100000),
  styleBible: z.object({ palette: z.string(), lens: z.string(), lighting: z.string(), texture: z.string(), rules: z.array(z.string()) }),
  characters: z.array(z.object({ stableKey: z.string().trim().min(1).max(120), name: z.string().max(120), role: z.string().max(200), description: z.string().max(4000), appearance: z.string().max(4000), voiceIdentity: z.object({ timbre: z.string().max(500), pace: z.string().max(500), emotionalDirection: z.string().max(1000) }) })).max(100),
  shots: z.array(z.object({ shotNumber: z.number().int().positive().max(10000), sceneLabel: z.string().max(200), title: z.string().max(200), description: z.string().max(4000), shotType: z.string().max(120), cameraMovement: z.string().max(500), lighting: z.string().max(500), mood: z.string().max(500), dialogue: z.string().max(4000), effects: z.string().max(2000), durationSeconds: z.number().positive().max(3600), continuityNotes: z.string().max(2000), framePrompt: z.string().max(4000) })).max(1000),
})

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 })
  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Project not found.' }, { status: 404 })
  const parsed = requestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid generation request.' }, { status: 400 })
  const [project] = await db.select({ id: projects.id, title: projects.title, concept: projects.concept }).from(projects).where(and(eq(projects.id, id), eq(projects.userId, session.user.id))).limit(1)
  if (!project) return NextResponse.json({ error: 'Project not found.' }, { status: 404 })

  const result = await generateText({
    model: 'openai/gpt-5-mini',
    system: 'You are a showrunner, screenwriter, cinematographer, and post-production supervisor. Create specific, production-ready material. Preserve character identity and visual continuity across every shot.',
    prompt: `Generate a ${parsed.data.kind} for the film project “${project.title}”. Concept: ${project.concept}\n\nCreative brief: ${parsed.data.prompt}`,
    output: parsed.data.kind === 'pipeline' ? Output.object({ schema: pipelineSchema }) : Output.object({ schema: z.object({ result: z.string() }) }),
  })

  if (parsed.data.kind === 'pipeline') {
    const output = result.output as z.infer<typeof pipelineSchema>
    if (!output || !Array.isArray(output.characters) || !Array.isArray(output.shots)) return NextResponse.json({ error: 'Generation returned an incomplete pipeline.' }, { status: 502 })
    const [latestRun] = await db.select({ version: generationRuns.version }).from(generationRuns).where(and(eq(generationRuns.projectId, id), eq(generationRuns.userId, session.user.id))).orderBy(desc(generationRuns.version)).limit(1)
    const [run] = await db.insert(generationRuns).values({ userId: session.user.id, projectId: id, version: (latestRun?.version ?? 0) + 1, prompt: parsed.data.prompt }).returning()
    if (!run) return NextResponse.json({ error: 'Generation run could not be created.' }, { status: 500 })
    await db.insert(filmBibles).values({ userId: session.user.id, projectId: id, generationRunId: run.id, version: run.version, logline: output.logline, premise: output.premise, midpoint: output.midpoint, climax: output.climax, themes: output.themes, acts: output.acts, screenplay: output.screenplay, styleBible: output.styleBible }).onConflictDoUpdate({ target: filmBibles.projectId, set: { logline: output.logline, premise: output.premise, midpoint: output.midpoint, climax: output.climax, themes: output.themes, acts: output.acts, screenplay: output.screenplay, styleBible: output.styleBible, updatedAt: new Date() } })
    for (const character of output.characters) await db.insert(filmCharacters).values({ userId: session.user.id, projectId: id, generationRunId: run.id, version: run.version, stableKey: character.stableKey, name: character.name, role: character.role, description: character.description, appearance: character.appearance, voiceIdentity: character.voiceIdentity }).onConflictDoUpdate({ target: [filmCharacters.projectId, filmCharacters.stableKey], set: { name: character.name, role: character.role, description: character.description, appearance: character.appearance, voiceIdentity: character.voiceIdentity, updatedAt: new Date() } })
    for (const shot of output.shots) await db.insert(storyboardShots).values({ userId: session.user.id, projectId: id, generationRunId: run.id, version: run.version, shotNumber: shot.shotNumber, sceneLabel: shot.sceneLabel, title: shot.title, description: shot.description, shotType: shot.shotType, cameraMovement: shot.cameraMovement, lighting: shot.lighting, mood: shot.mood, dialogue: shot.dialogue, effects: shot.effects, durationSeconds: String(shot.durationSeconds), continuityNotes: shot.continuityNotes, framePrompt: shot.framePrompt }).onConflictDoUpdate({ target: [storyboardShots.projectId, storyboardShots.shotNumber], set: { sceneLabel: shot.sceneLabel, title: shot.title, description: shot.description, shotType: shot.shotType, cameraMovement: shot.cameraMovement, lighting: shot.lighting, mood: shot.mood, dialogue: shot.dialogue, effects: shot.effects, durationSeconds: String(shot.durationSeconds), continuityNotes: shot.continuityNotes, framePrompt: shot.framePrompt, updatedAt: new Date() } })
    const queuedJobs = await Promise.all(output.shots.map(async (shot) => {
      const idempotencyKey = `video:${shot.shotNumber}:${shot.framePrompt}`
      const payload = { shotNumber: shot.shotNumber, prompt: shot.framePrompt, durationSeconds: shot.durationSeconds, shotType: shot.shotType, cameraMovement: shot.cameraMovement, lighting: shot.lighting, mood: shot.mood }
      const { job, created } = await db.transaction(async (tx) => {
        const [existing] = await tx.select().from(generationJobs).where(and(eq(generationJobs.projectId, id), eq(generationJobs.userId, session.user.id), eq(generationJobs.idempotencyKey, idempotencyKey))).limit(1)
        if (existing) return { job: existing, created: false }
        const [createdJob] = await tx.insert(generationJobs).values({ userId: session.user.id, projectId: id, generationRunId: run.id, type: 'VIDEO_GENERATION', payload, idempotencyKey }).returning()
        if (!createdJob) return { job: null, created: false }
        await tx.insert(generationOutbox).values({ jobId: createdJob.id, eventType: 'GENERATION_JOB_QUEUED', payload: { jobId: createdJob.id, type: 'VIDEO_GENERATION', payload } })
        return { job: createdJob, created: true }
      })
      if (!job?.id) return null
      if (created) await enqueueGenerationJob(job.id, payload, 'VIDEO_GENERATION')
      return job.id
    }))
    return NextResponse.json({ output, queuedJobIds: queuedJobs.filter(Boolean) })
  }

  return NextResponse.json({ result: (result.output as { result: string }).result })
}

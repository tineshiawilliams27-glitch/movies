import { NextResponse } from 'next/server'
import { and, desc, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { generateText, Output } from 'ai'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { filmBibles, filmCharacters, generationJobs, generationOutbox, generationRuns, projects, storyboardShots, timelineItems } from '@/lib/db/schema'
import { enqueueJob } from '@/worker/queue'

export const maxDuration = 300

const requestSchema = z.object({
  kind: z.enum(['story', 'scene', 'character', 'visual', 'audio', 'pipeline']),
  prompt: z.string().trim().min(1),
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

  let result
  try {
    result = await generateText({
      model: 'openai/gpt-5-mini',
      system: 'You are a showrunner, screenwriter, cinematographer, and post-production supervisor. Create specific, production-ready material. Preserve character identity and visual continuity across every shot.',
      prompt: `Generate a ${parsed.data.kind} for the film project “${project.title}”. Concept: ${project.concept}\n\nCreative brief: ${parsed.data.prompt}`,
      output: parsed.data.kind === 'pipeline' ? Output.object({ schema: pipelineSchema }) : Output.object({ schema: z.object({ result: z.string() }) }),
    })
  } catch (error) {
    console.error('[v0] generation model failed', error)
    return NextResponse.json({ error: 'Generation service is temporarily unavailable. Please try again.' }, { status: 502 })
  }

  if (parsed.data.kind === 'pipeline') {
    const output = result.output as z.infer<typeof pipelineSchema>
    if (!output || !Array.isArray(output.characters) || !Array.isArray(output.shots)) return NextResponse.json({ error: 'Generation returned an incomplete pipeline.' }, { status: 502 })
    const { jobs } = await db.transaction(async (tx) => {
      const [latestRun] = await tx.select({ version: generationRuns.version }).from(generationRuns).where(and(eq(generationRuns.projectId, id), eq(generationRuns.userId, session.user.id))).orderBy(desc(generationRuns.version)).limit(1)
      const [createdRun] = await tx.insert(generationRuns).values({ userId: session.user.id, projectId: id, version: (latestRun?.version ?? 0) + 1, prompt: parsed.data.prompt }).returning()
      if (!createdRun) throw new Error('Generation run could not be created.')
      await tx.insert(filmBibles).values({ userId: session.user.id, projectId: id, generationRunId: createdRun.id, version: createdRun.version, logline: output.logline, premise: output.premise, midpoint: output.midpoint, climax: output.climax, themes: output.themes, acts: output.acts, screenplay: output.screenplay, styleBible: output.styleBible })
      for (const character of output.characters) await tx.insert(filmCharacters).values({ userId: session.user.id, projectId: id, generationRunId: createdRun.id, version: createdRun.version, stableKey: character.stableKey, name: character.name, role: character.role, description: character.description, appearance: character.appearance, voiceIdentity: character.voiceIdentity })
      for (const shot of output.shots) await tx.insert(storyboardShots).values({ userId: session.user.id, projectId: id, generationRunId: createdRun.id, version: createdRun.version, shotNumber: shot.shotNumber, sceneLabel: shot.sceneLabel, title: shot.title, description: shot.description, shotType: shot.shotType, cameraMovement: shot.cameraMovement, lighting: shot.lighting, mood: shot.mood, dialogue: shot.dialogue, effects: shot.effects, durationSeconds: String(shot.durationSeconds), continuityNotes: shot.continuityNotes, framePrompt: shot.framePrompt })
      const jobs: Array<{ id: string; type: string; payload: Record<string, unknown> }> = []
      const shotVideoJobIds: string[] = []
      for (const shot of output.shots) {
        const stageJobs = [
          { type: 'IMAGE_GENERATION', payload: { userId: session.user.id, projectId: id, shotNumber: shot.shotNumber, prompt: `${shot.framePrompt}\n\nScene: ${shot.sceneLabel}. Shot type: ${shot.shotType}. Camera movement: ${shot.cameraMovement}. Lighting: ${shot.lighting}. Mood: ${shot.mood}. Preserve character and location continuity across the film.`, durationSeconds: shot.durationSeconds, aspectRatio: '16:9', stage: 'visual' } },
          { type: 'VOICE_GENERATION', payload: { userId: session.user.id, projectId: id, shotNumber: shot.shotNumber, text: shot.dialogue || `Ambient sound design for ${shot.title}`, prompt: shot.dialogue || `Ambient sound design for ${shot.title}`, durationSeconds: shot.durationSeconds, stage: 'voice' } },
        ]
        const dependencyIds: string[] = []
        for (const stageJob of stageJobs) {
          const payload = { ...stageJob.payload, dependsOnJobIds: [] }
          const [createdStageJob] = await tx.insert(generationJobs).values({ userId: session.user.id, projectId: id, generationRunId: createdRun.id, type: stageJob.type, payload, idempotencyKey: `${stageJob.type.toLowerCase()}:${createdRun.version}:${shot.shotNumber}` }).onConflictDoNothing({ target: [generationJobs.projectId, generationJobs.idempotencyKey] }).returning()
          if (createdStageJob) {
            await tx.insert(generationOutbox).values({ jobId: createdStageJob.id, eventType: 'GENERATION_JOB_QUEUED', payload: { jobId: createdStageJob.id, type: stageJob.type, payload } })
            jobs.push({ id: createdStageJob.id, type: stageJob.type, payload })
            dependencyIds.push(createdStageJob.id)
          }
        }
        const videoPayload = { userId: session.user.id, projectId: id, shotNumber: shot.shotNumber, prompt: shot.framePrompt, durationSeconds: shot.durationSeconds, shotType: shot.shotType, cameraMovement: shot.cameraMovement, lighting: shot.lighting, mood: shot.mood, dependsOnJobIds: dependencyIds }
        const [createdVideoJob] = await tx.insert(generationJobs).values({ userId: session.user.id, projectId: id, generationRunId: createdRun.id, type: 'VIDEO_GENERATION', payload: videoPayload, idempotencyKey: `video:${createdRun.version}:${shot.shotNumber}:${shot.framePrompt}` }).onConflictDoNothing({ target: [generationJobs.projectId, generationJobs.idempotencyKey] }).returning()
        if (createdVideoJob) {
          await tx.insert(generationOutbox).values({ jobId: createdVideoJob.id, eventType: 'GENERATION_JOB_QUEUED', payload: { jobId: createdVideoJob.id, type: 'VIDEO_GENERATION', payload: videoPayload } })
          jobs.push({ id: createdVideoJob.id, type: 'VIDEO_GENERATION', payload: videoPayload })
          shotVideoJobIds.push(createdVideoJob.id)
        }
      }
      const timelinePayload = { userId: session.user.id, projectId: id, generationRunId: createdRun.id, format: 'mp4', resolution: '1080p', frameRate: 24, aspectRatio: '16:9', stage: 'timeline', dependsOnJobIds: shotVideoJobIds }
      const exportPayload = { ...timelinePayload, stage: 'export', dependsOnJobIds: [] as string[] }
      let timelineJobId: string | undefined
      for (const stageJob of [{ type: 'TIMELINE_BUILD', payload: timelinePayload }, { type: 'VIDEO_EXPORT', payload: exportPayload }]) {
        const payload = stageJob.type === 'VIDEO_EXPORT' ? { ...stageJob.payload, dependsOnJobIds: timelineJobId ? [timelineJobId] : [] } : stageJob.payload
        const [createdStageJob] = await tx.insert(generationJobs).values({ userId: session.user.id, projectId: id, generationRunId: createdRun.id, type: stageJob.type, payload, idempotencyKey: `${stageJob.type.toLowerCase()}:${createdRun.version}` }).onConflictDoNothing({ target: [generationJobs.projectId, generationJobs.idempotencyKey] }).returning()
        if (createdStageJob) {
          await tx.insert(generationOutbox).values({ jobId: createdStageJob.id, eventType: 'GENERATION_JOB_QUEUED', payload: { jobId: createdStageJob.id, type: stageJob.type, payload } })
          jobs.push({ id: createdStageJob.id, type: stageJob.type, payload })
          if (stageJob.type === 'TIMELINE_BUILD') timelineJobId = createdStageJob.id
        }
      }
      return { run: createdRun, jobs }
    }).catch((error) => {
      console.error('[v0] pipeline transaction rolled back', error)
      throw error
    })
    const stageOrder: Record<string, number> = { IMAGE_GENERATION: 0, AUDIO_GENERATION: 1, VIDEO_GENERATION: 2, TIMELINE_BUILD: 3, VIDEO_EXPORT: 4 }
    const orderedJobs = jobs.map((job) => ({ jobId: job.id, type: job.type, payload: job.payload })).sort((left, right) => {
      const leftShot = Number(left.payload.shotNumber ?? -1)
      const rightShot = Number(right.payload.shotNumber ?? -1)
      const leftIsFinalStage = left.type === 'TIMELINE_BUILD' || left.type === 'VIDEO_EXPORT'
      const rightIsFinalStage = right.type === 'TIMELINE_BUILD' || right.type === 'VIDEO_EXPORT'
      if (leftIsFinalStage && !rightIsFinalStage) return 1
      if (!leftIsFinalStage && rightIsFinalStage) return -1
      if (leftIsFinalStage && rightIsFinalStage) return (stageOrder[left.type] ?? 99) - (stageOrder[right.type] ?? 99)
      return leftShot - rightShot || (stageOrder[left.type] ?? 99) - (stageOrder[right.type] ?? 99)
    })
    await Promise.all(jobs.map((job) => enqueueJob(job.id)))
    return NextResponse.json({ output, queuedJobIds: jobs.map((job) => job.id), workflowRuns: [], workflow: { treatment: 'COMPLETED', scenes: 'RUNNING', visuals: 'RUNNING', voices: 'RUNNING', timeline: 'RUNNING' } })
  }

  return NextResponse.json({ result: (result.output as { result: string }).result })
}

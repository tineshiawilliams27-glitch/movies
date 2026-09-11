import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { generateText, Output } from 'ai'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { filmBibles, filmCharacters, generationJobs, projects, storyboardShots } from '@/lib/db/schema'
import { enqueueGenerationJob } from '@/lib/queue'

const requestSchema = z.object({
  kind: z.enum(['story', 'scene', 'character', 'visual', 'audio', 'pipeline']),
  prompt: z.string().trim().min(1).max(12000),
})

const pipelineSchema = z.object({
  logline: z.string(),
  premise: z.string(),
  themes: z.array(z.string()),
  midpoint: z.string(),
  climax: z.string(),
  acts: z.array(z.object({ title: z.string(), summary: z.string(), beats: z.array(z.string()) })),
  screenplay: z.string(),
  styleBible: z.object({ palette: z.string(), lens: z.string(), lighting: z.string(), texture: z.string(), rules: z.array(z.string()) }),
  characters: z.array(z.object({ stableKey: z.string(), name: z.string(), role: z.string(), description: z.string(), appearance: z.string(), voiceIdentity: z.object({ timbre: z.string(), pace: z.string(), emotionalDirection: z.string() }) })),
  shots: z.array(z.object({ shotNumber: z.number(), sceneLabel: z.string(), title: z.string(), description: z.string(), shotType: z.string(), cameraMovement: z.string(), lighting: z.string(), mood: z.string(), dialogue: z.string(), effects: z.string(), durationSeconds: z.number(), continuityNotes: z.string(), framePrompt: z.string() })),
})

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 })
  const { id } = await params
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
    await db.insert(filmBibles).values({ userId: session.user.id, projectId: id, logline: output.logline, premise: output.premise, midpoint: output.midpoint, climax: output.climax, themes: output.themes, acts: output.acts, screenplay: output.screenplay, styleBible: output.styleBible }).onConflictDoUpdate({ target: filmBibles.projectId, set: { logline: output.logline, premise: output.premise, midpoint: output.midpoint, climax: output.climax, themes: output.themes, acts: output.acts, screenplay: output.screenplay, styleBible: output.styleBible, updatedAt: new Date() } })
    for (const character of output.characters) await db.insert(filmCharacters).values({ userId: session.user.id, projectId: id, stableKey: character.stableKey, name: character.name, role: character.role, description: character.description, appearance: character.appearance, voiceIdentity: character.voiceIdentity }).onConflictDoUpdate({ target: [filmCharacters.projectId, filmCharacters.stableKey], set: { name: character.name, role: character.role, description: character.description, appearance: character.appearance, voiceIdentity: character.voiceIdentity, updatedAt: new Date() } })
    for (const shot of output.shots) await db.insert(storyboardShots).values({ userId: session.user.id, projectId: id, shotNumber: shot.shotNumber, sceneLabel: shot.sceneLabel, title: shot.title, description: shot.description, shotType: shot.shotType, cameraMovement: shot.cameraMovement, lighting: shot.lighting, mood: shot.mood, dialogue: shot.dialogue, effects: shot.effects, durationSeconds: String(shot.durationSeconds), continuityNotes: shot.continuityNotes, framePrompt: shot.framePrompt }).onConflictDoUpdate({ target: [storyboardShots.projectId, storyboardShots.shotNumber], set: { sceneLabel: shot.sceneLabel, title: shot.title, description: shot.description, shotType: shot.shotType, cameraMovement: shot.cameraMovement, lighting: shot.lighting, mood: shot.mood, dialogue: shot.dialogue, effects: shot.effects, durationSeconds: String(shot.durationSeconds), continuityNotes: shot.continuityNotes, framePrompt: shot.framePrompt, updatedAt: new Date() } })
    const queuedJobs = await Promise.all(output.shots.map(async (shot) => {
      const idempotencyKey = `video:${shot.shotNumber}:${shot.framePrompt}`
      const [job] = await db.insert(generationJobs).values({
        userId: session.user.id,
        projectId: id,
        type: 'VIDEO_GENERATION',
        payload: { shotNumber: shot.shotNumber, prompt: shot.framePrompt, durationSeconds: shot.durationSeconds, shotType: shot.shotType, cameraMovement: shot.cameraMovement, lighting: shot.lighting, mood: shot.mood },
        idempotencyKey,
      }).onConflictDoNothing({ target: [generationJobs.projectId, generationJobs.idempotencyKey] }).returning()
      if (job) await enqueueGenerationJob(job.id, job.payload as Record<string, unknown>)
      return job?.id ?? null
    }))
    return NextResponse.json({ output, queuedJobIds: queuedJobs.filter(Boolean) })
  }

  return NextResponse.json({ result: (result.output as { result: string }).result })
}

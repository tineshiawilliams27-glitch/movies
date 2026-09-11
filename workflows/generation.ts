import { and, eq, inArray } from 'drizzle-orm'
import { sleep } from 'workflow'
import { db } from '@/lib/db'
import { generationJobs } from '@/lib/db/schema'
import { providerFor } from '@/worker/providers'

type JobPayload = Record<string, unknown>
type JobResult = { result: Record<string, unknown>; status?: 'OK' | 'NOT_CONFIGURED' }

const maxAttempts = Math.max(1, Number(process.env.WORKFLOW_MAX_ATTEMPTS || 3))
const retryDelayMs = Math.max(1000, Number(process.env.WORKFLOW_RETRY_DELAY_MS || 5000))

async function updateJob(jobId: string, userId: string, values: Record<string, unknown>) {
  'use step'
  await db.update(generationJobs).set({ ...values, updatedAt: new Date() }).where(and(eq(generationJobs.id, jobId), eq(generationJobs.userId, userId)))
}

async function executeGeneration(jobId: string, userId: string, type: string, queuedPayload: JobPayload): Promise<JobResult> {
  'use step'
  const providerType = typeof queuedPayload.type === 'string' ? queuedPayload.type : type
  await db.update(generationJobs).set({ status: 'PROCESSING', progress: 10, stage: 'Workflow accepted job', attempts: 1, updatedAt: new Date() }).where(and(eq(generationJobs.id, jobId), eq(generationJobs.userId, userId)))
  const stageLabels: Record<string, string> = { SCRIPT_GENERATION: 'Building editable story treatment', SCENE_GENERATION: 'Generating scenes', IMAGE_GENERATION: 'Generating visuals', CHARACTER_GENERATION: 'Generating character portrait', VOICE_GENERATION: 'Generating voices', TIMELINE_BUILD: 'Assembling timeline', VIDEO_EXPORT: 'Building final export', VIDEO_GENERATION: 'Generating clips' }
  await updateJob(jobId, userId, { progress: 45, stage: stageLabels[providerType] || `Dispatching ${providerType.toLowerCase()} provider` })
  const payload = { type: providerType, jobId, prompt: queuedPayload.prompt || process.env.VIDEO_PROMPT || 'Cinematic storyboard shot with natural movement and consistent visual identity.', durationSeconds: queuedPayload.durationSeconds || 4, ...queuedPayload }
  return providerFor(providerType)({ jobId, payload })
}

async function waitForDependencies(userId: string, dependencyIds: string[]) {
  'use step'
  if (dependencyIds.length === 0) return
  const dependencies = await db.select({ id: generationJobs.id, status: generationJobs.status }).from(generationJobs).where(and(eq(generationJobs.userId, userId), inArray(generationJobs.id, dependencyIds)))
  const dependencyMap = new Map(dependencies.map((dependency) => [dependency.id, dependency.status]))
  const missing = dependencyIds.filter((dependencyId) => !dependencyMap.has(dependencyId))
  if (missing.length > 0) throw new Error(`Generation dependencies are missing: ${missing.join(', ')}`)
  const failed = dependencyIds.find((dependencyId) => ['FAILED', 'DEAD_LETTER', 'CANCELLED'].includes(dependencyMap.get(dependencyId) || ''))
  if (failed) throw new Error(`Generation dependency ${failed} failed before this job could run.`)
  const incomplete = dependencyIds.filter((dependencyId) => dependencyMap.get(dependencyId) !== 'COMPLETED')
  if (incomplete.length > 0) throw new Error(`Generation dependencies are not complete: ${incomplete.join(', ')}`)
}

async function processStage(jobId: string, userId: string, type: string, payload: JobPayload) {
  const dependencyIds = Array.isArray(payload.dependsOnJobIds) ? payload.dependsOnJobIds.filter((value): value is string => typeof value === 'string') : []
  if (dependencyIds.length > 0) await waitForDependencies(userId, dependencyIds)
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const result = await executeGeneration(jobId, userId, type, payload)
      if (result.status === 'NOT_CONFIGURED') {
        await updateJob(jobId, userId, { status: 'FAILED', progress: 45, stage: 'Provider not configured', error: String(result.result.message ?? 'Provider is not configured.'), result: result.result })
        return { status: 'FAILED' as const }
      }
      await updateJob(jobId, userId, { status: 'COMPLETED', progress: 100, stage: 'Generation complete', result: { ...result.result, generatedAt: new Date().toISOString() } })
      return { status: 'COMPLETED' as const }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Generation failed.'
      if (attempt >= maxAttempts) {
        await updateJob(jobId, userId, { status: 'DEAD_LETTER', progress: 45, stage: 'Generation moved to dead letter', error: message, attempts: attempt })
        return { status: 'DEAD_LETTER' as const }
      }
      await updateJob(jobId, userId, { status: 'PROCESSING', progress: 45, stage: `Retrying generation (${attempt}/${maxAttempts})`, error: message, attempts: attempt })
      await sleep(`${retryDelayMs * 2 ** (attempt - 1)}ms`)
    }
  }
  return { status: 'DEAD_LETTER' as const }
}

export async function processGenerationJob(jobId: string, userId: string, type: string, payload: JobPayload) {
  'use workflow'
  return processStage(jobId, userId, type, payload)
}

export async function processGenerationPipeline(stages: Array<{ jobId: string; type: string; payload: JobPayload }>, userId: string) {
  'use workflow'
  const completed: string[] = []
  for (const stage of stages) {
    const result = await processStage(stage.jobId, userId, stage.type, stage.payload)
    if (result.status !== 'COMPLETED') return { status: result.status, completed }
    completed.push(stage.jobId)
  }
  return { status: 'COMPLETED' as const, completed }
}

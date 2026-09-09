import { db } from '@/lib/db'
import { generationJob, project } from '@/lib/db/schema'
import { getCurrentUser, apiError, boundedString, readJson } from '@/lib/api'
import { getProvider } from '@/lib/generation/providers'
import { isGenerationJobType, type GenerationJobType } from '@/lib/generation/types'
import { and, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return apiError('Sign in required', 401)
  const body = await readJson(request)
  const projectId = boundedString(body?.projectId, 80)
  const prompt = boundedString(body?.prompt, 2000)
  const rawType = boundedString(body?.type, 20) || 'story'
  if (!projectId || !prompt) return apiError('Project and prompt are required')
  if (!isGenerationJobType(rawType)) return apiError('Invalid generation type')
  const type: GenerationJobType = rawType
  const [owned] = await db.select().from(project).where(and(eq(project.id, projectId), eq(project.userId, user.id)))
  if (!owned) return apiError('Project not found', 404)
  const id = crypto.randomUUID()
  const [job] = await db.insert(generationJob).values({ id, projectId, userId: user.id, type, status: 'running', progress: 10, message: 'Provider started', payload: { prompt } }).returning()
  try {
    const result = await getProvider(type).generate({ projectId, prompt, type, style: owned.visualStyle, genre: owned.genre })
    if (result.type !== type || !result.provider) throw new Error('Provider returned an invalid result')
    await db.update(generationJob).set({ status: 'completed', progress: 100, message: result.title, payload: result, updatedAt: new Date() }).where(eq(generationJob.id, id))
    return NextResponse.json({ job: { ...job, status: 'completed', progress: 100 }, result }, { status: 201 })
  } catch (error) {
    console.error('[v0] Generation provider failed', error)
    await db.update(generationJob).set({ status: 'failed', error: 'Generation provider failed', updatedAt: new Date() }).where(eq(generationJob.id, id))
    return apiError('Generation failed', 502)
  }
}

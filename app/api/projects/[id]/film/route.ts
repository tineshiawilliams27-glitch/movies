import { NextResponse } from 'next/server'
import { and, asc, desc, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { checkRateLimit, rateLimitPolicies, rateLimitResponse } from '@/lib/rate-limit'
import { filmBibles, filmCharacters, generationRuns, projects, storyboardShots, timelineItems } from '@/lib/db/schema'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 })
  const rate = await checkRateLimit(`user:${session.user.id}`, rateLimitPolicies.ai)
  if (!rate.success) return rateLimitResponse(rate.reset)
  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Project not found.' }, { status: 404 })
  const [project] = await db.select({ id: projects.id, title: projects.title, concept: projects.concept, status: projects.status }).from(projects).where(and(eq(projects.id, id), eq(projects.userId, session.user.id))).limit(1)
  if (!project) {
    const [exists] = await db.select({ id: projects.id }).from(projects).where(eq(projects.id, id)).limit(1)
    return NextResponse.json({ error: exists ? 'You do not have permission to view this project.' : 'Project not found.' }, { status: exists ? 403 : 404 })
  }
  const [activeRun] = await db.select().from(generationRuns).where(and(eq(generationRuns.projectId, id), eq(generationRuns.userId, session.user.id), eq(generationRuns.status, 'ACTIVE'))).orderBy(desc(generationRuns.version)).limit(1)
  const [bible] = activeRun ? await db.select().from(filmBibles).where(and(eq(filmBibles.projectId, id), eq(filmBibles.userId, session.user.id), eq(filmBibles.generationRunId, activeRun.id))).limit(1) : []
  const characters = activeRun ? await db.select().from(filmCharacters).where(and(eq(filmCharacters.projectId, id), eq(filmCharacters.userId, session.user.id), eq(filmCharacters.generationRunId, activeRun.id))).orderBy(asc(filmCharacters.createdAt)) : []
  const shots = activeRun ? await db.select().from(storyboardShots).where(and(eq(storyboardShots.projectId, id), eq(storyboardShots.userId, session.user.id), eq(storyboardShots.generationRunId, activeRun.id))).orderBy(asc(storyboardShots.shotNumber)) : []
  const timeline = activeRun ? await db.select().from(timelineItems).where(and(eq(timelineItems.projectId, id), eq(timelineItems.userId, session.user.id), eq(timelineItems.generationRunId, activeRun.id))).orderBy(asc(timelineItems.trackType), asc(timelineItems.startSeconds), asc(timelineItems.id)) : []
  return NextResponse.json({
    project,
    bible: bible ?? null,
    characters: Array.isArray(characters) ? characters : [],
    shots: Array.isArray(shots) ? shots : [],
    timeline: Array.isArray(timeline) ? timeline : [],
  })
}

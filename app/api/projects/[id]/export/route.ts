import { NextResponse } from 'next/server'
import { and, asc, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { filmBibles, filmCharacters, mediaAssets, projects, storyboardShots, timelineItems } from '@/lib/db/schema'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 })
  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Project not found.' }, { status: 404 })
  const [project] = await db.select().from(projects).where(and(eq(projects.id, id), eq(projects.userId, session.user.id))).limit(1)
  if (!project) return NextResponse.json({ error: 'Project not found.' }, { status: 404 })
  const [bible] = await db.select().from(filmBibles).where(and(eq(filmBibles.projectId, id), eq(filmBibles.userId, session.user.id))).limit(1)
  const characters = await db.select().from(filmCharacters).where(and(eq(filmCharacters.projectId, id), eq(filmCharacters.userId, session.user.id))).orderBy(asc(filmCharacters.createdAt))
  const shots = await db.select().from(storyboardShots).where(and(eq(storyboardShots.projectId, id), eq(storyboardShots.userId, session.user.id))).orderBy(asc(storyboardShots.shotNumber))
  const timeline = await db.select().from(timelineItems).where(and(eq(timelineItems.projectId, id), eq(timelineItems.userId, session.user.id))).orderBy(asc(timelineItems.startSeconds))
  const media = await db.select().from(mediaAssets).where(and(eq(mediaAssets.projectId, id), eq(mediaAssets.userId, session.user.id))).orderBy(asc(mediaAssets.createdAt))
  return NextResponse.json(
    {
      version: 1,
      exportedAt: new Date().toISOString(),
      project,
      bible: bible ?? null,
      characters: Array.isArray(characters) ? characters : [],
      shots: Array.isArray(shots) ? shots : [],
      timeline: Array.isArray(timeline) ? timeline : [],
      media: Array.isArray(media) ? media : [],
    },
    { headers: { 'Content-Disposition': 'attachment; filename="film-project-manifest.json"', 'Cache-Control': 'private, no-store' } },
  )
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return GET(request, context)
}

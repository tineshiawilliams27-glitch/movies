import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { characters, generationJobs, mediaAssets, projects, scenes } from '@/lib/db/schema'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 })
  const { id } = await params
  const [source] = await db.select().from(projects).where(and(eq(projects.id, id), eq(projects.userId, session.user.id))).limit(1)
  if (!source) return NextResponse.json({ error: 'Project not found.' }, { status: 404 })
  const result = await db.transaction(async (tx) => {
    const [copy] = await tx.insert(projects).values({ userId: session.user.id, title: `${source.title} copy`, concept: source.concept, format: source.format, durationSeconds: source.durationSeconds, status: 'DRAFT', metadata: source.metadata }).returning()
    const sourceScenes = await tx.select().from(scenes).where(and(eq(scenes.projectId, id), eq(scenes.userId, session.user.id)))
    if (sourceScenes.length) await tx.insert(scenes).values(sourceScenes.map((scene) => ({ userId: session.user.id, projectId: copy.id, sceneNumber: scene.sceneNumber, title: scene.title, description: scene.description, dialogue: scene.dialogue, location: scene.location, timeOfDay: scene.timeOfDay, durationSeconds: scene.durationSeconds, metadata: scene.metadata })))
    const sourceCharacters = await tx.select().from(characters).where(and(eq(characters.projectId, id), eq(characters.userId, session.user.id)))
    if (sourceCharacters.length) await tx.insert(characters).values(sourceCharacters.map((character) => ({ userId: session.user.id, projectId: copy.id, name: character.name, description: character.description, appearance: character.appearance, voice: character.voice, metadata: character.metadata })))
    return copy
  })
  return NextResponse.json({ project: result }, { status: 201 })
}

import { NextResponse } from 'next/server'
import { and, asc, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { projects, scenes } from '@/lib/db/schema'

const sceneSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(20000).default(''),
  dialogue: z.string().max(20000).default(''),
  location: z.string().max(200).default(''),
  timeOfDay: z.string().max(120).default(''),
  durationSeconds: z.number().positive().default(10),
})

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  return session?.user?.id ?? null
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 })
  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Project not found.' }, { status: 404 })
  const [project] = await db.select({ id: projects.id }).from(projects).where(and(eq(projects.id, id), eq(projects.userId, userId))).limit(1)
  if (!project) return NextResponse.json({ error: 'Project not found.' }, { status: 404 })
  const rows = await db.select().from(scenes).where(and(eq(scenes.projectId, id), eq(scenes.userId, userId))).orderBy(asc(scenes.sceneNumber))
  return NextResponse.json({ scenes: Array.isArray(rows) ? rows : [] })
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 })
  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Project not found.' }, { status: 404 })
  const [project] = await db.select({ id: projects.id }).from(projects).where(and(eq(projects.id, id), eq(projects.userId, userId))).limit(1)
  if (!project) return NextResponse.json({ error: 'Project not found.' }, { status: 404 })
  const parsed = sceneSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid scene payload.', issues: parsed.error.issues }, { status: 400 })
  const existing = await db.select({ sceneNumber: scenes.sceneNumber }).from(scenes).where(and(eq(scenes.projectId, id), eq(scenes.userId, userId))).orderBy(asc(scenes.sceneNumber))
  const sceneNumber = (existing.at(-1)?.sceneNumber ?? 0) + 1
  const [scene] = await db.insert(scenes).values({ ...parsed.data, projectId: id, userId, durationSeconds: String(parsed.data.durationSeconds), sceneNumber }).returning()
  if (!scene?.id) return NextResponse.json({ error: 'Scene could not be created.' }, { status: 500 })
  return NextResponse.json({ scene }, { status: 201 })
}

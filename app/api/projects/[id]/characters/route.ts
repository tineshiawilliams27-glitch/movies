import { NextResponse } from 'next/server'
import { and, asc, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { characters, projects } from '@/lib/db/schema'

const characterSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().max(20000).default(''),
  appearance: z.string().max(20000).default(''),
  voice: z.string().max(20000).default(''),
})

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  return session?.user?.id ?? null
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 })
  const { id } = await params
  const rows = await db.select().from(characters).where(and(eq(characters.projectId, id), eq(characters.userId, userId))).orderBy(asc(characters.createdAt))
  return NextResponse.json({ characters: rows })
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 })
  const { id } = await params
  const [project] = await db.select({ id: projects.id }).from(projects).where(and(eq(projects.id, id), eq(projects.userId, userId))).limit(1)
  if (!project) return NextResponse.json({ error: 'Project not found.' }, { status: 404 })
  const parsed = characterSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid character payload.', issues: parsed.error.issues }, { status: 400 })
  const [character] = await db.insert(characters).values({ ...parsed.data, userId, projectId: id }).returning()
  return NextResponse.json({ character }, { status: 201 })
}

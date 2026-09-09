import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { projects } from '@/lib/db/schema'

const updateSchema = z.object({ title: z.string().trim().min(1).max(200), concept: z.string().max(20000), format: z.string().max(80), metadata: z.record(z.string(), z.unknown()).optional() })

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  return session?.user?.id ?? null
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 })
  const { id } = await params
  const [project] = await db.select().from(projects).where(and(eq(projects.id, id), eq(projects.userId, userId))).limit(1)
  if (!project) return NextResponse.json({ error: 'Project not found.' }, { status: 404 })
  return NextResponse.json({ project })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 })
  const { id } = await params
  const parsed = updateSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid project payload.', issues: parsed.error.issues }, { status: 400 })
  const [project] = await db.update(projects).set({ ...parsed.data, updatedAt: new Date() }).where(and(eq(projects.id, id), eq(projects.userId, userId))).returning()
  if (!project) return NextResponse.json({ error: 'Project not found.' }, { status: 404 })
  return NextResponse.json({ project })
}

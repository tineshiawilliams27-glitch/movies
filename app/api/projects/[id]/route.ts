import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { projects } from '@/lib/db/schema'

const metadataSchema = z.record(z.string().max(120), z.unknown()).refine((value) => Object.keys(value).length <= 100, { message: 'Metadata may contain at most 100 fields.' }).refine((value) => JSON.stringify(value).length <= 100000, { message: 'Metadata is too large.' })
const updateSchema = z.object({ title: z.string().trim().min(1).max(200).optional(), concept: z.string().max(20000).nullable().optional(), format: z.string().max(80).nullable().optional(), metadata: metadataSchema.nullable().optional() }).refine((value) => Object.keys(value).length > 0, { message: 'At least one project field is required.' })

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  return session?.user?.id ?? null
}

async function projectAccessError(id: string) {
  const [project] = await db.select({ id: projects.id }).from(projects).where(eq(projects.id, id)).limit(1)
  return NextResponse.json({ error: project ? 'You don\'t have permission to access this project.' : 'Project not found.' }, { status: project ? 403 : 404 })
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 })
  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Project not found.' }, { status: 404 })
  const [project] = await db.select().from(projects).where(and(eq(projects.id, id), eq(projects.userId, userId))).limit(1)
  if (!project) return projectAccessError(id)
  return NextResponse.json({ project })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 })
  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Project not found.' }, { status: 404 })
  const [deleted] = await db.delete(projects).where(and(eq(projects.id, id), eq(projects.userId, userId))).returning({ id: projects.id })
  if (!deleted) return projectAccessError(id)
  return NextResponse.json({ ok: true })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 })
  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Project not found.' }, { status: 404 })
  const parsed = updateSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid project payload.', issues: parsed.error.issues }, { status: 400 })
  const existing = await db.select({ metadata: projects.metadata }).from(projects).where(and(eq(projects.id, id), eq(projects.userId, userId))).limit(1)
  if (!existing[0]) return projectAccessError(id)
  const nextMetadata = parsed.data.metadata && typeof parsed.data.metadata === 'object' ? { ...(existing[0].metadata as Record<string, unknown>), ...parsed.data.metadata } : undefined
  const normalized: { title?: string; concept?: string; format?: string; metadata?: Record<string, unknown> } = { ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}), concept: parsed.data.concept ?? undefined, format: parsed.data.format ?? undefined, metadata: nextMetadata ?? (parsed.data.metadata === null ? {} : undefined) }
  const [project] = await db.update(projects).set({ ...normalized, updatedAt: new Date() }).where(and(eq(projects.id, id), eq(projects.userId, userId))).returning()
  if (!project) return projectAccessError(id)
  return NextResponse.json({ project })
}

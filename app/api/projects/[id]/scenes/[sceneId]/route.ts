import { NextResponse } from 'next/server'
import { and, desc, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { projects, scenes } from '@/lib/db/schema'

const updateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(20000).optional(),
  dialogue: z.string().max(20000).optional(),
  location: z.string().max(200).optional(),
  timeOfDay: z.string().max(120).optional(),
  durationSeconds: z.coerce.number().positive().max(86400).optional(),
}).refine((data) => Object.keys(data).length > 0, 'At least one scene field is required.')

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; sceneId: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 })
  const { id, sceneId } = await params
  if (!z.string().uuid().safeParse(id).success || !z.string().uuid().safeParse(sceneId).success) return NextResponse.json({ error: 'Scene not found.' }, { status: 404 })
  const [project] = await db.select({ id: projects.id }).from(projects).where(and(eq(projects.id, id), eq(projects.userId, session.user.id))).limit(1)
  if (!project) return NextResponse.json({ error: 'Project not found.' }, { status: 404 })
  const parsed = updateSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid scene payload.', issues: parsed.error.issues }, { status: 400 })
  const { durationSeconds, ...sceneFields } = parsed.data
  const updateData = {
    ...sceneFields,
    ...(durationSeconds === undefined ? {} : { durationSeconds: String(durationSeconds) }),
    updatedAt: new Date(),
  }
  const [scene] = await db.update(scenes).set(updateData).where(and(eq(scenes.id, sceneId), eq(scenes.projectId, id), eq(scenes.userId, session.user.id))).returning()
  if (!scene) return NextResponse.json({ error: 'Scene not found.' }, { status: 404 })
  return NextResponse.json({ scene })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; sceneId: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 })
  const { id, sceneId } = await params
  if (!z.string().uuid().safeParse(id).success || !z.string().uuid().safeParse(sceneId).success) return NextResponse.json({ error: 'Scene not found.' }, { status: 404 })
  const deleted = await db.transaction(async (tx) => {
    const [scene] = await tx.delete(scenes).where(and(eq(scenes.id, sceneId), eq(scenes.projectId, id), eq(scenes.userId, session.user.id))).returning({ id: scenes.id })
    if (!scene) return false
    const remaining = await tx.select({ id: scenes.id, sceneNumber: scenes.sceneNumber }).from(scenes).where(and(eq(scenes.projectId, id), eq(scenes.userId, session.user.id))).orderBy(desc(scenes.sceneNumber))
    for (const [index, remainingScene] of remaining.entries()) {
      await tx.update(scenes).set({ sceneNumber: remaining.length - index, updatedAt: new Date() }).where(and(eq(scenes.id, remainingScene.id), eq(scenes.projectId, id), eq(scenes.userId, session.user.id)))
    }
    return true
  })
  if (!deleted) return NextResponse.json({ error: 'Scene not found.' }, { status: 404 })
  return new NextResponse(null, { status: 204 })
}

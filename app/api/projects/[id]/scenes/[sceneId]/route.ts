import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { projects, scenes } from '@/lib/db/schema'

const updateSchema = z.object({ title: z.string().trim().min(1).max(200), description: z.string().max(20000), dialogue: z.string().max(20000), location: z.string().max(200), timeOfDay: z.string().max(120), durationSeconds: z.coerce.number().positive() })

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; sceneId: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 })
  const { id, sceneId } = await params
  const [project] = await db.select({ id: projects.id }).from(projects).where(and(eq(projects.id, id), eq(projects.userId, session.user.id))).limit(1)
  if (!project) return NextResponse.json({ error: 'Project not found.' }, { status: 404 })
  const parsed = updateSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid scene payload.', issues: parsed.error.issues }, { status: 400 })
  const [scene] = await db.update(scenes).set({ ...parsed.data, durationSeconds: String(parsed.data.durationSeconds), updatedAt: new Date() }).where(and(eq(scenes.id, sceneId), eq(scenes.projectId, id), eq(scenes.userId, session.user.id))).returning()
  if (!scene) return NextResponse.json({ error: 'Scene not found.' }, { status: 404 })
  return NextResponse.json({ scene })
}

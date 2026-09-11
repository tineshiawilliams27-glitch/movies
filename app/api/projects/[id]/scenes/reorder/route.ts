import { NextResponse } from 'next/server'
import { and, eq, inArray } from 'drizzle-orm'
import { headers } from 'next/headers'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { scenes } from '@/lib/db/schema'

const schema = z.object({
  sceneIds: z.array(z.string().uuid()).min(1).superRefine((sceneIds, context) => {
    if (new Set(sceneIds).size !== sceneIds.length) context.addIssue({ code: z.ZodIssueCode.custom, message: 'Scene IDs must be unique.' })
  }),
})

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid scene order.' }, { status: 400 })
  const { id } = await params
  const owned = await db.select({ id: scenes.id }).from(scenes).where(and(eq(scenes.projectId, id), eq(scenes.userId, session.user.id), inArray(scenes.id, parsed.data.sceneIds)))
  if (owned.length !== parsed.data.sceneIds.length) return NextResponse.json({ error: 'One or more scenes were not found.' }, { status: 404 })
  await db.transaction(async (tx) => { for (const [index, sceneId] of parsed.data.sceneIds.entries()) await tx.update(scenes).set({ sceneNumber: -(index + 1), updatedAt: new Date() }).where(and(eq(scenes.id, sceneId), eq(scenes.projectId, id), eq(scenes.userId, session.user.id))); for (const [index, sceneId] of parsed.data.sceneIds.entries()) await tx.update(scenes).set({ sceneNumber: index + 1, updatedAt: new Date() }).where(and(eq(scenes.id, sceneId), eq(scenes.projectId, id), eq(scenes.userId, session.user.id))) })
  return NextResponse.json({ ok: true })
}

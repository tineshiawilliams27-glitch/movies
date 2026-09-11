import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { characters } from '@/lib/db/schema'

const schema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().max(20000).optional(),
  appearance: z.string().max(20000).optional(),
  voice: z.string().max(20000).optional(),
}).refine((data) => Object.keys(data).length > 0, 'At least one character field is required.')

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; characterId: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 })
  const { id, characterId } = await params
  if (!z.string().uuid().safeParse(id).success || !z.string().uuid().safeParse(characterId).success) return NextResponse.json({ error: 'Character not found.' }, { status: 404 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid character payload.', issues: parsed.error.issues }, { status: 400 })
  const [character] = await db.update(characters).set({ ...parsed.data, updatedAt: new Date() }).where(and(eq(characters.id, characterId), eq(characters.projectId, id), eq(characters.userId, session.user.id))).returning()
  if (!character) return NextResponse.json({ error: 'Character not found.' }, { status: 404 })
  return NextResponse.json({ character })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; characterId: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 })
  const { id, characterId } = await params
  if (!z.string().uuid().safeParse(id).success || !z.string().uuid().safeParse(characterId).success) return NextResponse.json({ error: 'Character not found.' }, { status: 404 })
  const [character] = await db.delete(characters).where(and(eq(characters.id, characterId), eq(characters.projectId, id), eq(characters.userId, session.user.id))).returning({ id: characters.id })
  if (!character) return NextResponse.json({ error: 'Character not found.' }, { status: 404 })
  return new NextResponse(null, { status: 204 })
}

import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { characters } from '@/lib/db/schema'

const schema = z.object({ name: z.string().trim().min(1).max(120), description: z.string().max(20000), appearance: z.string().max(20000), voice: z.string().max(20000) })

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; characterId: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 })
  const { id, characterId } = await params
  const parsed = schema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid character payload.', issues: parsed.error.issues }, { status: 400 })
  const [character] = await db.update(characters).set({ ...parsed.data, updatedAt: new Date() }).where(and(eq(characters.id, characterId), eq(characters.projectId, id), eq(characters.userId, session.user.id))).returning()
  if (!character) return NextResponse.json({ error: 'Character not found.' }, { status: 404 })
  return NextResponse.json({ character })
}

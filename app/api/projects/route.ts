import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { project } from '@/lib/db/schema'
import { desc, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  return session?.user?.id ?? null
}

export async function GET() {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ projects: [] })
  const projects = await db.select().from(project).where(eq(project.userId, userId)).orderBy(desc(project.updatedAt))
  return NextResponse.json({ projects })
}

export async function POST(request: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  const body = await request.json().catch(() => null)
  const title = typeof body?.title === 'string' ? body.title.trim().slice(0, 120) : ''
  const genre = typeof body?.genre === 'string' ? body.genre.trim().slice(0, 60) : ''
  const visualStyle = typeof body?.visualStyle === 'string' ? body.visualStyle.trim().slice(0, 60) : 'Atmospheric'
  if (!title || !genre) return NextResponse.json({ error: 'Title and genre are required' }, { status: 400 })
  const created = await db.insert(project).values({ id: crypto.randomUUID(), userId, title, genre, visualStyle, status: 'Planning story' }).returning()
  return NextResponse.json({ project: created[0] }, { status: 201 })
}

import { NextResponse } from 'next/server'
import { desc, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { db } from '@/lib/db'
import { projects } from '@/lib/db/schema'
import { auth } from '@/lib/auth'
import { z } from 'zod'

const projectSchema = z.object({ title: z.string().trim().min(1).max(200), concept: z.string().max(20000).default(''), format: z.string().max(80).default('Story'), durationSeconds: z.number().nonnegative().max(86400).optional() })

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  return session?.user?.id ?? null
}

export async function GET() {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Authentication is required for project access.' }, { status: 401 })
  const rows = await db.select().from(projects).where(eq(projects.userId, userId)).orderBy(desc(projects.updatedAt))
  return NextResponse.json({ projects: Array.isArray(rows) ? rows : [] })
}

export async function POST(request: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Authentication is required before creating a project.' }, { status: 401 })
  const parsed = projectSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid project payload.', issues: parsed.error.issues }, { status: 400 })
  const [project] = await db.insert(projects).values({ ...parsed.data, userId, durationSeconds: String(parsed.data.durationSeconds ?? 0) }).returning()
  if (!project?.id) return NextResponse.json({ error: 'Project could not be created.' }, { status: 500 })
  return NextResponse.json({ project }, { status: 201 })
}

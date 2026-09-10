import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { projects } from '@/lib/db/schema'

const requestSchema = z.object({ kind: z.enum(['story', 'scene', 'character', 'visual', 'audio']), prompt: z.string().trim().min(1).max(12000) })

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 })
  const { id } = await params
  const parsed = requestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid generation request.' }, { status: 400 })
  const [project] = await db.select({ id: projects.id, metadata: projects.metadata }).from(projects).where(and(eq(projects.id, id), eq(projects.userId, session.user.id))).limit(1)
  if (!project) return NextResponse.json({ error: 'Project not found.' }, { status: 404 })
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: 'OpenAI generation is not configured.' }, { status: 503 })
  const response = await fetch('https://api.openai.com/v1/responses', { method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'gpt-4.1-mini', input: `You are a production studio assistant. Generate a ${parsed.data.kind} for this project. Return concise, production-ready text.\n\n${parsed.data.prompt}` }) })
  const data = await response.json().catch(() => null) as { output_text?: string; error?: { message?: string } } | null
  if (!response.ok) return NextResponse.json({ error: data?.error?.message || 'OpenAI generation failed.' }, { status: 502 })
  const result = data?.output_text || ''
  const metadata = { ...(project.metadata as Record<string, unknown>), generations: [...(Array.isArray((project.metadata as Record<string, unknown>).generations) ? (project.metadata as Record<string, unknown>).generations as unknown[] : []), { id: crypto.randomUUID(), kind: parsed.data.kind, prompt: parsed.data.prompt, result, createdAt: new Date().toISOString() }] }
  await db.update(projects).set({ metadata, updatedAt: new Date() }).where(and(eq(projects.id, id), eq(projects.userId, session.user.id)))
  return NextResponse.json({ result })
}

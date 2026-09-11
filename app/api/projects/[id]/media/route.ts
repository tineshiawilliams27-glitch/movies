import { put } from '@vercel/blob'
import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { mediaAssets, projects, scenes } from '@/lib/db/schema'

const MAX_UPLOAD_BYTES = 250 * 1024 * 1024
const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'text/vtt', 'text/plain', 'application/x-subrip'])

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 })
  const { id } = await params
  const [project] = await db.select({ id: projects.id }).from(projects).where(and(eq(projects.id, id), eq(projects.userId, session.user.id))).limit(1)
  if (!project) return NextResponse.json({ error: 'Project not found.' }, { status: 404 })
  const assets = await db.select().from(mediaAssets).where(and(eq(mediaAssets.projectId, id), eq(mediaAssets.userId, session.user.id)))
  return NextResponse.json({ assets: Array.isArray(assets) ? assets : [] })
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 })
  const { id } = await params
  const [project] = await db.select({ id: projects.id }).from(projects).where(and(eq(projects.id, id), eq(projects.userId, session.user.id))).limit(1)
  if (!project) return NextResponse.json({ error: 'Project not found.' }, { status: 404 })
  const formData = await request.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'A file is required.' }, { status: 400 })
  if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: 'File must be between 1 byte and 250 MB.' }, { status: 413 })
  if (!allowedTypes.has(file.type)) return NextResponse.json({ error: 'Unsupported media type.' }, { status: 415 })
  const inferredKind = file.type.startsWith('image/') ? 'IMAGE' : file.type.startsWith('video/') ? 'VIDEO' : file.type.startsWith('audio/') ? 'AUDIO' : 'SUBTITLE'
  const kind = z.enum(['IMAGE', 'VIDEO', 'AUDIO', 'SUBTITLE']).catch(inferredKind).parse(formData.get('kind'))
  const sceneIdValue = formData.get('sceneId')
  const sceneId = typeof sceneIdValue === 'string' && /^[0-9a-f-]{36}$/i.test(sceneIdValue) ? sceneIdValue : undefined
  if (sceneId) {
    const [scene] = await db.select({ id: scenes.id }).from(scenes).where(and(eq(scenes.id, sceneId), eq(scenes.projectId, id), eq(scenes.userId, session.user.id))).limit(1)
    if (!scene) return NextResponse.json({ error: 'Scene not found.' }, { status: 404 })
  }
  const pathname = `projects/${id}/uploads/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`
  const blob = await put(pathname, file, { access: 'private', contentType: file.type, addRandomSuffix: false })
  const [asset] = await db.insert(mediaAssets).values({ userId: session.user.id, projectId: id, sceneId, kind, pathname: blob.pathname, contentType: file.type }).returning()
  return NextResponse.json({ asset }, { status: 201 })
}

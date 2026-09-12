import { NextResponse } from 'next/server'
import { and, eq, sql } from 'drizzle-orm'
import { headers } from 'next/headers'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { mediaAssets, projects, scenes } from '@/lib/db/schema'

const MAX_ASSET_BYTES = 250 * 1024 * 1024
const MAX_PROJECT_ASSETS = 1_000
const MAX_PROJECT_BYTES = 2 * 1024 * 1024 * 1024
const MAX_USER_BYTES = 10 * 1024 * 1024 * 1024

const metadataSchema = z.object({
  pathname: z.string().min(1),
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'text/vtt', 'text/plain', 'application/x-subrip']),
  size: z.number().int().positive().max(MAX_ASSET_BYTES),
  name: z.string().trim().min(1).max(200),
  kind: z.enum(['IMAGE', 'VIDEO', 'AUDIO', 'SUBTITLE']),
  sceneId: z.string().uuid().optional(),
})

function safePathname(pathname: string) {
  return pathname.split('/').map((segment) => segment.normalize('NFKC').replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-').slice(0, 180)).filter(Boolean).join('/')
}

async function getProject(id: string, userId: string) {
  const [project] = await db.select({ id: projects.id }).from(projects).where(and(eq(projects.id, id), eq(projects.userId, userId))).limit(1)
  return project
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 })
  const { id } = await params
  if (!await getProject(id, session.user.id)) return NextResponse.json({ error: 'Project not found.' }, { status: 404 })
  const assets = await db.select().from(mediaAssets).where(and(eq(mediaAssets.projectId, id), eq(mediaAssets.userId, session.user.id)))
  return NextResponse.json({ assets: assets.map(({ pathname: _pathname, ...asset }) => ({ ...asset, deliveryUrl: `/api/media/${asset.id}` })) })
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 })
  const { id } = await params
  if (!await getProject(id, session.user.id)) return NextResponse.json({ error: 'Project not found.' }, { status: 404 })
  const result = metadataSchema.safeParse(await request.json())
  if (!result.success) return NextResponse.json({ error: 'Invalid upload metadata.' }, { status: 400 })
  const { contentType, size, name, kind, sceneId } = result.data
  const pathname = safePathname(result.data.pathname)
  if (!pathname) return NextResponse.json({ error: 'Invalid upload path.' }, { status: 400 })
  if (kind === 'IMAGE' && !contentType.startsWith('image/')) return NextResponse.json({ error: 'Media kind does not match the file type.' }, { status: 400 })
  if (kind === 'VIDEO' && !contentType.startsWith('video/')) return NextResponse.json({ error: 'Media kind does not match the file type.' }, { status: 400 })
  if (kind === 'AUDIO' && !contentType.startsWith('audio/')) return NextResponse.json({ error: 'Media kind does not match the file type.' }, { status: 400 })
  if (sceneId) {
    const [scene] = await db.select({ id: scenes.id }).from(scenes).where(and(eq(scenes.id, sceneId), eq(scenes.projectId, id), eq(scenes.userId, session.user.id))).limit(1)
    if (!scene) return NextResponse.json({ error: 'Scene not found.' }, { status: 404 })
  }
  const [projectUsage] = await db.select({ count: sql<number>`count(*)`, bytes: sql<number>`coalesce(sum(${mediaAssets.sizeBytes}), 0)` }).from(mediaAssets).where(and(eq(mediaAssets.projectId, id), eq(mediaAssets.userId, session.user.id)))
  const [userUsage] = await db.select({ bytes: sql<number>`coalesce(sum(${mediaAssets.sizeBytes}), 0)` }).from(mediaAssets).where(eq(mediaAssets.userId, session.user.id))
  if (Number(projectUsage?.count || 0) >= MAX_PROJECT_ASSETS) return NextResponse.json({ error: 'Project asset limit reached.' }, { status: 413 })
  if (Number(projectUsage?.bytes || 0) + size > MAX_PROJECT_BYTES) return NextResponse.json({ error: 'Project storage quota exceeded.' }, { status: 413 })
  if (Number(userUsage?.bytes || 0) + size > MAX_USER_BYTES) return NextResponse.json({ error: 'User storage quota exceeded.' }, { status: 413 })
  const [asset] = await db.insert(mediaAssets).values({ userId: session.user.id, projectId: id, sceneId, kind, pathname, contentType, sizeBytes: size, metadata: { originalName: name } }).returning()
  return NextResponse.json({ asset: { ...asset, deliveryUrl: `/api/media/${asset.id}` } }, { status: 201 })
}

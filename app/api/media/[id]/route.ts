import { get } from '@vercel/blob'
import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { mediaAssets } from '@/lib/db/schema'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 })
  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Media not found.' }, { status: 404 })
  const [asset] = await db.select().from(mediaAssets).where(and(eq(mediaAssets.id, id), eq(mediaAssets.userId, session.user.id))).limit(1)
  if (!asset) return NextResponse.json({ error: 'Media not found.' }, { status: 404 })
  const result = await get(asset.pathname, { access: 'private', ifNoneMatch: request.headers.get('if-none-match') ?? undefined })
  if (!result) return NextResponse.json({ error: 'Media not found.' }, { status: 404 })
  if (result.statusCode === 304) return new NextResponse(null, { status: 304, headers: { ETag: result.blob.etag, 'Cache-Control': 'private, no-cache' } })
  return new NextResponse(result.stream, { headers: { 'Content-Type': result.blob.contentType, ETag: result.blob.etag, 'Cache-Control': 'private, no-cache' } })
}

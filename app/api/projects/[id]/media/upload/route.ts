import { handleUpload } from '@vercel/blob/client'
import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { projects } from '@/lib/db/schema'
import { checkRateLimit, rateLimitPolicies, rateLimitResponse } from '@/lib/rate-limit'

const MAX_ASSET_BYTES = 250 * 1024 * 1024
function safePathSegment(value: string) {
  return value.normalize('NFKC').replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-').slice(0, 180) || 'upload'
}

const allowedContentTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'text/vtt', 'text/plain', 'application/x-subrip']

export async function POST(request: Request, context: { params: Promise<Record<string, string | string[]>> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 })
  const rate = await checkRateLimit(`user:${session.user.id}`, rateLimitPolicies.upload)
  if (!rate.success) return rateLimitResponse(rate.reset)
  const params = await context.params
  const id = typeof params.id === 'string' ? params.id : ''
  const [project] = await db.select({ id: projects.id }).from(projects).where(and(eq(projects.id, id), eq(projects.userId, session.user.id))).limit(1)
  if (!project) return NextResponse.json({ error: 'Project not found.' }, { status: 404 })

  const json = await request.json()
  const response = await handleUpload({
    body: json,
    request,
    onBeforeGenerateToken: async (pathname) => ({
      allowedContentTypes,
      maximumSizeInBytes: MAX_ASSET_BYTES,
      addRandomSuffix: false,
      tokenPayload: JSON.stringify({ userId: session.user.id, projectId: id, pathname: safePathSegment(pathname) }),
    }),
    onUploadCompleted: async () => undefined,
  })
  return NextResponse.json(response)
}

export function validateUploadMetadata(input: unknown) {
  return z.object({
    pathname: z.string().min(1),
    contentType: z.enum(allowedContentTypes as [string, ...string[]]),
    size: z.number().int().positive().max(MAX_ASSET_BYTES),
    name: z.string().trim().min(1).max(200),
    kind: z.enum(['IMAGE', 'VIDEO', 'AUDIO', 'SUBTITLE']),
  }).safeParse(input)
}

export const runtime = 'nodejs'
export const maxDuration = 30

export { allowedContentTypes }

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed.' }, { status: 405 })
}

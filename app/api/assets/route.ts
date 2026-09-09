import { put } from '@vercel/blob'
import { db } from '@/lib/db'
import { asset, project } from '@/lib/db/schema'
import { getCurrentUser, apiError } from '@/lib/api'
import { and, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const MAX_FILE_SIZE = 25 * 1024 * 1024
const allowedTypes = new Map([
  ['image/', 'image'],
  ['video/', 'video'],
  ['audio/', 'audio'],
] as const)

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return apiError('Sign in required', 401)
  const form = await request.formData()
  const file = form.get('file')
  const projectId = String(form.get('projectId') ?? '').trim()
  if (!(file instanceof File) || !projectId) return apiError('File and project are required')
  if (file.size === 0) return apiError('The selected file is empty')
  if (file.size > MAX_FILE_SIZE) return apiError('Files must be 25 MB or smaller')
  const type = [...allowedTypes.entries()].find(([prefix]) => file.type.startsWith(prefix))?.[1]
  if (!type) return apiError('Only image, video, and audio files are supported')
  const [owned] = await db.select().from(project).where(and(eq(project.id, projectId), eq(project.userId, user.id)))
  if (!owned) return apiError('Project not found', 404)
  try {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const blob = await put(`cinemaforge/${user.id}/${projectId}/${crypto.randomUUID()}-${safeName}`, file, { access: 'private', contentType: file.type })
    const [record] = await db.insert(asset).values({ id: crypto.randomUUID(), projectId, userId: user.id, type, pathname: blob.pathname, mimeType: file.type, size: file.size }).returning()
    return NextResponse.json({ asset: record }, { status: 201 })
  } catch (error) {
    console.error('[v0] Blob upload failed', error)
    return apiError('Upload failed. Please try again.', 502)
  }
}

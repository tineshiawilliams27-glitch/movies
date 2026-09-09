import { put } from '@vercel/blob'
import { db } from '@/lib/db'
import { asset, project } from '@/lib/db/schema'
import { getCurrentUser, apiError } from '@/lib/api'
import { and, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export async function POST(request: Request) { const user = await getCurrentUser(); if (!user) return apiError('Sign in required', 401); const form = await request.formData(); const file = form.get('file'); const projectId = String(form.get('projectId') ?? ''); if (!(file instanceof File) || !projectId) return apiError('File and project are required'); const [owned] = await db.select().from(project).where(and(eq(project.id, projectId), eq(project.userId, user.id))); if (!owned) return apiError('Project not found', 404); const blob = await put(`cinemaforge/${user.id}/${projectId}/${crypto.randomUUID()}-${file.name}`, file, { access: 'private' }); const [record] = await db.insert(asset).values({ id: crypto.randomUUID(), projectId, userId: user.id, type: file.type.startsWith('video') ? 'video' : file.type.startsWith('audio') ? 'audio' : 'image', pathname: blob.pathname, mimeType: file.type, size: file.size }).returning(); return NextResponse.json({ asset: record }, { status: 201 }) }

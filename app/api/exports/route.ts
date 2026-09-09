import { db } from '@/lib/db'
import { movieExport, project } from '@/lib/db/schema'
import { getCurrentUser, apiError, boundedString, readJson } from '@/lib/api'
import { and, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export async function POST(request: Request) { const user = await getCurrentUser(); if (!user) return apiError('Sign in required', 401); const body = await readJson(request); const projectId = boundedString(body?.projectId, 80); const [owned] = await db.select().from(project).where(and(eq(project.id, projectId), eq(project.userId, user.id))); if (!owned) return apiError('Project not found', 404); const [job] = await db.insert(movieExport).values({ id: crypto.randomUUID(), projectId, userId: user.id, status: 'queued', progress: 0 }).returning(); return NextResponse.json({ export: job, message: 'Export queued for an FFmpeg-capable worker.' }, { status: 202 }) }

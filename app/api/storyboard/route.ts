import { db } from '@/lib/db'
import { project, scene } from '@/lib/db/schema'
import { getCurrentUser, apiError, boundedString, readJson } from '@/lib/api'
import { and, asc, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export async function GET(request: Request) { const user = await getCurrentUser(); if (!user) return apiError('Sign in required', 401); const projectId = new URL(request.url).searchParams.get('projectId') ?? ''; const rows = await db.select().from(scene).where(and(eq(scene.projectId, projectId), eq(scene.userId, user.id))).orderBy(asc(scene.position)); return NextResponse.json({ scenes: rows }) }
export async function POST(request: Request) { const user = await getCurrentUser(); if (!user) return apiError('Sign in required', 401); const body = await readJson(request); const projectId = boundedString(body?.projectId, 80); const count = Math.min(Math.max(Number(body?.count) || 4, 1), 12); const [owned] = await db.select().from(project).where(and(eq(project.id, projectId), eq(project.userId, user.id))); if (!owned) return apiError('Project not found', 404); const scenes = Array.from({ length: count }, (_, index) => ({ id: crypto.randomUUID(), projectId, userId: user.id, position: index + 1, title: `Scene ${String(index + 1).padStart(2, '0')}`, description: `A ${owned.visualStyle.toLowerCase()} beat in the ${owned.genre.toLowerCase()} story.`, shotPrompt: `${owned.visualStyle} cinematic shot`, narration: index === 0 ? owned.logline ?? 'The story begins.' : undefined })); const created = await db.insert(scene).values(scenes).returning(); return NextResponse.json({ scenes: created }, { status: 201 }) }

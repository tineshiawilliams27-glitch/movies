import { db } from '@/lib/db'
import { project } from '@/lib/db/schema'
import { getCurrentUser, apiError, boundedString, readJson } from '@/lib/api'
import { and, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) { const user = await getCurrentUser(); if (!user) return apiError('Sign in required', 401); const { id } = await params; const rows = await db.select().from(project).where(and(eq(project.id, id), eq(project.userId, user.id))); if (!rows[0]) return apiError('Project not found', 404); return NextResponse.json({ project: rows[0] }) }
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) { const user = await getCurrentUser(); if (!user) return apiError('Sign in required', 401); const { id } = await params; const body = await readJson(request); const updates = { title: boundedString(body?.title, 120), genre: boundedString(body?.genre, 60), visualStyle: boundedString(body?.visualStyle, 60), logline: boundedString(body?.logline, 500), updatedAt: new Date() }; if (!updates.title || !updates.genre || !updates.visualStyle) return apiError('Title, genre, and visual style are required'); const rows = await db.update(project).set(updates).where(and(eq(project.id, id), eq(project.userId, user.id))).returning(); if (!rows[0]) return apiError('Project not found', 404); return NextResponse.json({ project: rows[0] }) }
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) { const user = await getCurrentUser(); if (!user) return apiError('Sign in required', 401); const { id } = await params; const rows = await db.delete(project).where(and(eq(project.id, id), eq(project.userId, user.id))).returning({ id: project.id }); if (!rows[0]) return apiError('Project not found', 404); return NextResponse.json({ deleted: true }) }

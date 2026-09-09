import { db } from '@/lib/db'
import { generationJob } from '@/lib/db/schema'
import { getCurrentUser, apiError } from '@/lib/api'
import { and, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) { const user = await getCurrentUser(); if (!user) return apiError('Sign in required', 401); const { id } = await params; const [job] = await db.select().from(generationJob).where(and(eq(generationJob.id, id), eq(generationJob.userId, user.id))); if (!job) return apiError('Job not found', 404); return NextResponse.json({ job }) }
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) { const user = await getCurrentUser(); if (!user) return apiError('Sign in required', 401); const { id } = await params; const action = new URL(request.url).searchParams.get('action'); const status = action === 'cancel' ? 'cancelled' : action === 'retry' ? 'queued' : null; if (!status) return apiError('Use action=retry or action=cancel'); const [job] = await db.update(generationJob).set({ status, error: null, message: status === 'cancelled' ? 'Cancelled by user' : 'Queued for retry', updatedAt: new Date() }).where(and(eq(generationJob.id, id), eq(generationJob.userId, user.id))).returning(); if (!job) return apiError('Job not found', 404); return NextResponse.json({ job }) }

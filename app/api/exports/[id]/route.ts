import { db } from '@/lib/db'
import { movieExport } from '@/lib/db/schema'
import { getCurrentUser, apiError } from '@/lib/api'
import { and, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return apiError('Sign in required', 401)
  const { id } = await params
  const [record] = await db.select().from(movieExport).where(and(eq(movieExport.id, id), eq(movieExport.userId, user.id)))
  if (!record) return apiError('Export not found', 404)
  return NextResponse.json({ export: record })
}

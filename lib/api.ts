import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

export async function getCurrentUser() {
  const session = await auth.api.getSession({ headers: await headers() })
  return session?.user ?? null
}

export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export async function readJson(request: Request) {
  return request.json().catch(() => null) as Promise<Record<string, unknown> | null>
}

export function boundedString(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

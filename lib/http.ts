import { NextResponse } from 'next/server'

export async function readJson<T>(request: Request): Promise<{ data?: T; response?: NextResponse }> {
  try {
    return { data: await request.json() as T }
  } catch {
    return { response: NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 }) }
  }
}

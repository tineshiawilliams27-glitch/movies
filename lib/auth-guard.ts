import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { projects } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { headers } from 'next/headers'
import { forbidden, notFound, redirect } from 'next/navigation'

export async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/login')
  return session.user
}

export async function getUserId() {
  return (await requireUser()).id
}

export async function requireProject(projectId: string) {
  if (!z.string().uuid().safeParse(projectId).success) notFound()
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect(`/login?redirect=${encodeURIComponent('/projects/' + projectId)}`)
  const user = session.user
  const project = await db.query.projects.findFirst({ where: and(eq(projects.id, projectId), eq(projects.userId, user.id)) })
  if (project) return project

  const exists = await db.query.projects.findFirst({ where: eq(projects.id, projectId), columns: { id: true } })
  if (exists) forbidden()

  notFound()
}

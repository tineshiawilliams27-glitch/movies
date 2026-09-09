import { desc, eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { StudioDashboard } from '@/components/studio-dashboard'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { projects } from '@/lib/db/schema'
import { headers } from 'next/headers'

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/login')

  const persistedProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, session.user.id))
    .orderBy(desc(projects.updatedAt))

  return <StudioDashboard persistedProjects={persistedProjects} />
}

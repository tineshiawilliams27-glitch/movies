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

  const rows = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, session.user.id))
    .orderBy(desc(projects.updatedAt))

  const persistedProjects = rows.map((project) => ({
    id: project.id,
    title: project.title,
    type: project.format,
    duration: formatDuration(Number(project.durationSeconds)),
    scenes: getSceneCount(project.metadata),
    updated: formatUpdatedAt(project.updatedAt),
    status: project.status === 'READY' ? 'Ready' as const : project.status === 'RENDERING' ? 'Rendering' as const : 'Draft' as const,
    image: getProjectImage(project.metadata),
  }))

  return <StudioDashboard persistedProjects={persistedProjects} />
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = Math.floor(totalSeconds % 60)
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function formatUpdatedAt(updatedAt: Date) {
  const minutes = Math.max(1, Math.round((Date.now() - updatedAt.getTime()) / 60000))
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hr ago`
  return `${Math.round(hours / 24)} days ago`
}

function getSceneCount(metadata: unknown) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return 0
  const value = (metadata as { scenes?: unknown }).scenes
  return typeof value === 'number' ? value : 0
}

function getProjectImage(metadata: unknown) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return '/placeholder.svg'
  const image = (metadata as { image?: unknown }).image
  return typeof image === 'string' && image.length > 0 ? image : '/placeholder.svg'
}

import { desc, eq, sql } from 'drizzle-orm'
import { StudioDashboard } from '@/components/studio-dashboard'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { projects, scenes } from '@/lib/db/schema'
import { headers } from 'next/headers'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() }).catch((error) => {
    console.error('[v0] Dashboard session lookup failed:', error)
    return null
  })

  let persistedProjects: Awaited<ReturnType<typeof loadProjects>> = []
  try {
    if (session?.user) persistedProjects = await loadProjects(session.user.id)
  } catch (error) {
    console.error('[v0] Dashboard project loading failed:', error)
  }

  return <StudioDashboard persistedProjects={persistedProjects} userName={session?.user?.name ?? 'Story creator'} userEmail={session?.user?.email ?? ''} />
}

async function loadProjects(userId: string) {
  const rows = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, userId))
    .orderBy(desc(projects.updatedAt))

  return Promise.all(rows.map(async (project) => {
    const [sceneStats] = await db.select({ count: sql<number>`count(*)`, duration: sql<string>`coalesce(sum(${scenes.durationSeconds}), 0)` }).from(scenes).where(eq(scenes.projectId, project.id))
    return {
      id: project.id,
      title: project.title,
      type: project.format,
      duration: formatDuration(Number(sceneStats?.duration ?? 0)),
      scenes: Number(sceneStats?.count ?? 0),
      updated: formatUpdatedAt(project.updatedAt),
      status: project.status === 'READY' ? 'Ready' as const : project.status === 'RENDERING' ? 'Rendering' as const : 'Draft' as const,
      image: getProjectImage(project.metadata),
    }
  }))
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

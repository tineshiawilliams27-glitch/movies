import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { StudioDashboard } from '@/components/studio-dashboard'

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/login')
  const response = await fetch(`${process.env.BETTER_AUTH_URL ?? ''}/api/projects`, { headers: await headers(), cache: 'no-store' })
  const data = response.ok ? await response.json() : { projects: [] }
  return <StudioDashboard persistedProjects={data.projects ?? []} />
}

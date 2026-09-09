import { ProjectWorkspace } from '@/components/project-workspace'
import { requireUser } from '@/lib/auth-guard'

export default async function ScenesPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser()
  const { id } = await params
  return <ProjectWorkspace projectId={id} />
}

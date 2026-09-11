import { ProjectWorkspace } from '@/components/project-workspace'
import { requireProject } from '@/lib/auth-guard'

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requireProject(id)
  return <ProjectWorkspace projectId={id} />
}

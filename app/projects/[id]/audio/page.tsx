import { WorkspacePlaceholder } from '@/components/workspace-placeholder'
import { requireUser } from '@/lib/auth-guard'

export default async function AudioPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser()
  const { id } = await params
  return <WorkspacePlaceholder projectId={id} focus="Sound design" title="Audio studio" description="Assign voices, generate dialogue, layer music and effects, and keep the mix organized by scene." />
}

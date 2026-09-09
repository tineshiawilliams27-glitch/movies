import { WorkspacePlaceholder } from '@/components/workspace-placeholder'
import { requireUser } from '@/lib/auth-guard'

export default async function ScriptPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser()
  const { id } = await params
  return <WorkspacePlaceholder projectId={id} focus="Story development" title="Script room" description="Shape the concept, logline, synopsis, dialogue, and story beats before moving into scene production." />
}

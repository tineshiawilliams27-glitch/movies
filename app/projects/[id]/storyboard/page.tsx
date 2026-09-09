import { StoryboardEditor } from '@/components/storyboard-editor'
import { requireUser } from '@/lib/auth-guard'

export default async function StoryboardPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser()
  const { id } = await params
  return <StoryboardEditor projectId={id} />
}

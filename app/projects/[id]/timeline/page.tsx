import { TimelineEditor } from '@/components/timeline-editor'
import { requireUser } from '@/lib/auth-guard'

export default async function TimelinePage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser()
  const { id } = await params
  return <TimelineEditor projectId={id} />
}

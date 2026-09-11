import { TimelineEditor } from '@/components/timeline-editor'

export default async function TimelinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <TimelineEditor projectId={id} />
}

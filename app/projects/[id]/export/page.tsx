import { WorkspacePlaceholder } from '@/components/workspace-placeholder'
import { requireUser } from '@/lib/auth-guard'

export default async function ExportPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser()
  const { id } = await params
  return <WorkspacePlaceholder projectId={id} focus="Final delivery" title="Export suite" description="Choose MP4 or WebM, resolution, frame rate, aspect ratio, and start an authenticated render job." />
}

import { MediaLibrary } from '@/components/media-library'
import { requireUser } from '@/lib/auth-guard'

export default async function MediaPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser()
  const { id } = await params
  return <MediaLibrary projectId={id} />
}

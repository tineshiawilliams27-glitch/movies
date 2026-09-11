import { MediaLibrary } from '@/components/media-library'

export default async function MediaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <MediaLibrary projectId={id} />
}

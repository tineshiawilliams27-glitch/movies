import { AudioStudio } from '@/components/audio-studio'

export default async function AudioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <AudioStudio projectId={id} />
}

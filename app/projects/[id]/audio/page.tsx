import { AudioStudio } from '@/components/audio-studio'
import { requireUser } from '@/lib/auth-guard'

export default async function AudioPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser()
  const { id } = await params
  return <AudioStudio projectId={id} />
}

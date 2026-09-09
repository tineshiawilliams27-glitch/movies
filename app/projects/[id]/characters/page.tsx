import { CharacterManager } from '@/components/character-manager'
import { requireUser } from '@/lib/auth-guard'

export default async function CharactersPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser()
  const { id } = await params
  return <CharacterManager projectId={id} />
}

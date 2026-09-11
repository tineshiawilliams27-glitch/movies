import { CharacterManager } from '@/components/character-manager'

export default async function CharactersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <CharacterManager projectId={id} />
}

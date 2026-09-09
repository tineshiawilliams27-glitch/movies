import { WorkspacePlaceholder } from '@/components/workspace-placeholder'
import { requireUser } from '@/lib/auth-guard'

export default async function CharactersPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser()
  const { id } = await params
  return <WorkspacePlaceholder projectId={id} focus="Character continuity" title="Character manager" description="Define appearance, wardrobe, backstory, voice, and reference metadata so every generated scene stays consistent." />
}

import { ScriptEditor } from '@/components/script-editor'
import { requireUser } from '@/lib/auth-guard'

export default async function ScriptPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser()
  const { id } = await params
  return <ScriptEditor projectId={id} />
}

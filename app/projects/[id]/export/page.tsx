import { ExportSuite } from '@/components/export-suite'
import { requireUser } from '@/lib/auth-guard'

export default async function ExportPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser()
  const { id } = await params
  return <ExportSuite projectId={id} />
}

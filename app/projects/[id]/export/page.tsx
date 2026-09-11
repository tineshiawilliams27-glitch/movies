import { ExportSuite } from '@/components/export-suite'

export default async function ExportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ExportSuite projectId={id} />
}

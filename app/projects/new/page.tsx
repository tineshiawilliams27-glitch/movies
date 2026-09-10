import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { CreateProject } from '@/components/create-project'
import { auth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function NewProjectPage() {
  const session = await auth.api.getSession({ headers: await headers() }).catch((error) => {
    console.error('[v0] New project session lookup failed:', error)
    return null
  })
  if (!session?.user) redirect('/login?redirect=%2Fprojects%2Fnew')

  return <CreateProject />
}

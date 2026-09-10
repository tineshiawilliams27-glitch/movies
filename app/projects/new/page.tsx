import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { CreateProject } from '@/components/create-project'
import { auth } from '@/lib/auth'

export default async function NewProjectPage() {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) redirect('/login?redirect=%2Fprojects%2Fnew')
  } catch (error) {
    console.error('[v0] New project session lookup failed:', error)
    redirect('/login?redirect=%2Fprojects%2Fnew')
  }

  return <CreateProject />
}

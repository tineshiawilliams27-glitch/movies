import { PublicHomepage } from '@/components/public-homepage'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() })
  return <PublicHomepage isAuthenticated={Boolean(session?.user)} />
}

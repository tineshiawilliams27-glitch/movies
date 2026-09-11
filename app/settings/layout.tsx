import { requireUser } from '@/lib/auth-guard'

export default async function SettingsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireUser()
  return children
}

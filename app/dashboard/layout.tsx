import { requireUser } from '@/lib/auth-guard'

export default async function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireUser()
  return children
}

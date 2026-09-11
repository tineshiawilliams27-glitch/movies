import { Suspense } from 'react'
import { ResetPasswordForm } from '@/components/reset-password-form'

export default function ResetPasswordPage() {
  return <Suspense fallback={<main className="min-h-screen bg-background" />}><ResetPasswordForm /></Suspense>
}

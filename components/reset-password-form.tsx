'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { FormEvent, useState } from 'react'
import { resetPassword } from '@/lib/auth-client'

export function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [pending, setPending] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [error, setError] = useState('')
  const passwordIsValid = password.length >= 8 && /[A-Z]/.test(password) && /\d/.test(password)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (!token) {
      setError('This reset link is missing or has expired. Request a new one from the sign-in page.')
      return
    }
    if (!passwordIsValid) {
      setError('Use 8+ characters with an uppercase letter and a number.')
      return
    }
    if (password !== confirmation) {
      setError('Passwords do not match.')
      return
    }
    if (pending) return
    setPending(true)
    try {
      const result = await resetPassword({ newPassword: password, token })
      if (result.error) throw new Error('reset failed')
      setCompleted(true)
    } catch {
      setError('This reset link is invalid or expired. Request a new one from the sign-in page.')
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-2xl">
        <Link href="/" className="font-mono text-xs uppercase tracking-[0.22em] text-primary">Lumen Forge</Link>
        <h1 className="mt-8 text-3xl font-semibold tracking-tight">Set a new password</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Choose a strong password to get back into your studio.</p>
        {completed ? (
          <div className="mt-8 space-y-4">
            <p role="status" className="rounded-xl border border-primary/30 bg-primary/10 p-4 text-sm leading-6">Your password has been updated. You can now sign in with the new password.</p>
            <Link href="/login" className="block rounded-xl bg-primary px-4 py-3 text-center font-medium text-primary-foreground transition hover:opacity-90">Return to sign in</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
            <label htmlFor="new-password" className="text-sm font-medium">New password<input id="new-password" type="password" autoComplete="new-password" value={password} onChange={(event) => { setPassword(event.target.value); setError('') }} className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-primary" /></label>
            <p className="text-xs leading-5 text-muted-foreground">Use 8+ characters with an uppercase letter and a number.</p>
            <label htmlFor="confirm-password" className="text-sm font-medium">Confirm new password<input id="confirm-password" type="password" autoComplete="new-password" value={confirmation} onChange={(event) => { setConfirmation(event.target.value); setError('') }} className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-primary" /></label>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <button disabled={pending} className="rounded-xl bg-primary px-4 py-3 font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">{pending ? 'Updating password…' : 'Update password'}</button>
            <Link href="/login" className="text-center text-sm text-muted-foreground hover:text-foreground">Back to sign in</Link>
          </form>
        )}
      </div>
    </main>
  )
}

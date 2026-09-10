'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signIn, signUp } from '@/lib/auth-client'

export function AuthForm({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const isSignUp = mode === 'sign-up'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setPending(true)
    try {
      const normalizedEmail = email.trim().toLowerCase()
      const redirectTarget = new URLSearchParams(window.location.search).get('redirect') || '/dashboard'
      const safeRedirect = redirectTarget.startsWith('/') && !redirectTarget.startsWith('//') ? redirectTarget : '/dashboard'
      if (!normalizedEmail || !password) {
        setError('Enter your email and password to continue.')
        return
      }
      const result = isSignUp
        ? await signUp.email({ name: name.trim(), email: normalizedEmail, password, callbackURL: safeRedirect })
        : await signIn.email({ email: normalizedEmail, password, callbackURL: safeRedirect })
      if (result.error) {
        setError('That email or password is incorrect. If you are new here, create an account first.')
        return
      }
      router.replace(safeRedirect)
      router.refresh()
    } catch (error) {
      setError('The authentication service is unavailable right now. Please try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-2xl">
        <Link href="/" className="font-mono text-xs uppercase tracking-[0.22em] text-primary">Lumen Forge</Link>
        <h1 className="mt-8 text-3xl font-semibold tracking-tight">{isSignUp ? 'Create your studio account' : 'Welcome back to the studio'}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Unlimited projects, scenes, and editorial control.</p>
        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          {isSignUp && <input aria-label="Name" autoComplete="name" value={name} onChange={(e) => { setName(e.target.value); setError('') }} placeholder="Name" required className="rounded-xl border border-border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-primary" />}
          <input aria-label="Email" type="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setError('') }} placeholder="Email" required className="rounded-xl border border-border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-primary" />
          <input aria-label="Password" type="password" autoComplete={isSignUp ? 'new-password' : 'current-password'} value={password} onChange={(e) => { setPassword(e.target.value); setError('') }} placeholder="Password" minLength={8} required className="rounded-xl border border-border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-primary" />
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <button disabled={pending} className="rounded-xl bg-primary px-4 py-3 font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60">{pending ? 'Working…' : isSignUp ? 'Create account' : 'Sign in'}</button>
        </form>
        <p className="mt-6 text-sm text-muted-foreground">{isSignUp ? 'Already have an account?' : 'Need an account?'}{' '}<Link className="text-primary hover:underline" href={isSignUp ? '/login' : '/signup'}>{isSignUp ? 'Sign in' : 'Sign up'}</Link></p>
      </div>
    </main>
  )
}

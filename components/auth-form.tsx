'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authClient, signIn, signUp } from '@/lib/auth-client'

export function AuthForm({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [showRecovery, setShowRecovery] = useState(false)
  const [recoverySent, setRecoverySent] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const isSignUp = mode === 'sign-up'
  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const passwordChecks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
  }
  const passwordIsStrong = Object.values(passwordChecks).every(Boolean)

  async function handleRecovery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (!email.trim() || !emailIsValid) {
      setError('Enter a valid email address to reset your password.')
      return
    }
    setPending(true)
    try {
      const result = await authClient.requestPasswordReset({ email: email.trim().toLowerCase(), redirectTo: `${window.location.origin}/reset-password` })
      if (result.error) throw new Error('recovery failed')
      setRecoverySent(true)
    } catch {
      setError('We could not send a reset email right now. Please try again.')
    } finally {
      setPending(false)
    }
  }

  async function handleSocialSignIn(provider: 'google' | 'github') {
    if (pending) return
    setError('')
    setPending(true)
    try {
      const redirectTarget = new URLSearchParams(window.location.search).get('redirect') || '/dashboard'
      const safeRedirect = redirectTarget.startsWith('/') && !redirectTarget.startsWith('//') ? redirectTarget : '/dashboard'
      const result = await signIn.social({ provider, callbackURL: safeRedirect })
      if (result.error) setError('We could not start social sign-in. Please try again.')
    } catch {
      setError('The authentication service is unavailable right now. Please try again.')
    } finally {
      setPending(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (isSignUp && !name.trim()) {
      setError('Enter your name to create an account.')
      return
    }
    if (!email.trim() || !emailIsValid) {
      setError('Enter a valid email address.')
      return
    }
    if (!passwordIsStrong) {
      setError('Password must be 8+ characters and include an uppercase letter and a number.')
      return
    }
    if (isSignUp && !termsAccepted) {
      setError('Accept the Terms and Privacy Policy to create an account.')
      return
    }
    if (pending) return
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
        setError(isSignUp ? 'We could not create this account. The email may already be registered, or the details may be invalid.' : 'That email or password is incorrect. If you are new here, create an account first.')
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
    <main aria-labelledby="auth-title" className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-2xl">
        <Link href="/" className="font-mono text-xs uppercase tracking-[0.22em] text-primary">Lumen Forge</Link>
        <h1 id="auth-title" className="mt-8 text-3xl font-semibold tracking-tight">{isSignUp ? 'Create your studio account' : 'Welcome back to the studio'}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Unlimited projects, scenes, and editorial control.</p>
        {showRecovery && !isSignUp ? (
          <div>
            <form onSubmit={handleRecovery} className="mt-8 flex flex-col gap-4">
              {recoverySent ? <p role="status" className="rounded-xl border border-primary/30 bg-primary/10 p-4 text-sm leading-6 text-foreground">If an account exists for this email, you&apos;ll receive a password reset link shortly.</p> : <><label htmlFor="recovery-email" className="text-sm font-medium">Email address<input id="recovery-email" aria-label="Email address" aria-invalid={Boolean(error)} aria-describedby={error ? 'auth-error recovery-help' : 'recovery-help'} type="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(''); setRecoverySent(false) }} placeholder="you@example.com" className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-primary" /><span id="recovery-help" className="sr-only">Enter the email address associated with your account.</span></label><button type="submit" disabled={pending} aria-busy={pending} className="rounded-xl bg-primary px-4 py-3 font-medium text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60">{pending ? 'Sending reset link…' : 'Send reset link'}</button></>}
              {error && <p id="auth-error" role="alert" aria-live="assertive" className="text-sm text-destructive">{error}</p>}
              <button type="button" onClick={() => { setShowRecovery(false); setError(''); setRecoverySent(false) }} className="text-sm text-muted-foreground hover:text-foreground">Back to sign in</button>
            </form>
          </div>
        ) : (
          <>
          <div className="mt-8 flex flex-col gap-3">
            <button type="button" onClick={() => handleSocialSignIn('google')} disabled={pending} className="rounded-xl border border-border bg-background px-4 py-3 font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60">Continue with Google</button>
            <button type="button" onClick={() => handleSocialSignIn('github')} disabled={pending} className="rounded-xl border border-border bg-background px-4 py-3 font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60">Continue with GitHub</button>
            <div className="flex items-center gap-3 py-2 text-xs uppercase tracking-[0.18em] text-muted-foreground"><span className="h-px flex-1 bg-border" /><span>or</span><span className="h-px flex-1 bg-border" /></div>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {isSignUp && <label htmlFor="name" className="text-sm font-medium">Name<input id="name" aria-label="Name" autoComplete="name" value={name} onChange={(e) => { setName(e.target.value); setError('') }} placeholder="Your name" maxLength={100} required className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-primary" /></label>}
            <label htmlFor="auth-email" className="text-sm font-medium">Email address<input id="auth-email" aria-label="Email address" aria-invalid={Boolean(error)} aria-describedby={error ? 'auth-error email-help' : 'email-help'} type="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setError('') }} placeholder="you@example.com" required className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-primary" /><span id="email-help" className="sr-only">Enter a valid email address.</span></label>
            <label htmlFor="password" className="text-sm font-medium">Password<input id="password" aria-label="Password" aria-invalid={Boolean(error)} aria-describedby={isSignUp ? 'password-help auth-error' : error ? 'auth-error' : undefined} type="password" autoComplete={isSignUp ? 'new-password' : 'current-password'} value={password} onChange={(e) => { setPassword(e.target.value); setError('') }} placeholder="Password" minLength={8} required className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-primary" />{isSignUp && <span id="password-help" className="mt-1 block text-xs text-muted-foreground">Use 8+ characters with an uppercase letter and a number.</span>}</label>
            {isSignUp && <label className="flex items-start gap-3 text-sm leading-6 text-muted-foreground"><input type="checkbox" checked={termsAccepted} onChange={(e) => { setTermsAccepted(e.target.checked); setError('') }} className="mt-1 size-4 accent-primary" /> <span>I agree to the <Link href="/terms" className="text-primary hover:underline">Terms</Link> and <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.</span></label>}
            {error && <p id="auth-error" role="alert" aria-live="assertive" className="text-sm text-destructive">{error}</p>}
            {!isSignUp && <button type="button" onClick={() => { setShowRecovery(true); setError('') }} className="self-end rounded-sm text-sm text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Forgot password?</button>}
            <button disabled={pending} className="rounded-xl bg-primary px-4 py-3 font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60">{pending ? 'Working…' : isSignUp ? 'Create account' : 'Sign in'}</button>
          </form>
          </>
        )}
        <p className="mt-6 text-sm text-muted-foreground">{isSignUp ? 'Already have an account?' : 'Need an account?'}{' '}<Link className="text-primary hover:underline" href={isSignUp ? '/login' : '/signup'}>{isSignUp ? 'Sign in' : 'Sign up'}</Link></p>
      </div>
    </main>
  )
}

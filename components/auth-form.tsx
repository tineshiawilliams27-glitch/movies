'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'

type AuthFormProps = { mode: 'sign-in' | 'sign-up' }

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const isSignUp = mode === 'sign-up'

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setPending(true)
    const result = isSignUp
      ? await authClient.signUp.email({ name, email, password })
      : await authClient.signIn.email({ email, password })
    setPending(false)
    if (result.error) {
      setError('We could not verify those details. Please try again.')
      return
    }
    router.push('/')
    router.refresh()
  }

  async function social(provider: 'google' | 'github') {
    setError('')
    const result = await authClient.signIn.social({ provider, callbackURL: '/' })
    if (result.error) setError('This provider is not configured yet. Use email and password or try again later.')
  }

  return <form className="auth-form" onSubmit={submit}>
    {isSignUp && <label>Full name<input required value={name} onChange={(event) => setName(event.target.value)} /></label>}
    <label>Email<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
    <label>Password<input type="password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
    {error && <p className="auth-error" role="alert">{error}</p>}
    <button className="auth-submit" type="submit" disabled={pending}>{pending ? 'Please wait…' : isSignUp ? 'Create account' : 'Sign in'}</button>
    <div className="auth-divider"><span>or continue with</span></div>
    <div className="auth-socials"><button type="button" onClick={() => social('google')}>Google</button><button type="button" onClick={() => social('github')}>GitHub</button></div>
  </form>
}

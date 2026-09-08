import Link from 'next/link'
import { AuthForm } from '@/components/auth-form'

export default function SignUpPage() {
  return <main className="auth-page"><section className="auth-panel"><Link className="brand" href="/"><span className="brand-mark">F</span><span>framewise</span></Link><p className="eyebrow">Start your collection</p><h1>Make room for more stories.</h1><p className="auth-copy">Create your free account and build a personal shelf of films worth staying for.</p><AuthForm mode="sign-up" /><p className="auth-switch">Already have an account? <Link href="/sign-in">Sign in</Link></p></section></main>
}

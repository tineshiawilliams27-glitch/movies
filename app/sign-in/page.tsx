import Link from 'next/link'
import { AuthForm } from '@/components/auth-form'

export default function SignInPage() {
  return <main className="auth-page"><section className="auth-panel"><Link className="brand" href="/"><span className="brand-mark">F</span><span>framewise</span></Link><p className="eyebrow">Welcome back</p><h1>Return to your shelf.</h1><p className="auth-copy">Sign in to keep your watchlist close and your next great film even closer.</p><AuthForm mode="sign-in" /><p className="auth-switch">New to framewise? <Link href="/sign-up">Create an account</Link></p></section></main>
}

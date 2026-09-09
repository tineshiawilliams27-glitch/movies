import Link from 'next/link'
import { AuthForm } from '@/components/auth-form'

export default function SignInPage() {
  return <main className="auth-page"><section className="auth-panel"><Link className="brand" href="/"><span className="brand-mark">C</span><span>inemaForge</span></Link><p className="eyebrow">Welcome back</p><h1>Return to your shelf.</h1><p className="auth-copy">Sign in to keep your productions close and your next great film moving.</p><AuthForm mode="sign-in" providers={{ google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET), github: Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) }} /><p className="auth-switch">New to CinemaForge? <Link href="/sign-up">Create an account</Link></p></section></main>
}

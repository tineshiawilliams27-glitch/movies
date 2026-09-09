import Link from 'next/link'
import { AuthForm } from '@/components/auth-form'

export default function SignUpPage() {
  return <main className="auth-page"><section className="auth-panel"><Link className="brand" href="/"><span className="brand-mark">C</span><span>inemaForge</span></Link><p className="eyebrow">Start your collection</p><h1>Make room for more stories.</h1><p className="auth-copy">Create your workspace and turn the first spark into a film worth watching.</p><AuthForm mode="sign-up" /><p className="auth-switch">Already have a workspace? <Link href="/sign-in">Sign in</Link></p></section></main>
}

import Link from 'next/link'

export const metadata = { title: 'Contact — Lumen Forge', description: 'Get in touch with the Lumen Forge team.' }

export default function ContactPage() {
  return <main className="min-h-screen bg-background px-6 py-12 text-foreground"><article className="mx-auto max-w-3xl"><Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← Back to Lumen Forge</Link><div className="mt-16 rounded-3xl border border-border bg-card p-8 sm:p-12"><p className="text-sm uppercase tracking-[0.18em] text-accent">Support</p><h1 className="mt-3 text-4xl font-semibold tracking-tight">Let&apos;s talk.</h1><p className="mt-5 max-w-xl leading-7 text-muted-foreground">Questions about your account, projects, generated media, or the studio? We&apos;re here to help.</p><a href="mailto:support@lumenforge.example" className="mt-8 inline-flex rounded-xl bg-accent px-5 py-3 font-medium text-accent-foreground transition hover:opacity-90">Email support</a></div></article></main>
}

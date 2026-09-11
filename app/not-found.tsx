import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-16 text-foreground">
      <section className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 text-center shadow-2xl">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">404</p>
        <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight">Project not found.</h1>
        <p className="mt-4 text-pretty leading-6 text-muted-foreground">The project may have been deleted, or the link may be incorrect.</p>
        <Link href="/dashboard" className="mt-8 inline-flex rounded-xl bg-primary px-4 py-3 font-medium text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Go to dashboard</Link>
      </section>
    </main>
  )
}

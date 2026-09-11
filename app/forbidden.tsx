'use client'

export default function Forbidden() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-16 text-foreground">
      <section className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 text-center shadow-2xl">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-destructive">403</p>
        <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight">You don&apos;t have permission to view this project.</h1>
        <p className="mt-4 text-pretty leading-6 text-muted-foreground">This project belongs to another account. Return to your workspace or sign in with the correct account.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a href="/dashboard" className="rounded-xl bg-primary px-4 py-3 font-medium text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Go to dashboard</a>
          <a href="/login" className="rounded-xl border border-border px-4 py-3 font-medium transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Sign in</a>
        </div>
      </section>
    </main>
  )
}

import Link from 'next/link'

export default function Home() {
  return <main className="landing-page">
    <nav className="landing-nav"><Link className="brand" href="/"><span className="brand-mark">C</span><span>inemaForge</span></Link><div className="landing-links"><Link href="#how-it-works">How it works</Link><Link href="#studio">The studio</Link><Link className="landing-signin" href="/sign-in">Sign in</Link></div></nav>
    <section className="landing-hero" id="studio"><div className="landing-hero-copy"><p className="eyebrow">A private studio for impossible stories</p><h1>Make something<br /><em>worth watching.</em></h1><p>Turn a first spark into a living film. CinemaForge brings story, storyboard, visual direction, and production into one focused creative room.</p><div className="landing-actions"><Link className="forge-primary" href="/sign-up">Start forging <span>↗</span></Link><Link className="text-button" href="/sign-in">Enter the studio <span>↗</span></Link></div></div><div className="landing-art" aria-label="Abstract cinematic frame"><div className="landing-art-label">CF / 001<br /><span>THE FIRST FRAME</span></div><div className="landing-art-title">Stories begin<br /><i>in the dark.</i></div><div className="landing-art-line" /></div></section>
    <section className="landing-proof" id="how-it-works"><p className="eyebrow">The creative control room</p><div className="proof-grid"><div><strong>01</strong><h2>Find the feeling.</h2><p>Begin with a title, a genre, or a single image. Give the story somewhere to start.</p></div><div><strong>02</strong><h2>Shape the world.</h2><p>Build scenes and visual language without losing the thread that makes the idea yours.</p></div><div><strong>03</strong><h2>Forge the film.</h2><p>Keep every production detail close as your private slate grows.</p></div></div></section>
    <footer className="landing-footer"><span>CINEMAFORGE / PRIVATE BETA</span><span>For the stories that stay with you.</span></footer>
  </main>
}

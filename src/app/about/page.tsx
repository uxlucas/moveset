import type { Metadata } from 'next'
import data from '@/generated/terms-data.json'
import type { TermData } from '@/lib/term-data'

export const metadata: Metadata = { title: 'About' }

const REFERENCES = [
  { label: 'Emil Kowalski', url: 'https://emilkowal.ski' },
  { label: 'Rauno Freiberg — Web Interface Guidelines', url: 'https://interfaces.rauno.me' },
  { label: 'Gustavo Fior — Craft', url: 'https://craft.gustavofior.com' },
]

export default function About() {
  const seen = new Set(REFERENCES.map((r) => r.url))
  const sources = (data as TermData[])
    .flatMap((t) => t.sources)
    .filter((s) => (seen.has(s.url) ? false : (seen.add(s.url), true)))

  return (
    <article>
      <h1 className="mb-4 text-[17px] font-medium">About</h1>
      <p className="leading-relaxed text-ink-muted">
        You usually know what you want from an interface before you know what it is called. moveset gives those
        things names, shows each one moving, and turns it into a prompt an agent can build from. It is opinionated on
        purpose: fewer terms, each one done properly.
      </p>
      <h2 className="mb-3 mt-10 text-[15px] font-medium">Credits</h2>
      <ul className="space-y-1.5 text-sm">
        {[...REFERENCES, ...sources].map((s) => (
          <li key={s.url}>
            <a href={s.url} className="text-ink-muted underline decoration-line-strong underline-offset-4 hover:text-ink">
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </article>
  )
}

import type { Metadata } from 'next'
import data from '@/generated/terms-data.json'
import { isVisible } from '@/lib/content'
import type { TermData } from '@/lib/term-data'

export const metadata: Metadata = { title: 'About' }

// The design engineers most of the site is learned from. Initials, not photos: the site carries no brand marks.
const PEOPLE = [
  { name: 'Rauno Freiberg', role: 'Design engineer at Vercel', url: 'https://rauno.me' },
  { name: 'Emil Kowalski', role: 'Design engineer at Linear', url: 'https://emilkowal.ski' },
  { name: 'Jakub Krehel', role: 'Founding design engineer at Interfere', url: 'https://jakub.kr' },
  { name: 'Paco Coursey', role: 'Design engineer at Linear', url: 'https://paco.me' },
]

const REFERENCES = [
  { label: 'Rauno Freiberg: Web Interface Guidelines', url: 'https://interfaces.rauno.me' },
  { label: 'Gustavo Fior: Craft', url: 'https://craft.gustavofior.com' },
]

const initials = (name: string) =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('')

export default function About() {
  const seen = new Set([...PEOPLE.map((p) => p.url), ...REFERENCES.map((r) => r.url)])
  const sources = (data as TermData[])
    .filter((t) => isVisible(t))
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
      <h2 id="learned-from" className="mb-3 mt-10 text-[15px] font-medium">
        Learned from
      </h2>
      <p className="leading-relaxed text-ink-muted">
        Most of what is here comes from four design engineers who write about their craft. Read them.
      </p>
      <ul className="mt-4 space-y-1">
        {PEOPLE.map((p) => (
          <li key={p.url} className="flex min-h-11 items-center gap-3 text-sm">
            <span aria-hidden className="flex size-6 shrink-0 items-center justify-center rounded-full bg-demo-2 text-[11px] font-medium text-ink">
              {initials(p.name)}
            </span>
            {/* One line from sm, name over role below it (a wrapped line starting with the dot read wrong). */}
            <span className="flex flex-col sm:flex-row sm:items-baseline sm:gap-x-2">
              <a href={p.url} className="link self-start text-ink">
                {p.name}
              </a>
              <span className="text-[13px] text-ink-muted sm:text-sm">
                <span aria-hidden className="max-sm:hidden">
                  ·{' '}
                </span>
                {p.role}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <h2 className="mb-3 mt-10 text-[15px] font-medium">Credits</h2>
      <ul className="space-y-1.5 text-sm">
        {[...REFERENCES, ...sources].map((s) => (
          <li key={s.url}>
            <a href={s.url} className="link text-ink-muted">
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </article>
  )
}

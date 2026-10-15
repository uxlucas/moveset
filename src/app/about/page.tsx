import type { Metadata } from 'next'
import Image from 'next/image'
import type { ReactNode } from 'react'
import { Mark } from '@/components/site/mark'
import { AUTHOR_NAME, AUTHOR_URL, REPO_URL } from '@/lib/site'

export const metadata: Metadata = { title: 'About' }

// Each site's own favicon. Rauno's and Paco's are drawn inline (a circle; a glyph in the current colour, so it follows
// the site's theme rather than the system's); Emil's and Jakub's are images, copied at 96px into public/learned-from.
const PEOPLE: { name: string; role: string; url: string; icon: ReactNode }[] = [
  {
    name: 'Rauno Freiberg',
    role: 'Design engineer at Vercel',
    url: 'https://rauno.me',
    icon: <span aria-hidden className="block size-[22px] rounded-full bg-[#ffff02]" />,
  },
  {
    name: 'Emil Kowalski',
    role: 'Design engineer at Linear',
    url: 'https://emilkowal.ski',
    icon: <Image src="/learned-from/emil.png" alt="" width={24} height={24} className="size-6" />,
  },
  {
    name: 'Jakub Krehel',
    role: 'Founding design engineer at Interfere',
    url: 'https://jakub.kr',
    icon: <Image src="/learned-from/jakub.png" alt="" width={24} height={24} className="size-6 rounded-full" />,
  },
  {
    name: 'Paco Coursey',
    role: 'Design engineer at Linear',
    url: 'https://paco.me',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden focusable="false" className="text-ink">
        <path
          d="M8.2 2.5C5 2.5 5 5.7 5 5.7v12.8m3.2-16h6.4m-6.4 0h6.4m0 0s6.4 0 6.4 6.4-6.4 6.4-6.4 6.4h-3.2m0 0S5 15.3 5 18.5m6.4-3.2v3.2s0 3.2-3.2 3.2S5 18.5 5 18.5"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
    ),
  },
]

const h2 = 'mb-3 mt-10 text-[15px] font-medium'
const p = 'leading-relaxed text-ink-muted'

export default function About() {
  return (
    <article>
      <h1 className="mb-4 text-[17px] font-medium">About</h1>
      <p className={p}>
        You usually know what you want from an interface before you know what it is called. moveset gives those
        things names, shows each one moving, and turns it into a prompt an agent can build from. It is opinionated on
        purpose: fewer terms, each one done properly.
      </p>

      <h2 className={h2}>Why I made it</h2>
      <p className={p}>
        I am a product designer and design engineer. I prototype in React, and I work with AI coding agents most
        days. I started moveset because I kept describing motion to them as “that thing where…” and getting back
        something close, but wrong. The agent guesses when the words are vague, and a guess about the motion is a
        guess about the feel.
      </p>
      <p className={`${p} mt-4`}>
        Every entry here is written to be acted on: a demo you can feel, a prompt with acceptance criteria an agent
        can be checked against, the code for each route, and the states an agent usually forgets. Nothing is
        published until it has been built, measured and reviewed.
      </p>

      <h2 id="learned-from" className={h2}>
        Where I learned this
      </h2>
      <p className={p}>Most of what is here comes from four design engineers who write about their craft. Read them.</p>
      <ul className="mt-4 space-y-1">
        {PEOPLE.map((person) => (
          <li key={person.url} className="flex min-h-11 items-center gap-3 text-sm">
            <span className="flex size-6 shrink-0 items-center justify-center">{person.icon}</span>
            {/* One line from sm, name over role below it (a wrapped line starting with the dot read wrong). */}
            <span className="flex flex-col sm:flex-row sm:items-baseline sm:gap-x-2">
              <a href={person.url} className="link self-start text-ink">
                {person.name}
              </a>
              <span className="text-[13px] text-ink-muted sm:text-sm">
                <span aria-hidden className="max-sm:hidden">
                  ·{' '}
                </span>
                {person.role}
              </span>
            </span>
          </li>
        ))}
      </ul>

      <h2 className={h2}>Made by</h2>
      <p className={p}>
        <a href={AUTHOR_URL} className="link text-ink">
          <Mark size={13} className="mr-1.5 inline-block align-[-1px]" />
          {AUTHOR_NAME}
        </a>
        . The code is{' '}
        <a href={REPO_URL} className="link text-ink">
          on GitHub
        </a>
        , under the MIT licence.
      </p>
    </article>
  )
}

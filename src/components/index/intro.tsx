import { ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import { CopyButton } from '@/components/copy-button'
import { AUTHOR_NAME, AUTHOR_URL, REPO, REPO_URL, SKILL_COMMAND } from '@/lib/site'

// The command's first word ("npx") is the one accented token in the install block.
const RUNNER = SKILL_COMMAND.split(' ')[0]

export function Intro() {
  return (
    <section aria-labelledby="intro-title" className="mb-14">
      <h1 id="intro-title" className="mb-3 text-[17px] font-medium">moveset</h1>
      <p className="leading-relaxed text-ink-muted">
        A visual dictionary of design engineering terms. Each one shows the idea moving, gives it a precise name, and
        comes with a prompt you can give your agent.
      </p>
      <p className="mt-4 leading-relaxed text-ink-muted">
        Brought to you by{' '}
        <a href={AUTHOR_URL} className="link text-ink">
          {AUTHOR_NAME}
        </a>
        . I started it because I kept describing motion to agents as “that thing where…” and getting back something
        close, but wrong. Most of what I know about this I learned from{' '}
        <Link href="/about#learned-from" className="link text-ink">
          four design engineers
        </Link>
        .
      </p>
      <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-surface px-5 py-4 shadow-card">
        <code className="font-mono text-[13px] text-ink">
          <span className="text-accent-ink">{RUNNER}</span>
          {SKILL_COMMAND.slice(RUNNER.length)}
        </code>
        <CopyButton text={SKILL_COMMAND} label="Copy install command" className="hit size-8 justify-center rounded-lg text-ink-muted hover:text-ink" />
      </div>
      <p className="mt-2 text-[13px] text-ink-muted">Adds the whole vocabulary to your agent as a skill.</p>
      <a
        href={REPO_URL}
        className="press mt-4 flex items-center justify-between rounded-2xl bg-surface px-5 py-4 text-ink shadow-card hover:shadow-card-hover"
      >
        <span className="text-sm">{REPO}</span>
        <ArrowUpRight size={16} aria-hidden className="text-ink-muted" />
      </a>
    </section>
  )
}

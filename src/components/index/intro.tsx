import { ArrowUpRight } from 'lucide-react'
import { CopyButton } from '@/components/copy-button'
import { AUTHOR_NAME, AUTHOR_URL, REPO, REPO_URL, SKILL_COMMAND } from '@/lib/site'

export function Intro() {
  return (
    <section aria-labelledby="intro-title" className="mb-14">
      <h1 id="intro-title" className="mb-3 text-[17px] font-medium">moveset</h1>
      <p className="leading-relaxed text-ink-muted">
        A visual dictionary of design engineering terms. Each entry shows the idea moving, gives it its precise name,
        and hands you a prompt you can paste into Cursor, Claude or v0 to get exactly that.
      </p>
      <p className="mt-4 leading-relaxed text-ink-muted">
        Made by{' '}
        <a href={AUTHOR_URL} className="text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink">
          {AUTHOR_NAME}
        </a>
        . Add the whole vocabulary to your agent:
      </p>
      <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-surface px-5 py-4 shadow-card">
        <code className="font-mono text-[13px] text-ink">{SKILL_COMMAND}</code>
        <CopyButton text={SKILL_COMMAND} label="Copy install command" className="size-8 justify-center rounded-lg text-ink-muted hover:text-ink" />
      </div>
      <a
        href={REPO_URL}
        className="press mt-3 flex items-center justify-between rounded-2xl bg-surface px-5 py-4 text-ink shadow-card hover:shadow-card-hover"
      >
        <span className="text-sm">{REPO}</span>
        <ArrowUpRight size={16} aria-hidden className="text-ink-muted" />
      </a>
    </section>
  )
}

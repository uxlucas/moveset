import Link from 'next/link'
import { REPO_URL } from '@/lib/site'
import { ThemeToggle } from './theme-toggle'

export function Header() {
  return (
    <header className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
      <Link href="/" className="text-[15px] font-medium tracking-[-0.01em] text-ink">
        moveset
      </Link>
      <div className="flex items-center gap-1">
        <a
          href={REPO_URL}
          className="press inline-flex min-h-11 items-center rounded-md px-3 text-sm text-ink-muted hover:text-ink sm:min-h-0 sm:py-1.5"
        >
          GitHub
        </a>
        <ThemeToggle />
      </div>
    </header>
  )
}

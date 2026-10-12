import Link from 'next/link'
import { REPO_URL } from '@/lib/site'

const LINK = 'inline-flex min-h-11 items-center transition-colors duration-150 ease-[ease] hover:text-ink pointer-fine:min-h-0'

export function Footer() {
  return (
    <footer className="mx-auto w-full max-w-[680px] px-4 pb-24 sm:px-6">
      <nav aria-label="Footer" className="mt-24 flex gap-5 border-t border-line pt-5 text-[13px] text-ink-muted">
        <Link href="/about" className={LINK}>
          About
        </Link>
        <a href={REPO_URL} className={LINK}>
          GitHub
        </a>
      </nav>
    </footer>
  )
}

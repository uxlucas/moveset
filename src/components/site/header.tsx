import Link from 'next/link'
import { ThemeToggle } from './theme-toggle'

export function Header() {
  return (
    <header className="flex items-center justify-between px-4 py-4 sm:px-6 lg:h-(--header-h) lg:px-8 lg:py-0">
      <Link href="/" className="text-[15px] font-medium tracking-[-0.01em] text-ink">
        moveset
      </Link>
      <ThemeToggle />
    </header>
  )
}

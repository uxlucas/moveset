import { Logo } from './mark'
import { ThemeToggle } from './theme-toggle'

export function Header() {
  return (
    <header className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
      <Logo />
      <ThemeToggle />
    </header>
  )
}

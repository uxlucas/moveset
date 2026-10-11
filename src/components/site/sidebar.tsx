'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import data from '@/generated/terms-data.json'
import { groupByCategory, isVisible } from '@/lib/content'
import type { TermData } from '@/lib/term-data'
import { CategoryIcon } from './category-icon'
import { SoonPill } from './soon-pill'

const groups = groupByCategory(data as TermData[])

function SideLink({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`relative block py-1 transition-colors duration-150 ease-[ease] hover:text-ink ${active ? 'text-ink' : 'text-ink-muted'}`}
    >
      {active && <span aria-hidden className="absolute -left-3 top-1/2 size-1 -translate-y-1/2 rounded-full bg-ink" />}
      {children}
    </Link>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-0 max-h-dvh overflow-y-auto px-8 pb-16 pt-10 [scrollbar-width:none]">
        <nav aria-label="Site" className="mb-8">
          <ul className="text-sm">
            <li><SideLink href="/" active={pathname === '/'}>Index</SideLink></li>
            <li><SideLink href="/about" active={pathname === '/about'}>About</SideLink></li>
          </ul>
        </nav>
        <nav aria-label="Terms">
          {groups.map(({ category, terms }) => (
            <div key={category.slug} className="mb-7">
              <h2 className="mb-1.5 flex items-center gap-2 text-sm text-ink">
                <CategoryIcon slug={category.slug} />
                {category.name}
              </h2>
              <ul className="text-sm">
                {terms.map((t) => (
                  <li key={t.slug}>
                    {isVisible(t) ? (
                      <SideLink href={`/terms/${t.slug}`} active={pathname === `/terms/${t.slug}`}>{t.name}</SideLink>
                    ) : (
                      <span className="flex items-center gap-2 py-1 text-ink-faint">
                        {t.name}
                        <SoonPill />
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
    </aside>
  )
}

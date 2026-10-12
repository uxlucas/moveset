import type { Metadata } from 'next'
import { Geist_Mono, Inter } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import type { ReactNode } from 'react'
import { Footer } from '@/components/site/footer'
import { Header } from '@/components/site/header'
import { Sidebar } from '@/components/site/sidebar'
import { SITE_URL } from '@/lib/site'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'moveset', template: '%s · moveset' },
  description: 'A visual dictionary of design engineering terms, each with a live demo and a prompt you can paste into an AI coding agent.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${mono.variable}`}>
      <body className="bg-canvas font-sans text-ink antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:shadow-card">
            Skip to content
          </a>
          <Header />
          <div className="lg:grid lg:grid-cols-[260px_minmax(0,1fr)_260px]">
            <Sidebar />
            <div className="min-w-0">
              <main id="main" className="mx-auto w-full max-w-[680px] px-4 pt-6 sm:px-6 lg:pt-10">
                {children}
              </main>
              <Footer />
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { LaunchVideo } from '@/components/launch/launch-video'

export const metadata: Metadata = { title: 'Launch', robots: { index: false, follow: false } }

// The stage the launch video is recorded from. Development only: production has no such page.
export default function Launch() {
  if (process.env.NEXT_PUBLIC_SHOW_REVIEW !== '1') notFound()
  return <LaunchVideo />
}

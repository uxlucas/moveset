import type { DemoProps } from '@/lib/term-types'

// Stands in for a draft's demo until it is built. Static on purpose.
export function PlaceholderDemo(_: DemoProps<unknown>) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="h-14 w-24 rounded-lg bg-demo" />
    </div>
  )
}

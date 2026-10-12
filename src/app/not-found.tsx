import Link from 'next/link'

export default function NotFound() {
  return (
    <div>
      <h1 className="mb-3 text-[17px] font-medium">Not here yet</h1>
      <p className="text-ink-muted">
        This page doesn&apos;t exist, or the term is still being written.{' '}
        <Link href="/" className="text-ink underline decoration-line-strong underline-offset-4">Back to the index</Link>
      </p>
    </div>
  )
}

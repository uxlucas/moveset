import Link from 'next/link'

// Lucas's mark, shared with merki-icons. Drawn in the current colour at 13 by 16, the size it is set at there.
export function Mark({ className, size = 16 }: { className?: string; size?: number }) {
  const width = (size * 512) / 640
  return (
    <svg width={width} height={size} viewBox="0 0 512 640" aria-hidden focusable="false" className={className}>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M256 30 C180 30 135 70 126 132 C120 182 117 218 104 259 C88 296 81 330 94 359 C109 400 151 434 185 475 C222 518 254 554 228 611 C265 583 288 549 291 503 C294 471 285 440 299 405 C308 379 327 365 336 389 C344 410 324 442 348 474 C350 435 385 408 408 365 C436 320 425 288 409 249 C392 209 393 166 382 115 C372 61 326 30 256 30 Z M200 114 C185 145 185 183 220 215 C237 180 228 144 200 114 Z M312 114 C327 145 327 183 292 215 C275 180 284 144 312 114 Z"
      />
    </svg>
  )
}

// GitHub's mark, for the repository card. Drawn in the current colour.
export function GitHubMark({ className, size = 16 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden focusable="false" className={className}>
      <path
        fill="currentColor"
        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
      />
    </svg>
  )
}

// The logo as merki-icons sets it: the mark, a 9px gap, the name in the mono face at 15px medium. On hover the name
// glitches in two halves and the mark jitters (`.logo` rules in globals.css); data-text feeds the two copies.
export function Logo() {
  return (
    <Link href="/" className="logo flex items-center gap-[9px] text-ink">
      <Mark className="logo-mark shrink-0" />
      <span data-text="moveset" className="logo-word relative font-mono text-[15px] font-medium leading-none tracking-[-0.01em]">
        moveset
      </span>
    </Link>
  )
}

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

// The logo as merki-icons sets it: the mark, a 9px gap, the name in the mono face at 15px medium.
export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-[9px] text-ink">
      <Mark className="shrink-0" />
      <span className="font-mono text-[15px] font-medium leading-none tracking-[-0.01em]">moveset</span>
    </Link>
  )
}

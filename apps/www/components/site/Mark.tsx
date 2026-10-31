import Link from "next/link"

/** The site's mark: a small yellow sticky with its header strip, and the name. */
export function Mark({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`flex items-center gap-2.5 text-[15px] font-medium ${className}`}>
      <span
        aria-hidden
        data-sticky-color="yellow"
        className="inline-block size-4 rounded-[4px] border border-sticky-edge bg-[linear-gradient(to_bottom,var(--sticky-header)_32%,var(--sticky-paper)_32%)]"
      />
      stickies.live
    </Link>
  )
}

export const GITHUB = "https://github.com/getmurmur/stickies"

"use client"

import Link from "next/link"
import { useState } from "react"
import { CopyPrompt } from "@/components/site/CopyPrompt"
import { GITHUB } from "@/components/site/Mark"
import { StickyBoard, useStickyBoard } from "@/registry/stickies/blocks/sticky-board/sticky-board"
import { seedNotes } from "@/lib/seed"

/** The page's header and hint, drawn over the board. */
function Overlay({ prompt }: { prompt: string }) {
  const { edited, reset } = useStickyBoard()
  return (
    <>
      <header className="pointer-events-none absolute inset-x-0 top-0 z-[10000] flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            data-sticky-color="yellow"
            className="inline-block size-4 rounded-[4px] border border-sticky-edge bg-[linear-gradient(to_bottom,var(--sticky-header)_32%,var(--sticky-paper)_32%)]"
          />
          <span className="text-[15px] font-medium">stickies.live</span>
          <span className="rounded-full border border-current/15 px-2 py-0.5 text-[11px] text-muted">Draft 0.1</span>
          <span className="ml-3 text-[13px] text-muted max-lg:hidden">An open format for moving sticky notes between apps</span>
        </div>
        <nav className="pointer-events-auto flex items-center gap-1 text-[13px] text-muted">
          {edited && (
            <button type="button" onClick={reset} className="rounded-md px-2 py-1 transition-colors hover:text-foreground">
              Reset board
            </button>
          )}
          <Link href="/docs" className="rounded-md px-2 py-1 transition-colors hover:text-foreground">
            Docs
          </Link>
          <Link href="/spec" className="rounded-md px-2 py-1 transition-colors hover:text-foreground">
            Spec
          </Link>
          <a href={GITHUB} className="rounded-md px-2 py-1 transition-colors hover:text-foreground max-sm:hidden">
            GitHub
          </a>
          <CopyPrompt prompt={prompt} className="ml-2 max-md:hidden" />
        </nav>
      </header>
      <p className="pointer-events-none absolute inset-x-0 bottom-5 z-[10000] text-center text-[12px] text-muted">
        Drag notes by the top · Drag the background to look around
        <span className="max-sm:hidden"> · Double-click or right-click to add a note · ⌘C copies the selected notes</span>
      </p>
    </>
  )
}

export function HomeBoard({ prompt }: { prompt: string }) {
  const [defaults] = useState(seedNotes)
  return (
    <StickyBoard
      className="fixed inset-0"
      defaultNotes={defaults}
      storageKey="stickies.live:board"
      source={{ app: "stickies.live", url: "https://stickies.live" }}
    >
      <Overlay prompt={prompt} />
    </StickyBoard>
  )
}

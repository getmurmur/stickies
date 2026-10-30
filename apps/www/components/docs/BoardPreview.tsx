"use client"

import { useState } from "react"
import { StickyBoard, useStickyBoard } from "@/registry/stickies/blocks/sticky-board/sticky-board"
import { createNote } from "@/registry/stickies/lib/stickies-format"

function Toolbar() {
  const { selectedNotes, copy, edited, reset } = useStickyBoard()
  const [copied, setCopied] = useState(false)
  return (
    <div className="absolute top-3 right-3 z-[10000] flex gap-1 text-[12px]">
      <button
        type="button"
        disabled={selectedNotes.length === 0}
        onClick={async () => {
          await copy(selectedNotes)
          setCopied(true)
          setTimeout(() => setCopied(false), 1200)
        }}
        className="rounded-md border border-border bg-white px-2 py-1 text-foreground disabled:text-muted"
      >
        {copied ? "Copied" : selectedNotes.length ? `Copy ${selectedNotes.length} selected` : "Copy selected"}
      </button>
      {edited && (
        <button type="button" onClick={reset} className="rounded-md border border-border bg-white px-2 py-1 text-foreground">
          Reset
        </button>
      )}
    </div>
  )
}

/** A small board, saved under its own key so it doesn't touch the home page's. */
export function BoardPreview() {
  const [defaults] = useState(() => [
    createNote({ id: "docs-a", text: "Drag me by the top", x: 0, y: 0, colorName: "yellow" }),
    createNote({ id: "docs-b", text: "Select me and press ⌘C, then paste into a doc", x: 280, y: 30, colorName: "blue", state: "progress" }),
    createNote({ id: "docs-c", text: "Paste notes back here with ⌘V", x: 140, y: 220, colorName: "green", state: "done" }),
  ])
  return (
    <div className="h-[480px] overflow-hidden rounded-2xl border border-border bg-white">
      <StickyBoard defaultNotes={defaults} storageKey="stickies.live:docs-board" semantic source={{ app: "stickies.live docs" }}>
        <Toolbar />
      </StickyBoard>
    </div>
  )
}

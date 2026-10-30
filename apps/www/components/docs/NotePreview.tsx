"use client"

import { useState } from "react"
import { createNote, type StickyNoteData } from "@/registry/stickies/lib/stickies-format"
import {
  StickyNote,
  StickyNoteAuthor,
  StickyNoteClose,
  StickyNoteColors,
  StickyNoteDate,
  StickyNoteFooter,
  StickyNoteHeader,
  StickyNoteState,
  StickyNoteText,
} from "@/registry/stickies/ui/sticky-note"

function Note({ initial, semantic = false, showDate = false }: { initial: StickyNoteData; semantic?: boolean; showDate?: boolean }) {
  const [note, setNote] = useState(initial)
  const [gone, setGone] = useState(false)
  if (gone) {
    return (
      <button type="button" onClick={() => setGone(false)} className="grid h-44 w-64 place-items-center rounded-xl border border-dashed border-border text-[13px] text-muted">
        Bring it back
      </button>
    )
  }
  return (
    <StickyNote note={note} onNoteChange={setNote} onDelete={() => setGone(true)} positioned={false} semantic={semantic} className="h-44 w-64">
      <StickyNoteHeader>
        <StickyNoteColors />
        <span className="flex-1" />
        <StickyNoteState />
        <StickyNoteClose />
      </StickyNoteHeader>
      <StickyNoteText />
      <StickyNoteFooter>
        <StickyNoteAuthor />
        {showDate && <StickyNoteDate />}
      </StickyNoteFooter>
    </StickyNote>
  )
}

/** Two notes outside a board: one with its own colours, one semantic, where colour follows state. */
export function NotePreview() {
  const [plain] = useState(() => createNote({ id: "preview-plain", text: "Hover me for colours.\n\n- type a dash and a space", author: "You" }))
  const [semantic] = useState(() => createNote({ id: "preview-semantic", text: "Semantic: pick a state, and the colour follows.", state: "progress" }))
  return (
    <div className="flex flex-wrap gap-8 rounded-2xl border border-border bg-white px-8 py-10">
      <div className="space-y-2">
        <Note initial={plain} />
        <p className="text-[12px] text-muted">Default parts</p>
      </div>
      <div className="space-y-2">
        <Note initial={semantic} semantic showDate />
        <p className="text-[12px] text-muted">
          <code>semantic</code>, with <code>StickyNoteDate</code>
        </p>
      </div>
    </div>
  )
}

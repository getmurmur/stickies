"use client"

import IconCircleCheck from "@central-icons-react/round-outlined-radius-2-stroke-1.5/IconCircleCheck"
import IconCrossSmall from "@central-icons-react/round-outlined-radius-2-stroke-1.5/IconCrossSmall"
import IconProgress50 from "@central-icons-react/round-outlined-radius-2-stroke-1.5/IconProgress50"
import { useEffect, useRef, useState } from "react"
import { COLOR_NAMES, COLORS, cn, MIN_H, MIN_W, type Note, STATE_NAMES, stickyDate } from "@/lib/notes"

interface StickyNoteProps {
  note: Note
  onChange: (next: Note) => void
  onDelete: () => void
  onRaise: () => void
  /** Its place in the stack of notes: higher is on top. */
  layer: number
  autoFocus: boolean
}

/**
 * A sticky note, after Murmur's (apps/desktop/src/components/StickyNote.tsx): the
 * header is the handle and holds the colours and close, the paper is for writing,
 * and the corner resizes.
 */
export function StickyNote({ note, onChange, onDelete, onRaise, layer, autoFocus }: StickyNoteProps) {
  const [confirming, setConfirming] = useState(false)
  /** Held for a move or resize: the note lifts off the canvas while it's carried. */
  const [lifted, setLifted] = useState(false)
  const gesture = useRef<{ kind: "move" | "resize"; x: number; y: number; start: Note } | null>(null)
  const text = useRef<HTMLTextAreaElement>(null)
  const state = note.state ?? "open"

  useEffect(() => {
    if (autoFocus) text.current?.focus()
  }, [autoFocus])

  function begin(kind: "move" | "resize", e: React.PointerEvent) {
    if (e.button !== 0) return
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    gesture.current = { kind, x: e.clientX, y: e.clientY, start: note }
    setLifted(true)
    onRaise()
  }

  function move(e: React.PointerEvent) {
    const g = gesture.current
    if (!g) return
    const dx = e.clientX - g.x
    const dy = e.clientY - g.y
    onChange(
      g.kind === "move"
        ? { ...g.start, x: g.start.x + dx, y: g.start.y + dy }
        : { ...g.start, width: Math.max(MIN_W, g.start.width + dx), height: Math.max(MIN_H, g.start.height + dy) },
    )
  }

  function end() {
    if (!gesture.current) return
    gesture.current = null
    setLifted(false)
  }

  return (
    <div
      data-sticky-color={note.colorName}
      data-lifted={lifted || undefined}
      onPointerDown={(e) => {
        e.stopPropagation()
        onRaise()
      }}
      onDoubleClick={(e) => e.stopPropagation()}
      className="group/sticky sticky-shadow absolute flex flex-col overflow-hidden rounded-xl border border-sticky-edge bg-sticky-paper text-sticky-ink"
      style={{ left: note.x, top: note.y, width: note.width, height: note.height, zIndex: layer }}
    >
      <div
        onPointerDown={(e) => begin("move", e)}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onLostPointerCapture={end}
        className="flex h-7 shrink-0 cursor-grab touch-none items-center gap-1.5 bg-sticky-header pr-1.5 pl-3 active:cursor-grabbing"
      >
        <div
          role="radiogroup"
          aria-label="Colour"
          className="flex items-center gap-1.5 opacity-0 transition-opacity duration-[var(--duration-hover)] group-focus-within/sticky:opacity-100 group-hover/sticky:opacity-100"
        >
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={note.colorName === c}
              aria-label={COLOR_NAMES[c]}
              title={COLOR_NAMES[c]}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => onChange({ ...note, colorName: c, updatedAt: Date.now() })}
              data-sticky-color={c}
              className={cn(
                "size-3 rounded-full border border-sticky-edge bg-sticky-paper",
                note.colorName === c && "ring-1 ring-sticky-meta ring-offset-1 ring-offset-sticky-header",
              )}
            />
          ))}
        </div>
        <span className="flex-1" />
        {/* Not by colour alone: in progress and done carry a mark. */}
        {state !== "open" && (
          <span title={STATE_NAMES[state]} aria-label={STATE_NAMES[state]} className="grid size-5 place-items-center text-sticky-meta [&_svg]:size-3.5">
            {state === "done" ? <IconCircleCheck /> : <IconProgress50 />}
          </span>
        )}
        <button
          type="button"
          aria-label="Close note"
          title="Delete note"
          onPointerDown={(e) => e.stopPropagation()}
          // An empty note just goes. One with words asks first.
          onClick={() => (note.text.trim() ? setConfirming(true) : onDelete())}
          className="grid size-5 place-items-center rounded-sm text-sticky-meta transition-colors duration-[var(--duration-hover)] hover:text-sticky-ink [&_svg]:size-4"
        >
          <IconCrossSmall />
        </button>
      </div>

      <textarea
        ref={text}
        value={note.text}
        placeholder="Write a note"
        aria-label="Note"
        spellCheck={false}
        onChange={(e) => onChange({ ...note, text: e.target.value, updatedAt: Date.now() })}
        className="min-h-0 flex-1 resize-none bg-transparent select-text px-4 pt-3 text-body leading-6 text-sticky-ink outline-none placeholder:text-sticky-meta"
      />

      <div className="flex h-8 shrink-0 items-center justify-end gap-3 px-4 text-[12px] text-sticky-meta">
        {confirming ? (
          <>
            <span className="mr-auto text-sticky-ink">Delete this note?</span>
            <button type="button" onClick={() => setConfirming(false)} className="hover:text-sticky-ink">
              Keep
            </button>
            <button type="button" onClick={onDelete} className="text-sticky-ink underline underline-offset-2">
              Delete
            </button>
          </>
        ) : (
          <>
            {note.author && <span className="mr-auto min-w-0 truncate text-sticky-ink/70">{note.author}</span>}
            <span className="shrink-0 tabular-nums">{stickyDate(note.updatedAt)}</span>
          </>
        )}
      </div>

      {/* The corner grip: drag to resize. */}
      <div
        aria-hidden
        onPointerDown={(e) => begin("resize", e)}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onLostPointerCapture={end}
        className="absolute right-0 bottom-0 size-4 cursor-nwse-resize touch-none"
      />
    </div>
  )
}

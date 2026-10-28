"use client"

import { useEffect, useRef, useState } from "react"
import { StickyNote } from "@/components/StickyNote"
import { cn, forgetNotes, loadNotes, NOTE_H, NOTE_W, type Note, saveNotes, seedNotes } from "@/lib/notes"

type Point = { x: number; y: number }

/** The pan that puts these notes in the middle of the window. */
function centred(notes: Note[]): Point {
  if (notes.length === 0) return { x: 0, y: 0 }
  const left = Math.min(...notes.map((n) => n.x))
  const top = Math.min(...notes.map((n) => n.y))
  const right = Math.max(...notes.map((n) => n.x + n.width))
  const bottom = Math.max(...notes.map((n) => n.y + n.height))
  // Wider than the window (a phone), it starts from the left, where the first note is.
  const width = right - left
  return {
    x: width > window.innerWidth - 40 ? 20 - left : Math.round((window.innerWidth - width) / 2 - left),
    // A little above centre, for the header and the hint.
    y: Math.max(72, Math.round((window.innerHeight - (bottom - top)) / 2 - top - 12)),
  }
}

/**
 * The whole window as a canvas of notes: drag a note by its header, drag the
 * background to pan, double-click to add one. The board is kept in this browser.
 */
export function Canvas() {
  /** Null until the page is in the browser, where the saved board and the clock are. */
  const [notes, setNotes] = useState<Note[] | null>(null)
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 })
  const [edited, setEdited] = useState(false)
  const [fresh, setFresh] = useState<string | null>(null)
  const panning = useRef<{ x: number; y: number; start: Point } | null>(null)
  const [grabbing, setGrabbing] = useState(false)

  useEffect(() => {
    const saved = loadNotes()
    const board = saved ?? seedNotes()
    setNotes(board)
    setEdited(saved !== null)
    setPan(centred(board))
  }, [])

  useEffect(() => {
    if (notes && edited) saveNotes(notes)
  }, [notes, edited])

  function update(next: Note) {
    setNotes((all) => all?.map((n) => (n.id === next.id ? next : n)) ?? all)
    setEdited(true)
  }

  /** Moved to the end of the list, which is the top of the stack. */
  function raise(id: string) {
    setNotes((all) => {
      if (!all || all[all.length - 1]?.id === id) return all
      const note = all.find((n) => n.id === id)
      return note ? [...all.filter((n) => n.id !== id), note] : all
    })
  }

  function remove(id: string) {
    setNotes((all) => all?.filter((n) => n.id !== id) ?? all)
    setEdited(true)
  }

  function add(e: React.MouseEvent) {
    const id = crypto.randomUUID()
    const note: Note = {
      id,
      text: "",
      x: Math.round(e.clientX - pan.x - NOTE_W / 2),
      y: Math.round(e.clientY - pan.y - 14),
      width: NOTE_W,
      height: NOTE_H,
      colorName: "yellow",
      updatedAt: Date.now(),
    }
    setNotes((all) => [...(all ?? []), note])
    setFresh(id)
    setEdited(true)
  }

  function reset() {
    forgetNotes()
    const board = seedNotes()
    setNotes(board)
    setEdited(false)
    setFresh(null)
    setPan(centred(board))
  }

  return (
    <main
      className={cn("canvas-dots fixed inset-0 touch-none select-none", grabbing ? "cursor-grabbing" : "cursor-grab")}
      style={{ backgroundPosition: `${pan.x}px ${pan.y}px` }}
      onPointerDown={(e) => {
        if (e.button !== 0) return
        // Clicking the background ends any typing, as clicking a desk would.
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
        e.currentTarget.setPointerCapture(e.pointerId)
        panning.current = { x: e.clientX, y: e.clientY, start: pan }
        setGrabbing(true)
      }}
      onPointerMove={(e) => {
        const p = panning.current
        if (p) setPan({ x: p.start.x + e.clientX - p.x, y: p.start.y + e.clientY - p.y })
      }}
      onPointerUp={() => {
        panning.current = null
        setGrabbing(false)
      }}
      onPointerCancel={() => {
        panning.current = null
        setGrabbing(false)
      }}
      onDoubleClick={add}
    >
      <div className="absolute top-0 left-0" style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}>
        {notes?.map((note, i) => (
          <StickyNote
            key={note.id}
            note={note}
            layer={i + 1}
            autoFocus={note.id === fresh}
            onChange={update}
            onRaise={() => raise(note.id)}
            onDelete={() => remove(note.id)}
          />
        ))}
      </div>

      <header
        className="pointer-events-none fixed inset-x-0 top-0 flex items-center justify-between px-5 py-4"
        onPointerDown={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            data-sticky-color="yellow"
            className="inline-block size-4 rounded-[4px] border border-sticky-edge bg-[linear-gradient(to_bottom,var(--sticky-header)_32%,var(--sticky-paper)_32%)]"
          />
          <span className="text-[15px] font-medium tracking-tight">stickies.live</span>
          <span className="rounded-full border border-current/15 px-2 py-0.5 text-[11px] text-muted">Draft 0.1</span>
        </div>
        {edited && (
          <button
            type="button"
            onClick={reset}
            className="pointer-events-auto rounded-md px-2 py-1 text-[13px] text-muted transition-colors duration-[var(--duration-hover)] hover:text-foreground"
          >
            Reset board
          </button>
        )}
      </header>

      <p className="pointer-events-none fixed inset-x-0 bottom-5 text-center text-[12px] text-muted">
        Drag notes by the top · Drag the background to look around<span className="max-sm:hidden"> · Double-click to add a note</span>
      </p>
    </main>
  )
}

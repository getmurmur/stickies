"use client"

import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from "react"
import { useCanvasPan } from "@/registry/stickies/hooks/use-canvas-pan"
import { useStickiesClipboard } from "@/registry/stickies/hooks/use-stickies-clipboard"
import { type StickyNotesApi, useStickyNotes } from "@/registry/stickies/hooks/use-sticky-notes"
import { placeNotes, type StickiesSource, STICKY_DEFAULT_SIZE, type StickyNoteData } from "@/registry/stickies/lib/stickies-format"
import {
  StickyNote,
  StickyNoteAuthor,
  StickyNoteClose,
  StickyNoteColors,
  StickyNoteDate,
  StickyNoteFooter,
  StickyNoteHeader,
  StickyNoteResize,
  StickyNoteState,
  StickyNoteText,
} from "@/registry/stickies/ui/sticky-note"
import { cn } from "@/lib/utils"

type StickyBoardContextValue = StickyNotesApi & {
  pan: { x: number; y: number }
  setPan: (pan: { x: number; y: number }) => void
  /** Copies notes from a button or menu (HTML and plain text, carrying the document). */
  copy: (notes: StickyNoteData[]) => Promise<void>
}

const StickyBoardContext = createContext<StickyBoardContextValue | null>(null)

/** The board's notes and actions, for anything rendered inside `<StickyBoard>`, like a toolbar. */
export function useStickyBoard() {
  const context = useContext(StickyBoardContext)
  if (!context) throw new Error("useStickyBoard must be used inside <StickyBoard>.")
  return context
}

export interface StickyBoardProps extends Omit<React.ComponentProps<"div">, "children"> {
  /** The notes to start with, and to go back to on reset. */
  defaultNotes?: StickyNoteData[]
  /** Controlled notes, with `onNotesChange`. Nothing is saved to the browser. */
  notes?: StickyNoteData[]
  onNotesChange?: (notes: StickyNoteData[]) => void
  /** Keep the board in `localStorage`. On by default. */
  persist?: boolean
  storageKey?: string
  /** Colour comes from each note's state. */
  semantic?: boolean
  /** Show when each note last changed. */
  showDate?: boolean
  /** Recorded in copied notes, so other apps know where they came from. */
  source?: StickiesSource
  /** Your own composition of a note's parts, inside `<StickyNote>`. */
  renderNote?: (note: StickyNoteData, options: { autoFocus: boolean }) => ReactNode
  /** Drawn over the board, such as a toolbar. Use `useStickyBoard()` inside. */
  children?: ReactNode
}

function DefaultNote({ autoFocus, showDate }: { autoFocus: boolean; showDate: boolean }) {
  return (
    <>
      <StickyNoteHeader>
        <StickyNoteColors />
        <span className="flex-1" />
        <StickyNoteState />
        <StickyNoteClose />
      </StickyNoteHeader>
      <StickyNoteText autoFocus={autoFocus} />
      <StickyNoteFooter>
        <StickyNoteAuthor />
        {showDate && <StickyNoteDate />}
      </StickyNoteFooter>
      <StickyNoteResize />
    </>
  )
}

const editable = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement)

/**
 * A canvas of sticky notes. Drag a note by its top, resize from its corner, drag the
 * background to look around, and double-click to add a note. Click to select, ⇧-click
 * for more; ⌘C, ⌘X and ⌘V copy, cut and paste in the Stickies format; Delete removes.
 */
export function StickyBoard({
  defaultNotes,
  notes: controlled,
  onNotesChange,
  persist = true,
  storageKey,
  semantic = false,
  showDate = false,
  source,
  renderNote,
  className,
  children,
  ...props
}: StickyBoardProps) {
  const board = useStickyNotes({ defaultNotes, notes: controlled, onNotesChange, persist, storageKey })
  const surface = useRef<HTMLDivElement>(null)
  const { pan, setPan, panning, handlers, toCanvas } = useCanvasPan()
  const pointer = useRef<{ x: number; y: number } | null>(null)
  const [fresh, setFresh] = useState<string | null>(null)
  const centred = useRef(false)
  /**
   * Notes keep the place in the page they first had: raising one only changes its z-index.
   * Moving the element itself would take focus away from it, and keyboard use with it.
   */
  const places = useRef(new Map<string, number>())
  for (const note of board.notes) if (!places.current.has(note.id)) places.current.set(note.id, places.current.size)
  const layers = new Map(board.notes.map((note, i) => [note.id, i + 1]))
  const inPlace = [...board.notes].sort((a, b) => (places.current.get(a.id) ?? 0) - (places.current.get(b.id) ?? 0))

  // Once the notes are known, put them in the middle of the board, or from its left edge
  // when they're wider than it.
  useEffect(() => {
    const el = surface.current
    if (!board.ready || centred.current || !el) return
    centred.current = true
    if (board.notes.length === 0) return
    const left = Math.min(...board.notes.map((n) => n.x))
    const top = Math.min(...board.notes.map((n) => n.y))
    const width = Math.max(...board.notes.map((n) => n.x + n.width)) - left
    const height = Math.max(...board.notes.map((n) => n.y + n.height)) - top
    const { clientWidth, clientHeight } = el
    setPan({
      x: Math.round(width > clientWidth - 40 ? 20 - left : (clientWidth - width) / 2 - left),
      y: Math.round(height > clientHeight - 40 ? 20 - top : (clientHeight - height) / 2 - top),
    })
  }, [board.ready, board.notes, setPan])

  const { copy } = useStickiesClipboard({
    getNotes: () => board.selectedNotes,
    onCut: (notes) => board.remove(notes.map((n) => n.id)),
    onPaste: ({ notes }) => {
      const el = surface.current
      const view = el ? { x: el.clientWidth / 2 - pan.x - STICKY_DEFAULT_SIZE.width / 2, y: el.clientHeight / 2 - pan.y - STICKY_DEFAULT_SIZE.height / 2 } : { x: 0, y: 0 }
      board.insert(placeNotes(notes, pointer.current ?? view))
    },
    source,
    scope: surface,
  })

  const onBackground = (target: EventTarget, current: EventTarget) =>
    target === current || (target instanceof HTMLElement && target.hasAttribute("data-pan-surface"))

  return (
    <StickyBoardContext.Provider value={{ ...board, pan, setPan, copy }}>
      <div
        ref={surface}
        data-slot="sticky-board"
        className={cn("relative h-full w-full touch-none overflow-hidden select-none", panning ? "cursor-grabbing" : "cursor-grab", className)}
        onPointerDown={(e) => {
          handlers.onPointerDown(e)
          if (!onBackground(e.target, e.currentTarget)) return
          board.clearSelection()
          if (document.activeElement instanceof HTMLElement && surface.current?.contains(document.activeElement)) document.activeElement.blur()
        }}
        onPointerMove={(e) => {
          handlers.onPointerMove(e)
          pointer.current = toCanvas(e, surface.current)
        }}
        onPointerLeave={() => {
          pointer.current = null
        }}
        onPointerUp={handlers.onPointerUp}
        onPointerCancel={handlers.onPointerCancel}
        onDoubleClick={(e) => {
          if (!onBackground(e.target, e.currentTarget)) return
          const at = toCanvas(e, surface.current)
          const note = board.add({ x: Math.round(at.x - STICKY_DEFAULT_SIZE.width / 2), y: Math.round(at.y - 14) })
          board.setSelected([note.id])
          setFresh(note.id)
        }}
        onKeyDown={(e) => {
          if (editable(e.target)) return
          if ((e.key === "Delete" || e.key === "Backspace") && board.selected.length) {
            e.preventDefault()
            board.remove(board.selected)
          } else if (e.key === "Escape") {
            board.clearSelection()
          } else if (e.key === "a" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            board.setSelected(board.notes.map((n) => n.id))
          }
        }}
        {...props}
      >
        <div className="absolute top-0 left-0" style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}>
          {board.ready &&
            inPlace.map((note) => (
              <StickyNote
                key={note.id}
                note={note}
                semantic={semantic}
                selected={board.selected.includes(note.id)}
                style={{ zIndex: layers.get(note.id) }}
                onNoteChange={(next) => board.update(note.id, next, { touch: false })}
                onDelete={() => board.remove(note.id)}
                onPointerDown={(e) => {
                  board.select(note.id, { additive: e.shiftKey })
                  board.raise(note.id)
                }}
              >
                {renderNote ? renderNote(note, { autoFocus: note.id === fresh }) : <DefaultNote autoFocus={note.id === fresh} showDate={showDate} />}
              </StickyNote>
            ))}
        </div>
        {children}
      </div>
    </StickyBoardContext.Provider>
  )
}

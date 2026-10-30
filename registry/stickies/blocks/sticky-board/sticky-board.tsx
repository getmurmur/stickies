"use client"

import { createContext, type ReactNode, useContext, useEffect, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { type Pan, useCanvasPan } from "@/registry/stickies/hooks/use-canvas-pan"
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
 * The board's right-click menu, at the pointer and kept on screen. It closes on a press
 * outside it, Escape, scrolling, or the window losing focus. Its own events stop here, so a
 * key pressed in it (Delete, say) never reaches the board behind.
 */
function BoardMenu({ x, y, onClose, children }: { x: number; y: number; onClose: () => void; children: ReactNode }) {
  const menu = useRef<HTMLDivElement>(null)
  const [place, setPlace] = useState({ x, y })

  useLayoutEffect(() => {
    const el = menu.current
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    setPlace({
      x: Math.max(4, Math.min(x, window.innerWidth - width - 4)),
      y: Math.max(4, Math.min(y, window.innerHeight - height - 4)),
    })
    el.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
  }, [x, y])

  useEffect(() => {
    const outside = (e: PointerEvent) => {
      if (!menu.current?.contains(e.target as Node)) onClose()
    }
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("pointerdown", outside, true)
    document.addEventListener("keydown", escape)
    window.addEventListener("wheel", onClose, { passive: true })
    window.addEventListener("resize", onClose)
    window.addEventListener("blur", onClose)
    return () => {
      document.removeEventListener("pointerdown", outside, true)
      document.removeEventListener("keydown", escape)
      window.removeEventListener("wheel", onClose)
      window.removeEventListener("resize", onClose)
      window.removeEventListener("blur", onClose)
    }
  }, [onClose])

  return createPortal(
    <div
      ref={menu}
      role="menu"
      data-slot="sticky-board-menu"
      className="fixed z-50 min-w-36 origin-top-left rounded-md bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-none transition-[opacity,scale] duration-150 ease-out starting:scale-95 starting:opacity-0"
      style={{ left: place.x, top: place.y }}
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === "Escape" || e.key === "Tab") {
          e.preventDefault()
          return onClose()
        }
        if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return
        e.preventDefault()
        const items = [...(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])]
        const at = items.indexOf(document.activeElement as HTMLElement)
        items[(at + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus()
      }}
    >
      {children}
    </div>,
    document.body,
  )
}

function BoardMenuItem({ onSelect, children }: { onSelect: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onSelect}
      // The highlight follows the pointer, as in a native menu.
      onPointerMove={(e) => e.currentTarget.focus()}
      className="flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none select-none focus:bg-accent focus:text-accent-foreground"
    >
      {children}
    </button>
  )
}

/**
 * A canvas of sticky notes. Drag a note by its top, resize from its corner, drag the
 * background to look around, and double-click or right-click to add a note. Click to
 * select, ⇧-click for more; ⌘C, ⌘X and ⌘V copy, cut and paste in the Stickies format;
 * Delete removes.
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
  /** The right-click menu: where it opened on screen, and that point on the board. */
  const [menu, setMenu] = useState<{ x: number; y: number; at: Pan } | null>(null)
  const closeMenu = useRef(() => setMenu(null)).current
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

  /** A new, selected note with its corner here, ready to type in. */
  function addAt(x: number, y: number) {
    const note = board.add({ x: Math.round(x), y: Math.round(y) })
    board.setSelected([note.id])
    setFresh(note.id)
  }

  return (
    <StickyBoardContext.Provider value={{ ...board, pan, setPan, copy }}>
      <div
        ref={surface}
        data-slot="sticky-board"
        className={cn("relative isolate h-full w-full touch-none overflow-hidden select-none", panning ? "cursor-grabbing" : "cursor-grab", className)}
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
          addAt(at.x - STICKY_DEFAULT_SIZE.width / 2, at.y - 14)
        }}
        onContextMenu={(e) => {
          // On a note, the browser's own menu (Copy, Paste, spelling) stays.
          if (!onBackground(e.target, e.currentTarget)) return
          e.preventDefault()
          setMenu({ x: e.clientX, y: e.clientY, at: toCanvas(e, surface.current) })
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
      {menu && (
        <BoardMenu x={menu.x} y={menu.y} onClose={closeMenu}>
          <BoardMenuItem
            onSelect={() => {
              // As in Murmur: the corner just up and left of the pointer, so it lands on the header.
              addAt(menu.at.x - 20, menu.at.y - 14)
              closeMenu()
            }}
          >
            New note here
          </BoardMenuItem>
        </BoardMenu>
      )}
    </StickyBoardContext.Provider>
  )
}

"use client"

import { CircleCheck, X } from "lucide-react"
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { usePointerDrag } from "@/registry/stickies/hooks/use-pointer-drag"
import { useListFormatting } from "@/registry/stickies/hooks/use-list-formatting"
import {
  changeNote,
  colorOf,
  shownColorOf,
  STICKY_COLOR_NAMES,
  STICKY_COLORS,
  STICKY_MIN_SIZE,
  STICKY_STATE_COLORS,
  STICKY_STATE_NAMES,
  STICKY_STATES,
  type StickyColor,
  type StickyNoteData,
  type StickyState,
  stateOf,
} from "@/registry/stickies/lib/stickies-format"
import { cn } from "@/lib/utils"

interface StickyNoteContextValue {
  note: StickyNoteData
  /** A change to the words, colour or state: `updatedAt` moves on. */
  edit: (fields: Partial<StickyNoteData>) => void
  /** A change to where it is or its size: `updatedAt` stays. */
  place: (fields: Partial<StickyNoteData>) => void
  remove?: () => void
  semantic: boolean
  positioned: boolean
  scale: number
  setLifted: (lifted: boolean) => void
  confirming: boolean
  setConfirming: (confirming: boolean) => void
  /** Whether a footer is there to ask before deleting. */
  footers: number
  setFooters: React.Dispatch<React.SetStateAction<number>>
  rootRef: React.RefObject<HTMLDivElement | null>
}

const StickyNoteContext = createContext<StickyNoteContextValue | null>(null)

export function useStickyNote() {
  const context = useContext(StickyNoteContext)
  if (!context) throw new Error("StickyNote parts must be inside <StickyNote>.")
  return context
}

export interface StickyNoteProps extends React.ComponentProps<"div"> {
  note: StickyNoteData
  /** The note after a change, to store. Geometry changes keep `updatedAt`; others set it to now. */
  onNoteChange: (next: StickyNoteData) => void
  /** Without it, `StickyNoteClose` isn't shown. */
  onDelete?: () => void
  /** Placed by its `x` and `y` on a canvas. Off, it flows like any block, sized by `className`. */
  positioned?: boolean
  /** Colour comes from state: open is yellow, in progress blue, done green. The note keeps its own colour. */
  semantic?: boolean
  /** The canvas's zoom, so dragging keeps up with the pointer. */
  scale?: number
  /** Picked on a board: shown with a ring. */
  selected?: boolean
}

/**
 * A sticky note: paper, a header to hold, words, and a corner to resize, after Murmur's.
 * Compose it from the parts below; leave any out.
 */
export function StickyNote({
  note,
  onNoteChange,
  onDelete,
  positioned = true,
  semantic = false,
  scale = 1,
  selected = false,
  className,
  style,
  children,
  ...props
}: StickyNoteProps) {
  const [lifted, setLifted] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [footers, setFooters] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const latest = useRef(note)
  latest.current = note

  const edit = useCallback((fields: Partial<StickyNoteData>) => onNoteChange(changeNote(latest.current, fields)), [onNoteChange])
  const place = useCallback((fields: Partial<StickyNoteData>) => onNoteChange({ ...latest.current, ...fields }), [onNoteChange])

  return (
    <StickyNoteContext.Provider
      value={{ note, edit, place, remove: onDelete, semantic, positioned, scale, setLifted, confirming, setConfirming, footers, setFooters, rootRef }}
    >
      <div
        ref={rootRef}
        data-slot="sticky-note"
        data-sticky-id={note.id}
        data-sticky-color={shownColorOf(note, semantic)}
        data-state={stateOf(note)}
        data-lifted={lifted || undefined}
        data-selected={selected || undefined}
        className={cn(
          "group/sticky sticky-shadow flex flex-col overflow-hidden rounded-xl border border-sticky-edge bg-sticky-paper font-sans text-sticky-ink",
          positioned ? "absolute" : "relative h-40 w-60",
          selected && "ring-2 ring-ring/70 ring-offset-2 ring-offset-background",
          className,
        )}
        style={positioned ? { left: note.x, top: note.y, width: note.width, height: note.height, ...style } : style}
        {...props}
      >
        {children}
      </div>
    </StickyNoteContext.Provider>
  )
}

/** The strip along the top. On a canvas it's the handle: drag it, or focus it and use the arrow keys. */
export function StickyNoteHeader({ className, onKeyDown, ...props }: React.ComponentProps<"div">) {
  const { note, place, positioned, scale, setLifted } = useStickyNote()
  const start = useRef(note)
  const { handlers } = usePointerDrag({
    scale,
    disabled: !positioned,
    onDragStart: () => {
      start.current = note
      setLifted(true)
    },
    onDrag: ({ dx, dy }) => place({ x: Math.round(start.current.x + dx), y: Math.round(start.current.y + dy) }),
    onDragEnd: () => setLifted(false),
  })

  return (
    <div
      data-slot="sticky-note-header"
      tabIndex={positioned ? 0 : undefined}
      aria-label={positioned ? "Move note: drag, or use the arrow keys" : undefined}
      onKeyDown={(e) => {
        onKeyDown?.(e)
        if (!positioned || e.defaultPrevented || e.target !== e.currentTarget) return
        const step = e.shiftKey ? 40 : 8
        const move = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key]
        if (!move) return
        e.preventDefault()
        place({ x: note.x + move[0], y: note.y + move[1] })
      }}
      className={cn(
        "flex h-7 shrink-0 items-center gap-1.5 bg-sticky-header pr-1.5 pl-3 outline-none focus-visible:ring-2 focus-visible:ring-sticky-meta/50 focus-visible:ring-inset",
        positioned && "cursor-grab touch-none active:cursor-grabbing",
        className,
      )}
      {...handlers}
      {...props}
    />
  )
}

function Swatch({ color, checked, label, onSelect }: { color: StickyColor; checked: boolean; label: string; onSelect: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      aria-label={label}
      title={label}
      data-sticky-color={color}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={onSelect}
      className={cn(
        "size-3 rounded-full border border-sticky-edge bg-sticky-paper outline-none focus-visible:ring-2 focus-visible:ring-sticky-meta",
        checked && "ring-1 ring-sticky-meta ring-offset-1 ring-offset-sticky-header",
      )}
    />
  )
}

/**
 * The colour picker, shown on hover or focus. With semantic notes on, it picks the state
 * instead, since colour comes from state.
 */
export function StickyNoteColors({ className, ...props }: React.ComponentProps<"div">) {
  const { note, edit, semantic } = useStickyNote()
  const state = stateOf(note)
  return (
    <div
      data-slot="sticky-note-colors"
      role="radiogroup"
      aria-label={semantic ? "State" : "Colour"}
      className={cn(
        "flex items-center gap-1.5 opacity-0 transition-opacity duration-150 group-focus-within/sticky:opacity-100 group-hover/sticky:opacity-100",
        className,
      )}
      {...props}
    >
      {semantic
        ? STICKY_STATES.map((s) => (
            <Swatch key={s} color={STICKY_STATE_COLORS[s]} checked={state === s} label={STICKY_STATE_NAMES[s]} onSelect={() => edit({ state: s })} />
          ))
        : STICKY_COLORS.map((c) => (
            <Swatch key={c} color={c} checked={colorOf(note) === c} label={STICKY_COLOR_NAMES[c]} onSelect={() => edit({ colorName: c })} />
          ))}
    </div>
  )
}

/** A circle half filled: under way. */
function HalfCircle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a9 9 0 0 1 0 18Z" fill="currentColor" stroke="none" />
    </svg>
  )
}

const STATE_ICONS: Record<Exclude<StickyState, "open">, React.ComponentType<{ className?: string }>> = {
  progress: HalfCircle,
  done: CircleCheck,
}

/** A mark for in progress or done, so state never rests on colour alone. Nothing for open. */
export function StickyNoteState({ className, ...props }: React.ComponentProps<"span">) {
  const { note } = useStickyNote()
  const state = stateOf(note)
  if (state === "open") return null
  const Icon = STATE_ICONS[state]
  return (
    <span
      data-slot="sticky-note-state"
      role="img"
      aria-label={STICKY_STATE_NAMES[state]}
      title={STICKY_STATE_NAMES[state]}
      className={cn("grid size-5 place-items-center text-sticky-meta [&_svg]:size-3.5", className)}
      {...props}
    >
      <Icon />
    </span>
  )
}

/** Close. A note with words asks first, in its footer, when it has one. */
export function StickyNoteClose({ className, onClick, ...props }: React.ComponentProps<"button">) {
  const { note, remove, footers, setConfirming } = useStickyNote()
  if (!remove) return null
  return (
    <button
      type="button"
      data-slot="sticky-note-close"
      aria-label="Delete note"
      title="Delete note"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        onClick?.(e)
        if (e.defaultPrevented) return
        if (note.text.trim() && footers > 0) setConfirming(true)
        else remove()
      }}
      className={cn(
        "grid size-5 place-items-center rounded-sm text-sticky-meta transition-colors duration-150 outline-none hover:text-sticky-ink focus-visible:ring-2 focus-visible:ring-sticky-meta [&_svg]:size-3.5",
        className,
      )}
      {...props}
    >
      <X strokeWidth={2} />
    </button>
  )
}

export interface StickyNoteTextProps extends Omit<React.ComponentProps<"textarea">, "value" | "onChange"> {
  /** "- " starts a bullet and Return continues a list. On by default. */
  lists?: boolean
}

/** The words. Escape stops typing and leaves the note's header focused. */
export function StickyNoteText({ className, lists = true, placeholder = "Write a note", onKeyDown, ...props }: StickyNoteTextProps) {
  const { note, edit, rootRef } = useStickyNote()
  const formatted = useListFormatting(note.text, (text) => edit({ text }))
  return (
    <textarea
      data-slot="sticky-note-text"
      ref={formatted.ref}
      value={note.text}
      placeholder={placeholder}
      aria-label="Note"
      onChange={lists ? formatted.onChange : (e) => edit({ text: e.target.value })}
      onKeyDown={(e) => {
        onKeyDown?.(e)
        if (e.defaultPrevented) return
        if (e.key === "Escape") {
          e.preventDefault()
          const header = rootRef.current?.querySelector<HTMLElement>('[data-slot="sticky-note-header"][tabindex]')
          if (header) header.focus()
          else e.currentTarget.blur()
          return
        }
        if (lists) formatted.onKeyDown(e)
      }}
      className={cn(
        "min-h-0 flex-1 resize-none bg-transparent px-4 pt-3 text-[15px] leading-6 text-sticky-ink outline-none select-text placeholder:text-sticky-meta",
        className,
      )}
      {...props}
    />
  )
}

/** The strip along the bottom, for the author or date. It's also where deleting asks first. */
export function StickyNoteFooter({ className, children, ...props }: React.ComponentProps<"div">) {
  const { remove, confirming, setConfirming, setFooters } = useStickyNote()
  useEffect(() => {
    setFooters((n) => n + 1)
    return () => setFooters((n) => n - 1)
  }, [setFooters])

  return (
    <div
      data-slot="sticky-note-footer"
      className={cn("flex h-8 shrink-0 items-center justify-end gap-3 px-4 text-xs text-sticky-meta", className)}
      {...props}
    >
      {confirming && remove ? (
        <>
          <span className="mr-auto text-sticky-ink">Delete this note?</span>
          <button type="button" onClick={() => setConfirming(false)} className="hover:text-sticky-ink">
            Keep
          </button>
          <button type="button" onClick={remove} className="text-sticky-ink underline underline-offset-2">
            Delete
          </button>
        </>
      ) : (
        children
      )}
    </div>
  )
}

/** Who wrote it, from the note's `author`. */
export function StickyNoteAuthor({ className, ...props }: React.ComponentProps<"span">) {
  const { note } = useStickyNote()
  if (!note.author) return null
  return (
    <span data-slot="sticky-note-author" className={cn("mr-auto min-w-0 truncate text-sticky-ink/70", className)} {...props}>
      {note.author}
    </span>
  )
}

const TIME = new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "2-digit", hour12: true })
const DAY = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" })

/** "Today, 11:23am", "Yesterday, 4:05pm", or "12 Oct, 9:10am". */
export function formatStickyDate(at: string | number, now = Date.now()): string {
  const date = new Date(at)
  if (Number.isNaN(date.getTime())) return ""
  const time = TIME.format(date).replace(/\s/g, "").toLowerCase()
  const day = new Date(now)
  day.setHours(0, 0, 0, 0)
  const start = day.getTime()
  if (date.getTime() >= start) return `Today, ${time}`
  if (date.getTime() >= start - 86_400_000) return `Yesterday, ${time}`
  return `${DAY.format(date)}, ${time}`
}

/** When it last changed, from `updatedAt`. Not in the default composition; add it to the footer. */
export function StickyNoteDate({ className, ...props }: React.ComponentProps<"time">) {
  const { note } = useStickyNote()
  const at = note.updatedAt ?? note.createdAt
  if (!at) return null
  return (
    <time data-slot="sticky-note-date" dateTime={at} className={cn("shrink-0 tabular-nums", className)} suppressHydrationWarning {...props}>
      {formatStickyDate(at)}
    </time>
  )
}

/** The bottom-right corner: drag to resize. */
export function StickyNoteResize({ className, ...props }: React.ComponentProps<"div">) {
  const { note, place, positioned, scale, setLifted } = useStickyNote()
  const start = useRef(note)
  const { handlers } = usePointerDrag({
    scale,
    disabled: !positioned,
    onDragStart: () => {
      start.current = note
      setLifted(true)
    },
    onDrag: ({ dx, dy }) =>
      place({
        width: Math.round(Math.max(STICKY_MIN_SIZE.width, start.current.width + dx)),
        height: Math.round(Math.max(STICKY_MIN_SIZE.height, start.current.height + dy)),
      }),
    onDragEnd: () => setLifted(false),
  })
  if (!positioned) return null
  return (
    <div
      data-slot="sticky-note-resize"
      aria-hidden
      className={cn("absolute right-0 bottom-0 size-4 cursor-nwse-resize touch-none", className)}
      {...handlers}
      {...props}
    />
  )
}

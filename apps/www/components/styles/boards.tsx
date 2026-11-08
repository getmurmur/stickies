"use client"

import { type ReactNode, useEffect, useId, useRef, useState } from "react"
import { glassMaps, type GlassMaps, refracts } from "@/components/styles/glass"
import { styleNotes } from "@/components/styles/seed"
import { StickyBoard, type StickyBoardProps, useStickyBoard } from "@/registry/stickies/blocks/sticky-board/sticky-board"
import { shownColorOf, STICKY_STATE_NAMES, stateOf } from "@/registry/stickies/lib/stickies-format"
import {
  StickyNoteAuthor,
  StickyNoteClose,
  StickyNoteColors,
  StickyNoteFooter,
  StickyNoteHeader,
  StickyNoteResize,
  StickyNoteState,
  StickyNoteText,
  useStickyNote,
} from "@/registry/stickies/ui/sticky-note"
import { cn } from "@/lib/utils"

type Skin = "glass" | "paper" | "minimal" | "terminal"

function Reset({ className }: { className?: string }) {
  const { edited, reset } = useStickyBoard()
  if (!edited) return null
  return (
    <button
      type="button"
      onClick={reset}
      className={cn("absolute top-3 right-3 z-[10000] rounded-full px-2.5 py-1 text-[12px] transition-colors", className)}
    >
      Reset
    </button>
  )
}

/** One style's board: the shared notes, not saved, drawn by `renderNote` and the skin's CSS. */
function StyleBoard({
  skin,
  renderNote,
  resetClassName,
  children,
  className,
  ...props
}: { skin: Skin; renderNote: NonNullable<StickyBoardProps["renderNote"]>; resetClassName: string; children?: ReactNode } & React.ComponentProps<"div">) {
  const [defaults] = useState(styleNotes)
  return (
    <div data-skin={skin} className={cn("relative overflow-hidden", className)} {...props}>
      {children}
      <StickyBoard
        className="absolute inset-0"
        defaultNotes={defaults}
        persist={false}
        source={{ app: "stickies.live", url: "https://stickies.live/styles" }}
        renderNote={renderNote}
      >
        <Reset className={resetClassName} />
      </StickyBoard>
    </div>
  )
}

// ---------------------------------------------------------------- Liquid Glass

/** Kept in step with the glass note's border-radius in skins.css. */
const GLASS = { radius: 26, bezel: 22, depth: 30 }

/**
 * The glass itself, behind the note's words: the backdrop refracted through the maps (in
 * Chromium) or frosted (elsewhere), tinted by the note's colour, with the lit rim on top.
 */
function GlassLayer() {
  const { note } = useStickyNote()
  const { pan } = useStickyBoard()
  const id = `glass-${useId().replace(/[^\w-]/g, "")}`
  const [maps, setMaps] = useState<GlassMaps | null>(null)
  const [refract, setRefract] = useState(false)

  useEffect(() => setRefract(refracts()), [])
  useEffect(() => setMaps(glassMaps(note.width, note.height, GLASS)), [note.width, note.height])

  return (
    <>
      {refract && maps && (
        <svg aria-hidden width="0" height="0" className="absolute">
          <filter
            id={id}
            x="0"
            y="0"
            width={note.width}
            height={note.height}
            filterUnits="userSpaceOnUse"
            primitiveUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blurred" />
            <feImage href={maps.displacement} x="0" y="0" width={note.width} height={note.height} preserveAspectRatio="none" result="map" />
            <feDisplacementMap in="blurred" in2="map" scale={maps.scale} xChannelSelector="R" yChannelSelector="G" result="bent" />
            <feColorMatrix in="bent" type="saturate" values="1.35" />
          </filter>
        </svg>
      )}
      <div
        aria-hidden
        data-slot="glass"
        style={
          {
            backdropFilter: refract && maps ? `url(#${id})` : undefined,
            backgroundImage: maps ? `url(${maps.specular})` : undefined,
            "--note-x": `${pan.x + note.x}px`,
            "--note-y": `${pan.y + note.y}px`,
          } as React.CSSProperties
        }
      />
    </>
  )
}

function GlassNote({ autoFocus }: { autoFocus: boolean }) {
  return (
    <>
      <GlassLayer />
      <StickyNoteHeader>
        <StickyNoteColors />
        <span className="flex-1" />
        <StickyNoteState />
        <StickyNoteClose />
      </StickyNoteHeader>
      <StickyNoteText autoFocus={autoFocus} />
      <StickyNoteFooter>
        <StickyNoteAuthor />
      </StickyNoteFooter>
      <StickyNoteResize />
    </>
  )
}

export function GlassBoard() {
  const frame = useRef<HTMLDivElement>(null)
  return (
    <StyleBoard
      ref={frame}
      skin="glass"
      className="h-[600px] rounded-[28px]"
      resetClassName="bg-white/25 text-white backdrop-blur-md hover:bg-white/35"
      renderNote={(_, { autoFocus }) => <GlassNote autoFocus={autoFocus} />}
      // The light follows the pointer across every pane of glass.
      onPointerMove={(e) => {
        const el = frame.current
        if (!el) return
        const rect = el.getBoundingClientRect()
        el.style.setProperty("--light-x", `${e.clientX - rect.left}px`)
        el.style.setProperty("--light-y", `${e.clientY - rect.top}px`)
      }}
      onPointerLeave={() => {
        frame.current?.style.removeProperty("--light-x")
        frame.current?.style.removeProperty("--light-y")
      }}
    >
      <div aria-hidden data-slot="wallpaper">
        <span data-orb="1" />
        <span data-orb="2" />
        <span data-orb="3" />
        <span data-orb="4" />
        <span data-slot="wallpaper-type">Stickies</span>
      </div>
    </StyleBoard>
  )
}

// ---------------------------------------------------------------- Paper

function PaperNote({ autoFocus }: { autoFocus: boolean }) {
  return (
    <>
      {/* The tape is the handle. */}
      <StickyNoteHeader />
      <StickyNoteText autoFocus={autoFocus} placeholder="Scribble something" />
      <StickyNoteFooter>
        <StickyNoteAuthor />
        <StickyNoteColors />
        <StickyNoteState />
        <StickyNoteClose />
      </StickyNoteFooter>
      <StickyNoteResize />
    </>
  )
}

export function PaperBoard() {
  return (
    <StyleBoard
      skin="paper"
      className="h-[460px] rounded-[18px]"
      resetClassName="bg-[#fff8e6] text-[#5a3d22] shadow-[0_1px_2px_rgba(0,0,0,0.3)] hover:bg-white"
      renderNote={(_, { autoFocus }) => <PaperNote autoFocus={autoFocus} />}
    >
      <div aria-hidden data-slot="cork" />
    </StyleBoard>
  )
}

// ---------------------------------------------------------------- Minimal

/** The note's colour as one small dot. */
function ColorDot() {
  const { note, semantic } = useStickyNote()
  return <span aria-hidden data-slot="dot" data-sticky-color={shownColorOf(note, semantic)} />
}

function MinimalNote({ autoFocus }: { autoFocus: boolean }) {
  return (
    <>
      <StickyNoteHeader>
        <StickyNoteColors />
        <span className="flex-1" />
        <StickyNoteClose />
      </StickyNoteHeader>
      <StickyNoteText autoFocus={autoFocus} />
      <StickyNoteFooter>
        <ColorDot />
        <StickyNoteAuthor />
        <StickyNoteState />
      </StickyNoteFooter>
      <StickyNoteResize />
    </>
  )
}

export function MinimalBoard() {
  return (
    <StyleBoard
      skin="minimal"
      className="h-[460px] rounded-[18px]"
      resetClassName="text-[#80838d] hover:text-[#1c2024]"
      renderNote={(_, { autoFocus }) => <MinimalNote autoFocus={autoFocus} />}
    />
  )
}

// ---------------------------------------------------------------- Terminal

const CHECKBOX = { open: "[ ]", progress: "[~]", done: "[x]" } as const

/** The state as a checkbox, and who wrote it. */
function TerminalTitle() {
  const { note } = useStickyNote()
  const state = stateOf(note)
  return (
    <span data-slot="terminal-title" className="truncate">
      <span role="img" aria-label={STICKY_STATE_NAMES[state]}>
        {CHECKBOX[state]}
      </span>
      {note.author ? ` @${note.author.toLowerCase()}` : ""}
    </span>
  )
}

/** When it last changed, as the data has it. */
function TerminalTime() {
  const { note } = useStickyNote()
  const at = note.updatedAt ?? note.createdAt
  return at ? <time dateTime={at}>{at.replace("T", " ").replace(/:\d\dZ$/, "Z")}</time> : null
}

function TerminalNote({ autoFocus }: { autoFocus: boolean }) {
  return (
    <>
      <StickyNoteHeader>
        <TerminalTitle />
        <span className="flex-1" />
        <StickyNoteClose />
      </StickyNoteHeader>
      <StickyNoteText autoFocus={autoFocus} placeholder="_" spellCheck={false} />
      <StickyNoteFooter>
        <TerminalTime />
        <span className="flex-1" />
        <StickyNoteColors />
      </StickyNoteFooter>
      <StickyNoteResize />
    </>
  )
}

export function TerminalBoard() {
  return (
    <StyleBoard
      skin="terminal"
      className="h-[460px] rounded-[18px]"
      resetClassName="font-mono text-[#98c379] hover:text-[#b5e890]"
      renderNote={(_, { autoFocus }) => <TerminalNote autoFocus={autoFocus} />}
    />
  )
}

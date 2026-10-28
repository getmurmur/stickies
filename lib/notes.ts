// A note as the Stickies format describes it (SPEC.md §3), with times kept as
// milliseconds while it's on the page.

export const COLORS = ["yellow", "blue", "green", "pink", "purple", "grey"] as const
export type ColorName = (typeof COLORS)[number]
export type NoteState = "open" | "progress" | "done"

export interface Note {
  id: string
  text: string
  x: number
  y: number
  width: number
  height: number
  colorName: ColorName
  state?: NoteState
  author?: string
  updatedAt: number
}

export const COLOR_NAMES: Record<ColorName, string> = {
  yellow: "Yellow",
  blue: "Blue",
  green: "Green",
  pink: "Pink",
  purple: "Purple",
  grey: "Grey",
}

export const STATE_NAMES: Record<NoteState, string> = { open: "Open", progress: "In progress", done: "Done" }

export const NOTE_W = 240
export const NOTE_H = 160
export const MIN_W = 180
export const MIN_H = 120

/** Where the seed notes sit, so the page can centre them on screen. */
export const SEED_BOUNDS = { width: 1160, height: 640 }

type Seed = Omit<Note, "updatedAt" | "width" | "height"> & { width?: number; height?: number; minutesAgo: number }

// The ideas from the conversation that started the format, laid out as a loose board.
const SEEDS: Seed[] = [
  {
    id: "intro",
    text: "Stickies is an open format for moving sticky notes between apps.\n\nDraft spec coming soon.",
    x: 0, y: 20, width: 280, height: 180, colorName: "yellow", author: "George", minutesAgo: 1,
  },
  { id: "standard", text: "Sticky notes as an open standard", x: 320, y: 0, colorName: "yellow", state: "progress", minutesAgo: 42 },
  { id: "canvas", text: "Build on JSON Canvas, so every file opens in Obsidian", x: 600, y: 30, colorName: "blue", minutesAgo: 38 },
  { id: "state", text: "State is data, colour is display", x: 900, y: 0, colorName: "pink", minutesAgo: 30 },
  { id: "domain", text: "Bought stickies.live", x: 20, y: 250, colorName: "green", state: "done", minutesAgo: 6 },
  { id: "paste", text: "Copy and paste first, drag later", x: 310, y: 220, colorName: "purple", minutesAgo: 25 },
  {
    id: "clipboard",
    text: "On the clipboard: JSON, HTML and plain text. Works everywhere on day one.",
    x: 590, y: 240, width: 260, height: 170, colorName: "grey", minutesAgo: 22,
  },
  { id: "mcp", text: "MCP: the sticky note shape agents use", x: 890, y: 210, colorName: "blue", minutesAgo: 18 },
  { id: "apps", text: "First apps to ask: Obsidian, tldraw, Excalidraw", x: 60, y: 470, colorName: "yellow", minutesAgo: 15 },
  { id: "name", text: "Does the name clash with Apple's Stickies?", x: 350, y: 440, colorName: "pink", minutesAgo: 9 },
  { id: "copies", text: "Copies only for now. Live sync is a different, harder problem.", x: 640, y: 460, colorName: "purple", minutesAgo: 12 },
  { id: "try", text: "Drag me by the top.\nDouble-click anywhere for a new note.", x: 920, y: 430, colorName: "green", minutesAgo: 0 },
]

export function seedNotes(now = Date.now()): Note[] {
  return SEEDS.map(({ minutesAgo, width = NOTE_W, height = NOTE_H, ...note }) => ({
    ...note,
    width,
    height,
    updatedAt: now - minutesAgo * 60_000,
  }))
}

const STORE = "stickies.live:notes:v1"

function isNote(v: unknown): v is Note {
  if (typeof v !== "object" || v === null) return false
  const n = v as Record<string, unknown>
  return (
    typeof n.id === "string" &&
    typeof n.text === "string" &&
    ["x", "y", "width", "height", "updatedAt"].every((k) => typeof n[k] === "number") &&
    COLORS.some((c) => c === n.colorName)
  )
}

/** The notes as this browser last left them, or null for the seed board. */
export function loadNotes(): Note[] | null {
  try {
    const raw = localStorage.getItem(STORE)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.every(isNote) ? parsed : null
  } catch {
    return null
  }
}

export function saveNotes(notes: Note[]) {
  try {
    localStorage.setItem(STORE, JSON.stringify(notes))
  } catch {
    // Private mode or full storage: the board just won't be remembered.
  }
}

export function forgetNotes() {
  try {
    localStorage.removeItem(STORE)
  } catch {
    // Nothing to forget.
  }
}

const TIME = new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "2-digit", hour12: true })
const DAY = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" })

/** "Today, 11:23am", "Yesterday, 4:05pm", or "12 Oct, 9:10am", as Murmur writes it. */
export function stickyDate(at: number, now = Date.now()): string {
  const date = new Date(at)
  const time = TIME.format(date).replace(/\s/g, "").toLowerCase()
  const day = new Date(now)
  day.setHours(0, 0, 0, 0)
  const start = day.getTime()
  if (at >= start) return `Today, ${time}`
  if (at >= start - 86_400_000) return `Yesterday, ${time}`
  return `${DAY.format(date)}, ${time}`
}

export const cn = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ")

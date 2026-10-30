import { createNote, type StickyNoteData } from "@/registry/stickies/lib/stickies-format"

/** The ideas from the conversation that started the format, laid out as a loose board. */
const SEEDS: (Partial<StickyNoteData> & { minutesAgo: number })[] = [
  {
    id: "intro",
    text: "Stickies is an open format for moving sticky notes between apps.\n\nSelect a note and press ⌘C, then paste it anywhere.",
    x: 0, y: 20, width: 280, height: 210, colorName: "yellow", author: "George", minutesAgo: 1,
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
  { id: "registry", text: "npx shadcn add @stickies/sticky-board", x: 60, y: 470, colorName: "yellow", state: "done", minutesAgo: 3 },
  { id: "name", text: "Does the name clash with Apple's Stickies?", x: 350, y: 440, colorName: "pink", minutesAgo: 9 },
  { id: "copies", text: "Copies only for now. Live sync is a different, harder problem.", x: 640, y: 460, colorName: "purple", minutesAgo: 12 },
  { id: "try", text: "Drag me by the top.\nDouble-click or right-click anywhere for a new note.", x: 920, y: 430, colorName: "green", minutesAgo: 0 },
]

export function seedNotes(now = Date.now()): StickyNoteData[] {
  return SEEDS.map(({ minutesAgo, ...fields }) => {
    const at = new Date(now - minutesAgo * 60_000).toISOString().replace(/\.\d{3}Z$/, "Z")
    return createNote({ ...fields, createdAt: at, updatedAt: at })
  })
}

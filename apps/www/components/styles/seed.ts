import { createNote, type StickyNoteData } from "@/registry/stickies/lib/stickies-format"

const W = 236
const H = 156
const GAP = 28

/** The notes every style starts with: the same data, drawn differently on each board. */
const SEEDS: Partial<StickyNoteData>[] = [
  { id: "same", text: "Same notes, any look.", colorName: "yellow", author: "George" },
  { id: "travels", text: "Text, colour, state and author travel with the note.", colorName: "blue" },
  { id: "draws", text: "Each app draws them its own way.", colorName: "pink", state: "progress" },
  { id: "copy", text: "Select me, press ⌘C, then paste into another board.", colorName: "green", author: "George" },
  { id: "ship", text: "Ship the styles page", colorName: "purple", state: "done" },
  { id: "text", text: "Every copy carries plain text too, for apps that don't know the format.", colorName: "grey" },
]

export function styleNotes(): StickyNoteData[] {
  const at = "2026-11-08T10:00:00Z"
  return SEEDS.map((fields, i) =>
    createNote({
      ...fields,
      x: (i % 3) * (W + GAP),
      // A loose stagger, so the board reads as a board rather than a grid.
      y: Math.floor(i / 3) * (H + GAP) + [0, 18, 6][i % 3],
      width: W,
      height: H,
      createdAt: at,
      updatedAt: at,
    }),
  )
}

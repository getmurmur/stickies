import type { StickiesDocument, StickyColor, StickyNoteData, StickyState } from "../../../apps/www/registry/stickies/lib/stickies-format.ts"

/** A new note from an agent. Only `text` is required; the board places and sizes it. */
export interface NoteInput {
  text: string
  colorName?: StickyColor
  state?: StickyState
  author?: string
  x?: number
  y?: number
  width?: number
  height?: number
  ext?: Record<string, Record<string, unknown>>
}

/** Changes to one note, by ID. Fields left out stay as they are. */
export type NotePatch = Partial<NoteInput> & { id: string }

/** Somewhere notes live: a file, a Miro board, and so on. `board` picks one; leave it out for the default. */
export interface BoardAdapter {
  list(board?: string): Promise<StickiesDocument>
  add(notes: NoteInput[], board?: string): Promise<StickyNoteData[]>
  update(patches: NotePatch[], board?: string): Promise<{ updated: StickyNoteData[]; missing: string[] }>
  remove(ids: string[], board?: string): Promise<{ removed: string[]; missing: string[] }>
}

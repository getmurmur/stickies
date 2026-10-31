// Stickies copy and paste for tldraw (https://stickies.live/spec.md §8). Pass
// `stickiesTldrawOptions` to <Tldraw options={…}>:
//
// - Copying (or cutting) a selection of only sticky notes writes them as Stickies: the HTML
//   carrying the document, and plain text. They paste into other apps as notes, coloured boxes
//   or text. tldraw's own props go in `ext.tldraw`, so tldraw to tldraw loses nothing.
// - Pasting HTML that carries a Stickies document makes tldraw sticky notes, under the pointer,
//   keeping their layout. State and author are kept in each shape's `meta.stickies`.
//
// Any other copy or paste is left to tldraw.

import {
  createShapeId,
  type Editor,
  renderPlaintextFromRichText,
  type TLContent,
  type TLDefaultColorStyle,
  type TldrawOptions,
  type TLNoteShape,
  type TLShapePartial,
  toRichText,
  type VecLike,
} from "tldraw"
import {
  fromHtml,
  isStickyColor,
  notesOf,
  nowIso,
  type StickiesSource,
  type StickyColor,
  type StickyNoteData,
  STICKY_PALETTE,
  stateOf,
  toDocument,
  toHtml,
  toText,
} from "@/registry/stickies/lib/stickies-format"

/** tldraw's notes are 200 square before scale and growth. */
const NOTE_SIZE = 200

/** tldraw's note colours as Stickies colours. tldraw's default ("black") is its yellow note. */
const FROM_TLDRAW: Record<TLDefaultColorStyle, StickyColor> = {
  black: "yellow",
  yellow: "yellow",
  orange: "yellow",
  white: "grey",
  grey: "grey",
  blue: "blue",
  "light-blue": "blue",
  green: "green",
  "light-green": "green",
  red: "pink",
  "light-red": "pink",
  violet: "purple",
  "light-violet": "purple",
}

const TO_TLDRAW: Record<StickyColor, TLDefaultColorStyle> = {
  yellow: "black",
  blue: "light-blue",
  green: "light-green",
  pink: "light-red",
  purple: "light-violet",
  grey: "grey",
}

/** What a note keeps in `meta.stickies`: what Stickies has and tldraw doesn't. */
interface StickiesMeta {
  state?: string
  author?: string
  createdAt?: string
  source?: StickiesSource
  ext?: StickyNoteData["ext"]
}

const isNoteShape = (shape: { type: string }): shape is TLNoteShape => shape.type === "note"

const metaOf = (shape: TLNoteShape): StickiesMeta => {
  const meta = shape.meta.stickies
  return typeof meta === "object" && meta !== null && !Array.isArray(meta) ? (meta as StickiesMeta) : {}
}

/** A tldraw note as a Stickies note, with tldraw's own props in `ext.tldraw`. */
export function noteToSticky(editor: Editor, shape: TLNoteShape): StickyNoteData {
  const meta = metaOf(shape)
  const colorName = FROM_TLDRAW[shape.props.color] ?? "yellow"
  const { richText, ...props } = shape.props
  return {
    id: shape.id,
    type: "text",
    text: renderPlaintextFromRichText(editor, richText),
    x: Math.round(shape.x),
    y: Math.round(shape.y),
    width: Math.round(NOTE_SIZE * shape.props.scale),
    height: Math.round((NOTE_SIZE + shape.props.growY) * shape.props.scale),
    colorName,
    color: STICKY_PALETTE[colorName].paper,
    ...(meta.state && meta.state !== "open" ? { state: meta.state } : {}),
    ...(meta.author ? { author: meta.author } : {}),
    createdAt: meta.createdAt ?? nowIso(),
    updatedAt: nowIso(),
    ...(meta.source ? { source: meta.source } : {}),
    ext: { ...meta.ext, tldraw: { props, richText } },
  }
}

/** A Stickies note as a tldraw note at a point, using `ext.tldraw` when it still matches the note. */
export function stickyToNote(note: StickyNoteData, at: VecLike): TLShapePartial<TLNoteShape> {
  const saved = note.ext?.tldraw as { props?: Partial<TLNoteShape["props"]>; richText?: TLNoteShape["props"]["richText"] } | undefined
  const { tldraw: _tldraw, ...ext } = note.ext ?? {}
  const colorName: StickyColor = isStickyColor(note.colorName) ? note.colorName : "yellow"
  // tldraw's own colour if the note hasn't been recoloured elsewhere since.
  const color = saved?.props?.color && FROM_TLDRAW[saved.props.color] === colorName ? saved.props.color : TO_TLDRAW[colorName]
  // Formatting comes back only if the words are the same; otherwise the words as they are now.
  const sameWords = saved?.richText && richTextWords(saved.richText) === note.text.replace(/\s+/g, " ").trim()
  const meta: StickiesMeta = {
    ...(stateOf(note) !== "open" ? { state: stateOf(note) } : {}),
    ...(note.author ? { author: note.author } : {}),
    ...(note.createdAt ? { createdAt: note.createdAt } : {}),
    ...(note.source ? { source: note.source } : {}),
    ...(Object.keys(ext).length ? { ext } : {}),
  }
  return {
    id: createShapeId(),
    type: "note",
    x: at.x,
    y: at.y,
    props: {
      ...(saved?.props ?? {}),
      color,
      richText: sameWords && saved?.richText ? saved.richText : toRichText(note.text),
    },
    meta: { stickies: JSON.parse(JSON.stringify(meta)) },
  }
}

/** The words in tldraw rich text, without an editor, to compare with a note's text. */
function richTextWords(node: unknown): string {
  if (typeof node !== "object" || node === null) return ""
  const n = node as { text?: unknown; content?: unknown }
  const own = typeof n.text === "string" ? n.text : ""
  const inner = Array.isArray(n.content) ? n.content.map(richTextWords).join(" ") : ""
  return `${own} ${inner}`.replace(/\s+/g, " ").trim()
}

/** Writes notes to the clipboard as Stickies: HTML carrying the document, and plain text. */
async function writeNotes(editor: Editor, notes: StickyNoteData[], source?: StickiesSource) {
  const nav = (editor.getContainer().ownerDocument.defaultView ?? window).navigator
  const doc = toDocument(notes, { source })
  const text = toText(notes) || " "
  if (nav.clipboard?.write && typeof ClipboardItem !== "undefined") {
    await nav.clipboard.write([
      new ClipboardItem({
        "text/html": new Blob([toHtml(doc)], { type: "text/html" }),
        "text/plain": new Blob([text], { type: "text/plain" }),
      }),
    ])
  } else {
    await nav.clipboard?.writeText(text)
  }
}

/** The sticky notes in copied content, when that's all it is. */
function onlyNotes(content: TLContent): TLNoteShape[] | null {
  const roots = content.shapes.filter((s) => content.rootShapeIds.includes(s.id))
  if (roots.length === 0 || roots.some((s) => !isNoteShape(s))) return null
  return roots.filter(isNoteShape)
}

/** Puts Stickies notes on the page, centred on a point, selected. */
export function putStickies(editor: Editor, notes: StickyNoteData[], point?: VecLike, source?: StickiesSource) {
  if (notes.length === 0) return
  const centre = point ?? editor.getViewportPageBounds().center
  const left = Math.min(...notes.map((n) => n.x))
  const top = Math.min(...notes.map((n) => n.y))
  const right = Math.max(...notes.map((n) => n.x + n.width))
  const bottom = Math.max(...notes.map((n) => n.y + n.height))
  const dx = centre.x - (left + right) / 2
  const dy = centre.y - (top + bottom) / 2
  // Where each note came from: its own source, filled in from the document's.
  const shapes = notes.map((n) =>
    stickyToNote({ ...n, ...(source || n.source ? { source: { ...source, ...n.source } } : {}) }, { x: Math.round(n.x + dx), y: Math.round(n.y + dy) }),
  )
  editor.markHistoryStoppingPoint("paste stickies")
  editor.createShapes(shapes)
  editor.select(...shapes.map((s) => s.id))
}

/**
 * Stickies copy and paste for tldraw, as options for `<Tldraw options={…}>`. Pass `source`
 * to record your app in copied notes. Spread into your own options if you have some.
 */
export function stickiesTldrawOptions(source?: StickiesSource): Partial<TldrawOptions> {
  return {
    async onBeforeCopyToClipboard({ editor, content, operation }) {
      const shapes = onlyNotes(content)
      if (!shapes) return
      await writeNotes(
        editor,
        shapes.map((s) => noteToSticky(editor, s)),
        source,
      )
      // tldraw's own write is skipped, so a cut removes the notes here.
      if (operation === "cut") editor.deleteShapes(shapes.map((s) => s.id))
      return false
    },
    onBeforePasteFromClipboard({ editor, content, point }) {
      if (content.type !== "text" || !content.html?.includes("data-stickies")) return
      const doc = fromHtml(content.html)
      if (!doc) return
      putStickies(editor, notesOf(doc), point, doc.source)
      return false
    },
  }
}

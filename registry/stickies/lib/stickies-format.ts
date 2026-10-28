// The Stickies format (https://stickies.live/spec.md) in TypeScript: types, the palette,
// conversion to and from documents, validation, and the clipboard's HTML and plain text.

export const STICKIES_VERSION = "0.1"
export const STICKIES_MIME = "application/vnd.stickies+json"

export const STICKY_COLORS = ["yellow", "blue", "green", "pink", "purple", "grey"] as const
export type StickyColor = (typeof STICKY_COLORS)[number]

export const STICKY_STATES = ["open", "progress", "done"] as const
export type StickyState = (typeof STICKY_STATES)[number]

/** Each named colour's paper (the hex sent as `color`), ink and edge, for HTML and fallbacks. */
export const STICKY_PALETTE: Record<StickyColor, { paper: string; ink: string; edge: string }> = {
  yellow: { paper: "#fdf6c8", ink: "#3b3214", edge: "#e8d995" },
  blue: { paper: "#ddedfb", ink: "#1d3049", edge: "#abc9ea" },
  green: { paper: "#def3d7", ink: "#22391c", edge: "#a9d69c" },
  pink: { paper: "#fbe1ed", ink: "#4a1f31", edge: "#e7abc6" },
  purple: { paper: "#ede3fb", ink: "#33204d", edge: "#c5aee9" },
  grey: { paper: "#f2f2f1", ink: "#2b2b2a", edge: "#cfcfcc" },
}

export const STICKY_COLOR_NAMES: Record<StickyColor, string> = {
  yellow: "Yellow",
  blue: "Blue",
  green: "Green",
  pink: "Pink",
  purple: "Purple",
  grey: "Grey",
}

export const STICKY_STATE_NAMES: Record<StickyState, string> = { open: "Open", progress: "In progress", done: "Done" }

/** With semantic notes on, the colour a note is drawn in comes from its state. */
export const STICKY_STATE_COLORS: Record<StickyState, StickyColor> = { open: "yellow", progress: "blue", done: "green" }

export const STICKY_DEFAULT_SIZE = { width: 240, height: 160 }
export const STICKY_MIN_SIZE = { width: 180, height: 120 }

export interface StickiesSource {
  app?: string
  url?: string
  id?: string
}

/** A note: a JSON Canvas text node with the fields Stickies adds. */
export interface StickyNoteData {
  id: string
  type: "text"
  text: string
  x: number
  y: number
  width: number
  height: number
  color?: string
  colorName?: string
  state?: string
  author?: string
  createdAt?: string
  updatedAt?: string
  source?: StickiesSource
  ext?: Record<string, Record<string, unknown>>
}

/** Any other JSON Canvas node (file, link, group): kept, never shown. */
export interface OtherCanvasNode {
  id: string
  type: string
  x: number
  y: number
  width: number
  height: number
  [key: string]: unknown
}

export interface StickiesEdge {
  id: string
  fromNode: string
  toNode: string
  fromSide?: "top" | "right" | "bottom" | "left"
  toSide?: "top" | "right" | "bottom" | "left"
  fromEnd?: "none" | "arrow"
  toEnd?: "none" | "arrow"
  color?: string
  label?: string
}

export interface StickiesDocument {
  stickies: string
  source?: StickiesSource
  nodes: (StickyNoteData | OtherCanvasNode)[]
  edges?: StickiesEdge[]
}

export const isStickyColor = (v: unknown): v is StickyColor => STICKY_COLORS.some((c) => c === v)

/** The note's state, read as the spec says: absent or unknown is open. */
export const stateOf = (note: Pick<StickyNoteData, "state">): StickyState =>
  STICKY_STATES.find((s) => s === note.state) ?? "open"

/** The note's named colour: its own, or yellow when it has none this palette knows. */
export const colorOf = (note: Pick<StickyNoteData, "colorName">): StickyColor =>
  isStickyColor(note.colorName) ? note.colorName : "yellow"

/** The colour to draw: its own, or with semantic notes on, its state's. */
export const shownColorOf = (note: Pick<StickyNoteData, "colorName" | "state">, semantic = false): StickyColor =>
  semantic ? STICKY_STATE_COLORS[stateOf(note)] : colorOf(note)

export const nowIso = () => new Date().toISOString().replace(/\.\d{3}Z$/, "Z")

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`

/** A new note, with an ID, the default size, a colour and times filled in. */
export function createNote(fields: Partial<StickyNoteData> = {}): StickyNoteData {
  const now = nowIso()
  const colorName = fields.colorName ?? "yellow"
  return {
    id: newId(),
    type: "text",
    text: "",
    x: 0,
    y: 0,
    ...STICKY_DEFAULT_SIZE,
    colorName,
    ...(isStickyColor(colorName) ? { color: STICKY_PALETTE[colorName].paper } : {}),
    createdAt: now,
    updatedAt: now,
    ...fields,
  }
}

/** A note with its fields changed and `updatedAt` set to now, keeping `color` in step with `colorName`. */
export function changeNote(note: StickyNoteData, fields: Partial<StickyNoteData>): StickyNoteData {
  const next = { ...note, ...fields, updatedAt: nowIso() }
  if (fields.colorName && isStickyColor(fields.colorName)) next.color = STICKY_PALETTE[fields.colorName].paper
  if (next.state === "open") delete next.state
  return next
}

export function toDocument(notes: StickyNoteData[], options: { source?: StickiesSource; edges?: StickiesEdge[] } = {}): StickiesDocument {
  const ids = new Set(notes.map((n) => n.id))
  return {
    stickies: STICKIES_VERSION,
    ...(options.source ? { source: options.source } : {}),
    nodes: notes,
    edges: (options.edges ?? []).filter((e) => ids.has(e.fromNode) && ids.has(e.toNode)),
  }
}

export const isNote = (node: StickyNoteData | OtherCanvasNode): node is StickyNoteData =>
  node.type === "text" && typeof node.text === "string"

/** The notes in a document, skipping other kinds of node. */
export const notesOf = (doc: StickiesDocument): StickyNoteData[] => doc.nodes.filter(isNote)

// ---------------------------------------------------------------- validation

export interface StickiesProblem {
  level: "error" | "warning"
  message: string
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v)
const isNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v)
const isTime = (v: unknown) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v) && !Number.isNaN(Date.parse(v))
const SIDES = ["top", "right", "bottom", "left"]
const ENDS = ["none", "arrow"]

/** Checks a value against the spec. Errors make it invalid; warnings don't. */
export function validate(doc: unknown): StickiesProblem[] {
  const out: StickiesProblem[] = []
  const error = (message: string) => out.push({ level: "error", message })
  const warn = (message: string) => out.push({ level: "warning", message })
  const checkSource = (source: unknown, at: string) => {
    if (!isObject(source)) return error(`"${at}" must be an object.`)
    for (const key of ["app", "url", "id"]) if (source[key] !== undefined && typeof source[key] !== "string") error(`${at}.${key} must be a string.`)
  }

  if (!isObject(doc)) {
    error("The document must be a JSON object.")
    return out
  }
  if (typeof doc.stickies !== "string") error('Missing "stickies": the version, as a string like "0.1".')
  else if (!/^0\.\d+$/.test(doc.stickies)) warn(`Version "${doc.stickies}" isn't a 0.x version.`)
  if (doc.source !== undefined) checkSource(doc.source, "source")

  if (!Array.isArray(doc.nodes)) {
    error('Missing "nodes": an array of notes.')
    return out
  }
  const ids = new Set<string>()
  doc.nodes.forEach((node: unknown, i: number) => {
    const at = `nodes[${i}]`
    if (!isObject(node)) return error(`${at} must be an object.`)
    if (typeof node.id !== "string" || !node.id) error(`${at} needs an "id" string.`)
    else if (ids.has(node.id)) error(`${at}: the id "${node.id}" is used twice.`)
    else ids.add(node.id)
    if (typeof node.type !== "string") error(`${at} needs a "type", "text" for a note.`)
    for (const key of ["x", "y", "width", "height"]) if (!isNumber(node[key])) error(`${at} needs a number for "${key}".`)
    if (isNumber(node.width) && node.width <= 0) error(`${at}: "width" must be more than 0.`)
    if (isNumber(node.height) && node.height <= 0) error(`${at}: "height" must be more than 0.`)
    if (node.color !== undefined && !(typeof node.color === "string" && /^(#[0-9A-Fa-f]{6}|[1-6])$/.test(node.color)))
      error(`${at}: "color" must be a hex like "#fdf6c8", or "1" to "6".`)
    if (node.type !== "text") return

    if (typeof node.text !== "string") error(`${at} needs a "text" string.`)
    if (node.colorName !== undefined) {
      if (typeof node.colorName !== "string") error(`${at}: "colorName" must be a string.`)
      else if (!isStickyColor(node.colorName)) warn(`${at}: "${node.colorName}" isn't a standard colour name.`)
    }
    if (node.state !== undefined && !STICKY_STATES.some((s) => s === node.state)) warn(`${at}: unknown state "${String(node.state)}" will be read as open.`)
    if (node.author !== undefined && typeof node.author !== "string") error(`${at}: "author" must be a string.`)
    for (const key of ["createdAt", "updatedAt"]) if (node[key] !== undefined && !isTime(node[key])) error(`${at}: "${key}" must be an ISO 8601 time.`)
    if (node.source !== undefined) checkSource(node.source, `${at}.source`)
    if (node.ext !== undefined) {
      if (!isObject(node.ext)) error(`${at}: "ext" must be an object.`)
      else for (const [key, value] of Object.entries(node.ext)) if (!isObject(value)) error(`${at}: ext.${key} must be an object.`)
    }
  })

  if (doc.edges !== undefined) {
    if (!Array.isArray(doc.edges)) error('"edges" must be an array.')
    else
      doc.edges.forEach((edge: unknown, i: number) => {
        const at = `edges[${i}]`
        if (!isObject(edge)) return error(`${at} must be an object.`)
        if (typeof edge.id !== "string" || !edge.id) error(`${at} needs an "id" string.`)
        for (const key of ["fromNode", "toNode"]) {
          const ref = edge[key]
          if (typeof ref !== "string") error(`${at} needs "${key}".`)
          else if (!ids.has(ref)) error(`${at}: "${key}" points at "${ref}", which isn't a node.`)
        }
        for (const key of ["fromSide", "toSide"]) if (edge[key] !== undefined && !SIDES.includes(String(edge[key]))) error(`${at}: "${key}" must be top, right, bottom or left.`)
        for (const key of ["fromEnd", "toEnd"]) if (edge[key] !== undefined && !ENDS.includes(String(edge[key]))) error(`${at}: "${key}" must be none or arrow.`)
      })
  }
  return out
}

/** Reads a document from JSON text or a parsed value. Null when it isn't a valid Stickies document. */
export function parseDocument(input: unknown): StickiesDocument | null {
  let value: unknown = input
  if (typeof input === "string") {
    if (input.length > 1_000_000) return null
    try {
      value = JSON.parse(input)
    } catch {
      return null
    }
  }
  if (validate(value).some((p) => p.level === "error")) return null
  return value as StickiesDocument
}

// ---------------------------------------------------------------- clipboard versions

/** Top to bottom, then left to right; notes within half a note's height of each other share a row. */
export function readingOrder<T extends Pick<StickyNoteData, "x" | "y">>(notes: T[]): T[] {
  const row = STICKY_DEFAULT_SIZE.height / 2
  return [...notes].sort((a, b) => Math.round(a.y / row) - Math.round(b.y / row) || a.x - b.x)
}

/** The plain-text version: each note's text, separated by a blank line. */
export const toText = (notes: StickyNoteData[]) =>
  readingOrder(notes)
    .map((n) => n.text.trim())
    .filter(Boolean)
    .join("\n\n")

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

/** The HTML version: coloured boxes with inline styles, carrying the whole document in `data-stickies`. */
export function toHtml(doc: StickiesDocument): string {
  const boxes = readingOrder(notesOf(doc)).map((n) => {
    const named = isStickyColor(n.colorName) ? STICKY_PALETTE[n.colorName] : null
    const paper = named?.paper ?? (n.color?.startsWith("#") ? n.color : STICKY_PALETTE.yellow.paper)
    const { ink, edge } = named ?? STICKY_PALETTE.yellow
    const mark = stateOf(n) === "done" ? "✓ " : ""
    const style = `background:${paper};color:${ink};border:1px solid ${edge};padding:12px 14px;border-radius:8px;width:${Math.round(n.width)}px;max-width:100%;box-sizing:border-box;margin:0 0 8px;font:14px/1.45 -apple-system,system-ui,sans-serif`
    return `<div style="${style}">${mark}${escapeHtml(n.text.trim()).replace(/\n/g, "<br>")}</div>`
  })
  return `<div data-stickies="${escapeHtml(JSON.stringify(doc))}">${boxes.join("")}</div>`
}

/** The document carried in pasted HTML's `data-stickies`, wherever the element sits. */
export function fromHtml(html: string): StickiesDocument | null {
  if (!html.includes("data-stickies")) return null
  if (typeof DOMParser !== "undefined") {
    const el = new DOMParser().parseFromString(html, "text/html").querySelector("[data-stickies]")
    return parseDocument(el?.getAttribute("data-stickies") ?? "")
  }
  const match = /data-stickies="([^"]*)"/.exec(html)
  if (!match) return null
  const raw = match[1].replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&amp;/g, "&")
  return parseDocument(raw)
}

/** Plain text as notes: one per paragraph, laid out in rows. */
export function fromText(text: string, columns = 4): StickyNoteData[] {
  const gap = 40
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, 200)
    .map((p, i) =>
      createNote({
        text: p,
        x: (i % columns) * (STICKY_DEFAULT_SIZE.width + gap),
        y: Math.floor(i / columns) * (STICKY_DEFAULT_SIZE.height + gap),
      }),
    )
}

/**
 * Notes ready to add to a board: new IDs (the old one kept in `source.id`), and moved
 * together so the group's top-left corner is at `at`.
 */
export function placeNotes(notes: StickyNoteData[], at: { x: number; y: number }, source?: StickiesSource): StickyNoteData[] {
  if (notes.length === 0) return []
  const left = Math.min(...notes.map((n) => n.x))
  const top = Math.min(...notes.map((n) => n.y))
  return notes.map(({ id, ...n }) =>
    createNote({
      ...n,
      x: Math.round(at.x + n.x - left),
      y: Math.round(at.y + n.y - top),
      source: { ...source, ...n.source, id: n.source?.id ?? id },
    }),
  )
}

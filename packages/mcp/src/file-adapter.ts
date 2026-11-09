import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import { dirname, extname, isAbsolute, relative, resolve } from "node:path"
import {
  STICKIES_VERSION,
  changeNote,
  createNote,
  isNote,
  validate,
  type StickiesDocument,
  type StickyNoteData,
} from "../../../apps/www/registry/stickies/lib/stickies-format.ts"
import type { BoardAdapter, NoteInput, NotePatch } from "./adapter.ts"
import { nextSpots } from "./layout.ts"

/** The spec suggests a limit (§10); past this, adding is refused. */
const MAX_NODES = 1000

export interface FileAdapterOptions {
  /** The project folder. Boards can't be outside it. */
  root: string
  /** The default board, relative to `root`. */
  file: string
  /** Who new notes are by, when the agent doesn't say. */
  author?: string
}

/** Notes in a `.canvas` (or `.json`) file. A Stickies document is valid JSON Canvas, so Obsidian opens it. */
export function fileAdapter(options: FileAdapterOptions): BoardAdapter {
  const root = resolve(options.root)
  const queues = new Map<string, Promise<unknown>>()

  const pathOf = (board?: string) => {
    const path = resolve(root, board ?? options.file)
    const rel = relative(root, path)
    if (rel.startsWith("..") || isAbsolute(rel)) throw new Error(`"${board}" is outside the project folder.`)
    if (![".canvas", ".json"].includes(extname(path))) throw new Error(`"${board}" must be a .canvas or .json file.`)
    return path
  }

  async function read(path: string): Promise<StickiesDocument> {
    let raw: string
    try {
      raw = await readFile(path, "utf8")
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return { stickies: STICKIES_VERSION, nodes: [], edges: [] }
      throw e
    }
    let value: unknown
    try {
      value = JSON.parse(raw)
    } catch {
      throw new Error(`${relative(root, path)} isn't valid JSON, so it was left alone.`)
    }
    // A plain JSON Canvas file (from Obsidian, say) becomes a Stickies document by gaining a version.
    if (typeof value === "object" && value !== null && !Array.isArray(value) && !("stickies" in value)) {
      value = { stickies: STICKIES_VERSION, ...value }
    }
    const errors = validate(value).filter((p) => p.level === "error")
    if (errors.length) {
      const list = errors.slice(0, 3).map((p) => p.message).join(" ")
      throw new Error(`${relative(root, path)} isn't a valid Stickies document, so it was left alone. ${list}`)
    }
    return value as StickiesDocument
  }

  async function write(path: string, doc: StickiesDocument) {
    await mkdir(dirname(path), { recursive: true })
    const temp = `${path}.${process.pid}.tmp`
    await writeFile(temp, `${JSON.stringify(doc, null, 2)}\n`)
    await rename(temp, path)
  }

  /** Runs changes to one file one at a time, reading it fresh each time so outside edits are kept. */
  function change<T>(board: string | undefined, fn: (doc: StickiesDocument) => T): Promise<T> {
    const path = pathOf(board)
    const run = (queues.get(path) ?? Promise.resolve()).catch(() => {}).then(async () => {
      const doc = await read(path)
      const before = JSON.stringify(doc)
      const result = fn(doc)
      if (JSON.stringify(doc) !== before) await write(path, doc)
      return result
    })
    queues.set(path, run)
    return run
  }

  return {
    async list(board) {
      return read(pathOf(board))
    },

    add(notes, board) {
      return change(board, (doc) => {
        if (doc.nodes.length + notes.length > MAX_NODES) throw new Error(`A board can hold up to ${MAX_NODES} notes.`)
        const spots = nextSpots(doc.nodes, notes.filter((n) => n.x === undefined || n.y === undefined).length)
        let spot = 0
        const added = notes.map((input) => {
          const place = input.x === undefined || input.y === undefined ? spots[spot++] : null
          return createNote({
            ...defined(input),
            author: input.author ?? options.author,
            x: input.x ?? place?.x ?? 0,
            y: input.y ?? place?.y ?? 0,
          })
        })
        for (const note of added) if (note.author === undefined) delete note.author
        doc.nodes.push(...added)
        return added
      })
    },

    update(patches, board) {
      return change(board, (doc) => {
        const updated: StickyNoteData[] = []
        const missing: string[] = []
        for (const { id, ...patch } of patches) {
          const i = doc.nodes.findIndex((n) => n.id === id)
          const node = doc.nodes[i]
          if (!node || !isNote(node)) {
            missing.push(id)
            continue
          }
          const fields: Partial<StickyNoteData> = defined(patch)
          if (patch.ext) fields.ext = { ...node.ext, ...patch.ext }
          doc.nodes[i] = changeNote(node, fields)
          updated.push(doc.nodes[i] as StickyNoteData)
        }
        return { updated, missing }
      })
    },

    remove(ids, board) {
      return change(board, (doc) => {
        const found = new Set(doc.nodes.filter((n) => ids.includes(n.id) && isNote(n)).map((n) => n.id))
        doc.nodes = doc.nodes.filter((n) => !found.has(n.id))
        doc.edges = doc.edges?.filter((e) => !found.has(e.fromNode) && !found.has(e.toNode))
        return { removed: [...found], missing: ids.filter((id) => !found.has(id)) }
      })
    },
  }
}

/** The fields that were given, so leaving one out never clears it. */
function defined<T extends NoteInput | Omit<NotePatch, "id">>(input: T): Partial<StickyNoteData> {
  return Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined)) as Partial<StickyNoteData>
}

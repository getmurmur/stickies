import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js"
import { z } from "zod"
import {
  STICKY_COLORS,
  STICKY_STATES,
  isStickyColor,
  notesOf,
  stateOf,
  toDocument,
  type StickyNoteData,
} from "../../../apps/www/registry/stickies/lib/stickies-format.ts"
import type { BoardAdapter } from "./adapter.ts"

export const VERSION = "0.1.1"

const INSTRUCTIONS = `Sticky notes for the person you're working with, in the open Stickies format (stickies.live).
Leave a note when there's something they should see later: a blocker, a decision, a question, or work you've finished.
Keep each note to one idea, in a few words or one short sentence.
Use "state" for progress ("progress", then "done"), never colour. Tick off notes when the work is finished.
Set "author" to your own name (for example "Claude Code" or "Codex") on notes you add, unless the person asks for another.`

const board = z.string().optional().describe("Which board. Leave out for the default.")
const colorName = z.enum(STICKY_COLORS).describe("Display only. Never use colour to mean progress.")
const state = z.enum(STICKY_STATES).describe('"open" (or left out), "progress", or "done".')
const ext = z.record(z.string(), z.record(z.string(), z.unknown())).describe("App-specific data, keyed by app name.")
const position = {
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
}

/** A note without the hex when its colour has a name, to keep replies short. Still valid Stickies. */
function compact(note: StickyNoteData): StickyNoteData {
  if (!isStickyColor(note.colorName)) return note
  const { color: _hex, ...rest } = note
  return rest
}

const reply = (value: unknown, extra?: string): CallToolResult => ({
  content: [{ type: "text", text: JSON.stringify(value) }, ...(extra ? [{ type: "text" as const, text: extra }] : [])],
})

const failure = (e: unknown): CallToolResult => ({
  isError: true,
  content: [{ type: "text", text: e instanceof Error ? e.message : String(e) }],
})

/** Names for clients that report no title. */
const CLIENT_NAMES: Record<string, string> = { "claude-code": "Claude Code", codex: "Codex", "codex-mcp-client": "Codex" }

export interface ServerOptions {
  /** The author set with --author. Without it, notes an agent leaves unsigned are signed with its app's name. */
  author?: string
}

export function createServer(adapter: BoardAdapter, options: ServerOptions = {}): McpServer {
  const server = new McpServer({ name: "stickies", version: VERSION }, { instructions: INSTRUCTIONS })

  /** The connected app's name, as it reports it: "Claude Code", say. */
  const clientAuthor = (): string | undefined => {
    const client = server.server.getClientVersion()
    if (!client) return undefined
    return client.title || CLIENT_NAMES[client.name] || client.name || undefined
  }

  server.registerTool(
    "list_notes",
    {
      title: "List notes",
      description: "Read the sticky notes on a board, as a Stickies document.",
      inputSchema: {
        board,
        state: state.optional().describe("Only notes in this state."),
        limit: z.number().int().min(1).max(1000).optional().describe("At most this many notes. Default 100."),
      },
      annotations: { readOnlyHint: true },
    },
    async (args) => {
      try {
        const doc = await adapter.list(args.board)
        const all = notesOf(doc).filter((n) => !args.state || stateOf(n) === args.state)
        const shown = all.slice(0, args.limit ?? 100)
        const out = toDocument(shown, { source: doc.source, edges: doc.edges })
        const more = all.length - shown.length
        return reply(
          { ...out, nodes: shown.map(compact) },
          more > 0 ? `${more} more notes not shown. Raise "limit" or filter by "state".` : undefined,
        )
      } catch (e) {
        return failure(e)
      }
    },
  )

  server.registerTool(
    "add_notes",
    {
      title: "Add notes",
      description: "Put sticky notes on a board. Only text is needed; notes are placed below what's already there.",
      inputSchema: {
        board,
        notes: z
          .array(
            z.object({
              text: z.string().min(1).describe("One idea: a few words, or one short sentence. Markdown."),
              colorName: colorName.optional(),
              state: state.optional(),
              author: z.string().optional().describe('Who wrote it: your own name, like "Claude Code" or "Codex".'),
              ...position,
              ext: ext.optional(),
            }),
          )
          .min(1)
          .max(200),
      },
    },
    async (args) => {
      try {
        const fallback = options.author ? undefined : clientAuthor()
        const notes = fallback ? args.notes.map((n) => (n.author ? n : { ...n, author: fallback })) : args.notes
        const added = await adapter.add(notes, args.board)
        return reply(added.map(compact))
      } catch (e) {
        return failure(e)
      }
    },
  )

  server.registerTool(
    "update_notes",
    {
      title: "Update notes",
      description: 'Change notes by ID: their text, colour, position, or state. Set state to "done" to tick a note off.',
      inputSchema: {
        board,
        notes: z
          .array(
            z.object({
              id: z.string(),
              text: z.string().min(1).optional(),
              colorName: colorName.optional(),
              state: state.optional(),
              author: z.string().optional(),
              ...position,
              ext: ext.optional().describe("Merged with the note's own, by app name."),
            }),
          )
          .min(1)
          .max(200),
      },
    },
    async (args) => {
      try {
        const { updated, missing } = await adapter.update(args.notes, args.board)
        return reply({ updated: updated.map(compact), ...(missing.length ? { missing } : {}) })
      } catch (e) {
        return failure(e)
      }
    },
  )

  server.registerTool(
    "remove_notes",
    {
      title: "Remove notes",
      description: 'Delete notes by ID, with any arrows to them. To mark work finished, set state to "done" instead.',
      inputSchema: { board, ids: z.array(z.string()).min(1).max(1000) },
      annotations: { destructiveHint: true },
    },
    async (args) => {
      try {
        const { removed, missing } = await adapter.remove(args.ids, args.board)
        return reply({ removed, ...(missing.length ? { missing } : {}) })
      } catch (e) {
        return failure(e)
      }
    },
  )

  return server
}

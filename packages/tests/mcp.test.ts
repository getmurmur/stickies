import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { validate, type StickiesDocument, type StickyNoteData } from "../../apps/www/registry/stickies/lib/stickies-format"

// Starts the real server over stdio, as an agent would, in a fresh project folder.
const SERVER = join(import.meta.dir, "../mcp/src/index.ts")

let root: string
let client: Client

async function connect(...args: string[]) {
  return connectAs({ name: "test", version: "0" }, ...args)
}

async function connectAs(info: { name: string; version: string; title?: string }, ...args: string[]) {
  client = new Client(info)
  await client.connect(new StdioClientTransport({ command: "node", args: [SERVER, "--root", root, ...args], stderr: "pipe" }))
}

async function call(name: string, args: Record<string, unknown>) {
  const result = await client.callTool({ name, arguments: args })
  const content = result.content as { type: string; text: string }[]
  return { error: result.isError === true, text: content.map((c) => c.text), json: () => JSON.parse(content[0].text) }
}

const board = (file = "stickies.canvas"): StickiesDocument => JSON.parse(readFileSync(join(root, file), "utf8"))

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "stickies-mcp-"))
})

afterEach(async () => {
  await client?.close()
  rmSync(root, { recursive: true, force: true })
})

describe("the MCP server, with a file board", () => {
  test("offers four tools", async () => {
    await connect()
    const { tools } = await client.listTools()
    expect(tools.map((t) => t.name).sort()).toEqual(["add_notes", "list_notes", "remove_notes", "update_notes"])
  })

  test("adds notes to a new file, laid out in rows of four, as a valid document", async () => {
    await connect("--author", "Claude Code")
    const added: StickyNoteData[] = (await call("add_notes", { notes: [1, 2, 3, 4, 5].map((i) => ({ text: `Note ${i}` })) })).json()
    expect(added).toHaveLength(5)
    expect(added[0].author).toBe("Claude Code")
    expect(added.map((n) => [n.x, n.y])).toEqual([[0, 0], [280, 0], [560, 0], [840, 0], [0, 200]])

    const doc = board()
    expect(validate(doc).filter((p) => p.level === "error")).toEqual([])
    expect(doc.nodes[0]).toMatchObject({ type: "text", colorName: "yellow", color: "#fdf6c8", width: 240, height: 160 })

    // A second batch goes below the first.
    const [next]: StickyNoteData[] = (await call("add_notes", { notes: [{ text: "Later", state: "progress", author: "Me" }] })).json()
    expect(next).toMatchObject({ x: 0, y: 440, state: "progress", author: "Me" })
  })

  test("signs unsigned notes with the agent's app, unless --author or the agent says otherwise", async () => {
    await connectAs({ name: "claude-code", title: "Claude Code", version: "2" })
    const [mine, theirs]: StickyNoteData[] = (await call("add_notes", { notes: [{ text: "Unsigned" }, { text: "Signed", author: "Me" }] })).json()
    expect(mine.author).toBe("Claude Code")
    expect(theirs.author).toBe("Me")
    await client.close()

    // No title: a known name gets its usual one.
    await connectAs({ name: "codex-mcp-client", version: "1" })
    const [codex]: StickyNoteData[] = (await call("add_notes", { notes: [{ text: "From Codex" }] })).json()
    expect(codex.author).toBe("Codex")
    await client.close()

    // --author wins over the app's name.
    await connectAs({ name: "claude-code", title: "Claude Code", version: "2" }, "--author", "Night shift")
    const [night]: StickyNoteData[] = (await call("add_notes", { notes: [{ text: "Overnight" }] })).json()
    expect(night.author).toBe("Night shift")
  })

  test("lists notes, filtered by state and limited", async () => {
    await connect()
    await call("add_notes", { notes: [{ text: "A" }, { text: "B", state: "done" }, { text: "C" }, { text: "D" }] })

    const done = (await call("list_notes", { state: "done" })).json()
    expect(done.stickies).toBe("0.1")
    expect(done.nodes.map((n: StickyNoteData) => n.text)).toEqual(["B"])

    const open = await call("list_notes", { state: "open", limit: 2 })
    expect(open.json().nodes).toHaveLength(2)
    expect(open.text[1]).toContain("1 more")
  })

  test("updates notes, ticks them off, merges extensions, and reports unknown IDs", async () => {
    await connect()
    const [note]: StickyNoteData[] = (await call("add_notes", { notes: [{ text: "Migrate", ext: { app: { a: 1 } } }] })).json()

    const result = (await call("update_notes", { notes: [{ id: note.id, state: "done", ext: { other: { b: 2 } } }, { id: "nope", text: "x" }] })).json()
    expect(result.missing).toEqual(["nope"])
    expect(result.updated[0]).toMatchObject({ text: "Migrate", state: "done", ext: { app: { a: 1 }, other: { b: 2 } } })

    await call("update_notes", { notes: [{ id: note.id, state: "open", colorName: "blue" }] })
    const saved = board().nodes[0] as StickyNoteData
    expect(saved.state).toBeUndefined()
    expect(saved).toMatchObject({ colorName: "blue", color: "#ddedfb" })
  })

  test("removes notes and the arrows to them", async () => {
    writeFileSync(
      join(root, "stickies.canvas"),
      JSON.stringify({
        stickies: "0.1",
        nodes: [
          { id: "a", type: "text", text: "A", x: 0, y: 0, width: 240, height: 160 },
          { id: "b", type: "text", text: "B", x: 280, y: 0, width: 240, height: 160 },
        ],
        edges: [{ id: "e", fromNode: "a", toNode: "b" }],
      }),
    )
    await connect()
    expect((await call("remove_notes", { ids: ["a", "zzz"] })).json()).toEqual({ removed: ["a"], missing: ["zzz"] })
    expect(board()).toMatchObject({ nodes: [{ id: "b" }], edges: [] })
  })

  test("keeps what it doesn't know in an Obsidian canvas", async () => {
    const canvas = {
      nodes: [
        { id: "f", type: "file", file: "notes/plan.md", x: 0, y: 0, width: 400, height: 400 },
        { id: "t", type: "text", text: "Idea", x: 500, y: 0, width: 240, height: 160, color: "4", ext: { obsidian: { pinned: true } } },
      ],
      edges: [{ id: "e", fromNode: "f", toNode: "t", label: "leads to" }],
      custom: "kept",
    }
    writeFileSync(join(root, "plan.canvas"), JSON.stringify(canvas))
    await connect()

    const listed = (await call("list_notes", { board: "plan.canvas" })).json()
    expect(listed.nodes.map((n: StickyNoteData) => n.id)).toEqual(["t"])
    expect(listed.nodes[0].color).toBe("4")

    await call("update_notes", { board: "plan.canvas", notes: [{ id: "t", state: "progress" }] })
    const saved = board("plan.canvas")
    expect(saved).toMatchObject({ stickies: "0.1", custom: "kept", edges: canvas.edges })
    expect(saved.nodes[0]).toEqual(canvas.nodes[0])
    expect(saved.nodes[1]).toMatchObject({ state: "progress", color: "4", ext: { obsidian: { pinned: true } } })
  })

  test("refuses boards outside the project, and leaves broken files alone", async () => {
    writeFileSync(join(root, "broken.canvas"), "{ not json")
    await connect()

    const outside = await call("add_notes", { board: "../elsewhere.canvas", notes: [{ text: "x" }] })
    expect(outside.error).toBe(true)
    expect(outside.text[0]).toContain("outside the project")

    const wrongType = await call("add_notes", { board: "notes.md", notes: [{ text: "x" }] })
    expect(wrongType.error).toBe(true)

    const broken = await call("add_notes", { board: "broken.canvas", notes: [{ text: "x" }] })
    expect(broken.error).toBe(true)
    expect(readFileSync(join(root, "broken.canvas"), "utf8")).toBe("{ not json")
  })

  test("handles calls that arrive together without losing notes", async () => {
    await connect()
    await Promise.all([1, 2, 3, 4, 5, 6].map((i) => call("add_notes", { notes: [{ text: `N${i}` }] })))
    expect(board().nodes).toHaveLength(6)
    expect(existsSync(join(root, `stickies.canvas.${process.pid}.tmp`))).toBe(false)
  })
})

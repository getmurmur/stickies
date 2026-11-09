import { describe, expect, test } from "bun:test"
import { execFileSync } from "node:child_process"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import {
  changeNote,
  createNote,
  fromHtml,
  fromObsidianCanvas,
  fromText,
  notesOf,
  parseDocument,
  placeNotes,
  readingOrder,
  shownColorOf,
  stateOf,
  toDocument,
  toHtml,
  toObsidianCanvas,
  toText,
  validate,
} from "../../apps/www/registry/stickies/lib/stickies-format"

const FIXTURES = join(import.meta.dir, "fixtures")
const SCRIPT = join(import.meta.dir, "../../skills/stickies/scripts/stickies.mjs")
const fixtures = readdirSync(FIXTURES).filter((f) => f.endsWith(".json"))

describe("validation agrees with the skill's script", () => {
  for (const file of fixtures) {
    test(file, () => {
      const path = join(FIXTURES, file)
      const ours = validate(JSON.parse(readFileSync(path, "utf8")))
      let scriptValid = true
      let output = ""
      try {
        output = execFileSync("node", [SCRIPT, "validate", path], { encoding: "utf8" })
      } catch (e) {
        scriptValid = false
        output = String((e as { stdout?: string }).stdout ?? "")
      }
      const ourErrors = ours.filter((p) => p.level === "error").length
      expect(ourErrors === 0).toBe(scriptValid)
      expect(file.startsWith("valid-")).toBe(scriptValid)
      // Same number of errors from both.
      expect(output.split("\n").filter((l) => l.startsWith("error:")).length).toBe(ourErrors)
    })
  }
})

describe("documents", () => {
  test("a made note is a valid document", () => {
    const doc = toDocument([createNote({ text: "Hello", colorName: "blue", state: "done" })], { source: { app: "Test" } })
    expect(validate(doc).filter((p) => p.level === "error")).toEqual([])
    expect(notesOf(doc)[0].color).toBe("#ddedfb")
  })

  test("parseDocument refuses broken JSON and invalid documents", () => {
    expect(parseDocument("{")).toBeNull()
    expect(parseDocument({ stickies: "0.1" })).toBeNull()
    expect(parseDocument(readFileSync(join(FIXTURES, "valid-minimal.json"), "utf8"))).not.toBeNull()
  })

  test("changeNote moves updatedAt on, keeps color with colorName, and drops open", () => {
    const note = createNote({ text: "a", updatedAt: "2020-01-01T00:00:00Z", state: "done" })
    const next = changeNote(note, { colorName: "pink", state: "open" })
    expect(next.updatedAt).not.toBe("2020-01-01T00:00:00Z")
    expect(next.color).toBe("#fbe1ed")
    expect(next.state).toBeUndefined()
  })

  test("unknown states read as open; semantic colour follows state", () => {
    expect(stateOf({ state: "wip" })).toBe("open")
    expect(shownColorOf({ colorName: "pink", state: "progress" }, true)).toBe("blue")
    expect(shownColorOf({ colorName: "pink", state: "progress" }, false)).toBe("pink")
    expect(shownColorOf({ colorName: "teal" })).toBe("yellow")
  })
})

describe("clipboard versions", () => {
  const notes = [
    createNote({ id: "b", text: "Right", x: 300, y: 10 }),
    createNote({ id: "a", text: "Left", x: 0, y: 0 }),
    createNote({ id: "c", text: "Below <b>&</b>", x: 0, y: 200, state: "done" }),
  ]

  test("reading order is rows, then left to right", () => {
    expect(readingOrder(notes).map((n) => n.id)).toEqual(["a", "b", "c"])
  })

  test("plain text is each note, separated by a blank line", () => {
    expect(toText(notes)).toBe("Left\n\nRight\n\nBelow <b>&</b>")
  })

  test("HTML escapes the words and carries the whole document", () => {
    const doc = toDocument(notes)
    const html = toHtml(doc)
    expect(html).toContain("Below &lt;b&gt;&amp;&lt;/b&gt;")
    expect(html).toContain("✓ ")
    expect(fromHtml(html)).toEqual(doc)
    // Browsers wrap pasted HTML; the document is found wherever it sits.
    expect(fromHtml(`<html><head></head><body><meta charset="utf-8">${html}</body></html>`)).toEqual(doc)
    expect(fromHtml("<p>nothing here</p>")).toBeNull()
  })

  test("plain text pastes as one note per paragraph", () => {
    const pasted = fromText("One\n\nTwo\nstill two\n\n\nThree")
    expect(pasted.map((n) => n.text)).toEqual(["One", "Two\nstill two", "Three"])
    expect(new Set(pasted.map((n) => n.id)).size).toBe(3)
  })

  test("placed notes get new IDs, keep their old one in source, and keep their spacing", () => {
    const placed = placeNotes(notes, { x: 1000, y: 500 }, { app: "Elsewhere" })
    expect(placed.map((n) => n.id)).not.toContain("a")
    expect(placed.find((n) => n.text === "Left")).toMatchObject({ x: 1000, y: 500, source: { id: "a", app: "Elsewhere" } })
    expect(placed.find((n) => n.text === "Right")).toMatchObject({ x: 1300, y: 510 })
  })
})

describe("Obsidian's canvas clipboard", () => {
  // As Obsidian 1.13 copies two cards and the arrow between them: nodes, edges and a center.
  const copied = JSON.stringify({
    nodes: [
      { id: "a1", type: "text", text: "Plain card", x: 0, y: 0, width: 250, height: 60 },
      { id: "b2", type: "text", text: "Red card", x: 300, y: 0, width: 250, height: 60, color: "1" },
      { id: "c3", type: "file", file: "Notes/Idea.md", x: 0, y: 200, width: 400, height: 300 },
    ],
    edges: [{ id: "e1", fromNode: "a1", fromSide: "right", toNode: "b2", toSide: "left" }],
    center: { x: 275, y: 250 },
  })

  test("Obsidian's cards read as a document, with numbered colours named", () => {
    const doc = fromObsidianCanvas(copied)
    expect(doc).not.toBeNull()
    const notes = notesOf(doc!)
    expect(notes.map((n) => n.text)).toEqual(["Plain card", "Red card"])
    expect(notes[1].colorName).toBe("pink")
    expect(notes[1].color).toBe("#fbe1ed")
    // Other kinds of card are kept, not shown as notes.
    expect(doc!.nodes).toHaveLength(3)
    expect(doc!.edges).toHaveLength(1)
  })

  test("a document written for Obsidian comes back the same, with a center", () => {
    const doc = toDocument(
      [
        createNote({ id: "n1", text: "One", x: 0, y: 0, state: "progress", author: "George" }),
        createNote({ id: "n2", text: "Two", x: 300, y: 100, colorName: "blue" }),
      ],
      { edges: [{ id: "e1", fromNode: "n1", toNode: "n2", toEnd: "arrow" }] },
    )
    const written = JSON.parse(toObsidianCanvas(doc))
    expect(written.center).toEqual({ x: 270, y: 130 })
    const back = fromObsidianCanvas(toObsidianCanvas(doc))
    expect(notesOf(back!)).toEqual(notesOf(doc))
    expect(back!.edges).toEqual(doc.edges)
  })

  test("anything else is refused", () => {
    expect(fromObsidianCanvas("")).toBeNull()
    expect(fromObsidianCanvas("not json")).toBeNull()
    expect(fromObsidianCanvas(JSON.stringify({ edges: [] }))).toBeNull()
    expect(fromObsidianCanvas(JSON.stringify({ nodes: [{ id: "x", type: "text" }], edges: [] }))).toBeNull()
  })
})

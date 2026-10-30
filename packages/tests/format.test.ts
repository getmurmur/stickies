import { describe, expect, test } from "bun:test"
import { execFileSync } from "node:child_process"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import {
  changeNote,
  createNote,
  fromHtml,
  fromText,
  notesOf,
  parseDocument,
  placeNotes,
  readingOrder,
  shownColorOf,
  stateOf,
  toDocument,
  toHtml,
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

#!/usr/bin/env node
// Stickies helper for agents (stickies.live). No dependencies; Node 18 or later.
//
//   node stickies.mjs make <notes.json|-> [--source "App"] [--columns 4]
//   node stickies.mjs validate <doc.json|->
//   node stickies.mjs text <doc.json|->
//   node stickies.mjs html <doc.json|->
//   node stickies.mjs copy <doc.json|->      (macOS)

import { execFileSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const VERSION = "0.1"
const NOTE_W = 240
const NOTE_H = 160
const GAP = 40

/** Each named colour: the hex senders put in `color`, and the ink and edge for HTML. */
const COLORS = {
  yellow: { paper: "#fdf6c8", ink: "#3b3214", edge: "#e8d995" },
  blue: { paper: "#ddedfb", ink: "#1d3049", edge: "#abc9ea" },
  green: { paper: "#def3d7", ink: "#22391c", edge: "#a9d69c" },
  pink: { paper: "#fbe1ed", ink: "#4a1f31", edge: "#e7abc6" },
  purple: { paper: "#ede3fb", ink: "#33204d", edge: "#c5aee9" },
  grey: { paper: "#f2f2f1", ink: "#2b2b2a", edge: "#cfcfcc" },
}
const STATES = ["open", "progress", "done"]
const SIDES = ["top", "right", "bottom", "left"]
const ENDS = ["none", "arrow"]

function fail(message) {
  process.stderr.write(`${message}\n`)
  process.exit(1)
}

function readJson(path) {
  if (!path) fail("Give a file path, or - for standard input.")
  let raw
  try {
    raw = readFileSync(path === "-" ? 0 : path, "utf8")
  } catch (e) {
    fail(`Couldn't read ${path}: ${e.message}`)
  }
  try {
    return JSON.parse(raw)
  } catch (e) {
    fail(`${path} isn't valid JSON: ${e.message}`)
  }
}

function option(args, name, fallback) {
  const at = args.indexOf(name)
  if (at < 0) return fallback
  const value = args[at + 1]
  if (value === undefined) fail(`${name} needs a value.`)
  args.splice(at, 2)
  return value
}

const isObject = (v) => typeof v === "object" && v !== null && !Array.isArray(v)
const isNumber = (v) => typeof v === "number" && Number.isFinite(v)
const isTime = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v) && !Number.isNaN(Date.parse(v))

// ---------------------------------------------------------------- make

function make(input, { source, columns }) {
  if (!Array.isArray(input) || input.length === 0) fail("make needs a non-empty JSON array of notes.")
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z")
  const nodes = input.map((item, i) => {
    const given = typeof item === "string" ? { text: item } : item
    if (!isObject(given) || typeof given.text !== "string" || !given.text.trim()) fail(`Note ${i + 1} needs some text.`)
    const colorName = given.colorName ?? "yellow"
    const known = COLORS[colorName]
    const { text, state, author, ext, ...rest } = given
    const note = {
      id: typeof given.id === "string" && given.id ? given.id : `n${i + 1}`,
      type: "text",
      text: text.trim(),
      x: (i % columns) * (NOTE_W + GAP),
      y: Math.floor(i / columns) * (NOTE_H + GAP),
      width: NOTE_W,
      height: NOTE_H,
      ...(known ? { color: known.paper } : {}),
      colorName,
      ...(state && state !== "open" ? { state } : {}),
      ...(author ? { author } : {}),
      createdAt: now,
      updatedAt: now,
      ...(ext ? { ext } : {}),
    }
    // Anything else given (a position, a size, a source) wins over the defaults.
    for (const [key, value] of Object.entries(rest)) if (key !== "colorName") note[key] = value
    return note
  })
  const doc = { stickies: VERSION, ...(source ? { source: { app: source } } : {}), nodes, edges: [] }
  const problems = validate(doc).filter((p) => p.level === "error")
  if (problems.length) fail(problems.map((p) => p.message).join("\n"))
  return doc
}

// ---------------------------------------------------------------- validate

function validate(doc) {
  const out = []
  const error = (message) => out.push({ level: "error", message })
  const warn = (message) => out.push({ level: "warning", message })

  if (!isObject(doc)) {
    error("The document must be a JSON object.")
    return out
  }
  if (typeof doc.stickies !== "string") error('Missing "stickies": the version, as a string like "0.1".')
  else if (!/^0\.\d+$/.test(doc.stickies)) warn(`Version "${doc.stickies}" isn't a 0.x version this script knows.`)

  if (doc.source !== undefined) checkSource(doc.source, "source", error)

  if (!Array.isArray(doc.nodes)) {
    error('Missing "nodes": an array of notes.')
    return out
  }
  const ids = new Set()
  doc.nodes.forEach((node, i) => {
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
    else if (!node.text.trim()) warn(`${at} is empty.`)
    if (node.colorName !== undefined) {
      if (typeof node.colorName !== "string") error(`${at}: "colorName" must be a string.`)
      else if (!COLORS[node.colorName]) warn(`${at}: "${node.colorName}" isn't a standard colour name; receivers will use "color".`)
      else if (node.color === undefined) warn(`${at}: send "color" too (${COLORS[node.colorName].paper}) for apps without named colours.`)
    }
    if (node.state !== undefined && !STATES.includes(node.state)) warn(`${at}: unknown state "${node.state}" will be read as open.`)
    if (node.author !== undefined && typeof node.author !== "string") error(`${at}: "author" must be a string.`)
    for (const key of ["createdAt", "updatedAt"])
      if (node[key] !== undefined && !isTime(node[key])) error(`${at}: "${key}" must be an ISO 8601 time, like "2026-10-28T22:47:00Z".`)
    if (node.source !== undefined) checkSource(node.source, `${at}.source`, error)
    if (node.ext !== undefined) {
      if (!isObject(node.ext)) error(`${at}: "ext" must be an object.`)
      else for (const [key, value] of Object.entries(node.ext)) if (!isObject(value)) error(`${at}: ext.${key} must be an object.`)
    }
  })

  if (doc.edges !== undefined) {
    if (!Array.isArray(doc.edges)) error('"edges" must be an array.')
    else {
      const edgeIds = new Set()
      doc.edges.forEach((edge, i) => {
        const at = `edges[${i}]`
        if (!isObject(edge)) return error(`${at} must be an object.`)
        if (typeof edge.id !== "string" || !edge.id) error(`${at} needs an "id" string.`)
        else if (edgeIds.has(edge.id) || ids.has(edge.id)) error(`${at}: the id "${edge.id}" is already used.`)
        else edgeIds.add(edge.id)
        for (const key of ["fromNode", "toNode"]) {
          if (typeof edge[key] !== "string") error(`${at} needs "${key}".`)
          else if (!ids.has(edge[key])) error(`${at}: "${key}" points at "${edge[key]}", which isn't a node.`)
        }
        for (const key of ["fromSide", "toSide"]) if (edge[key] !== undefined && !SIDES.includes(edge[key])) error(`${at}: "${key}" must be top, right, bottom or left.`)
        for (const key of ["fromEnd", "toEnd"]) if (edge[key] !== undefined && !ENDS.includes(edge[key])) error(`${at}: "${key}" must be none or arrow.`)
      })
    }
  }

  const bytes = Buffer.byteLength(JSON.stringify(doc))
  if (bytes > 1_000_000) warn(`The document is ${Math.round(bytes / 1000)} KB; receivers may refuse anything over 1 MB.`)
  if (doc.nodes.length > 1000) warn(`${doc.nodes.length} nodes; receivers may refuse more than 1,000.`)
  return out
}

function checkSource(source, at, error) {
  if (!isObject(source)) return error(`"${at}" must be an object.`)
  for (const key of ["app", "url", "id"]) if (source[key] !== undefined && typeof source[key] !== "string") error(`${at}.${key} must be a string.`)
}

// ---------------------------------------------------------------- text and HTML

/** The notes top to bottom, then left to right, as the spec reads them. */
function notesInOrder(doc) {
  const notes = doc.nodes.filter((n) => isObject(n) && n.type === "text" && typeof n.text === "string")
  // Notes within half a note's height of each other count as one row.
  return notes.sort((a, b) => Math.round(a.y / (NOTE_H / 2)) - Math.round(b.y / (NOTE_H / 2)) || a.x - b.x)
}

const toText = (doc) => notesInOrder(doc).map((n) => n.text.trim()).join("\n\n")

const escape = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

function toHtml(doc) {
  const boxes = notesInOrder(doc).map((n) => {
    const named = COLORS[n.colorName]
    const paper = named?.paper ?? (typeof n.color === "string" && n.color.startsWith("#") ? n.color : COLORS.yellow.paper)
    const ink = named?.ink ?? COLORS.yellow.ink
    const edge = named?.edge ?? COLORS.yellow.edge
    const mark = n.state === "done" ? "✓ " : ""
    const style = `background:${paper};color:${ink};border:1px solid ${edge};padding:12px 14px;border-radius:8px;width:${Math.round(n.width)}px;max-width:100%;box-sizing:border-box;margin:0 0 8px;font:14px/1.45 -apple-system,system-ui,sans-serif`
    return `<div style="${style}">${mark}${escape(n.text.trim()).replace(/\n/g, "<br>")}</div>`
  })
  return `<div data-stickies="${escape(JSON.stringify(doc))}">${boxes.join("")}</div>`
}

// ---------------------------------------------------------------- copy (macOS)

// Reads the three versions from files and writes them to the pasteboard together,
// through JavaScript for Automation, which every Mac has.
const COPY_SCRIPT = `
ObjC.import("AppKit")
function run(argv) {
  const [jsonPath, htmlPath, textPath, name] = argv
  const read = (p) => $.NSString.stringWithContentsOfFileEncodingError(p, $.NSUTF8StringEncoding, null)
  const pb = name ? $.NSPasteboard.pasteboardWithName(name) : $.NSPasteboard.generalPasteboard
  pb.clearContents
  const ok = pb.setStringForType(read(jsonPath), "live.stickies.json")
    && pb.setStringForType(read(htmlPath), "public.html")
    && pb.setStringForType(read(textPath), "public.utf8-plain-text")
  return ok ? "ok" : "failed"
}
`

function copy(doc) {
  if (process.platform !== "darwin") fail("copy works on macOS only. Use text or html and hand those over instead.")
  const dir = mkdtempSync(join(tmpdir(), "stickies-"))
  try {
    const files = { json: join(dir, "doc.json"), html: join(dir, "doc.html"), text: join(dir, "doc.txt") }
    writeFileSync(files.json, JSON.stringify(doc))
    writeFileSync(files.html, toHtml(doc))
    writeFileSync(files.text, toText(doc))
    // STICKIES_PASTEBOARD names a private pasteboard, for testing without touching the clipboard.
    const args = ["-l", "JavaScript", "-e", COPY_SCRIPT, files.json, files.html, files.text]
    if (process.env.STICKIES_PASTEBOARD) args.push(process.env.STICKIES_PASTEBOARD)
    const result = execFileSync("osascript", args, { encoding: "utf8" }).trim()
    if (result !== "ok") fail("Couldn't write to the clipboard.")
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

// ---------------------------------------------------------------- main

function requireValid(doc) {
  const errors = validate(doc).filter((p) => p.level === "error")
  if (errors.length) fail(`Not a valid Stickies document:\n${errors.map((p) => `- ${p.message}`).join("\n")}`)
}

const [command, ...args] = process.argv.slice(2)
switch (command) {
  case "make": {
    const source = option(args, "--source", undefined)
    const columns = Number(option(args, "--columns", "4"))
    if (!Number.isInteger(columns) || columns < 1) fail("--columns must be a whole number, 1 or more.")
    process.stdout.write(`${JSON.stringify(make(readJson(args[0]), { source, columns }), null, 2)}\n`)
    break
  }
  case "validate": {
    const problems = validate(readJson(args[0]))
    for (const p of problems) process.stdout.write(`${p.level}: ${p.message}\n`)
    const errors = problems.filter((p) => p.level === "error").length
    process.stdout.write(errors ? `Not valid: ${errors} error${errors === 1 ? "" : "s"}.\n` : "Valid.\n")
    process.exit(errors ? 1 : 0)
  }
  case "text": {
    const doc = readJson(args[0])
    requireValid(doc)
    process.stdout.write(`${toText(doc)}\n`)
    break
  }
  case "html": {
    const doc = readJson(args[0])
    requireValid(doc)
    process.stdout.write(`${toHtml(doc)}\n`)
    break
  }
  case "copy": {
    const doc = readJson(args[0])
    requireValid(doc)
    copy(doc)
    const count = notesInOrder(doc).length
    process.stdout.write(`Copied ${count} note${count === 1 ? "" : "s"} to the clipboard as Stickies JSON, HTML and plain text.\n`)
    break
  }
  default:
    fail("Usage: stickies.mjs make|validate|text|html|copy <file|->")
}

---
name: stickies
description: Make, read and hand over sticky notes in the Stickies format (stickies.live), an open JSON format for moving sticky notes between apps. Use when someone asks for ideas, tasks or a plan "as sticky notes", "as stickies" or "on a board", wants notes they can paste into another app, wants a .canvas file for Obsidian, or gives you a Stickies or JSON Canvas file to read or change.
---

# Stickies

Stickies is an open format for sticky notes. A Stickies document is a JSON Canvas file with a few extra fields: a named colour, a state (open, in progress, done), an author, and where the note came from. Because it's JSON Canvas, Obsidian and other canvas apps can open it as is.

The full spec is at https://stickies.live/spec.md. [references/format.md](references/format.md) has everything needed to write a document.

## First, check for a notes tool

If the app you're working in has its own tools for sticky notes (for example Murmur's `add_notes`), use those when the person wants notes in that app. Use this skill when they want notes to take somewhere else: a file, the clipboard, or another app.

## Writing notes

- **One idea per note.** A few words or one short sentence. Split anything longer.
- **Colour means nothing on its own.** Use it to group related notes if that helps, or leave every note yellow. Never use colour to show progress; that's what `state` is for.
- **Set `state` only when the notes are tasks**: `progress` for what's under way, `done` for what's finished. Leave it out otherwise.
- **Lay them out in a grid**, unless the person asks for something else. Notes are 240 × 160, with 40 px between them, in rows of four. Put related notes next to each other.
- **Use arrows (`edges`) only for real order or cause**, such as "this leads to that". Don't connect everything.
- **Send both `colorName` and `color`** (the hex from the table in references/format.md).

The script below builds a valid document for you from a short list, so you rarely need to write the JSON by hand.

## The script

`scripts/stickies.mjs` needs Node 18 or later and nothing else. Every command reads a file path, or `-` for standard input.

| Command | What it does |
|---|---|
| `node scripts/stickies.mjs make notes.json` | Turns a short list into a full document: IDs, grid layout, hex colours, times. Prints the document. |
| `node scripts/stickies.mjs validate doc.json` | Checks a document against the spec. Prints problems and exits 1 if it isn't valid. |
| `node scripts/stickies.mjs text doc.json` | Prints the notes as plain text, in reading order. |
| `node scripts/stickies.mjs html doc.json` | Prints the HTML clipboard version (coloured boxes that carry the full document). |
| `node scripts/stickies.mjs copy doc.json` | macOS only. Puts the document on the clipboard as Stickies JSON, HTML and plain text at once. |

The input to `make` is either a JSON array of strings, or an array of objects with `text` and, optionally, `colorName`, `state`, `author` and `ext`:

```json
[
  { "text": "Ship the spec", "state": "progress" },
  { "text": "Write the launch post", "colorName": "blue" },
  "Ask the Obsidian community"
]
```

Add `--source "App name"` to `make` to record where the notes came from.

## Handing notes over

Pick by what the person wants to do next:

- **Paste into another app**: `make`, then `copy`. Apps that support Stickies get full notes; Notion, Google Docs and email get coloured boxes; everything else gets plain text. Tell the person it's on their clipboard.
- **Open in Obsidian or another canvas app**: save the document with a `.canvas` extension.
- **Keep as data, or for another tool**: save it as `.stickies.json`.
- **Just to read**: show them the `text` output. Don't paste raw JSON into the conversation unless they ask for it.

Always run `validate` on a document you wrote or changed by hand before handing it over.

## Reading and changing notes

- Notes are the `nodes` with `"type": "text"`. Skip other node types, but keep them when you save.
- An absent `state` means open. Treat any state you don't recognise as open.
- Keep any fields you don't understand, including everything under `ext`. Other apps rely on them surviving.
- When you change a note's text, colour or state, set `updatedAt` to now (ISO 8601 UTC).
- Don't open `source.url` or links inside notes unless the person asks you to.

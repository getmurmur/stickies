# Stickies 0.1 (draft)

A small, open format for moving sticky notes between apps by copy and paste, drag and drop, or an agent's tools.

Status: draft. Anything here can change before 1.0.

## 1. Goals

- **Works today.** A copied note pastes as readable text or a styled box into apps that have never heard of this format.
- **Keeps what matters.** Between apps that support it, a note keeps its text, colour, state, size, author and where it came from.
- **Small.** One note with just its text and position is a valid document.
- **Builds on JSON Canvas.** Every Stickies document is a valid [JSON Canvas 1.0](https://jsoncanvas.org/spec/1.0/) file, so Obsidian and other JSON Canvas tools can open it.

Not goals for 0.1: live sync, comments, permissions, or images inside notes.

## 2. Document

A Stickies document is a JSON Canvas document with one extra top-level field, `stickies`, that gives the version.

```json
{
  "stickies": "0.1",
  "source": { "app": "Murmur", "url": "murmur://conversation/c_8f2" },
  "nodes": [
    {
      "id": "n_41a",
      "type": "text",
      "text": "Sticky notes as an open standard",
      "x": 0, "y": 0, "width": 240, "height": 160,
      "color": "#fdf6c8",
      "colorName": "yellow",
      "state": "progress"
    }
  ],
  "edges": []
}
```

| Field | Required | Meaning |
|---|---|---|
| `stickies` | yes | Version of this spec, as a string. `"0.1"` for now. |
| `nodes` | yes | The notes. See §3. |
| `edges` | no | Arrows between notes, exactly as JSON Canvas defines them. |
| `source` | no | Where the notes came from. See §5. |

A receiver MUST ignore fields it doesn't know. A receiver SHOULD accept any document whose major version it knows (`0.x` for now) and do its best with the rest.

## 3. Notes

Each note is a JSON Canvas `text` node. JSON Canvas requires the first group below; this spec adds the second.

**From JSON Canvas**

| Field | Required | Meaning |
|---|---|---|
| `id` | yes | Unique within the document. Receivers SHOULD give pasted notes new IDs and keep the old one in `source.id` (§5). |
| `type` | yes | Always `"text"` for a note. Receivers SHOULD skip other node types they don't support. |
| `text` | yes | The note's contents in Markdown. Short is normal. |
| `x`, `y` | yes | Top-left position in canvas pixels. Only meaningful relative to the other notes in the document. |
| `width`, `height` | yes | Size in canvas pixels. A sender with no sizes SHOULD use 240 × 160. |
| `color` | no | A hex colour like `"#fdf6c8"`, or a JSON Canvas preset `"1"`–`"6"`. Senders SHOULD use hex. |

**Added by Stickies**

| Field | Required | Meaning |
|---|---|---|
| `colorName` | no | The named colour (§4). Takes priority over `color` for a receiver that knows the name. |
| `state` | no | `"open"`, `"progress"` or `"done"` (§6). Absent means open. |
| `author` | no | Who wrote it, as a display name. |
| `createdAt`, `updatedAt` | no | When, as ISO 8601 UTC strings, e.g. `"2026-10-28T22:47:00Z"`. |
| `source` | no | Where this one note came from, if it differs from the document's (§5). |
| `ext` | no | App-specific data (§7). |

Positions are relative. A receiver places the group wherever suits it, such as under the cursor, and keeps the notes' positions relative to each other.

## 4. Colour

Colour is for display only. It never carries meaning; that's what `state` is for.

Named colours:

| `colorName` | Suggested hex (light) |
|---|---|
| `yellow` | `#fdf6c8` |
| `blue` | `#ddedfb` |
| `green` | `#def3d7` |
| `pink` | `#fbe1ed` |
| `purple` | `#ede3fb` |
| `grey` | `#f2f2f1` |

- A sender SHOULD send both `colorName` and `color`.
- A receiver that knows the name SHOULD use its own version of that colour, including its dark-mode version, not the hex.
- A receiver that doesn't know the name, or has a different palette, SHOULD use the hex, or the nearest colour it has.
- A note with no colour is yellow.

`color` stays a hex so the document is still valid JSON Canvas. JSON Canvas's numbered presets (`"1"` red to `"6"` purple) don't match sticky-note palettes, and a number says nothing about the colour across apps.

## 5. Source

Where notes came from, so a receiver can link back ("Open in Murmur") and an app can recognise its own notes when they come back.

```json
"source": {
  "app": "Murmur",
  "url": "murmur://conversation/c_8f2/note/n_41a",
  "id": "n_41a"
}
```

| Field | Meaning |
|---|---|
| `app` | The sending app's name, for display. |
| `url` | A link back to the original. Receivers MUST NOT open it without the person asking. |
| `id` | The note's ID in the sending app. |

The document-level `source` applies to every note. A note's own `source` overrides it field by field.

## 6. State

A note can say where it is in a simple workflow:

| `state` | Meaning |
|---|---|
| `open` (or absent) | Not started, or just an idea. |
| `progress` | Being worked on. |
| `done` | Finished. |

State is kept separate from colour. A note that's done keeps its own colour; a receiver chooses how to show the state, for example a tick, a column, a strikethrough, or a colour of its own.

- A receiver that doesn't support state MUST still show the note, in its own colour.
- A receiver that only supports open and done SHOULD treat `progress` as open, and SHOULD send it back as `progress` if the note comes back unchanged.
- A receiver MUST treat an unknown state as open.

## 7. Extensions

App-specific data goes under `ext`, keyed by a short name the app owns:

```json
"ext": {
  "murmur": { "workItem": true }
}
```

- Receivers MUST ignore extensions they don't know.
- Receivers SHOULD keep unknown extensions when they store a note, and send them back on copy, so data isn't lost passing through an app.
- An extension MUST NOT change what a core field means.

Extensions that several apps adopt can move into the core in a later version.

## 8. Clipboard and drag and drop

When a person copies or drags notes, the sender puts several versions on the clipboard at once. The receiver takes the richest version it understands.

| Order | Format | Contents |
|---|---|---|
| 1 | Stickies JSON (below) | The full document. |
| 2 | `text/html` | Each note as a coloured box, with the document in a `data-stickies` attribute (§8.2). |
| 3 | `text/plain` | The notes' text (§8.3). |
| 4 | `image/png` (optional) | A picture of the notes, for image-only apps. |

### 8.1 Format names

| Platform | Name |
|---|---|
| Media type | `application/vnd.stickies+json` |
| macOS (UTI) | `live.stickies.json`, conforming to `public.json` |
| Windows | Registered clipboard format `application/vnd.stickies+json` |
| Web, async clipboard | `web application/vnd.stickies+json` (Chrome requires the `web ` prefix) |
| Web, drag and drop | `application/vnd.stickies+json` on `DataTransfer` |

### 8.2 HTML

Browsers don't let every page read custom clipboard types, so the HTML version also carries the document. The outer element has a `data-stickies` attribute with the full JSON document, HTML-escaped:

```html
<div data-stickies="{&quot;stickies&quot;:&quot;0.1&quot;,…}">
  <div style="background:#fdf6c8;color:#3b3214;padding:12px 14px;border-radius:6px;width:240px;margin:0 0 8px;font:14px/1.4 system-ui,sans-serif">
    Sticky notes as an open standard
  </div>
</div>
```

- Notes go in reading order (top to bottom, then left to right).
- Styles are inline so they survive pasting into documents and email.
- A receiver that finds `data-stickies` SHOULD use it instead of the visible HTML.

### 8.3 Plain text

Each note's text, in reading order, separated by a blank line. No markers or metadata.

### 8.4 Receiving

A receiver SHOULD:

1. Read the Stickies JSON if it's there.
2. Otherwise, look for `data-stickies` in the HTML.
3. Otherwise, fall back to its usual paste.

If the document's `source` shows it came from the receiver itself and the notes still exist, the receiver MAY offer to move or link them instead of making copies.

## 9. Agents (MCP), non-normative

The same note shape works for agent tools. An app that offers MCP tools for notes SHOULD accept and return notes in this shape, so an agent can move notes between apps without converting them. A suggested set:

| Tool | Input | Output |
|---|---|---|
| `list_notes` | an optional canvas or board ID | a Stickies document |
| `add_notes` | `notes`: an array of notes, where only `text` is required | the added notes, with IDs |
| `update_notes` | `notes`: an array with `id` plus the fields to change | the changed notes |

For tool input, `x`, `y`, `width` and `height` are optional; the app places notes itself when they're missing. Full tool definitions are for a later version.

## 10. Security

- `text` is Markdown from someone else. Receivers MUST sanitise any HTML it renders to, and MUST NOT run scripts from it.
- Receivers MUST NOT open `source.url` or links in `text` without the person asking.
- Receivers SHOULD set a size limit (for example 1 MB per document, 1,000 notes) and refuse anything larger.

## 11. Open questions

1. **Name.** "Stickies" is also the name of Apple's Stickies app. Fine for a format, but search results will be crowded, so docs should say "the Stickies format" or "stickies.live".
2. **Time format.** ISO strings are easier to read; milliseconds are what Murmur and many apps store. ISO is the current pick.
3. **More colours.** Is a seventh, such as orange, worth it? Unknown names already fall back to hex.
4. **Plain-text state.** Should done notes copy as `- [x] text` in plain text? It helps Markdown apps but adds noise everywhere else.
5. **Anchors.** Murmur notes sit beside a message (`nearNode`). Is "attached to something" general enough for the core, or should it stay an extension?
6. **Groups and frames.** JSON Canvas has `group` nodes. Should a group of notes travel as one?

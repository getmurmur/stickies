# Stickies 0.1 at a glance

The full spec is at https://stickies.live/spec.md. This is what you need to write a valid document.

## Document

```json
{
  "stickies": "0.1",
  "source": { "app": "Claude" },
  "nodes": [
    {
      "id": "n1",
      "type": "text",
      "text": "Ship the spec",
      "x": 0, "y": 0, "width": 240, "height": 160,
      "color": "#fdf6c8",
      "colorName": "yellow",
      "state": "progress",
      "createdAt": "2026-10-28T22:47:00Z",
      "updatedAt": "2026-10-28T22:47:00Z"
    }
  ],
  "edges": []
}
```

| Field | Required | Notes |
|---|---|---|
| `stickies` | yes | `"0.1"` |
| `nodes` | yes | The notes. |
| `edges` | no | Arrows: `{ "id", "fromNode", "toNode" }`, plus optional `fromSide`/`toSide` (`top`, `right`, `bottom`, `left`), `toEnd` (`arrow` or `none`) and `label`. |
| `source` | no | `{ "app", "url", "id" }`: where the notes came from. |

## A note

| Field | Required | Notes |
|---|---|---|
| `id` | yes | Unique in the document. |
| `type` | yes | `"text"` |
| `text` | yes | Markdown. Short. |
| `x`, `y` | yes | Top-left corner, in pixels. Only relative positions matter. |
| `width`, `height` | yes | Default 240 × 160. |
| `color` | no | Hex, from the table below. |
| `colorName` | no | One of the names below. |
| `state` | no | `open`, `progress` or `done`. Absent means open. |
| `author` | no | A display name. |
| `createdAt`, `updatedAt` | no | ISO 8601 UTC. |
| `source` | no | Overrides the document's `source` for this note. |
| `ext` | no | App data under the app's own key, e.g. `{ "murmur": { "workItem": true } }`. |

## Colours

| `colorName` | `color` |
|---|---|
| `yellow` | `#fdf6c8` |
| `blue` | `#ddedfb` |
| `green` | `#def3d7` |
| `pink` | `#fbe1ed` |
| `purple` | `#ede3fb` |
| `grey` | `#f2f2f1` |

A note with no colour is yellow. Colour is display only; progress goes in `state`.

## Clipboard formats

| Platform | Name |
|---|---|
| Media type | `application/vnd.stickies+json` |
| macOS | `live.stickies.json` |
| Web, async clipboard | `web application/vnd.stickies+json` |

Alongside it: `text/html` (coloured boxes, with the full document in a `data-stickies` attribute on the outer element) and `text/plain` (each note's text, separated by a blank line).

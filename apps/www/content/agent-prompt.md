Add Stickies support to this app, so sticky notes (or note-like cards) can be copied out of it and pasted into other apps, and pasted in from them.

Stickies is an open format for moving sticky notes between apps: https://stickies.live. Read https://stickies.live/llms.txt first, then the parts of the spec you need: https://stickies.live/spec.md (§3 notes, §4 colour, §6 state, §7 extensions, §8 clipboard).

What to do:

1. Find how this app represents notes, cards or stickies, and map them to Stickies notes: `id`, `text` (Markdown), `x`, `y`, `width`, `height`, `colorName` (yellow, blue, green, pink, purple or grey) with `color` as its hex, `state` (open, progress or done) only if the app tracks progress, `author` if it has one, and `createdAt`/`updatedAt` as ISO 8601. Anything only this app needs goes under `ext.<app name>`. If notes have no position, lay them out in a grid of 240 × 160 with 40px gaps.

2. Use the format library rather than writing the format by hand. In a React project with shadcn:
   `npx shadcn@latest add https://stickies.live/r/stickies-format.json`
   Otherwise copy the single file from https://github.com/getmurmur/stickies/blob/main/apps/www/registry/stickies/lib/stickies-format.ts (no dependencies). It has `toDocument`, `parseDocument`, `toHtml`, `fromHtml`, `toText`, `fromText` and `placeNotes`.

3. Copy: when the user copies selected notes (and isn't typing in a field), write all three versions in the copy event:
   - `application/vnd.stickies+json`: the document as JSON
   - `text/html`: `toHtml(document)`, coloured boxes that carry the document in `data-stickies`. Required: it's the only version every browser passes between sites.
   - `text/plain`: `toText(notes)`
   On the web, use the `copy` event's `clipboardData.setData`, not `navigator.clipboard`. In a native macOS app, write `live.stickies.json`, `public.html` and `public.utf8-plain-text` to NSPasteboard.

4. Paste: read the richest version there: the Stickies JSON, then `data-stickies` in the HTML (`fromHtml`), then, if it makes sense for this app, plain text as one note per paragraph (`fromText`). Give pasted notes new IDs and place them under the pointer, keeping their positions relative to each other (`placeNotes`). Treat unknown colours as yellow and unknown states as open. Keep anything in `ext` you don't understand.

5. If this is a React app that wants a sticky-note UI rather than its own, the components are at https://stickies.live/docs: `npx shadcn@latest add https://stickies.live/r/sticky-board.json` gives a whole board with copy and paste already working.

6. Test it both ways with https://stickies.live: select notes on its board and press ⌘C, then paste into this app; then copy notes from this app and paste onto stickies.live. Text, colour and state should survive. Also paste into an email or a doc: notes should appear as coloured boxes.

Keep changes small and in the app's existing style. Don't change how the app stores notes; this is only about the clipboard.

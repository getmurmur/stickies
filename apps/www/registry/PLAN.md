# Plan: a shadcn registry for sticky notes

A shadcn registry at stickies.live, so anyone can add sticky notes to a React app with one command:

```sh
npx shadcn@latest add https://stickies.live/r/sticky-board.json
```

Or, with the namespace set up:

```sh
npx shadcn@latest add @stickies/sticky-note
```

The registry has three jobs:

- **Spread the format.** Every app that installs the component reads and writes Stickies on the clipboard without extra work. That makes the format easy to adopt.
- **Give people Murmur-quality notes.** The paper, shadow, header and resize behaviour from Murmur, cut into parts people can rearrange.
- **Keep the hooks separate.** Anyone with their own design can take only the dragging, board state or clipboard hooks.

## Decisions

These are my recommendations. Each one is worth confirming before work starts.

1. **Styled parts, with headless hooks underneath.** shadcn users expect source they own, already styled. The hooks hold all the behaviour, so a team with its own design can use them without our markup.
2. **Icons from `lucide-react`.** Murmur's Central Icons are a paid set and can't be redistributed in a registry. Lucide is shadcn's default, so most projects already have it.
3. **Tailwind v4 and React 19**, matching current shadcn. No Tailwind v3 support.
4. **Namespace `@stickies`, served at `https://stickies.live/r/{name}.json`.**
5. **The format code is written once.** `stickies-format` is the TypeScript version of the spec, with types, serialisers and validation. The site, the components and the clipboard hook all use it. The skill's script stays plain JavaScript with no dependencies, so agents can run it anywhere. Shared test fixtures check that the two always agree.
6. **The site uses the registry itself.** The canvas on stickies.live is rebuilt from the registry's own files, so the demo is always the shipped code.
7. **Controlled or uncontrolled.** Every stateful piece accepts `value` with `onValueChange`, or `defaultValue`, as shadcn and Base UI do.

## Items

| Item | Type | What it is | Depends on |
|---|---|---|---|
| `stickies-format` | `registry:lib` | Types (`StickiesDocument`, `StickyNoteData`), the colour palette, `parseDocument`, `validate`, `toText`, `toHtml`, reading order, and conversion to and from JSON Canvas. | none |
| `stickies-theme` | `registry:item` | The six colours as `[data-sticky-color]` variables for light and dark, `--color-sticky-*` theme tokens, and a `sticky-shadow` utility. Delivered through `cssVars` and `css`. | none |
| `use-pointer-drag` | `registry:hook` | Moving and resizing with the pointer: pointer capture, zoom scale, minimum size, a lifted state, and arrow keys to nudge. Not specific to notes. | none |
| `use-sticky-notes` | `registry:hook` | Board state: add, update, remove, bring to front, select, and saving to `localStorage` (on by default; pass `persist={false}` to turn it off, or a `storageKey` to keep more than one board). | `stickies-format` |
| `use-canvas-pan` | `registry:hook` | Dragging the background to look around. Zoom comes later. | none |
| `use-stickies-clipboard` | `registry:hook` | ⌘C, ⌘X and ⌘V for selected notes. Writes Stickies JSON, HTML and plain text. Reads Stickies JSON first, then `data-stickies` in HTML, then plain text (one note per paragraph). | `stickies-format` |
| `use-list-formatting` | `registry:hook` | Murmur's typing helpers: "- " becomes a bullet, and Return continues a list. | none |
| `sticky-note` | `registry:ui` | The composable note (see below). | `stickies-theme`, `use-pointer-drag`, `use-list-formatting`, `utils`; npm `lucide-react` |
| `sticky-board` | `registry:block` | The full canvas from the demo: notes, panning, double-click to add, clipboard, saving. | all of the above |

## The note's API

```tsx
<StickyNote note={note} onNoteChange={setNote} onDelete={remove}>
  <StickyNoteHeader>
    <StickyNoteColors />
    <StickyNoteState />
    <StickyNoteClose />
  </StickyNoteHeader>
  <StickyNoteText placeholder="Write a note" />
  <StickyNoteFooter>
    <StickyNoteAuthor />
  </StickyNoteFooter>
  <StickyNoteResize />
</StickyNote>
```

- `StickyNote` provides the note and its update function to its parts through context. The parts can be left out, reordered or replaced. A note without `StickyNoteResize` doesn't resize, and one without `StickyNoteColors` keeps its colour.
- The header is the drag handle. Positioning is on by default and can be turned off (`positioned={false}`), so a note can sit in a list or a grid instead of on a canvas.
- Every part gets `className`, passes other props through, and sets `data-slot` (such as `data-slot="sticky-note-header"`), as shadcn's own components do.
- `StickyNoteState` shows open, in progress and done. With `semantic`, it also sets the displayed colour from the state, as Murmur's semantic notes do, while the note keeps its own colour. Included in the first version.
- `StickyNoteDate` exists but isn't in the default composition or the board block. Add it to the footer to show "Today, 10:53pm" from `updatedAt`, as Murmur does.

## Repo layout

```
apps/www/
  registry.json                 # the item list, written by scripts/registry.mjs, read by `shadcn build`
  registry/stickies/
    lib/stickies-format.ts
    hooks/use-pointer-drag.ts
    hooks/use-sticky-notes.ts
    hooks/use-canvas-pan.ts
    hooks/use-stickies-clipboard.ts
    hooks/use-list-formatting.ts
    ui/sticky-note.tsx
    blocks/sticky-board/…
    theme.mjs                   # the theme, once; becomes stickies-theme's css and cssVars, and theme.css
  public/r/                     # built item JSON, served at /r/{name}.json (not in git)
packages/tests/                 # format tests and the install check
```

The site imports from `registry/stickies`, so it runs the code people install.

## Status (28 October 2026)

Phases 0 to 2 and most of 3 are done: all nine items are built, served at `https://stickies.live/r/{name}.json`, documented at `/docs`, and the site runs on them.

### Spike findings

- **Web clipboard.** Tested in Chromium, WebKit and Firefox. A custom type set in a `copy` event reaches a `paste` event on the same site in all three, and on other sites in Chromium and Firefox. WebKit removes it between sites. The `web ` prefix through `navigator.clipboard` is no use: Chromium only shows it to `clipboard.read()`, WebKit returns it empty, and Firefox refuses it. HTML with `data-stickies` arrived intact every time. The spec's §8 now requires the HTML version and has the table (§8.5). `useStickiesClipboard` uses copy and paste events, and its `copy()` for buttons writes HTML and plain text only.
- **Install path.** A fresh `create-next-app` with `shadcn init` (style `base-nova`) installed `sticky-board` and everything under it: imports were rewritten to the app's aliases, `lucide-react` was added, and the theme's `cssVars` and `css`, including the nested `@utility` rules, merged into `globals.css`. The app built with strict type-checking, and Playwright checked dragging, arrow keys, resizing, colours, adding, lists, selecting, copy and paste between two boards (states and colours kept), saving across a reload, Delete, the delete confirmation, and dark mode.
- **One fix from that test:** raising a note by moving its element took focus away from it. The board now keeps each note's place in the page and stacks with `z-index` only.

### Left to do

- Ask for `@stickies` to be added to shadcn's public registry index. Until then, dependencies between items are full URLs, so installs work without editing `components.json`.
- An install check in CI (the steps above, as a script).
- A launch post.

### Later

- Zoom on the board, with the scale passed to `use-pointer-drag`.
- Arrows between notes (the format's `edges`).
- Dragging more than one note at once.
- Native drag and drop between apps, after Murmur's Tauri work proves the approach.

## Testing

- Unit tests for `stickies-format`: parsing, validation, reading order and HTML. These use the same fixtures as the skill's script.
- An install check in CI: a fresh Next app, `shadcn init`, add each item from the freshly built `public/r`, then type-check and build.
- Playwright on the site: drag, resize, add, delete, and copy and paste between two boards.
- Keyboard and screen-reader checks: Tab through notes, arrow keys to move the focused note, and sensible labels on every control.

## Murmur

Murmur keeps its own `StickyNote`, which does app-specific things: work items, dropping a note into the message box, and Tauri links. Murmur should adopt `stickies-format` for ⌘C and paste on notes, so its notes copy out in the shared format. Moving Murmur's UI onto the registry parts is an option once the parts have settled.

## Settled

1. `sticky-board` saves to `localStorage` by default.
2. The date isn't shown by default; `StickyNoteDate` is there to add.
3. Semantic notes (`semantic` on `StickyNoteState` and the board) are in the first version.
4. shadcn only. No separate npm package.

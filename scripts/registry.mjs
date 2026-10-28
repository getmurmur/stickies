// Writes registry.json (the items `shadcn build` turns into public/r/*.json) and the site's
// copy of the theme, both from registry/stickies. Run by `pnpm registry`.

import { writeFileSync } from "node:fs"
import { themeCss, themeCssVars, themeStylesheet } from "../registry/stickies/theme.mjs"

const root = new URL("../", import.meta.url)
const author = "Stickies <https://stickies.live>"
const docs = (item) => `See https://stickies.live/docs#${item} for usage.`

const items = [
  {
    name: "stickies-format",
    type: "registry:lib",
    title: "Stickies format",
    description: "The Stickies format in TypeScript: types, palette, documents, validation, and the clipboard's HTML and plain text.",
    files: [{ path: "registry/stickies/lib/stickies-format.ts", type: "registry:lib" }],
  },
  {
    name: "stickies-theme",
    type: "registry:item",
    title: "Stickies theme",
    description: "The six sticky-note colours, light and dark, as CSS variables and Tailwind tokens, and the sticky-shadow utility.",
    cssVars: themeCssVars,
    css: themeCss,
  },
  {
    name: "use-pointer-drag",
    type: "registry:hook",
    title: "usePointerDrag",
    description: "Dragging with the pointer, for moving or resizing anything, with pointer capture and zoom.",
    files: [{ path: "registry/stickies/hooks/use-pointer-drag.ts", type: "registry:hook" }],
  },
  {
    name: "use-list-formatting",
    type: "registry:hook",
    title: "useListFormatting",
    description: "Bullets and numbered lists in a plain textarea: '- ' starts a bullet and Return continues the list.",
    files: [{ path: "registry/stickies/hooks/use-list-formatting.ts", type: "registry:hook" }],
  },
  {
    name: "use-canvas-pan",
    type: "registry:hook",
    title: "useCanvasPan",
    description: "Dragging a surface to look around it.",
    files: [{ path: "registry/stickies/hooks/use-canvas-pan.ts", type: "registry:hook" }],
  },
  {
    name: "use-sticky-notes",
    type: "registry:hook",
    title: "useStickyNotes",
    description: "A board of notes: add, change, remove, stack and select them, saved to localStorage by default.",
    registryDependencies: ["@stickies/stickies-format"],
    files: [{ path: "registry/stickies/hooks/use-sticky-notes.ts", type: "registry:hook" }],
  },
  {
    name: "use-stickies-clipboard",
    type: "registry:hook",
    title: "useStickiesClipboard",
    description: "Copy, cut and paste notes in the Stickies format, so they paste into any app and come back whole.",
    registryDependencies: ["@stickies/stickies-format"],
    files: [{ path: "registry/stickies/hooks/use-stickies-clipboard.ts", type: "registry:hook" }],
  },
  {
    name: "sticky-note",
    type: "registry:ui",
    title: "Sticky note",
    description: "A composable sticky note: header to drag, colours or states, words with lists, footer, and a corner to resize.",
    dependencies: ["lucide-react"],
    registryDependencies: ["utils", "@stickies/stickies-format", "@stickies/stickies-theme", "@stickies/use-pointer-drag", "@stickies/use-list-formatting"],
    files: [{ path: "registry/stickies/ui/sticky-note.tsx", type: "registry:ui" }],
  },
  {
    name: "sticky-board",
    type: "registry:block",
    title: "Sticky board",
    description: "A full canvas of sticky notes: drag, resize, pan, double-click to add, select, copy and paste, saved to the browser.",
    registryDependencies: ["@stickies/sticky-note", "@stickies/use-sticky-notes", "@stickies/use-canvas-pan", "@stickies/use-stickies-clipboard"],
    files: [{ path: "registry/stickies/blocks/sticky-board/sticky-board.tsx", type: "registry:component" }],
  },
]

// Inside one registry, dependencies are given as URLs while @stickies isn't in shadcn's
// index, so installs work without anyone editing components.json.
const base = process.env.REGISTRY_URL ?? "https://stickies.live/r"
const resolve = (dep) => (dep.startsWith("@stickies/") ? `${base}/${dep.slice("@stickies/".length)}.json` : dep)

const registry = {
  $schema: "https://ui.shadcn.com/schema/registry.json",
  name: "stickies",
  homepage: "https://stickies.live",
  items: items.map((item) => ({
    $schema: "https://ui.shadcn.com/schema/registry-item.json",
    ...item,
    author,
    docs: docs(item.name),
    categories: ["stickies"],
    ...(item.registryDependencies ? { registryDependencies: item.registryDependencies.map(resolve) } : {}),
  })),
}

writeFileSync(new URL("registry.json", root), `${JSON.stringify(registry, null, 2)}\n`)
writeFileSync(new URL("registry/stickies/theme.css", root), themeStylesheet())
console.log(`registry.json: ${items.length} items, dependencies at ${base}`)

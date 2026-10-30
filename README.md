# Stickies

https://stickies.live

An open format for moving sticky notes between apps: copy and paste, drag and drop, and agent tools (MCP).

Every Stickies document is also a valid [JSON Canvas](https://jsoncanvas.org) file. It adds a few fields JSON Canvas doesn't have: named colours, a note's state (open, in progress, done), author, and a link back to where the note came from.

Copied notes also go on the clipboard as HTML and plain text, so they paste properly into apps that don't support the format yet.

## Use it

React components, from the registry:

```sh
npx shadcn@latest add https://stickies.live/r/sticky-board.json
```

The agent skill:

```sh
npx skills add getmurmur/stickies
```

## What's here

```
spec/              the spec, its JSON Schema, and example documents
skills/stickies/   an Agent Skill for making, checking and copying Stickies notes
apps/www/          stickies.live: the site, the docs, and the registry
  registry/        the registry's source: format library, theme, hooks, note and board
packages/tests/    tests for the format library, and the install check
```

- [spec/SPEC.md](spec/SPEC.md): the draft spec (0.1)
- [spec/schema/0.1.json](spec/schema/0.1.json): JSON Schema
- [spec/examples/](spec/examples/): example documents
- [apps/www/registry/stickies/](apps/www/registry/stickies/): the registry's source ([docs](https://stickies.live/docs))

## Working on it

A pnpm workspace. From the root:

- `pnpm dev`: the site, on port 1450.
- `pnpm build`: builds the registry, then the site.
- `pnpm registry`: writes `registry.json` and the theme from `apps/www/registry/stickies`, then builds `apps/www/public/r`.
- `pnpm test`: the format library's tests, which also check it agrees with the skill's script.
- `pnpm test:install`: installs the registry into a brand-new Next.js and shadcn app and builds it. Slow; needs the network.
- `pnpm typecheck`: every package.

Status: early draft, started by [Murmur](https://getmurmur.dev).

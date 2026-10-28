# Stickies

https://stickies.live

An open format for moving sticky notes between apps: copy and paste, drag and drop, and agent tools (MCP).

Every Stickies document is also a valid [JSON Canvas](https://jsoncanvas.org) file. It adds a few fields JSON Canvas doesn't have: named colours, a note's state (open, in progress, done), author, and a link back to where the note came from.

Copied notes also go on the clipboard as HTML and plain text, so they paste properly into apps that don't support the format yet.

- [SPEC.md](SPEC.md): the draft spec (0.1)
- [public/schema/0.1.json](public/schema/0.1.json): JSON Schema
- [examples/](examples/): example documents
- [skills/stickies/](skills/stickies/): an Agent Skill so agents can make, check and copy Stickies notes
- [registry/stickies/](registry/stickies/): a shadcn registry with a composable sticky note, a board, and hooks ([docs](https://stickies.live/docs))

## React components

```sh
npx shadcn@latest add https://stickies.live/r/sticky-board.json
```

## Working on it

- `pnpm dev`: the site, on port 1450.
- `pnpm registry`: writes `registry.json` and the theme from `registry/stickies`, then builds `public/r`. Runs before every build.
- `pnpm test`: the format library's tests, which also check it agrees with the skill's script.

Status: early draft, started from Murmur's sticky notes.

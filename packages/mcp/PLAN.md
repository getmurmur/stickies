# Plan: an MCP server for sticky notes

One MCP server that lets any agent leave, read and tick off sticky notes, always in the Stickies format, wherever the person keeps them: a file in their repo first, then Miro, then other boards.

```sh
claude mcp add stickies -- npx -y <package> --file stickies.canvas
```

## Why

- **Agents need somewhere to leave notes for people.** "Blocked: needs an API key", "Done: migrated the schema". Today that gets buried in the chat.
- **The same tools everywhere.** Agents learn one shape (spec §9), and the adapter decides where the notes land. Notes an agent writes can be pasted into any app that reads Stickies.
- **It costs nothing to run.** It runs on the person's machine with their agent. No server, no accounts, and we never hold anyone's data.

## Decisions

1. **Local, over stdio.** A hosted version comes later, only if chat apps need it.
2. **Four tools, short replies.** `list_notes`, `add_notes`, `update_notes`, `remove_notes`. Each tool definition and reply costs the agent context, so the list stays short and replies are compact JSON.
3. **The format code is written once.** The server imports `stickies-format` from the registry and is bundled into one file when published, so it never drifts from the spec.
4. **The file is a `.canvas`.** A Stickies document is valid JSON Canvas, so `stickies.canvas` opens in Obsidian as a board, and git shows its changes. The path is set with `--file`.
5. **Nothing is lost.** The server keeps fields, extensions, other node types and edges it doesn't touch, as spec §7 asks. It reads the file fresh on every call, so edits made in Obsidian or by hand aren't overwritten, and writes atomically.
6. **Agents don't do layout.** `x`, `y`, `width` and `height` are optional. New notes go in rows of four below the existing notes.
7. **State, not colour, for progress.** Tool descriptions steer agents to `state` (`open`, `progress`, `done`) and to one idea per note.

## Tools

| Tool | Input | Output |
|---|---|---|
| `list_notes` | optional `state` filter, optional `limit` (default 100) | a Stickies document, and how many notes were left out |
| `add_notes` | `notes`: an array where only `text` is required; also `colorName`, `state`, `author`, positions, `ext` | the added notes, with IDs |
| `update_notes` | `notes`: an array of `id` plus the fields to change | the changed notes, and any IDs not found |
| `remove_notes` | `ids` | the IDs removed, and any not found |

Every tool takes an optional `board`. For the file adapter it's a path inside the project; for Miro it's a board ID.

## Adapters

All adapters share one interface (`list`, `add`, `update`, `remove`), so the tools are written once.

| Adapter | Status | Notes |
|---|---|---|
| **File** | Phase 1 | A `.canvas` file in the project. Needs no account. |
| **Miro** | Phase 2 | REST API with the person's own access token. Colours map yellow → `light_yellow`, blue → `light_blue`, green → `light_green`, pink → `light_pink`, purple → `violet`, grey → `gray`. State maps to Miro tags ("In progress", "Done"), since Miro has no state field. Needs a token and a test board to build against. |
| **Others** | Later | Linear, Notion or tldraw files, if people ask. |

## Phases

1. **File adapter and the four tools.** Package, tests (including a real MCP client talking to the server over stdio), and a check in a real agent. *Done: 8 server tests pass, and Claude Code left, listed and ticked off notes in a test folder.*
2. **Miro adapter.** Once there's a token.
3. **Publish.** As `@getmurmur/stickies-mcp` (`stickies-mcp` alone is taken by an unrelated project). Publish, list in the MCP Registry, and add a section to `/docs` and `llms.txt`. *Done 9 November 2026: 0.1.0 on npm, and `io.github.getmurmur/stickies` in the MCP Registry (published with `mcp-publisher login github --token`, since the registry's device login can't see org ownership yet).*
4. **Later.** A hosted version with OAuth, if chat apps need it.

## Open questions

1. **A default author.** Should notes from an agent say who wrote them, for example `--author "Claude Code"`?
2. **Notes per repo or per branch?** One `stickies.canvas` per repo is simplest. Branch-specific boards could come later through `board`.

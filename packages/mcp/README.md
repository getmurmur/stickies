# @getmurmur/stickies-mcp

An MCP server that lets agents leave, read and tick off sticky notes for you, in the open [Stickies format](https://stickies.live/spec).

Notes go in a `stickies.canvas` file in your project. A Stickies document is valid [JSON Canvas](https://jsoncanvas.org), so the file opens in Obsidian as a board, git shows what changed, and the notes paste into any app that reads Stickies.

## Install

Claude Code:

```sh
claude mcp add stickies -- npx -y @getmurmur/stickies-mcp
```

Codex, Cursor and other MCP clients:

```json
{
  "mcpServers": {
    "stickies": { "command": "npx", "args": ["-y", "@getmurmur/stickies-mcp"] }
  }
}
```

Needs Node 22 or later. It runs on your machine: no account, no server, nothing leaves your project.

## Tools

| Tool | What it does |
|---|---|
| `list_notes` | Reads the notes on a board, as a Stickies document. Filter by `state`. |
| `add_notes` | Adds notes. Only `text` is needed; new notes are placed below the others. |
| `update_notes` | Changes notes by ID: text, colour, position or state. `state: "done"` ticks one off. |
| `remove_notes` | Deletes notes by ID, with any arrows to them. |

Every tool takes an optional `board`: another `.canvas` or `.json` file inside the project.

## Options

| Option | Default | |
|---|---|---|
| `--file <path>` | `stickies.canvas` | The default board, relative to the project. |
| `--root <dir>` | the current folder | The project folder. Boards can't be outside it. |
| `--author <name>` | none | Who new notes are by, when the agent doesn't say. For example `--author "Claude Code"`. |

## How it treats your file

- It reads the file fresh on every call, so edits made in Obsidian or by hand are never overwritten.
- It keeps everything it doesn't change: other kinds of node, arrows, and other apps' data.
- It writes atomically, and leaves a file alone if it isn't valid JSON or valid Stickies.
- A plain JSON Canvas file from Obsidian works too. It becomes a Stickies document the first time a note is added.

MIT licensed. Part of [Stickies](https://github.com/getmurmur/stickies), made by [Murmur](https://getmurmur.dev): a Mac app for thinking with Claude Code and Codex on a branching canvas.

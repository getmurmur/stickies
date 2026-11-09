#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { parseArgs } from "node:util"
import { fileAdapter } from "./file-adapter.ts"
import { VERSION, createServer } from "./server.ts"

const HELP = `An MCP server for sticky notes in the Stickies format (https://stickies.live).

Usage: stickies-mcp [options]

  --file <path>    The default board, relative to the project. Default: stickies.canvas
  --root <dir>     The project folder. Boards can't be outside it. Default: the current folder
  --author <name>  Who new notes are by, when the agent doesn't say (default: the agent's app, e.g. "Claude Code")
  --version        Print the version
  --help           Print this help
`

const { values } = parseArgs({
  options: {
    file: { type: "string", default: "stickies.canvas" },
    root: { type: "string", default: process.cwd() },
    author: { type: "string" },
    version: { type: "boolean" },
    help: { type: "boolean" },
  },
})

if (values.help) {
  process.stdout.write(HELP)
} else if (values.version) {
  process.stdout.write(`${VERSION}\n`)
} else {
  const adapter = fileAdapter({ root: values.root, file: values.file, author: values.author })
  await createServer(adapter, { author: values.author }).connect(new StdioServerTransport())
}

// Installs the registry into a brand-new app, as someone would: builds the registry against a
// local server, makes a Next.js app, runs `shadcn init`, adds `sticky-board`, and builds the
// app with strict type-checking. Slow, and needs the network for npm.
//
//   pnpm test:install            (from the repo root)

import { spawn } from "node:child_process"
import { createReadStream, existsSync, mkdtempSync, statSync, writeFileSync } from "node:fs"
import { createServer } from "node:http"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const WWW = fileURLToPath(new URL("../../../apps/www/", import.meta.url))
const PORT = 5620
const BASE = `http://localhost:${PORT}/r`
// Outside the workspace, so the new app's pnpm install is its own.
const temp = mkdtempSync(join(tmpdir(), "stickies-install-"))
const registryOut = join(temp, "registry")
const app = join(temp, "app")

/** Runs a command and waits for it without blocking, so the registry server below can answer. */
const run = (cmd, args, cwd, env = {}) =>
  new Promise((resolve, reject) => {
    console.log(`\n$ ${cmd} ${args.join(" ")}`)
    spawn(cmd, args, { cwd, stdio: "inherit", env: { ...process.env, ...env } }).on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} ${args[0]} exited with ${code}`)),
    )
  })

// The registry, with dependencies between items pointing at the local server.
await run("node", ["scripts/registry.mjs"], WWW, { REGISTRY_URL: BASE, REGISTRY_JSON: join(temp, "registry.json") })
await run("npx", ["shadcn", "build", join(temp, "registry.json"), "-o", join(registryOut, "r")], WWW)

const server = createServer((req, res) => {
  const file = join(registryOut, decodeURIComponent((req.url ?? "/").split("?")[0]))
  if (!file.startsWith(registryOut) || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404).end()
    return
  }
  res.writeHead(200, { "Content-Type": "application/json" })
  createReadStream(file).pipe(res)
}).listen(PORT)

try {
  await run("npx", ["-y", "create-next-app@latest", "app", "--ts", "--tailwind", "--app", "--no-eslint", "--no-src-dir", "--import-alias", "@/*", "--use-pnpm", "--yes", "--disable-git"], temp)
  await run("npx", ["-y", "shadcn@latest", "init", "-d", "-y"], app)
  await run("npx", ["-y", "shadcn@latest", "add", `${BASE}/sticky-board.json`, "-y"], app)
  writeFileSync(
    join(app, "app/page.tsx"),
    `"use client"

import { StickyBoard } from "@/components/sticky-board"
import { createNote } from "@/lib/stickies-format"

const notes = [createNote({ text: "Installed from the registry", x: 0, y: 0 })]

export default function Page() {
  return (
    <main className="h-screen">
      <StickyBoard defaultNotes={notes} storageKey="install-check" />
    </main>
  )
}
`,
  )
  await run("pnpm", ["build"], app)
  console.log(`\nInstall check passed. The app is in ${app}`)
} finally {
  server.close()
}

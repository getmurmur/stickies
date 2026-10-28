import { readFileSync } from "node:fs"
import { join } from "node:path"

/**
 * A file from the repo served as is, read when the site is built, so the spec and
 * the skill have one copy each: the one in the repo.
 */
export function repoFile(path: string, type: string): Response {
  return new Response(readFileSync(join(process.cwd(), path), "utf8"), {
    headers: { "Content-Type": `${type}; charset=utf-8` },
  })
}

import { readFileSync } from "node:fs"
import { join } from "node:path"

/** The repo's root: the site builds from apps/www. */
const ROOT = join(process.cwd(), "..", "..")

/**
 * A file from the repo served as is, read when the site is built, so the spec and
 * the skill have one copy each: the one in the repo. `path` is from the repo's root.
 */
export function repoFile(path: string, type: string): Response {
  return new Response(readFileSync(join(ROOT, path), "utf8"), {
    headers: { "Content-Type": `${type}; charset=utf-8` },
  })
}

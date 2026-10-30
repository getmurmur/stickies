import { repoFile } from "@/lib/repoFile"

export const dynamic = "force-static"

export function GET() {
  return repoFile("skills/stickies/references/format.md", "text/markdown")
}

import { repoFile } from "@/lib/repoFile"

export const dynamic = "force-static"

export function GET() {
  return repoFile("skills/stickies/SKILL.md", "text/markdown")
}

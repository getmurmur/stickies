import { repoFile } from "@/lib/repoFile"

export const dynamic = "force-static"

export function GET() {
  return repoFile("skills/stickies/scripts/stickies.mjs", "text/javascript")
}

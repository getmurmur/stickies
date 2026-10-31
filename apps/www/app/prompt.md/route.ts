import { repoFile } from "@/lib/repoFile"

export const dynamic = "force-static"

export function GET() {
  return repoFile("apps/www/content/agent-prompt.md", "text/markdown")
}

import { repoFile } from "@/lib/repoFile"

export const dynamic = "force-static"

export function GET() {
  return repoFile("spec/SPEC.md", "text/markdown")
}

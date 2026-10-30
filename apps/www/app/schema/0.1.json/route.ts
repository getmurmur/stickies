import { repoFile } from "@/lib/repoFile"

export const dynamic = "force-static"

export function GET() {
  return repoFile("spec/schema/0.1.json", "application/json")
}

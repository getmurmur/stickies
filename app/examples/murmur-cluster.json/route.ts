import { repoFile } from "@/lib/repoFile"

export const dynamic = "force-static"

export function GET() {
  return repoFile("examples/murmur-cluster.json", "application/json")
}

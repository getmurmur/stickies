import { HomeBoard } from "@/components/HomeBoard"
import { readRepoFile } from "@/lib/repoFile"

export default function Home() {
  return <HomeBoard prompt={readRepoFile("apps/www/content/agent-prompt.md")} />
}

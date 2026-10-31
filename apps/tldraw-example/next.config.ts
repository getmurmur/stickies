import { fileURLToPath } from "node:url"
import type { NextConfig } from "next"

// The integration's source is the registry's, in apps/www, so the repo is the root.
const config: NextConfig = {
  turbopack: { root: fileURLToPath(new URL("../..", import.meta.url)) },
  typescript: { ignoreBuildErrors: true },
}

export default config

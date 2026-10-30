import type { NextConfig } from "next"

const config: NextConfig = {
  // Types are checked by `tsc` before the build (package.json): TypeScript 7 has
  // no JavaScript API for Next's own check.
  typescript: { ignoreBuildErrors: true },
}

export default config

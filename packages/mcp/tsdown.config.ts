import { defineConfig } from "tsdown"

// One file, with the format library bundled in, so the published package has no path back to the site.
export default defineConfig({
  entry: ["src/index.ts"],
  format: "esm",
  platform: "node",
  target: "node22",
  dts: false,
})

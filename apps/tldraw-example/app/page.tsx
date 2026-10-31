"use client"

import { type Editor, Tldraw } from "tldraw"
import { stickiesTldrawOptions } from "@/registry/stickies/integrations/tldraw/stickies-tldraw"

// tldraw with Stickies copy and paste. For development only: tldraw needs a licence key
// in production (https://tldraw.dev/community/license).
const options = stickiesTldrawOptions({ app: "tldraw example" })

declare global {
  interface Window {
    /** For poking at in the console and in tests. */
    editor?: Editor
  }
}

export default function Page() {
  return (
    <div style={{ position: "fixed", inset: 0 }}>
      <Tldraw options={options} persistenceKey="stickies-tldraw-example" onMount={(editor) => void (window.editor = editor)} />
    </div>
  )
}

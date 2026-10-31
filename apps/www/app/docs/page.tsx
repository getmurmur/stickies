import type { Metadata } from "next"
import Link from "next/link"
import type { ReactNode } from "react"
import { BoardPreview } from "@/components/docs/BoardPreview"
import { NotePreview } from "@/components/docs/NotePreview"
import { CopyPrompt } from "@/components/site/CopyPrompt"
import { readRepoFile } from "@/lib/repoFile"

export const metadata: Metadata = {
  title: "Docs · stickies.live",
  description: "Sticky notes for any React app, from the shadcn registry: a composable note, a board, and the hooks underneath.",
}

const R = "https://stickies.live/r"

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-xl bg-code px-4 py-3 font-mono text-[13px] leading-6 text-foreground">
      <code>{children.trim()}</code>
    </pre>
  )
}

function Install({ item }: { item: string }) {
  return <Code>{`npx shadcn@latest add ${R}/${item}.json`}</Code>
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-8 space-y-4 border-t border-border pt-10">
      <h2 className="text-[20px] font-semibold">
        <a href={`#${id}`} className="hover:underline">
          {title}
        </a>
      </h2>
      {children}
    </section>
  )
}

function P({ children }: { children: ReactNode }) {
  return <p className="text-[15px] leading-7 text-foreground/85">{children}</p>
}

function Props({ rows }: { rows: [string, string, string][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[13px]">
        <thead className="text-muted">
          <tr>
            <th className="py-2 pr-4 font-medium">Prop</th>
            <th className="py-2 pr-4 font-medium">Type</th>
            <th className="py-2 font-medium">What it does</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([name, type, what]) => (
            <tr key={name} className="border-t border-border align-top">
              <td className="py-2 pr-4 font-mono">{name}</td>
              <td className="py-2 pr-4 font-mono text-muted">{type}</td>
              <td className="py-2">{what}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const NAV = [
  ["with-an-agent", "With an agent"],
  ["install", "Install"],
  ["sticky-board", "Sticky board"],
  ["sticky-note", "Sticky note"],
  ["use-sticky-notes", "useStickyNotes"],
  ["use-stickies-clipboard", "useStickiesClipboard"],
  ["use-pointer-drag", "usePointerDrag"],
  ["use-canvas-pan", "useCanvasPan"],
  ["use-list-formatting", "useListFormatting"],
  ["stickies-format", "Stickies format"],
  ["stickies-theme", "Theme"],
  ["stickies-tldraw", "tldraw"],
  ["stickies-skill", "Agent skill"],
]

export default function Docs() {
  return (
    <div className="mx-auto flex max-w-6xl gap-12 px-6 py-10">
      <aside className="sticky top-10 hidden h-fit w-48 shrink-0 space-y-1 text-[13px] md:block">
        <Link href="/" className="mb-6 flex items-center gap-2.5 text-[15px] font-medium">
          <span
            aria-hidden
            data-sticky-color="yellow"
            className="inline-block size-4 rounded-[4px] border border-sticky-edge bg-[linear-gradient(to_bottom,var(--sticky-header)_32%,var(--sticky-paper)_32%)]"
          />
          stickies.live
        </Link>
        {NAV.map(([id, label]) => (
          <a key={id} href={`#${id}`} className="block py-1 text-muted hover:text-foreground">
            {label}
          </a>
        ))}
      </aside>

      <main className="min-w-0 flex-1 space-y-10 pb-24">
        <header className="space-y-4">
          <Link href="/" className="text-[13px] text-muted hover:text-foreground md:hidden">
            ← stickies.live
          </Link>
          <h1 className="text-[32px] font-semibold">Sticky notes for any React app</h1>
          <P>
            A shadcn registry: a composable sticky note, a full board, and the hooks underneath, after Murmur&apos;s notes. Notes copy and paste in
            the <a href="/spec" className="underline underline-offset-2">Stickies format</a>, so they move between any apps that use it, and still
            paste as coloured boxes or plain text everywhere else.
          </P>
          <BoardPreview />
        </header>

        <Section id="with-an-agent" title="With an agent">
          <P>
            Give this prompt to your coding agent (Claude Code, Codex, Cursor and others) in any app with notes or cards. It reads the format, maps
            your notes to it, and adds copy and paste that works with every app using Stickies.
          </P>
          <div className="flex flex-wrap items-center gap-3">
            <CopyPrompt prompt={readRepoFile("apps/www/content/agent-prompt.md")} />
            <a href="/prompt.md" className="text-[13px] text-muted underline underline-offset-2 hover:text-foreground">
              Read the prompt
            </a>
          </div>
        </Section>

        <Section id="install" title="Install">
          <P>Needs a shadcn project with Tailwind v4 and React 19. Add the whole board, and everything it uses comes with it:</P>
          <Install item="sticky-board" />
          <P>
            Or add the namespace to <code>components.json</code> once, and use short names:
          </P>
          <Code>{`
{
  "registries": {
    "@stickies": "${R}/{name}.json"
  }
}`}</Code>
          <Code>npx shadcn@latest add @stickies/sticky-note @stickies/use-sticky-notes</Code>
        </Section>

        <Section id="sticky-board" title="Sticky board">
          <P>
            A canvas of notes. Drag a note by its top, resize from the corner, drag the background to look around, double-click or right-click to add a note. Click
            to select, ⇧-click for more, ⌘A for all. ⌘C, ⌘X and ⌘V copy, cut and paste in the Stickies format, and Delete removes. It fills its
            parent and saves to <code>localStorage</code> by default.
          </P>
          <Install item="sticky-board" />
          <Code>{`
import { StickyBoard, useStickyBoard } from "@/components/sticky-board"
import { createNote } from "@/lib/stickies-format"

const notes = [createNote({ text: "Hello", x: 0, y: 0 })]

function Toolbar() {
  const { selectedNotes, copy, reset } = useStickyBoard()
  return <button onClick={() => copy(selectedNotes)}>Copy</button>
}

export function Board() {
  return (
    <div className="h-[600px]">
      <StickyBoard defaultNotes={notes} storageKey="my-board" source={{ app: "My app" }}>
        <Toolbar />
      </StickyBoard>
    </div>
  )
}`}</Code>
          <Props
            rows={[
              ["defaultNotes", "StickyNoteData[]", "Notes to start with, and to go back to on reset()."],
              ["notes / onNotesChange", "StickyNoteData[]", "Controlled notes. Nothing is saved to the browser."],
              ["persist", "boolean = true", "Keep the board in localStorage, as a Stickies document."],
              ["storageKey", "string", "Where in localStorage. Give each board its own."],
              ["semantic", "boolean = false", "Colour comes from state: open is yellow, in progress blue, done green."],
              ["showDate", "boolean = false", "Show when each note last changed."],
              ["source", "StickiesSource", "Recorded in copied notes, so other apps know where they came from."],
              ["renderNote", "(note, { autoFocus }) => ReactNode", "Your own composition of a note's parts."],
              ["children", "ReactNode", "Drawn over the board. Use useStickyBoard() inside."],
            ]}
          />
        </Section>

        <Section id="sticky-note" title="Sticky note">
          <P>
            The note on its own, in parts. Leave any out: without <code>StickyNoteResize</code> it doesn&apos;t resize, without{" "}
            <code>StickyNoteColors</code> it keeps its colour. With <code>positioned={"{false}"}</code> it sits in a list or grid like any block.
          </P>
          <NotePreview />
          <Install item="sticky-note" />
          <Code>{`
<StickyNote note={note} onNoteChange={setNote} onDelete={remove}>
  <StickyNoteHeader>
    <StickyNoteColors />
    <span className="flex-1" />
    <StickyNoteState />
    <StickyNoteClose />
  </StickyNoteHeader>
  <StickyNoteText />
  <StickyNoteFooter>
    <StickyNoteAuthor />
    <StickyNoteDate />
  </StickyNoteFooter>
  <StickyNoteResize />
</StickyNote>`}</Code>
          <Props
            rows={[
              ["StickyNote", "note, onNoteChange, onDelete?", "The paper. Also positioned, semantic, scale and selected. Gives its parts the note."],
              ["StickyNoteHeader", "div", "The handle on a canvas: drag it, or focus it and use the arrow keys (⇧ for bigger steps)."],
              ["StickyNoteColors", "div", "The colour picker, on hover or focus. With semantic, it picks the state instead."],
              ["StickyNoteState", "span", "A mark for in progress or done, so state never rests on colour alone."],
              ["StickyNoteClose", "button", "Delete. A note with words asks first, in the footer."],
              ["StickyNoteText", "textarea", "The words, with lists (lists={false} to turn off). Escape returns focus to the header."],
              ["StickyNoteFooter", "div", "For the author and date; where deleting asks first."],
              ["StickyNoteAuthor / StickyNoteDate", "span / time", "From the note's author and updatedAt."],
              ["StickyNoteResize", "div", "The bottom-right corner."],
              ["useStickyNote()", "hook", "The note and its edit functions, for your own parts."],
            ]}
          />
        </Section>

        <Section id="use-sticky-notes" title="useStickyNotes">
          <P>
            The board&apos;s state without the board: add, update, remove, raise, select, reset. Saved to <code>localStorage</code> unless you pass{" "}
            <code>persist: false</code> or control the notes yourself. The array&apos;s order is the stack.
          </P>
          <Install item="use-sticky-notes" />
          <Code>{`
const { notes, ready, add, update, remove, raise, selected, select, reset } =
  useStickyNotes({ defaultNotes, storageKey: "my-board" })

add({ text: "New", x: 40, y: 40 })
update(id, { state: "done" })          // sets updatedAt
update(id, { x: 100 }, { touch: false }) // geometry only`}</Code>
        </Section>

        <Section id="use-stickies-clipboard" title="useStickiesClipboard">
          <P>
            ⌘C, ⌘X and ⌘V in the Stickies format. Copying writes the Stickies JSON, HTML that carries the document, and plain text, so notes paste
            into docs and email as coloured boxes and into Stickies apps whole. Pasting reads the richest version there. Typing in a field is left
            alone.
          </P>
          <Install item="use-stickies-clipboard" />
          <Code>{`
const { copy } = useStickiesClipboard({
  getNotes: () => selectedNotes,
  onPaste: ({ notes }) => insert(placeNotes(notes, { x: 40, y: 40 })),
  onCut: (notes) => remove(notes.map((n) => n.id)),
  source: { app: "My app" },
})

// From a button: HTML and plain text only, as browsers allow
await copy(selectedNotes)`}</Code>
          <P>
            Safari removes custom clipboard types between sites, so the HTML&apos;s <code>data-stickies</code> is what carries notes there. See §8.5
            of the spec for what each browser allows.
          </P>
        </Section>

        <Section id="use-pointer-drag" title="usePointerDrag">
          <P>Moving or resizing anything with the pointer, captured so it carries on outside the element, and divided by the zoom.</P>
          <Install item="use-pointer-drag" />
          <Code>{`
const start = useRef(position)
const { handlers, dragging } = usePointerDrag({
  onDragStart: () => { start.current = position },
  onDrag: ({ dx, dy }) => setPosition({ x: start.current.x + dx, y: start.current.y + dy }),
})
return <div {...handlers} />`}</Code>
        </Section>

        <Section id="use-canvas-pan" title="useCanvasPan">
          <P>Dragging a surface to look around it. Only presses on the surface itself pan, so what&apos;s on it keeps its own dragging.</P>
          <Install item="use-canvas-pan" />
          <Code>{`
const { pan, handlers, toCanvas } = useCanvasPan()
return (
  <div {...handlers} className="relative h-full overflow-hidden">
    <div style={{ transform: \`translate(\${pan.x}px, \${pan.y}px)\` }}>{children}</div>
  </div>
)`}</Code>
        </Section>

        <Section id="use-list-formatting" title="useListFormatting">
          <P>Lists in a plain textarea, as in Apple&apos;s Notes: &quot;- &quot; starts a bullet, Return carries the list on, and Return on an empty item ends it. Numbered lists keep counting.</P>
          <Install item="use-list-formatting" />
          <Code>{`
const list = useListFormatting(text, setText)
return <textarea {...list} />`}</Code>
        </Section>

        <Section id="stickies-format" title="Stickies format">
          <P>The spec in TypeScript, with no dependencies. Everything else here uses it.</P>
          <Install item="stickies-format" />
          <Props
            rows={[
              ["createNote(fields)", "StickyNoteData", "A new note with an ID, size, colour and times."],
              ["changeNote(note, fields)", "StickyNoteData", "A changed note, with updatedAt set and color kept in step with colorName."],
              ["toDocument(notes, { source })", "StickiesDocument", "Notes as a document, also valid JSON Canvas: save it as .canvas for Obsidian."],
              ["parseDocument(json) / validate(value)", "document | null / problems", "Reading and checking against the spec."],
              ["toHtml(doc) / fromHtml(html)", "string / document | null", "The clipboard's HTML version, with the document in data-stickies."],
              ["toText(notes) / fromText(text)", "string / notes", "Plain text, one note per paragraph."],
              ["placeNotes(notes, at)", "StickyNoteData[]", "Pasted notes with new IDs, moved together to a point."],
              ["stateOf, colorOf, shownColorOf", "", "Reading a note as the spec says: unknown states are open, unknown colours yellow."],
            ]}
          />
        </Section>

        <Section id="stickies-theme" title="Theme">
          <P>
            The six colours as variables on <code>[data-sticky-color]</code>, light and dark (shadcn&apos;s <code>.dark</code>), the{" "}
            <code>sticky-paper</code>, <code>sticky-header</code>, <code>sticky-edge</code>, <code>sticky-ink</code> and <code>sticky-meta</code>{" "}
            colours for Tailwind, and the <code>sticky-shadow</code> utility. Change the variables in your CSS to change the palette.
          </P>
          <Install item="stickies-theme" />
          <Code>{`<div data-sticky-color="blue" className="bg-sticky-paper text-sticky-ink sticky-shadow" />`}</Code>
        </Section>

        <Section id="stickies-tldraw" title="tldraw">
          <P>
            Stickies copy and paste for <a href="https://tldraw.dev" className="underline underline-offset-2">tldraw</a>. Copying a selection of
            sticky notes writes them as Stickies, so they paste onto a board like this one, or into a doc as coloured boxes. Pasting Stickies
            makes tldraw notes, keeping their colours, layout, state and author. tldraw&apos;s own styles travel with the notes, so tldraw to
            tldraw loses nothing. Anything else is left to tldraw.
          </P>
          <Install item="stickies-tldraw" />
          <Code>{`
import { Tldraw } from "tldraw"
import { stickiesTldrawOptions } from "@/lib/stickies-tldraw"

const options = stickiesTldrawOptions({ app: "My app" })

export default function Board() {
  return <Tldraw options={options} />
}`}</Code>
          <P>
            tldraw needs its own licence key in production; see{" "}
            <a href="https://tldraw.dev/community/license" className="underline underline-offset-2">tldraw&apos;s licence</a>.
          </P>
        </Section>

        <Section id="stickies-skill" title="Agent skill">
          <P>
            The <a href="/skill/SKILL.md" className="underline underline-offset-2">Stickies skill</a> lets an agent make notes, check them against
            the spec, save them as a <code>.canvas</code> file, and put them on the clipboard in every format, ready to paste onto a board like this
            one. For any agent (Claude Code, Codex, Cursor and others):
          </P>
          <Code>npx skills add getmurmur/stickies</Code>
          <P>
            Or into a project&apos;s <code>.claude/skills</code>, from the registry, shadcn project or not:
          </P>
          <Install item="stickies-skill" />
          <P>
            <a href="/llms.txt" className="underline underline-offset-2">llms.txt</a> sums up the format for any model.
          </P>
        </Section>
      </main>
    </div>
  )
}

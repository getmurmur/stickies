import type { Metadata } from "next"
import Link from "next/link"
import type { ComponentProps } from "react"
import ReactMarkdown from "react-markdown"
import rehypeSlug from "rehype-slug"
import remarkGfm from "remark-gfm"
import { GITHUB, Mark } from "@/components/site/Mark"
import { readRepoFile } from "@/lib/repoFile"

export const metadata: Metadata = {
  title: "Spec · stickies.live",
  description: "The Stickies format: notes, colour, state, extensions, and how notes move on the clipboard. A profile of JSON Canvas.",
}

/** The spec's headings' ids, as rehype-slug makes them. */
const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s/g, "-")

/** Links inside the spec go to the spec's own anchors, or other pages on the site. */
function A({ href = "", ...props }: ComponentProps<"a">) {
  const external = /^https?:\/\//.test(href) && !href.startsWith("https://stickies.live")
  return <a href={href.replace("https://stickies.live", "") || "/"} {...(external ? { target: "_blank", rel: "noreferrer" } : {})} className="underline underline-offset-2" {...props} />
}

export default function Spec() {
  const markdown = readRepoFile("spec/SPEC.md")
  // The title is the page's own; the rest renders as it is.
  const [, title = "Stickies", body = markdown] = /^# (.+)\n([\s\S]*)$/.exec(markdown) ?? []
  const sections = [...body.matchAll(/^## (.+)$/gm)].map((m) => m[1])

  return (
    <div className="mx-auto flex max-w-6xl gap-12 px-6 py-10">
      <aside className="sticky top-10 hidden h-fit w-52 shrink-0 space-y-1 text-[13px] md:block">
        <Mark className="mb-6" />
        {sections.map((s) => (
          <a key={s} href={`#${slug(s)}`} className="block py-1 text-muted hover:text-foreground">
            {s}
          </a>
        ))}
        <div className="space-y-1 border-t border-border pt-4 mt-4">
          <Link href="/docs" className="block py-1 text-muted hover:text-foreground">
            Docs
          </Link>
          <a href="/spec.md" className="block py-1 text-muted hover:text-foreground">
            Spec as Markdown
          </a>
          <a href="/schema/0.1.json" className="block py-1 text-muted hover:text-foreground">
            JSON Schema
          </a>
          <a href={GITHUB} className="block py-1 text-muted hover:text-foreground">
            GitHub
          </a>
        </div>
      </aside>

      <main className="min-w-0 max-w-3xl flex-1 pb-24 text-[15px] leading-7 text-foreground/85">
        <Mark className="mb-8 md:hidden" />
        <h1 className="mb-6 text-[32px] font-semibold text-foreground">{title}</h1>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeSlug]}
          components={{
            h2: (p) => <h2 className="mt-12 mb-4 scroll-mt-8 border-t border-border pt-10 text-[20px] font-semibold text-foreground" {...p} />,
            h3: (p) => <h3 className="mt-8 mb-3 scroll-mt-8 text-[16px] font-semibold text-foreground" {...p} />,
            p: (p) => <p className="my-4" {...p} />,
            a: A,
            ul: (p) => <ul className="my-4 list-disc space-y-1.5 pl-5" {...p} />,
            ol: (p) => <ol className="my-4 list-decimal space-y-1.5 pl-5" {...p} />,
            table: (p) => (
              <div className="my-5 overflow-x-auto">
                <table className="w-full text-left text-[13px] leading-6" {...p} />
              </div>
            ),
            th: (p) => <th className="border-b border-border py-2 pr-4 align-bottom font-medium text-muted" {...p} />,
            td: (p) => <td className="border-b border-border py-2 pr-4 align-top" {...p} />,
            pre: (p) => <pre className="my-5 overflow-x-auto rounded-xl bg-code px-4 py-3 font-mono text-[13px] leading-6 text-foreground [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-[13px]" {...p} />,
            code: ({ className, ...p }) =>
              className ? <code className={className} {...p} /> : <code className="rounded bg-code px-1 py-0.5 font-mono text-[0.85em] text-foreground" {...p} />,
            blockquote: (p) => <blockquote className="my-4 border-l-2 border-border pl-4 text-muted" {...p} />,
          }}
        >
          {body}
        </ReactMarkdown>
      </main>
    </div>
  )
}

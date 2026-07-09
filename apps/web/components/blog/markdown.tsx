import Link from "next/link"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

/**
 * Renders post Markdown into the site's dark theme. Block-level typography is
 * styled with arbitrary variants on the wrapper (one place, no per-element
 * component functions); only links and tables need custom components — links to
 * route internal hrefs through next/link, tables to scroll on narrow screens.
 *
 * This is a Server Component (react-markdown runs fine in RSC), so the blog
 * ships no client JS for prose and stays statically prerendered.
 */

const prose = [
  "text-muted-foreground text-[15px] leading-7",
  "[&>p]:my-5",
  "[&>h2]:text-foreground [&>h2]:mt-12 [&>h2]:mb-4 [&>h2]:scroll-mt-24 [&>h2]:text-xl [&>h2]:font-semibold [&>h2]:tracking-tight sm:[&>h2]:text-2xl",
  "[&>h3]:text-foreground [&>h3]:mt-8 [&>h3]:mb-3 [&>h3]:text-lg [&>h3]:font-semibold [&>h3]:tracking-tight",
  "[&>ul]:my-5 [&>ul]:list-disc [&>ul]:pl-5 [&>ul>li]:my-2 [&>ul>li]:pl-1",
  "[&>ol]:my-5 [&>ol]:list-decimal [&>ol]:pl-5 [&>ol>li]:my-2 [&>ol>li]:pl-1",
  "[&_strong]:text-foreground [&_strong]:font-semibold",
  "[&_code]:font-mono [&_code]:text-[13px] [&_code]:text-foreground",
  // Inline code (inside paragraphs / list items) gets a chip; block code inside
  // <pre> is deliberately not matched here so it stays flush in its panel.
  "[&_p>code]:bg-card [&_p>code]:border [&_p>code]:border-border [&_p>code]:rounded [&_p>code]:px-1.5 [&_p>code]:py-0.5",
  "[&_li>code]:bg-card [&_li>code]:border [&_li>code]:border-border [&_li>code]:rounded [&_li>code]:px-1.5 [&_li>code]:py-0.5",
  "[&>pre]:bg-card [&>pre]:border [&>pre]:border-border [&>pre]:my-6 [&>pre]:overflow-x-auto [&>pre]:rounded-xl [&>pre]:p-4 [&>pre]:text-[13px] [&>pre]:leading-6",
  "[&>blockquote]:border-primary/40 [&>blockquote]:text-muted-foreground [&>blockquote]:my-6 [&>blockquote]:border-l-2 [&>blockquote]:pl-4 [&>blockquote]:italic",
  "[&>hr]:border-border [&>hr]:my-10",
].join(" ")

export function Markdown({ children }: { children: string }) {
  return (
    <div className={prose}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a({ href, children }) {
            const url = href ?? "#"
            const internal = url.startsWith("/")
            if (internal) {
              return (
                <Link
                  href={url}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {children}
                </Link>
              )
            }
            return (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline-offset-4 hover:underline"
              >
                {children}
              </a>
            )
          },
          table({ children }) {
            return (
              <div className="my-6 overflow-x-auto">
                <table className="w-full border-collapse text-sm">{children}</table>
              </div>
            )
          },
          th({ children }) {
            return (
              <th className="border-border bg-card text-foreground border px-3 py-2 text-left font-medium">
                {children}
              </th>
            )
          },
          td({ children }) {
            return <td className="border-border border px-3 py-2 align-top">{children}</td>
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}

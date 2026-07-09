import Link from "next/link"

// Brand logos as inline SVGs — lucide-react dropped its brand/social icons, so
// GitHub and X are hand-embedded here rather than imported.
function GitHubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.04-.02-2.05-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.21.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.34-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.62-5.49 5.92.43.37.81 1.1.81 2.22 0 1.6-.01 2.9-.01 3.29 0 .32.22.7.83.58A12.01 12.01 0 0 0 24 12.5C24 5.87 18.63.5 12 .5z" />
    </svg>
  )
}

function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

const GITHUB_URL = "https://github.com/RachitSinghh"
const X_URL = "https://x.com/rachiitfr"

const LINK_COLUMNS = [
  {
    heading: "Resources",
    links: [
      { label: "Home", href: "/" },
      { label: "Blog", href: "/blog" },
      { label: "Feedback", href: "/feedback" },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="border-border mt-8 border-t">
      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="flex flex-col gap-10 sm:flex-row sm:justify-between">
          {/* Brand + social */}
          <div className="max-w-xs">
            <Link href="/" className="text-base font-semibold tracking-tight">
              Peak<span className="text-primary">Streak</span>
            </Link>
            <p className="text-muted-foreground mt-3 text-sm leading-6">
              Turn any YouTube playlist into a plan with a real finish date, a daily streak, and a
              nudge the moment you slip.
            </p>
            <div className="text-muted-foreground mt-5 flex items-center gap-4">
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className="hover:text-foreground transition-colors"
              >
                <GitHubIcon className="size-4" />
              </a>
              <a
                href={X_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="X (Twitter)"
                className="hover:text-foreground transition-colors"
              >
                <XIcon className="size-[15px]" />
              </a>
            </div>
          </div>

          {/* Link columns */}
          <div className="flex gap-12 sm:gap-20">
            {LINK_COLUMNS.map((col) => (
              <nav key={col.heading} className="flex flex-col gap-3">
                <p className="text-foreground text-xs font-medium tracking-wide uppercase">
                  {col.heading}
                </p>
                {col.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-border text-muted-foreground mt-10 flex flex-col items-center gap-2 border-t pt-6 text-xs sm:flex-row sm:justify-between">
          <p>© 2026 PeakStreak</p>
          <p>For people who save playlists with real intent.</p>
        </div>
      </div>
    </footer>
  )
}

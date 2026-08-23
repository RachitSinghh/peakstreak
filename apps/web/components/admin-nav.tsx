"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, FileText, Inbox, LineChart, ListVideo, Mail, Users } from "lucide-react"

const ITEMS = [
  { href: "/admin", label: "Analytics", icon: BarChart3 },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/retention", label: "Retention", icon: LineChart },
  { href: "/admin/content", label: "Content", icon: ListVideo },
  { href: "/admin/email", label: "Email", icon: Mail },
  { href: "/admin/blog", label: "Blog", icon: FileText },
  { href: "/admin/feedback", label: "Feedback", icon: Inbox },
]

export function AdminNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-1">
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href
        return (
          <Link
            key={href}
            href={href}
            className={`inline-flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <Icon className={`size-4 ${active ? "text-primary" : ""}`} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

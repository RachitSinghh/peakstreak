"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { Markdown } from "@/components/blog/markdown"
import type { SavePostInput } from "@/lib/admin-blog"
import { deletePostAction, savePostAction } from "@/app/admin/blog/actions"

type Initial = SavePostInput & { id?: string }

export function BlogEditor({ initial }: { initial: Initial }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [f, setF] = useState<Initial>(initial)
  // Raw text so commas/spaces can be typed freely; split into the array on save.
  const [keywordsText, setKeywordsText] = useState((initial.secondaryKeywords ?? []).join(", "))

  function set<K extends keyof Initial>(key: K, value: Initial[K]) {
    setF((prev) => ({ ...prev, [key]: value }))
  }

  function save() {
    setError(null)
    const secondaryKeywords = keywordsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
    start(async () => {
      const res = await savePostAction({ ...f, secondaryKeywords })
      if (res.error) setError(res.error)
      else router.push("/admin/blog")
    })
  }

  function remove() {
    if (!initial.id || !confirm("Delete this post?")) return
    start(async () => {
      await deletePostAction(initial.id!)
      router.push("/admin/blog")
    })
  }

  const input = "border-border bg-background w-full rounded-lg border px-3 py-2 text-sm"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{initial.id ? "Edit post" : "New post"}</h1>
        <div className="flex gap-2">
          {initial.id ? (
            <button
              onClick={remove}
              disabled={pending}
              className="border-border rounded-lg border px-4 py-2 text-sm hover:bg-secondary"
            >
              Delete
            </button>
          ) : null}
          <button
            onClick={save}
            disabled={pending}
            className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-muted-foreground text-xs">Title</span>
          <input className={input} value={f.title} onChange={(e) => set("title", e.target.value)} />
        </label>
        <label className="space-y-1">
          <span className="text-muted-foreground text-xs">Slug</span>
          <input className={input} value={f.slug} onChange={(e) => set("slug", e.target.value)} />
        </label>
        <label className="space-y-1 sm:col-span-2">
          <span className="text-muted-foreground text-xs">Description</span>
          <input
            className={input}
            value={f.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </label>
        <label className="space-y-1">
          <span className="text-muted-foreground text-xs">Target keyword</span>
          <input
            className={input}
            value={f.targetKeyword ?? ""}
            onChange={(e) => set("targetKeyword", e.target.value || undefined)}
          />
        </label>
        <label className="space-y-1">
          <span className="text-muted-foreground text-xs">Secondary keywords (comma-separated)</span>
          <input
            className={input}
            value={keywordsText}
            onChange={(e) => setKeywordsText(e.target.value)}
          />
        </label>
        <label className="space-y-1">
          <span className="text-muted-foreground text-xs">Intent</span>
          <select
            className={input}
            value={f.intent ?? ""}
            onChange={(e) => set("intent", (e.target.value || undefined) as Initial["intent"])}
          >
            <option value="">—</option>
            <option value="informational">informational</option>
            <option value="transactional">transactional</option>
            <option value="commercial">commercial</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-muted-foreground text-xs">Status</span>
          <select
            className={input}
            value={f.status}
            onChange={(e) => set("status", e.target.value as Initial["status"])}
          >
            <option value="draft">draft</option>
            <option value="published">published</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-muted-foreground text-xs">Order</span>
          <input
            type="number"
            className={input}
            value={f.order ?? ""}
            onChange={(e) => set("order", e.target.value === "" ? undefined : Number(e.target.value))}
          />
        </label>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-1">
          <span className="text-muted-foreground text-xs">Markdown</span>
          <textarea
            className={`${input} min-h-[420px] font-mono`}
            value={f.content}
            onChange={(e) => set("content", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <span className="text-muted-foreground text-xs">Preview</span>
          <div className="border-border min-h-[420px] rounded-lg border p-4">
            <Markdown>{f.content || "_Nothing to preview yet._"}</Markdown>
          </div>
        </div>
      </div>
    </div>
  )
}

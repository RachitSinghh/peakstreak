"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"

import { createGroupAction } from "@/app/(app)/group-actions"

/** SOC-06: create a study group, then jump to its page. */
export function CreateGroupForm() {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const result = await createGroupAction(name, description)
      if (result.error) {
        toast.error(result.error)
        return
      }
      if (result.slug) router.push(`/g/${result.slug}`)
    })
  }

  return (
    <form onSubmit={submit} className="border-border bg-card flex flex-col gap-3 rounded-xl border p-5">
      <h2 className="text-sm font-medium">Create a group</h2>
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Group name"
        maxLength={80}
        required
      />
      <Input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="What's it for? (optional)"
        maxLength={200}
      />
      <div>
        <Button type="submit" size="sm" disabled={pending || name.trim().length < 2}>
          Create group
        </Button>
      </div>
    </form>
  )
}

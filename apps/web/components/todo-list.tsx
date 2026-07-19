"use client"

// FT-PM3 (todo CRUD + estimates + reorder), FT-PM4 (video-length estimate),
// FT-PM5 (start a Pomodoro schedule from a task).

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  CheckCircle2,
  Circle,
  Clock,
  GripVertical,
  Loader2,
  Pencil,
  Play,
  Search,
  SquarePlay,
  Trash2,
  Film,
} from "lucide-react"
import { toast } from "sonner"
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"

import type { EnrollablePlaylist, Todo } from "@/lib/todos"
import { usePomodoro } from "@/hooks/use-pomodoro"
import { cyclesForTask } from "@/lib/pomodoro"

function fmtEstimate(minutes: number): string {
  if (minutes <= 0) return "no estimate"
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h ? `${h}h${m ? ` ${m}m` : ""}` : `${m}m`
}

export function TodoList({ initialTodos }: { initialTodos: Todo[] }) {
  const [todos, setTodos] = useState<Todo[]>(initialTodos)
  const [editing, setEditing] = useState<Todo | null>(null)

  const incomplete = todos.filter((t) => !t.completed)
  const done = todos.filter((t) => t.completed)
  const remainingMinutes = incomplete.reduce((s, t) => s + t.estimatedDurationMinutes, 0)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function patchLocal(id: string, patch: Partial<Todo>) {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  }

  async function addTodo(input: {
    title: string
    estimatedDurationMinutes: number
    sourceType: "manual" | "video"
    sourceUrl?: string
    videoId?: string
    enrollmentId?: string
  }) {
    const res = await fetch("/api/todos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    })
    if (!res.ok) {
      toast.error("Couldn't add task")
      return
    }
    const { todo } = (await res.json()) as { todo: Todo }
    setTodos((prev) => [todo, ...prev])
  }

  async function toggleComplete(todo: Todo) {
    const next = !todo.completed
    patchLocal(todo.id, { completed: next })
    const res = await fetch(`/api/todos/${todo.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ completed: next }),
    })
    if (!res.ok) {
      patchLocal(todo.id, { completed: todo.completed }) // revert
      toast.error("Couldn't update task")
    }
  }

  async function removeTodo(todo: Todo) {
    const prev = todos
    setTodos((cur) => cur.filter((t) => t.id !== todo.id))
    const res = await fetch(`/api/todos/${todo.id}`, { method: "DELETE" })
    if (!res.ok) {
      setTodos(prev)
      toast.error("Couldn't delete task")
    }
  }

  async function saveEdit(id: string, patch: Partial<Todo>) {
    const prev = todos
    patchLocal(id, patch)
    setEditing(null)
    const res = await fetch(`/api/todos/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    })
    if (!res.ok) {
      setTodos(prev)
      toast.error("Couldn't save task")
    }
  }

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const prev = incomplete
    const oldIndex = prev.findIndex((t) => t.id === active.id)
    const newIndex = prev.findIndex((t) => t.id === over.id)
    const reordered = arrayMove(prev, oldIndex, newIndex)
    // Rebuild the full list (incomplete reordered first, done untouched).
    setTodos([...reordered, ...done])
    const res = await fetch("/api/todos/reorder", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderedIds: reordered.map((t) => t.id) }),
    })
    if (!res.ok) {
      setTodos([...prev, ...done])
      toast.error("Couldn't save order")
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <AddBar onAdd={addTodo} />

      {incomplete.length > 0 && (
        <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
          <Clock className="size-4" />
          {incomplete.length} task{incomplete.length === 1 ? "" : "s"} left ·{" "}
          {fmtEstimate(remainingMinutes)} estimated
        </p>
      )}

      {todos.length === 0 ? (
        <div className="border-border text-muted-foreground rounded-xl border border-dashed p-8 text-center text-sm">
          No tasks yet. Add one above and start a focused Pomodoro session.
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext
            items={incomplete.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="flex flex-col gap-1.5">
              {incomplete.map((todo) => (
                <SortableTodoRow
                  key={todo.id}
                  todo={todo}
                  onToggle={() => toggleComplete(todo)}
                  onEdit={() => setEditing(todo)}
                  onDelete={() => removeTodo(todo)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      {done.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Done ({done.length})
          </p>
          <ul className="flex flex-col gap-1.5">
            {done.map((todo) => (
              <TodoRow
                key={todo.id}
                todo={todo}
                onToggle={() => toggleComplete(todo)}
                onEdit={() => setEditing(todo)}
                onDelete={() => removeTodo(todo)}
              />
            ))}
          </ul>
        </div>
      )}

      {editing && (
        <EditDialog
          todo={editing}
          onClose={() => setEditing(null)}
          onSave={(patch) => saveEdit(editing.id, patch)}
        />
      )}
    </div>
  )
}

function SortableTodoRow(props: {
  todo: Todo
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.todo.id,
  })
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && "opacity-60")}
    >
      <TodoRow
        {...props}
        dragHandle={
          <button
            {...attributes}
            {...listeners}
            aria-label="Drag to reorder"
            className="text-muted-foreground hover:text-foreground shrink-0 cursor-grab touch-none"
          >
            <GripVertical className="size-4" />
          </button>
        }
      />
    </li>
  )
}

function TodoRow({
  todo,
  onToggle,
  onEdit,
  onDelete,
  dragHandle,
}: {
  todo: Todo
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  dragHandle?: React.ReactNode
}) {
  const pomodoro = usePomodoro()
  const [scheduling, setScheduling] = useState(false)
  const cycles = cyclesForTask(todo.estimatedDurationMinutes, pomodoro.settings.workMinutes)

  return (
    <>
      <div className="border-border hover:bg-muted/50 flex items-center gap-2.5 rounded-lg border px-2.5 py-2 transition-colors">
        {dragHandle}
        <button onClick={onToggle} aria-label={todo.completed ? "Mark incomplete" : "Mark done"}>
          {todo.completed ? (
            <CheckCircle2 className="text-success size-5 shrink-0" />
          ) : (
            <Circle className="text-muted-foreground hover:text-foreground size-5 shrink-0" />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "truncate text-sm",
              todo.completed && "text-muted-foreground line-through",
            )}
          >
            {todo.sourceType === "video" && <Film className="mr-1 inline size-3.5 text-red-500" />}
            {todo.title}
          </p>
          {todo.description && (
            <p className="text-muted-foreground truncate text-xs">{todo.description}</p>
          )}
        </div>
        <span className="text-muted-foreground shrink-0 font-mono text-xs">
          {fmtEstimate(todo.estimatedDurationMinutes)}
        </span>
        {todo.videoId && todo.enrollmentId ? (
          <Button
            size="icon-sm"
            variant="ghost"
            render={<Link href={`/playlists/${todo.enrollmentId}/watch/${todo.videoId}`} />}
            aria-label="Watch this video"
            title="Watch"
          >
            <SquarePlay className="size-4" />
          </Button>
        ) : todo.sourceType === "video" && todo.sourceUrl ? (
          <Button
            size="icon-sm"
            variant="ghost"
            render={<a href={todo.sourceUrl} target="_blank" rel="noopener noreferrer" />}
            aria-label="Open video"
            title="Open video"
          >
            <SquarePlay className="size-4" />
          </Button>
        ) : null}
        {!todo.completed && (
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => setScheduling(true)}
            aria-label="Start Pomodoro for this task"
            title="Start Pomodoro"
          >
            <Play className="size-4" />
          </Button>
        )}
        <Button size="icon-sm" variant="ghost" onClick={onEdit} aria-label="Edit task">
          <Pencil className="size-4" />
        </Button>
        <Button size="icon-sm" variant="ghost" onClick={onDelete} aria-label="Delete task">
          <Trash2 className="text-destructive size-4" />
        </Button>
      </div>
      {scheduling && (
        <StartPomodoroDialog
          title={todo.title}
          defaultCycles={cycles}
          workMinutes={pomodoro.settings.workMinutes}
          onClose={() => setScheduling(false)}
          onStart={(n) => {
            pomodoro.startForTask({ id: todo.id, label: todo.title, cycles: n })
            setScheduling(false)
            toast.success(`Focus started · ${n} cycle${n === 1 ? "" : "s"}`)
          }}
        />
      )}
    </>
  )
}

// FT-PM4 lives here: the "from video" toggle prefills the estimate.
type AddInput = {
  title: string
  estimatedDurationMinutes: number
  sourceType: "manual" | "video"
  sourceUrl?: string
  videoId?: string
  enrollmentId?: string
}

function AddBar({ onAdd }: { onAdd: (input: AddInput) => Promise<void> }) {
  const [title, setTitle] = useState("")
  const [minutes, setMinutes] = useState("")
  const [pickerOpen, setPickerOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit() {
    const t = title.trim()
    if (!t) {
      toast.error("Add a title")
      return
    }
    setBusy(true)
    await onAdd({
      title: t,
      estimatedDurationMinutes: Math.max(0, Math.min(1440, Math.round(Number(minutes) || 0))),
      sourceType: "manual",
    })
    setTitle("")
    setMinutes("")
    setBusy(false)
  }

  return (
    <div className="border-border flex flex-col gap-2 rounded-xl border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="What are you working on?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          className="min-w-40 flex-1"
        />
        <Input
          type="number"
          min={0}
          max={1440}
          placeholder="min"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          className="w-20"
          aria-label="Estimated minutes"
        />
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setPickerOpen(true)}
          title="Add a video you're already studying"
        >
          <Film className="size-4" /> From a video
        </Button>
        <Button size="sm" onClick={submit} disabled={busy}>
          Add
        </Button>
      </div>
      {pickerOpen && (
        <VideoPickerDialog
          onClose={() => setPickerOpen(false)}
          onPick={async (input) => {
            await onAdd(input)
            setPickerOpen(false)
          }}
        />
      )}
    </div>
  )
}

// Pick a video already in the user's playlists (durations known → no API
// call) or, as a fallback, paste any YouTube URL. Either way it becomes a
// task with a pre-filled estimate.
function VideoPickerDialog({
  onClose,
  onPick,
}: {
  onClose: () => void
  onPick: (input: AddInput) => Promise<void>
}) {
  const [playlists, setPlaylists] = useState<EnrollablePlaylist[] | null>(null)
  const [query, setQuery] = useState("")
  const [urlMode, setUrlMode] = useState(false)
  const [url, setUrl] = useState("")
  const [fetching, setFetching] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch("/api/todos/videos")
      .then((r) => (r.ok ? r.json() : { playlists: [] }))
      .then((d: { playlists: EnrollablePlaylist[] }) => {
        if (!cancelled) setPlaylists(d.playlists)
      })
      .catch(() => {
        if (!cancelled) setPlaylists([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  const q = query.trim().toLowerCase()
  const filtered =
    playlists?.map((p) => ({
      ...p,
      videos: q ? p.videos.filter((v) => v.title.toLowerCase().includes(q)) : p.videos,
    })) ?? []
  const hasResults = filtered.some((p) => p.videos.length > 0)

  async function pickExisting(p: EnrollablePlaylist, v: EnrollablePlaylist["videos"][number]) {
    await onPick({
      title: v.title,
      estimatedDurationMinutes: Math.max(1, Math.round(v.durationSeconds / 60)),
      sourceType: "video",
      videoId: v.videoId,
      enrollmentId: p.enrollmentId,
    })
  }

  async function pickFromUrl() {
    if (!url.trim()) return
    setFetching(true)
    try {
      const res = await fetch("/api/todos/video-duration", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(
          data.error === "unsupported_url"
            ? "Couldn't read that URL"
            : "Couldn't fetch that video's length",
        )
        return
      }
      await onPick({
        title: data.title || "Video",
        estimatedDurationMinutes: data.minutes,
        sourceType: "video",
        sourceUrl: url.trim(),
      })
    } finally {
      setFetching(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[calc(100%-2rem)] min-w-0 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{urlMode ? "Add a video by URL" : "Add from your videos"}</DialogTitle>
        </DialogHeader>

        {urlMode ? (
          <div className="flex min-w-0 flex-col gap-3">
            <Input
              placeholder="Paste a YouTube URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && pickFromUrl()}
              autoFocus
            />
            <div className="flex items-center justify-between">
              <Button size="sm" variant="ghost" onClick={() => setUrlMode(false)}>
                ← Back to my videos
              </Button>
              <Button size="sm" onClick={pickFromUrl} disabled={fetching}>
                {fetching ? <Loader2 className="size-4 animate-spin" /> : null}
                Add task
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex min-w-0 flex-col gap-3">
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input
                placeholder="Search your videos"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-8"
              />
            </div>

            <div className="max-h-[50vh] min-w-0 overflow-y-auto">
              {playlists === null ? (
                <p className="text-muted-foreground flex items-center gap-2 px-1 py-6 text-sm">
                  <Loader2 className="size-4 animate-spin" /> Loading your videos…
                </p>
              ) : !hasResults ? (
                <p className="text-muted-foreground px-1 py-6 text-center text-sm">
                  {playlists.length === 0
                    ? "No videos in your playlists yet."
                    : "No videos match your search."}
                </p>
              ) : (
                filtered
                  .filter((p) => p.videos.length > 0)
                  .map((p) => (
                    <div key={p.enrollmentId} className="mb-3">
                      <p className="text-muted-foreground mb-1 px-1 text-xs font-medium tracking-wide uppercase">
                        {p.playlistTitle}
                      </p>
                      <ul className="flex flex-col">
                        {p.videos.map((v) => (
                          <li key={v.videoId}>
                            <button
                              onClick={() => pickExisting(p, v)}
                              className="hover:bg-muted flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors"
                            >
                              <Film className="text-muted-foreground size-3.5 shrink-0" />
                              <span className="min-w-0 flex-1 truncate">{v.title}</span>
                              <span className="text-muted-foreground shrink-0 font-mono text-xs">
                                {Math.max(1, Math.round(v.durationSeconds / 60))}m
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))
              )}
            </div>

            <button
              onClick={() => setUrlMode(true)}
              className="text-muted-foreground hover:text-foreground self-start text-xs underline underline-offset-2"
            >
              Not in your library? Paste a URL instead
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function StartPomodoroDialog({
  title,
  defaultCycles,
  workMinutes,
  onClose,
  onStart,
}: {
  title: string
  defaultCycles: number
  workMinutes: number
  onClose: () => void
  onStart: (cycles: number) => void
}) {
  const [cycles, setCycles] = useState(defaultCycles)
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start Pomodoro</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground text-sm">
          <span className="text-foreground font-medium">{title}</span> — planned as{" "}
          {cycles} focus cycle{cycles === 1 ? "" : "s"} of {workMinutes} min. Adjust if you like.
        </p>
        <div className="flex items-center gap-2">
          <Label htmlFor="cycles" className="text-sm">
            Cycles
          </Label>
          <Input
            id="cycles"
            type="number"
            min={1}
            max={20}
            value={cycles}
            onChange={(e) =>
              setCycles(Math.max(1, Math.min(20, Math.round(Number(e.target.value) || 1))))
            }
            className="w-20"
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={() => onStart(cycles)}>
            <Play className="size-4" /> Start
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EditDialog({
  todo,
  onClose,
  onSave,
}: {
  todo: Todo
  onClose: () => void
  onSave: (patch: Partial<Todo>) => void
}) {
  const [title, setTitle] = useState(todo.title)
  const [description, setDescription] = useState(todo.description ?? "")
  const [minutes, setMinutes] = useState(String(todo.estimatedDurationMinutes))

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit task</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-title" className="text-xs">
              Title
            </Label>
            <Input id="edit-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-desc" className="text-xs">
              Description
            </Label>
            <Textarea
              id="edit-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-min" className="text-xs">
              Estimate (minutes)
            </Label>
            <Input
              id="edit-min"
              type="number"
              min={0}
              max={1440}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              className="w-28"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => {
              const t = title.trim()
              if (!t) {
                toast.error("Title can't be empty")
                return
              }
              onSave({
                title: t,
                description: description.trim() || null,
                estimatedDurationMinutes: Math.max(
                  0,
                  Math.min(1440, Math.round(Number(minutes) || 0)),
                ),
              })
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

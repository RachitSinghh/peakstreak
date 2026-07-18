"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CheckCircle2, Circle, GripVertical } from "lucide-react"
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

import { reorderCustomPlaylistVideos } from "@/app/(app)/playlists/actions"
import type { WatchVideo } from "@/components/watch-view"
import { formatDuration } from "@/lib/pace"

type RowProps = {
  video: WatchVideo
  index: number
  enrollmentId: string
  isCurrent: boolean
  done: boolean
}

function RowBody({ video, index, enrollmentId, isCurrent, done }: RowProps) {
  return (
    <Link
      href={`/playlists/${enrollmentId}/watch/${video.id}`}
      className={cn(
        "flex min-w-0 flex-1 items-center gap-3 px-1 py-2 text-sm transition-colors",
        isCurrent ? "bg-secondary" : "hover:bg-secondary/60",
      )}
    >
      {done ? (
        <CheckCircle2 className="text-success size-4 shrink-0" />
      ) : (
        <Circle className="text-muted-foreground size-4 shrink-0" />
      )}
      <span
        className={cn(
          "min-w-0 flex-1 truncate",
          isCurrent ? "text-foreground font-medium" : "text-muted-foreground",
          done && !isCurrent && "line-through opacity-70",
        )}
      >
        {index + 1}. {video.title}
      </span>
      <span className="text-muted-foreground shrink-0 font-mono text-xs">
        {formatDuration(video.durationSeconds)}
      </span>
    </Link>
  )
}

function SortableRow(props: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.video.id,
  })
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("flex items-center pr-4 pl-2", isDragging && "opacity-60")}
    >
      <button
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        className="text-muted-foreground hover:text-foreground shrink-0 cursor-grab touch-none px-1 py-2"
      >
        <GripVertical className="size-4" />
      </button>
      <RowBody {...props} />
    </li>
  )
}

export function UpNextList({
  videos,
  enrollmentId,
  currentVideoId,
  completedIds,
  isCustom,
}: {
  videos: WatchVideo[]
  enrollmentId: string
  currentVideoId: string
  completedIds: Set<string>
  isCustom: boolean
}) {
  const router = useRouter()
  const [order, setOrder] = useState(videos)

  // Re-sync when the server sends a new list (refresh / navigation) — the
  // React-recommended "reset state on prop change during render" pattern.
  const [prevVideos, setPrevVideos] = useState(videos)
  if (prevVideos !== videos) {
    setPrevVideos(videos)
    setOrder(videos)
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  if (!isCustom) {
    return (
      <ol className="max-h-[70vh] overflow-y-auto pb-2">
        {order.map((video, index) => (
          <li key={video.id} className="px-4">
            <RowBody
              video={video}
              index={index}
              enrollmentId={enrollmentId}
              isCurrent={video.id === currentVideoId}
              done={completedIds.has(video.id)}
            />
          </li>
        ))}
      </ol>
    )
  }

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const prev = order
    const oldIndex = prev.findIndex((v) => v.id === active.id)
    const newIndex = prev.findIndex((v) => v.id === over.id)
    const reordered = arrayMove(prev, oldIndex, newIndex)
    setOrder(reordered) // optimistic — numbers update instantly

    const res = await reorderCustomPlaylistVideos({
      enrollmentId,
      videoIds: reordered.map((v) => v.id),
    })
    if (res.error) {
      setOrder(prev) // revert
      toast.error(res.error)
    } else {
      router.refresh()
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={order.map((v) => v.id)} strategy={verticalListSortingStrategy}>
        <ol className="max-h-[70vh] overflow-y-auto pb-2">
          {order.map((video, index) => (
            <SortableRow
              key={video.id}
              video={video}
              index={index}
              enrollmentId={enrollmentId}
              isCurrent={video.id === currentVideoId}
              done={completedIds.has(video.id)}
            />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  )
}

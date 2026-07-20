import type { Metadata } from "next"

import { Card, CardContent } from "@workspace/ui/components/card"

import { getFeedback } from "@/lib/admin"
import { FeedbackList } from "@/components/feedback-list"

export const metadata: Metadata = { title: "Feedback · Admin", robots: { index: false } }

export const dynamic = "force-dynamic"

export default async function AdminFeedbackPage() {
  const feedback = await getFeedback()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Feedback</h1>
        <p className="text-muted-foreground text-sm">
          {feedback.length} submission{feedback.length === 1 ? "" : "s"}, newest first. Click a card
          for the full message and who sent it.
        </p>
      </div>

      {feedback.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-10 text-center text-sm">
            No feedback yet.
          </CardContent>
        </Card>
      ) : (
        <FeedbackList feedback={feedback} />
      )}
    </div>
  )
}

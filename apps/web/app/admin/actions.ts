"use server"

import { revalidatePath } from "next/cache"
import { eq } from "drizzle-orm"

import { requireAdmin } from "@/lib/auth"
import { db, schema } from "@/lib/db"

/** Approve or un-approve a feedback submission as a public testimonial. */
export async function setTestimonialApproval(id: string, approved: boolean): Promise<void> {
  await requireAdmin()

  await db
    .update(schema.feedback)
    .set({
      approvedAsTestimonial: approved,
      approvedAt: approved ? new Date() : null,
    })
    .where(eq(schema.feedback.id, id))

  // Landing marquee reads approved testimonials; refresh it and the inbox.
  revalidatePath("/")
  revalidatePath("/admin/feedback")
}

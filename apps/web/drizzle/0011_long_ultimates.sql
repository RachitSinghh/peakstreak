ALTER TABLE "feedback" ADD COLUMN "approved_as_testimonial" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "feedback" ADD COLUMN "approved_at" timestamp with time zone;
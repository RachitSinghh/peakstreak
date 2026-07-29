ALTER TABLE "follows" ADD COLUMN "status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "profile_visibility";
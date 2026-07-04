CREATE TABLE "note_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"video_id" uuid NOT NULL,
	"user_playlist_id" uuid NOT NULL,
	"timestamp_seconds" integer,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "note_entries" ADD CONSTRAINT "note_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_entries" ADD CONSTRAINT "note_entries_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_entries" ADD CONSTRAINT "note_entries_user_playlist_id_user_playlists_id_fk" FOREIGN KEY ("user_playlist_id") REFERENCES "public"."user_playlists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "note_entries_user_video_idx" ON "note_entries" USING btree ("user_id","video_id");--> statement-breakpoint
-- Backfill: carry existing single-document notes into the new model as one
-- untimed entry each, so no note written under PS-9 v1 is lost.
INSERT INTO "note_entries" ("user_id", "video_id", "user_playlist_id", "timestamp_seconds", "body", "created_at", "updated_at")
SELECT "user_id", "video_id", "user_playlist_id", NULL, "content", "created_at", "updated_at"
FROM "notes"
WHERE btrim("content") <> '';
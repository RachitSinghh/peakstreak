ALTER TABLE "todos" ADD COLUMN "video_id" uuid;--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "enrollment_id" uuid;--> statement-breakpoint
ALTER TABLE "todos" ADD CONSTRAINT "todos_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "todos" ADD CONSTRAINT "todos_enrollment_id_user_playlists_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."user_playlists"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "todos_user_video_idx" ON "todos" USING btree ("user_id","video_id");
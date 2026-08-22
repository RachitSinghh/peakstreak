ALTER TABLE "group_members" ADD COLUMN "goal_enrollment_id" uuid;--> statement-breakpoint
ALTER TABLE "study_groups" ADD COLUMN "goal_playlist_id" uuid;--> statement-breakpoint
ALTER TABLE "study_groups" ADD COLUMN "goal_streak_threshold" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_goal_enrollment_id_user_playlists_id_fk" FOREIGN KEY ("goal_enrollment_id") REFERENCES "public"."user_playlists"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_groups" ADD CONSTRAINT "study_groups_goal_playlist_id_playlists_id_fk" FOREIGN KEY ("goal_playlist_id") REFERENCES "public"."playlists"("id") ON DELETE set null ON UPDATE no action;
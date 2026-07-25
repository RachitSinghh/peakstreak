CREATE TABLE "playlist_share_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"playlist_id" uuid NOT NULL,
	"alias" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "playlist_share_links_playlist_id_unique" UNIQUE("playlist_id"),
	CONSTRAINT "playlist_share_links_alias_unique" UNIQUE("alias")
);
--> statement-breakpoint
ALTER TABLE "playlist_share_links" ADD CONSTRAINT "playlist_share_links_playlist_id_playlists_id_fk" FOREIGN KEY ("playlist_id") REFERENCES "public"."playlists"("id") ON DELETE cascade ON UPDATE no action;
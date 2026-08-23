CREATE TABLE "blog_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"target_keyword" text,
	"secondary_keywords" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"intent" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"order" integer,
	"content" text NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blog_posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE INDEX "blog_posts_status_order_idx" ON "blog_posts" USING btree ("status","order");
CREATE TABLE "steam_app_list" (
	"id" text PRIMARY KEY NOT NULL,
	"fetched_at" timestamp with time zone,
	"attempted_at" timestamp with time zone,
	"app_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "steam_apps" (
	"app_id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "game" jsonb;
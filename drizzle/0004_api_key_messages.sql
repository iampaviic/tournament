ALTER TABLE "match_messages" ALTER COLUMN "author_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "match_messages" ADD COLUMN "api_key_name" text;
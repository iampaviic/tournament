CREATE TYPE "public"."match_status" AS ENUM('waiting', 'ready', 'completed', 'bye', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."stage_status" AS ENUM('pending', 'running', 'completed');--> statement-breakpoint
CREATE TYPE "public"."stage_type" AS ENUM('single_elimination', 'double_elimination', 'round_robin', 'swiss');--> statement-breakpoint
CREATE TYPE "public"."tournament_status" AS ENUM('draft', 'registration', 'check_in', 'running', 'completed');--> statement-breakpoint
CREATE TABLE "matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stage_id" uuid NOT NULL,
	"group_index" integer NOT NULL,
	"template_id" text NOT NULL,
	"template" jsonb NOT NULL,
	"result" jsonb,
	"participant1_id" uuid,
	"participant2_id" uuid,
	"status" "match_status" DEFAULT 'waiting' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "matches_stage_id_group_index_template_id_unique" UNIQUE("stage_id","group_index","template_id")
);
--> statement-breakpoint
CREATE TABLE "participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"seed" integer,
	"checked_in_at" timestamp with time zone,
	"final_rank" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "participants_tournament_id_user_id_unique" UNIQUE("tournament_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"index" integer NOT NULL,
	"type" "stage_type" NOT NULL,
	"settings" jsonb NOT NULL,
	"status" "stage_status" DEFAULT 'pending' NOT NULL,
	"groups" jsonb DEFAULT '[]'::jsonb NOT NULL,
	CONSTRAINT "stages_tournament_id_index_unique" UNIQUE("tournament_id","index")
);
--> statement-breakpoint
CREATE TABLE "tournament_requirements" (
	"tournament_id" uuid NOT NULL,
	"module_id" text NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "tournament_requirements_tournament_id_module_id_pk" PRIMARY KEY("tournament_id","module_id")
);
--> statement-breakpoint
CREATE TABLE "tournaments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"starts_at" timestamp with time zone,
	"participant_limit" integer,
	"status" "tournament_status" DEFAULT 'draft' NOT NULL,
	"theme_id" text DEFAULT 'default' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tournaments_org_id_slug_unique" UNIQUE("org_id","slug")
);
--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_stage_id_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stages" ADD CONSTRAINT "stages_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_requirements" ADD CONSTRAINT "tournament_requirements_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "matches_participant1_id_index" ON "matches" USING btree ("participant1_id");--> statement-breakpoint
CREATE INDEX "matches_participant2_id_index" ON "matches" USING btree ("participant2_id");--> statement-breakpoint
CREATE INDEX "participants_user_id_index" ON "participants" USING btree ("user_id");
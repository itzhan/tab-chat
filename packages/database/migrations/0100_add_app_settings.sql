CREATE TABLE IF NOT EXISTS "app_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"accessed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "app_settings" ("key","value") VALUES
  ('sidebar_allowlist','["pages","recents","agent","community","resource","memory"]'::jsonb)
ON CONFLICT ("key") DO NOTHING;

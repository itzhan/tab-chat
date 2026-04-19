CREATE TABLE IF NOT EXISTS "subscription_plans" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"storage_quota_bytes" bigint DEFAULT 0 NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"accessed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "plan_model_quotas" (
	"id" serial PRIMARY KEY NOT NULL,
	"plan_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"model_id" text NOT NULL,
	"monthly_limit" integer DEFAULT 0 NOT NULL,
	"accessed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"plan_id" text NOT NULL,
	"start_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expire_at" timestamp with time zone,
	"status" text DEFAULT 'active' NOT NULL,
	"accessed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "usage_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"model_id" text NOT NULL,
	"period_month" text NOT NULL,
	"message_count" integer DEFAULT 0 NOT NULL,
	"accessed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "boost_packs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"model_id" text NOT NULL,
	"remaining_count" integer NOT NULL,
	"granted_by" text,
	"granted_reason" text,
	"expire_at" timestamp with time zone,
	"accessed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "plan_model_quotas" DROP CONSTRAINT IF EXISTS "plan_model_quotas_plan_id_subscription_plans_id_fk";--> statement-breakpoint
ALTER TABLE "plan_model_quotas" ADD CONSTRAINT "plan_model_quotas_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_subscriptions" DROP CONSTRAINT IF EXISTS "user_subscriptions_user_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_subscriptions" DROP CONSTRAINT IF EXISTS "user_subscriptions_plan_id_subscription_plans_id_fk";--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_records" DROP CONSTRAINT IF EXISTS "usage_records_user_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boost_packs" DROP CONSTRAINT IF EXISTS "boost_packs_user_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "boost_packs" ADD CONSTRAINT "boost_packs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subscription_plans_default_idx" ON "subscription_plans" USING btree ("is_default");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "plan_model_quotas_uq" ON "plan_model_quotas" USING btree ("plan_id","provider_id","model_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "plan_model_quotas_plan_idx" ON "plan_model_quotas" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_subscriptions_user_idx" ON "user_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_subscriptions_status_idx" ON "user_subscriptions" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "usage_records_uq" ON "usage_records" USING btree ("user_id","provider_id","model_id","period_month");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "usage_records_user_idx" ON "usage_records" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "boost_packs_user_model_idx" ON "boost_packs" USING btree ("user_id","provider_id","model_id");--> statement-breakpoint
INSERT INTO "subscription_plans" ("id","name","description","storage_quota_bytes","is_default","enabled","sort_order") VALUES
  ('free','Free','Default free plan with limited quota',104857600,true,true,0),
  ('pro','Pro','Higher limits for power users',2147483648,false,true,10),
  ('enterprise','Enterprise','Unlimited usage for teams',0,false,true,20)
ON CONFLICT ("id") DO NOTHING;

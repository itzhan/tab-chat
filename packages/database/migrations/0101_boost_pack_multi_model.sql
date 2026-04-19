-- Multi-model boost packs: a single row can now cover a group of models that share one
-- remainingCount pool. Legacy rows keep providerId/modelId as-is and leave these columns NULL.

ALTER TABLE "boost_packs" ADD COLUMN IF NOT EXISTS "model_ids" jsonb;
ALTER TABLE "boost_packs" ADD COLUMN IF NOT EXISTS "template_id" text;
ALTER TABLE "boost_packs" ADD COLUMN IF NOT EXISTS "label" text;

-- Generic GIN index so `model_ids @> '[{"providerId":"X","modelId":"Y"}]'` stays cheap.
CREATE INDEX IF NOT EXISTS "boost_packs_model_ids_idx" ON "boost_packs" USING GIN ("model_ids");

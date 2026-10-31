-- Xu Wrap wallet (docs/19 S1): xu are credit lots of kind XU. A plan allowance lot carries the period it was granted
-- for (one per period, by the unique index; NULL keys never collide), and every lot carries the money it is worth.

-- AlterTable
ALTER TABLE "credit_lots" ADD COLUMN     "period_key" TEXT,
ADD COLUMN     "value_vnd" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "credit_lots_user_id_kind_source_period_key_key" ON "credit_lots"("user_id", "kind", "source", "period_key");

-- CHECK constraints
ALTER TABLE "credit_lots"
  ADD CONSTRAINT "chk_credit_lots_value" CHECK ("value_vnd" >= 0),
  -- Only a lot bought with money is worth money: allowance, admin and gift lots are worth 0 (docs/19 D6).
  ADD CONSTRAINT "chk_credit_lots_value_source" CHECK ("value_vnd" = 0 OR "source" = 'PURCHASE'),
  -- A period key marks an allowance lot, and allowance lots exist for xu only.
  ADD CONSTRAINT "chk_credit_lots_period" CHECK (("source" = 'PLAN_ALLOWANCE') = ("period_key" IS NOT NULL)),
  ADD CONSTRAINT "chk_credit_lots_allowance_kind" CHECK ("source" <> 'PLAN_ALLOWANCE' OR "kind" = 'XU');

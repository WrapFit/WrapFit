-- AI patterns paid with xu (docs/19 S3): each AI generation records the xu it cost and the debit that paid for it.
-- Rows written before xu keep credits = 0 and no debit.

-- AlterTable
ALTER TABLE "ai_generations" ADD COLUMN     "credits" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "debit_operation_id" UUID;

-- CHECK constraints
ALTER TABLE "ai_generations" ADD CONSTRAINT "chk_ai_generations_credits" CHECK ("credits" >= 0);

-- Billing core (docs/16 section 6, trimmed by docs/17 S1): payments, export credit ledger (lots + debits), design
-- unlocks, subscriptions, and two columns on export_jobs. CHECK constraints and the partial unique index are not
-- modelled by Prisma: they live only here (prefix chk_).

-- Enum values that schema.prisma gained in f27de76 without a migration: a database built by `migrate deploy` missed
-- them. IF NOT EXISTS keeps databases that got them through `db push` working. PlanService.sync writes PAY_PER_EXPORT.
ALTER TYPE "SubscriptionTier" ADD VALUE IF NOT EXISTS 'PAY_PER_EXPORT' AFTER 'FREE';
ALTER TYPE "ExportFileType" ADD VALUE IF NOT EXISTS 'PDF_A4_PRINT' AFTER 'PDF_CMYK';

-- CreateEnum
CREATE TYPE "PaymentPurpose" AS ENUM ('EXPORT_1', 'EXPORT_5', 'EXPORT_15', 'PRO_MONTH', 'SAMPLE_ORDER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CreditKind" AS ENUM ('EXPORT');

-- CreateEnum
CREATE TYPE "CreditSource" AS ENUM ('PURCHASE', 'ADMIN');

-- CreateEnum
CREATE TYPE "CreditDebitReason" AS ENUM ('EXPORT_UNLOCK', 'ADMIN_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'EXPIRED');

-- AlterTable
ALTER TABLE "export_jobs" ADD COLUMN     "unlock_id" UUID,
ADD COLUMN     "watermarked" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "purpose" "PaymentPurpose" NOT NULL,
    "amount_vnd" INTEGER NOT NULL,
    "reference" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "paid_at" TIMESTAMPTZ(3),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_lots" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "kind" "CreditKind" NOT NULL,
    "source" "CreditSource" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "remaining" INTEGER NOT NULL,
    "expires_at" TIMESTAMPTZ(3),
    "payment_id" UUID,
    "note" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_debits" (
    "id" UUID NOT NULL,
    "operation_id" UUID NOT NULL,
    "lot_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" "CreditDebitReason" NOT NULL,
    "ref_id" TEXT,
    "refunded_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_debits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "export_unlocks" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "project_version" INTEGER NOT NULL,
    "user_id" UUID NOT NULL,
    "debit_operation_id" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "refunded_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "export_unlocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "plan" "SubscriptionTier" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "current_period_start" TIMESTAMPTZ(3) NOT NULL,
    "current_period_end" TIMESTAMPTZ(3) NOT NULL,
    "payment_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payments_reference_key" ON "payments"("reference");

-- CreateIndex
CREATE INDEX "payments_user_id_created_at_idx" ON "payments"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "payments_status_expires_at_idx" ON "payments"("status", "expires_at");

-- CreateIndex
CREATE INDEX "credit_lots_user_id_kind_expires_at_idx" ON "credit_lots"("user_id", "kind", "expires_at");

-- CreateIndex
CREATE INDEX "credit_lots_payment_id_idx" ON "credit_lots"("payment_id");

-- CreateIndex
CREATE INDEX "credit_debits_lot_id_idx" ON "credit_debits"("lot_id");

-- CreateIndex
CREATE INDEX "credit_debits_user_id_created_at_idx" ON "credit_debits"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "credit_debits_operation_id_lot_id_key" ON "credit_debits"("operation_id", "lot_id");

-- CreateIndex
CREATE INDEX "export_unlocks_project_id_project_version_idx" ON "export_unlocks"("project_id", "project_version");

-- CreateIndex
CREATE INDEX "export_unlocks_user_id_idx" ON "export_unlocks"("user_id");

-- CreateIndex
CREATE INDEX "export_unlocks_debit_operation_id_idx" ON "export_unlocks"("debit_operation_id");

-- CreateIndex
CREATE INDEX "subscriptions_user_id_status_idx" ON "subscriptions"("user_id", "status");

-- CreateIndex
CREATE INDEX "subscriptions_payment_id_idx" ON "subscriptions"("payment_id");

-- CreateIndex
CREATE INDEX "export_jobs_unlock_id_idx" ON "export_jobs"("unlock_id");

-- AddForeignKey
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_unlock_id_fkey" FOREIGN KEY ("unlock_id") REFERENCES "export_unlocks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_lots" ADD CONSTRAINT "credit_lots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_lots" ADD CONSTRAINT "credit_lots_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_debits" ADD CONSTRAINT "credit_debits_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "credit_lots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "export_unlocks" ADD CONSTRAINT "export_unlocks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "packaging_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "export_unlocks" ADD CONSTRAINT "export_unlocks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- CHECK constraints
ALTER TABLE "payments"
  ADD CONSTRAINT "chk_payments_amount" CHECK ("amount_vnd" >= 0),
  ADD CONSTRAINT "chk_payments_reference" CHECK ("reference" ~ '^WF[A-Z0-9]{6}$'),
  ADD CONSTRAINT "chk_payments_paid_at" CHECK (("status" = 'PAID') = ("paid_at" IS NOT NULL));
ALTER TABLE "credit_lots"
  ADD CONSTRAINT "chk_credit_lots_quantity" CHECK ("quantity" > 0),
  ADD CONSTRAINT "chk_credit_lots_remaining" CHECK ("remaining" BETWEEN 0 AND "quantity"),
  -- Only a lot granted by hand may never expire: purchased lots last 12 months.
  ADD CONSTRAINT "chk_credit_lots_expiry" CHECK ("expires_at" IS NOT NULL OR "source" = 'ADMIN');
ALTER TABLE "credit_debits" ADD CONSTRAINT "chk_credit_debits_quantity" CHECK ("quantity" > 0);
ALTER TABLE "export_unlocks" ADD CONSTRAINT "chk_export_unlocks_version" CHECK ("project_version" >= 1);
ALTER TABLE "subscriptions"
  ADD CONSTRAINT "chk_subscriptions_plan" CHECK ("plan" IN ('STARTER', 'PRO_BUSINESS')),
  ADD CONSTRAINT "chk_subscriptions_period" CHECK ("current_period_end" > "current_period_start");

-- One live subscription per user.
CREATE UNIQUE INDEX "subscriptions_user_id_active_key" ON "subscriptions"("user_id") WHERE "status" = 'ACTIVE';

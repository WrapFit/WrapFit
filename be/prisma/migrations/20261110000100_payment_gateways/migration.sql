-- Payment gateways (docs/21 S1): real accounts pay by VietQR transfer confirmed by the SePay webhook, demo accounts pay
-- through VNPay sandbox. Every confirmation path records how it confirmed (`confirmed_via`), and every incoming bank
-- transfer is logged in `bank_transactions` so an unmatched one can be reconciled by an admin.

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('VIETQR', 'VNPAY');

-- CreateEnum
CREATE TYPE "PaymentConfirmation" AS ENUM ('SEPAY_WEBHOOK', 'VNPAY_IPN', 'VNPAY_RETURN', 'SIMULATION', 'ADMIN');

-- CreateEnum
CREATE TYPE "BankTxStatus" AS ENUM ('MATCHED', 'UNMATCHED', 'RESOLVED', 'IGNORED');

-- CreateEnum
CREATE TYPE "BankTxUnmatchedReason" AS ENUM ('NO_REFERENCE', 'NOT_FOUND', 'AMOUNT_MISMATCH', 'EXPIRED', 'ALREADY_PAID');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "is_demo" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "provider" "PaymentProvider" NOT NULL DEFAULT 'VIETQR',
ADD COLUMN     "confirmed_via" "PaymentConfirmation",
ADD COLUMN     "provider_txn_id" TEXT;

-- CreateTable
CREATE TABLE "bank_transactions" (
    "id" UUID NOT NULL,
    "external_id" TEXT NOT NULL,
    "gateway" TEXT NOT NULL,
    "account_no" TEXT NOT NULL,
    "amount_vnd" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "bank_reference" TEXT NOT NULL,
    "extracted_reference" TEXT,
    "transaction_at" TIMESTAMPTZ(3) NOT NULL,
    "status" "BankTxStatus" NOT NULL,
    "unmatched_reason" "BankTxUnmatchedReason",
    "payment_id" UUID,
    "resolved_by" UUID,
    "resolved_note" TEXT,
    "raw" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bank_transactions_external_id_key" ON "bank_transactions"("external_id");

-- CreateIndex
CREATE INDEX "bank_transactions_status_created_at_idx" ON "bank_transactions"("status", "created_at");

-- CreateIndex
CREATE INDEX "bank_transactions_payment_id_idx" ON "bank_transactions"("payment_id");

-- CreateIndex
CREATE INDEX "bank_transactions_resolved_by_idx" ON "bank_transactions"("resolved_by");

-- AddForeignKey
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CHECK constraints
ALTER TABLE "bank_transactions" ADD CONSTRAINT "chk_bank_transactions_amount" CHECK ("amount_vnd" > 0);

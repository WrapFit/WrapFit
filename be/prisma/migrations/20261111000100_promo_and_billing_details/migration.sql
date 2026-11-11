-- Promo codes of sample orders are applied by the server (shared/src/billing/promo.ts): the discount is stored and
-- the total is subtotal + shipping - discount.
ALTER TABLE "orders"
  ADD COLUMN "discount_vnd" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "promo_code" TEXT;

ALTER TABLE "orders" DROP CONSTRAINT "chk_orders_amounts";
ALTER TABLE "orders"
  ADD CONSTRAINT "chk_orders_amounts" CHECK (
    "subtotal_vnd" >= 0 AND "shipping_vnd" >= 0 AND "discount_vnd" >= 0
    AND "total_vnd" >= 0 AND "total_vnd" = "subtotal_vnd" + "shipping_vnd" - "discount_vnd"
  );

-- VAT invoice details of a customer ({ company, taxCode, email }), edited on /dashboard/billing.
ALTER TABLE "users" ADD COLUMN "billing_details" JSONB;

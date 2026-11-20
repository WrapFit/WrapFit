-- docs/19 mục B, A.8, G.3: xưởng in vào DB (trước đây viết cứng trong PrintShopsService), phí nền tảng chụp theo đơn,
-- tỉnh nhận hàng có cấu trúc và sổ cái đơn in chỉ ghi thêm.

-- CreateEnum
CREATE TYPE "PrintShopStatus" AS ENUM ('ACTIVE', 'REVIEW', 'PAUSED', 'SUSPENDED');
CREATE TYPE "PrintShopMemberRole" AS ENUM ('OWNER', 'STAFF');
CREATE TYPE "LedgerEntryType" AS ENUM ('CUSTOMER_PAYMENT', 'PLATFORM_FEE', 'SHOP_PAYABLE', 'PLATFORM_FEE_REVERSAL', 'REFUND', 'PAYOUT', 'ADJUSTMENT');

-- CreateTable
CREATE TABLE "print_shops" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legal_name" TEXT,
    "tax_code" TEXT,
    "province_code" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "sheet_label" TEXT NOT NULL,
    "max_sheet_width_mm" INTEGER NOT NULL,
    "max_sheet_height_mm" INTEGER NOT NULL,
    "services" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "methods" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "papers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "finishes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "window_patching" BOOLEAN NOT NULL DEFAULT false,
    "min_quantity" INTEGER NOT NULL DEFAULT 1,
    "max_quantity" INTEGER NOT NULL DEFAULT 10000,
    "lead_time_label" TEXT NOT NULL,
    "lead_time_days" INTEGER NOT NULL,
    "sample_lead_time_days" INTEGER NOT NULL,
    "daily_capacity" INTEGER NOT NULL DEFAULT 10,
    "service_provinces" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "PrintShopStatus" NOT NULL DEFAULT 'REVIEW',
    "paused_until" TIMESTAMPTZ(3),
    "probation_until" TIMESTAMPTZ(3),
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "completed_orders" INTEGER NOT NULL DEFAULT 0,
    "contact_email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "zalo" TEXT,
    "platform_fee_bps" INTEGER NOT NULL DEFAULT 1500,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "print_shops_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_print_shops_quantities" CHECK ("min_quantity" >= 1 AND "max_quantity" >= "min_quantity"),
    CONSTRAINT "chk_print_shops_sheet" CHECK ("max_sheet_width_mm" > 0 AND "max_sheet_height_mm" > 0),
    CONSTRAINT "chk_print_shops_days" CHECK ("lead_time_days" >= 0 AND "sample_lead_time_days" >= 0 AND "daily_capacity" >= 1),
    CONSTRAINT "chk_print_shops_rating" CHECK ("rating" BETWEEN 0 AND 5 AND "completed_orders" >= 0),
    CONSTRAINT "chk_print_shops_fee" CHECK ("platform_fee_bps" BETWEEN 0 AND 5000)
);
CREATE INDEX "print_shops_status_idx" ON "print_shops"("status");

-- The four partners of the former PrintShopsService, same ids (orders.print_shop_id points at them).
INSERT INTO "print_shops" (
  "id", "name", "province_code", "city", "address", "latitude", "longitude", "sheet_label", "max_sheet_width_mm",
  "max_sheet_height_mm", "services", "methods", "papers", "finishes", "window_patching", "min_quantity", "max_quantity",
  "lead_time_label", "lead_time_days", "sample_lead_time_days", "daily_capacity", "status", "rating", "completed_orders",
  "contact_email", "phone", "updated_at"
) VALUES
  ('ps-sg-01', 'In Bao Bì Sài Gòn Xanh', 'ho-chi-minh', 'TP. Hồ Chí Minh', 'Khu Công Nghiệp Tân Bình, P. Tây Thạnh, TP. Hồ Chí Minh',
   10.807, 106.618, 'B1 · 1020 × 720 mm', 1020, 720,
   ARRAY['Offset 4 màu', 'Bế tự động', 'Ép kim vàng', 'Cắt kỹ thuật số phẳng Zero-MOQ'],
   ARRAY['digital', 'offset'], ARRAY['ivory', 'kraft', 'duplex'], ARRAY['matte-lamination', 'gloss-lamination', 'foil'],
   true, 1, 20000, '3–5 ngày (Mẫu thử 24h)', 3, 1, 20, 'ACTIVE', 4.9, 1420, 'partner@saigonxanhprint.vn', '028 3816 xxxx', CURRENT_TIMESTAMP),
  ('ps-hn-02', 'Hộp Giấy Hà Thành', 'ha-noi', 'Hà Nội', 'Cụm Công Nghiệp Hai Bà Trưng, P. Vĩnh Tuy, Hà Nội',
   21.000, 105.873, 'B1 · 1020 × 720 mm', 1020, 720,
   ARRAY['Hộp cứng cao cấp', 'Bồi carton sóng E', 'Cán màng mờ Soft-Touch', 'In mẫu thử'],
   ARRAY['offset'], ARRAY['ivory', 'duplex', 'rigid'], ARRAY['matte-lamination', 'soft-touch-lamination', 'foil', 'emboss'],
   false, 1, 20000, '5–7 ngày (Mẫu thử 48h)', 5, 2, 15, 'ACTIVE', 4.8, 980, 'xuongin@hathanhbox.vn', '024 3972 xxxx', CURRENT_TIMESTAMP),
  ('ps-dn-03', 'Kraft Đà Nẵng CNC', 'da-nang', 'Đà Nẵng', 'Khu Công Nghiệp Hòa Khánh, Đà Nẵng',
   16.073, 108.150, 'B2 · 720 × 520 mm', 720, 520,
   ARRAY['In kỹ thuật số nhanh', 'Cắt laser & dao rung', 'Giấy kraft tái chế'],
   ARRAY['digital'], ARRAY['ivory', 'kraft'], ARRAY[]::TEXT[],
   false, 1, 1000, '2–3 ngày', 2, 2, 10, 'ACTIVE', 4.7, 560, 'danang@kraftprint.vn', '0236 373 xxxx', CURRENT_TIMESTAMP),
  ('ps-ct-04', 'Xưởng In Mộc Cần Thơ', 'can-tho', 'Cần Thơ', 'Khu Công Nghiệp Trà Nóc, Cần Thơ',
   10.090, 105.720, 'B2 · 720 × 520 mm', 720, 520,
   ARRAY['In offset', 'Cán màng bóng/mờ', 'Bao bì nông sản'],
   ARRAY['offset'], ARRAY['ivory', 'kraft', 'duplex'], ARRAY['matte-lamination', 'gloss-lamination'],
   false, 1, 20000, '5–7 ngày', 5, 3, 8, 'REVIEW', 4.6, 310, 'cantho@mocprint.vn', '0292 384 xxxx', CURRENT_TIMESTAMP);

-- Any other shop id already used by an order or a member gets a paused placeholder, so the foreign keys can be added.
INSERT INTO "print_shops" (
  "id", "name", "province_code", "city", "address", "latitude", "longitude", "sheet_label", "max_sheet_width_mm",
  "max_sheet_height_mm", "lead_time_label", "lead_time_days", "sample_lead_time_days", "status", "contact_email", "phone",
  "updated_at"
)
SELECT DISTINCT ref.id, ref.id, 'ho-chi-minh', '—', '—', 10.776, 106.7, 'B2 · 720 × 520 mm', 720, 520, '—', 5, 3, 'PAUSED'::"PrintShopStatus", '—', '—', CURRENT_TIMESTAMP
FROM (SELECT "print_shop_id" AS id FROM "orders" UNION SELECT "print_shop_id" FROM "print_shop_members") ref
WHERE ref.id NOT IN (SELECT "id" FROM "print_shops");

-- AlterTable: orders
ALTER TABLE "orders" ADD COLUMN "recipient_province" TEXT,
ADD COLUMN "platform_fee_bps" INTEGER NOT NULL DEFAULT 1500,
ADD COLUMN "platform_fee_vnd" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "shop_payable_vnd" INTEGER NOT NULL DEFAULT 0;

-- Orders placed before: 15 % of the boxes (subtotal − discount), rounded to 100đ like the quote.
UPDATE "orders" SET
  "platform_fee_vnd" = LEAST("total_vnd", (ROUND(("subtotal_vnd" - "discount_vnd") * 0.15 / 100.0) * 100)::INTEGER),
  "shop_payable_vnd" = "total_vnd" - LEAST("total_vnd", (ROUND(("subtotal_vnd" - "discount_vnd") * 0.15 / 100.0) * 100)::INTEGER);

ALTER TABLE "orders"
  ADD CONSTRAINT "chk_orders_platform_fee" CHECK (
    "platform_fee_bps" BETWEEN 0 AND 5000 AND "platform_fee_vnd" >= 0 AND "shop_payable_vnd" = "total_vnd" - "platform_fee_vnd"
  );

ALTER TABLE "orders" ADD CONSTRAINT "orders_print_shop_id_fkey" FOREIGN KEY ("print_shop_id") REFERENCES "print_shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: print_shop_members
ALTER TABLE "print_shop_members" ADD COLUMN "role" "PrintShopMemberRole" NOT NULL DEFAULT 'OWNER';
ALTER TABLE "print_shop_members" ADD CONSTRAINT "print_shop_members_print_shop_id_fkey" FOREIGN KEY ("print_shop_id") REFERENCES "print_shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: ledger_entries
CREATE TABLE "ledger_entries" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "type" "LedgerEntryType" NOT NULL,
    "amount_vnd" INTEGER NOT NULL,
    "order_id" UUID,
    "print_shop_id" TEXT,
    "payment_id" UUID,
    "note" TEXT,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_ledger_entries_amount" CHECK ("amount_vnd" > 0),
    CONSTRAINT "chk_ledger_entries_adjustment_note" CHECK ("type" <> 'ADJUSTMENT' OR "note" IS NOT NULL)
);
CREATE UNIQUE INDEX "ledger_entries_key_key" ON "ledger_entries"("key");
CREATE INDEX "ledger_entries_order_id_idx" ON "ledger_entries"("order_id");
CREATE INDEX "ledger_entries_print_shop_id_created_at_idx" ON "ledger_entries"("print_shop_id", "created_at");
CREATE INDEX "ledger_entries_type_created_at_idx" ON "ledger_entries"("type", "created_at");
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_print_shop_id_fkey" FOREIGN KEY ("print_shop_id") REFERENCES "print_shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Append-only (docs/19 BR-G5): a posted entry is corrected by a new entry, never edited or removed. The only way
-- around it is a transaction that sets `wrapfit.allow_ledger_purge` = 'on' (SET LOCAL), used by the e2e cleanup of
-- test accounts; the application never sets it.
CREATE FUNCTION "ledger_entries_append_only"() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' AND current_setting('wrapfit.allow_ledger_purge', true) = 'on' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'ledger_entries is append-only: post a correcting entry instead';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "ledger_entries_no_update_delete"
BEFORE UPDATE OR DELETE ON "ledger_entries"
FOR EACH ROW EXECUTE FUNCTION "ledger_entries_append_only"();

-- Entries of the orders already paid or delivered, so the reports start complete.
INSERT INTO "ledger_entries" ("id", "key", "type", "amount_vnd", "order_id", "print_shop_id", "payment_id", "note", "created_at")
SELECT gen_random_uuid(), 'order:' || o."id" || ':CUSTOMER_PAYMENT', 'CUSTOMER_PAYMENT', o."total_vnd", o."id", o."print_shop_id", o."payment_id", 'backfill', o."paid_at"
FROM "orders" o WHERE o."paid_at" IS NOT NULL AND o."total_vnd" > 0;

INSERT INTO "ledger_entries" ("id", "key", "type", "amount_vnd", "order_id", "print_shop_id", "note", "created_at")
SELECT gen_random_uuid(), 'order:' || o."id" || ':PLATFORM_FEE', 'PLATFORM_FEE', o."platform_fee_vnd", o."id", o."print_shop_id", 'backfill', o."delivered_at"
FROM "orders" o WHERE o."status" = 'DELIVERED' AND o."platform_fee_vnd" > 0;

INSERT INTO "ledger_entries" ("id", "key", "type", "amount_vnd", "order_id", "print_shop_id", "note", "created_at")
SELECT gen_random_uuid(), 'order:' || o."id" || ':SHOP_PAYABLE', 'SHOP_PAYABLE', o."shop_payable_vnd", o."id", o."print_shop_id", 'backfill', o."delivered_at"
FROM "orders" o WHERE o."status" = 'DELIVERED' AND o."shop_payable_vnd" > 0;

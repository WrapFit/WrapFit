-- docs/19 G.1–G.5: the shop takes or refuses a paid order, ships with a carrier and a tracking code, the customer and
-- the shop talk in the order, and order events reach the notification bell.

-- CreateEnum
CREATE TYPE "OrderMessageAuthor" AS ENUM ('CUSTOMER', 'SHOP', 'ADMIN', 'SYSTEM');

-- AlterEnum (the new values are not used in this migration)
ALTER TYPE "NotificationType" ADD VALUE 'ORDER_UPDATE';
ALTER TYPE "NotificationType" ADD VALUE 'ORDER_MESSAGE';
ALTER TYPE "NotificationType" ADD VALUE 'ORDER_NEW';
ALTER TYPE "NotificationType" ADD VALUE 'ORDER_ALERT';

-- AlterTable: orders
ALTER TABLE "orders" ADD COLUMN "accept_deadline" TIMESTAMPTZ(3),
ADD COLUMN "accepted_at" TIMESTAMPTZ(3),
ADD COLUMN "rejected_at" TIMESTAMPTZ(3),
ADD COLUMN "reject_reason" TEXT,
ADD COLUMN "admin_alerted_at" TIMESTAMPTZ(3),
ADD COLUMN "shop_notified_at" TIMESTAMPTZ(3),
ADD COLUMN "estimated_delivery" TEXT,
ADD COLUMN "carrier" TEXT,
ADD COLUMN "tracking_code" TEXT,
ADD COLUMN "customer_read_at" TIMESTAMPTZ(3),
ADD COLUMN "shop_read_at" TIMESTAMPTZ(3);

-- Orders the shops already worked on count as taken when they were paid; paid orders waiting get a deadline a day after
-- their payment (the API computes it in working hours for new orders, @wrapfit/shared acceptDeadlineFrom).
UPDATE "orders" SET "accepted_at" = COALESCE("paid_at", "created_at")
WHERE "status" IN ('IN_PRODUCTION', 'SHIPPED', 'DELIVERED');
UPDATE "orders" SET "accept_deadline" = "paid_at" + INTERVAL '24 hours'
WHERE "status" = 'PAID' AND "paid_at" IS NOT NULL;
-- Shops already knew about the orders placed before the portal: no "new order" notification for them.
UPDATE "orders" SET "shop_notified_at" = COALESCE("paid_at", "created_at") WHERE "status" <> 'PENDING_PAYMENT';

ALTER TABLE "orders"
  ADD CONSTRAINT "chk_orders_estimated_delivery" CHECK ("estimated_delivery" IS NULL OR "estimated_delivery" ~ '^\d{4}-\d{2}-\d{2}$'),
  ADD CONSTRAINT "chk_orders_reject_reason" CHECK ("rejected_at" IS NULL OR "reject_reason" IS NOT NULL),
  ADD CONSTRAINT "chk_orders_tracking" CHECK ("tracking_code" IS NULL OR "carrier" IS NOT NULL);

-- AlterTable: notifications (an order notification has no project)
ALTER TABLE "notifications" ADD COLUMN "order_id" UUID,
ALTER COLUMN "project_id" DROP NOT NULL;
ALTER TABLE "notifications" ADD CONSTRAINT "chk_notifications_target" CHECK ("project_id" IS NOT NULL OR "order_id" IS NOT NULL);
CREATE INDEX "notifications_order_id_idx" ON "notifications"("order_id");
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: order_messages
CREATE TABLE "order_messages" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "author_id" UUID,
    "author_role" "OrderMessageAuthor" NOT NULL,
    "body" TEXT NOT NULL,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_messages_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_order_messages_body" CHECK (char_length(btrim("body")) BETWEEN 1 AND 2000)
);
CREATE INDEX "order_messages_order_id_created_at_idx" ON "order_messages"("order_id", "created_at");
CREATE INDEX "order_messages_author_id_idx" ON "order_messages"("author_id");
ALTER TABLE "order_messages" ADD CONSTRAINT "order_messages_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_messages" ADD CONSTRAINT "order_messages_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

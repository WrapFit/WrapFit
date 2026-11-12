-- VietQR payments (docs/17 S5): an order paid by a payment points to it. The column exists since 20261030000300_orders
-- without a foreign key; S5 adds it. Deleting a payment keeps the order and clears the link.
ALTER TABLE "orders" ADD CONSTRAINT "orders_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

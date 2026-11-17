-- Mã đơn mới có 6 chữ số (WF-<năm>-<6 số>, 1.000.000 mã mỗi năm thay vì 10.000). Mã 4 số của các đơn cũ vẫn hợp lệ.
ALTER TABLE "orders" DROP CONSTRAINT "chk_orders_order_code";
ALTER TABLE "orders"
  ADD CONSTRAINT "chk_orders_order_code" CHECK ("order_code" ~ '^WF-[0-9]{4}-([0-9]{4}|[0-9]{6})$');

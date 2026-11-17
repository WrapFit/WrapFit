-- Khuôn khay xách ly (cup-carrier): migration 20261115000200 chỉ thêm ngành BEVERAGE, chưa chèn dòng box_templates,
-- nên DB chưa chạy lại seed báo "Unknown or inactive template: cup-carrier" khi lưu dự án. Chèn idempotent, khớp prisma/seed-data.ts.
INSERT INTO "box_templates" ("id", "name", "category", "description", "formula_schema", "formula_version", "is_curated", "is_active")
VALUES (
  'cup-carrier',
  'Khay Xách Ly (Cup Carrier)',
  'beverage',
  'Vỏ bìa một mảnh hở hai đầu: đáy khoét lỗ đặt ly, hai vai gập vào, quai đôi dán lưng có lỗ xỏ tay — cho quán cà phê, trà sữa giao 1–4 ly (dài theo hàng ly, rộng theo miệng ly).',
  '{"generator":"generateCupCarrierDieline","params":{"length":{"unit":"mm","min":40,"max":600},"width":{"unit":"mm","min":30,"max":600},"height":{"unit":"mm","min":20,"max":600},"paperThickness":{"unit":"mm","min":0.2,"max":1.5}}}'::jsonb,
  3, true, true
)
ON CONFLICT ("id") DO UPDATE SET "is_active" = true;

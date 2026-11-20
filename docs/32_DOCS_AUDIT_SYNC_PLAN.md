# 32. Kế hoạch đồng bộ tài liệu sau audit docs

> Ngày lập: 2026-11-19 · Cập nhật: 2026-11-19, đã chốt Q1–Q5 · Nhánh gốc: `develop` (09ca9d4) · Nhánh tích hợp: `docs/sync-after-audit` · Trạng thái: **S0–S10 xong, chờ chủ dự án đối chiếu với bản audit**
> Phạm vi gồm bốn phần:
> - 34 file Markdown trong `docs/` và 9 ảnh của [14](assets/14/).
> - Kịch bản FE `fe/scripts/e2e-scenario.mjs` (theo Q3).
> - Các chú thích trong mã đang trỏ tới docs. Phần này phải sửa vì docs được đánh số lại (theo Q1).
> - [Bản audit](README.md) giữ nguyên, không sửa và không commit (theo Q2).
>
> Plan này luôn dùng **số file cũ**. Bảng đổi số ở §4.2.

## 1. Hiện trạng

Khi lập plan (2026-11-19, commit 09ca9d4), đã kiểm lại các phát hiện chính của audit với mã. **Tất cả đều đúng.** Các chi tiết dưới đây là mốc để từng session đối chiếu:

- **CSDL.** `be/prisma/schema.prisma` có 32 model. Mục 2 của 02 đánh số 16 dòng, trong đó một dòng đã gạch (`social_mockups`). Vậy 02 đang mô tả 15 bảng còn dùng. Dòng 3 vẫn ghi `box_templates` là "4 cấu trúc hộp MVP".
- **Cấu trúc hộp.** `be/prisma/seed-data.ts` có 11 cấu trúc: `tuck-top`, `sleeve-drawer`, `lid-base`, `pillow`, `mailer`, `gable`, `cup-carrier`, `insert`, `hang-tag`, `folded-card`, `belly-band`. Thư viện công thức còn có `sticker-label` (`shared/src/parametric/sticker-label.ts`).
- **Thông số in.** `shared/src/print/prepress.ts` ghi lề cắt 5 mm, lề gấp 3 mm, bleed 2 mm, `BleedBox` 3 mm, 300 DPI và ngưỡng chặn 150 DPI. Docs còn ghi sai ở:
  - 00, dòng 26: lề an toàn chung 3 mm.
  - 01, dòng 19–20: 3 mm và 200 DPI.
  - 05, dòng 17 và 52: lề an toàn 3 mm.
  - 06, dòng 282–286: 3 mm và 200 DPI.
  - 06, dòng 351: `BleedBox` = phôi + 2 mm.
- **Xuất file.** 03 còn bốn chỗ mô tả luồng cũ:
  - Dòng 75: request còn `useCredit?`.
  - Dòng 77: `GET …/exports/access` ghi trả `{ mode, unlocked, unlockExpiresAt, balance }`. Mã hiện trả `{ unlocked, unlockExpiresAt }`.
  - Dòng 147–151: còn `EXPORT_CREDIT_REQUIRED` và PDF A4 có watermark.
  - Phản hồi job vẫn có trường `watermarked` (hàm `view` trong `export.service.ts`). Đọc lại cách job mới đặt giá trị trường này trước khi viết, và không xóa trường khỏi tài liệu khi API còn trả về.
- **Thanh toán.** `PAYMENT_TERMS_VERSION = "2026-11-12"` (`shared/src/billing/terms.ts`). `XU_CUSTOM = { min: 100, max: 50_000, step: 10 }` (`shared/src/billing/xu.ts`). Test mã đơn khớp `^WF-\d{4}-\d{6}$`.
- **Script FE.** `fe/scripts/e2e-scenario.mjs` hỏng ở bốn bước:
  - **Bước 7** (dòng 727–736) chờ "Có watermark" và tải PDF A4 miễn phí.
  - **Bước 16** (dòng 944–986) chờ "Cần 1 lượt xuất", bấm "Mua 1 lượt" và đọc `balance`.
  - **Bước 17** cũng hỏng. Tài khoản mới tạo không phải demo, nên thanh toán đi VietQR. Khi máy chủ có tài khoản VietQR thật, nút giả lập bị từ chối với `SIMULATION_DEMO_ONLY` (`assertMaySimulate` trong `be/src/payments/payments.service.ts`). Từ `develop` fb720a9, máy chủ không có `VIETQR_*` cho mọi tài khoản giả lập (xem §2).
  - **Bước 18** kỳ vọng `PDF_A4_PRINT >= 1`.

  Phần đầu script còn trỏ tới docs/12 §7 và docs/17 §5. Admin bật được cờ demo cho tài khoản qua `PATCH /api/users/:id` với `{ isDemo: true }`.
- **Mã trỏ tới docs.** Ngoài `docs/`, mã có hơn 600 chỗ ghi `docs/NN`. Nhiều nhất là:

  | Tham chiếu | Số chỗ |
  |---|---|
  | `docs/23` | 223 |
  | `docs/25` | 93 |
  | `docs/19` | 57 |
  | `docs/17` | 53 |
  | `docs/21` | 47 |
  | `docs/30` | 42 |

  Migration Prisma có thêm 22 chỗ. Đã chạy thử script ở §4.3 ở chế độ xem trước: sau khi gỡ file, script sẽ sửa 682 chỗ trong 290 file giữ lại.
- **Docs giữ lại có liên kết tới docs sẽ gỡ.** Số dòng mỗi file:

  | File | Số dòng | File | Số dòng |
  |---|---|---|---|
  | 18 | 16 | 03, 04 | mỗi file 4 |
  | 28 | 15 | 02, 11, 13, blueprint | mỗi file 2 |
  | 06 | 6 | 14, 24 | mỗi file 1 |
  | 16 | 5 | | |

- **Liên kết.** Không có liên kết tương đối nào trong `docs/*.md` bị hỏng (lệnh kiểm ở §6.3).
- **Đối chiếu 02.** Lệnh kiểm của S1 in đúng 17 tên bảng còn thiếu, khớp với audit.
- **Đối chiếu 09.** Lệnh kiểm của S6 cho thấy 09 còn nhắc `be/src/shipping/`, một thư mục không tồn tại.
- **Từ khóa luồng cũ.** Bảng dưới đếm số dòng chứa ít nhất một từ khóa: `useCredit`, `EXPORT_CREDIT_REQUIRED`, `Có watermark`, `Mua 1 lượt`, `200 DPI`, `EXPORT_PACK`, `watermark`.

  | File | Số dòng | File | Số dòng |
  |---|---|---|---|
  | 16 | 36 | 18 | 3 |
  | 17 | 23 | 19 | 2 |
  | 26 | 9 | 04, 06, 20, 27, 27a | mỗi file 1 |
  | 25 | 7 | `fe/scripts/e2e-scenario.mjs` | 8 |
  | 03, 28 | mỗi file 5 | | |

- **Công cụ.** PowerShell trên máy làm không có `rg`. Các lệnh trong plan vì vậy dùng `git grep`, `Select-String` và `node`.

Trạng thái Git:

- Bản audit (`docs/README.md`), 26, 27, 27a và 31 **chưa được Git theo dõi**.
- `NasaFilm/` cũng chưa được theo dõi. Thư mục này không thuộc dự án.
- Mọi commit của đợt này chỉ `git add` đúng file đã sửa. Không dùng `git add -A` hoặc `git add .`.

## 2. Bảng thông tin dùng chung

Mọi session viết các giá trị dưới đây **giống nhau** ở mọi file. Nếu mã đổi trong lúc làm, sửa bảng này trước, rồi mới sửa các file khác.

| Chủ đề | Viết vào docs | Nguồn trong mã |
|---|---|---|
| Yêu cầu xuất file | Request chỉ có `{ fileType }`. Gửi thêm `useCredit` → `400`, vì `ValidationPipe` bật `forbidNonWhitelisted` | [DTO](../be/src/export/dto/create-export.dto.ts) · [ValidationPipe](../be/src/app.middleware.ts) |
| Kết quả xuất file | Thành công → `202 { jobId, status, fitCheck }`. FitCheck có lỗi mức `error` → `422`. Thiếu quyền → `402 ORDER_PAYMENT_REQUIRED` | [Controller](../be/src/export/export.controller.ts) · [Service](../be/src/export/export.service.ts) · [Mã lỗi](../be/src/billing/billing.errors.ts) |
| Quyền xuất | Có quyền khi có đơn đã trả tiền, chưa hủy, đúng phiên bản thiết kế, hoặc khi quyền mở khóa cũ còn hạn. Đổi tên giữ quyền. Sửa thiết kế tạo phiên bản mới, phiên bản đó cần quyền mới. `GET …/exports/access` → `{ unlocked, unlockExpiresAt }` | [Service](../be/src/export/export.service.ts) |
| Job xuất | API khóa bản thiết kế, chạy FitCheck và lưu thiết kế cùng job. Worker dựng file từ thiết kế đã lưu, có nhánh tương thích cho job cũ có `design = NULL` | [Xử lý job](../be/src/export/export.processor.ts) |
| Tạo thanh toán | Body có `termsVersion` = `PAYMENT_TERMS_VERSION` (hiện là `2026-11-12`). Thêm `orderId` khi `SAMPLE_ORDER`, `xu` khi `XU_CUSTOM` (100–50.000 xu, bội số của 10). Gói `EXPORT_*` → `400 EXPORT_PACK_DISCONTINUED` | [DTO](../be/src/payments/dto/create-payment.dto.ts) · [Điều khoản](../shared/src/billing/terms.ts) · [Xu](../shared/src/billing/xu.ts) |
| Cổng thanh toán | Tài khoản demo (`users.is_demo`) dùng VNPay sandbox. Tài khoản thường dùng VietQR/SePay. Giả lập thanh toán chỉ mở khi máy chủ bật `PAYMENT_SIMULATION=true`. Khi đó tài khoản demo luôn được giả lập. Tài khoản thường chỉ được giả lập khi máy chủ chưa cấu hình `VIETQR_*` (QR dùng tài khoản mẫu "WRAPFIT MO PHONG", không thể nhận tiền thật). Có tài khoản VietQR thật thì tài khoản thường giả lập → `403 SIMULATION_DEMO_ONLY` | [Chọn cổng và `assertMaySimulate`](../be/src/payments/payments.service.ts) · [Cờ giả lập](../be/src/billing/billing.service.ts) |
| Mã đơn in | `WF-<năm>-<6 chữ số>` | [Test](../be/src/orders/orders.service.spec.ts) |
| Thông số in | Nội dung cách nét cắt 5 mm, cách nếp gấp 3 mm. Nền chạm nét cắt tràn ≥ 2 mm. `BleedBox` của PDF là 3 mm | [Prepress](../shared/src/print/prepress.ts) |
| Mức vi phạm lề | Thiếu lề (`CUT_OVERLAP`, `CREASE_OVERLAP`) là cảnh báo. Cách dưới 1 mm hoặc tràn ra ngoài mặt thì thành lỗi chặn xuất | [Validator](../shared/src/fitcheck/validator.ts) |
| DPI | Chỉ áp dụng ảnh raster có DPI, tính ở kích thước in. Từ 150 đến dưới 300 → cảnh báo. Dưới 150 → lỗi chặn | [Prepress](../shared/src/print/prepress.ts) · [Validator](../shared/src/fitcheck/validator.ts) |
| Điều kiện FitCheck | Xuất file khi không còn lỗi mức `error`. Mốc ≥ 90 điểm chỉ dùng khi đưa mẫu vào thư viện cộng đồng | [Validator](../shared/src/fitcheck/validator.ts) · [Thư viện](../be/src/templates/templates.service.ts) |
| Bước Studio | **Kiểu hộp → Kích thước → Giấy → Thiết kế → Quà & mở hộp → Đặt in**. Khi mở dự án đã có, bước kiểu hộp đã được chọn sẵn | [Stepper](../fe/src/features/studio/components/StudioStepper.tsx) |
| Cấu trúc hộp | MVP ban đầu có 4 cấu trúc: `tuck-top`, `sleeve-drawer`, `lid-base`, `pillow`. Seed hiện có 11 cấu trúc. Bộ công thức v3 có thêm `sticker-label`. Mỗi lần nêu số, ghi rõ đang đếm cấu trúc trong DB hay công thức | [Seed](../be/prisma/seed-data.ts) · [Registry](../shared/src/parametric/registry.ts) |
| CSDL | 32 bảng | [Schema](../be/prisma/schema.prisma) |
| Đơn giữ thiết kế | Đơn `PENDING_PAYMENT`, `PAID` hoặc `IN_PRODUCTION`. Xóa vĩnh viễn thủ công → `409 PROJECT_IN_ACTIVE_ORDER`. Tác vụ dọn thùng rác bỏ qua dự án đó | [Trạng thái](../be/src/orders/order-status.ts) · [Service](../be/src/projects/application/projects.service.ts) |
| Duyệt mẫu | Duyệt theo token, gắn với phiên bản khách đã xem. Phiên bản lệch → `409 DESIGN_CHANGED` | [Controller](../be/src/reviews/reviews.controller.ts) · [Service](../be/src/reviews/reviews.service.ts) |
| Hoa văn AI | Tính bằng xu. Thiếu xu → `402 INSUFFICIENT_CREDITS { kind: 'XU', balance, cost }`. Khi AI tắt hoặc hết ngân sách, có thể trả hoa văn thuật toán miễn phí | [AI](../be/src/ai/ai-pattern.service.ts) |
| Kiến trúc đang chạy | Next.js 15 (15.5.27), NestJS API và một worker riêng với ba hàng đợi `export`, `mail`, `ai-image`. FitCheck chặn ở API khi tạo job | [FE](../fe/package.json) · [Worker](../be/src/worker.ts) |
| Số test | 1.180/1.180 unit (77 bộ) và 318/318 E2E (24 bộ), backend, ngày 19/11/2026 | [Audit](README.md) |

## 3. Quyết định

### 3.1 Chủ dự án đã chốt (2026-11-19)

| Q | Câu hỏi | Quyết định | Áp dụng ở |
|---|---|---|---|
| Q1 | Lưu trữ các kế hoạch đã xong bằng cách nào? | **Xóa hẳn**, rồi đánh số lại các file còn lại | §4, S10 |
| Q2 | Xử lý bản audit và 26, 27, 27a, 31 thế nào? | **26, 27, 27a và 31 bị xóa** khi đợt này xong, vì không còn dùng. Không sửa các file này. Bản audit giữ nguyên, không commit. Chủ dự án tự xóa bản audit sau khi xác nhận công việc đã xong | §4.1, S10 |
| Q3 | Có sửa `fe/scripts/e2e-scenario.mjs` (28 #14) trong đợt này không? | **Có**, làm ở luồng D | S7 |
| Q4 | Sơ đồ ở 08 chỉ gắn trạng thái hay vẽ lại? | Chỉ gắn trạng thái và thêm liên kết mã. Giữ các sơ đồ tương lai, có nhãn "đề xuất" | S6 |
| Q5 | Làm tuần tự hay song song? | **Song song**, theo §6 | §6 |

### 3.2 Mặc định do plan đặt

Có thể đổi các mặc định này trước S10.

| Q | Câu hỏi | Mặc định | Lý do |
|---|---|---|---|
| Q6 | Plan 32 xử lý thế nào? | Không đánh số lại. Giữ tới khi chủ dự án xác nhận cùng bản audit, rồi xóa ở commit cuối | Plan dùng số cũ để đối chiếu với audit |
| Q7 | Chú thích trong mã trỏ tới docs đã xóa thì ghi thế nào? | Đổi `docs/NN` thành `docs-old/NN`. Mục "Tài liệu đã gỡ" ở 04 cho biết mỗi `docs-old/NN` là file nào và commit cuối còn file đó | Nếu giữ nguyên, `docs/17` (Path 2) sẽ trỏ nhầm sang file mới mang số 17 (hướng dẫn thư viện) |
| Q8 | Có sửa tham chiếu docs trong migration Prisma không? | Không sửa. 22 chỗ trong migration giữ số cũ, tra bằng bảng ở 04 | Sửa file migration đã áp dụng làm lệch checksum, và `prisma migrate` sẽ báo lỗi |

## 4. Gỡ file và đánh số lại

### 4.1 File sẽ gỡ ở S10

Chỉ gỡ một file khi mọi nội dung còn dùng của nó đã có ở file nhận. S10 kiểm từng dòng của bảng dưới trước khi xóa.

| File | Git | Nội dung phải chuyển trước khi gỡ | Nơi nhận | Luồng |
|---|---|---|---|---|
| [10](10_DB_HARDENING_DESIGN.md) | có | Quyết định về khóa ngoại và giữ file dùng chung. Hành vi đăng ký và xác minh email | 02; 03 và 06 §3 | A |
| [12](12_FE_BE_INTEGRATION_PLAN.md) | có | Kết quả T1–T12 của S12. Các mục T còn mở | 28 (mục mới); 04 | E, S10 |
| [17](17_PATH2_MVP_PLAN.md) | có | Deploy và bấm giờ hai lượt trên 4G | 18 | F |
| [20](20_XU_WRAP_FE_HANDOFF.md) | có | Luồng FE của job ảnh: `clientRequestId`, job bị từ chối, thiếu xu, hoàn xu, lịch sử. Quy tắc giá. Lỗi API | 06; 19; 03 | A |
| [21](21_PAYMENT_GATEWAYS_PLAN.md) | có | §3: các trường hợp đối soát (khớp tiền, lệch tiền, gán tay). §10: việc người giữ tài khoản cần kiểm | 03 và 06; 18 | A, F |
| [22](22_INTERACTIVE_TOURS_PLAN.md) | có | Kết quả S1–S5. Khoảng trống ở §9 | 04; 13 | S10, E |
| [23](23_STUDIO_EDITOR_PRO_PLAN.md) | có | Chức năng editor. Cấu trúc canvas và bảng review. Hợp đồng duyệt theo phiên bản. Yêu cầu nhập tài sản. §9: câu hỏi cho xưởng và nội dung nhãn | 01; 02; 03 và 06; 24; 28 | A, B, E |
| [25](25_BACKEND_AUDIT_FIX_PLAN.md) | có | Thay đổi API. Truy vấn kiểm trước hoàn xu và bước đổi lượt xuất cũ sang xu. Điều kiện của mục 14 (chạy nhiều API). Các mục hoãn | 03 và 06; 18; 07 và 18; 28 | A, F, C, E |
| [29](29_BACKEND_CODE_REVIEW.md) | có | Tóm tắt bảy phát hiện và commit đã sửa | 04 | S10 |
| [30](30_BACKEND_REVIEW_FIX_PLAN.md) | có | §5: thứ tự migration và job cũ. Quy tắc giữ phông, giữ phiên bản xuất, giữ thiết kế của đơn. §6: kết quả test | 18; 02, 03, 06; 04 | F, A, S10 |
| 26, 27, 27a, 31 | **không** | Không chuyển gì (Q2) | — | S10 |

> **Cảnh báo.** 26, 27, 27a và 31 chưa từng được commit. Xóa bốn file này là mất hẳn, không khôi phục được bằng Git. S10 chỉ xóa sau khi chủ dự án xác nhận lại một lần nữa ngay trước bước xóa.

### 4.2 Bảng đánh số lại

Các file 00–09 và [blueprint bảo mật](wrapfit_architecture_security_blueprint.md) giữ nguyên tên.

| Số cũ | Số mới | File mới |
|---|---|---|
| 11 | 10 | `10_STITCH_PARITY_AUDIT.md` |
| 13 | 11 | `11_UI_VIEWPORT_AUDIT.md` |
| 14 | 12 | `12_BOX_FORMULA_AUDIT.md` (thư mục ảnh `assets/14/` → `assets/12/`) |
| 15 | 13 | `13_DESIGN_SYSTEM.md` |
| 16 | 14 | `14_PRICING_ENTITLEMENTS_SPEC.md` |
| 18 | 15 | `15_PATH2_DEPLOY_RUNBOOK.md` |
| 19 | 16 | `16_XU_WRAP_SPEC.md` |
| 24 | 17 | `17_LIBRARY_CONTENT_GUIDE.md` |
| 28 | 18 | `18_VIEC_CON_TREO_SAU_AUDIT_BE.md` |

Sau khi đổi tên, sửa cả số trong dòng tiêu đề đầu mỗi file. Riêng 06 đang ghi `# 11 — Hướng dẫn tích hợp…`, sửa thành `# 06 — …`.

Đổi tên theo **thứ tự tăng dần** của số cũ, sau khi đã gỡ các file ở §4.1. Làm như vậy thì số mới luôn còn trống khi đổi.

### 4.3 Sửa tham chiếu

Script dưới thay **một lượt** cho mọi file Git theo dõi có đuôi `.ts`, `.tsx`, `.mjs`, `.js`, `.cjs`, `.md`, `.prisma`, `.yml` hoặc `.yaml`. Script bỏ qua `graphify-out/`, `be/prisma/migrations/`, bản audit và plan 32. Ba quy tắc:

1. `docs/NN`:
   - file đổi số → đổi sang số mới;
   - file đã gỡ → `docs-old/NN` (theo Q7);
   - 00–09 → giữ nguyên.
2. Tên file `NN_TÊN.md` của file đổi số → `MM_TÊN.md`. Tên file đã gỡ không tự sửa được, nên script in ra để sửa tay.
3. `assets/14/` → `assets/12/`.

Script thay mỗi chỗ đúng một lần. Nếu thay nối tiếp, `docs/16` sẽ thành `docs/14`, rồi thành `docs/12`. Vì vậy `--write` từ chối chạy khi `11_STITCH_PARITY_AUDIT.md` đã đổi tên. Chế độ `--check` dùng sau khi đổi tên: chế độ này báo mọi `docs/NN`, `docs-old/NN` và `NN_*.md` không trỏ tới đâu.

Lưu khối dưới thành file ngoài repo, ví dụ `$env:TEMP\renumber-docs.mjs`, rồi chạy từ gốc repo.

```js
// Đổi số docs sau khi gỡ file (plan 32, §4.3). Chạy từ gốc repo:
//   node renumber-docs.mjs            xem trước, không ghi
//   node renumber-docs.mjs --write    ghi, chỉ chạy được trước khi đổi tên file
//   node renumber-docs.mjs --check    kiểm sau khi đổi tên: mọi docs/NN trỏ tới file có thật
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const RENUM = { 11: '10', 13: '11', 14: '12', 15: '13', 16: '14', 18: '15', 19: '16', 24: '17', 28: '18' };
const GONE = new Set(['10', '12', '17', '20', '21', '22', '23', '25', '26', '27', '27a', '29', '30', '31']);
const mode = process.argv.includes('--write') ? 'write' : process.argv.includes('--check') ? 'check' : 'dry';
const files = execSync('git ls-files', { encoding: 'utf8' }).split('\n').filter((f) =>
  /\.(ts|tsx|mjs|js|cjs|md|prisma|ya?ml)$/.test(f) && fs.existsSync(f) &&
  !f.startsWith('graphify-out/') && !f.startsWith('be/prisma/migrations/') &&
  f !== 'docs/README.md' && !f.startsWith('docs/32_'));

if (mode === 'check') {
  const have = new Set(fs.readdirSync('docs').map((f) => f.match(/^(\d{2}a?)_/)?.[1]).filter(Boolean));
  const problems = [];
  for (const f of files) {
    fs.readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
      for (const [, num] of line.matchAll(/\bdocs\/(\d{2}a?)(?!\w)/g)) if (!have.has(num)) problems.push(`${f}:${i + 1}: docs/${num}`);
      for (const [, num] of line.matchAll(/\bdocs-old\/(\d{2}a?)(?!\w)/g)) if (!GONE.has(num)) problems.push(`${f}:${i + 1}: docs-old/${num}`);
      for (const [, name] of line.matchAll(/(?:^|[^\w])(\d{2}a?_[A-Z0-9][A-Za-z0-9_]*\.md)/g)) {
        if (!fs.existsSync(`docs/${name}`)) problems.push(`${f}:${i + 1}: ${name}`);
      }
    });
  }
  console.log(problems.join('\n'));
  console.log(`Lỗi tham chiếu: ${problems.length}`);
  process.exit(problems.length ? 1 : 0);
}

if (mode === 'write' && !fs.existsSync('docs/11_STITCH_PARITY_AUDIT.md')) {
  throw new Error('File đã đổi tên. Không chạy --write lần hai: số sẽ bị đổi chồng (16 → 14 → 12).');
}
let total = 0;
const manual = [];
for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  let n = 0;
  let out = text.replace(/\bdocs\/(\d{2}a?)(?!\w)/g, (m, num) => {
    if (GONE.has(num)) { n++; return `docs-old/${num}`; }
    if (RENUM[num]) { n++; return `docs/${RENUM[num]}`; }
    return m;
  });
  out = out.replace(/(^|[^\w])(\d{2}a?)(_[A-Z0-9][A-Za-z0-9_]*\.md)/g, (m, pre, num, rest) => {
    if (GONE.has(num)) { manual.push(`${f}: ${num}${rest}`); return m; }
    if (!RENUM[num]) return m;
    n++;
    return `${pre}${RENUM[num]}${rest}`;
  });
  out = out.replace(/assets\/14\//g, () => { n++; return 'assets/12/'; });
  if (!n) continue;
  total += n;
  console.log(`${n}\t${f}`);
  if (mode === 'write') fs.writeFileSync(f, out);
}
console.log(`${mode === 'write' ? 'Đã sửa' : 'Sẽ sửa'} ${total} chỗ.`);
console.log(`Trỏ tới file đã gỡ, cần sửa tay: ${manual.length}`);
if (manual.length) console.log(manual.join('\n'));
```

Script không bắt được số đứng một mình trong câu, ví dụ "theo 30", "ở 19", "16 §5.2" hay "[`17`]". Trước khi chạy `--write`, dùng lệnh dưới để liệt kê các dòng nghi vấn, rồi sửa tay theo §4.2. Khi lập plan, lệnh in 78 dòng, kể cả dòng trong các file sẽ gỡ.

```powershell
git grep -nE '(theo|ở|xem|sang|về|tới|của|file|docs|mục|plan)\s+`?(1[0-9]|2[0-9]|3[01])a?`?(\s|,|\.|\)|$)|\b(1[0-9]|2[0-9]|3[01])a?\s*§' -- docs ':!docs/README.md' ':!docs/32_*'
```

## 5. Danh sách việc

Mức ưu tiên:

- **P1**: tài liệu làm người tích hợp, khách hàng hoặc người demo làm sai.
- **P2**: phạm vi, kiến trúc hoặc hướng dẫn nội bộ còn lệch.
- **P3**: chuyển nội dung, gỡ file và đánh số lại.

| # | Mức | File (số cũ) | Việc chính | Luồng · Session |
|---|---|---|---|---|
| 1 | P1 | [02](02_DATABASE_DESIGN.md) | Bổ sung 17 bảng. Vẽ quan hệ phiên bản giữa dự án, dòng hàng, đơn và job xuất. Nhận quyết định từ 10 và 30 | A · S1 |
| 2 | P1 | [03](03_API_DESIGN.md) | Sửa hợp đồng xuất file, thanh toán và mã đơn. Bổ sung duyệt mẫu, hộp thư, giới hạn xóa dự án. Nhận lỗi API từ 20, 21, 25 | A · S2 |
| 3 | P1 | [06](06_FE_INTEGRATION_GUIDE.md) | Viết lại §7 và §11, sửa §5.3. Nhận luồng FE từ 20. Thêm duyệt mẫu và đồng bộ hai tab | A · S3 |
| 4 | P1 | [19](19_XU_WRAP_SPEC.md) | Sửa D5, thêm `XU_CUSTOM`, ghi ngày cho giá vốn. Nhận quy tắc giá từ 20 | A · S4 |
| 5 | P1 | [16](16_PRICING_ENTITLEMENTS_SPEC.md) | Chia thành ba nhóm: đang áp dụng, đã thay thế ở CP4, đề xuất còn chờ | A · S4 |
| 6 | P1 | [00](00_PROJECT_OVERVIEW.md) | Sáu bước Studio, điều kiện lấy file, Next.js 15 | B · S5 |
| 7 | P1 | [01](01_REQUIREMENTS.md) | Ngưỡng in và DPI, phạm vi cấu trúc. Thêm yêu cầu nghiệm thu và chức năng editor từ 23 | B · S5 |
| 8 | P1 | [05](05_PACKAGING_GUIDELINES_AND_SUPPORT.md) | Sửa thuật ngữ, tình huống logo sát mép và lời thoại xuất file | B · S5 |
| 9 | P2 | [24](24_LIBRARY_CONTENT_GUIDE.md) | Đối chiếu với luật nhập file. Nhận yêu cầu nhập tài sản từ 23 | B · S5 |
| 10 | P2 | [07](07_SYSTEM_BLUEPRINT_AND_TASK_BREAKDOWN.md) | Vẽ lại sequence §3.1, thêm nhánh xóa dự án, hàng đợi ảnh AI và điều kiện mục 14 của 25 | C · S6 |
| 11 | P2 | [08](08_PACDORA_SYSTEM_CLASS_DIAGRAM_SPECIFICATION.md) | Gắn trạng thái cho từng phân hệ (Q4) | C · S6 |
| 12 | P2 | [09](09_PROJECT_DIRECTORY_AND_FILE_ARCHITECTURE.md) | Dựng lại cây thư mục theo file thực | C · S6 |
| 13 | P2 | [15](15_DESIGN_SYSTEM.md) | Đồng bộ phiên bản token v1.2.0 | C · S6 |
| 14 | P2 | [Blueprint bảo mật](wrapfit_architecture_security_blueprint.md) | Tách phần đang vận hành khỏi phần đề xuất | C · S6 |
| 15 | P1 | `fe/scripts/e2e-scenario.mjs` | Viết lại bước 7, 16, 17 và 18 theo luồng giỏ in → thanh toán → xuất theo phiên bản | D · S7 |
| 16 | P2 | [11](11_STITCH_PARITY_AUDIT.md) | Đối chiếu checkbox §5, gắn nhãn cho các số parity cũ | E · S8 |
| 17 | P2 | [13](13_UI_VIEWPORT_AUDIT.md) | Thêm bảng kiểm lại P3-1 đến P3-6. Nhận khoảng trống từ 22 §9 | E · S8 |
| 18 | P2 | [14](14_BOX_FORMULA_AUDIT.md) và [9 ảnh](assets/14/) | Sửa phần giải thích ngưỡng, thêm biểu mẫu nghiệm thu vật lý | E · S8 |
| 19 | P1 | [28](28_VIEC_CON_TREO_SAU_AUDIT_BE.md) | Cập nhật 14 mục, thêm cột "Cách đóng". Nhận việc còn mở từ 12, 23 §9 và 25 | E · S8 |
| 20 | P1 | [18](18_PATH2_DEPLOY_RUNBOOK.md) | Trình tự trước deploy, hai lượt kiểm theo loại tài khoản, kiểm 4G. Nhận nội dung từ 17, 21 §10, 25, 30 §5 | F · S9 |
| 21 | P2 | [04](04_PROGRESS.md) | Thêm các mốc còn thiếu và bảng "Tài liệu đã gỡ" | S10 |
| 22 | P3 | 14 file ở §4.1 | Kiểm nơi nhận, rồi gỡ file | S10 |
| 23 | P3 | 9 file ở §4.2 và mã | Đánh số lại, sửa tham chiếu, kiểm lint và test | S10 |

## 6. Các luồng và session

### 6.1 Thứ tự

```text
S0 ─┬─► Luồng A: S1 (02) ─► S2 (03) ─► S3 (06) ─► S4 (19, 16) ─┐
    ├─► Luồng B: S5 (00, 01, 05, 24) ─────────────────────────┤
    ├─► Luồng C: S6 (07, 08, 09, 15, blueprint) ──────────────┤
    ├─► Luồng D: S7 (script FE) ──────────────────────────────┼─► S10 (gộp, gỡ, đánh số lại)
    ├─► Luồng E: S8 (11, 13, 14, 28) ─────────────────────────┤
    └─► Luồng F: S9 (18) ─────────────────────────────────────┘
```

- Sáu luồng A–F chạy cùng lúc, mỗi luồng có worktree và nhánh riêng.
- Trong luồng A, các session chạy tuần tự. 03 dẫn tới bảng ở 02, 06 dẫn tới endpoint ở 03, còn 19 và 16 trỏ tới phần quyền xuất ở 03.
- S10 chỉ bắt đầu khi cả sáu luồng đã gộp. Việc gỡ file và đánh số lại chạm vào gần như mọi file.

### 6.2 File của từng luồng

Mỗi file chỉ thuộc một luồng. Các file ở §4.1 chỉ để đọc, không luồng nào sửa.

| Luồng | Được sửa | Đọc để lấy nội dung |
|---|---|---|
| A | 02, 03, 06, 19, 16 | 10, 20, 21 §3, 23, 25, 30 |
| B | 00, 01, 05, 24 | 23 |
| C | 07, 08, 09, 15, blueprint | 25 mục 14 |
| D | `fe/scripts/e2e-scenario.mjs` và nếu cần `fe/scripts/lib/*.mjs` | — |
| E | 11, 13, 14 và `assets/14/`, 28 | 12, 22 §9, 23 §9, 25 |
| F | 18 | 17, 21 §10, 25, 28 §4, 30 §5 |
| S10 | 04, 32, các file ở §4.1, đổi tên file, tham chiếu trong mã | — |

### 6.3 Quy ước chung

- **Tạo worktree.** S0 commit plan này lên `docs/sync-after-audit`. Mỗi luồng tạo worktree từ commit đó, ví dụ cho luồng A:

  ```powershell
  git worktree add ..\wrapfit-lane-a -b docs/sync-a docs/sync-after-audit
  ```

  Các luồng còn lại dùng nhánh `docs/sync-b` đến `docs/sync-f`.
- **Chỉ sửa file của luồng mình.** Thấy cần sửa file của luồng khác thì ghi vào báo cáo cuối luồng để S10 làm.
- **Liên kết tạm.** Liên kết tới một mục mà luồng khác chưa chốt thì tạm trỏ tới file. S10 đổi thành liên kết tới mục.
- **Bản audit không có trong worktree**, vì chưa được Git theo dõi. Plan này đã chứa đủ thông tin. Nếu cần đọc bản audit, mở bản ở checkout chính.
- **Không sửa plan 32 và không chạy `graphify update .` trong luồng.** Hai việc đó làm `graph.json` và nhật ký xung đột. S10 làm một lần.
- **Số liệu và mã lỗi lấy từ §2.**
- **Mỗi trạng thái ghi một trong ba mức:**
  - có mã trên `develop`;
  - đã kiểm bằng test hoặc E2E (ghi ngày);
  - chờ kiểm thực tế (ghi vai trò người kiểm).
- **Liên kết tới file sắp gỡ.** Khi chuyển nội dung vào file mình, xóa liên kết tới file ở §4.1 và thay bằng liên kết tới nơi nhận. Script ở §4.3 không tự sửa được loại liên kết này.
- **Kết thúc luồng.** Commit `docs(NN): …`, riêng luồng D dùng `test(fe): …`. Báo cáo gồm: commit, file đã sửa, kết quả hai lệnh dưới, và việc chuyển cho S10.

  ```powershell
  git grep -n --untracked -E 'useCredit|EXPORT_CREDIT_REQUIRED|Có watermark|Mua 1 lượt|200 DPI|EXPORT_PACK|watermark' -- docs ':!docs/32_DOCS_AUDIT_SYNC_PLAN.md' ':!docs/README.md'
  ```

  ```powershell
  node -e "const fs=require('fs'),p=require('path');let bad=0;for(const f of fs.readdirSync('docs').filter(f=>f.endsWith('.md')&&f!=='README.md'&&!f.startsWith('32_'))){const t=fs.readFileSync(p.join('docs',f),'utf8');for(const m of t.matchAll(/\]\(<?([^)#\s>]+)>?(#[^)]*)?\)/g)){const u=decodeURI(m[1]);if(/^[a-z]+:/i.test(u))continue;if(!fs.existsSync(p.resolve('docs',u))){bad++;console.log(f+': '+u)}}}console.log('broken: '+bad)"
  ```

  Lệnh đầu chỉ để đọc lại các dòng còn nhắc luồng cũ. Khi lập plan, lệnh này in 95 dòng. Một dòng có thể giữ nếu là ghi chú lịch sử có nhãn, hoặc là ví dụ DPI hợp lệ. Lệnh sau phải in `broken: 0`.

### S0. Chuẩn bị

- [ ] Cắt nhánh `docs/sync-after-audit` từ `develop` tại 09ca9d4 hoặc commit mới hơn. Nếu `develop` đã có commit mới, chạy lại các kiểm ở §1 và cập nhật §2 trước.
- [ ] Commit riêng plan này: `docs(32): docs audit and sync plan`. Không commit bản audit (Q2).
- [ ] Chạy hai lệnh ở §6.3 và script §4.3 ở chế độ xem trước. Ghi kết quả gốc vào §9.
- [ ] Tạo sáu worktree theo §6.3.

**Xong khi** nhánh chỉ có thêm file 32. `NasaFilm/`, bản audit và 26, 27, 27a, 31 vẫn nằm ngoài commit.

### S1. Luồng A · 02 · Thiết kế CSDL (P1)

- [ ] Đối chiếu từng `model` và `@@map` trong `schema.prisma` với danh mục ở §2 của 02. Bổ sung 17 bảng theo nhóm, mỗi bảng ghi một dòng mục đích và các khóa ngoại chính:

  | Nhóm | Bảng |
  |---|---|
  | Thư viện và ảnh AI | `library_assets`, `ai_image_jobs`, `ai_image_outputs` |
  | Duyệt mẫu | `project_reviews`, `design_comments` |
  | Thanh toán, ví, quyền xuất và thuê bao | `payments`, `bank_transactions`, `credit_lots`, `credit_debits`, `export_unlocks`, `subscriptions` |
  | Đơn và xưởng in | `orders`, `order_items`, `order_status_history`, `print_shop_members` |
  | Sự kiện và thông báo | `product_events`, `notifications` |

- [ ] Sửa dòng 3 (`box_templates`): MVP ban đầu có 4 cấu trúc, seed hiện có 11 (xem §2).
- [ ] Cập nhật ERD ở §1 (dòng 19):
  - Thêm các bảng trên.
  - Vẽ quan hệ `packaging_projects` → `order_items` (giữ phiên bản dự án) → `orders` → `payments`.
  - Vẽ quan hệ `packaging_projects` → `export_jobs` (giữ `projectVersion` và bản thiết kế dùng khi xuất).
- [ ] Từ 23: thêm cấu trúc canvas và bảng review.
- [ ] Thêm mục "Giữ file và xóa dự án":
  - Nguồn tham chiếu phông (`elements[].style.fontUrl`, `customFonts[].url`), ảnh trong snapshot và job đang xử lý ([logic giữ file](../be/src/projects/infrastructure/project-file-refs.ts)).
  - Đơn ở trạng thái giữ thiết kế chặn xóa vĩnh viễn (§2).
  - Xóa dự án có chuyển file cho dự án khác thì thử lại tối đa ba lần khi xung đột (từ 30).
- [ ] Từ 10: đưa vào khối "Quy ước bắt buộc" (dòng 7) các quyết định còn hiệu lực, **cùng lý do**:
  - lý do chọn khóa ngoại;
  - cách bảo toàn file dùng chung;
  - mốc migration.

  10 sẽ bị xóa, nên 02 phải tự đủ. Câu "xóa dự án không retry" của 10 đã bị thay bằng cơ chế thử lại của 30. Bỏ hai liên kết tới `10_DB_HARDENING_DESIGN.md`.
- [ ] `social_mockups` chỉ còn trong ghi chú migration `20261117000100_drop_social_mockups`, không còn nằm trong danh mục bảng đang dùng.

**Xong khi** cả 32 bảng đều tra được trong 02, và 02 không còn liên kết tới file ở §4.1.

**Kiểm:**

```powershell
Select-String -Path be/prisma/schema.prisma -Pattern '@@map\("([a-z_]+)"\)' | ForEach-Object { $_.Matches[0].Groups[1].Value } | Where-Object { -not (Select-String -Path docs/02_DATABASE_DESIGN.md -SimpleMatch "``$_``" -Quiet) }
```

Lệnh trên không được in ra tên bảng nào. Khi lập plan, lệnh in 17 tên.

### S2. Luồng A · 03 · Thiết kế API (P1)

- [ ] **Bảng endpoint, dòng 75–78.**
  - Bỏ `useCredit?` ở dòng 75.
  - Sửa phản hồi của `…/exports/access` thành `{ unlocked, unlockExpiresAt }`.
  - Ghi ý nghĩa thực của `watermarked` trong `GET /api/exports/:jobId`.
- [ ] **Mục "Xuất file in" (dòng 139).** Viết lại ví dụ request/response theo §2:
  - `{ fileType }` → `202`.
  - FitCheck có lỗi → `422`.
  - Thiếu quyền → `402 ORDER_PAYMENT_REQUIRED`.
  - Gửi `useCredit` → `400`.
  - Thêm ba tình huống: đổi tên, sửa thiết kế sau khi đã thanh toán, khôi phục dự án khỏi thùng rác.
- [ ] **Mục "Gói, lượt xuất và thanh toán" (dòng 147–151).**
  - Đổi tên mục thành "Gói, xu và thanh toán".
  - Bỏ đoạn `EXPORT_CREDIT_REQUIRED` và watermark A4. Chỉ giữ một câu: gói lượt xuất đã ngừng bán, tạo mới → `400 EXPORT_PACK_DISCONTINUED`.
  - Viết lại ví dụ `POST /api/payments` có `termsVersion`. Thêm `orderId` cho `SAMPLE_ORDER` và `xu` cho `XU_CUSTOM`.
  - Ghi cách chọn cổng theo loại tài khoản và điều kiện giả lập.
- [ ] **Đơn in.** Đổi mã đơn sang 6 chữ số. Ghi đơn nhiều thiết kế và việc mỗi dòng hàng giữ phiên bản dự án.
- [ ] **Từ 21 §3.** Thêm các trường hợp đối soát: khớp tiền, lệch tiền, gán tay.
- [ ] **Từ 20.** Thêm lỗi API của job ảnh: gửi lại cùng `clientRequestId`, job bị từ chối, thiếu xu, hoàn xu sau lỗi hệ thống.
- [ ] **Từ 25.** Thêm các thay đổi API chưa có ở 03. Đọc nhật ký S0–S8 của 25 để lấy danh sách.
- [ ] **Từ 10.** Thêm hành vi đăng ký và xác minh email còn hiệu lực, nếu 03 chưa có.
- [ ] **Mục mới.**
  - Duyệt mẫu theo token: tạo link, xem, duyệt hoặc yêu cầu sửa, `409 DESIGN_CHANGED`.
  - Hộp thư thông báo.
  - Giới hạn xóa dự án (`409 PROJECT_IN_ACTIVE_ORDER`).
  - Nguồn âm thanh hợp lệ cho QR mở hộp.
- [ ] **Mục "AI sinh hoa văn" (dòng 181).** Đổi từ lượt/ngày sang xu, `402 INSUFFICIENT_CREDITS` và hoa văn thuật toán dự phòng.
- [ ] **§3 "Endpoints sắp triển khai" (dòng 254).** Rà từng route với controller. Route nào đã có thì chuyển lên §2.
- [ ] Bỏ bốn liên kết tới file ở §4.1.

**Xong khi** mọi ví dụ trong 03 khớp với DTO và có ca E2E cùng tên trong `be/test/e2e/`. Mỗi route trong controller đều có trong bảng.

**Kiểm:**

```powershell
git grep -nE "@(Get|Post|Patch|Put|Delete)\(" -- 'be/src/*.controller.ts'
```

Khi lập plan, lệnh này in 113 route. Đánh dấu từng route vào bảng của 03. Sau đó mở [E2E xuất file](../be/test/e2e/export.e2e-spec.ts) và [bộ E2E](../be/test/e2e/) để so từng mã trạng thái.

### S3. Luồng A · 06 · Tích hợp FE–BE (P1)

- [ ] **§5.3 (dòng 282–286).** Sửa quy tắc FitCheck: lề cắt 5 mm, lề gấp 3 mm, bleed 2 mm, ngưỡng DPI 300/150. Ghi mức `warning`/`error` của từng quy tắc theo §2, gồm cả ngưỡng 1 mm của lề an toàn.
- [ ] **§7 (dòng 334).** Viết lại theo trình tự người dùng ở bước Đặt in:
  1. Đọc quyền của phiên bản (`…/exports/access`).
  2. Nếu chưa có quyền: cho vào giỏ in.
  3. Tạo đơn và thanh toán.
  4. Kiểm lại quyền.
  5. Tạo job.
  6. Hỏi trạng thái tới khi có `downloadUrl`.

  Ghi riêng ba tình huống: đổi tên, sửa thiết kế sau khi thanh toán, khôi phục dự án khỏi thùng rác. Sửa dòng 351 thành `BleedBox` = phôi + 3 mm.
- [ ] **§11 (dòng 427).** Thay "lượt/ngày" và `usage.used/limit` bằng xu, `402` và hoa văn dự phòng.
- [ ] **Từ 20.** Đưa vào đủ các tình huống FE, vì 20 sẽ bị xóa:
  - Thử lại job ảnh với cùng `clientRequestId`: FE nhận cùng job, số dư chỉ giảm một lần.
  - Job bị từ chối.
  - Thiếu xu.
  - Hoàn xu sau lỗi hệ thống và làm mới số dư.
  - Xem lịch sử ví.
- [ ] **Từ 21 §3.** Thêm cách FE hiển thị các trường hợp đối soát.
- [ ] **Từ 23.** Thêm duyệt mẫu đúng phiên bản. Với hộp thư ở §8.1, thêm sự kiện `project.saved` để đồng bộ giữa hai tab ([useProjectSync](../fe/src/features/studio/hooks/useProjectSync.ts)) và nối với §5.3.
- [ ] **Từ 10.** Thêm hành vi đăng ký và xác minh email còn hiệu lực vào §3, nếu §3 chưa có.
- [ ] **§16 (dòng 545).** Đồng bộ danh mục endpoint với bảng của 03.
- [ ] Bỏ sáu liên kết tới file ở §4.1, trong đó có hai liên kết tới 12.

**Xong khi** mọi nút liên quan tới xuất file, thanh toán, ảnh AI và duyệt mẫu đều lần được từ UI → hàm trong `fe/src/api/` → endpoint ở 03. Mỗi tình huống FE của 20 tìm được ở 06.

**Kiểm:** lần theo hai đường dưới, mỗi đường phải tới được đúng endpoint ở 03:

- [ExportDialog](../fe/src/features/studio/components/export/ExportDialog.tsx) → [API xuất của FE](../fe/src/api/exports/index.ts) → 03.
- [CheckoutDialog](../fe/src/features/payments/CheckoutDialog.tsx) → [API thanh toán của FE](../fe/src/api/payments/index.ts) → 03.

### S4. Luồng A · 19 · Xu Wrap và 16 · Giá và quyền lợi (P1)

Việc ở 19:

- [ ] Sửa D5 để tách ba khái niệm: xu dùng cho AI, quyền mở file từ đơn in, và quyền mở khóa cũ còn hạn.
- [ ] Thêm `XU_CUSTOM`: tối thiểu 100, tối đa 50.000, bội số của 10, giá niêm yết, không thưởng.
- [ ] Bổ sung quy tắc cấp xu theo kỳ, trừ xu và hoàn xu. Nhận quy tắc giá từ 20.
- [ ] Ghi ngày cạnh mọi con số giá vốn ước tính. Giá vốn fal thật ghi "chờ đo".

Việc ở 16:

- [ ] Chia toàn bộ nội dung thành ba nhóm: **Đang áp dụng**, **Đã thay thế ở CP4** và **Đề xuất còn chờ** (dùng thử, hóa đơn, workspace).
- [ ] Đưa gói lượt xuất, PDF watermark và cổng giả lập cũ vào nhóm "Đã thay thế ở CP4", kèm khối ghi chú ở đầu nhóm, dạng:

  ```markdown
  > **Đã thay thế (CP4, trước 2026-11-17).** Phần dưới mô tả gói lượt xuất đã ngừng bán. Luồng hiện hành: [03 · Xuất file](03_API_DESIGN.md).
  ```

- [ ] Đầu file dẫn người đọc sang 19 để tra xu, 03 để tra quyền xuất, 18 để cấu hình cổng.
- [ ] Bỏ năm liên kết tới file ở §4.1.

**Xong khi** người đọc trả lời được hai câu bằng tài liệu hiện hành: (1) mua Pro nhận những quyền lợi nào, và (2) mua Pro có tự mở file in cho dự án mới không.

**Kiểm:**

- Tính hai lần nạp tùy chọn theo [quy tắc xu](../shared/src/billing/xu.ts): 1.234 xu (không hợp lệ, vì không phải bội số của 10) và 1.230 xu.
- Đọc một ca job ảnh thất bại trong [E2E ảnh AI](../be/test/e2e/ai-images.e2e-spec.ts). Xác nhận 19 mô tả đúng việc hoàn xu đúng một lần.

### S5. Luồng B · 00, 01, 05, 24 (P1/P2)

- [ ] **00.**
  - Giữ bốn giai đoạn giá trị GIFT–DESIGN–FIT–PRESENT.
  - Đổi danh sách bước thành sáu nhãn thực ở Studio. Ghi điểm vào khác nhau giữa thiết kế mới và dự án đã lưu.
  - Sửa dòng 26 (lề an toàn) theo §2.
  - Nêu khi nào cần thanh toán để lấy file. Cập nhật Next.js 15 trên sơ đồ.
- [ ] **01.**
  - Giữ mã FR/NFR hiện có.
  - Đánh dấu bốn hộp là phạm vi MVP ban đầu, liệt kê 11 cấu trúc trong seed và giải thích trường hợp `sticker-label`.
  - Sửa dòng 19–20 theo §2.
  - Thêm FR có thể nghiệm thu cho duyệt mẫu, ví xu, đơn in và quyền xuất theo phiên bản.
  - Thêm chức năng editor đã có theo nhật ký S1–S23 của 23: reflow, FitCheck hướng đọc, hiệu ứng, bước 4–6.
  - Gắn nhãn "mục tiêu, chưa đo" cho FPS và thời gian phản hồi.
- [ ] **05.**
  - Sửa bảng thuật ngữ (dòng 16–17) và tình huống ở dòng 48 và 52.
  - Phân biệt nền tràn 2 mm với `BleedBox` 3 mm.
  - Sửa lời thoại xuất file ở §4: khách cần dời chữ hoặc logo vào đâu, khi nào phải thay ảnh, khi nào có thể tải file.
- [ ] **24.**
  - So từng quy tắc về định dạng, cỡ raster (50 mm ở 300 DPI), đổi màu và ghi nguồn với [luật nhập file](../be/src/library/library-file.rules.ts).
  - Thêm yêu cầu nhập tài sản từ 23.
  - Cập nhật bước xuất thử theo quyền mở file ở 03.
  - Bỏ liên kết tới file ở §4.1.

**Xong khi** 05 trả lời được việc cần làm tiếp cho ba tình huống:

1. Logo cách nét cắt 4 mm: cảnh báo, vẫn xuất được, nên dời vào thêm ít nhất 1 mm. Logo cách dưới 1 mm thì bị chặn.
2. Ảnh 200 DPI: cảnh báo, vẫn xuất được.
3. Thiết kế đạt FitCheck nhưng chưa thanh toán: `402`, cần đặt in.

**Kiểm:**

- Ranh giới DPI trong 01: 149 → lỗi; 150 và 299 → cảnh báo; 300 → đạt. Đối chiếu với [validator](../shared/src/fitcheck/validator.ts).
- Mở một thiết kế mới và một dự án đã lưu trong Studio để xác nhận điểm vào ghi ở 00.

### S6. Luồng C · 07, 08, 09, 15, blueprint (P2) · theo Q4

- [ ] **07.** Giữ §1.3–1.5 và mốc phân công.
  - Vẽ lại sequence §3.1 theo thứ tự: API kiểm FitCheck → kiểm quyền theo phiên bản → lưu thiết kế cùng job → worker render → FE hỏi trạng thái.
  - Thêm nhánh "đơn đang giữ dự án" vào luồng xóa.
  - Thêm hàng đợi `ai-image` vào sơ đồ worker.
  - Từ 25 mục 14: thêm điều kiện cần xem lại thiết kế khi chạy nhiều instance API.
  - Ghi chú WBS là lịch sử thiết kế.
- [ ] **08.**
  - Ở bảng ánh xạ §7, thêm cột trạng thái (đã có mã, một phần, đề xuất) và đường dẫn module.
  - Rà các sơ đồ dựa trên `shared/src/core/contracts.ts` (tự ghi là bản phác thảo), thanh toán, giao vận, quản trị. Gắn nhãn "đề xuất" cho phần chưa có mã.
  - Sửa câu kết luận cuối file cho khớp phạm vi của bảng.
- [ ] **09.**
  - Dựng lại cây FE, BE và shared từ danh sách file thực.
  - Thay `shared/src/exporter/pdf-export.ts` (đã bỏ) bằng [prepress](../shared/src/print/prepress.ts) và [bộ render](../be/src/export/rendering/).
  - `be/src/shipping/` không tồn tại. Xóa nhánh này hoặc ghi nhãn "đề xuất".
  - Cập nhật phiên bản, dịch vụ bên thứ ba và seed. Bỏ liên kết tới 10.
  - Không cần liệt kê trước các file 00–31 trong cây `docs/`. S10 sửa cây đó theo số mới.
- [ ] **15.**
  - Sửa đầu file từ v1.1.0 thành v1.2.0 cho khớp changelog và [token](../fe/src/assets/styles/tokens.ts).
  - So danh sách trang, màu CTA và trạng thái focus với [catalog](../fe/src/views/design-system/index.tsx).
- [ ] **Blueprint bảo mật.**
  - Thêm chú thích trạng thái trên sơ đồ và từng bảng dịch vụ. Phần đang vận hành dùng S3/R2, VietQR/SePay và VNPay sandbox.
  - Gom Cloudinary, PayOS/Stripe, mã hóa trường dữ liệu và phương án backup đề xuất vào mục "Quyết định cũ / cần xác nhận".
  - Đối chiếu tên biến với [env.validation](../be/src/config/env.validation.ts) và [.env.example](../.env.example).
  - Bỏ hai tham chiếu tới file ở §4.1.

**Xong khi** mọi đường dẫn mà 09 mô tả là "đang sử dụng" đều tồn tại. Người triển khai đọc blueprint phân biệt được "bucket backup đã cấu hình" với "đã kiểm khôi phục".

**Kiểm:**

```powershell
Select-String -Path docs/09_PROJECT_DIRECTORY_AND_FILE_ARCHITECTURE.md -Pattern '`((?:fe|be|shared)/[^`*<>]+)`' -AllMatches | ForEach-Object { $_.Matches } | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique | Where-Object { -not (Test-Path -LiteralPath $_) }
```

Chỉ những đường dẫn ghi rõ là đã bỏ hoặc là đề xuất mới được phép xuất hiện trong kết quả. Khi lập plan, lệnh này in `be/src/shipping/`. Lệnh chỉ bắt các đường dẫn đặt trong dấu backtick, nên vẫn phải đọc lại các nhánh cây vẽ bằng ký tự. Với 15, chạy:

```powershell
npm --workspace=fe run tokens:check
```

### S7. Luồng D · Kịch bản FE `e2e-scenario.mjs` (P1) · theo Q3

Mục tiêu: kịch bản kiểm sản phẩm hiện tại. Trình tự là FitCheck chặn → tự sửa → file khóa vì chưa thanh toán → đặt in và thanh toán bằng tài khoản demo → xuất đủ định dạng → đổi tên vẫn giữ quyền → sửa thiết kế thì phiên bản mới bị khóa lại.

Worktree của luồng D chưa có `node_modules`. Chạy `npm install` và `npm --workspace=shared run build` trong worktree trước khi khởi động FE và BE từ chính worktree đó.

Trước khi sửa, đọc lại nhãn trên UI trong ba file sau:

- [ExportDialog](../fe/src/features/studio/components/export/ExportDialog.tsx): thẻ "Chưa thanh toán đơn in của bản thiết kế này" và nút đặt in mẫu ở cuối hộp thoại.
- [ExportPurchaseCard](../fe/src/features/studio/components/export/ExportPurchaseCard.tsx): "File in nét chuẩn 300 DPI, mở sau khi bạn thanh toán đơn in ở giỏ hàng."
- [CheckoutDialog](../fe/src/features/payments/CheckoutDialog.tsx): tab "Giả lập" và "VNPay (sandbox)", nút giả lập.

Việc:

- [ ] **Phần đầu script.**
  - Bỏ trỏ tới docs/12 §7 và docs/17 §5. Mô tả trình tự mới bằng lời.
  - Ghi điều kiện chạy: BE bật `PAYMENT_SIMULATION=true`; VNPay sandbox không bắt buộc; cần tài khoản admin seed (`SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` trong `be/.env`) để bật cờ demo.
  - Giữ mặc định `--steps=1-14,16-18`.
- [ ] **Bước 7** (dòng 710–737).
  - Giữ phần FitCheck chặn rồi tự sửa lề (ảnh `07-export-blocked`, `07-fitcheck-fixed`).
  - Thay đoạn PDF A4 miễn phí (dòng 727–736) bằng các bước sau. Mở hộp thoại xuất và chờ thẻ chưa thanh toán. Kiểm `GET …/exports/access` trả `unlocked: false`. Gọi `POST …/exports` với `{ fileType: 'SVG' }` qua API và kỳ vọng `402 ORDER_PAYMENT_REQUIRED`. Chụp `07-export-locked`.
  - Không tải file nào ở bước này.
- [ ] **Bước 16** (viết lại, gộp phần đặt in của bước 17 cũ).
  1. Admin gọi `PATCH /api/users/:id` với `{ isDemo: true }` cho tài khoản chủ dự án. Ghi `isDemo set` vào notes.
  2. Mở hộp thoại xuất, bấm nút đặt in mẫu, rồi tới `/cart`. Điền người nhận (giữ dữ liệu giả hiện có) và gửi form.
  3. Trong checkout, nếu hiện cả hai tab thì chọn "Giả lập". Bấm nút giả lập, chờ "Thanh toán thành công".
  4. Kiểm `/orders/my-orders`: có đơn `PAID` của dự án, `orderCode` khớp `^WF-\d{4}-\d{6}$`.
  5. Kiểm `access` → `unlocked: true`.
  6. Xuất SVG, PDF_CMYK và DXF. Mỗi job phải tới `COMPLETED` và tải được.

  Ảnh: `16-cart`, `16-checkout`, `16-checkout-paid`, `16-export-svg`, `16-export-pdf_cmyk`, `16-export-dxf`.
- [ ] **Bước 17** (viết lại).
  1. Đổi tên dự án bằng `PATCH`. Kiểm `access` vẫn `unlocked: true` và xuất lại PDF_CMYK được.
  2. Sửa một phần tử trên canvas: `version` tăng.
  3. Kiểm `access` → `unlocked: false`, và `POST` xuất → `402`.
  4. Hộp thoại xuất hiện lại thẻ chưa thanh toán. Chụp `17-new-version-locked`.
- [ ] **Bước 18.** Đổi điều kiện `exported.SVG >= 1 && exported.PDF_A4_PRINT >= 1` thành các định dạng đã xuất ở bước 16. Bỏ trỏ tới docs/17.
- [ ] Kiểm phần dọn tài khoản ở cuối script vẫn xóa tài khoản đã bật cờ demo, trừ khi chạy với `--keep`.
- [ ] Không chạy `graphify update .` (theo §6.3).

**Xong khi**:

- Script thoát 0 ở cả hai cỡ M và X+, trên stack local gồm: FE dev chạy mã của nhánh, BE với `PAYMENT_SIMULATION=true`, worker, Mailpit, và Docker cho Postgres, Redis, SeaweedFS.
- Script không còn chuỗi của luồng cũ.

**Kiểm:**

```powershell
node --check fe/scripts/e2e-scenario.mjs
```

```powershell
node fe/scripts/e2e-scenario.mjs --base-url=<địa chỉ FE dev>
```

```powershell
git grep -nE "Có watermark|Mua 1 lượt|Cần 1 lượt|PDF_A4_PRINT|balance" -- fe/scripts/e2e-scenario.mjs
```

Lệnh cuối không được in dòng nào. Dùng `--base-url` của FE dev đang chạy mã của nhánh, không dùng bản build cũ.

**Báo cáo cho S10:** danh sách ảnh mới trong `fe/.page-shots/e2e/` và tóm tắt `report.json`. S10 ghi các thông tin này vào 28 #14, 18 §9 và 04.

### S8. Luồng E · 11, 13, 14, 28 (P1/P2)

- [ ] **11.**
  - Giữ quy trình sync và cách bảo vệ view đã nối API, kèm liên kết từ [README FE](../fe/README.md).
  - Đối chiếu các checkbox §5 với manifest và route hiện còn. Ghi những mục đã bỏ do đổi thiết kế.
  - Gắn nhãn "đo tại commit cũ" cho các tỷ lệ parity. Nếu cần công bố số mới, chạy `npm --workspace=fe run stitch:parity` và ghi viewport, ngày, commit.
  - Bỏ hai liên kết tới 12.
- [ ] **13.**
  - Giữ nguyên số đo của đợt đầu.
  - Thêm bảng kiểm lại P3-1 đến P3-6 với các cột: route còn tồn tại không, cách thử, viewport, kết quả mới, ảnh.
  - Nhận các khoảng trống của 22 §9: tài khoản demo, giao diện tối, bước Studio 4–6, các route chưa quét.
  - Tách riêng các ca cần Safari iOS, bàn phím ảo hoặc máy thật (§8).
  - Bỏ hai liên kết tới file ở §4.1.
- [ ] **14.**
  - Giữ H1–H11 và phạm vi bốn cấu trúc v1/v3.
  - Sửa phần giải thích ngưỡng FitCheck theo §2.
  - Ở §6, thêm bảng nghiệm thu vật lý gồm các cột: mẫu hộp, kích thước đặt, kích thước đo sau gấp, loại giấy, trình xem file, kết quả, ảnh.
  - Mở từng cặp ảnh v1/v3 (nắp gài, gối, âm dương, bao diêm) và ảnh 3D v3 trong [assets/14](assets/14/). Kiểm thứ tự cột và chú thích, rồi ghi rằng đây là ảnh so sánh lịch sử.
- [ ] **28.**
  - Cập nhật trạng thái 14 mục ngay trong bảng. Mục 14 ghi "đang làm ở luồng D"; S10 điền kết quả.
  - Giữ trạng thái riêng cho phần còn lại của mục 2, 3, 9, 10, 12 và 13: điều khoản, ảnh chụp, thử Pexels thật, phạm vi dọn dữ liệu, hai tab có thay đổi chưa lưu.
  - Thêm cột "Cách đóng" cho các mục kỹ thuật còn mở:

    | Mục | Cách đóng |
    |---|---|
    | 5 · Phông thiếu ký tự | So bản xem trước và PDF với cùng chuỗi có ký tự thiếu. Ghi cách cảnh báo hoặc dùng font thay thế, kèm hai kết quả đối chiếu |
    | 6 · Phân trang ví xu | Thử nhiều giao dịch cùng thời điểm ở ranh giới hai trang, kể cả khi lọc theo loại. Sau khi sửa cursor, đọc hết các trang phải thu đủ ID, mỗi ID xuất hiện đúng một lần |
    | 7 · VNPay báo tiền cho đơn đã hủy | Dùng dữ liệu thử để xác nhận đơn giữ trạng thái hủy. Ghi cách admin tìm giao dịch cần đối soát, và kết quả khi nhận thông báo lặp |
    | 8 và 10 · Pexels | Phân biệt hạn mức theo giờ và theo tháng. Kiểm cách ứng dụng xử lý khi chạm hạn mức. Ghi riêng kết quả thử với khóa thật khi người giữ tài khoản làm |
    | 11 · Admin và thông báo | Thử màn hình tài khoản admin và chuông thông báo bằng đúng vai trò. Ghi kết quả cho danh sách rỗng, có thông báo mới và đánh dấu đã đọc |
    | 14 · Kịch bản FE | Đóng khi S7 xong và S10 ghi kết quả |

  - **Từ 12.** Thêm mục mới "S12 của docs/12". Rà từng T1–T12, mỗi dòng ghi bằng chứng đã làm, hoặc việc đã bị thay thế, hoặc việc còn mở. Chỉ chuyển sang 28 những T còn mở.

    | T | Nội dung | Đối chiếu |
    |---|---|---|
    | T1–T6 | Chữ tràn khung, Google OAuth, Brand Kit, lint/CI, Gói, font mới | Mã FE/BE và cuối 30 (lint FE) |
    | T7–T9 | Lỗi upload/hạn mức, ô sức khỏe hệ thống, nhãn công thức cũ | [Trang admin](../fe/src/views/admin/index.tsx) và 14 |
    | T10 | Lỗi P3 | 13 |
    | T11 | Kiểm file in | 14 §6 |
    | T12 | Đồng bộ docs | Plan này |

  - **Từ 23 §9.** Thêm câu hỏi cho xưởng (thông số in) và nội dung nhãn. Ghi phần chưa thử với dịch vụ thật.
  - **Từ 25.** Mỗi mục hoãn có một dòng ghi lý do và trạng thái. Không trỏ tới 25 nữa.
  - Bỏ 15 liên kết tới file ở §4.1, trừ phần mô tả nguồn gốc mục đã viết lại bằng lời.

**Xong khi** 11, 13, 14 và 28 không còn liên kết tới file ở §4.1. Mọi việc còn mở của 12, 22, 23 và 25 có một dòng trong 28 hoặc 13.

### S9. Luồng F · 18 · Runbook deploy và demo (P1)

- [ ] **§2 "Trước khi deploy".** Ghép các bước từ 25, 28 §4 và 30 §5 thành một trình tự:
  1. Dừng API và worker cũ.
  2. Chạy `db:convert-export-credits --apply` (từ 25).
  3. Áp hai migration của 30: tham chiếu phông, và thiết kế của job.
  4. Khởi động bản mới.
  5. Kiểm job cũ có `design = NULL` đi qua nhánh tương thích. Ghi cách nhận diện job cũ theo 30 §5.

  Thêm truy vấn kiểm trước hoàn xu (từ 25) và điều kiện xem lại thiết kế khi chạy nhiều instance (25 mục 14).
- [ ] **§3.4–3.5 và §6.** Tách §6 thành hai lượt kiểm:
  - Lượt A: tài khoản demo, VNPay sandbox. Nêu điều kiện dùng nút giả lập.
  - Lượt B: tài khoản thường, VietQR/SePay, quét QR bằng app ngân hàng.

  Đưa vào toàn bộ việc ở 21 §10 mà người giữ tài khoản cần kiểm. Mỗi lượt có ô ghi ngày, môi trường và kết quả.
- [ ] **Từ 17.** Thêm deploy và bấm giờ hai lượt trên 4G vào danh sách nghiệm thu.
- [ ] **§9.** Liệt kê ảnh cũ cần chụp lại, gắn trạng thái "chờ luồng D". S10 điền tên ảnh mới.
- [ ] Bỏ 16 liên kết tới file ở §4.1. Phần nào cần nguồn gốc thì viết lại bằng lời.

**Xong khi** một người mới diễn tập demo chỉ bằng 18 mà không gặp bước mua lượt xuất, và 18 không còn liên kết tới file ở §4.1.

**Kiểm:** chạy thử 18 §6 lượt A trên môi trường thử, với một đơn đã trả tiền và một phiên bản vừa sửa. Kết quả mong đợi: phiên bản cũ tải được, phiên bản mới nhận `402`. Lượt B ghi "chờ người giữ tài khoản" (§8).

### S10. Gộp, gỡ file, đánh số lại · theo Q1, Q2, Q6–Q8

Làm trên `docs/sync-after-audit`, theo đúng thứ tự dưới. Mỗi bước có commit riêng, nên lỗi ở bước sau không làm mất bước trước.

1. **Gộp luồng.** Merge lần lượt A, B, C, E, F, D bằng `git merge --no-ff docs/sync-<luồng>`. Các file không chồng nhau, nên không được có xung đột. Nếu có, dừng lại và xem lại bảng §6.2.
2. **Điền kết quả của các luồng.**
   - Kết quả luồng D ghi vào 28 #14 và 18 §9.
   - Sửa các liên kết tạm thành liên kết tới mục của 03 và 06.
   - Ghi báo cáo của từng luồng vào §9.
3. **Cập nhật 04.**
   - Giữ CP2–CP4 theo thời điểm bàn giao.
   - Thêm các mốc: Xu Wrap, Studio S1–S23, thông báo, các đợt 25, 28 và 30, tour (22 S1–S5), kịch bản FE mới.
   - Mỗi dòng có commit hoặc bằng chứng, phạm vi đã kiểm và phần còn chờ.
   - Đặt "1.180 unit, 318 E2E, 19/11/2026, backend" cạnh nhau.
   - Thêm tóm tắt bảy phát hiện của 29 và commit sửa của 30.
   - Dòng 39 (Path 2) ghi rõ watermark và lượt xuất là phạm vi CP4, đã thay thế.
4. **Thêm mục "Tài liệu đã gỡ" vào 04.** Bảng gồm các cột: số cũ, tên file, commit cuối còn file, nội dung đã chuyển tới đâu. Commit cuối là commit ở bước 5. Ghi cách tra lại một file đã gỡ, ví dụ:

   ```powershell
   git show <commit>:docs/25_BACKEND_AUDIT_FIX_PLAN.md
   ```

   Ghi thêm hai quy ước:
   - Chú thích trong mã dạng `docs-old/NN` trỏ vào bảng này (Q7).
   - Chú thích trong migration Prisma giữ số cũ (Q8).

   Với 26, 27, 27a và 31, ghi "chưa từng vào Git, đã xóa theo quyết định ngày 2026-11-19".
5. **Kiểm §4.1 rồi commit.** Mở nơi nhận của từng dòng ở §4.1 và xác nhận nội dung đã có. Commit: `docs: carry content out of finished plans`.
6. **Gỡ file.**
   - Hỏi lại chủ dự án trước khi xóa 26, 27, 27a và 31: bốn file này chưa từng vào Git, xóa là mất hẳn.
   - `git rm` 10 file có trong Git: 10, 12, 17, 20, 21, 22, 23, 25, 29, 30.
   - Xóa bốn file chưa vào Git bằng `Remove-Item`.
   - Commit: `docs: remove finished plans`.
7. **Sửa tham chiếu.**
   - Sửa tay các số đứng một mình (lệnh ở cuối §4.3).
   - Chạy script §4.3 ở chế độ xem trước. Mọi dòng "cần sửa tay" phải được sửa xong.
   - Chạy `--write` **đúng một lần**.
8. **Đổi tên file.**
   - `git mv` theo thứ tự ở §4.2, kể cả `git mv docs/assets/14 docs/assets/12`.
   - Sửa số trong tiêu đề từng file.
   - Sửa cây `docs/` trong 09.
   - Commit chung với bước 7: `docs: renumber kept docs and their references`.
9. **Kiểm mã.** Chú thích trong mã đã đổi, nên chạy:

   ```powershell
   npm --workspace=shared run build
   ```

   ```powershell
   npm --workspace=be run lint
   ```

   ```powershell
   npm --workspace=be run test
   ```

   ```powershell
   npm --workspace=fe run lint
   ```

   Chạy tiếp `graphify update .`, rồi commit `chore: update graphify graph`.
10. **Kiểm cuối đợt** theo §7.
11. **Bàn giao.**
    - Ghi §9 và báo chủ dự án đối chiếu với bản audit. Bản audit dùng số cũ, đối chiếu qua bảng §4.2.
    - Sau khi chủ dự án xác nhận: chủ dự án tự xóa bản audit; S10 xóa plan 32 trong commit `docs: remove sync plan 32` (Q6).
    - Chỉ merge `docs/sync-after-audit` vào `develop` khi chủ dự án đồng ý.

## 7. Kiểm tra cuối đợt

Chạy từ một bản checkout sạch của commit cuối, không dùng working tree đang sửa:

```powershell
git worktree add ..\wrapfit-docs-check docs/sync-after-audit
```

Trong thư mục đó:

- [ ] `node $env:TEMP\renumber-docs.mjs --check` in `Lỗi tham chiếu: 0`.
- [ ] Lệnh kiểm liên kết ở §6.3 in `broken: 0`.
- [ ] Lệnh từ khóa ở §6.3 chỉ còn ra ghi chú lịch sử có nhãn và ví dụ DPI hợp lệ. Chạy lệnh đó với `fe/scripts/e2e-scenario.mjs` thì không còn dòng nào.
- [ ] `docs/` chỉ còn các file 00–18, blueprint bảo mật, `assets/12/` với 9 ảnh, bản audit và plan 32 (hai file cuối chờ chủ dự án xác nhận).
- [ ] Mở 04, chín ảnh của 12 (số mới) và một liên kết mã nguồn cho mỗi phân hệ ở 08.
- [ ] Đối chiếu 00, 01, 03, 05, 06 và 15 (số mới, runbook) với từng dòng của §2. Không file nào ghi khác.
- [ ] Đọc liền một mạch luồng Studio → Đặt in → thanh toán → tải file qua 00 → 06 → 15 (số mới). Ba file phải mô tả cùng một trình tự, và trình tự đó khớp với kịch bản FE mới.

Xong thì gỡ worktree:

```powershell
git worktree remove ..\wrapfit-docs-check
```

## 8. Việc ngoài plan và nơi ghi kết quả

Plan này chỉ chuẩn bị chỗ ghi kết quả. Các việc dưới đây cần người, thiết bị hoặc tài khoản riêng. Cột "Ghi kết quả ở" dùng số **mới**.

| Việc | Người làm | Ghi kết quả ở |
|---|---|---|
| Chuyển khoản SePay thật, IPN với credential VNPay sandbox, quét QR bằng app ngân hàng | Người giữ tài khoản cổng | 15 §6 lượt B, 04 |
| Deploy và bấm giờ hai lượt trên 4G | Người deploy | 15 §6, 04 |
| Mở PDF, SVG, DXF bằng công cụ xưởng; in và gấp tay tỉ lệ 1:1 | Xưởng in hoặc nhóm thiết kế | 12 §6, 04 |
| Safari iOS, bàn phím ảo, máy thật | Người có thiết bị | 11, 04 |
| Thử Pexels bằng khóa thật, chạm hạn mức giờ và tháng | Người giữ khóa Pexels | 18 #8, #10 |
| Đo giá vốn fal thật | Người giữ tài khoản fal | 16 |
| Đo FPS và thời gian phản hồi | Dev FE | 01 (NFR), 04 |
| Phông thiếu ký tự (#5), phân trang ví xu (#6), VNPay báo tiền cho đơn đã hủy (#7), admin và chuông thông báo (#11) | Dev BE/FE | 18, theo cột "Cách đóng" |

## 9. Nhật ký

| Ngày | Session | Commit | Từ khóa cũ | Liên kết hỏng | Ghi chú |
|---|---|---|---|---|---|
| 2026-11-19 | Lập plan | 09ca9d4 (chưa commit) | 104 dòng (95 khi không tính bản audit) | 0 | Đã kiểm lại các phát hiện chính của audit với mã |
| 2026-11-19 | Chốt Q1–Q5 | chưa commit | — | 0 | Xóa kế hoạch đã xong và đánh số lại; xóa 26/27/27a/31; sửa script FE trong đợt; làm song song. Script §4.3 xem trước: 682 chỗ trong 290 file giữ lại, 25 dòng cần sửa tay |
| 2026-11-19 | S0 · Chuẩn bị (làm lại) | `docs/sync-after-audit` (3a5c2d5, đã gộp `develop` fb720a9) | 95 dòng (trừ 32 và bản audit) | 0 | Bỏ nhánh `docs/sync-a`–`f` của lần chạy trước theo quyết định chủ dự án, làm lại sáu luồng. `develop` mới chỉ đổi luật giả lập thanh toán (đã sửa §2, dòng "Cổng thanh toán"); các phát hiện khác ở §1 giữ nguyên. Script §4.3 xem trước (trước khi gỡ file): 791 chỗ, 25 dòng cần sửa tay, trong đó có `.agents/skills/insforge-backend-flow/SKILL.md`, `fe/.agents/skills/insforge-backend-flow/SKILL.md` và `be/test/e2e/auth.e2e-spec.ts` |
| 2026-11-19 | S1–S4 · Luồng A | 50947d3, 5abf667, ad1bd3c, de5a641 | 02, 03, 06, 16, 19 còn dòng có nhãn (`watermarked` luôn `false`, `useCredit` → `400`, `EXPORT_PACK_DISCONTINUED`, Phần B/C của 16) | 0 | 32/32 bảng có trong 02; 113/113 route có trong 03; mọi tình huống FE của 20 có ở 06 §11. Chưa kiểm: `XU_CUSTOM` chưa có test; khôi phục từ thùng rác giữ quyền xuất chưa có E2E; giá vốn fal chờ đo |
| 2026-11-19 | S5 · Luồng B | 5431d6d | 01: 2 dòng mô tả hành vi hiện tại | 0 | Ranh giới DPI 149/150/299/300 khớp validator. Điểm vào Studio kiểm từ mã, chưa mở trình duyệt |
| 2026-11-19 | S6 · Luồng C | 1e63913 | 0 | 0 | 09: kiểm đường dẫn chỉ còn `be/src/shipping/` (đề xuất) và `shared/src/exporter/pdf-export.ts` (đã bỏ). `tokens:check` 0 vi phạm |
| 2026-11-19 | S7 · Luồng D | c622f67 | Script: 0 | — | `e2e-scenario.mjs` chạy đạt ở `M` và `Xp`, bước `1-14,16-18`, stack local với `PAYMENT_SIMULATION=true`. Ảnh mới ghi ở 18 §9 |
| 2026-11-19 | S8 · Luồng E | 81edc03 | 28: 6 dòng lịch sử hoặc mã lỗi hiện hành | 0 | 13 §6.1 kiểm lại từ mã, chưa chạy `shots`/`stitch:parity`. Thêm 28 mục 15–23 |
| 2026-11-19 | S9 · Luồng F | e3a2ef3 | 0 | 0 | Chưa chạy thử 18 §6 lượt A; lệnh migrate và đổi lượt xuất ở 18 §2.3 chờ người deploy chạy lần đầu |
| 2026-11-20 | S10 · Gộp và điền kết quả | (commit này) | 64 dòng trong file giữ lại, đều có nhãn hoặc là mã lỗi hiện hành | 0 | Gộp A, B, C, E, F, D không xung đột. Đổi liên kết tạm thành liên kết tới mục. Điền kết quả luồng D vào 04, 18 §9, 28 #14. Kiểm §4.1: nội dung của từng file đã có ở file nhận |
| 2026-11-20 | S10 · Gỡ file, đánh số lại, kiểm | aa47f4b (commit cuối còn file), c0feb50, 8f8b6d2, 417c30a | 64 dòng, đều có nhãn hoặc là mã lỗi hiện hành; script FE: 0 | 0 | Chủ dự án xác nhận lại trước khi xóa 26/27/27a/31. Script §4.3 `--write`: 664 chỗ; sửa tay 4 chỗ trỏ tới 10; 50 nhãn liên kết số cũ sửa bằng regex riêng. `--check` trên worktree sạch: 1 ngoại lệ có chủ ý, `CONVERSION_REF = 'docs/25-item-7:…'` trong `be/prisma/scripts/convert-export-credits.ts` là `ref_id` đã lưu trong CSDL, đổi sẽ làm script đổi lượt xuất chạy hai lần. Shared build, BE lint, FE `tsc --noEmit`, `tokens:check` đạt; unit BE 1180/1180 (77 bộ). `npm --workspace=fe run lint` không chạy được vì FE chưa cấu hình ESLint (18 mục 17). Mục lục 08 có 27 anchor lệch tiêu đề từ trước đợt này, chưa sửa |

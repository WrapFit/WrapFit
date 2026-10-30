# 17 — Kế hoạch hoàn thiện Market-Test-Ready MVP (Path 2)

> Ngày lập: 2026-10-29 · Nhánh gốc: `feat/fe-be-integration` (22df863) · Trạng thái: **đã duyệt 2026-10-29** (M1–M9; Q1–Q4 dùng mặc định
> cho tới khi có trả lời).
> Nguồn yêu cầu: Google Doc CP4, tab "Phân Công → IT", "Nội Dung → IT-ndung", "MVP", "CP4 YÊU CẦU → Path 2".
> Đặc tả nền: [`16_PRICING_ENTITLEMENTS_SPEC.md`](16_PRICING_ENTITLEMENTS_SPEC.md). Kế hoạch này chỉ lấy phần
> docs/16 cần cho Path 2 và ghi rõ chỗ làm gọn hơn docs/16.
> Cách chia phiên giống [`12_FE_BE_INTEGRATION_PLAN.md`](12_FE_BE_INTEGRATION_PLAN.md) §9: mỗi phiên là một cuộc trò
> chuyện Claude Code độc lập, mọi trạng thái nằm trong file này, `git log` và nhật ký §7.

Mục lục: [1. Hiện trạng](#1-hiện-trạng-2026-10-29) · [2. Quyết định](#2-quyết-định-và-câu-hỏi-mở) ·
[3. Nhánh và song song](#3-nhánh-và-chạy-song-song) · [4. Các phiên](#4-các-phiên) ·
[5. Kịch bản nghiệm thu](#5-kịch-bản-nghiệm-thu-live-demo-3-phút) · [6. Quy trình mỗi phiên](#6-quy-trình-mỗi-phiên) ·
[7. Nhật ký bàn giao](#7-nhật-ký-bàn-giao)

---

## 1. Hiện trạng (2026-10-29)

Đối chiếu 7 hạng mục của tab "Phân Công → IT" với code:

| # | Hạng mục | Trạng thái | Bằng chứng trong code |
|---|---|---|---|
| 1 | Gating xuất file và watermark | Chưa làm | `ExportService.request` ([export.service.ts:60](../be/src/export/export.service.ts)) không kiểm gói; backend không có watermark; `shared/src/billing/` chưa có |
| 2a | AI mặc định `claude-haiku-5-5` | Chưa làm | `AI_MODEL = 'claude-opus-5-5'` ([env.validation.ts:166](../be/src/config/env.validation.ts)) |
| 2b | Cầu chì `AI_MONTHLY_BUDGET_USD` | Chưa làm | Chỉ có `DAILY_AI_LIMIT` theo gói ([ai-pattern.service.ts:13](../be/src/ai/ai-pattern.service.ts)) |
| 2c | Đơn in lưu PostgreSQL | Chưa làm | `const SAMPLE_ORDERS = new Map(...)` ([orders.service.ts:37](../be/src/orders/orders.service.ts)); FE giả đơn thành công khi API lỗi ([api/orders](../fe/src/api/orders/index.ts)) |
| 3 | Analytics Dashboard | Chưa làm | `/dashboard` chỉ đếm dự án, dung lượng, lượt AI; không có endpoint thống kê |
| 4a | Trang giá: gói lượt 19k / 79k / 199k + Pro | Chưa làm | `plans.ts` có 19k/lượt, Pro 99k, Doanh nghiệp 299k; `content.ts` lại gọi "Starter / Pro Business" |
| 4b | Auto-Fix chỉ dời phần tử lỗi | **Đã xong** | `autoFixElements` trả nguyên phần tử đạt lề ([validator.ts:347](../shared/src/fitcheck/validator.ts)) |
| 4c | Nhãn 2D / 3D | Một phần | 2D có tên mặt (`panel.name`), có nút "Khuôn bế 2D / Gập hộp 3D"; mô hình 3D chưa có nhãn Nắp, Đáy, Mặt trước (kịch bản demo cần) |
| 4d | In `L x W x H` ở lề | Một phần | `specLine` có nhưng nằm trên lớp `Dimensions` không in ([print-renderers.ts:104](../be/src/export/rendering/print-renderers.ts)) |
| 5a | VietQR động `WF` + 6 ký tự, nút giả lập | Chưa làm | VietQR chỉ là logo và chữ; thư viện `qrcode` đã có ở cả `fe` và `be` |
| 5b | Deploy VPS | **Đã có** | `.github/workflows/deploy.yml`, `docker-compose.prod.yml` |
| 5c | Deploy Vercel `wrap-fit.vercel.app` | Chưa rõ | Repo không có `vercel.json`; FE gọi API qua rewrite `/api` với `BACKEND_INTERNAL_URL` ([next.config.mjs](../fe/next.config.mjs)) |
| 6, 7 | AI-Proof, kịch bản demo, slide | Ngoài code | Phiên S8 chỉ cung cấp số liệu, ảnh chụp và tài khoản demo |

Phát hiện thêm khi đọc kịch bản demo (tab IT-ndung, mục 2):

- Studio chưa có ô **khối lượng quà**. Công thức đã tự chuyển đáy khóa FEFCO 0215 khi `giftWeight > 300`
  ([tuck-top.ts:44](../shared/src/parametric/tuck-top.ts)), nhưng chỉ Gói Copilot đọc giá trị này.
- `packaging_projects` đã lưu `fitcheck_state`, `fitcheck_score` mỗi lần xuất: dùng lại cho dashboard.

## 2. Quyết định và câu hỏi mở

### 2.1. Quyết định đề xuất (duyệt cùng plan)

| Mã | Quyết định | Lý do |
|---|---|---|
| M1 | Làm **tập con P1 của docs/16**: gói, lô lượt xuất, mở khóa bản thiết kế, watermark, thanh toán giả lập. Không làm webhook ngân hàng, gia hạn, hạ gói, coupon, affiliate, workspace | Path 2 chấp nhận thanh toán mô phỏng; phần còn lại để sau CP4 |
| M2 | Credit AI theo lô (docs/16 §4) **chưa làm**. Giữ `DAILY_AI_LIMIT`, chỉ tách model nhanh / cao cấp và thêm cầu chì ngân sách | Tab IT chỉ yêu cầu haiku + cầu chì; giảm phạm vi S3 |
| M3 | Lượt xuất vẫn là sổ cái (`credit_lots`, `credit_debits`), không lưu số dư trên `users` (docs/16 §1.5) | Hai request song song không trừ sai; dễ hoàn lượt |
| M4 | Pro (`STARTER`) = xuất sạch không giới hạn trong 30 ngày, mua bằng thanh toán giả lập. Business giữ trên trang giá, nút "Liên hệ" | Đủ cho demo, không cần vòng đời subscription |
| M5 | VietQR: backend tự dựng chuỗi EMVCo (chuẩn NAPAS VietQR) và ảnh QR bằng `qrcode`, không gọi `img.vietqr.io` | Chạy được khi mạng sân khấu yếu, không lộ dữ liệu cho dịch vụ ngoài |
| M6 | Nút "Giả lập đã thanh toán" chỉ hiện và chỉ chạy khi `PAYMENT_SIMULATION=true` (mặc định `false` ở production thật, `true` cho bản demo CP4) | Không để lỗ hổng "tự xác nhận" lọt vào bản bán thật |
| M7 | Dashboard có hai khối: "Của bạn" (dự án của người dùng) và "Toàn WrapFit" (tổng ẩn danh, không tên, không id) | Hội đồng cần số liệu thật của cả hệ thống; người dùng thường chỉ thấy tổng |
| M8 | "Thời gian tạo hộp" = trung vị thời gian **có thao tác trong studio** từ lúc tạo dự án đến lần xuất thành công đầu tiên, đo bằng nhịp `heartbeat` của studio (bỏ khoảng nghỉ > 2 phút) | `created_at → completed_at` tính cả ngày người dùng bỏ đi, ra số vô nghĩa |
| M9 | "Lỗi FitCheck ngăn chặn" = số vi phạm mức `error` bị chặn ở lần xuất (422) + số vi phạm Auto-Fix đã sửa, ghi vào bảng sự kiện | Đếm đúng cái hệ thống đã ngăn, không đếm cảnh báo |

### 2.2. Câu hỏi mở (cần người dùng trả lời trước phiên ghi trong cột "Cần trước")

| Mã | Câu hỏi | Mặc định nếu chưa trả lời | Cần trước |
|---|---|---|---|
| Q1 | Tài khoản nhận tiền trên mã VietQR: mã BIN ngân hàng, số tài khoản, tên chủ tài khoản | Đọc từ env `VIETQR_BANK_BIN`, `VIETQR_ACCOUNT_NO`, `VIETQR_ACCOUNT_NAME`; để trống thì QR dùng tài khoản mẫu và ghi "Mô phỏng" | S5 |
| Q2 | Dự án Vercel `wrap-fit.vercel.app` đã tạo chưa, ai giữ tài khoản, API production ở tên miền nào | S8 hướng dẫn tạo; người dùng tự bấm phần cần đăng nhập | S8 |
| Q3 | Chi phí cloud thật mỗi tháng (tab "Chi phí đang không được khớp" cần IT xác nhận) | S8 lập bảng dịch vụ đang dùng và gói miễn phí; số tiền do người dùng xác nhận | S8 |
| Q4 | Có đổi model AI cao cấp không, hay chỉ đổi mặc định sang haiku | `AI_MODEL_FAST = claude-haiku-5-5`, `AI_MODEL_PREMIUM = claude-opus-5-5` | S3 |

## 3. Nhánh và chạy song song

- Nhánh tích hợp: `feat/path2-mvp`, tạo từ `feat/fe-be-integration` ở phiên đầu tiên chạy.
- Mỗi phiên làm trên worktree / nhánh riêng `feat/path2-s<n>-<tên>` tạo từ `feat/path2-mvp`, commit ở đó, **không push**
  khi chưa được hỏi. Người dùng quyết định merge vào `feat/path2-mvp`.
- Nhiều phiên cùng sửa `be/prisma/schema.prisma`. Mỗi phiên chỉ thêm khối model / enum của mình và một thư mục migration
  riêng có tiền tố ngày giờ khác nhau (bảng dưới). Khi merge, xung đột chỉ là thêm dòng; sau merge chạy
  `npm --workspace=be run db:generate` và `prisma migrate dev` trên CSDL sạch để kiểm thứ tự.

| Phiên | Migration | File dùng chung có thể chạm |
|---|---|---|
| S1 | `20261030000100_billing_core` | `schema.prisma`, `shared/src/index.ts` |
| S3 | không có (chỉ env) | `env.validation.ts`, `config/envs/default.ts` |
| S4 | `20261030000300_orders` | `schema.prisma` |
| S7 | `20261030000700_product_events` | `schema.prisma`, `views/editor/studio/StudioWorkspace.tsx` (một hook heartbeat) |

**Đợt chạy**:

```text
Đợt 1 (song song, độc lập):  S1 billing core · S3 AI cost · S4 orders DB · S7 analytics
Đợt 2 (sau khi merge đợt 1): S2 gating + watermark (cần S1) → S5 VietQR (cần S1, S2, S4)
                             S6 trang giá + iterate UI (cần S1) chạy song song với S2
Đợt 3:                       S8 tích hợp, deploy, chuẩn bị demo (cần tất cả)
```

S2 và S5 cùng sửa `ExportDialog.tsx`, nên chạy nối tiếp. S6 và S7 cùng có thể chạm `StudioWorkspace.tsx`: S7 chỉ thêm
một dòng gọi hook, S6 sửa phần 3D và Step 2; merge S7 trước.

## 4. Các phiên

Mỗi phiên ghi: phạm vi, file chính, kết thúc khi (DoD). Kiểm thử unit đặt `*.spec.ts` cạnh file, e2e trong
`be/test/e2e/`. Màn FE vừa sửa phải chụp bằng `npm --workspace=fe run shots -- <route> --widths=375x812,1440x900`.

### S1 — Lõi billing (shared + CSDL)

Phạm vi:

1. `shared/src/billing/`: `plans.ts` (`resolvePlan`, docs/16 §2), `prices.ts` (gói lượt `EXPORT_1` 19.000đ / 1 lượt,
   `EXPORT_5` 79.000đ / 5 lượt, `EXPORT_15` 199.000đ / 15 lượt, hạn 12 tháng; `PRO_MONTH` 99.000đ / 30 ngày; Business
   299.000đ chỉ để hiển thị), `entitlements.ts` (chỉ các khóa `export.mode`, `export.unlockDays`, `storage.bytes`,
   `projects.max`, `snapshots.maxManualPerProject`, `collections.max`), export từ `shared/src/index.ts`.
2. Prisma (migration `20261030000100_billing_core`), theo docs/16 §6 nhưng gọn:
   `payments` (id, user_id, purpose, amount_vnd, reference `WF` + 6 ký tự unique, status `PENDING | PAID | EXPIRED |
   CANCELLED`, expires_at, paid_at, metadata), `credit_lots` (user_id, kind `EXPORT`, source `PURCHASE | ADMIN`,
   quantity, expires_at, payment_id), `credit_debits` (lot_id, operation_id unique, quantity, reason, refunded_at),
   `export_unlocks` (project_id, project_version, debit_operation_id, expires_at, refunded_at),
   `subscriptions` (user_id, plan, status `ACTIVE | EXPIRED`, current_period_end, payment_id);
   thêm `export_jobs.watermarked boolean default false`, `export_jobs.unlock_id`.
3. `be/src/billing/` (module `BillingCoreModule`, đăng ký cả ở worker): `CreditsService.balance`, `debit` (transaction,
   `SELECT ... FOR UPDATE` trên lô, lô sắp hết hạn trước), `refund(operationId)`; `PlanService.sync(userId)` ghi lại
   `users.subscription_tier` theo `resolvePlan`; `EntitlementsService.of(userId)`.
4. `GET /api/billing/me` → `{ tier, exportCredits: { balance, lots }, subscription }`. Admin `POST
   /api/admin/users/:id/credits` cấp lượt tay (source `ADMIN`), dùng cho tài khoản demo.

DoD: unit test `resolvePlan`, `debit` hết lượt → lỗi, hai `debit` song song với 1 lượt → đúng một thành công
(test có CSDL), `refund` hai lần chỉ hoàn một; `npx tsc` sạch ở `shared` và `be`; Swagger có `/billing/me`.

### S2 — Gating xuất file và watermark (cần S1)

Phạm vi:

1. `CreateExportDto` thêm `useCredit?: boolean`. `ExportService.request` theo docs/16 §5.2 bước 3–7:
   Pro → sạch; có `export_unlocks` còn hạn cho `(project_id, version)` → sạch; `PDF_A4_PRINT` không dùng lượt →
   `watermarked = true`; định dạng khác không có lượt → `402 EXPORT_CREDIT_REQUIRED { balance }`; `useCredit` mà hết
   lượt → `402 INSUFFICIENT_CREDITS`. Trả thêm `watermarked`, `charged`, `exportCredits.balance`.
2. Hoàn lượt khi lần thử cuối của job thất bại và unlock chưa có job `COMPLETED` (docs/16 §5.3) trong `ExportProcessor`.
3. Watermark: `shared/src/print/watermark.ts` với `watermarkPlacement(pieces)` (ưu tiên `glueAreas`, không có thì dải
   dưới mặt lớn nhất trong vùng an toàn 3 mm). Renderer PDF vẽ `Thiết kế bằng WrapFit · wrapfit.vn`, Inter 6 pt,
   `#7C8BA1`, lớp `Artwork`, chỉ khi `job.watermarked`. FitCheck không tính watermark.
4. FE `ExportDialog`: gắn nhãn "Có watermark" cho PDF A4 khi chưa mở khóa; bấm định dạng sạch mà nhận 402 → hộp thoại
   "Dùng 1 lượt? Còn N lượt" hoặc "Mua lượt" (nút mở checkout, S5 nối; trong S2 tạm dẫn tới `/pricing`).

DoD: unit `export.service.spec.ts` cho đủ nhánh (Free A4 → watermark, Free SVG → 402, có lượt → trừ 1 và tạo unlock,
xuất định dạng khác cùng version → không trừ, sửa thiết kế → trừ lại, Pro → không trừ); `export.e2e-spec.ts` có ca 402 và
403 (không phải chủ dự án); PDF A4 xuất thật có chữ watermark nằm trong vùng tai dán (kiểm bằng `pdf-lib` / đọc text).

### S3 — Chi phí AI (độc lập)

Phạm vi:

1. Env: `AI_MODEL_FAST` (mặc định `claude-haiku-5-5`), `AI_MODEL_PREMIUM` (mặc định `claude-opus-5-5`),
   `AI_MONTHLY_BUDGET_USD` (trống = không giới hạn). Giữ `AI_MODEL` làm bí danh cũ của `AI_MODEL_FAST` một thời gian,
   ghi vào `be/README.md` và `be/.env.example`.
2. `be/src/ai/ai-pricing.ts`: bảng giá theo model (USD / 1 triệu token vào, ra; haiku 0,10 / 0,50, opus 4 / 20 theo
   docs/16 §4.1) và `estimateCostUsd(model, inputTokens, outputTokens)`.
3. `AiCostGuard`: cộng chi phí tháng hiện tại (giờ Việt Nam) từ `ai_generations`, cache 5 phút; vượt ngân sách →
   dùng `ProceduralPatternGenerator`, log `error` một lần mỗi chu kỳ cache. `GET /ai/usage` thêm `budgetReached`.
4. DTO `quality?: 'fast' | 'premium'` (mặc định `fast`). `premium` chỉ cho gói khác `FREE` (403 nếu không đủ).

DoD: unit cho `estimateCostUsd`, guard vượt ngân sách → procedural và không gọi Anthropic, premium với Free → 403;
`ai.e2e-spec.ts` xanh; ghi trong nhật ký chi phí ước tính một lượt haiku bằng VND theo token thật của một lần gọi.

### S4 — Đơn in lưu PostgreSQL (độc lập)

Phạm vi:

1. Prisma (migration `20261030000300_orders`): enum `OrderStatus` (`PENDING_PAYMENT`, `PAID`, `IN_PRODUCTION`,
   `SHIPPED`, `DELIVERED`, `CANCELLED`), `orders` (order_code `WF-<năm>-<4 số>` unique, user_id, print_shop_id,
   người nhận, điện thoại, địa chỉ, ghi chú, subtotal / shipping / total VND, status, payment_id null, các mốc thời gian),
   `order_items` (order_id, project_id, project_version, quantity, unit_price_vnd, ảnh chụp `structure` và kích thước
   lúc đặt), `order_status_history` (order_id, from, to, changed_by, at).
2. `OrdersService` bỏ `SAMPLE_ORDERS`, đọc / ghi qua Prisma, giữ nguyên contract `POST /orders/sample`,
   `GET /orders/my-orders`, `GET /orders/:id` (chỉ chủ đơn). Thêm `PATCH /orders/:id/status` cho `ADMIN` và
   `PRINT_SHOP` của đúng xưởng, kiểm bước chuyển hợp lệ.
3. FE `fe/src/api/orders`: bỏ nhánh giả đơn thành công khi API lỗi (lỗi phải hiện ra); `DEMO_ORDERS` chỉ còn cho màn
   tĩnh không có backend. Trang `/dashboard/orders` và admin xưởng in đọc dữ liệu thật.

DoD: `orders.service.spec.ts` cập nhật; e2e mới `orders.e2e-spec.ts` (tạo đơn, khởi động lại API, đơn vẫn còn; người khác
đọc → 404; chuyển trạng thái sai → 409); `/dashboard/orders` hiện đơn vừa tạo sau khi tải lại.

### S5 — Thanh toán VietQR mô phỏng (cần S1, S2, S4)

Phạm vi:

1. `be/src/payments/`: `POST /payments` `{ purpose: 'EXPORT_1' | 'EXPORT_5' | 'EXPORT_15' | 'PRO_MONTH' |
   'SAMPLE_ORDER', orderId? }` → tạo `payments` `PENDING`, hạn 15 phút, `reference` = `WF` + 6 ký tự
   `[A-Z0-9]` không dễ nhầm (bỏ `O`, `0`, `I`, `1`); trả `{ id, amountVnd, reference, expiresAt, vietqr: { payload,
   qrSvg, bankName, accountNo, accountName } }`. Payload EMVCo VietQR (tag 38 NAPAS, số tiền, nội dung = reference,
   CRC16) dựng trong `be/src/payments/vietqr.ts`.
2. `GET /payments/:id` (chủ thanh toán) để FE hỏi trạng thái mỗi 3 giây; hết hạn → `EXPIRED`.
3. `POST /payments/:id/simulate-confirm` chỉ khi `PAYMENT_SIMULATION=true` (ngược lại 404): transaction đổi `PAID`,
   cấp `credit_lots` (gói lượt), tạo / gia hạn `subscriptions` (Pro), hoặc chuyển đơn in sang `PAID` (S4); gọi
   `PlanService.sync`. Gọi hai lần chỉ cấp một lần.
4. FE `CheckoutDialog` (dùng `Dialog` của `@/components/ui`): QR, số tiền, nội dung chuyển khoản có nút chép, đồng hồ
   15 phút, nút "Giả lập đã thanh toán" (chỉ khi `/billing/me` hoặc `/health` báo chế độ mô phỏng), trạng thái thành công
   có Gói `celebration`. Nối từ: trang giá (CTA từng gói), `/dashboard/billing`, hộp thoại 402 của S2, bước 2 checkout
   đơn in mẫu 49.000đ.

DoD: unit cho payload VietQR (CRC đúng, quét được bằng app ngân hàng thử trên điện thoại, ghi vào nhật ký), xác nhận
hai lần không cấp đôi, `PAYMENT_SIMULATION=false` → 404; luồng FE: Free bấm SVG → 402 → mua 1 lượt → QR → giả lập →
tải SVG sạch; đặt in mẫu 49k → QR → giả lập → đơn `PAID` trong `/dashboard/orders`.

### S6 — Trang giá và các điểm iterate studio (cần S1)

Phạm vi:

1. Trang giá đọc giá từ `shared/src/billing/prices.ts`; bỏ `fe/src/features/pricing/plans.ts` hoặc chuyển nó thành lớp
   hiển thị gọi shared. Bốn thẻ: Miễn phí, Lượt xuất (19k / 79k / 199k, chọn số lượt trong thẻ), Pro 99.000đ / tháng,
   Business (Liên hệ). Thống nhất tên ở `content.ts`, `PlansAndCopilot.tsx`, `/dashboard/billing`, `legal`, FAQ (FAQ
   đang nói "từ 19.000đ/lần xuất hoặc 99.000đ/tháng": giữ đúng con số mới). Bảng so sánh nói rõ: Free chỉ PDF A4 có
   watermark ở tai dán.
2. Studio bước 2: ô "Khối lượng quà (g)" ghi vào `dimensions.giftWeight`; > 300 g hiện chip "Đáy khóa FEFCO 0215" và
   công thức đổi đáy (đã có trong `tuck-top.ts`). Có nút "Đáy gài thường" để ghi đè (`bottomType: 'tuck'`).
3. Nhãn mặt trên mô hình 3D (Nắp, Đáy, Mặt trước, Mặt sau, Hông): bật / tắt ở dock 3D, mặc định bật khi gập ≥ 80%,
   dùng tên mặt từ công thức (bỏ phần tiếng Anh trong ngoặc khi hiển thị).
4. File in: dòng `WrapFit — tên — cấu trúc L x W x H mm, giấy t mm` chuyển sang lớp `Artwork`, đặt ở lề ngoài vùng
   bleed (≥ 5 mm dưới vùng cắt), cỡ 6 pt; lớp `Dimensions` giữ nguyên. Áp cho cả renderer backend và renderer offline FE.
5. Kiểm lại Auto-Fix chỉ dời phần tử lỗi bằng một unit test (một phần tử lỗi, một phần tử đạt: phần tử đạt giữ nguyên).

DoD: ảnh chụp `/pricing` 375 và 1440 không còn tên gói cũ; `grep -rn "Starter\|Pro Business" fe/src` không còn trong
nội dung hiển thị; nhập 350 g → khuôn bế có đáy khóa; PDF xuất có dòng kích thước in được; unit Auto-Fix xanh.

### S7 — Analytics Dashboard (độc lập)

Phạm vi:

1. Prisma (migration `20261030000700_product_events`): `product_events` (id, user_id null, project_id null, type,
   payload jsonb, created_at, index `(type, created_at)`). Loại sự kiện: `PROJECT_CREATED`, `EXPORT_BLOCKED_FITCHECK`
   (payload: số vi phạm `error`), `AUTO_FIX_APPLIED` (payload: số vi phạm đã sửa), `EXPORT_COMPLETED` (payload:
   `fileType`, `watermarked`), `STUDIO_ACTIVE` (payload: `seconds`, gộp theo phút).
2. Ghi sự kiện: `ProjectsService.create`, `ExportService.request` (nhánh 422), `ExportProcessor` (hoàn tất),
   `POST /api/projects/:id/events` cho `AUTO_FIX_APPLIED` và `STUDIO_ACTIVE` (throttle, chỉ chủ dự án, `seconds` ≤ 60
   mỗi nhịp). FE: hook `useStudioHeartbeat` gửi mỗi 60 giây khi tab hiện và có thao tác trong 2 phút gần nhất;
   `handleAutoFix` gửi số vi phạm trước khi sửa.
3. `GET /api/analytics/summary?scope=me|global&days=30` → hộp đã tạo (tổng và theo ngày), cơ cấu 4 kiểu hộp, lỗi
   FitCheck đã ngăn (M9), trung vị và trung bình thời gian tạo hộp (M8), số lần xuất theo định dạng, tỉ lệ dự án đạt
   FitCheck 100. `global` chỉ trả số tổng (M7). Cache 60 giây.
4. FE `/dashboard`: khối "Số liệu thiết kế" dưới hàng `StatTile` hiện có: 4 ô số, biểu đồ cột hộp theo ngày, biểu đồ
   cơ cấu kiểu hộp (thanh ngang có nhãn, không phải tròn), chuyển "Của bạn / Toàn WrapFit", chọn 7 / 30 / 90 ngày,
   trạng thái rỗng có Gói `chilling`. Đọc skill `dataviz` trước khi vẽ biểu đồ.
5. Script `be/scripts/backfill-product-events.ts`: tạo `PROJECT_CREATED` và `EXPORT_COMPLETED` cho dữ liệu cũ từ
   `packaging_projects` và `export_jobs` (thời gian tạo hộp của dữ liệu cũ để trống).

DoD: unit cho phép tính trung vị và bỏ khoảng nghỉ; e2e `analytics.e2e-spec.ts` (tạo dự án, xuất bị chặn, xuất xong →
số liệu đổi đúng; người dùng A không thấy số `me` của B); ảnh chụp `/dashboard` 375 và 1440 với dữ liệu thật.

### S8 — Tích hợp, deploy, sẵn sàng demo (cần S1–S7)

Phạm vi:

1. Merge các nhánh phiên vào `feat/path2-mvp` (khi người dùng đồng ý), `prisma migrate reset` trên CSDL thử, build toàn
   monorepo, chạy toàn bộ unit + e2e, `node fe/scripts/e2e-scenario.mjs`.
2. Thêm bước vào `e2e-scenario.mjs` cho kịch bản §5 (Free → watermark, mua lượt giả lập → file sạch, đặt in mẫu,
   dashboard đổi số).
3. Seed tài khoản demo (`SEED_DEMO_*` trong `be/.env`, không ghi mật khẩu vào tài liệu): 5 lượt xuất, dự án hũ nến
   80 x 80 x 95 mm, 350 g, Ivory 300 GSM có sẵn logo.
4. Deploy: VPS (workflow hiện có, thêm env mới vào `.env` production và `docker-compose.prod.yml`), FE trên Vercel với
   `BACKEND_INTERNAL_URL` trỏ API production (Q2). Kiểm `wrap-fit.vercel.app` trên điện thoại 4G: đăng nhập, studio,
   3D, xuất, QR mở hộp.
5. Bàn giao cho khối khác: ảnh chụp dashboard và luồng thanh toán cho slide, bảng chi phí cloud thực tế (Q3), danh sách
   rủi ro demo và cách xử lý.
6. Cập nhật `docs/04_PROGRESS.md`, `docs/03_API_DESIGN.md` (endpoint mới), `docs/16` (đánh dấu phần đã làm), bảng §1
   của file này.

DoD: 8 tiêu chí của tab "MVP" đều kiểm được trên URL công khai; kịch bản §5 chạy hết trong ≤ 3 phút hai lần liên tiếp
trên bản deploy; nhật ký §7 ghi commit cuối và URL.

## 5. Kịch bản nghiệm thu (Live Demo 3 phút)

Theo tab IT-ndung mục 2. Mỗi bước ghi phiên chịu trách nhiệm.

| Bước | Thao tác | Kết quả mong đợi | Phiên |
|---|---|---|---|
| 1 | `/editor/new` → Hộp nắp gài → 80 x 80 x 95 → khối lượng 350 g → Ivory 300 → Tạo | Khuôn bế đáy khóa FEFCO 0215, chip báo lý do | S6 |
| 2 | Kéo logo sát mép cắt | FitCheck đỏ, Gói ở trạng thái `measuring` | đã có |
| 3 | Auto-Fix | Chỉ logo dời vào ≥ 3 mm, FitCheck 100; sự kiện `AUTO_FIX_APPLIED` ghi nhận | đã có, S7 |
| 4 | Gập 0 → 100%, xoay 360° | Nhãn Nắp, Đáy, Mặt trước trên mô hình | S6 |
| 5 | Xuất → Đặt in mẫu Minh Tâm Prolab 49k → VietQR → Giả lập thanh toán | Đơn `PAID` lưu CSDL, tải PDF CMYK 4 lớp sạch | S4, S5, S2 |
| 6 | Quét QR trên nắp | Trang 3D mở hộp kèm lời chúc | đã có |
| 7 | (dự phòng) Mở `/dashboard` | Số hộp, kiểu hộp, lỗi đã ngăn, thời gian tạo hộp tăng theo thao tác vừa làm | S7 |

## 6. Quy trình mỗi phiên

**Mở phiên** (dán vào cuộc trò chuyện mới):

```text
Tiếp tục kế hoạch Path 2 MVP: làm phiên S<n> theo docs/17_PATH2_MVP_PLAN.md.
```

1. Đọc §7 (nhật ký), mục phiên ở §4, §2 (quyết định, câu hỏi mở), phần docs/16 được dẫn; `git status`,
   `git log --oneline -10`.
2. Kiểm điều kiện bắt đầu (§3). Phiên trước dở dang → làm nốt trước. Câu hỏi mở trong cột "Cần trước" chưa có trả lời
   → dùng mặc định và ghi vào nhật ký.
3. Đọc skill liên quan trong `.agents/skills/` theo AGENTS.md §6 (backend: `insforge-backend-flow`; FitCheck:
   `fitcheck-validator`; giao diện: `wrapfit-design-system`; Gói: `ai-packaging-copilot`).

**Trong phiên**: thêm env mới vào `be/src/config/env.validation.ts`, `be/src/config/envs/default.ts`, `be/.env.example` và `.env.example`;
module mới theo `be/README.md` mục "Cấu trúc thư mục"; giao diện dùng `@/components/ui`, không viết chuỗi class nút / thẻ
mới.

**Đóng phiên** (kể cả khi chưa xong):

1. `npx tsc --noEmit` sạch ở các workspace đã sửa, unit test của phần đã sửa xanh, hoặc ghi rõ lỗi còn lại.
2. Commit phần chạy được trên nhánh phiên (không push). Phần dở để ở working tree, không commit, ghi vào nhật ký.
3. Thêm một dòng vào §7: phiên, ngày, nhánh, commit, đã xong, còn dở, quyết định mới, việc đầu tiên của phiên sau.

## 7. Nhật ký bàn giao

| Phiên | Ngày | Nhánh / commit | Đã xong | Còn dở / ghi chú cho phiên sau |
|---|---|---|---|---|
| Lập plan | 2026-10-29 | `feat/path2-mvp` | Đối chiếu tab IT với code (§1), lập plan S1–S8; plan được duyệt | Đợt 1 (S1, S3, S4, S7) khởi chạy song song, mỗi phiên một worktree tách từ `feat/path2-mvp` |
| S1 | 2026-10-29 | `claude/path2-s1-billing-9c418a` (commit "feat(billing): add billing core") | `shared/src/billing/` (`resolvePlan`, `EXPORT_PACKS`, `PRO_MONTH`, `ENTITLEMENTS`, `requiredPlanFor`); migration `20261030000100_billing_core`; `be/src/billing/` `BillingCoreModule` (API + worker), `GET /api/billing/me`, `POST /api/admin/users/:id/credits`; unit + `test/e2e/billing.e2e-spec.ts` xanh (debit song song 1 lượt, hết lượt 402, refund một lần); tsc sạch shared, be | Quyết định: `credit_debits` unique `(operation_id, lot_id)` (một lần trừ lấy được nhiều lô, theo docs/16) thay vì `operation_id` unique; `export_unlocks` không unique `(project, version)` để mở khóa lại sau 7 ngày, S2 tự khóa dòng dự án khi hai request cùng trừ; lô `ADMIN` không đổi gói; tier `STARTER`/`PRO_BUSINESS` gán tay (admin seed) được giữ khi chưa có `subscriptions`; `PlanService.sync` chạy lười trong `/billing/me` và `EntitlementsService.of`, không cron. Migration bù enum `PAY_PER_EXPORT`, `PDF_A4_PRINT` (có trong schema từ f27de76 nhưng thiếu migration, `IF NOT EXISTS`). Chưa nối hạn mức `storage.bytes` / `projects.max` / `collections.max` vào service cũ (`STORAGE_QUOTA_BYTES` còn Pro 1 GB). Phiên S2: `EntitlementsService.of` + `CreditsService.debit(userId, { reason: 'EXPORT_UNLOCK', operationId }, tx)` trong cùng transaction tạo `export_unlocks`; lỗi 402 dùng `insufficientCredits(balance)` |
| S3 | 2026-10-29 | `claude/path2-s3-ai-cost-4dea9e` (commit cuối của nhánh) | Env `AI_MODEL_FAST` (haiku) / `AI_MODEL_PREMIUM` (opus) / `AI_MONTHLY_BUDGET_USD`, `AI_MODEL` thành bí danh của `AI_MODEL_FAST`; `ai-pricing.ts` (`estimateCostUsd`, model lạ tính theo giá đắt nhất); `AiCostGuard` (tháng giờ VN, cache 5 phút, cộng ngay lượt mới, log `error`); `GET /ai/usage` có `budgetReached`; DTO `quality`, premium + Free → `403 PLAN_FEATURE_REQUIRED`; request tới Haiku không gửi `fallbacks` (Haiku không có fallback phía server); type FE thêm `quality?`, `budgetReached`. Unit + `ai.e2e-spec.ts` xanh | **Chưa có token thật**: máy không có `ANTHROPIC_API_KEY`, `ai_generations` trống. Ước tính một lượt haiku: ~1.000 token vào × $0,10 + ~800–2.500 token ra (JSON hình + thinking `low`) × $0,50 / 1 triệu ≈ $0,0005–0,0013 ≈ **13–34đ** (tỷ giá 26.000đ/USD). S8: đặt key, gọi `POST /api/ai/pattern` một lần, đọc `input_tokens`, `output_tokens` trong `ai_generations`, ghi số thật. S8 / VPS: **xóa `AI_MODEL` khỏi `.env`** (nếu còn `AI_MODEL=claude-opus-5-5`, bí danh giữ fast = opus), đặt `AI_MONTHLY_BUDGET_USD`. FE chưa có nút chọn `premium` (S6 nếu cần). Q4 dùng mặc định |
| S4 | 2026-10-29 | `claude/path2-s4-orders-a94a90` (commit S4) | Migration `20261030000300_orders` (`OrderStatus`, `orders` có `payment_id` chưa FK, `order_items` chụp tên / cấu trúc / kích thước / phiên bản, `order_status_history`, thêm `print_shop_members` gán tài khoản PRINT_SHOP vào xưởng). `OrdersService` dùng Prisma, mã `WF-<năm>-<4 số>`, chỉ chủ dự án đặt được (trước đây ai cũng đặt được trên dự án người khác), đơn mới `PENDING_PAYMENT`. Thêm `GET /orders` (ADMIN mọi xưởng, PRINT_SHOP xưởng mình) và `PATCH /orders/:id/status` (`order-status.ts`: xưởng chỉ in / gửi / giao, ADMIN thêm xác nhận thanh toán và hủy trước khi in; bước sai hoặc đơn vừa đổi → 409, xưởng khác → 404). FE bỏ đơn giả khi API lỗi (`DEMO_ORDERS` chỉ khi build tĩnh và không có backend); `/dashboard/orders`, `/dashboard/billing`, `/admin/print-shops` đọc đơn thật, admin có nút chuyển trạng thái. Unit 18 ca, `orders.e2e-spec.ts` 8 ca xanh; ảnh chụp 375 / 1440 | S5: gọi `OrdersService.transition(id, 'PENDING_PAYMENT', 'PAID', null)` khi thanh toán xong và thêm FK `orders.payment_id`. Chưa có giao diện / seed gán tài khoản PRINT_SHOP vào xưởng (`print_shop_members`, hiện chèn bằng SQL). Thử local: mỗi phiên dùng CSDL riêng (`wrapfit_s4`) và Redis db riêng (`/4`); script `shots` hay báo "Chrome did not start" vì Docker / Hyper-V giữ gần hết dải cổng 9300–9900, chạy lại vài lần |
| S7 | 2026-10-29 | `claude/path2-s7-analytics-8e9d5d` @ `440ac7b` | Bảng `product_events` (migration `20261030000700_product_events`, liên kết User / Project `SET NULL`); ghi `PROJECT_CREATED` (tạo, nhân bản, remix), `EXPORT_BLOCKED_FITCHECK` (422), `EXPORT_COMPLETED` (trong transaction của worker, kèm `exportJobId`); `POST /api/projects/:id/events` (chủ dự án, 10 lần/phút, nhịp cách nhau < 50 s tính một); `GET /api/analytics/summary` (`me` không cache, `global` cache 60 s); hook `useStudioHeartbeat` + `recordAutoFix` (logic bỏ nghỉ > 2 phút ở `shared/src/analytics`); khối "Số liệu thiết kế" trên `/dashboard`; unit (trung vị, bỏ khoảng nghỉ, ngày giờ VN), e2e `analytics.e2e-spec.ts` 7/7, toàn bộ unit BE 519 xanh; ảnh 375 / 1440 với dữ liệu thật (heartbeat và Auto-Fix bấm thật trong studio đã ghi sự kiện) | Script backfill đặt ở `be/prisma/scripts/backfill-product-events.ts` (theo quy ước `upgrade-formulas.ts`, lint phủ `prisma/**`), chạy `npm --workspace=be run db:backfill-events -- [--dry-run]` một lần sau migration. `watermarked` của `EXPORT_COMPLETED` đang luôn `false`: **S2** đặt giá trị thật trong `ExportProcessor`. Merge S7 trước S6 (`StudioWorkspace.tsx`: một import, một dòng hook, một lời gọi trong `handleAutoFix`). `shared/src/index.ts` thêm 2 dòng sau `fitcheck/validator` (S1 cũng sửa file này). Chạy thử: mỗi worktree nên dùng CSDL riêng (`wrapfit_s7`) và Redis db riêng (`REDIS_URL=redis://localhost:6379/7`), nếu không worker của phiên khác lấy mất job xuất file |
| Merge đợt 1 | 2026-10-29 | `feat/path2-mvp` (2acd7ee) | Merge S1, S3, S4, S7. Xung đột chỉ là thêm dòng (`schema.prisma`, `app.module.ts`, nhật ký); `prisma validate` hợp lệ, `tsc` sạch ở `shared`, `be`, `fe`; 566/566 unit `be` xanh; `be` lint sạch. Chưa chạy e2e trên bản gộp | Đợt 2: S2 và S6 song song, tách từ `feat/path2-mvp`. Chạy `npm --workspace=be run db:deploy` để áp 3 migration mới |
| S2 | 2026-10-29 → 30 | `claude/path2-s2-gating-d78e7c` (a4c5af8 watermark, 44cff74 gating, 848b6ad FE, commit cuối e2e + nhật ký) | **Watermark**: `shared/src/print/watermark.ts` (`watermarkPlacement`: tai dán dài nhất, thu 1 mm ngang / 6 mm hai đầu vì góc vát; không có tai dán thì dải 3 mm dưới mặt lớn nhất, lề an toàn 3 mm; `fitWatermark` 6 pt, nhỏ lại khi không vừa); `renderPdf({ watermarked })` vẽ chữ outline Inter 400 `#7C8BA1` trên lớp Artwork, bọc `/Span ActualText` để tìm / chép được chữ; `specLine` không đổi. **Gating** (`ExportService.request`, docs/16 §5.2 bước 3–7): `useCredit?`; Pro sạch; unlock còn hạn, chưa hoàn của `(project, version)` → sạch; `PDF_A4_PRINT` không dùng lượt → `watermarked`; còn lại `402 EXPORT_CREDIT_REQUIRED { balance }` (`exportCreditRequired` trong `billing.errors.ts`); `useCredit` → tạo `export_unlocks` + `CreditsService.debit` cùng transaction với `export_jobs`, khóa dòng `packaging_projects FOR UPDATE` (hai request song song chỉ trừ 1, e2e kiểm), hết lượt → `402 INSUFFICIENT_CREDITS`; trả `watermarked`, `charged`, `exportCredits.balance`; `GET /exports/:id` có `watermarked`. Thêm `GET /projects/:id/exports/access` (`mode`, `unlocked`, `unlockExpiresAt`, `balance`) cho dialog. **Hoàn lượt** (`ExportCreditRefunds`, docs/16 §5.3): lần thử cuối của worker, `ExportReconcileTask` (worker chết) và lỗi đẩy hàng đợi; chỉ khi unlock không còn job `COMPLETED / PENDING / PROCESSING`, đánh dấu `refunded_at` trước nên hoàn một lần. Worker ghi `watermarked` thật vào `EXPORT_COMPLETED`. **FE** `ExportDialog`: nhãn "Có watermark" (PDF A4) / "Cần 1 lượt xuất" khi chưa mở khóa; 402 → khung "Dùng 1 lượt? Còn N lượt" (gửi lại `useCredit`) hoặc "Bạn đã hết lượt xuất" với "Mua lượt" (`/pricing`) và "Xuất PDF A4 có watermark"; toast sau khi trừ lượt; `requestExport` không còn biến mọi lỗi thành job giả. Kiểm: unit 590/590 (`export.service.spec.ts` 11 ca, `export-credits.spec.ts`, processor, reconcile, 6 ca watermark), e2e 179/179 toàn bộ 14 suite (export thêm 4 ca: PDF A4 thật có chữ watermark mọi điểm nằm trong tai dán, 402 hai mã, trừ lại sau khi sửa, 404 người khác), tsc sạch `shared` `be` `fe`, lint `be` sạch | Quyết định: ca "403 không phải chủ dự án" giữ **404** (`ProjectOwnerGuard` giấu dự án của người khác), e2e ghi rõ. e2e `analytics` của S7 xuất SVG bằng tài khoản Free → cho `ana` tier `STARTER`; hook `afterAll` của export / analytics nâng timeout 30 s (`worker.close()` mất ~8 s). Test reset throttler (10 lượt/phút/IP) bằng `storage` + `hitExpirations`. **S5**: thay `ButtonLink href="/pricing"` trong khung hết lượt bằng checkout VietQR (`EXPORT_PACKS`), sau khi mua gọi lại `start(fileType, true)`. Chưa làm: chụp `shots` của dialog (cần đăng nhập và mở studio); `getExportJob` / `listProjectExports` vẫn trả dữ liệu giả khi lỗi (ngoài phạm vi). Worker render nội dung dự án lúc chạy job, không phải lúc trả lượt: sửa thiết kế trong vài giây giữa request và render thì file sạch là bản mới (khe nhỏ, ghi để S8 cân nhắc khóa `version` vào job). Chạy e2e local: CSDL `wrapfit_s2` (role `wrapfit_s2`, cổng 55432), `REDIS_URL=redis://localhost:6379/2`, `STORAGE_PORT=18333`, `npx prisma db seed` trước |
| S6 | 2026-10-30 | `claude/path2-s6-pricing-ui-1e0e8e` (a65595c, f692c8e, 62d110e, c094228) | (1) `features/pricing/plans.ts` thành lớp hiển thị đọc `@wrapfit/shared/billing`; `/pricing` 4 thẻ (Miễn phí, Lượt xuất chọn 1 / 5 / 15 lượt, Pro 99k, Business "Liên hệ") + bảng so sánh (Free chỉ PDF A4 có watermark ở tai dán) + FAQ; bỏ giá theo năm ở trang giá, checkout (`?plan=&pack=`, chỉ bán Lượt xuất và Pro), dashboard billing, admin revenue / ledger; tên mới ở `TIER_LABELS`, home, support, legal, features, affiliate; xóa `PlanCards.tsx`; `storage.rules.ts` đọc `ENTITLEMENTS.storage.bytes` (Pro 2 GB, Business 20 GB). (2) `usesLockBottom` / `LOCK_BOTTOM_MIN_WEIGHT_G` trong `tuck-top.ts`; ô "Khối lượng quà (g)" ở Step 2 (chỉ hộp nắp gài) với chip "Đáy khóa FEFCO 0215" và nút "Dùng đáy gài thường"; `/editor/new` hết giữ `lock` khi giảm khối lượng, thêm nút "Đáy gài thường"; DTO dự án nhận `giftWeight`, `bottomType` (trước đây API trả 400 vì `forbidNonWhitelisted`). (3) Nhãn mặt trên mô hình 3D (tên mặt từ công thức, bỏ phần tiếng Anh, ẩn khi bị mặt khác che), nút "Nhãn mặt" ở dock, mặc định bật khi gập ≥ 80%; bật ở studio chính và Step 2, 3, 5, 6. (4) Dòng thông số sang lớp `Artwork`, 6 pt, đỉnh chữ cách nét cắt ≥ 5 mm, ở renderer backend (PDF, SVG) và offline FE; lớp `Dimensions` giữ các vạch kích thước. (5) Unit: Auto-Fix chỉ dời phần tử lỗi, đáy khóa theo khối lượng, dòng thông số trên `Artwork`. tsc sạch `fe`, `be`; 569/569 unit `be` xanh; ảnh `/pricing` 375 / 1440 và ảnh studio (nhãn mặt, 350 g) trong `fe/.page-shots` | `shots` chỉ báo lỗi request 401 / 500 (khách, hoặc chưa chạy backend); không lỗi bố cục. Chưa có test tự động cho renderer offline FE (fe không có test runner). Merge với S2: `print-renderers.ts` chỉ đổi `specLine` (hằng `SPEC_LINE_*`, vị trí `info`, 2 chỗ vẽ trong SVG / PDF); có thể xung đột dòng ở cuối lớp `Artwork` nếu S2 vẽ watermark ở đó. Checkout chỉ bỏ giá theo năm và thêm `pack`; S5 làm VietQR trên nền này. Thử local: worktree dùng CSDL `wrapfit_s6`, Redis `/6` |
| Merge đợt 2 | 2026-10-30 | `feat/path2-mvp` (2856e1b) | Merge S2, S6. Xung đột: `print-renderers.ts` (giữ cả watermark của S2 và dòng kích thước của S6, cùng lớp `Artwork`) và nhật ký. `tsc` sạch ở `shared`, `be`, `fe`; 593/593 unit `be` xanh; `be` lint sạch. Chưa chạy e2e trên bản gộp, chưa chụp `ExportDialog` | S5 VietQR: thay nút "Mua lượt" tạm (dẫn `/pricing`) của S2 bằng checkout |
| S5 | 2026-10-30 | `claude/path2-s5-vietqr-2d9c51` (9410279 backend, 2665005 FE, commit cuối nhật ký) | **Backend** `be/src/payments/`: `POST /payments` (`EXPORT_1/5/15`, `PRO_MONTH`, `SAMPLE_ORDER` + `orderId`; giá chụp vào `metadata`; `reference` `WF` + 6 ký tự bỏ O/0/I/1, thử lại khi trùng; hạn 15 phút; mở lại checkout của cùng đơn in trả lại thanh toán đang chờ), `GET /payments/:id` (chủ thanh toán, quá hạn → `EXPIRED`, `vietqr` chỉ có khi `PENDING`), `POST /payments/:id/simulate-confirm` (chỉ khi `PAYMENT_SIMULATION=true`, ngược lại 404; khóa dòng `payments FOR UPDATE` rồi `PAID` + cấp lô `PURCHASE` 12 tháng / tạo hoặc nối thêm 30 ngày `subscriptions` Pro / `OrdersService.markPaid` trong cùng transaction, rồi `PlanService.sync`; gọi lại hoặc gọi song song chỉ cấp một lần; hết hạn → 409 `PAYMENT_EXPIRED`). `vietqr.ts`: payload EMVCo (00, 01=12, tag 38 `A000000727` + BIN + số TK + `QRIBFTTA`, 53=704, 54, 58=VN, 62.08 = reference, CRC-16/CCITT-FALSE), QR SVG bằng `qrcode` mức M. Env `PAYMENT_SIMULATION` (mặc định `false`), `VIETQR_BANK_BIN/ACCOUNT_NO/ACCOUNT_NAME` (đặt cùng nhau; trống → tài khoản mẫu Vietcombank `0000000000` `WRAPFIT MO PHONG`, FE ghi "Mô phỏng"); `/billing/me` thêm `paymentSimulation`. Migration `20261030000500_payments`: FK `orders.payment_id`. **FE** `features/payments/CheckoutDialog` (QR dạng `<img>`, số tiền, ngân hàng, số TK và nội dung có nút chép, đồng hồ 15 phút, hỏi 3 giây, nút "Giả lập đã thanh toán", Gói `celebration`; render qua portal); nối từ khung hết lượt của `ExportDialog` ("Mua 1 lượt · 19k" → trả xong "Xuất SVG ngay" gọi lại `start(fileType, true)`), CTA trang giá (đã đăng nhập), `/dashboard/billing` (Nâng lên Pro / Gia hạn, Mua 5 lượt, số lượt còn lại, ngày hết Pro), `/checkout/step-3`, `/cart` (đặt xong mở checkout đơn 49k) và nút "Thanh toán" ở đơn chờ thanh toán của `/dashboard/orders`. `page-shots` dùng cổng DevTools 0. Kiểm: unit 605/605 (`vietqr.spec.ts` có giá trị kiểm CRC `123456789` → `29B1`), e2e 187/187 toàn bộ 15 suite (`payments.e2e-spec.ts` 8 ca: payload, 400/404, xác nhận song song cấp 1 lô, Pro nối 60 ngày, đơn in `PAID` + lịch sử, hết hạn, luồng Free 402 → mua → SVG sạch `charged`, app thứ hai `PAYMENT_SIMULATION=false` → 404), tsc sạch `be` `fe`, lint `be`, `tokens:check`. Luồng FE chạy thật bằng `page-shots` (375 / 1440): Free SVG → 402 → Mua 1 lượt → QR → giả lập → SVG `watermarked=false`; giỏ in mẫu → QR 49.000đ → giả lập → đơn `PAID` trong `/dashboard/orders` | **Chưa quét QR bằng app ngân hàng thật** (cần điện thoại): S8 / người dùng quét mã trong `CheckoutDialog`, ghi kết quả (app nào đọc được tên ngân hàng, số tiền, nội dung). Q1 vẫn dùng mặc định (tài khoản mẫu). Bản demo CP4: đặt `PAYMENT_SIMULATION=true` trên VPS (compose đã truyền biến). Thanh toán `PENDING` cũ chỉ đổi `EXPIRED` khi có người hỏi (không cron), đủ cho demo. Chưa làm: hủy thanh toán (`CANCELLED` chưa dùng), webhook ngân hàng (M1). `e2e-env.ts` bật `PAYMENT_SIMULATION=true` cho mọi suite. Lint FE (`next lint`) chưa cấu hình, không chạy được. Thử local: CSDL `wrapfit_s5`, Redis `/5` |
| Merge S5 | 2026-10-30 | `feat/path2-mvp` (ea22507) | Merge S5, không xung đột. `tsc` sạch ở `shared`, `be`, `fe`; 605/605 unit `be` xanh; `be` lint sạch | S8. Q2, Q3 chưa trả lời: S8 làm phần local, soạn hướng dẫn deploy; bước cần đăng nhập Vercel / VPS để người dùng tự làm |

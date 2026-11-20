# 🌐 THIẾT KẾ GIAO DIỆN LẬP TRÌNH ỨNG DỤNG (API DESIGN)

> **Base URL (Local)**: `http://localhost:8080/api`  
> **Hướng dẫn tích hợp cho Frontend** (luồng, mã lỗi, kiểu dữ liệu, chỗ FE đang lệch): [`06_FE_INTEGRATION_GUIDE.md`](06_FE_INTEGRATION_GUIDE.md).  
> **Tài liệu tương tác (Swagger)**: `http://localhost:8080/api/docs` — luôn khớp với code đang chạy.  
> **Toàn bộ danh sách endpoint theo kế hoạch** (kèm Controller, quyền truy cập, Milestone): [`07_SYSTEM_BLUEPRINT_AND_TASK_BREAKDOWN.md`, Mục 4.2 – 4.3](07_SYSTEM_BLUEPRINT_AND_TASK_BREAKDOWN.md).  
> **Bảng dữ liệu** mà các endpoint đọc / ghi: [`02_DATABASE_DESIGN.md`](02_DATABASE_DESIGN.md).  
> **Đối chiếu gần nhất**: 2026-11-19, 113 route trong `be/src/**/*.controller.ts`, tất cả đều có ở bảng mục 2.

---

## 1. Quy ước chung

- Mặc định **mọi route đều yêu cầu đăng nhập**. Route công khai được đánh dấu `@Public()` trong code.
- Xác thực bằng **HttpOnly Cookie** `wf_access` (path `/api`, 15 phút) và `wf_refresh` (path `/api/auth`, 7 ngày), `SameSite=Lax`. Ở production, cookie mang tiền tố `__Secure-` (`__Secure-wf_access`, `__Secure-wf_refresh`); server vẫn đọc tên cũ để phiên đang mở không bị đăng xuất. `logout` gửi thêm header `Clear-Site-Data: "cookies"`. Token không bao giờ xuất hiện trong body. FE gọi thẳng cổng 8080 phải dùng `fetch(..., { credentials: 'include' })`. Chi tiết: [`be/README.md`](../be/README.md#xác-thực-bằng-httponly-cookie).
- **Body chỉ nhận trường đã khai báo**: `ValidationPipe` toàn cục bật `whitelist` và `forbidNonWhitelisted`. Gửi một trường lạ (ví dụ `useCredit` khi xuất file, `promoCode` khi đặt in) → `400 property … should not exist`, không bị bỏ qua lặng lẽ.
- Phân trang theo trang: `?page=1&limit=20` → `{ "items": [...], "meta": { "total", "page", "limit", "totalPages" } }`. Phân trang theo con trỏ (lịch sử xu, thanh toán, giao dịch ngân hàng, thông báo, ảnh AI): `?before=<nextBefore>&limit=` → `{ …, nextBefore }`. Con trỏ là `(createdAt, id)`, nên hai dòng cùng mili giây không bị bỏ sót ở ranh giới trang.
- Định dạng lỗi thống nhất. Lỗi nghiệp vụ có thêm `code` (ví dụ `ORDER_PAYMENT_REQUIRED`) và có thể có trường bổ sung (`fitCheck`, `balance`, `cost`…). FE luôn kiểm `code` trước khi dựa vào mã HTTP:

```json
{ "statusCode": 401, "error": "Unauthorized", "message": "Unauthorized", "path": "/api/users/me", "timestamp": "2026-10-02T00:00:00.000Z" }
```

---

## 2. Endpoints đã triển khai

Trạng thái chung của bảng: có mã trên `develop`; đã kiểm bằng E2E backend ngày 2026-11-19 (318/318 ca, 24 bộ trong `be/test/e2e/`). Mỗi mục bên dưới ghi bộ E2E tương ứng.

| Method | Đường dẫn | Quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | Trạng thái server: `{ status, database, redis, worker }`. Chỉ `503` khi CSDL sập; Redis sập → `degraded` (mọi thứ chạy trừ xuất file in) |
| `GET` | `/api/health/details` | ADMIN | Như trên, thêm kích thước hàng đợi xuất file và thời gian chạy |
| `POST` | `/api/auth/register` | Public | Đăng ký (`email`, `password`, `fullName`) → luôn `201 { email, emailVerificationRequired: true }`, kể cả khi email đã có tài khoản (không lộ email nào đã đăng ký). **Không** đặt cookie: chưa xác minh email thì chưa đăng nhập được. FE luôn hiện "Kiểm tra hộp thư" |
| `POST` | `/api/auth/login` | Public | Đăng nhập bằng email & mật khẩu → đặt cookie đăng nhập; email chưa xác minh → `403 code EMAIL_NOT_VERIFIED` |
| `POST` | `/api/auth/verify-email` | Public | `{ token }` (giá trị `?token=` trong link email) → `200 { verified: true }`; mở lại link lần hai vẫn `200`. Lỗi `400 code AUTH_TOKEN_INVALID \| AUTH_TOKEN_EXPIRED` |
| `POST` | `/api/auth/verify-email/resend` | Public | `{ email }` → luôn `202 {}` (không lộ email nào có tài khoản) |
| `POST` | `/api/auth/password/forgot` | Public | `{ email }` → luôn `202 {}`; gửi link đặt lại mật khẩu (30 phút) |
| `POST` | `/api/auth/password/reset` | Public | `{ token, password }` (link đặt lại mật khẩu **hoặc** link hoàn tất đăng ký) → `200 {}`, thu hồi mọi phiên, xóa cookie; rồi đăng nhập lại. Lỗi `400 code AUTH_TOKEN_INVALID \| AUTH_TOKEN_EXPIRED \| AUTH_TOKEN_CONSUMED` |
| `POST` | `/api/auth/refresh` | Public (cookie `wf_refresh`) | Xoay vòng refresh token, cấp access token mới. Giới hạn theo phiên: 30 / phút cho một cookie, 300 / phút / IP khi không có cookie; `429` không làm hết phiên |
| `POST` | `/api/auth/logout` | Public | Thu hồi phiên hiện tại, xoá cookie |
| `GET` | `/api/auth/google?redirect=/p/abc` | Public | Bắt đầu đăng nhập Google (điều hướng trình duyệt) |
| `GET` | `/api/auth/google/callback` | Public | Google gọi lại → đặt cookie → chuyển về frontend |
| `POST` | `/api/auth/logout-all` | Đã đăng nhập | Đăng xuất mọi thiết bị |
| `GET` | `/api/auth/me` | Đã đăng nhập | Người dùng hiện tại (giống `GET /api/users/me`); `401` → gọi `/api/auth/refresh` |
| `GET` · `PATCH` | `/api/users/me` | Đã đăng nhập | Xem / sửa hồ sơ (`fullName`, `shopName`, `avatarUrl`: ảnh mình đã tải lên, `null` = xóa) |
| `PATCH` | `/api/users/me/brand-kit` | Đã đăng nhập | Lưu Brand Kit (UC-02) `{ logoUrl?` (logo mình đã tải lên)`, colors: 3–5 màu #RRGGBB, fonts?: ≤ 3, slogan? }` — thay cả bộ, trường bỏ trống bị xóa; trả hồ sơ kèm `brandKit` |
| `GET` | `/api/users` · `/api/users/:id` | ADMIN | Danh sách (phân trang) / chi tiết người dùng |
| `PATCH` | `/api/users/:id` | ADMIN | Đổi role, khóa/mở khóa, bật / tắt cờ `isDemo` (tài khoản demo thanh toán qua VNPay sandbox, xem "Gói, xu và thanh toán"). Tài khoản đã ẩn danh hóa → `409 USER_ANONYMIZED`. Mọi payload người dùng (`/auth/me`, `/users/me`, `/users`, `/users/:id`) có thêm `isDemo` |
| `DELETE` | `/api/users/:id` | ADMIN | Xóa người dùng → `200 { id, result: "DELETED" \| "ANONYMIZED" }`. Không có lịch sử tiền: xóa cứng tài khoản, dự án, file. Có thanh toán, đơn, lô xu đã mua, thuê bao hoặc giao dịch đã đối soát: **ẩn danh hóa** (giữ chứng từ và thiết kế của đơn chưa hủy, xóa mọi thông tin nhận diện, không đăng nhập lại được). Gọi lại là no-op |
| `POST` | `/api/projects` | Đã đăng nhập | Tạo dự án từ mẫu hộp (`templateId`, `title`, `dimensions`, tùy chọn `materialSpec`, `canvasState`, `collectionId`, `tags`) |
| `GET` | `/api/projects?status=ACTIVE&templateId=…&collectionId=…&q=…&sortBy=updatedAt&order=desc&page=1&limit=20` | Đã đăng nhập | Dự án của tôi (không kèm `canvasState`, có `materialSpec` và `fitcheckScore` cho thẻ Dashboard). `templateId` = cấu trúc hộp; `collectionId=none` = chưa thuộc thư mục nào; `q` tìm trong tiêu đề hoặc đúng 1 tag |
| `GET` · `PATCH` | `/api/projects/:id` | Chủ dự án | Xem đầy đủ / sửa `title`, `dimensions`, `materialSpec`, `canvasState`, `collectionId`, `thumbnailUrl`, `tags`. Chỉ đổi nội dung thiết kế mới tăng `version` (xem "Dự án: quy tắc chính") |
| `DELETE` | `/api/projects/:id` | Chủ dự án | Xóa vĩnh viễn — chỉ khi dự án đang ở thùng rác (`status = DELETED`), nếu không trả `409`. Dự án nằm trong đơn in còn giữ thiết kế → `409 PROJECT_IN_ACTIVE_ORDER` (xem "Giới hạn xóa dự án") |
| `PATCH` | `/api/projects/:id/status` | Chủ dự án | `{ "status": "ARCHIVED" \| "DELETED" \| "ACTIVE" }` — lưu trữ / chuyển vào thùng rác / khôi phục |
| `POST` | `/api/projects/:id/duplicate` | Chủ dự án | Nhân bản thành dự án mới `[Bản sao] <tên>` (201) |
| `POST` | `/api/projects/:id/formula-upgrade` | Chủ dự án | `{ "version" }` — đưa dự án lên công thức dieline hiện tại của cấu trúc (`latestFormulaVersion` trong `ProjectDetail`): lưu mốc tự động giữ phiên bản cũ, đổi `formulaVersion`, chạy lại FitCheck → `{ project, backup }` (đã mới nhất: `backup = null`). `409` khi trong thùng rác, `409 PROJECT_VERSION_CONFLICT` khi `version` cũ |
| `GET` · `POST` | `/api/projects/:id/snapshots` | Chủ dự án | Lịch sử phiên bản (mới nhất trước, không kèm canvas) / lưu mốc `{ "name", "previewUrl"? }` |
| `POST` | `/api/projects/:id/snapshots/:snapshotId/restore` | Chủ dự án | Khôi phục mốc → `{ project, backup }`. Mốc có `formulaVersion` thì dự án về phiên bản công thức đó (hoàn tác cập nhật công thức); mốc cũ (`null`) giữ phiên bản hiện tại. Bản sao lưu `backup` chứa đúng nội dung vừa bị ghi đè, kể cả một lần tự lưu chen vào giữa |
| `DELETE` | `/api/projects/:id/snapshots/:snapshotId` | Chủ dự án | Xóa một mốc (204) |
| `PATCH` | `/api/projects/:id/visibility` | Chủ dự án | `{ "visibility"?: "PRIVATE" \| "UNLISTED" \| "PUBLIC", "allowFork"?: boolean }` — chia sẻ & cho phép Remix |
| `POST` | `/api/projects/:id/events` | Chủ dự án | `{ type: "AUTO_FIX_APPLIED", fixed }` hoặc `{ type: "STUDIO_ACTIVE", seconds ≤ 60 }` (nhịp studio); 10 lần / phút |
| `GET` | `/api/public/projects/:slug` | Public (nhận diện người xem nếu có cookie) | Trang xem 3D `/p/[slug]` / iframe nhúng; tăng `viewsCount` |
| `POST` | `/api/public/projects/:slug/fork` | Đã đăng nhập | Remix về tài khoản của tôi (201, trả dự án mới) |
| `POST` · `DELETE` | `/api/public/projects/:slug/like` | Đã đăng nhập | Thả tim / bỏ thả tim → `{ liked, likesCount }` |
| `GET` | `/api/projects/:id/review` | Chủ dự án | Trạng thái duyệt mẫu: `{ token, approval, comments }` (xem "Duyệt mẫu theo link") |
| `POST` · `DELETE` | `/api/projects/:id/review/link` | Chủ dự án | Tạo hoặc đổi link duyệt (`200`, link cũ hết hiệu lực, giữ lần duyệt; 10 / phút) / tắt link (giữ lần duyệt) → `ReviewState` |
| `POST` | `/api/projects/:id/review/comments` | Chủ dự án | Góp ý / trả lời của chủ dự án `{ body, panelId?, x?, y? }` (30 / phút) |
| `PATCH` · `DELETE` | `/api/projects/:id/review/comments/:commentId` | Chủ dự án | `{ resolved: boolean }` đánh dấu đã xử lý / mở lại; xóa (204) |
| `GET` | `/api/review/:token` | Public | Thiết kế để duyệt (bản đã lưu), góp ý, trạng thái duyệt; `404` khi link lạ, đã tắt hoặc dự án trong thùng rác (60 / phút) |
| `POST` | `/api/review/:token/comments` | Public | Góp ý của khách `{ authorName, body, panelId?, x?, y? }` (10 / phút) |
| `POST` | `/api/review/:token/approve` | Public | "Duyệt in" `{ name, version }` → `200 approval`; phiên bản lệch → `409 DESIGN_CHANGED` (5 / phút) |
| `GET` | `/api/templates/structures` | Public | Các cấu trúc hộp đang bật (`box_templates.is_active`; seed hiện có 11 cấu trúc trong DB) + `dimensionLimits` (min/max từng kích thước) |
| `GET` | `/api/templates/hub?section=curated&structure=&occasion=&industry=&material=&q=&page=&limit=` | Public | Thư viện mẫu: `curated` (mẫu WrapFit) hoặc `community` (dự án PUBLIC, nhiều tim trước), phân trang |
| `GET` | `/api/templates/:id` | Public | Mẫu Curated kèm `canvasState` + `dimensionLimits` để "Dùng mẫu này" |
| `GET` | `/api/library/assets?category=&occasion=&q=&page=&limit=` | Public | Tài nguyên thư viện đang bật (tem, nhãn, hình minh họa, nền, biểu tượng) |
| `GET` | `/api/library/licenses` | Public | Các giấy phép được nhận khi nhập tài nguyên |
| `GET` | `/api/library/assets/manage` | ADMIN | Mọi tài nguyên, kể cả đang ẩn |
| `POST` | `/api/library/assets` | ADMIN | Nhập một file mình đã tải lên (`LOGO` / `IMAGE`) vào thư viện. Từ chối `400 ATTRIBUTION_REQUIRED` (giấy phép cần ghi nguồn mà thiếu), `400 LIBRARY_FILE_REFUSED` (SVG không an toàn, ảnh không đủ điểm ảnh để in 50 mm ở 300 DPI) |
| `PATCH` | `/api/library/assets/:id` | ADMIN | Sửa hoặc ẩn (`isActive: false`) một tài nguyên |
| `GET` | `/api/library/stock/photos?q=&page=` | Đã đăng nhập | Tìm ảnh kho Pexels qua backend. Chưa có `PEXELS_API_KEY` → `{ enabled: false, items: [] }`; Pexels lỗi → `502 STOCK_PROVIDER_ERROR`; vượt hạn mức → `429 STOCK_RATE_LIMITED` (kèm `Retry-After`). Kết quả cache 10 phút (trang chọn lọc 1 giờ); 30 / phút |
| `POST` | `/api/library/stock/photos/:id/import` | Đã đăng nhập | Chép ảnh kho thành một file `IMAGE` của mình, trả kèm dòng ghi nguồn. `403` khi đầy bộ nhớ, `422 STOCK_PHOTO_TOO_LARGE` khi trên 60 MB, `429 STOCK_RATE_LIMITED`, `503 STOCK_UNAVAILABLE` khi chưa có khóa; 10 / phút |
| `POST` | `/api/storage/presigned-upload` | Đã đăng nhập | `{ purpose, contentType, size, projectId? }` → `{ uploadUrl, headers, fileUrl, ... }` để FE upload thẳng lên S3 / R2; 30 / phút |
| `POST` | `/api/storage/fonts/inspect` | Đã đăng nhập | `{ url }` của một phông mình đã tải lên (`purpose: FONT`) → tên họ phông. Phông không đọc được → `422 FONT_UNREADABLE`; thiếu chữ tiếng Việt → `422 FONT_NO_VIETNAMESE` kèm các chữ thiếu; 30 / phút |
| `GET` | `/api/storage/usage` | Đã đăng nhập | `{ tier, usedBytes, quotaBytes, fileCount }` |
| `POST` | `/api/ai/pattern` | Đã đăng nhập | `{ theme, preferredColors?, quality? }` → `{ source, themeName, description, palette, tile: { size, svg }, usage: { charged, balance } \| null }`; thiếu xu → `402 INSUFFICIENT_CREDITS { kind: "XU", balance, cost }` |
| `GET` | `/api/ai/usage` | Đã đăng nhập | `{ aiEnabled, budgetReached, patternCost: { fast, premium }, xu: { balance, allowance } }` — giá hoa văn theo xu và ví xu |
| `GET` | `/api/ai/models` | Đã đăng nhập | `{ enabled, models: [{ key, label, tier, xu, output, supportsText, aspectRatios, maxImages, summary }], tools: { upscale, "remove-bg", vectorize } }` — model ảnh AI đang bán và giá xu |
| `POST` | `/api/ai/images` | Đã đăng nhập | `{ prompt, modelKey, aspectRatio, numImages?, allowText?, clientRequestId? }` → `202 { job, balance }`; lỗi xem "Xu Wrap và ảnh AI"; 5 / phút |
| `GET` | `/api/ai/images/jobs/:id` | Chủ job | `{ id, kind, modelKey, status, prompt, aspectRatio, numImages, xuCost, error, createdAt, completedAt, outputs: [{ id, url, contentType, width, height, keepUntil, createdAt }] }` — FE hỏi mỗi 2 giây |
| `GET` | `/api/ai/images?before=&limit=` | Đã đăng nhập | "Ảnh AI của tôi": `{ items, nextBefore }`, mới nhất trước (`limit` 1–60, mặc định 30), ảnh chưa dùng giữ 30 ngày |
| `POST` | `/api/ai/images/:outputId/upscale\|remove-bg\|vectorize` | Chủ ảnh | Công cụ trên một ảnh AI `{ clientRequestId? }` → `202 { job, balance }`; 20 / 5 / 10 xu; 5 / phút |
| `POST` | `/api/ai/images/uploads/upscale\|remove-bg\|vectorize` | Đã đăng nhập | Công cụ trên một ảnh mình đã tải lên `{ content, clientRequestId? }` (`content` = URL hoặc key của ảnh PNG / JPEG / WebP) → `202 { job, balance }`; cùng giá xu; 5 / phút |
| `GET` | `/api/billing/me` | Đã đăng nhập | `{ tier, entitlements, xu: { balance, lots, allowance }, subscription, paymentSimulation, isDemo }`. `paymentSimulation` = máy chủ bật giả lập **và** (tài khoản demo **hoặc** máy chủ chưa có `VIETQR_*`): FE hiện nút "Giả lập đã thanh toán" theo cờ này. `isDemo`: tài khoản trả qua VNPay sandbox (FE chọn phương thức nạp và nhãn "Cách trả" của hóa đơn theo cờ này) |
| `GET` · `PUT` | `/api/billing/details` | Đã đăng nhập | Thông tin xuất hóa đơn VAT `{ company, taxCode, email }` (chuỗi rỗng khi chưa điền) / lưu (cả ba trường rỗng = xóa). Lúc tạo thanh toán, bản hiện tại được chụp vào thanh toán |
| `GET` | `/api/billing/xu/history?before=&limit=&type=&from=&to=` | Đã đăng nhập | Lịch sử xu (`type`: `grant` nạp / cấp, `spend` chi tiêu, `adjust` admin điều chỉnh, bỏ trống = tất cả; `from` / `to`: ISO 8601, gồm cả hai đầu; `nextBefore` giữ nguyên khi lọc) `{ entries: [{ type: "GRANT" \| "SPEND", quantity, source, reason, refundedAt, expiresAt, createdAt }], nextBefore }` |
| `POST` | `/api/admin/users/:id/credits` | ADMIN | Cấp xu tay `{ quantity, kind?: "XU", expiresInDays?, note? }` (lô `ADMIN`, vd. tài khoản demo). `kind: "EXPORT"` → `400` (lượt xuất đã ngừng); tài khoản đã ẩn danh → `409 USER_ANONYMIZED` |
| `GET` | `/api/admin/analytics/xu?month=yyyy-mm` | ADMIN | Báo cáo xu của tháng: phát theo nguồn, đã tiêu, đã hoàn, doanh thu ghi nhận, hết hạn, xu bán chưa tiêu, chi phí model, biên gộp |
| `POST` | `/api/projects/:id/exports` | Chủ dự án | `{ fileType: "PDF_CMYK" \| "PDF_A4_PRINT" \| "SVG" \| "DXF" \| "PRINT_PACKAGE" }` → `202 { jobId, status, fitCheck }`; FitCheck có lỗi → `422`; chưa có quyền → `402 ORDER_PAYMENT_REQUIRED`; gửi thêm `useCredit` → `400` (xem "Xuất file in"); 10 / phút |
| `GET` | `/api/projects/:id/exports` | Chủ dự án | 20 lần xuất gần nhất |
| `GET` | `/api/projects/:id/exports/access` | Chủ dự án | `{ unlocked, unlockExpiresAt }`: phiên bản thiết kế hiện tại đã có quyền xuất chưa. `unlockExpiresAt` chỉ khác `null` khi quyền đến từ một lần mở khóa cũ còn hạn |
| `GET` | `/api/exports/:jobId` | Chủ dự án | `{ id, projectId, fileType, status, watermarked, error, createdAt, completedAt, fileName, downloadUrl, downloadExpiresIn }` — link tải hết hạn sau 15 phút. `watermarked` luôn `false` với job mới |
| `POST` | `/api/payments` | Đã đăng nhập | `{ purpose, termsVersion, orderId?, xu? }` → `201 PaymentView` (xem "Gói, xu và thanh toán"); 20 / phút |
| `GET` | `/api/payments?before=&limit=` | Đã đăng nhập | Lịch sử thanh toán của tôi, mới nhất trước (`limit` tối đa 50) `{ entries, nextBefore }`; mỗi dòng là `PaymentView` không kèm `vietqr` / `vnpay`. Thanh toán `PENDING` đã quá hạn hiện là `EXPIRED` |
| `GET` | `/api/payments/:id` | Chủ thanh toán | Trạng thái (FE hỏi mỗi 3 giây); quá hạn 15 phút → `EXPIRED`; `vietqr` chỉ có khi `PENDING`; `confirmedVia` (`SEPAY_WEBHOOK` \| `VNPAY_IPN` \| `VNPAY_RETURN` \| `SIMULATION` \| `ADMIN`) khi `PAID` |
| `POST` | `/api/payments/:id/simulate-confirm` | Chủ thanh toán | Giả lập đã thanh toán. Chỉ khi `PAYMENT_SIMULATION=true` (ngược lại `404`). Điều kiện theo loại tài khoản xem "Cổng thanh toán và giả lập". `PAID` + cấp quyền lợi trong một transaction; gọi lại không cấp thêm; hết hạn → `409 PAYMENT_EXPIRED`; đơn in đã hủy → `409 ORDER_NOT_PAYABLE` |
| `POST` | `/api/payments/:id/simulate-transfer` | Chủ thanh toán | Giả lập ngân hàng báo tiền về qua đúng đường webhook SePay `{ scenario?: "exact" \| "underpaid" \| "no_reference" }` (mặc định `exact`). Cùng điều kiện với `simulate-confirm`; thanh toán không phải VietQR → `400 NOT_VIETQR`. Giao dịch giả hiện ở trang admin đối soát và tự xóa sau 30 phút; 20 / phút |
| `POST` | `/api/webhooks/sepay` | Public, header `Authorization: Apikey <SEPAY_WEBHOOK_API_KEY>` (chấp nhận cả `Bearer`) | SePay báo tiền vào tài khoản ngân hàng. Thân `unknown` (chấp nhận trường lạ), tối đa 64 KB (`413`), 120 / phút. Sai / thiếu key → `401`; thân hỏng → `400`; `transferType` khác `in` hoặc số tiền ≤ 0 → `200` không lưu. Mỗi giao dịch (khóa `id` của SePay) lưu một dòng `bank_transactions`, gửi lại chỉ trả `200`. Cách khớp xem "Đối soát chuyển khoản". Luôn `200 { success: true }` khi đã lưu |
| `GET` | `/api/payments/vnpay/ipn` | Public, chữ ký `vnp_SecureHash` | VNPay gọi bằng `GET` (ngoại lệ có chủ đích của quy ước "GET không đổi trạng thái"), 120 / phút. Luôn `HTTP 200 { RspCode, Message }`: `00` thành công (`PAID`, `confirmedVia: VNPAY_IPN`), `02` đã xác nhận trước đó, `01` không có thanh toán (hoặc không phải `VNPAY`), `04` sai số tiền (`vnp_Amount` = `amountVnd × 100`), `97` sai chữ ký, `99` lỗi khác |
| `GET` | `/api/payments/vnpay/return` | Chủ thanh toán | Trang FE `/payments/vnpay-return` gọi với nguyên query `vnp_*` VNPay gắn vào `VNPAY_RETURN_URL`. Kiểm chữ ký và số tiền; mã `00` thì xác nhận thanh toán (`confirmedVia: VNPAY_RETURN`, an toàn khi IPN đến sau hoặc gọi lại). `{ result: "success" \| "failed" \| "invalid", payment: PaymentView \| null }`; thanh toán của người khác / không phải `VNPAY` → `404` |
| `GET` | `/api/admin/bank-transactions?status=&before=&limit=` | ADMIN | Tiền vào ngân hàng đã lưu (mặc định mọi trạng thái; `status`: `MATCHED` \| `UNMATCHED` \| `RESOLVED` \| `IGNORED`), phân trang con trỏ `{ entries: [{ id, externalId, gateway, accountNo, amountVnd, content, bankReference, extractedReference, transactionAt, status, unmatchedReason, resolvedBy, resolvedNote, createdAt, payment: { id, reference, amountVnd, status, purpose, provider, expiresAt, userEmail } \| null }], nextBefore }` (không trả `raw`) |
| `GET` | `/api/admin/bank-transactions/payment-preview/:reference` | ADMIN | Xem thanh toán `VIETQR` theo mã `WF…` trước khi gán; không có → `404` |
| `POST` | `/api/admin/bank-transactions/:id/resolve` | ADMIN | Đối soát một giao dịch `UNMATCHED`: `{ action: "assign", paymentReference, note? }` hoặc `{ action: "ignore", note }` (xem "Đối soát chuyển khoản") |
| `GET` | `/api/print-shops?city=` · `/api/print-shops/:id` | Đã đăng nhập | Xưởng in đối tác (danh sách tĩnh trong `PrintShopsService`) / một xưởng; id lạ → `404` |
| `POST` | `/api/orders/sample` | Đã đăng nhập (chủ dự án) | Đặt in mẫu một thiết kế `{ projectId, quantity?, paperStock?, printShopId?, recipientName, phone, shippingAddress, notes? }` → đơn `PENDING_PAYMENT` (xem "Đơn in mẫu") |
| `POST` | `/api/orders/sample/bundle` | Đã đăng nhập (chủ dự án) | Đặt in nhiều thiết kế trong một đơn `{ items: [{ projectId, quantity?, paperStock? }] (1–20), printShopId?, recipientName, phone, shippingAddress, notes? }` → một đơn, một hóa đơn, thanh toán một lần |
| `GET` | `/api/orders/my-orders` · `/api/orders/:id` | Chủ đơn | Đơn của tôi (mới nhất trước) / một đơn; đơn của người khác → `404` |
| `GET` | `/api/orders` | ADMIN, PRINT_SHOP | Đơn cần xử lý: mọi xưởng (ADMIN) hoặc xưởng của tài khoản |
| `PATCH` | `/api/orders/:id/status` | ADMIN, PRINT_SHOP của đúng xưởng | `{ status, note? }` chuyển trạng thái (`PENDING_PAYMENT → PAID → IN_PRODUCTION → SHIPPED → DELIVERED`, hủy trước khi in); bước sai hoặc đơn vừa đổi → `409` |
| `GET` | `/api/notifications?before=&limit=` | Đã đăng nhập | Hộp thư thông báo của tôi, mới nhất trước (`limit` mặc định 20, tối đa 50) `{ items, nextBefore }` (xem "Hộp thư thông báo") |
| `GET` | `/api/notifications/unread-count` | Đã đăng nhập | `{ count }` số thông báo chưa đọc |
| `POST` | `/api/notifications/:id/read` | Đã đăng nhập | Đánh dấu một thông báo đã đọc (`204`, gọi lại không đổi gì); không phải của mình → `404` |
| `POST` | `/api/notifications/read-all` | Đã đăng nhập | Đánh dấu tất cả đã đọc → `200 { updated }` |
| `GET` | `/api/analytics/summary?scope=me\|global&days=7\|30\|90` | Đã đăng nhập | Số liệu dashboard: hộp đã tạo (tổng, theo ngày), cơ cấu kiểu hộp, lỗi FitCheck đã chặn, thời gian tạo hộp (trung vị, trung bình), lần xuất theo định dạng. `global` chỉ có số tổng, cache 60 giây |
| `GET` · `POST` · `DELETE` | `/api/projects/:id/unboxing` | Chủ dự án | Xem / tạo hoặc thay cấu hình mở hộp `{ recipientName, giftNote, audioTrackUrl?, particleEffect? }` (201 lần đầu, 200 khi thay) / xóa kèm file QR |
| `GET` | `/api/projects/:id/unboxing/qr?format=png\|svg` | Chủ dự án | Tải mã QR (PNG 1200 px hoặc SVG), sinh trực tiếp |
| `GET` | `/api/public/unboxing/:slug` | Public | Dữ liệu trang mở hộp khi quét QR; tăng `viewsCount` |
| `GET` · `POST` | `/api/collections` | Đã đăng nhập | Thư mục của tôi (mảng, sửa gần nhất trước, kèm `projectCount`) / tạo `{ title, description?, colorTag? }` |
| `GET` · `PATCH` · `DELETE` | `/api/collections/:id` | Chủ thư mục | Xem / sửa (`null` xóa `description`) / xóa thư mục — dự án bên trong được giữ lại, chuyển thành "chưa phân loại" |

### Ví dụ: `POST /api/auth/login`

```json
// Request
{ "email": "admin@wrapfit.vn", "password": "Admin@12345" }

// Response 200 — kèm header Set-Cookie: wf_access=…; Path=/api; HttpOnly; SameSite=Lax
//                                 Set-Cookie: wf_refresh=…; Path=/api/auth; HttpOnly; SameSite=Lax
{
  "user": { "id": "…", "email": "admin@wrapfit.vn", "emailVerifiedAt": "2026-10-08T02:00:00.000Z", "fullName": "WrapFit Admin", "role": "ADMIN", "subscriptionTier": "PRO_BUSINESS", "isActive": true },
  "expiresIn": 900
}
```

### Dự án: quy tắc chính (IT3-03)

- **Quyền sở hữu**: `ProjectOwnerGuard` trả `404 Project not found` cho cả dự án không tồn tại lẫn dự án của người khác (không để lộ id nào có thật). Id sai định dạng trả `400`.
- **Kích thước**: kiểm tra theo `formula_schema.params` của mẫu hộp (vd. tuck-top: L ≥ 40, W ≥ 30, H ≥ 20, tối đa 600 mm) và quy tắc tỉ lệ của cấu trúc (`dimensionRuleErrors` của `@wrapfit/shared`: hộp gối có `height ≤ width / 2`); sai → 400. `paperThickness` bỏ trống thì lấy `materialSpec.caliper`.
- **Mặc định khi tạo**: `materialSpec = { type: "ivory", gsm: 300, caliper: 0.42, finish: "matte" }` (độ dày = GSM × 0,0014), `canvasState = { elements: [] }`.
- **`canvasState`** phải đúng kiểu `CanvasState` của `@wrapfit/shared` (cấu trúc ở [02 · mục 3](02_DATABASE_DESIGN.md#3-cấu-trúc-canvas_state); tối đa 300 phần tử, ảnh là URL đã upload chứ không nhúng base64). Body JSON tối đa 1 MB.
- **Tags** được lưu dạng chữ thường, bỏ khoảng trắng và trùng lặp (tối đa 10 tag × 30 ký tự).
- `PATCH` chỉ đổi những trường được gửi; `null` xóa `collectionId` / `thumbnailUrl` / `occasion` / `industry`; `null` cho trường bắt buộc (`title`, `dimensions`, `materialSpec`, `canvasState`, `tags`) trả `400`. Không đổi được `templateId`. Dự án trong thùng rác không sửa được (`409`) cho tới khi khôi phục.
- **`version` chỉ tăng khi nội dung thiết kế đổi**: `canvasState`, `dimensions` hoặc `materialSpec` có giá trị khác bản đã lưu. Đổi tên, tag, thumbnail, thư mục không tăng `version`. Mọi lần lưu là compare-and-set trên `version`: lưu đè từ tab khác → `409 PROJECT_VERSION_CONFLICT`. Quyền xuất file và lần duyệt mẫu gắn với `version`, nên đổi tên không làm mất quyền xuất hay trạng thái "Đã duyệt in". E2E: `projects`, `export`, `reviews`.

### FitCheck phía server (UC-03, UC-14)

- Mỗi lần tạo dự án, sửa `canvasState` / `dimensions` hoặc khôi phục mốc, backend chạy FitCheck của `@wrapfit/shared` trên mọi mặt của hộp (hộp 2 mảnh: cả 2 mảnh) và lưu `fitcheckState` (báo cáo đầy đủ) + `fitcheckScore` (0–100). Nhân bản / Remix chép kết quả của bản gốc.
- `panelId` của phần tử nhận cả id đầy đủ (`panel_front`) lẫn tên ngắn (`front`), giống khi xuất file in.
- Dự án lưu trước khi có điểm được chấm bù lúc server khởi động (`FitCheckBackfillTask`, không đổi `updatedAt`).
- Xuất file chỉ cần FitCheck **không còn lỗi mức `error`**. Mốc ≥ 90 điểm chỉ dùng khi đưa mẫu vào thư viện cộng đồng.

### Chia sẻ công khai, Remix & thả tim (IT3-06)

- **Ai xem được `/api/public/projects/:slug`**: dự án `UNLISTED` hoặc `PUBLIC` và không nằm trong thùng rác (dự án `ARCHIVED` vẫn giữ link chia sẻ). Mọi trường hợp khác, kể cả slug sai định dạng, trả `404` — chủ dự án cũng nhận `404` cho dự án `PRIVATE` (trang công khai hiển thị đúng như người ngoài thấy; chủ dự án dùng `GET /api/projects/:id`).
- **Dữ liệu trả về** không có `id`, `userId`, email, thư mục, FitCheck: chỉ `slug`, `title`, `visibility`, `allowFork`, `template`, `dimensions`, `materialSpec`, `canvasState`, `thumbnailUrl`, `tags`, `viewsCount`, `likesCount`, `author { fullName, shopName, avatarUrl }`, `forkedFrom` và `viewer { isOwner, liked }`.
- **Người xem đã đăng nhập** được nhận diện qua cookie (`@OptionalAuth()`); token sai / hết hạn → coi như khách, không trả `401`.
- **Lượt xem**: +1 mỗi người xem mỗi 10 phút (tài khoản, hoặc IP + trình duyệt), trừ khi chính chủ xem. `?count=false` chỉ đọc, không tính (trang `/p/[slug]` render phía server bằng request không có cookie, request của trình duyệt mới tính). Bộ đếm view/like không làm đổi `updatedAt` (không xáo trộn Dashboard của chủ dự án).
- **`forkedFrom`** (ghi công tác giả gốc) chỉ hiện khi dự án gốc đang `PUBLIC`; gốc `UNLISTED` → `null` để không lộ link bí mật.
- **Remix**: chép thiết kế (giữ nguyên tên) vào tài khoản người bấm, ngoài mọi thư mục, `PRIVATE`, lưu `forkedFromId`. `allowFork = false` → `403` (riêng chủ dự án vẫn tự sao chép được). Tác giả bản gốc nhận một thông báo "có người remix" (không gửi khi tự remix), xem "Hộp thư thông báo".
- **Thả tim**: gọi lại nhiều lần vẫn chỉ tính 1 (`@@unique([userId, projectId])`); trả `{ liked, likesCount }`.
- FE: trang `UNLISTED` nên gắn `<meta name="robots" content="noindex">`.

### Xuất file in

**Luồng.** `POST .../exports` chạy trong **một** transaction: khóa dòng dự án (`FOR UPDATE`), chạy lại FitCheck và lưu vào `fitcheckState`, kiểm quyền xuất của đúng phiên bản vừa khóa, rồi tạo `ExportJob` `PENDING` kèm `projectVersion` và bản thiết kế lúc request (`design`). Sau đó job được đẩy vào hàng đợi BullMQ `export` → `202`. Process `worker` riêng dựng file **từ `design` đã lưu**, không đọc dự án hiện tại, nên lưu thêm sau khi bấm xuất không làm lệch file in. Job hoàn tất → `COMPLETED`, tự tạo mốc phiên bản "Bản xuất in ..." và một thông báo "file in đã xong". FE hỏi `GET /api/exports/:jobId` mỗi 2 giây tới khi có `downloadUrl`.

**Request và phản hồi** (DTO [`CreateExportDto`](../be/src/export/dto/create-export.dto.ts) chỉ có `fileType`):

```json
// POST /api/projects/:id/exports
{ "fileType": "PDF_CMYK" }

// 202 — đã có quyền, FitCheck không còn lỗi mức error
{ "jobId": "0197…", "status": "PENDING", "fitCheck": { "isValidForProduction": true, "score": 96, "violations": [ … ] } }

// 422 — FitCheck còn lỗi mức error (không tạo job, fitcheckState vẫn được lưu)
{ "statusCode": 422, "message": "FitCheck found errors that would ruin the print; fix them before exporting", "fitCheck": { … } }

// 402 — phiên bản này chưa có quyền xuất
{ "statusCode": 402, "code": "ORDER_PAYMENT_REQUIRED", "message": "File in chỉ xuất được sau khi thanh toán đơn in của bản thiết kế này ở giỏ in mẫu" }

// 400 — gửi thêm trường cũ, ví dụ { "fileType": "SVG", "useCredit": true }
{ "statusCode": 400, "message": ["property useCredit should not exist"] }
```

**Quyền xuất.** Phiên bản hiện tại (`packaging_projects.version`) có quyền xuất khi:

- có một đơn in đã trả tiền (`paidAt` khác null), chưa hủy, có dòng hàng giữ đúng `projectVersion` này; **hoặc**
- có một lần mở khóa cũ (`export_unlocks`, mua bằng lượt xuất trước khi có giỏ in) của đúng `(project, version)`, chưa hoàn, còn hạn.

Pro, xu và lượt xuất còn dư **không** mở file in. Một quyền mở mọi định dạng của phiên bản đó. `GET …/exports/access` trả `{ unlocked, unlockExpiresAt }` theo đúng quy tắc trên.

**Ba tình huống hay gặp:**

| Tình huống | Kết quả | Kiểm |
|---|---|---|
| Đổi tên (hoặc tag, thumbnail) sau khi đơn đã trả | `version` không đổi, quyền xuất giữ nguyên | E2E `export`: "keeps the paid files unlocked after a rename" |
| Sửa thiết kế (canvas, kích thước, giấy) sau khi đơn đã trả | `version` tăng; phiên bản mới → `402 ORDER_PAYMENT_REQUIRED`, cần đặt và trả một đơn in mới | E2E `export`: "needs a new paid order after an edit" |
| Dự án nằm trong thùng rác | `POST …/exports` → `409` cho tới khi khôi phục. Khôi phục (`PATCH …/status { "status": "ACTIVE" }`) không đổi `version`, nên quyền của phiên bản đó còn nguyên. Riêng khôi phục một **mốc phiên bản** thì đổi canvas, tức là phiên bản mới, cần quyền mới | Có mã trên `develop` (`export.service.ts`); chưa có ca E2E riêng |

**Trạng thái job.** `PENDING` → `PROCESSING` → `COMPLETED` / `FAILED`. Lỗi được thử lại 3 lần; chỉ lần cuối mới thành `FAILED` (kèm `error`). Worker nhận lại một job đã `COMPLETED` thì không dựng lại, nên không tạo thêm file, mốc hay thông báo. Job tạo trước migration `20261118000200_export_job_design` (`design = NULL`) vẫn dựng theo cách cũ.

**Trường `watermarked`** trong `GET /api/exports/:jobId` chỉ còn vì tương thích: job mới luôn là `false`, mọi file xuất đều sạch. Job cũ có thể mang `true`, nhưng worker vẫn dựng PDF sạch.

**Định dạng file.** `PDF_CMYK` (xưởng in, kích thước thật, màu CMYK, font tiếng Việt nhúng sẵn), `PDF_A4_PRINT` (in tại nhà, khổ A4 / A3, dấu xén), `SVG` (Cricut / laser, có lớp), `DXF` (máy bế CNC, mm), `PRINT_PACKAGE` (ZIP gửi nhà in: file gốc `.ai` tương thích PDF, PDF in, JPG đối chiếu, SVG, DXF, phiếu kiểm tra). Lớp đồ họa gồm chữ và ảnh / logo / hoa văn đã upload lên storage của WrapFit (URL ngoài bị bỏ qua; PDF nhúng PNG, JPEG, WebP, GIF, TIFF, AVIF và logo SVG (raster hóa, đổi sang CMYK), SVG nhúng mọi định dạng ảnh; tổng ≤ 100 MB). Chi tiết: [`be/README.md`](../be/README.md#xuất-file-in-bullmq).

**Lỗi hạ tầng.** Chưa cấu hình storage → `503`. Redis từ chối trước khi nhận job (ví dụ Redis sập) → job `FAILED` và `503`. Hàng đợi không trả lời kịp hoặc mất kết nối sau khi đã gửi → vẫn `202`, job giữ `PENDING`; job không tới được hàng đợi sẽ bị `ExportReconcileTask` đánh `FAILED` sau 10 phút. Tối đa 10 yêu cầu xuất / phút.

E2E: `export.e2e-spec.ts` (202, 422, 402, 400 `useCredit`, đổi tên, sửa thiết kế, dựng đúng phiên bản lúc request, hàng đợi lỗi).

### Gói, xu và thanh toán

**Gói lượt xuất đã ngừng bán.** Tạo thanh toán `EXPORT_1` / `EXPORT_5` / `EXPORT_15` mới → `400 EXPORT_PACK_DISCONTINUED`. File in mở bằng đơn in đã trả (xem "Xuất file in"), tác vụ AI dùng xu Wrap.

**Tạo thanh toán.** DTO [`CreatePaymentDto`](../be/src/payments/dto/create-payment.dto.ts):

- `purpose`: `PRO_MONTH` (Pro 30 ngày, 99.000đ), `SAMPLE_ORDER` (đơn in mẫu, số tiền theo đơn), `XU_500` (50.000đ), `XU_1050` (100.000đ), `XU_2200` (200.000đ), `XU_CUSTOM` (số xu tùy chọn, giá niêm yết 100đ / xu, không thưởng).
- `termsVersion`: bắt buộc, phải bằng `PAYMENT_TERMS_VERSION` hiện hành (`2026-11-12`, [`shared/src/billing/terms.ts`](../shared/src/billing/terms.ts)); sai → `400`. Phiên bản điều khoản, thời điểm đồng ý và thông tin hóa đơn VAT lúc đó được lưu cùng thanh toán.
- `orderId`: bắt buộc khi `SAMPLE_ORDER`, cấm với mục khác (`400`). Đơn không phải của mình → `404`; đơn không còn chờ thanh toán → `409`. Mở checkout hai lần cho cùng đơn trả lại cùng thanh toán còn hạn.
- `xu`: bắt buộc khi `XU_CUSTOM`, cấm với mục khác. Từ 100 đến 50.000 xu, bội số của 10 ([`shared/src/billing/xu.ts`](../shared/src/billing/xu.ts)); sai → `400`.

```json
// POST /api/payments — nạp số xu tùy chọn
{ "purpose": "XU_CUSTOM", "xu": 1230, "termsVersion": "2026-11-12" }

// POST /api/payments — trả đơn in mẫu
{ "purpose": "SAMPLE_ORDER", "orderId": "0197…", "termsVersion": "2026-11-12" }

// 201 PaymentView (tài khoản thường)
{
  "id": "…", "purpose": "XU_CUSTOM", "amountVnd": 123000, "reference": "WF7K2M9Q", "status": "PENDING",
  "provider": "VIETQR", "confirmedVia": null, "expiresAt": "…", "paidAt": null, "createdAt": "…",
  "credits": null, "xu": 1230, "orderId": null,
  "vietqr": { "payload": "000201…", "qrSvg": "<svg…>", "bankBin": "…", "bankName": "…", "accountNo": "…", "accountName": "…", "sample": false },
  "vnpay": null
}
```

- `reference`: `WF` + 6 ký tự (bỏ O/0/I/1), là nội dung chuyển khoản. Thanh toán hết hạn sau 15 phút.
- `credits` chỉ khác `null` với thanh toán gói lượt xuất cũ (lịch sử). Thanh toán gói cũ tạo trước khi ngừng bán mà giờ mới xác nhận thì được cấp **xu** theo số tiền đã trả, không cấp lượt xuất.
- Khi thanh toán xác nhận: gói xu cấp một lô `PURCHASE` hạn 12 tháng; `PRO_MONTH` tạo hoặc gia hạn kỳ Pro 30 ngày (hai thanh toán Pro xác nhận cùng lúc được cộng nối tiếp, không mất kỳ); `SAMPLE_ORDER` chuyển đơn sang `PAID`.
- VietQR: backend dựng payload EMVCo (NAPAS tag 38, số tiền, nội dung = `reference`, CRC-16) và ảnh QR SVG, không gọi dịch vụ ngoài. Tài khoản nhận lấy từ `VIETQR_*`; trống thì dùng tài khoản mẫu "WRAPFIT MO PHONG" (`vietqr.sample: true`), không thể nhận tiền thật.

#### Cổng thanh toán và giả lập

| Loại tài khoản | Cổng | `PaymentView` | Giả lập (`PAYMENT_SIMULATION=true`) |
|---|---|---|---|
| Demo (`users.is_demo`) | VNPay sandbox (`provider: "VNPAY"`) | `vnpay: { payUrl }` (URL đã ký, chỉ có trong phản hồi `POST`), `vietqr: null`. Máy chủ chưa cấu hình VNPay: vẫn tạo thanh toán với `vnpay: null` khi bật giả lập, ngược lại `503 VNPAY_NOT_CONFIGURED` | Luôn được giả lập |
| Thường | VietQR, SePay báo tiền về (`provider: "VIETQR"`) | `vietqr: { … }`, `vnpay: null` | Chỉ khi máy chủ **chưa** cấu hình `VIETQR_*` (QR dùng tài khoản mẫu). Có tài khoản VietQR thật → `403 SIMULATION_DEMO_ONLY` |

- Giả lập chỉ mở khi máy chủ bật `PAYMENT_SIMULATION=true`; tắt thì `simulate-confirm` và `simulate-transfer` trả `404`. Ở production, máy chủ từ chối khởi động khi bật giả lập mà đã đặt đủ `VIETQR_*`.
- Admin đổi loại tài khoản bằng `PATCH /api/users/:id { "isDemo": true }`. Cổng được chọn lúc tạo thanh toán, nên chỉ thanh toán tạo sau đó mới đổi cổng.
- Mọi đường xác nhận (SePay, VNPay IPN / return, giả lập, admin) gọi chung `PaymentsService.confirmPaid`: khóa dòng `payments FOR UPDATE`, đã `PAID` thì trả luôn, nên hai đường đến cùng lúc chỉ cấp quyền lợi một lần. Webhook SePay không khớp thanh toán `VNPAY`, IPN VNPay không khớp thanh toán `VIETQR`. Số tiền luôn so với `payments.amount_vnd` phía server.
- Lỗi `503` giữ trường `code` trong thân, ví dụ `VNPAY_NOT_CONFIGURED`, `AI_IMAGE_UNAVAILABLE`.

E2E: `payments`, `vnpay`, `billing`.

### Đối soát chuyển khoản

Webhook SePay lưu mọi tiền vào thành một dòng `bank_transactions`, tách mã `WF…` khỏi nội dung chuyển khoản (ngân hàng có thể chèn tiền tố), rồi tìm thanh toán `VIETQR` theo mã:

| Trường hợp | Kết quả | Việc tiếp theo |
|---|---|---|
| **Khớp tiền**: thanh toán `PENDING`, còn hạn, số tiền về **đúng bằng** số tiền thanh toán | Thanh toán `PAID` (`confirmedVia: SEPAY_WEBHOOK`), cấp quyền lợi; giao dịch `MATCHED` | Không cần làm gì |
| **Lệch tiền**: số tiền về khác số tiền thanh toán | Giao dịch `UNMATCHED` (`AMOUNT_MISMATCH`), thanh toán vẫn `PENDING` | Admin xem. Chuyển **dư** thì gán tay được; chuyển **thiếu** thì gán bị từ chối (`400 AMOUNT_TOO_LOW`), admin hoàn tiền tay rồi bỏ qua |
| Không có mã `WF` trong nội dung | `UNMATCHED` (`NO_REFERENCE`) | Admin tìm thanh toán theo nội dung, rồi gán tay |
| Có mã nhưng không có thanh toán VietQR nào | `UNMATCHED` (`NOT_FOUND`) | Admin kiểm, hoàn tiền tay hoặc bỏ qua |
| Thanh toán đã hết hạn | `UNMATCHED` (`EXPIRED`) | Admin gán tay (gán cho phép thanh toán đã hết hạn) |
| Thanh toán đã được trả bằng đường khác | `UNMATCHED` (`ALREADY_PAID`) | Admin hoàn tiền tay rồi bỏ qua |
| Thanh toán đơn in mà đơn đã hủy hoặc đã được trả bằng thanh toán khác | `UNMATCHED` (`ORDER_NOT_PAYABLE`), thanh toán vẫn `PENDING`, không cấp gì | Admin hoàn tiền tay rồi bỏ qua |

**Gán tay** (`POST /api/admin/bank-transactions/:id/resolve`):

- `{ action: "assign", paymentReference, note? }`: nhập mã `WF…` (không phải id). Chỉ khi số tiền về ≥ số tiền thanh toán. Xác nhận cả khi thanh toán đã quá hạn (`confirmedVia: ADMIN`), giao dịch thành `RESOLVED` kèm người xử lý và ghi chú.
- `{ action: "ignore", note }`: đã hoàn tiền tay hoặc tiền không liên quan → `IGNORED`. Bắt buộc có ghi chú.
- Lỗi: `400 AMOUNT_TOO_LOW`, `409 PAYMENT_ALREADY_PAID`, `409 BANK_TX_NOT_UNMATCHED` (giao dịch không còn `UNMATCHED`, kể cả hai admin gán cùng lúc), `409 PAYMENT_EXPIRED` (thanh toán đã hủy), `409 ORDER_NOT_PAYABLE` (đơn đã hủy; giao dịch giữ `UNMATCHED`), `404` (giao dịch, mã, hoặc thanh toán `VNPAY`).

E2E: `sepay-webhook`, `admin-bank-transactions`.

### Đơn in mẫu

- **Đặt đơn.** `POST /api/orders/sample` (một thiết kế) hoặc `/api/orders/sample/bundle` (1–20 thiết kế, một hóa đơn, thanh toán một lần). Mỗi thiết kế 1–10 hộp. Chỉ đặt được dự án của mình, không ở thùng rác (sai → `404`). Xưởng in không nhận đơn → `400`. Thiếu số điện thoại (`phone` hoặc `recipientPhone`) → `400`.
- **Giá.** Mỗi thiết kế: 49.000đ hộp đầu, thêm 25.000đ mỗi hộp sau. Phí giao hàng hiện là 0. Không có mã ưu đãi: body gửi `promoCode` → `400`. Mọi đơn tạo ra đều `PENDING_PAYMENT`, tổng tối thiểu 49.000đ.
- **Mã đơn** `WF-<năm>-<6 chữ số>` (năm theo giờ Việt Nam), ví dụ `WF-2026-048213`. Đơn tạo trước 2026-11-16 giữ mã 4 chữ số cũ.
- **Mỗi dòng hàng giữ phiên bản dự án.** Dòng hàng chụp lại `projectVersion`, tên, cấu trúc, kích thước, giấy lúc đặt. Phản hồi có `items: [{ projectId, projectTitle, quantity, lineTotalVnd }]`; các trường ở cấp đơn (`projectId`, `projectVersion`, `quantity`, `paperStock`…) mô tả dòng đầu tiên, giữ cho FE cũ. Đơn đã trả mở quyền xuất cho đúng phiên bản của từng dòng.
- **Thanh toán đơn** bằng `POST /api/payments { purpose: "SAMPLE_ORDER", orderId }`. Đơn bị hủy trước khi tiền về → thanh toán không cấp gì (`409 ORDER_NOT_PAYABLE` khi giả lập, `ORDER_NOT_PAYABLE` khi đối soát).
- **Vòng đời** `PENDING_PAYMENT → PAID → IN_PRODUCTION → SHIPPED → DELIVERED`; hủy được trước khi in. Tài khoản `PRINT_SHOP` chỉ chuyển các bước in, giao, đã giao của xưởng mình; thanh toán và hủy do ADMIN.

E2E: `orders`, `payments`.

### Giới hạn xóa dự án

- Đơn ở trạng thái `PENDING_PAYMENT`, `PAID` hoặc `IN_PRODUCTION` còn cần thiết kế của dự án. Xóa vĩnh viễn thủ công dự án đó → `409 PROJECT_IN_ACTIVE_ORDER`, `message` (tiếng Việt, FE hiện nguyên văn) có mã đơn. Không file nào bị xóa.
- Tác vụ dọn thùng rác (02:00 mỗi ngày) bỏ qua dự án đó; dự án nằm lại trong thùng rác cho tới khi đơn đã gửi đi, đã giao hoặc đã hủy.
- Vẫn cho chuyển dự án vào thùng rác, vì thao tác này hoàn tác được.
- Chi tiết dữ liệu: [02 · mục 4](02_DATABASE_DESIGN.md#4-giữ-file-và-xóa-dự-án). E2E: `projects` (đơn ở từng trạng thái giữ thiết kế).

### Duyệt mẫu theo link

Chủ dự án gửi một link bí mật cho khách hoặc xưởng in. Người cầm link xem thiết kế, góp ý và bấm "Duyệt in" mà không cần tài khoản. Lần duyệt gắn với phiên bản thiết kế người duyệt đã xem.

- **Tạo link**: `POST /api/projects/:id/review/link` → `ReviewState { token, approval, comments }`. Token 24 ký tự; link là `/review/<token>` trên FE. Gọi lại thì đổi token, link cũ hết hiệu lực, lần duyệt giữ nguyên. `DELETE …/review/link` tắt link (token thành `null`), giữ lần duyệt.
- **Xem**: `GET /api/review/:token` → `{ title, structure, formulaVersion, version, dimensions, materialSpec, canvasState, approval, comments }` (thiết kế đã lưu). Link lạ, đã tắt, hoặc dự án trong thùng rác → `404`. Thiết kế `PRIVATE` vẫn riêng tư với mọi người khác: link duyệt tách khỏi `/p/[slug]`.
- **Góp ý**: khách gửi `{ authorName (≤ 60 ký tự), body (≤ 1.000 ký tự), panelId?, x?, y? }`; chủ dự án gửi cùng dạng, không có `authorName`. Có `panelId` cùng `x`, `y` (mm trên mặt) thì góp ý được ghim vào điểm đó. Khách được tối đa 500 góp ý mỗi dự án (`400 TOO_MANY_COMMENTS`); góp ý của chủ dự án đếm riêng, nên khách không chặn được chủ trả lời.
- **Duyệt**: `POST /api/review/:token/approve { name, version }`. `version` là phiên bản người duyệt đang xem; khác phiên bản hiện tại → `409 DESIGN_CHANGED` ("Thiết kế vừa được sửa, hãy tải lại trang…"). Thành công → `{ approvedAt, approvedBy, approvedVersion, current: true }`.
- **"Đã duyệt in"** = `approval.current`, tức `approvedVersion` bằng `version` hiện tại. Sửa nội dung thiết kế sau đó thì `current` thành `false` ("Đã sửa sau khi duyệt, cần duyệt lại"). Đổi tên hay thumbnail không làm mất trạng thái duyệt.
- Log truy cập chỉ ghi 4 ký tự đầu của token.

E2E: `reviews.e2e-spec.ts` (link lạ, góp ý khách, duyệt đúng phiên bản và `409 DESIGN_CHANGED`, giữ duyệt khi đổi tên, chủ trả lời khi khách đã đầy, token không vào log, tắt link → `404`).

### Hộp thư thông báo

- Hai loại: `PROJECT_REMIXED` (có người remix thiết kế của bạn; không gửi khi tự remix) và `EXPORT_COMPLETED` (file in đã xong, một dòng mỗi job).
- `GET /api/notifications` → `{ items: [{ id, type, createdAt, readAt, project: { id, title }, count, actorName, export: { jobId, fileType } \| null }], nextBefore }`. Với remix, `project` là thiết kế **gốc** của người nhận; `count` là số lượt remix chưa đọc gộp vào dòng này; `actorName` là họ tên (không có thì tên shop) của người remix gần nhất, `null` khi tài khoản không có tên, đã xóa hoặc đã ẩn danh (FE ghi "Một người dùng WrapFit"). Không bao giờ trả email.
- Lượt remix mới của cùng thiết kế gộp vào dòng **chưa đọc** đang có (`count + 1`, đưa lên đầu); đọc rồi thì lượt sau mở dòng mới.
- Khi có thông báo mới, API đẩy sự kiện `notifications.changed` qua WebSocket tới các tab đang mở của người nhận. FE vẫn hỏi `unread-count` lúc tải trang, khi tab được focus lại và khoảng mỗi 60 giây, nên mất WebSocket không làm sai số.
- Dọn hằng ngày: xóa thông báo đã đọc cũ hơn 30 ngày, mỗi người giữ tối đa 200 dòng mới nhất.

E2E: `notifications.e2e-spec.ts`.

### Mở hộp 3D & QR (IT3-10)

- Mỗi dự án có tối đa 1 trải nghiệm mở hộp. `slug` (12 ký tự ngẫu nhiên) được tạo một lần và **không đổi** khi sửa lời chúc, vì mã QR có thể đã được in.
- Mã QR trỏ tới `FRONTEND_URL/unbox/<slug>` (trang Next.js `fe/src/app/unbox/[slug]`), mức sửa lỗi **H** (chịu được trầy xước, nếp gấp) và lề 4 ô chuẩn. Mỗi lần lưu, backend sinh lại PNG 1200 px (~10 cm ở 300 DPI) và SVG (cho file in vector), lưu lên storage: `qrCodeUrl` (PNG), `qrCodeSvgUrl` (SVG). Chưa cấu hình storage thì hai URL là `null`, vẫn tải được qua `GET .../unboxing/qr`.
- File QR được tính vào dung lượng của chủ dự án và bị xóa khi xóa trải nghiệm hoặc xóa vĩnh viễn dự án.
- `particleEffect`: `confetti` (mặc định), `fireworks`, `hearts`, `petals`, `snow`, `none`.
- **Nguồn âm thanh hợp lệ** (`audioTrackUrl`, tối đa 2.048 ký tự): một file đã tải lên storage của WrapFit, hoặc một đường dẫn tĩnh của frontend bắt đầu bằng `/` (ví dụ `/audio/xuan.mp3`). URL của trang khác → `400 FILE_URL_NOT_ALLOWED`, vì trình duyệt của người nhận sẽ tải nó.
- **Trang công khai** hoạt động cả khi thiết kế đang `PRIVATE` (slug chính là "chìa khóa" cho người nhận), trả `recipientName`, `giftNote`, `audioTrackUrl`, `particleEffect`, `viewsCount`, `sender { fullName, shopName, avatarUrl }` và `box` (tiêu đề, cấu trúc, kích thước, chất liệu, canvas, thumbnail) — không có id, email. Dự án trong thùng rác → `404` (và không tạo / sửa được: `409`).

E2E: `unboxing.e2e-spec.ts`.

### Xu Wrap và ảnh AI

- Mọi tác vụ AI trả bằng **xu Wrap** (1 xu = 100đ): ảnh AI, hoa văn AI, phóng to, xóa nền, vector hóa. Mỗi gói được cộng xu mỗi kỳ (Free 50, Lượt xuất 100, Pro 1.000, Business 3.500), xu chưa dùng giữ thêm một kỳ. Gói nạp `XU_500` 50.000đ, `XU_1050` 100.000đ, `XU_2200` 200.000đ, hoặc `XU_CUSTOM` (100–50.000 xu, bội số của 10, 100đ / xu); xu nạp có hạn 12 tháng. Quy tắc đầy đủ: [19 · Xu Wrap](19_XU_WRAP_SPEC.md).
- **Trừ và hoàn xu.** Xu bị trừ cùng transaction tạo job. Lỗi phía hệ thống (provider lỗi cả hai lần thử, provider từ chối vẽ, hàng đợi hoặc worker sập, job treo quá 10 phút) thì job thành `FAILED` và xu được hoàn **đúng một lần**; `job.error` ghi "Xu đã được hoàn lại". Khách không ưng ảnh thì không hoàn.
- **Gửi lại cùng `clientRequestId`** (UUID mới cho mỗi lần bấm): trả lại job cũ cùng số dư hiện tại, không trừ xu lần hai, kể cả khi hai request đến cùng lúc.
- **Lỗi khi tạo job** (trước khi trừ xu, trừ khi ghi khác):

  | HTTP | `code` | Khi nào |
  |---|---|---|
  | 402 | `INSUFFICIENT_CREDITS` | Không đủ xu; thân có `kind: "XU"`, `balance`, `cost`. Không tạo job |
  | 422 | `PROMPT_REJECTED` | Bước kiểm duyệt chặn mô tả; `message` nêu lý do. Chưa trừ xu |
  | 429 | `AI_IMAGE_BUSY` | Đã có 3 job ảnh đang chạy |
  | 429 | (không có) | Vượt 5 request / phút; header `Retry-After` |
  | 503 | `AI_IMAGE_UNAVAILABLE` | Tính năng tắt, cầu chì ngân sách đã chạm, hoặc hàng đợi lỗi (xu đã hoàn) |
  | 403 | `STORAGE_QUOTA_EXCEEDED` | Bộ nhớ của gói đã đầy |
  | 400 | (không có) | Model không bật, tỉ lệ khung sai, `numImages` vượt trần, `allowText` với model không hỗ trợ, công cụ không áp dụng được (ảnh SVG, ảnh đã đạt trần phóng to) |
  | 404 | (không có) | Job hoặc ảnh không tồn tại hoặc không phải của mình |

- Lỗi xảy ra **sau** khi job đã vào hàng đợi không trả qua HTTP: chúng nằm ở `job.status = "FAILED"` và `job.error`.

E2E: `ai-images.e2e-spec.ts` (trừ xu, `402` không tạo job, hoàn xu khi provider lỗi và khi provider từ chối, bấm hai lần chỉ trừ một lần, phóng to).

### AI sinh hoa văn (IT3-09)

- Trả bảng màu (3–8 màu `#RRGGBB`) và một ô hoa văn SVG **lặp liền mạch** (`tile.svg`, cạnh `tile.size` px) — FE dùng làm nền lặp trên mặt hộp.
- Claude chỉ trả dữ liệu hình (structured outputs); backend kiểm tra rồi tự dựng SVG, nên SVG trả về không chứa script / link / tài nguyên ngoài.
- **Tính bằng xu, không còn giới hạn lượt / ngày.** `quality: "fast"` (mặc định, `AI_MODEL_FAST`) 1 xu, `"premium"` (`AI_MODEL_PREMIUM`) 65 xu, mọi gói. Thiếu xu → `402 INSUFFICIENT_CREDITS { kind: "XU", balance, cost }`, trả về trước khi gọi Claude. Tối đa 5 yêu cầu / phút.
- **Hoa văn thuật toán dự phòng** (`source: "procedural"`, luôn có kết quả, không trả lỗi cho người dùng):
  - AI tắt hoặc vượt `AI_MONTHLY_BUDGET_USD` trong tháng → hoa văn thuật toán miễn phí, không trừ xu (`usage: null`); `GET /api/ai/usage` có `budgetReached`.
  - Claude lỗi sau khi đã trừ xu → xu được hoàn, trả hoa văn thuật toán (`usage.charged: 0`).
  - Tiến trình chết giữa lúc trừ xu và gọi Claude → tác vụ dọn hoàn lại lần trừ không có kết quả sau 10 phút.
- `theme` ≤ 200 ký tự; `preferredColors` tối đa 5 màu thương hiệu.

E2E: `ai.e2e-spec.ts`.

### Tài khoản & email (xác minh, quên mật khẩu)

- Đăng ký gửi email xác minh (link 24 giờ). Chưa xác minh: `login` trả `403 EMAIL_NOT_VERIFIED`, `refresh` trả `401`. FE hiển thị nút "Gửi lại email" (`verify-email/resend`).
- Đăng ký một email **đã có tài khoản**: trả lời y hệt, chỉ email gửi đi khác nhau:
  - tài khoản chưa xác minh → email "Hoàn tất đăng ký" với link đặt mật khẩu (30 phút). Mật khẩu gửi kèm lần đăng ký sau **không** được lưu, link xác minh cũ hết hiệu lực: chỉ chủ hộp thư quyết định mật khẩu, kể cả khi người khác đã đăng ký email đó trước;
  - tài khoản đã xác minh → email "Email của bạn đã có tài khoản" (đăng nhập / quên mật khẩu), tối đa 1 lần / giờ, không thay đổi gì.
- Tài khoản mật khẩu chưa xác minh, không có dự án và file nào bị xóa sau 7 ngày (cron 03:00).
- Link trong email trỏ tới trang FE `/verify-email?token=…`, `/reset-password?token=…` hoặc `/complete-signup?token=…`; trang đó gọi API tương ứng với `token` (`/complete-signup` và `/reset-password` cùng gọi `POST /api/auth/password/reset`). Link được suy ra từ id của mã bằng HMAC phía server, nên hàng đợi mail không chứa link dùng được.
- Mỗi tài khoản: tối đa 1 email mỗi loại / phút và 5 / ngày (vượt thì bỏ qua im lặng, vẫn `202`); thêm giới hạn 5 yêu cầu / phút / IP. Gửi lại email làm link cũ hết hiệu lực.
- Đặt lại mật khẩu cũng xác minh email (link đến từ hộp thư). Tài khoản chỉ có Google dùng được để đặt mật khẩu lần đầu.
- Đăng nhập Google vào email đã có tài khoản mật khẩu **chưa xác minh**: mật khẩu đó bị xóa và mọi phiên bị thu hồi (chặn chiếm tài khoản trước khi chủ thật đăng ký); chủ tài khoản đặt lại mật khẩu bằng "quên mật khẩu".
- Email do worker gửi qua SMTP (`SMTP_*`, `MAIL_FROM`). Lỗi SMTP 4xx hoặc timeout được thử lại (tối đa 5 lần gửi); lỗi 5xx không thử lại. Local: Mailpit trong `docker-compose.yml`, xem thư tại http://localhost:8025.

E2E: `auth.e2e-spec.ts`.

### Lưu trữ file (IT3-08)

- FE xin URL rồi `PUT` file thẳng lên bucket (backend không nhận byte file). Chữ ký khóa đúng `Content-Type` và `Content-Length` đã khai báo: gửi file khác dung lượng / khác định dạng → bucket trả `403`. URL hết hạn sau 5 phút. Ví dụ code: [`be/README.md`](../be/README.md#lưu-trữ-file-s3--cloudflare-r2).
- `purpose`: `LOGO` (PNG/JPEG/WebP/SVG/PDF, ≤ 15 MB), `IMAGE` (PNG/JPEG/WebP, ≤ 15 MB), `THUMBNAIL` / `AVATAR` (PNG/JPEG/WebP, ≤ 2 MB), `FONT` (TTF/OTF/WOFF/WOFF2, ≤ 10 MB; kiểm bằng `POST /api/storage/fonts/inspect` trước khi dùng). Sai định dạng → `400`; quá dung lượng → `413`.
- Hạn mức theo gói: FREE 100 MB, PAY_PER_EXPORT 500 MB, STARTER 2 GB, PRO_BUSINESS 20 GB, tính từ lúc cấp URL. Vượt → `403`.
- `projectId` (tùy chọn) gắn file vào dự án của mình (không được ở thùng rác): file bị xóa khỏi bucket khi dự án bị xóa vĩnh viễn hoặc bị cron dọn thùng rác — trừ ảnh / logo / phông mà dự án khác (bản sao, Remix) vẫn hiển thị (`project_file_refs`): file đó được chuyển sang dự án cũ nhất trong số đó.
- Admin xóa người dùng → file của người đó (và file sinh ra cho dự án của họ) bị xóa khỏi bucket, trừ ảnh mà dự án của người khác vẫn dùng: ảnh đó được chuyển (cả hạn mức) cho chủ dự án Remix cũ nhất. Tài khoản bị ẩn danh hóa giữ lại file mà dự án của đơn chưa hủy cần.
- Upload không còn nơi nào dùng (canvas, mốc và job xuất chưa xong qua `project_file_refs`, `avatar_key`, `brand_kit.logoKey`, `thumbnail_key`, `preview_key`, tài nguyên thư viện, ảnh AI còn hạn giữ) quá 24 giờ bị `StorageMaintenanceTask` xoá cả dòng lẫn object (`UNUSED_UPLOAD_GRACE_MS`). File backend sinh ra (QR, file in) không thuộc diện này.
- Ảnh đại diện / logo Brand Kit bị thay hoặc gỡ: file `AVATAR` / `LOGO` không gắn dự án và không còn canvas nào hiển thị bị xóa cùng object trên bucket (không tính vào hạn mức nữa). File `IMAGE` dùng làm avatar / logo được giữ (có thể đang là thumbnail / preview).
- Dùng file ở đâu cũng phải là file **của mình** đã tải lên: `thumbnailUrl`, `previewUrl` (THUMBNAIL / IMAGE), `avatarUrl` (AVATAR / IMAGE), `logoUrl` của Brand Kit (LOGO / IMAGE). URL trang khác → `400 code FILE_URL_NOT_ALLOWED`; file của người khác → `400 code FILE_NOT_OWNED`.
- Canvas chỉ được thêm ảnh và phông của mình (LOGO / IMAGE / FONT); file mà dự án đã hiển thị từ trước (vd. ảnh của tác giả gốc trong bản Remix) được giữ nguyên. Đường dẫn tĩnh (`/branding/...`) và ảnh trang khác vẫn lưu như gửi lên, nhưng không được nhúng vào file in.
- Chưa cấu hình storage (`STORAGE_BUCKET` trống) → `503`.

E2E: `storage`, `unused-files`.

### Thư viện mẫu (IT3-07)

- **Hai phân khu**: `section=curated` — bảng `design_templates` (mẫu WrapFit dựng sẵn, sắp theo `sortOrder`); `section=community` — dự án `PUBLIC` đang `ACTIVE` (không tính lưu trữ / thùng rác), sắp theo lượt tim rồi lượt xem. FE gọi 2 lần để hiển thị 2 phân khu.
- **Bộ lọc dùng chung**: `structure` (`tuck-top`…), `occasion` (`TET`, `CHRISTMAS`, `WEDDING`, `VALENTINE`, `BIRTHDAY`, `MINIMAL`), `industry` (`COSMETICS`, `CANDLES`, `BAKERY`, `JEWELRY`, `TEA_AGRI`, `BEVERAGE`), `material` (`ivory`, `kraft`, `duplex`), `q` (tiêu đề hoặc đúng 1 tag). FE hiển thị nhãn tiếng Việt.
- **Thẻ mẫu**: Curated có `id`; Community có `slug` (mở bằng trang công khai), `author`, `likesCount`, `viewsCount`. `usesCount` = số lần "Dùng mẫu này" (Curated) hoặc số lần được Remix (Community). Không trả `canvasState` trong danh sách.
- **Cache**: phản hồi `/api/templates/*` được cache trong bộ nhớ 60 giây theo URL — số tim / lượt dùng có thể trễ tối đa 1 phút.
- **"Dùng mẫu này" (UC-13)**: `POST /api/projects { templateId: <structure của mẫu>, designTemplateId, title, dimensions, canvasState? }`. Bỏ trống `materialSpec` / `canvasState` thì lấy từ mẫu; khi người dùng nhập kích thước món quà, FE co giãn đồ họa bằng `@wrapfit/shared` rồi gửi `canvasState` đã co giãn. `templateId` khác cấu trúc của mẫu → `400`. Mỗi lần tạo tăng `usesCount`.
- **Đưa dự án lên mẫu cộng đồng (UC-14)**: đặt `visibility: PUBLIC` và gắn `occasion` / `industry` qua `PATCH /api/projects/:id`. Phân khu `community` chỉ liệt kê thiết kế có `fitcheckScore ≥ 90` (FitCheck phía server); thiết kế chưa đạt vẫn xem được qua link công khai. Thẻ cộng đồng có `fitcheckScore`.
- Mẫu Curated hiện được quản lý bằng seed (`be/prisma/seed.ts`) / Prisma Studio; chưa có API quản trị.

### Bộ sưu tập (IT3-05)

- Chỉ thấy và sửa được thư mục của chính mình; thư mục của người khác trả `404`. Tối đa 100 thư mục / người (`409`).
- `colorTag` dạng `#RRGGBB`, mặc định `#D4A373` (kraft). `title` ≤ 100 ký tự, `description` ≤ 500 (dùng để ghi chú thời hạn chiến dịch).
- `projectCount` không tính dự án trong thùng rác.
- Đưa dự án vào / ra thư mục (kéo thả): `PATCH /api/projects/:id { "collectionId": "<id>" | null }`. Xem dự án trong thư mục: `GET /api/projects?collectionId=<id>`.

### Dự án: vòng đời, nhân bản & phiên bản (IT3-04)

- **Trạng thái**: chuyển tự do giữa `ACTIVE`, `ARCHIVED`, `DELETED`. Vào thùng rác thì ghi `deletedAt`; rời thùng rác thì xóa `deletedAt`. Gửi lại đúng trạng thái hiện tại không thay đổi gì (không đặt lại `deletedAt`). Đổi trạng thái không đổi `version`.
- **Thùng rác 30 ngày**: cron `trash-purge` chạy 02:00 (giờ Việt Nam) mỗi ngày, xóa vĩnh viễn dự án có `deletedAt` quá 30 ngày cùng snapshot, like, export… (cascade) và các file đã gắn `projectId` trên S3 / R2 (theo lô 500 dự án mỗi lần chạy). Dự án mà một đơn còn giữ thiết kế được bỏ qua (xem "Giới hạn xóa dự án"). Hạn xóa = `deletedAt + 30 ngày` (FE tự tính để hiển thị).
- **Dự án trong thùng rác chỉ đọc**: sửa, nhân bản, xuất file, lưu hay khôi phục mốc phiên bản đều trả `409` cho tới khi khôi phục dự án.
- **Nhân bản**: chép `template`, `dimensions`, `materialSpec`, `canvasState`, thư mục và tags; bản sao luôn `ACTIVE`, `PRIVATE`, có `id`/`slug` mới, **không** chép `thumbnailUrl` (file thuộc dự án gốc) và không đặt `forkedFromId` (chỉ dùng cho Remix).
- **Mốc phiên bản**: lưu `canvasState` + `dimensions` hiện tại, tối đa 50 mốc thủ công mỗi dự án (`409` khi đầy — xóa bớt mốc cũ); mốc tự động (bản xuất in, sao lưu trước khi khôi phục) không tính vào giới hạn, giữ 20 bản mới nhất. Khôi phục chạy trong 1 transaction: khóa dòng dự án, lưu trạng thái hiện tại thành mốc `Trước khi khôi phục: <tên>` rồi chép mốc đã chọn vào dự án; FE dùng `backup.id` để "Hoàn tác". Mốc của dự án khác trả `404`.

```json
// POST /api/projects
{ "templateId": "tuck-top", "title": "Hộp nến thơm", "dimensions": { "length": 120, "width": 80, "height": 60 }, "tags": ["tet"] }

// 400 khi kích thước ngoài khoảng của mẫu
{ "statusCode": 400, "error": "Bad Request", "message": ["dimensions.length must not be less than 40"], "path": "/api/projects", "timestamp": "…" }
```

---

## 3. Endpoints chưa triển khai

Đối chiếu ngày 2026-11-19: mọi route trong controller đã nằm ở bảng mục 2, không còn route nào "sắp triển khai" trong mục này. Các route theo kế hoạch nhưng chưa có mã (hóa đơn, workspace, dùng thử) nằm ở [16 · Đề xuất còn chờ](16_PRICING_ENTITLEMENTS_SPEC.md#phần-c-đề-xuất-còn-chờ) và [07, Mục 4.2 – 4.3](07_SYSTEM_BLUEPRINT_AND_TASK_BREAKDOWN.md).

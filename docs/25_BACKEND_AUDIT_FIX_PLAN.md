# 25. Kế hoạch sửa backend sau audit

> Ngày lập: 2026-11-15 · Nhánh gốc: `feat/studio-editor-pro` (23cb2af) · Nhánh làm: `fix/be-audit` · Trạng thái: **S0, S4, S5, S7 xong**; S1, S2, S3, S6 chờ Q1–Q6
> Phạm vi: `be/` và phần `shared/` mà backend dùng. Frontend chỉ đụng khi một session ghi rõ.
> Nguồn: audit `feat/payment-gateways` (8b95adf, mục 1–15) và audit phần code mới của `feat/studio-editor-pro` (23 commit, mục 16–23).

## 1. Hiện trạng

Kiến trúc: modular monolith NestJS 11, hai process (API + worker BullMQ), Prisma + PostgreSQL, Redis. Module nhỏ đi phẳng `controller → service → Prisma`; `projects/` đi 4 tầng. Kiến trúc đạt, không cần đổi cấu trúc.

Code mới của nhánh (so với 8b95adf): module `reviews` (link duyệt mẫu công khai), ảnh kho Pexels (`library/stock-photos.service.ts`), phông tải lên (`FilePurpose.FONT`, `POST /storage/fonts/inspect`), công cụ AI trên ảnh tải lên, hiệu ứng bóng đổ / blend trong renderer in, ngành Đồ uống + khuôn `cup-carrier`, 4 migration.

Các file của mục 1–15 **không đổi** giữa hai nhánh, nên 15 mục cũ còn nguyên.

Mốc test trên nhánh này (2026-11-15, sau `db:generate` và build `shared`): **1063 pass, 1 fail** (67 bộ). Ca fail là mục 16. E2E chưa chạy.

Lưu ý môi trường: sau khi đổi nhánh phải chạy lại hai lệnh dưới, nếu không test không biên dịch (Prisma client cũ, `shared/dist` cũ).

```bash
npm --workspace=be run db:generate
npm --workspace=shared run build
```

## 2. Danh sách việc

Số giữ nguyên theo báo cáo audit để dễ tra. Mức: **M** = phải sửa, **S** = nên sửa, **N** = làm thì tốt.

### 2.1 Từ audit cũ (1–15)

| # | Mức | Việc | Vị trí | Session |
|---|---|---|---|---|
| 1 | M | Mã `WORKSHOPTET` dùng vô hạn: mỗi lần là một đơn in miễn phí chuyển thẳng `PAID` và mở khóa file in | `be/src/orders/orders.service.ts:119`, `shared/src/billing/promo.ts:15` | S1 |
| 2 | M | Webhook SePay nuốt lỗi 409 sau khi `confirmPaid` đã ghi `PAID` (đơn đã hủy): payment `PAID` mà không cấp gì, không gán lại được | `be/src/payments/sepay/sepay-webhook.service.ts:153`, `be/src/payments/payments.service.ts:283` | S1 |
| 3 | M | Admin xóa user thì cascade xóa `payments`, `orders`, `credit_lots` (kể cả đơn `IN_PRODUCTION`) | `be/src/users/users.service.ts:199`, `be/prisma/schema.prisma` | S2 |
| 4 | S | Mọi lần lưu (đổi tên, tag, thumbnail) đều tăng `version`: khóa lại file in đã trả tiền **và làm mất trạng thái "Đã duyệt in"** của module `reviews` | `be/src/projects/infrastructure/prisma-project.repository.ts:141`, `be/src/export/export.service.ts:186`, `be/src/reviews/reviews.service.ts:54` | S3 |
| 5 | S | Admin gán giao dịch đọc trạng thái payment trước khi khóa dòng: khoản chuyển thứ hai bị đánh `RESOLVED` dù không cấp gì | `be/src/payments/admin/bank-transactions.service.ts:169` | S1 |
| 6 | S | `PAYMENT_SIMULATION=true` cho mọi tài khoản tự xác nhận payment VietQR thật | `be/src/payments/payments.service.ts:264`, `be/src/config/env.validation.ts` | S2 |
| 7 | S | Gói lượt xuất `EXPORT_1/5/15` vẫn bán nhưng không còn chỗ tiêu; code chết `useCredit`, `charged`, nhánh watermark, mô tả Swagger cũ | `be/src/payments/payments.service.ts:318`, `be/src/export/export.service.ts:123`, `be/src/export/export.controller.ts:21` | S6 |
| 8 | S | Gateway WebSocket không ai gọi `emitToUser` / `emitToAll`; event `project.forked` và `export.completed` không có listener | `be/src/events/events.gateway.ts:95`, `be/src/export/export.processor.ts:158` | S6 |
| 9 | S | Module Cloudinary, SDK và 4 biến môi trường không dùng; bảng `SocialMockup` không code nào đọc | `be/src/shared/cloudinary/`, `be/prisma/schema.prisma` | S6 |
| 10 | N | Mã đơn `WF-<năm>-<4 số>` chỉ có 10.000 giá trị mỗi năm | `be/src/orders/orders.service.ts:327` | S7 |
| 11 | N | Con trỏ phân trang chỉ theo `createdAt`: bỏ sót dòng trùng mili giây | `be/src/payments/admin/bank-transactions.service.ts:113`, `be/src/payments/payments.service.ts:214` | S7 |
| 12 | N | `detachSharedFiles` quét cả bảng `project_file_refs` | `be/src/storage/storage.service.ts:347` | S7 |
| 13 | N | Hoa văn AI: process chết giữa lúc trừ xu và gọi Claude thì mất xu, không có task dọn | `be/src/ai/ai-pattern.service.ts:50` | S7 |
| 14 | N | Throttler, cầu chì chi phí AI, Socket.IO giữ trạng thái trong bộ nhớ từng process | `be/src/common`, `be/src/ai/ai-cost.guard.ts` | Hoãn (§5) |
| 15 | N | Cookie chưa có tiền tố `__Secure-`; logout chưa gửi `Clear-Site-Data` | `be/src/auth/auth-cookie.service.ts:52` | S7 |

### 2.2 Từ code mới của nhánh (16–23)

| # | Mức | Việc | Vị trí | Session |
|---|---|---|---|---|
| 16 | M | **CI đỏ**: `ANALYTICS_BOX_TYPES` thêm `cup-carrier` nhưng test vẫn chờ 10 khuôn và thiếu `cup-carrier` trong danh sách. Job unit test fail, deploy bị chặn | `be/src/analytics/analytics-stats.spec.ts:91`, `shared/src/analytics/summary.ts:14` | S0 |
| 17 | S | Nhập ảnh kho không kiểm quota, không có giới hạn tần suất riêng. `putGeneratedFile` ghi thẳng, nên một tài khoản gọi 100 lần/phút (giới hạn chung) là thêm tới 1,5 GB/phút vào R2. Ảnh gốc còn được tải trọn vào bộ nhớ và giải mã bằng `sharp` ngay trong process API, không giới hạn dung lượng tải | `be/src/library/stock-photos.service.ts:68`, `be/src/library/library.controller.ts:29`, `be/src/storage/storage.service.ts:189` | S4 |
| 18 | S | Tìm ảnh kho gọi Pexels mỗi request, không cache, không giới hạn riêng. Khóa Pexels dùng chung cả hệ thống (hạn mức mặc định theo giờ, cần đọc lại điều khoản khi làm): một người cuộn nhiều là tắt ảnh kho của mọi người | `be/src/library/stock-photos.service.ts:57` | S4 |
| 19 | S | `svgImages` giải nén ảnh cắt / có bộ lọc ở **độ phân giải gốc** thành RGBA thô rồi nhúng PNG base64 vào SVG. Ảnh 48 MP là khoảng 190 MB thô cộng chuỗi base64, trong khi worker được tính cho heap 384 MB. Đường PDF đã hạ về `MAX_EMBED_DPI`, đường SVG thì chưa. Chưa tái hiện bằng file thật | `be/src/export/rendering/print-renderers.ts:291`, `be/src/export/export.processor.ts:22` | S5 |
| 20 | N | Link duyệt mẫu: chưa có e2e cho 3 endpoint công khai; `assertRoom` đếm rồi mới ghi (hai request cùng lúc vượt 500); khách cầm link ghi đủ 500 góp ý thì chủ dự án không trả lời được cho tới khi xóa bớt | `be/src/reviews/reviews.service.ts:157`, `be/src/reviews/reviews.controller.ts` | S5 |
| 21 | N | Token duyệt mẫu nằm trong URL nên bị ghi nguyên vào log truy cập (`request.originalUrl`) | `be/src/common/interceptors/logging.interceptor.ts:27` | S5 |
| 22 | N | Phông tải lên: `missingVietnamese` chạy ngoài `try`, file phông hỏng bảng `cmap` trả 500 thay vì 422 `FONT_UNREADABLE`. Server không bắt buộc phông trong canvas đã qua kiểm dấu, nên phông thiếu dấu vẫn lưu được và in ra ô vuông. Chưa tái hiện bằng file thật | `be/src/storage/storage.service.ts:282`, `be/src/export/rendering/print-renderers.ts:162` | S5 |
| 23 | N | Dọn nhỏ: comment lặp hai dòng trong `loadArtwork`; `ApproveDto.version` dùng `IsNumber` thay vì `IsInt` | `be/src/export/export.processor.ts:173`, `be/src/reviews/dto/review.dto.ts` | S5 |

Đã kiểm và **không có vấn đề**: quyền sở hữu ở `reviews` (owner sau `ProjectOwnerGuard`, khách theo token 144 bit, 404 cho link tắt / dự án trong thùng rác); công cụ AI trên ảnh tải lên (chỉ file `IMAGE` / `LOGO` của chính người dùng, trừ xu và hoàn xu như cũ); phông trong canvas chỉ nhận file tải lên của WrapFit; renderer rơi về phông in sẵn khi file phông không mở được; DTO canvas mới có giới hạn cho mọi mảng và số.

## 3. Quyết định cần chốt trước

Session ghi ở cột cuối không bắt đầu được khi chưa có câu trả lời. Cột "Mặc định" là hướng sẽ làm nếu không ai phản đối.

| # | Câu hỏi | Mặc định | Chặn |
|---|---|---|---|
| Q1 | `WORKSHOPTET` giới hạn thế nào? | Một lần cho mỗi tài khoản, không tính đơn đã hủy | S1 |
| Q2 | Admin xóa user đã có payment `PAID` hoặc có đơn in: chặn hay ẩn danh hóa? | Chặn bằng 409, dùng khóa tài khoản thay cho xóa | S2 |
| Q3 | Lưu tên / tag / thumbnail có tăng `version` không? | Không. Chỉ `canvasState`, `dimensions`, `materialSpec` đổi mới tăng | S3 |
| Q4 | Gói lượt xuất: ngừng bán hay làm lại chỗ tiêu? Số dư `EXPORT` khách đã mua xử lý thế nào? | Ngừng bán, đổi số dư còn lại sang xu theo giá đã trả | S6 |
| Q5 | Thông báo remix cho tác giả: làm thật hay bỏ event? | Bỏ hai dòng `emit`, giữ gateway (đang dùng cho đóng phiên) | S6 |
| Q6 | Xóa Cloudinary và bảng `social_mockups`? | Xóa module + SDK + biến môi trường. Bảng chỉ xóa sau khi kiểm production không có dòng nào | S6 |
| Q7 | Sửa trên nhánh nào? | `fix/be-audit` cắt từ `feat/studio-editor-pro`, mỗi session một commit | S0 |

## 4. Các session

Làm **tuần tự** S0 → S7. S1, S2 cùng đụng `payments.service.ts`; S4, S5, S7 cùng đụng `storage.service.ts`, nên không chạy song song.

Mỗi session kết thúc bằng:

```bash
npm --workspace=be run lint
```

```bash
npm --workspace=be test
```

```bash
graphify update .
```

Session có ghi "e2e" thì chạy thêm lệnh dưới (cần Postgres, Redis, SeaweedFS từ `docker-compose.yml`):

```bash
npm --workspace=be run test:e2e
```

### S0. Chuẩn bị, đưa CI về xanh (mục 16)

- Cắt nhánh theo Q7. Chạy `db:generate` và build `shared`.
- Sửa `analytics-stats.spec.ts`: thêm `{ type: 'cup-carrier', count: 0 }` sau `gable`, đổi `toHaveLength(10)` thành `11`.
- Chạy e2e một lần để có mốc trước khi sửa luồng tiền.
- **Xong khi:** unit test 1064/1064, có kết quả e2e ghi vào §6.

### S1. Luồng tiền (mục 1, 2, 5) · cần Q1 · e2e

- **Mục 1.** Trong transaction tạo đơn, khóa theo user (`pg_advisory_xact_lock` như `storage.service.ts:148`), đếm đơn chưa hủy của user có cùng `promoCode`; có rồi thì 400 `PROMO_ALREADY_USED`. Phải khóa, vì đếm rồi ghi không khóa thì hai request cùng lúc đều qua.
- **Mục 2.** Trong `confirmPaid`, với `SAMPLE_ORDER`: kiểm đơn còn `PENDING_PAYMENT` **trước** khi update payment; đơn đã hủy thì ném lỗi có `code` riêng (`ORDER_NOT_PAYABLE`) khi chưa ghi gì. Webhook chỉ nuốt lỗi có `code === 'PAYMENT_EXPIRED'`; `ORDER_NOT_PAYABLE` thì ghi giao dịch `UNMATCHED` với lý do riêng để admin thấy tiền đã về cho đơn đã hủy. Sửa comment sai ở dòng 157.
- **Mục 5.** Trong `assign`: `SELECT … FOR UPDATE` payment trước khi đọc `status`, giống webhook service.
- Kiểm mọi nơi gọi `confirmPaid` (webhook SePay, IPN + return VNPay, simulate, admin assign) còn đúng với lỗi mới.
- **Test:** promo dùng lần hai bị từ chối; hai request promo song song chỉ một cái qua (e2e); webhook cho đơn đã hủy để lại payment `PENDING`; assign đua với webhook không đánh `RESOLVED` khoản thừa.
- **Xong khi:** 4 test trên đạt, e2e `admin-bank-transactions` và các e2e payment cũ vẫn đạt.

### S2. An toàn dữ liệu và cấu hình (mục 3, 6) · cần Q2

- **Mục 3.** `UsersService.remove`: 409 `USER_HAS_FINANCIAL_HISTORY` khi user có payment `PAID` hoặc có bất kỳ đơn nào. Không đổi `onDelete` trong schema ở session này.
- **Mục 6.** `env.validation.ts`: từ chối khởi động khi `NODE_ENV=production`, `PAYMENT_SIMULATION=true` và `VIETQR_*` thật đã cấu hình. `simulateConfirm` thêm kiểm `user.isDemo` khi payment là VietQR. Cập nhật comment `docker-compose.prod.yml:6` và `be/.env.example`.
- **Test:** xóa user có payment `PAID` trả 409; user trắng vẫn xóa được; cấu hình sai không khởi động; tài khoản thường gọi `simulate-confirm` bị từ chối.
- **Xong khi:** 4 test trên đạt. Ghi vào §6 việc phải kiểm `.env` trên VPS trước khi deploy.

### S3. `version` chỉ tăng khi nội dung đổi (mục 4) · cần Q3

- `PrismaProjectRepository.updateContent`: chỉ `version: { increment: 1 }` khi `changes` có `canvasState`, `dimensions` hoặc `materialSpec`. Compare-and-set trên `version` giữ nguyên cho mọi lần lưu.
- `ProjectsService.update`: lần lưu chỉ có metadata trả về `version` cũ.
- Kiểm phía FE (chỉ đọc, sửa nếu cần): autosave có giả định `version` luôn tăng sau mỗi PATCH không. Tìm trong `fe/src` chỗ dùng `PROJECT_VERSION_CONFLICT`.
- Kiểm snapshot tự động (`pruneAutomaticSnapshots`) và `order_items.project_version` không dựa vào việc metadata tăng version.
- **Test:** đổi tên không tăng `version`; đổi canvas tăng 1; sau đơn `PAID` ở version n, đổi tên rồi xuất file vẫn mở khóa; duyệt in ở version n, đổi thumbnail thì `approval.current` vẫn `true`.
- **Xong khi:** 4 test trên đạt, e2e `projects` đạt.

### S4. Ảnh kho Pexels (mục 17, 18)

- **Mục 17.** `import`: thêm `@Throttle` riêng (10 lần/phút). Kiểm quota trước khi tải: tách phần khóa + `assertQuota` của `presignUpload` thành một hàm dùng chung trong `StorageService`, gọi với kích thước sau khi nén. Giới hạn dung lượng tải về: đọc `Content-Length`, từ chối trên 60 MB, và ngắt khi stream vượt ngưỡng. Chỉ tải từ host `images.pexels.com`.
- **Mục 18.** `search`: `@Throttle` riêng (30 lần/phút). Cache kết quả trong Redis theo `(q, page)`, 10 phút cho tìm kiếm, 1 giờ cho ảnh chọn lọc. Đọc lại hạn mức và điều khoản API Pexels trước khi chọn số.
- Không chuyển việc nhập ảnh sang worker ở session này: sau khi có giới hạn tần suất và dung lượng thì một process API chịu được. Ghi `shortcut:` trong code nếu giữ `sharp` ở API.
- **Test:** nhập khi hết quota trả 403 và không ghi file; ảnh quá ngưỡng bị từ chối; URL ngoài host cho phép bị từ chối; tìm hai lần cùng từ khóa chỉ gọi Pexels một lần.
- **Xong khi:** 4 test trên đạt. Thử tay với khóa Pexels thật (docs/23 ghi là chưa thử).

### S5. Export SVG, phông, link duyệt mẫu (mục 19–23) · e2e

- **Mục 19.** `svgImages`: hạ ảnh về số pixel ứng với `MAX_EMBED_DPI` ở kích thước in trước khi lấy RGBA thô, dùng lại cách tính của đường PDF (`pixelsFor`). Tạo một ảnh 8000×6000 có bộ lọc để đo bộ nhớ trước và sau.
- **Mục 22.** Đưa `missingVietnamese` và `cleanFamilyName` vào trong `try` của `inspectFont`. Trong `textOutlines`: chữ có ký tự mà phông tải lên không vẽ được thì rơi về phông in sẵn cho phần tử đó (cùng đường lui đã có cho file hỏng), và ghi cảnh báo vào log export.
- **Mục 20.** Thêm `be/test/e2e/reviews.e2e-spec.ts`: link tắt trả 404, khách góp ý, duyệt đúng version, 409 `DESIGN_CHANGED`. Góp ý của chủ dự án không tính vào trần 500 (đếm riêng dòng có `authorUserId IS NULL`), để khách không chặn được chủ dự án. Vượt trần vài dòng khi đua thì chấp nhận, ghi `shortcut:`.
- **Mục 21.** `LoggingInterceptor`: che token trong đường dẫn `/api/review/<token>` (giữ 4 ký tự đầu).
- **Mục 23.** Xóa comment lặp; `IsInt` cho `ApproveDto.version`.
- **Xong khi:** e2e `reviews` đạt, test phông hỏng trả 422, log không còn token đầy đủ, số đo bộ nhớ ghi vào §6.

### S6. Dọn code chết (mục 7, 8, 9) · cần Q4, Q5, Q6

- **Mục 7 (theo Q4).** `priceOf` từ chối `EXPORT_*` với 400. Xóa `useCredit`, `charged`, nhánh watermark, sửa mô tả Swagger. FE: gỡ gói lượt xuất khỏi bảng giá và checkout (`fe/src/features/pricing/plans.ts`, `fe/src/components/pricing/content.ts`, `fe/src/views/checkout/step-1`, mock API). Số dư `EXPORT` còn lại: script một lần trong `be/prisma/scripts/`, chạy thử trên bản sao dữ liệu trước.
- **Mục 8 (theo Q5).** Xóa `emit` của `PROJECT_FORKED` và `EXPORT_COMPLETED` cùng hằng số, sửa comment "notifies the author". Giữ gateway và kênh đóng phiên.
- **Mục 9 (theo Q6).** Xóa `be/src/shared/cloudinary/`, import trong `app.module.ts`, gói `cloudinary`, 4 biến trong `env.validation.ts` / `envs/default.ts` / `.env.example`, phần dùng trong `storage-check.ts`. Bảng `social_mockups`: migration xóa bảng viết riêng, chỉ chạy sau khi đếm dòng trên production bằng 0.
- **Xong khi:** `grep` không còn `cloudinary`, `useCredit`, `PROJECT_FORKED` trong `be/src`; build và test đạt; FE build đạt.

### S7. Việc nhỏ (mục 10, 11, 12, 13, 15)

- **Mục 10.** Mã đơn 6 chữ số. Kiểm ràng buộc `CHECK` trong `be/prisma/migrations/20261030000300_orders/migration.sql` và các chỗ FE hiển thị / so khớp mã (`PackagingSpecSheet.tsx`, `views/admin/ledger`), viết migration nới ràng buộc nếu có.
- **Mục 11.** Con trỏ `(createdAt, id)` cho `BankTransactionsService.list` và `PaymentsService.listMine`.
- **Mục 12.** `detachSharedFiles`: lọc subquery theo file của các dự án đang xóa.
- **Mục 13.** Hoa văn AI: bọc lời gọi Claude sao cho lỗi nào cũng hoàn xu, và thêm dọn các lần trừ xu `AI_PATTERN` không có kết quả sau 10 phút vào task reconcile đã có của ảnh AI.
- **Mục 15.** Tiền tố `__Secure-` cho cookie ở production (đọc cả tên cũ trong một bản phát hành để phiên đang mở không bị đăng xuất). `Clear-Site-Data: "cookies"` khi logout; không gửi `"storage"` vì FE giữ bản nháp trong trình duyệt.
- **Xong khi:** mỗi mục có một test, e2e auth đạt.

## 5. Không làm trong plan này

- **Mục 14** (trạng thái trong bộ nhớ từng process): đúng với một API + một worker. Làm khi chuẩn bị chạy từ hai instance API: Redis storage cho throttler, Redis adapter cho Socket.IO, cầu chì AI đọc thẳng DB.
- **Tầng application của `projects` import DTO của presentation và hàm của `storage`**: lệch kiến trúc nhưng chưa gây lỗi. Sửa khi lần tới phải đổi `projects.service.ts` vì lý do khác.
- **7 module đọc bảng `packaging_projects` trực tiếp**: giữ. Thêm port đọc chung khi có module thứ hai cần cùng một quy tắc lọc (ví dụ "dự án chưa xóa của user").
- Không audit: `fe/`, `export/rendering/*` ngoài phần ghi ở mục 19 và 22, `prisma/seed*`, Dockerfile, script deploy.

## 6. Nhật ký

| Ngày | Session | Commit | Ghi chú |
|---|---|---|---|
| 2026-11-15 | Audit | — | Lập plan. Mốc unit test: 1063/1064 (fail: mục 16). E2E chưa chạy. |
| 2026-11-16 | S0 | xem git log | Cắt `fix/be-audit` từ 23cb2af. Sửa `analytics-stats.spec.ts` (mục 16). Lint fail sẵn trên 23cb2af (`matchesPanel` import thừa trong `export/rendering/print-layout.ts`, vẫn re-export): bỏ khỏi dòng import, lint qua. Unit test: **1064/1064** (67 bộ). Phải `db:deploy` 4 migration của nhánh vào DB local trước e2e. Mốc e2e: **238/241** (20 bộ, 2 bộ fail), chưa sửa: `export.e2e-spec.ts` › "renders SVG and DXF too" (SVG giờ bọc artwork trong `<g clip-path>`, regex `/<g id="artwork"[^>]*><path d="M /` không khớp) và › "keeps a snapshot of each export and lists the history" (chỉ có snapshot SVG + PDF_CMYK, thiếu DXF); `analytics.e2e-spec.ts` › "starts empty…" (test chờ 4 khuôn, API trả 11, cùng gốc với mục 16). |
| 2026-11-16 | S4 | xem git log | Mục 17: `import` có `@Throttle` 10/phút; kiểm quota trước khi tải (`StorageService.assertQuota`, giờ public, không khóa) rồi giữ chỗ bằng kích thước sau khi nén qua hàm mới `StorageService.reserveUpload` (khóa advisory + `assertQuota` + ghi dòng `stored_files` chờ, `presignUpload` dùng chung). Khóa nhả khi transaction xong nhưng dòng chờ đã tính vào dung lượng, nên hai lần nhập song song không cùng lọt; ghi file xong thì `putGeneratedFile` xác nhận dòng (cùng key), ghi lỗi thì `StorageMaintenanceTask` (chạy 10 phút/lần, xét dòng chờ cũ hơn `CONFIRM_UPLOADS_AFTER_MS` = 15 phút) xóa dòng sau 15–25 phút; nếu lúc đó không gọi được storage thì dòng được giữ lại và vẫn tính vào quota tối đa `PENDING_UPLOAD_RESERVE_MS` = 60 phút. Tải ảnh: chỉ `https://images.pexels.com` (so host chính xác), `redirect: 'error'` (CDN trả ảnh gốc trực tiếp, đã thử bằng `curl -I`), từ chối `Content-Length` > 60 MB và ngắt stream khi số byte nhận vượt 60 MB (422 `STOCK_PHOTO_TOO_LARGE`). Giữ `sharp` trong API, có `shortcut:`. Mục 18: `search` có `@Throttle` 30/phút; cache Redis (client `REDIS` sẵn có) theo từ khóa chuẩn hóa (NFC, gộp khoảng trắng, chữ thường) + trang, 10 phút cho tìm kiếm, 1 giờ cho ảnh chọn lọc, thêm 1 giờ cho tra ảnh theo id khi nhập; Redis lỗi thì gọi thẳng Pexels. Điều khoản Pexels (pexels.com/api/documentation, đọc 2026-11-16): mặc định 200 request/giờ, 20.000/tháng cho cả khóa, quá thì 429; cấm lách giới hạn; phải có link Pexels nổi bật và ghi công tác giả khi có thể; không có điều khoản nào về cache. Cache không phải lách giới hạn nên giữ số của plan; giới hạn 30/phút tính theo IP nên vẫn không bảo vệ được ngân sách 200/giờ chung, cần xin Pexels nâng hạn mức trước khi mở rộng. Điều khoản chung (pexels.com/terms-of-service, mục 5) cấm bán ảnh ở dạng gần như nguyên bản, kể cả in lên hàng hóa: một thiết kế chỉ gồm một ảnh kho phủ kín có thể vướng, chủ dự án nên xem lại (ngoài phạm vi code). Unit test: **1073/1073** (67 bộ, thêm 9 test). Lint qua. E2E `storage.e2e-spec.ts` 17/17. Thử tay với khóa thật: **chưa chạy**, `be/.env` không có `PEXELS_API_KEY`. **Bổ sung (commit thứ hai, theo review):** throttle theo client chưa giữ được ngân sách 200/giờ chung của khóa, nên thêm ngân sách lượt gọi Pexels trong Redis, chỉ đếm lần gọi thật (cache miss của search, curated và tra ảnh khi nhập; kết quả đã cache vẫn miễn phí). Mỗi user 30 lần/giờ (một phiên studio hụt cache khoảng 20 lần; 6 user chạm trần vẫn nằm trong mức chung), cả khóa 180 lần/giờ (chừa 20 cho các request lọt qua cùng lúc và cho e2e / thử tay). Cửa sổ trượt 1 giờ (bộ đếm giờ hiện tại + giờ trước có trọng số), nên ngân sách không hồi lại một lúc khi sang giờ mới. Vượt thì 429 `STOCK_RATE_LIMITED` kèm `retryAfterSeconds`; `AllExceptionsFilter` giờ gửi thêm header `Retry-After` cho mọi 429 có trường này. Pexels trả 429 cũng thành `STOCK_RATE_LIMITED` và đánh dấu cả khóa đã hết cho giờ hiện tại. Redis lỗi thì cho gọi (fail open). Kiểm rồi ghi là hai lượt Redis nên có thể lố vài lần khi đua, ghi `shortcut:`. Hạn mức tháng (20.000) chưa canh. Unit test: **1083/1083** (68 bộ, thêm 8 test ngân sách + 2 test filter). Lint qua. E2E `auth` 19/19. |
| 2026-11-16 | S5 | xem git log | **Mục 19.** `svgImages` hạ ảnh cắt / có bộ lọc về `MAX_EMBED_DPI` (450) ở kích thước in trước khi lấy RGBA thô, cùng cách tính với đường PDF (tách `cropRegion` và `embedWidth` dùng chung, `embedWidth` = `min(pixel nguồn, pixelsFor(mm in, 450))`, không phóng to). Đo bằng ảnh JPEG 8000×6000 (22,4 MB) đặt 100×50 mm, cắt 90 %, `brightness` + `contrast`, chạy `svgImages` + `renderSvg` + `Buffer.from` như worker, process riêng với `--max-old-space-size=384`, mỗi bên 2 lần (nền sau khi nạp module: RSS ~340 MB, heap 84 MB). **Trước:** nhúng 7200×3600, SVG 99 MB, RSS đỉnh 811–818 MB, heap đỉnh 182–184 MB, bộ nhớ ngoài heap (`external`) đỉnh 400 MB, 1,7 s. **Sau:** nhúng 1772×886, SVG 5 MB, RSS đỉnh 463–477 MB, heap đỉnh 95 MB, `external` 52 MB, 0,35 s. Trần heap 384 MB không bị chạm vì RGBA thô và PNG là `Buffer` (nằm ngoài heap V8); rủi ro thật là RSS: +~470 MB mỗi job trước, +~125 MB sau (phần lớn do libvips giải mã ảnh 48 MP), với `EXPORT_CONCURRENCY` = 2 đường cũ có thể lên ~1,3 GB. **Mục 22.** `inspectFont`: `missingVietnamese` và `cleanFamilyName` vào trong `try`, phông hỏng `cmap` trả 422 `FONT_UNREADABLE` (test dùng file Playfair thật, sửa offset mọi bảng con của `cmap` trỏ ra ngoài file: fontkit mở được, lần tra glyph đầu tiên ném `RangeError`, trước đây thành 500). `textOutlines`: chữ có ký tự phông tải lên không vẽ được (hoặc `cmap` không đọc được) thì cả phần tử dàn trang và vẽ lại bằng phông in sẵn, đúng đường lui của file phông hỏng; ghi `warn` của logger `PrintRenderers` vào log export (có request id của job), mỗi cặp phông + nội dung một lần cho một lần render. **Mục 20.** Thêm `be/test/e2e/reviews.e2e-spec.ts` (6 ca: mở link, link lạ / sai dạng 404, khách góp ý, duyệt đúng version, 409 `DESIGN_CHANGED`, version lẻ 400, chủ dự án trả lời khi khách đã đủ 500, log không có token, tắt link thì cả 3 endpoint 404). Trần 500 giờ tính riêng cho góp ý của khách (`authorUserId IS NULL`) và cho góp ý của chủ dự án (cũng 500, để vẫn có giới hạn); hai màn xem đọc tối đa 1000 dòng (`MAX_COMMENTS_SHOWN`), nếu không thì câu trả lời thứ 501 của chủ dự án không hiện. Đua giữa đếm và ghi: chấp nhận, ghi `shortcut:` ở `assertRoom`. **Mục 21.** Hàm mới `loggableUrl` (`be/src/common/utils/log-url.util.ts`) che token trong `/api/review/<token>` (giữ 4 ký tự đầu, thêm `***`), dùng ở `LoggingInterceptor` và dòng log lỗi 5xx của `AllExceptionsFilter` (trước ghi `request.url`). Trường `path` trong body lỗi trả cho client không đổi (client đã cầm token). Không còn logger nào khác ghi URL. **Mục 23.** Xóa comment lặp trong `loadArtwork`; `ApproveDto.version` dùng `IsInt`. **Ba e2e fail cũ:** (1) `export` › "renders SVG and DXF too": test cũ, SVG bọc mỗi phần tử trong `<g clip-path>` của mặt hộp; sửa regex cho phép nhóm bọc. (2) `export` › "keeps a snapshot…": không phải lỗi code; export DXF nằm trong ca (1), sau dòng assert SVG fail nên DXF chưa từng chạy; worker vẫn tạo snapshot cho mọi định dạng; sửa (1) là ca này qua, không đổi test. (3) `analytics` › "starts empty…": test cũ (cùng gốc mục 16); giờ so với `ANALYTICS_BOX_TYPES` của `@wrapfit/shared` và giữ thứ tự 4 khuôn đầu. Unit test: **1092/1092** (69 bộ, thêm 9 test). Lint qua. E2E: **247/247** (21 bộ, thêm 6 test `reviews`). |
| 2026-11-16 | S7 | xem git log | **Mục 10.** Mã đơn mới `WF-<năm>-<6 số>` (`newOrderCode`, giờ export), 1.000.000 mã mỗi năm. Trùng mã: giữ cách cũ, unique index `orders_order_code_key` bắt lỗi P2002 (kể cả hai request cùng lúc) rồi thử lại tối đa 8 lần. Migration mới `20261116000100_order_code_six_digits` thay `chk_orders_order_code` thành `^WF-[0-9]{4}-([0-9]{4}\|[0-9]{6})$`: mã 4 số cũ vẫn hợp lệ, 5 hay 7 số bị chặn. Không chỗ nào parse mã đơn: backend không có DTO / regex nào cho mã đơn, `shared/` không có; FE chỉ hiển thị và tìm kiếm dạng chuỗi (`views/admin/print-shops`, `views/dashboard/orders`, `views/cart`). Nội dung chuyển khoản SePay / VietQR dùng mã thanh toán `WF` + 6 ký tự (`PAYMENT_REFERENCE_PATTERN`), không dùng mã đơn, nên không đổi. `PackagingSpecSheet.tsx` (`WF-001`) và `views/admin/ledger` (`WF-24081`…) là chữ trang trí / dữ liệu demo, không đọc mã thật; mock API FE vẫn sinh 4 số, không hỏng. Không sửa FE. **Mục 11.** Con trỏ `(created_at, id)` dùng chung (`be/src/common/utils/page-cursor.util.ts`): `nextBefore` giờ là `<ISO>_<uuid>`, `ORDER BY created_at DESC, id DESC` (`listMine` trước chỉ theo `createdAt`). Điều kiện `created_at <= t AND (created_at < t OR id < id_t)` (phần `<=` để quét được index `(user_id, created_at)` / `(status, created_at)`). Con trỏ cũ (chỉ có ngày) vẫn nhận, đọc như trước (dòng cũ hơn hẳn); giá trị khác trả 400 qua `@IsPageCursor` trên `before` của hai DTO (trước là `@IsDate`). Dạng response không đổi. FE coi `nextBefore` là chuỗi mờ và gửi lại qua `URLSearchParams` (`fe/src/api/payments`, `fe/src/api/admin/bank-transactions.ts`), không cần sửa. **Mục 12.** Subquery `heir` của `detachSharedFiles` thêm `r.stored_file_id IN (SELECT id FROM stored_files WHERE project_id = ANY(...))`: chỉ đọc ref của file thuộc các dự án đang xóa (index `stored_files_project_id_idx` rồi `project_file_refs_stored_file_id_idx`), kết quả như cũ. Đo bằng bảng tạm cùng index (50.000 dự án, 250.000 file, 275.000 ref, xóa 2 dự án): trước Seq Scan cả `project_file_refs` + sort ra đĩa 17 MB, 135 ms; sau chỉ Index Scan, 0,16 ms; cả hai cập nhật đúng 1 dòng. **Mục 13.** Liên kết có sẵn: `ai_generations.debit_operation_id`. Quy tắc mới: một lần trừ `AI_PATTERN` coi là đã dùng khi và chỉ khi có dòng `ai_generations` mang `operation_id` của nó. `generate` ghi dòng này trong một transaction khóa các dòng `credit_debits` của lần trừ (`FOR UPDATE`) trước (`recordGeneration`, giờ ghi cả khi generator không trả `usage`); lỗi bất kỳ sau khi trừ (gọi Claude, ghi dòng) đều hoàn xu và trả hoa văn thủ tục; hoàn xu lỗi nữa thì ghi log và để task dọn. `costGuard.record` lỗi không làm mất hoa văn đã trả tiền. Dọn: `AiPatternService.refundOrphanedDebits`, chạy trong `AiImageReconcileTask.run` (5 phút/lần, ngay sau phần ảnh AI, lỗi phần này không chặn phần kia): lần trừ `AI_PATTERN` chưa hoàn, cũ hơn 10 phút, trong 7 ngày gần nhất, không có dòng `ai_generations`; mỗi lần trừ khóa cùng các dòng đó rồi đọc lại `ai_generations` trước khi hoàn. Không hoàn hai lần: `CreditsService.refund` chỉ hoàn dòng `refunded_at IS NULL`. Không hoàn lần đã thành công: có dòng `ai_generations` là bỏ qua, và nhờ khóa chung, nếu task hoàn trước (lời gọi dài hơn 10 phút, thực tế không xảy ra vì `AI_TIMEOUT_MS` 30 s, 1 lần thử lại) thì dòng được ghi với `credits` 0 và người dùng giữ hoa văn miễn phí. Migration mới `20261116000200_ai_pattern_orphan_refund`: index `ai_generations(debit_operation_id)` và `credit_debits(reason, created_at)`. **Mục 15.** Khi cookie có `Secure` (production mặc định, `COOKIE_SECURE`) mọi cookie API mang tiền tố `__Secure-` (`__Secure-wf_access`, `__Secure-wf_refresh`, `__Secure-wf_oauth_state`); không có `Secure` (localhost) giữ tên cũ. Mọi chỗ đọc đi qua `readCookie` (`common/constants/cookies.constants.ts`): ưu tiên tên `__Secure-`, rồi tên cũ. Chỗ đọc: `JwtStrategy`, `/auth/refresh`, `/auth/logout`, bộ đếm `ThrottlePerSession`, handshake của `EventsGateway`, `readOAuthState`. CSRF không đọc cookie (`OriginGuard` + `SameSite=Lax`). FE không đọc tên cookie (không có middleware Next.js; chỉ comment trong `services/api/index.ts` và bảng cookie ở trang pháp lý). Đăng nhập / refresh ở production đặt tên mới và xóa cookie tên cũ; logout và logout-all xóa cả hai tên và gửi `Clear-Site-Data: "cookies"` (không gửi `"storage"`). Đọc tên cũ ở production là `shortcut:` cho một bản phát hành. Unit test: **1108/1108** (71 bộ, thêm 16 test). Lint qua. E2E: **256/256** (21 bộ, thêm 9 test, gồm cả `app.e2e-spec.ts` phần auth: một app phụ khởi động với `COOKIE_SECURE=true`). **Kiểm khi deploy:** (1) hai migration chạy `CREATE INDEX` thường (không `CONCURRENTLY`) và kiểm lại `CHECK` trên `orders`: khóa ghi ngắn trên `orders`, `ai_generations`, `credit_debits`, bảng nhỏ nên chấp nhận. (2) Lần chạy đầu của task dọn sẽ hoàn mọi lần trừ `AI_PATTERN` 7 ngày qua chưa hoàn mà không có dòng `ai_generations`; trước deploy nên đếm trên production (chỉ đọc): `SELECT count(DISTINCT operation_id) FROM credit_debits d WHERE reason = 'AI_PATTERN' AND refunded_at IS NULL AND created_at > now() - interval '7 days' AND NOT EXISTS (SELECT 1 FROM ai_generations g WHERE g.debit_operation_id = d.operation_id)`, sau deploy xem log `ai_pattern.orphan_refunded`. (3) `Clear-Site-Data: "cookies"` xóa cookie của cả tên miền đăng ký (eTLD+1), kể cả subdomain khác: kiểm không có ứng dụng nào khác dùng chung tên miền với cookie cần giữ. (4) Bản phát hành sau: bỏ đọc tên cookie cũ ở production và bỏ phần xóa tên cũ trong `setAuthCookies` (hai `shortcut:`). (5) Trang pháp lý FE (`fe/src/views/legal/index.tsx`) vẫn ghi `wf_access` / `wf_refresh`; ở production tên thật là `__Secure-…`, chưa sửa vì plan không cho đụng FE ở mục này. **Lệch plan / ngoài phạm vi:** `getXuHistory` (`XuWalletService`, "Lịch sử xu") cũng phân trang chỉ theo `created_at` và có cùng lỗi trùng mili giây; plan không ghi, chưa sửa. Cookie trạng thái Google cũng được thêm tiền tố (plan chỉ nói cookie đăng nhập). |

# 18. Việc còn treo sau audit backend

> Ngày lập: 2026-11-18 · Kiểm lại trên `develop` (1c76bdb, đã gộp `fix/be-audit`) · Đối chiếu lại: 2026-11-19 trên `develop` (fb720a9) · Trạng thái: **đang làm**, chủ dự án đã trả lời Q1–Q5 (§3)
> Nguồn của mục 1–14: các việc nằm ngoài kế hoạch sửa backend sau audit (S0–S8, tháng 11/2026, đã gộp vào `develop`), do các session của kế hoạch đó phát hiện mà không sửa. Phần đã làm của mục 1–14 nằm trong commit `de2328d` trên `develop`.
> Từ 2026-11-19, file này cũng nhận việc còn mở của các kế hoạch đã xong và đã gỡ khỏi docs: kế hoạch nối FE–BE tháng 10/2026 (mục 15–22, §5), kế hoạch nâng studio lên trình chỉnh sửa chuyên nghiệp (§6) và kế hoạch sửa backend sau audit (§7).
> Mỗi trạng thái ghi một trong ba mức: **có mã trên `develop`**; **đã kiểm bằng test hoặc E2E** (kèm ngày); **chờ kiểm thực tế** (kèm vai trò người kiểm). Việc chưa có mã ghi "Chưa làm".

Mức: **M** = phải sửa trước khi mở cho khách, **S** = nên sửa, **N** = làm thì tốt.

## 1. Danh sách

| # | Mức | Việc | Vị trí | Quyết định | Trạng thái (2026-11-19) | Cách đóng |
|---|---|---|---|---|---|---|
| 1 | M | Câu chữ gói Pro hứa "xuất file in sạch không giới hạn", nhưng Pro không mở file in | 9 chỗ trong `fe/src`, xem §2.1 | Q1 | **Xong**, có mã trên `develop` (`fe/src/features/pricing/plans.ts`) | — |
| 2 | S | Bảng giá, menu và điều khoản vẫn nhắc gói "Lượt xuất" đã ngừng bán | `fe/src/app/pricing/page.tsx:6`, `fe/src/components/layout/navigation.ts:33`, `shared/src/billing/terms.ts` | Q2 | Trang giá và menu: **xong**, có mã trên `develop`. Điều khoản: **còn mở**, `terms.ts` dòng 26, 44, 56 còn chữ "lượt xuất", `PAYMENT_TERMS_VERSION` vẫn `2026-11-12` | Sửa điều khoản ở lần sửa tiếp theo vì lý do khác, cùng lần tăng `PAYMENT_TERMS_VERSION` (Q2) |
| 3 | S | Kịch bản demo trong runbook deploy vẫn bảo mua 1 lượt xuất | `docs/15_PATH2_DEPLOY_RUNBOOK.md` §3.5, §6, §8, §9 | | Phần chữ: **xong** (runbook đang được đồng bộ tiếp trong đợt docs này). Ảnh chụp lại: **còn mở**, chờ mục 14 | Sau khi mục 14 xong, chạy `e2e-scenario.mjs` và chụp lại ba ảnh đánh dấu "chưa chụp lại" trong runbook. Chờ kiểm thực tế (người deploy hoặc người chạy demo) |
| 4 | S | Nhập ảnh kho lỗi gì cũng báo "Kiểm tra kết nối" | `fe/src/features/studio/components/library/LibraryPanel.tsx`, `fe/src/services/api/index.ts` | | **Xong**, có mã trên `develop` | Phần thử với Pexels thật thuộc mục 10 |
| 5 | N | Chữ dùng phông tải lên thiếu ký tự: file in đổi phông, bản xem trước không cảnh báo | `fe/src/features/studio/utils/customFonts.ts`, `be/src/export/rendering/print-renderers.ts` | | Chưa làm (kiểm 2026-11-19: `customFonts.ts` chỉ kiểm dấu tiếng Việt lúc tải phông lên) | So bản xem trước và PDF với cùng chuỗi có ký tự thiếu. Ghi cách cảnh báo hoặc dùng font thay thế, kèm hai kết quả đối chiếu |
| 6 | N | Lịch sử xu phân trang chỉ theo `created_at` (cùng lỗi con trỏ đã sửa cho đối soát ngân hàng và lịch sử thanh toán) | `be/src/billing/xu-wallet.service.ts:156` | | Chưa làm | Thử nhiều giao dịch cùng thời điểm ở ranh giới hai trang, kể cả khi lọc theo loại. Sau khi sửa cursor, đọc hết các trang phải thu đủ ID, mỗi ID xuất hiện đúng một lần |
| 7 | N | VNPay báo thành công cho đơn đã hủy: chỉ ghi log, admin không thấy | `be/src/payments/vnpay/vnpay.service.ts:75` | | Chưa làm (trước khi bật VNPay thật) | Dùng dữ liệu thử để xác nhận đơn giữ trạng thái hủy. Ghi cách admin tìm giao dịch cần đối soát, và kết quả khi nhận thông báo lặp |
| 8 | N | Hạn mức tháng của Pexels (20.000 request) không có chặn | `be/src/library/stock-photos.service.ts:50` | | Chưa làm | Phân biệt hạn mức theo giờ và theo tháng. Kiểm cách ứng dụng xử lý khi chạm hạn mức. Ghi riêng kết quả thử với khóa thật khi người giữ tài khoản làm |
| 9 | N | Trang pháp lý ghi tên cookie cũ | `fe/src/views/legal/index.tsx` | | Trang pháp lý: **xong**, có mã trên `develop` (ghi tên `__Secure-`). Bỏ đọc tên cookie cũ: **còn mở**, làm ở bản phát hành sau bản đầu tiên có tiền tố | Xóa hai `shortcut:` ở `cookies.constants.ts` và `auth-cookie.service.ts` (§2.9), chạy lại e2e `auth` |
| 10 | S | Chưa thử Pexels với khóa thật; điều khoản Pexels về in ảnh lên hàng hóa | `be/.env`, `shared/src/fitcheck/validator.ts` | Q3 | Luật FitCheck `STOCK_PHOTO_ALONE`: **có mã trên `develop`**, có test trong `fitcheck.spec.ts`. Thử với khóa thật: **chờ kiểm thực tế** (người giữ khóa Pexels); `PEXELS_API_KEY` vẫn để trống trong `be/.env.example` | Gộp với mục 8: thêm khóa, tìm và nhập ảnh, chạm hạn mức giờ, ghi kết quả |
| 11 | S | Chưa xem trên trình duyệt: trang admin tài khoản, chuông thông báo | `fe/src/features/admin/accounts/`, `fe/src/features/notifications/` | | Chưa làm. Chờ kiểm thực tế (dev FE) | Thử màn hình tài khoản admin và chuông thông báo bằng đúng vai trò. Ghi kết quả cho danh sách rỗng, có thông báo mới và đánh dấu đã đọc |
| 12 | N | Ẩn danh hóa user vẫn giữ tên, số điện thoại, địa chỉ người nhận trên đơn đã giao | `be/src/users/user-removal.ts`, `be/src/users/invoice-retention.ts` | Q4 | **Xong** phần chính: có mã trên `develop`, đã kiểm bằng e2e `users-removal` (2026-11-18). **Còn mở** phạm vi dọn dữ liệu: thiết kế của đơn đã in (kèm trang mở hộp, lời chúc) chưa bị xóa khi hết hạn; chưa có kế toán xác nhận căn cứ 10 năm | Chủ dự án chốt có xóa thiết kế khi hết hạn không; kế toán xác nhận bản hợp nhất hiện hành của Luật Kế toán trước khi mở bán |
| 13 | N | Hai tab cùng mở một dự án ghi đè tên của nhau, không báo xung đột | `be/src/projects/presentation/projects.controller.ts`, `fe/src/features/studio/hooks/useProjectSync.ts` | Q5 | **Xong** phần chính: có mã trên `develop`, đã thử trên trình duyệt 2026-11-18. **Còn mở**: chưa thử khi tab nhận có thay đổi chưa lưu (banner xung đột) và khi tab bị ẩn | Mở hai tab, sửa chưa lưu ở tab B rồi lưu ở tab A: tab B phải hiện banner xung đột. Ẩn tab B, lưu ở tab A, mở lại tab B: tab B tải bản mới. Chờ kiểm thực tế (dev FE) |
| 14 | S | Bước 7 và 16 của kịch bản e2e còn kiểm luồng lượt xuất cũ (watermark, 402, "Mua 1 lượt") | `fe/scripts/e2e-scenario.mjs:727`, `:945` | | **Xong**, đã kiểm bằng E2E (2026-11-19): kịch bản viết lại theo luồng giỏ in → thanh toán → xuất theo phiên bản (commit c622f67), chạy đạt ở `M` và `Xp` với bước mặc định `1-14,16-18`. Điều kiện chạy ở [runbook §9](15_PATH2_DEPLOY_RUNBOOK.md#9-ảnh-bàn-giao-cho-slide) | Đã đóng |
| 15 | S | FitCheck chưa kiểm chữ tràn khung: phần chữ thừa vẽ ra ngoài khung ở canvas và file in, có thể đè nếp gấp | `shared/src/fitcheck/validator.ts:7` (chú thích "Not checked yet") | | Chưa làm (kiểm 2026-11-19: không có mã `TEXT_OVERFLOW`) | Thêm luật cảnh báo khi chữ cần cao hơn khung quá 0,5 mm, đo bằng cùng hàm đo chữ ở editor và server; kiểm lề bằng khung thật của chữ. Test: chữ vừa, tràn, tràn tới nếp gấp, chữ xoay; điểm editor bằng điểm server sau khi lưu |
| 16 | S | Server chưa cấu hình Google thì nút Google mở trang JSON `503` thô | `be/src/auth/guards/google-oauth.guard.ts:22`, `fe/src/views/auth/login/index.tsx` | | Chưa làm | Guard chuyển trình duyệt về `/login?error=google_unavailable`, trang đăng nhập hiện câu tiếng Việt. Thử bằng cách để trống `GOOGLE_CLIENT_ID` rồi bấm nút Google |
| 17 | S | FE chưa có ESLint; CI không kiểm FE ngoài `tokens:check` | `fe/package.json` (`"lint": "next lint"`), `.github/workflows/ci.yml` | | Chưa làm | Thêm `fe/eslint.config.mjs` (bỏ qua file generated), đổi script `lint`, thêm job CI chạy `tsc`, lint, `next build` cho FE. Đóng khi `npm --workspace=fe run lint` thoát 0 và job CI xanh |
| 18 | N | Bảng quà mẫu của Gói Copilot viết cứng độ dày giấy (0,15–0,45 mm) và trùng bảng quà mẫu ở bước 2 | `fe/src/features/studio/components/copilot/AiCopilotAssistant.tsx:33` (`POPULAR_GIFT_PRESETS`) | | Copilot **đã gắn vào studio** (có mã trên `develop`, `StudioWorkspace.tsx`). Bảng quà mẫu: chưa làm | Dùng một bảng quà mẫu chung, độ dày tính bằng `caliperOf(gsm)` |
| 19 | N | Chữ mới thêm từ canvas luôn dùng Cormorant Garamond, không theo bộ font đang chọn | `fe/src/features/studio/components/canvas/DielineCanvas2D.tsx:47` (`NEW_TEXT_STYLE`) | | Một phần: rail "Văn bản" đã dùng phông Brand Kit khi có (có mã trên `develop`). Nút thêm chữ trên canvas: chưa làm | Truyền font đang chọn cho canvas; thêm chữ, lưu, đọc lại qua API và xuất PDF phải cùng font |
| 20 | S | Chưa kiểm trên trình duyệt: lỗi upload `413`, `403` hết dung lượng, `FILE_NOT_OWNED`; `409` khi đủ 50 mốc; thiếu xu khi tạo hoa văn AI (`402 INSUFFICIENT_CREDITS`, thay cho `429` hết lượt cũ) | `fe/src/features/dashboard/upload.ts`, `features/studio/components/snapshots/`, `ai-pattern/` | | Chưa làm. Chờ kiểm thực tế (dev FE) | Dựng từng ca (giả response bằng CDP khi local không tạo được), chạy ở M và X+, ghi câu báo lỗi thấy được và việc không mất thay đổi đang chờ |
| 21 | N | Nhãn "Công thức cũ" trên thẻ dự án ở dashboard | `fe/src/features/dashboard/components/ProjectCard.tsx`, `RecentProjectCard.tsx` | | API đã trả `formulaVersion` và `latestFormulaVersion` trong danh sách dự án (có mã trên `develop`, `project.select.ts`). Nhãn FE: chưa làm | Hiện nhãn khi `formulaVersion < latestFormulaVersion` và dự án không ở thùng rác; chụp `/dashboard`, `/dashboard/projects` ở M, L, X, W không tràn tên |
| 22 | M | File in chưa được mở bằng công cụ xưởng, chưa in thử 1 : 1 và gấp tay | [12](12_BOX_FORMULA_AUDIT.md) §6.1 | | Chờ kiểm thực tế (xưởng in hoặc nhóm thiết kế) | Điền bảng nghiệm thu vật lý ở 14 §6.1 cho 4 cấu trúc, trước khi nhận đơn in thật |
| 23 | S | `docker-compose.yml` không truyền `PEXELS_API_KEY` vào container backend, nên ảnh kho luôn tắt trên VPS dù `.env` có khóa | `docker-compose.yml` (khối `environment` của backend) | | Chưa làm (kiểm 2026-11-19: file compose không có biến `PEXELS_*`; tìm thấy khi đồng bộ runbook deploy) | Thêm `PEXELS_API_KEY` vào `environment` của backend, deploy lại, rồi thử như mục 10: `GET /library/stock/photos` trả `enabled: true` |

## 2. Chi tiết

### 2.1 Mục 1: câu chữ gói Pro (M)

File in chỉ mở bằng đơn in mẫu đã thanh toán của đúng phiên bản thiết kế, hoặc bằng một lần mở khóa cũ còn hạn (`be/src/export/export.service.ts:44`, `:55`). Gói Pro không mở file in. Điều khoản thanh toán cũng nói rõ "gói Pro hay lượt xuất không thay cho bước này" (`shared/src/billing/terms.ts:32`).

Câu chữ sai, kiểm ngày 2026-11-18:

- `fe/src/components/pricing/content.ts:51` và `:121`
- `fe/src/components/home/content.ts:173`
- `fe/src/components/checkout/CheckoutShell.tsx:152`
- `fe/src/features/payments/CheckoutDialog.tsx:49`
- `fe/src/features/payments/PurchaseSuccessDialog.tsx:27`
- `fe/src/views/dashboard/billing/index.tsx:110`
- `fe/src/views/features/index.tsx:71`
- `fe/src/views/payments/vnpay-return/index.tsx:211`

Khách mua Pro vì câu này sẽ không xuất được file. Đây là quảng cáo sai.

Việc: chốt Q1, rồi viết lại cả 9 chỗ cho khớp với quyền lợi thật. Nên gom câu chữ quyền lợi của Pro về một chỗ trong `fe/src/features/pricing/plans.ts`, để lần sau chỉ sửa một nơi.

**Đã làm (2026-11-18).** Code thật sự cấp cho Pro đúng hai thứ: 2 GB lưu trữ (`STORAGE_QUOTA_BYTES`) và 1.000 xu mỗi kỳ 30 ngày, xu chưa dùng giữ thêm một kỳ (`XuWalletService.ensureAllowance`, `xuAllowancePeriod`). Giới hạn dự án, bản lưu, bộ sưu tập trong `ENTITLEMENTS` không được backend kiểm, nên không quảng cáo. Câu chữ gom về `PRO_BENEFITS`, `PRO_SUMMARY`, `PRINT_FILE_RULE` trong `fe/src/features/pricing/plans.ts`; cả 9 chỗ đọc từ đó. Bỏ thêm dòng "Ưu tiên đặt in hộp mẫu" (không có trong code) và hai dòng "Không giới hạn" của bảng so sánh: dòng file in giờ ghi "Khi thanh toán đơn in mẫu" cho mọi gói. Trang giá và trang thanh toán ghi rõ gói Pro không đi kèm file in.

### 2.2 Mục 2: gói "Lượt xuất" còn được quảng cáo (S)

Gói `EXPORT_1/5/15` ngừng bán từ session S6 của đợt sửa backend sau audit (`400 EXPORT_PACK_DISCONTINUED`). Còn sót:

- `fe/src/app/pricing/page.tsx:6`: mô tả trang (cho Google) vẫn ghi "Lượt xuất (19k / 79k / 199k)".
- `fe/src/components/layout/navigation.ts:33`: menu ghi "Miễn phí, Lượt xuất, Pro và Business".
- `fe/src/components/about/AboutTeam.tsx:59`: tiểu sử thành viên nhắc mô hình có gói Lượt xuất. Có thể giữ nếu coi là lịch sử.
- `shared/src/billing/terms.ts:26`, `:44`, `:56`: điều khoản thanh toán còn nhắc "lượt xuất". Nội dung vẫn đúng cho khách đã mua trước đây. Sửa thì phải tăng `PAYMENT_TERMS_VERSION`, khách phải đồng ý lại.

Việc: sửa hai chỗ đầu. Điều khoản thì chờ Q2.

**Đã làm (2026-11-18).** Sửa mô tả trang giá và menu. `AboutTeam.tsx` giữ (lịch sử). Điều khoản giữ nguyên theo Q2: bỏ chữ "lượt xuất" ở lần sửa điều khoản tiếp theo, cùng lần tăng `PAYMENT_TERMS_VERSION`.

### 2.3 Mục 3: runbook demo (S)

`docs/15_PATH2_DEPLOY_RUNBOOK.md`:

- Dòng 133–134: "mua 1 lượt" qua VNPay rồi "lượt xuất tăng". Bước này giờ trả 400 `EXPORT_PACK_DISCONTINUED`.
- Dòng 208: kịch bản 6 "Xuất SVG → 402 → Mua 1 lượt".
- Dòng 265, 267: danh sách ảnh chụp màn hình nhắc nhãn watermark và "hết lượt xuất".

Việc: viết lại phần demo theo luồng thật: thiết kế, đặt đơn in mẫu, thanh toán (VNPay sandbox hoặc giả lập bằng tài khoản demo), rồi xuất file. Chụp lại ảnh màn hình.

**Đã làm (2026-11-18).** §3.5 bước 5 thử VNPay bằng gói Pro hoặc gói xu. §6 bước 5–7 theo luồng bước 6 → "Thanh toán" → đơn in mẫu → "Xuất file in ngay". §8 bỏ câu "lượt đã trừ được hoàn". §9 bỏ các ảnh watermark và mua lượt, đánh dấu ba ảnh "chưa chụp lại". Ảnh cần chụp bằng `e2e-scenario.mjs`, mà bước 7 và 16 của script còn luồng cũ: xem mục 14.

### 2.4 Mục 4: lỗi nhập ảnh kho (S)

Backend trả lỗi có mã riêng từ session S4 của đợt sửa backend (ảnh kho Pexels): 403 hết dung lượng, 422 `STOCK_PHOTO_TOO_LARGE`, 429 `STOCK_RATE_LIMITED` (kèm `Retry-After`), 502 `STOCK_PROVIDER_ERROR`, 503 `STOCK_UNAVAILABLE`.

Frontend:

- `LibraryPanel.tsx:271` bắt mọi lỗi nhập ảnh và luôn báo "Kiểm tra kết nối rồi thử lại".
- Không mã `STOCK_*` nào có câu chữ riêng trong `CODE_MESSAGES` (`fe/src/services/api/index.ts:188`).
- `errorMessage` dịch mọi 422 không có mã riêng thành "FitCheck còn lỗi" (`fe/src/services/api/index.ts:238`). Nếu panel chuyển sang dùng `errorMessage` mà chưa thêm mã, ảnh quá lớn sẽ báo nhầm là lỗi FitCheck.

Việc: thêm câu chữ cho 5 mã trên vào `CODE_MESSAGES`, cho panel dùng `errorMessage`. Kiểm luôn đường tìm ảnh (chưa kiểm ngày 2026-11-18).

**Đã làm (2026-11-18).** Thêm `STOCK_*` và `STORAGE_UNAVAILABLE` vào `ApiErrorCode` và `CODE_MESSAGES`. `STOCK_RATE_LIMITED` có `Retry-After` thì báo số phút hoặc giây phải chờ. 403 hết dung lượng không có mã riêng, nên `errorMessage` nhận theo đường dẫn `/stock/photos/:id/import`, như `/storage/presigned-upload`. Panel dùng `errorMessage` cho cả lỗi nhập ảnh và lỗi tìm ảnh.

### 2.5 Mục 5: phông tải lên thiếu ký tự (N)

Từ session S5 của đợt sửa backend (phông tải lên): chữ có ký tự mà phông tải lên không vẽ được thì file in dùng phông in sẵn cho cả phần tử, và backend ghi cảnh báo vào log. Trên editor, trình duyệt tự lấy phông khác cho riêng ký tự đó. Bản xem trước và file in khác nhau, người dùng không được báo.

Frontend chỉ kiểm chữ tiếng Việt lúc tải phông lên (`customFonts.ts:24`). Ký tự ngoài tiếng Việt (ký hiệu, chữ nước khác, emoji) không được kiểm.

Việc: khi nội dung chữ đổi, kiểm ký tự với phông đang dùng. Thiếu thì cảnh báo trong inspector: "Phông này không có ký tự …, file in sẽ dùng phông mặc định".

### 2.6 Mục 6: phân trang lịch sử xu (N)

`XuWalletService.history` (`be/src/billing/xu-wallet.service.ts:156`) lọc `created_at < before`, sắp theo `created_at`. Hai dòng cùng mili giây nằm ở ranh giới trang thì dòng sau bị bỏ sót. Đợt sửa backend đã sửa đúng lỗi này cho `BankTransactionsService.list` và `PaymentsService.listMine` bằng con trỏ `(createdAt, id)`.

Khó hơn mục 11: danh sách gộp hai nguồn (lô xu và lần trừ xu), nên con trỏ phải mang cả loại dòng. Dùng lại `be/src/common/utils/page-cursor.util.ts` nếu được.

### 2.7 Mục 7: VNPay cho đơn đã hủy (N)

Từ session S1 của đợt sửa backend (luồng tiền): VNPay báo thanh toán thành công cho một đơn in đã hủy thì backend không ghi gì, payment giữ `PENDING`, chỉ có một dòng log `vnpay.ipn success for an order that is not payable` (`vnpay.service.ts:75`). Với SePay, trường hợp này hiện ở trang đối soát với lý do `ORDER_NOT_PAYABLE`; với VNPay thì admin không thấy để hoàn tiền.

Hiện VNPay mới chạy sandbox, chưa có tiền thật. Phải làm trước khi bật VNPay thật.

### 2.8 Mục 8: hạn mức tháng của Pexels (N)

Backend chặn 30 lần gọi Pexels mỗi user mỗi giờ và 180 lần mỗi giờ cho cả khóa. Hạn mức 20.000 lần mỗi tháng thì không chặn (`stock-photos.service.ts:50`): chạy 180 lần/giờ liên tục sẽ hết trong khoảng 5 ngày. Khi Pexels trả 429, backend đã tự ngừng gọi và báo `STOCK_RATE_LIMITED`, nên hậu quả là ảnh kho tắt tới cuối tháng, không phải lỗi hệ thống.

Thêm: kiểm và trừ ngân sách là hai lệnh Redis riêng (`shortcut:` trong cùng file), nhiều request cùng lúc có thể vượt vài lần gọi.

### 2.9 Mục 9: tên cookie trên trang pháp lý (N)

`fe/src/views/legal/index.tsx:240`, `:245` ghi `wf_access`, `wf_refresh`. Từ session S7 của đợt sửa backend, production dùng `__Secure-wf_access`, `__Secure-wf_refresh`, thêm `__Secure-wf_oauth_state` cho đăng nhập Google.

Việc đi kèm, ở bản phát hành sau bản đầu tiên có tiền tố: bỏ đọc tên cookie cũ (`be/src/common/constants/cookies.constants.ts:22`) và bỏ phần xóa tên cũ (`be/src/auth/auth-cookie.service.ts:43`). Cả hai có ghi `shortcut:`.

### 2.10 Mục 10: Pexels thật (S)

- `be/.env` chưa có `PEXELS_API_KEY` (kiểm ngày 2026-11-18). Tìm, nhập ảnh, cache, giới hạn theo user chưa từng chạy với Pexels thật.
- Session S4 đọc điều khoản Pexels và báo: mục 5 cấm bán ảnh ở dạng gần như nguyên bản, kể cả in lên hàng hóa. Một hộp chỉ in một ảnh kho phủ kín có thể vướng. Tôi chưa tự đọc lại điều khoản này.

Việc: thêm khóa, thử tay. Chốt Q3 trước khi mở ảnh kho cho khách.

**Đã làm (2026-11-18).** Đọc lại điều khoản ngày 2026-11-18 (pexels.com/terms-of-service mục 5, pexels.com/license): cấm bán hoặc phân phối ảnh ở dạng "Standalone", kể cả in lên hàng hóa. "Standalone" là ảnh để nguyên, hoặc chỉ lọc màu, đổi màu, đổi cỡ, cắt. Ghép với thành phần khác thành tác phẩm mới thì không còn là "Standalone". Theo gợi ý Q3, thêm luật FitCheck `STOCK_PHOTO_ALONE` (mức lỗi: server chặn xuất file như mọi lỗi FitCheck, editor khóa nút "Thanh toán" ở bước 6; tạo đơn in qua API thì server chưa kiểm FitCheck): hộp có ảnh kho mà không có chữ, logo, hoa văn hoặc ảnh không phải ảnh kho. Hình khối và mã vạch không tính. Ảnh kho mang `source: "pexels"` trên phần tử (`CanvasElement`, DTO nhận giá trị `pexels`). Đặt lại từ kệ "Gần đây" hoặc "Tệp của thiết kế" vẫn giữ `source`; thay ảnh bằng tệp của người dùng thì bỏ `source`. Luật chạy ở cả editor và server vì dùng chung `checkBox`. Còn lại: thêm `PEXELS_API_KEY`, thử tay.

### 2.11 Mục 11: kiểm trên trình duyệt (S)

Chỉ mới qua build và test, chưa ai mở xem:

- Trang admin tài khoản với một tài khoản đã ẩn danh hóa: nhãn, các nút bị khóa (phần ẩn danh hóa của đợt sửa backend).
- Chuông thông báo: trạng thái lỗi, và kết nối WebSocket qua proxy của Next.js dev (hộp thư thông báo của đợt sửa backend). Chuông vẫn gắn ở `fe/src/components/layout/MainHeader.tsx:151` sau khi gộp bản thiết kế lại studio.

Việc: kiểm ở bề rộng desktop bằng `npm --workspace=fe run shots -- --routes` (docs/11) và ở bề rộng điện thoại.

### 2.12 Mục 12 và 13: chờ chủ dự án

- **Mục 12.** Admin xóa user có lịch sử tài chính thì tài khoản bị ẩn danh hóa, nhưng đơn in vẫn giữ tên, số điện thoại, địa chỉ người nhận, kể cả đơn đã giao xong. Lý do giữ: hồ sơ giao hàng và khiếu nại. Xem Q4.

  **Đã làm (2026-11-18), theo Q4 đã sửa.** Chủ dự án chốt "giữ vĩnh viễn", rồi đổi thành "theo luật". Căn cứ: Luật Kế toán 2015 Điều 41 và Nghị định 174/2016/NĐ-CP Điều 13 bắt lưu chứng từ kế toán dùng để ghi sổ tối thiểu 10 năm, tính từ ngày kết thúc kỳ kế toán năm (kỳ kế toán của WrapFit là năm dương lịch). Chưa có kế toán xác nhận; kiểm lại bản hợp nhất hiện hành trước khi mở bán.
  - Thông tin xuất hóa đơn VAT (`users.billing_details`) trước đây chỉ nằm trên dòng user và bị xóa khi ẩn danh hóa. Giờ mỗi thanh toán chụp lại thông tin đó lúc tạo, trong `payments.metadata.billingDetails` (`PaymentsService.create`). Thanh toán tạo trước ngày này không có bản chụp.
  - Đơn và thanh toán của tài khoản đã ẩn danh hóa được giữ nguyên tới hết hạn. `InvoiceRetentionTask` (03:30 mỗi ngày, `be/src/users/invoice-retention.ts`) xóa tên, số điện thoại, địa chỉ, ghi chú của đơn và `billingDetails` của thanh toán khi dòng đó có `updated_at` trước ngày 1/1 của năm (hiện tại − 10), giờ Việt Nam. Số tiền, dòng hàng, ngày, trạng thái được giữ, không còn định danh. Tài khoản còn dùng thì giữ lịch sử, vì chủ tài khoản còn xem.
  - Chính sách quyền riêng tư (bản 1.2) ghi thời hạn 10 năm và cách xóa ở trên.
  - Chưa làm: thiết kế mà đơn đã in (giữ khi ẩn danh hóa, kèm trang mở hộp và lời chúc) chưa bị xóa khi hết hạn. Câu SQL có test e2e trên Postgres thật (`test/e2e/users-removal.e2e-spec.ts`, ca cuối của nhóm ẩn danh hóa): bản ghi năm (hiện tại − 10) được giữ, năm (hiện tại − 11) bị xóa phần cá nhân, chạy lần hai không đổi gì.

- **Mục 13.** Từ session S3 của đợt sửa backend: lưu chỉ tên, tag hoặc thumbnail không còn tăng `version`. Hệ quả: hai tab cùng mở một dự án có thể ghi đè tên của nhau mà không báo 409. Phần thiết kế vẫn được bảo vệ. Xem Q5.

  **Đã làm (2026-11-18), Q5 mức 1.** Cách chạy:
  - Mỗi tab có `TAB_ID` (`fe/src/services/realtime.ts`), gửi kèm mọi lần lưu dự án trong header `X-WF-Tab`.
  - `ProjectsController.update` lưu xong thì phát `project.saved` { projectId, version, updatedAt, tabId } (`PROJECT_SAVED`, `be/src/common/events/project.events.ts`). Lần lưu chỉ có thumbnail thì không phát.
  - `EventsGateway` gửi sự kiện vào phòng `user:<chủ dự án>`.
  - Tab nhận (`useProjectSync`) bỏ qua lần lưu của chính nó và lần lưu cũ hơn bản đang có. Lần lưu của tab khác thì chờ 1,5 giây không có lần lưu mới, và chờ tới khi người dùng nhìn thấy tab. Không có thay đổi chưa lưu thì nạp lại dự án (gắn lại editor như nút "Tải bản mới"), báo "Đã cập nhật từ tab khác". Có thay đổi chưa lưu, hoặc đang lưu, thì hiện banner xung đột đang có.
  - Mỗi tab giờ chỉ mở một socket, dùng chung cho chuông thông báo và editor (`onServerEvent`).
  - Đã thử trên trình duyệt ngày 2026-11-18 (backend và frontend dev, hai tab cùng một tài khoản thử): tab A áp mẫu cả hộp, tab B tự hiện thiết kế mới sau khoảng 2 giây; đổi tên ở "tab thứ ba" (PATCH kèm `X-WF-Tab` khác), tab A hiện "Đã cập nhật từ tab khác", rồi tab A sửa thiết kế mà tên mới vẫn giữ (mục 13 hết). Chưa thử trên trình duyệt: trường hợp tab nhận có thay đổi chưa lưu (banner xung đột), và tab bị ẩn chờ tới khi được mở.
  - Giới hạn: nạp lại là gắn lại editor, nên mất lựa chọn và lịch sử hoàn tác của tab nhận. Khôi phục bản lưu và cập nhật công thức chưa phát sự kiện: tab kia biết ở lần lưu sau (409). Sự kiện chỉ tới socket của process API đã nhận lần lưu, nên chỉ đúng khi chạy một API (mục hoãn "trạng thái trong bộ nhớ từng process", §7).

  **Q5: đồng bộ giữa các tab qua WebSocket.** Làm được, hạ tầng đã có: `EventsGateway` (Socket.IO, namespace `/events`, mỗi socket vào phòng `user:<id>`) và client trong `useNotifications`. Hai mức:
  1. *Đồng bộ theo lần lưu* (đề xuất). Sau mỗi PATCH thành công (thiết kế, tên, tag), backend gửi `project.saved { projectId, version, clientId }` vào phòng `user:<chủ dự án>`. Tab khác đang mở dự án đó: không có thay đổi chưa lưu thì tải bản mới và thay vào, báo "Đã cập nhật từ tab khác"; có thay đổi chưa lưu thì hiện banner xung đột đang có. Độ trễ bằng thời gian chờ autosave cộng mạng, khoảng 1–3 giây. Mục 13 hết luôn, vì tên mới đến tab kia ngay. Giới hạn: cùng một user (đúng với dự án hiện chỉ có một chủ); Socket.IO giữ phòng trong từng process API, chỉ đúng khi chạy một API (mục hoãn ở §7).
  2. *Sửa chung thời gian thực* (từng thao tác, hai tab cùng sửa thì gộp). Cần CRDT (ví dụ Yjs) và đổi cách lưu, `version`, bản lưu, FitCheck phía server. Việc lớn, nhiều tuần. Không đề xuất lúc này.

## 3. Câu hỏi cho chủ dự án

| # | Câu hỏi | Gợi ý | Chủ dự án chốt (2026-11-18) |
|---|---|---|---|
| Q1 | Gói Pro bán quyền lợi gì? | Chỉ liệt kê những gì code thật sự cấp. Đã thấy: dung lượng lưu trữ theo gói (`STORAGE_QUOTA_BYTES`). `PurchaseSuccessDialog.tsx:27` còn hứa "xu Wrap hằng tháng": chưa kiểm code có cấp không | Theo gợi ý. Code cấp cả xu mỗi kỳ (§2.1) |
| Q2 | Sửa điều khoản thanh toán để bỏ chữ "lượt xuất" (khách phải đồng ý lại)? | Chờ tới lần sửa điều khoản tiếp theo vì lý do khác | Theo gợi ý |
| Q3 | Có mở ảnh kho Pexels cho khách khi điều khoản còn vướng chuyện in lên hàng hóa? | Đọc lại điều khoản; nếu vướng, chỉ cho dùng ảnh kho kèm thành phần thiết kế khác, hoặc tắt | Theo gợi ý: điều khoản có vướng, chỉ cho dùng kèm thành phần khác (§2.10) |
| Q4 | Xóa thông tin người nhận trên đơn đã giao khi ẩn danh hóa? | Giữ một thời hạn (ví dụ 12 tháng) rồi xóa | Lúc đầu: giữ vĩnh viễn. Sửa lại cùng ngày: giữ theo luật, tức 10 năm theo Luật Kế toán (§2.12) |
| Q5 | Chấp nhận hai tab ghi đè tên dự án? | Chấp nhận cho tới khi có người dùng phàn nàn | Không chấp nhận: đồng bộ giữa các tab qua WebSocket, mức 1 (§2.12) |

## 4. Trước khi deploy

Không phải việc ngoài plan, nhắc lại từ nhật ký của đợt sửa backend để khỏi sót. Các bước chạy lệnh nằm ở [runbook deploy](15_PATH2_DEPLOY_RUNBOOK.md#23-trình-tự-deploy-lần-này); mục dưới chỉ giữ lý do.

1. Đổi số dư lượt xuất cũ sang xu: `npm --workspace=be run db:convert-export-credits` (chạy thử), rồi thêm `-- --apply`. Script chạy bằng `ts-node` từ `be/prisma/scripts/` và cần mã nguồn, mà image backend production không có `src/`, nên không chạy thẳng trong container được. Cách chạy trên VPS (gắn `be/src` chỉ đọc vào container) ở runbook deploy §2.3.
2. Đếm các lần trừ xu `AI_PATTERN` không có kết quả: lần trừ chưa hoàn, cũ hơn 10 phút, trong 7 ngày gần nhất, không có dòng `ai_generations` mang `debit_operation_id` của nó. Lần chạy đầu của task dọn (`AiImageReconcileTask`, 5 phút/lần) sẽ hoàn xu cho tất cả, nên đếm trước để biết số xu sẽ hoàn. Câu SQL ở runbook deploy.
3. Kiểm `.env` trên VPS, theo luật giả lập thanh toán hiện hành:
   - Ở production (`NODE_ENV=production`, mặc định của container), `PAYMENT_SIMULATION=true` cùng đủ `VIETQR_*` thật thì server **không khởi động** (`be/src/config/env.validation.ts`).
   - `PAYMENT_SIMULATION=true` mà chưa cấu hình `VIETQR_*`: QR dùng tài khoản mẫu "WRAPFIT MO PHONG" (không nhận được tiền thật), và **mọi** tài khoản được giả lập thanh toán, kể cả tài khoản thường. Tài khoản demo luôn được giả lập khi cờ bật.
   - `403 SIMULATION_DEMO_ONLY` (tài khoản thường giả lập khi đã có `VIETQR_*` thật) vì vậy chỉ gặp ở môi trường dev; ở production cấu hình đó đã bị chặn từ lúc khởi động.
4. `Clear-Site-Data: "cookies"` khi đăng xuất xóa cookie của cả tên miền, kể cả subdomain khác.
5. Trạng thái trong bộ nhớ từng process (throttler, cầu chì chi phí AI, Socket.IO) vẫn hoãn (§7): chỉ chạy một API và một worker.
6. Thêm `PEXELS_API_KEY` vào `docker-compose.yml` trước khi bật ảnh kho (mục 23).

## 5. Phiên S12 của kế hoạch nối FE–BE

Kế hoạch nối FE–BE (tháng 10/2026) thêm Phase 10 với 12 việc tồn đọng T1–T12 cho phiên S12, nhưng nhật ký của kế hoạch
dừng ở S8: không có dòng nào cho S12. Bảng dưới rà lại từng T trên `develop` (fb720a9) ngày 2026-11-19. Chỉ những T còn
mở được chuyển thành mục trong §1.

| T | Nội dung | Đối chiếu ngày 2026-11-19 | Kết luận |
|---|---|---|---|
| T1 | FitCheck chưa kiểm chữ tràn khung | Không có mã `TEXT_OVERFLOW`; chú thích đầu `validator.ts` vẫn ghi "Not checked yet" | Còn mở → mục 15 |
| T2 | Nút Google khi server chưa cấu hình mở trang JSON `503` | `GoogleOAuthGuard` vẫn ném `ServiceUnavailableException`; trang đăng nhập không có câu `google_unavailable` | Còn mở → mục 16 |
| T3 | Brand Kit gỡ `overflow: hidden` bằng thẻ `<style>` trong view | Màn Brand Kit đã viết tay lại (`manual`), CSS Stitch `dashboard-brand-kit.css` không còn, `SCROLL_FIX` không còn trong `fe/src`; trang nằm trong khung `(workspace)` | Đã bị thay thế (có mã trên `develop`, commit `4ab697e`, `c7d5d4f`) |
| T4 | FE chưa có ESLint, CI không kiểm FE | Không có `fe/eslint.config.mjs`; `lint` vẫn là `next lint`; CI chỉ chạy `tokens:check` cho FE | Còn mở → mục 17 |
| T5 | `AiCopilotAssistant` không màn nào dùng; bảng quà mẫu viết cứng độ dày giấy | Copilot đã gắn ở `StudioWorkspace.tsx`; `POPULAR_GIFT_PRESETS` vẫn ghi `paperThickness` cứng | Một phần → mục 18 |
| T6 | Chữ mới luôn dùng Cormorant Garamond | `NEW_TEXT_STYLE` vẫn ở `DielineCanvas2D.tsx`; rail "Văn bản" của studio đã dùng phông Brand Kit | Một phần → mục 19 |
| T7 | Chưa kiểm trên trình duyệt lỗi upload, 50 mốc, hết lượt AI | Không có ca nào trong `e2e-scenario.mjs`; hoa văn AI nay tính bằng xu nên ca "hết lượt" thành thiếu xu `402` | Còn mở → mục 20 |
| T8 | Ô "Tình trạng hệ thống" ở trang admin | `useHealthDetails` (`fe/src/features/admin/useHealth.ts`) dùng ở `AdminShell.tsx` và `fe/src/views/admin/index.tsx` | Đã làm (có mã trên `develop`) |
| T9 | Nhãn "Công thức cũ" trên thẻ dự án | API danh sách đã trả `formulaVersion`, `latestFormulaVersion` (`project.select.ts`); thẻ dự án ở dashboard chưa có nhãn | Một phần → mục 21 |
| T10 | Lỗi giao diện P3-1 → P3-6 chưa có phiên sửa | Đã đối chiếu từng mục với route hiện tại | Chuyển sang [11](11_UI_VIEWPORT_AUDIT.md) §6.1 |
| T11 | File in chưa mở bằng công cụ xưởng, chưa in thử và gấp tay | Không có kết quả nào | Còn mở → mục 22 và [12](12_BOX_FORMULA_AUDIT.md) §6.1 |
| T12 | Tài liệu chưa cập nhật | Thay bằng đợt đồng bộ docs sau audit (2026-11-19), làm cho toàn bộ `docs/` | Đã bị thay thế |

## 6. Câu hỏi mở của kế hoạch nâng studio lên trình chỉnh sửa chuyên nghiệp

Kế hoạch này (tháng 11/2026, giai đoạn 1–6 và hai phiên sau MVP) đã làm xong và gộp vào `develop`. Các câu hỏi mở lúc
lập kế hoạch đều đã chạy theo mặc định; những câu dưới đây vẫn cần người ngoài nhóm code trả lời.

| Câu hỏi | Mặc định đang chạy | Trạng thái 2026-11-19 | Người trả lời |
|---|---|---|---|
| Xưởng in đối tác cần nét ép kim và cỡ chữ ép kim tối thiểu bao nhiêu? Tên lớp màu pha họ dùng? | Nét ≥ 0,3 mm, chữ ép kim ≥ 8 pt; lớp `Finish` với màu pha 100 % và overprint (`shared/src/print/finishes.ts`) | Có mã trên `develop`. Chờ kiểm thực tế: chưa xưởng nào xác nhận | Xưởng in |
| Thông số in khác cần xưởng xác nhận: in mặt trong trên giấy kraft, lề và tràn lề, cách đọc file 4 lớp | In mặt trong cho mọi loại giấy, cảnh báo với kraft; thông số in theo [12](12_BOX_FORMULA_AUDIT.md) §3.1 | Chờ kiểm thực tế | Xưởng in |
| Khối thông tin nhãn hàng hóa (`shared/src/library/product-label.ts`): đối chiếu NĐ 43/2017/NĐ-CP và NĐ 111/2021/NĐ-CP | Chỉ là mẫu điền sẵn, ghi "người bán tự chịu trách nhiệm nội dung nhãn" | Có mã trên `develop`. Chờ kiểm thực tế: chưa có người có chuyên môn đối chiếu | Người có chuyên môn pháp lý về nhãn hàng hóa |

Phần chưa thử với dịch vụ thật (theo nhật ký của kế hoạch; chưa tìm thấy bằng chứng kiểm sau đó):

| Phần | Dịch vụ | Trạng thái 2026-11-19 | Người kiểm |
|---|---|---|---|
| Ảnh kho: tìm, nhập, ghi nguồn tác giả | Pexels | Chờ kiểm thực tế; xem mục 8, 10, 23 | Người giữ khóa Pexels |
| Công cụ AI xóa nền, tăng độ phân giải trên ảnh tải lên | fal.ai | Có mã trên `develop`, có unit test. Chờ kiểm thực tế với fal.ai thật | Người giữ tài khoản fal |
| Phông tải lên: tải file, nhúng vào PDF, chuyển nét khi xuất | Backend và worker thật (không phải bản offline) | Có mã trên `develop`, có unit test. Chờ kiểm thực tế với backend thật | Dev FE/BE |

## 7. Mục hoãn của kế hoạch sửa backend sau audit

Kế hoạch sửa backend sau audit (S0–S8, tháng 11/2026) đã gộp vào `develop`. Mọi mục trong danh sách của nó đã xử lý trừ
các việc hoãn dưới đây. Mỗi dòng ghi lý do hoãn và trạng thái kiểm ngày 2026-11-19.

| Việc hoãn | Lý do | Trạng thái 2026-11-19 | Làm khi |
|---|---|---|---|
| Trạng thái trong bộ nhớ từng process: throttler, cầu chì chi phí AI, phòng Socket.IO | Đúng khi chạy một API và một worker | Hoãn; chưa có mã | Chuẩn bị chạy từ hai instance API: Redis storage cho throttler, Redis adapter cho Socket.IO, cầu chì AI đọc thẳng DB |
| Tầng application của `projects` import DTO của presentation và hàm của `storage` | Lệch kiến trúc nhưng chưa gây lỗi | Hoãn | Lần tới phải đổi `projects.service.ts` vì lý do khác |
| 7 module đọc bảng `packaging_projects` trực tiếp | Chưa có quy tắc lọc nào cần dùng chung | Hoãn | Có module thứ hai cần cùng một quy tắc lọc, ví dụ "dự án chưa xóa của user" |
| Ảnh kho tải và giải mã bằng `sharp` ngay trong process API | Đã giới hạn dung lượng tải và tần suất nhập | Có `shortcut:` ở `be/src/library/stock-photos.service.ts:148` | Lượng nhập ảnh kho đủ lớn để làm chậm API: chuyển sang worker |
| Kiểm và trừ ngân sách gọi Pexels là hai lượt Redis riêng | Đua chỉ lố vài lần gọi | Có `shortcut:` ở `stock-photos.service.ts:238` (gộp với mục 8) | Làm cùng mục 8 |
| Trần 500 góp ý của link duyệt mẫu: đếm rồi mới ghi, không khóa | Đua chỉ lố vài dòng | Có `shortcut:` ở `be/src/reviews/reviews.service.ts:165` | Có người lạm dụng link duyệt mẫu |
| Cột `orders.discount_vnd`, `orders.promo_code` giữ lại dù đã bỏ mã ưu đãi (luôn 0 và null) | Tránh migration và đổi response | Có `shortcut:` ở `be/src/orders/orders.service.ts:75` | Lần đổi schema `orders` tiếp theo |
| Đọc tên cookie cũ (không tiền tố `__Secure-`) ở production | Không đăng xuất phiên mở trước 2026-11-16 | Có `shortcut:` ở `cookies.constants.ts:22`, `auth-cookie.service.ts:43` | Bản phát hành sau bản đầu tiên có tiền tố (mục 9) |
| Không audit: `fe/`, phần `export/rendering/` ngoài hai mục đã sửa, `prisma/seed*`, Dockerfile, script deploy | Ngoài phạm vi kế hoạch | Chưa audit | Có kế hoạch audit riêng cho các phần này |

## 8. Nhật ký

| Ngày | Việc | Ghi chú |
|---|---|---|
| 2026-11-18 | Lập danh sách | Kiểm lại từng mục trên `develop` 1c76bdb |
| 2026-11-18 | Chủ dự án trả lời Q1–Q5; làm mục 1, 2, 3, 4, 9, 10 (luật FitCheck), 12 | Thêm mục 14. Chưa commit. Chưa xem trên trình duyệt |
| 2026-11-18 | Q4 đổi sang giữ 10 năm theo luật; Q5 làm mức 1 (mục 13) | Unit 1166/1166; e2e projects, payments, notifications, users-removal, orders 79/79; thử hai tab trên trình duyệt. Chưa commit |
| 2026-11-19 | Đồng bộ docs sau audit: đối chiếu lại mục 1–14 trên `develop` fb720a9 | Phần đã làm nằm trong `de2328d`. Cập nhật trạng thái và số dòng mã, thêm cột "Cách đóng". Thêm mục 15–22 (việc còn mở của S12, §5) và mục 23 (`PEXELS_API_KEY` thiếu trong compose). Thêm §6 (câu hỏi cho xưởng, nhãn hàng hóa, dịch vụ chưa thử thật) và §7 (mục hoãn của đợt sửa backend). §4 ghi luật giả lập thanh toán hiện hành và cách đổi lượt xuất trong container production. Mục 14 đang làm ở luồng D |

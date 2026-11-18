# 28. Việc còn treo sau audit backend

> Ngày lập: 2026-11-18 · Kiểm lại trên `develop` (1c76bdb, đã gộp `fix/be-audit`) · Trạng thái: **đang làm**, chủ dự án đã trả lời Q1–Q5 (§3)
> Nguồn: các việc nằm ngoài plan `docs/25_BACKEND_AUDIT_FIX_PLAN.md`, do các session S0–S8 phát hiện mà không sửa.
> Mỗi mục dưới đây đã được kiểm lại trên code ngày 2026-11-18. Mục nào chưa kiểm được thì ghi rõ.

Mức: **M** = phải sửa trước khi mở cho khách, **S** = nên sửa, **N** = làm thì tốt.

## 1. Danh sách

| # | Mức | Việc | Vị trí | Quyết định | Trạng thái (2026-11-18) |
|---|---|---|---|---|---|
| 1 | M | Câu chữ gói Pro hứa "xuất file in sạch không giới hạn", nhưng Pro không mở file in | 9 chỗ trong `fe/src`, xem §2.1 | Q1 | **Xong** |
| 2 | S | Bảng giá, menu và điều khoản vẫn nhắc gói "Lượt xuất" đã ngừng bán | `fe/src/app/pricing/page.tsx:6`, `fe/src/components/layout/navigation.ts:33`, `shared/src/billing/terms.ts` | Q2 | **Xong** phần trang giá và menu; điều khoản chờ lần sửa sau |
| 3 | S | Kịch bản demo trong runbook deploy vẫn bảo mua 1 lượt xuất | `docs/18_PATH2_DEPLOY_RUNBOOK.md` §3.5, §6, §8, §9 | | **Xong** phần chữ; ảnh chụp lại chờ mục 14 |
| 4 | S | Nhập ảnh kho lỗi gì cũng báo "Kiểm tra kết nối" | `fe/src/features/studio/components/library/LibraryPanel.tsx`, `fe/src/services/api/index.ts` | | **Xong** |
| 5 | N | Chữ dùng phông tải lên thiếu ký tự: file in đổi phông, bản xem trước không cảnh báo | `fe/src/features/studio/utils/customFonts.ts`, `be/src/export/rendering/print-renderers.ts` | | Chưa làm |
| 6 | N | Lịch sử xu phân trang chỉ theo `created_at` (cùng lỗi mục 11 của docs/25) | `be/src/billing/xu-wallet.service.ts:151` | | Chưa làm |
| 7 | N | VNPay báo thành công cho đơn đã hủy: chỉ ghi log, admin không thấy | `be/src/payments/vnpay/vnpay.service.ts:74` | | Chưa làm (trước khi bật VNPay thật) |
| 8 | N | Hạn mức tháng của Pexels (20.000 request) không có chặn | `be/src/library/stock-photos.service.ts:50` | | Chưa làm |
| 9 | N | Trang pháp lý ghi tên cookie cũ | `fe/src/views/legal/index.tsx` | | **Xong** trang pháp lý; bỏ đọc tên cũ ở bản phát hành sau |
| 10 | S | Chưa thử Pexels với khóa thật; điều khoản Pexels về in ảnh lên hàng hóa | `be/.env`, `shared/src/fitcheck/validator.ts` | Q3 | **Xong** luật FitCheck; chưa thử với khóa thật |
| 11 | S | Chưa xem trên trình duyệt: trang admin tài khoản, chuông thông báo | `fe/src/features/admin/accounts/`, `fe/src/features/notifications/` | | Chưa làm |
| 12 | N | Ẩn danh hóa user vẫn giữ tên, số điện thoại, địa chỉ người nhận trên đơn đã giao | `be/src/users/user-removal.ts`, `be/src/users/invoice-retention.ts` | Q4 | **Xong**: giữ 10 năm theo Luật Kế toán, rồi xóa dữ liệu cá nhân |
| 13 | N | Hai tab cùng mở một dự án ghi đè tên của nhau, không báo xung đột | `be/src/projects/presentation/projects.controller.ts`, `fe/src/features/studio/hooks/useProjectSync.ts` | Q5 | **Xong**: đồng bộ giữa các tab theo lần lưu (§2.12) |
| 14 | S | Bước 7 và 16 của kịch bản e2e còn kiểm luồng lượt xuất cũ (watermark, 402, "Mua 1 lượt") | `fe/scripts/e2e-scenario.mjs:727`, `:945` | | Chưa làm (mới, tìm thấy khi sửa mục 3) |

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

Gói `EXPORT_1/5/15` ngừng bán từ docs/25 S6. Còn sót:

- `fe/src/app/pricing/page.tsx:6`: mô tả trang (cho Google) vẫn ghi "Lượt xuất (19k / 79k / 199k)".
- `fe/src/components/layout/navigation.ts:33`: menu ghi "Miễn phí, Lượt xuất, Pro và Business".
- `fe/src/components/about/AboutTeam.tsx:59`: tiểu sử thành viên nhắc mô hình có gói Lượt xuất. Có thể giữ nếu coi là lịch sử.
- `shared/src/billing/terms.ts:26`, `:44`, `:56`: điều khoản thanh toán còn nhắc "lượt xuất". Nội dung vẫn đúng cho khách đã mua trước đây. Sửa thì phải tăng `PAYMENT_TERMS_VERSION`, khách phải đồng ý lại.

Việc: sửa hai chỗ đầu. Điều khoản thì chờ Q2.

**Đã làm (2026-11-18).** Sửa mô tả trang giá và menu. `AboutTeam.tsx` giữ (lịch sử). Điều khoản giữ nguyên theo Q2: bỏ chữ "lượt xuất" ở lần sửa điều khoản tiếp theo, cùng lần tăng `PAYMENT_TERMS_VERSION`.

### 2.3 Mục 3: runbook demo (S)

`docs/18_PATH2_DEPLOY_RUNBOOK.md`:

- Dòng 133–134: "mua 1 lượt" qua VNPay rồi "lượt xuất tăng". Bước này giờ trả 400 `EXPORT_PACK_DISCONTINUED`.
- Dòng 208: kịch bản 6 "Xuất SVG → 402 → Mua 1 lượt".
- Dòng 265, 267: danh sách ảnh chụp màn hình nhắc nhãn watermark và "hết lượt xuất".

Việc: viết lại phần demo theo luồng thật: thiết kế, đặt đơn in mẫu, thanh toán (VNPay sandbox hoặc giả lập bằng tài khoản demo), rồi xuất file. Chụp lại ảnh màn hình.

**Đã làm (2026-11-18).** §3.5 bước 5 thử VNPay bằng gói Pro hoặc gói xu. §6 bước 5–7 theo luồng bước 6 → "Thanh toán" → đơn in mẫu → "Xuất file in ngay". §8 bỏ câu "lượt đã trừ được hoàn". §9 bỏ các ảnh watermark và mua lượt, đánh dấu ba ảnh "chưa chụp lại". Ảnh cần chụp bằng `e2e-scenario.mjs`, mà bước 7 và 16 của script còn luồng cũ: xem mục 14.

### 2.4 Mục 4: lỗi nhập ảnh kho (S)

Backend trả lỗi có mã riêng từ docs/25 S4: 403 hết dung lượng, 422 `STOCK_PHOTO_TOO_LARGE`, 429 `STOCK_RATE_LIMITED` (kèm `Retry-After`), 502 `STOCK_PROVIDER_ERROR`, 503 `STOCK_UNAVAILABLE`.

Frontend:

- `LibraryPanel.tsx:271` bắt mọi lỗi nhập ảnh và luôn báo "Kiểm tra kết nối rồi thử lại".
- Không mã `STOCK_*` nào có câu chữ riêng trong `CODE_MESSAGES` (`fe/src/services/api/index.ts:188`).
- `errorMessage` dịch mọi 422 không có mã riêng thành "FitCheck còn lỗi" (`fe/src/services/api/index.ts:238`). Nếu panel chuyển sang dùng `errorMessage` mà chưa thêm mã, ảnh quá lớn sẽ báo nhầm là lỗi FitCheck.

Việc: thêm câu chữ cho 5 mã trên vào `CODE_MESSAGES`, cho panel dùng `errorMessage`. Kiểm luôn đường tìm ảnh (chưa kiểm ngày 2026-11-18).

**Đã làm (2026-11-18).** Thêm `STOCK_*` và `STORAGE_UNAVAILABLE` vào `ApiErrorCode` và `CODE_MESSAGES`. `STOCK_RATE_LIMITED` có `Retry-After` thì báo số phút hoặc giây phải chờ. 403 hết dung lượng không có mã riêng, nên `errorMessage` nhận theo đường dẫn `/stock/photos/:id/import`, như `/storage/presigned-upload`. Panel dùng `errorMessage` cho cả lỗi nhập ảnh và lỗi tìm ảnh.

### 2.5 Mục 5: phông tải lên thiếu ký tự (N)

Từ docs/25 S5: chữ có ký tự mà phông tải lên không vẽ được thì file in dùng phông in sẵn cho cả phần tử, và backend ghi cảnh báo vào log. Trên editor, trình duyệt tự lấy phông khác cho riêng ký tự đó. Bản xem trước và file in khác nhau, người dùng không được báo.

Frontend chỉ kiểm chữ tiếng Việt lúc tải phông lên (`customFonts.ts:24`). Ký tự ngoài tiếng Việt (ký hiệu, chữ nước khác, emoji) không được kiểm.

Việc: khi nội dung chữ đổi, kiểm ký tự với phông đang dùng. Thiếu thì cảnh báo trong inspector: "Phông này không có ký tự …, file in sẽ dùng phông mặc định".

### 2.6 Mục 6: phân trang lịch sử xu (N)

`XuWalletService.history` (`be/src/billing/xu-wallet.service.ts:151`) lọc `created_at < before`, sắp theo `created_at`. Hai dòng cùng mili giây nằm ở ranh giới trang thì dòng sau bị bỏ sót. Giống mục 11 của docs/25.

Khó hơn mục 11: danh sách gộp hai nguồn (lô xu và lần trừ xu), nên con trỏ phải mang cả loại dòng. Dùng lại `be/src/common/utils/page-cursor.util.ts` nếu được.

### 2.7 Mục 7: VNPay cho đơn đã hủy (N)

Từ docs/25 S1: VNPay báo thanh toán thành công cho một đơn in đã hủy thì backend không ghi gì, payment giữ `PENDING`, chỉ có một dòng log `vnpay.ipn success for an order that is not payable` (`vnpay.service.ts:74`). Với SePay, trường hợp này hiện ở trang đối soát với lý do `ORDER_NOT_PAYABLE`; với VNPay thì admin không thấy để hoàn tiền.

Hiện VNPay mới chạy sandbox, chưa có tiền thật. Phải làm trước khi bật VNPay thật.

### 2.8 Mục 8: hạn mức tháng của Pexels (N)

Backend chặn 30 lần gọi Pexels mỗi user mỗi giờ và 180 lần mỗi giờ cho cả khóa. Hạn mức 20.000 lần mỗi tháng thì không chặn (`stock-photos.service.ts:50`): chạy 180 lần/giờ liên tục sẽ hết trong khoảng 5 ngày. Khi Pexels trả 429, backend đã tự ngừng gọi và báo `STOCK_RATE_LIMITED`, nên hậu quả là ảnh kho tắt tới cuối tháng, không phải lỗi hệ thống.

Thêm: kiểm và trừ ngân sách là hai lệnh Redis riêng (`shortcut:` trong cùng file), nhiều request cùng lúc có thể vượt vài lần gọi.

### 2.9 Mục 9: tên cookie trên trang pháp lý (N)

`fe/src/views/legal/index.tsx:240`, `:245` ghi `wf_access`, `wf_refresh`. Từ docs/25 S7, production dùng `__Secure-wf_access`, `__Secure-wf_refresh`, thêm `__Secure-wf_oauth_state` cho đăng nhập Google.

Việc đi kèm, ở bản phát hành sau bản đầu tiên có tiền tố: bỏ đọc tên cookie cũ (`be/src/common/constants/cookies.constants.ts:22`) và bỏ phần xóa tên cũ (`be/src/auth/auth-cookie.service.ts:43`). Cả hai có ghi `shortcut:`.

### 2.10 Mục 10: Pexels thật (S)

- `be/.env` chưa có `PEXELS_API_KEY` (kiểm ngày 2026-11-18). Tìm, nhập ảnh, cache, giới hạn theo user chưa từng chạy với Pexels thật.
- Session S4 đọc điều khoản Pexels và báo: mục 5 cấm bán ảnh ở dạng gần như nguyên bản, kể cả in lên hàng hóa. Một hộp chỉ in một ảnh kho phủ kín có thể vướng. Tôi chưa tự đọc lại điều khoản này.

Việc: thêm khóa, thử tay. Chốt Q3 trước khi mở ảnh kho cho khách.

**Đã làm (2026-11-18).** Đọc lại điều khoản ngày 2026-11-18 (pexels.com/terms-of-service mục 5, pexels.com/license): cấm bán hoặc phân phối ảnh ở dạng "Standalone", kể cả in lên hàng hóa. "Standalone" là ảnh để nguyên, hoặc chỉ lọc màu, đổi màu, đổi cỡ, cắt. Ghép với thành phần khác thành tác phẩm mới thì không còn là "Standalone". Theo gợi ý Q3, thêm luật FitCheck `STOCK_PHOTO_ALONE` (mức lỗi: server chặn xuất file như mọi lỗi FitCheck, editor khóa nút "Thanh toán" ở bước 6; tạo đơn in qua API thì server chưa kiểm FitCheck): hộp có ảnh kho mà không có chữ, logo, hoa văn hoặc ảnh không phải ảnh kho. Hình khối và mã vạch không tính. Ảnh kho mang `source: "pexels"` trên phần tử (`CanvasElement`, DTO nhận giá trị `pexels`). Đặt lại từ kệ "Gần đây" hoặc "Tệp của thiết kế" vẫn giữ `source`; thay ảnh bằng tệp của người dùng thì bỏ `source`. Luật chạy ở cả editor và server vì dùng chung `checkBox`. Còn lại: thêm `PEXELS_API_KEY`, thử tay.

### 2.11 Mục 11: kiểm trên trình duyệt (S)

Chỉ mới qua build và test, chưa ai mở xem:

- Trang admin tài khoản với một tài khoản đã ẩn danh hóa: nhãn, các nút bị khóa (docs/25 S2).
- Chuông thông báo: trạng thái lỗi, và kết nối WebSocket qua proxy của Next.js dev (docs/25 S8). Chuông vẫn gắn ở `fe/src/components/layout/MainHeader.tsx:151` sau khi gộp bản thiết kế lại studio.

Việc: kiểm ở bề rộng desktop bằng `npm --workspace=fe run shots -- --routes` (docs/13) và ở bề rộng điện thoại.

### 2.12 Mục 12 và 13: chờ chủ dự án

- **Mục 12.** Admin xóa user có lịch sử tài chính thì tài khoản bị ẩn danh hóa, nhưng đơn in vẫn giữ tên, số điện thoại, địa chỉ người nhận, kể cả đơn đã giao xong. Lý do giữ: hồ sơ giao hàng và khiếu nại. Xem Q4.

  **Đã làm (2026-11-18), theo Q4 đã sửa.** Chủ dự án chốt "giữ vĩnh viễn", rồi đổi thành "theo luật". Căn cứ: Luật Kế toán 2015 Điều 41 và Nghị định 174/2016/NĐ-CP Điều 13 bắt lưu chứng từ kế toán dùng để ghi sổ tối thiểu 10 năm, tính từ ngày kết thúc kỳ kế toán năm (kỳ kế toán của WrapFit là năm dương lịch). Chưa có kế toán xác nhận; kiểm lại bản hợp nhất hiện hành trước khi mở bán.
  - Thông tin xuất hóa đơn VAT (`users.billing_details`) trước đây chỉ nằm trên dòng user và bị xóa khi ẩn danh hóa. Giờ mỗi thanh toán chụp lại thông tin đó lúc tạo, trong `payments.metadata.billingDetails` (`PaymentsService.create`). Thanh toán tạo trước ngày này không có bản chụp.
  - Đơn và thanh toán của tài khoản đã ẩn danh hóa được giữ nguyên tới hết hạn. `InvoiceRetentionTask` (03:30 mỗi ngày, `be/src/users/invoice-retention.ts`) xóa tên, số điện thoại, địa chỉ, ghi chú của đơn và `billingDetails` của thanh toán khi dòng đó có `updated_at` trước ngày 1/1 của năm (hiện tại − 10), giờ Việt Nam. Số tiền, dòng hàng, ngày, trạng thái được giữ, không còn định danh. Tài khoản còn dùng thì giữ lịch sử, vì chủ tài khoản còn xem.
  - Chính sách quyền riêng tư (bản 1.2) ghi thời hạn 10 năm và cách xóa ở trên.
  - Chưa làm: thiết kế mà đơn đã in (giữ khi ẩn danh hóa, kèm trang mở hộp và lời chúc) chưa bị xóa khi hết hạn. Câu SQL có test e2e trên Postgres thật (`test/e2e/users-removal.e2e-spec.ts`, ca cuối của nhóm ẩn danh hóa): bản ghi năm (hiện tại − 10) được giữ, năm (hiện tại − 11) bị xóa phần cá nhân, chạy lần hai không đổi gì.

- **Mục 13.** Từ docs/25 S3: lưu chỉ tên, tag hoặc thumbnail không còn tăng `version`. Hệ quả: hai tab cùng mở một dự án có thể ghi đè tên của nhau mà không báo 409. Phần thiết kế vẫn được bảo vệ. Xem Q5.

  **Đã làm (2026-11-18), Q5 mức 1.** Cách chạy:
  - Mỗi tab có `TAB_ID` (`fe/src/services/realtime.ts`), gửi kèm mọi lần lưu dự án trong header `X-WF-Tab`.
  - `ProjectsController.update` lưu xong thì phát `project.saved` { projectId, version, updatedAt, tabId } (`PROJECT_SAVED`, `be/src/common/events/project.events.ts`). Lần lưu chỉ có thumbnail thì không phát.
  - `EventsGateway` gửi sự kiện vào phòng `user:<chủ dự án>`.
  - Tab nhận (`useProjectSync`) bỏ qua lần lưu của chính nó và lần lưu cũ hơn bản đang có. Lần lưu của tab khác thì chờ 1,5 giây không có lần lưu mới, và chờ tới khi người dùng nhìn thấy tab. Không có thay đổi chưa lưu thì nạp lại dự án (gắn lại editor như nút "Tải bản mới"), báo "Đã cập nhật từ tab khác". Có thay đổi chưa lưu, hoặc đang lưu, thì hiện banner xung đột đang có.
  - Mỗi tab giờ chỉ mở một socket, dùng chung cho chuông thông báo và editor (`onServerEvent`).
  - Đã thử trên trình duyệt ngày 2026-11-18 (backend và frontend dev, hai tab cùng một tài khoản thử): tab A áp mẫu cả hộp, tab B tự hiện thiết kế mới sau khoảng 2 giây; đổi tên ở "tab thứ ba" (PATCH kèm `X-WF-Tab` khác), tab A hiện "Đã cập nhật từ tab khác", rồi tab A sửa thiết kế mà tên mới vẫn giữ (mục 13 hết). Chưa thử trên trình duyệt: trường hợp tab nhận có thay đổi chưa lưu (banner xung đột), và tab bị ẩn chờ tới khi được mở.
  - Giới hạn: nạp lại là gắn lại editor, nên mất lựa chọn và lịch sử hoàn tác của tab nhận. Khôi phục bản lưu và cập nhật công thức chưa phát sự kiện: tab kia biết ở lần lưu sau (409). Sự kiện chỉ tới socket của process API đã nhận lần lưu, nên chỉ đúng khi chạy một API (docs/25 mục 14).

  **Q5: đồng bộ giữa các tab qua WebSocket.** Làm được, hạ tầng đã có: `EventsGateway` (Socket.IO, namespace `/events`, mỗi socket vào phòng `user:<id>`) và client trong `useNotifications`. Hai mức:
  1. *Đồng bộ theo lần lưu* (đề xuất). Sau mỗi PATCH thành công (thiết kế, tên, tag), backend gửi `project.saved { projectId, version, clientId }` vào phòng `user:<chủ dự án>`. Tab khác đang mở dự án đó: không có thay đổi chưa lưu thì tải bản mới và thay vào, báo "Đã cập nhật từ tab khác"; có thay đổi chưa lưu thì hiện banner xung đột đang có. Độ trễ bằng thời gian chờ autosave cộng mạng, khoảng 1–3 giây. Mục 13 hết luôn, vì tên mới đến tab kia ngay. Giới hạn: cùng một user (đúng với dự án hiện chỉ có một chủ); Socket.IO giữ phòng trong từng process API, chỉ đúng khi chạy một API (docs/25 mục 14).
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

Không phải việc ngoài plan, nhắc lại từ nhật ký docs/25 §6 để khỏi sót:

1. Chạy `npm --workspace=be run db:convert-export-credits` (chạy thử), rồi thêm `-- --apply`.
2. Đếm các lần trừ xu `AI_PATTERN` không có kết quả trong 7 ngày gần nhất; câu SQL ở dòng S7 của docs/25 §6. Lần chạy đầu của task dọn sẽ hoàn xu cho tất cả.
3. Kiểm `.env` trên VPS: `PAYMENT_SIMULATION=true` cùng `VIETQR_*` thật thì server không khởi động.
4. `Clear-Site-Data: "cookies"` khi đăng xuất xóa cookie của cả tên miền, kể cả subdomain khác.
5. Mục 14 của docs/25 (trạng thái trong bộ nhớ từng process) vẫn hoãn: chỉ chạy một API và một worker.

## 5. Nhật ký

| Ngày | Việc | Ghi chú |
|---|---|---|
| 2026-11-18 | Lập danh sách | Kiểm lại từng mục trên `develop` 1c76bdb |
| 2026-11-18 | Chủ dự án trả lời Q1–Q5; làm mục 1, 2, 3, 4, 9, 10 (luật FitCheck), 12 | Thêm mục 14. Chưa commit. Chưa xem trên trình duyệt |
| 2026-11-18 | Q4 đổi sang giữ 10 năm theo luật; Q5 làm mức 1 (mục 13) | Unit 1166/1166; e2e projects, payments, notifications, users-removal, orders 79/79; thử hai tab trên trình duyệt. Chưa commit |

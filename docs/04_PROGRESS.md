# 📊 TIẾN ĐỘ THỰC HIỆN & PHÂN CÔNG (PROJECT PROGRESS)

> **Môn học**: EXE101 — Experiential Entrepreneurship (FPT University)

---

## Bảng Theo Dõi Tiến Độ 3 IT

| Nhiệm vụ | Người phụ trách | Trạng thái | Checkpoint |
| :--- | :--- | :--- | :--- |
| **Thiết lập kiến trúc Monorepo (`fe`, `be`, `shared`)** | Toàn đội IT | ✅ Đã hoàn thành | CP2 |
| **Tích hợp 5 Agent Skills cho dự án** | Toàn đội IT | ✅ Đã hoàn thành | CP2 |
| **Công thức toán học hộp Tuck Top (`shared/`)** | 👤 **IT 2** | ✅ Đã hoàn thành | CP2 |
| **Công thức hộp Bao diêm, Âm dương, Gối (`shared/`)** | 👤 **IT 2** | ✅ Đã hoàn thành | CP2 / CP3 |
| **Thuật toán kiểm định FitCheck™ (`shared/`)** | 👤 **IT 2** | ✅ Đã hoàn thành | CP3 |
| **Canvas 2D phẳng hiển thị nét cắt & cấn (`fe/`)** | 👤 **IT 1** | ✅ Đã hoàn thành | CP2 |
| **Sân khấu 3D Three.js mô phỏng khối hộp (`fe/`)** | 👤 **IT 1** | ✅ Đã hoàn thành | CP3 |
| **Thanh trượt kích thước $L, W, H$ xúc giác (`fe/`)** | 👤 **IT 1** | ✅ Đã hoàn thành | CP2 |
| **Ngăn kéo cảnh báo lỗi FitCheck™ (`fe/`)** | 👤 **IT 1** | ✅ Đã hoàn thành | CP3 |
| **Landing Page 3D cuộn chuột (Apple-style) (`fe/`)** | 👤 **IT 1** | 🔄 Đang triển khai | CP4 |
| **IT3-01 · Nền móng Backend NestJS 11, Schema v2.1 (10 bảng), Docker, CI test (`be/`)** | 👤 **IT 3** | ✅ Đã hoàn thành | CP2 |
| **IT3-02 · Xác thực: Email/Mật khẩu, JWT + Refresh Token xoay vòng, RBAC (`be/`)** | 👤 **IT 3** | ✅ Đã hoàn thành | CP2 |
| **IT3-02 · Xác thực: HttpOnly Cookie & Google OAuth (`be/`)** | 👤 **IT 3** | ✅ Đã hoàn thành | CP2 |
| **UC-02 · Brand Kit: `PATCH /api/users/me/brand-kit` (`be/`)** | 👤 **IT 3** | ✅ Đã hoàn thành | CP3 |
| **IT3-03 · API CRUD dự án, lọc trạng thái & thư mục, `ProjectOwnerGuard` (`be/`)** | 👤 **IT 3** | ✅ Đã hoàn thành (lọc theo cấu trúc hộp, thẻ có loại giấy & điểm FitCheck phía server) | CP3 |
| **IT3-04 · Lưu trữ, thùng rác 30 ngày (cron), nhân bản & snapshot phiên bản (`be/`)** | 👤 **IT 3** | ✅ Đã hoàn thành (xóa file S3/R2 khi dọn thùng rác: xong ở IT3-08) | CP3 |
| **IT3-05 · API bộ sưu tập / thư mục dự án (`be/`)** | 👤 **IT 3** | ✅ Đã hoàn thành | CP3 |
| **IT3-06 · Chia sẻ công khai, Remix (fork) & thả tim (`be/`)** | 👤 **IT 3** | ✅ Đã hoàn thành (thông báo cho tác giả chờ NotificationsModule) | CP4 |
| **IT3-07 · Thư viện mẫu Curated & Community, cache, "Dùng mẫu này" (`be/`)** | 👤 **IT 3** | ✅ Đã hoàn thành (thêm bảng `design_templates`; Thư viện cộng đồng chỉ hiện thiết kế FitCheck ≥ 90 — UC-14) | CP3 |
| **IT3-08 · Lưu trữ file S3 / Cloudflare R2: pre-signed upload, hạn mức, dọn file (`be/`)** | 👤 **IT 3** | ✅ Đã hoàn thành (nén thumbnail bằng `sharp` chưa làm) | CP3 |
| **IT3-09 · AI sinh bảng màu & hoa văn SVG lặp (Claude), giới hạn theo gói (`be/`)** | 👤 **IT 3** | ✅ Đã hoàn thành (cần `ANTHROPIC_API_KEY` để bật AI; chưa có thì dùng bộ sinh thuật toán) | CP3 |
| **IT3-10 · Trải nghiệm mở hộp 3D & sinh mã QR in đáy hộp (`be/`)** | 👤 **IT 3** | ✅ Đã hoàn thành | CP4 |
| **IT3-11 · Xuất file in bất đồng bộ (BullMQ, worker riêng), CI unit + e2e, deploy VPS HTTPS (`be/`)** | 👤 **IT 3** | ✅ Đã hoàn thành (PDF / SVG có ảnh, logo, hoa văn đã upload; đường cắt bao ngoài & lớp bleed chờ IT2 bổ sung trong `@wrapfit/shared`; CI có bước lint ESLint) | CP4 |
| **Tổ chức lại mã nguồn backend theo skeleton nestjs-project-structure: module dưới `src/`, `common/` + `shared/`, cấu hình có kiểu theo `NODE_ENV`, barrel `index.ts`, ESLint `import/no-cycle` (`be/`)** | 👤 **IT 3** | ✅ Đã hoàn thành (09/10/2026; không đổi API hay CSDL) | CP4 |
| **Nối Frontend ↔ Backend (kế hoạch `docs-old/12`, phiên S1–S11): phiên đăng nhập cookie + refresh, 7 trang tài khoản, dashboard / dự án / thư mục / Brand Kit, studio `/editor/[id]` (autosave, xung đột, mốc phiên bản, xuất file, chia sẻ, QR, hoa văn AI), thư viện mẫu, trang công khai, quản trị tài khoản (`fe/`)** | Toàn đội IT | ✅ Đã hoàn thành (S8, 12/10/2026: build monorepo pass, kịch bản end-to-end 15 bước đạt ở 375 px và 1440 px, `fe/scripts/e2e-scenario.mjs`). Phiên dọn S12 (T1–T12): kết quả từng mục ở [18](18_VIEC_CON_TREO_SAU_AUDIT_BE.md) | CP4 |
| **Rà soát giao diện theo 6 kích thước màn hình ([`11`](11_UI_VIEWPORT_AUDIT.md)) (`fe/`)** | 👤 **IT 1** | ✅ Đã hoàn thành | CP4 |
| **Công thức hộp bản 3 (bù độ dày giấy, nét cắt khép kín 4 cấu trúc), FitCheck chung editor + server, 3D gấp từ phôi ([`12`](12_BOX_FORMULA_AUDIT.md)) (`shared/`, `fe/`)** | 👤 **IT 2** | ✅ Đã hoàn thành (chưa in thử 1 : 1 và gấp tay) | CP4 |
| **File in chuẩn xưởng: PDF 4 lớp OCG, màu pha `CutContour` / `Crease` + overprint, `TrimBox` / `BleedBox`, nét liền, chữ khớp canvas (`be/`, `shared/`)** | 👤 **IT 3** | ✅ Đã hoàn thành (chưa mở thử bằng Illustrator / máy cắt) | CP4 |
| **Path 2 MVP cho CP4 (kế hoạch `docs-old/17`, phiên S1–S8): gói & lượt xuất (sổ cái), gating xuất file + watermark tai dán, VietQR thanh toán mô phỏng, đơn in mẫu lưu PostgreSQL, Analytics Dashboard, AI Haiku + cầu chì chi phí, trang giá 19k / 79k / 199k / Pro 99k, khối lượng quà → đáy khóa, nhãn mặt 3D (`shared/`, `be/`, `fe/`)** | Toàn đội IT | ⚠️ **Phạm vi CP4, đã thay thế.** Gói lượt xuất, PDF A4 có watermark và cổng VietQR mô phỏng chỉ đúng ở mốc CP4. Gói lượt xuất ngừng bán từ đợt sửa audit backend (16/11/2026); file in giờ mở theo đơn in đã thanh toán của đúng phiên bản thiết kế ([03](03_API_DESIGN.md)). ✅ Code xong trên `feat/path2-mvp` (30/10/2026: unit 605, e2e 187, `next build`, kịch bản end-to-end có bước thanh toán). ⏳ Deploy `wrap-fit.vercel.app` chờ người giữ tài khoản làm theo [`15`](15_PATH2_DEPLOY_RUNBOOK.md) | CP4 |
| **Cổng thanh toán thật (kế hoạch `docs-old/21`, phiên S1–S7): webhook SePay xác nhận chuyển khoản VietQR thật, VNPay sandbox cho tài khoản demo (`users.is_demo`), đối soát tiền về không khớp cho admin, `CheckoutDialog` hai nhánh + trang `/payments/vnpay-return`, trang `/dashboard/wallet` (lịch sử xu có lọc loại / ngày), đường xác nhận chung `confirmPaid` (`be/`, `fe/`)** | Toàn đội IT | ✅ Code xong trên `feat/payment-gateways`, chưa commit (11/11/2026: unit 774, e2e 241, `tsc` be + fe, lint, `tokens:check`, `next build`). ⏳ Chưa thử với dịch vụ thật: một lần chuyển khoản SePay nhỏ, credential VNPay sandbox, quét QR bằng app ngân hàng — chủ dự án làm theo [`15`](15_PATH2_DEPLOY_RUNBOOK.md) §3.4–3.5 | CP4 |
| **Hướng dẫn tương tác (kế hoạch `docs-old/22`, phiên S1–S5): phần được tô sáng dùng được thật, dòng gợi ý `tryIt` ở mỗi bước có đích, chữ hành động in đậm cam (`**…**`), chuyển luồng thì tour cũ tính là bỏ qua (reload thì không), nút "Xem hướng dẫn" ở Trang chủ và Thư viện mẫu, Studio chạy giới thiệu rồi nối tour bước đang mở (`fe/`)** | 👤 **IT 1** | ✅ Đã hoàn thành (11/11/2026; 11 kịch bản kiểm tay đạt ở chế độ khách / demo offline, popup và dialog thử bằng phần tử giả; chưa chạy đủ `shots --routes`, chưa thử với tài khoản demo; các khoảng trống này chuyển sang [11](11_UI_VIEWPORT_AUDIT.md)) | CP4 |
| **Xu Wrap ([16](16_XU_WRAP_SPEC.md), phiên S1–S6): sổ cái xu theo lô, gói xu, allowance theo kỳ, engine ảnh AI (fal) qua hàng đợi `ai-image` có hoàn xu, hoa văn AI trả bằng xu, công cụ "Ảnh AI" trong Studio, ví và báo cáo xu cho admin (`shared/`, `be/`, `fe/`)** | Toàn đội IT | ✅ Có mã trên `develop` (31/10/2026: 6b50810 → e174111; unit và e2e billing, ai-images đạt). ⏳ Chưa gọi fal thật, giá vốn fal chờ đo (người giữ tài khoản fal) | CP4 |
| **Studio 6 bước và trình chỉnh sửa chuyên nghiệp (kế hoạch `docs-old/23`, phiên S1–S23): Kiểu hộp → Kích thước → Giấy → Thiết kế → Quà & mở hộp → Đặt in; lớp, hình khối, mặt trong, hoàn thiện ép kim, màu in, chữ nâng cao, ảnh cắt/mặt nạ, chọn nhiều, phông tải lên, đổi màu SVG, kệ thư viện, 3 kết cấu mới (`mailer`, `gable`, `insert`), video hộp gập, đổi kích thước thông minh (reflow), FitCheck hướng đọc, hiệu ứng, duyệt mẫu theo phiên bản (`fe/`, `shared/`, `be/`)** | Toàn đội IT | ✅ Có mã trên `develop` (13–18/11/2026; nhật ký S21–S23 ở 23cb2af, duyệt mẫu 10d0a97, giao diện 6 bước qua PR #30–#33). ⏳ Chưa in thử thật các kết cấu mới; câu hỏi cho xưởng ở [18](18_VIEC_CON_TREO_SAU_AUDIT_BE.md) | CP4 |
| **Đợt sửa backend sau audit (kế hoạch `docs-old/25`, phiên S0–S8): bỏ mã ưu đãi, ngừng bán gói lượt xuất và đổi lượt dư sang xu, ẩn danh hóa người dùng có lịch sử tài chính, chỉ tài khoản demo được giả lập thanh toán, `version` chỉ tăng khi thiết kế đổi, hạn mức ảnh kho Pexels, mã đơn `WF-<năm>-<6 chữ số>`, cursor `(createdAt, id)`, hộp thư thông báo (bảng `notifications`, chuông ở header), bỏ Cloudinary và bảng `social_mockups` (`be/`, `fe/`)** | 👤 **IT 3** | ✅ Có mã trên `develop` (16–17/11/2026, gộp ở 1c76bdb ngày 18/11/2026; thông báo 62b00b1). ⏳ Trước deploy phải chạy `db:convert-export-credits --apply` theo [15](15_PATH2_DEPLOY_RUNBOOK.md) | CP4 |
| **Việc còn treo sau audit backend ([18](18_VIEC_CON_TREO_SAU_AUDIT_BE.md)): câu chữ gói Pro, gỡ quảng cáo gói lượt xuất, runbook demo, lỗi nhập ảnh kho, tên cookie trang pháp lý, luật FitCheck, giữ dữ liệu 10 năm theo luật, đồng bộ hai tab** | Toàn đội IT | ✅ Có mã trên `develop` (de2328d, 18/11/2026). ⏳ Các mục còn mở và cách đóng ghi ở [18](18_VIEC_CON_TREO_SAU_AUDIT_BE.md) | CP4 |
| **Review backend và đợt sửa 7 lỗi (review `docs-old/29`, kế hoạch `docs-old/30`)** | 👤 **IT 3** | ✅ Đã kiểm bằng test (19/11/2026: **1.180/1.180 unit (77 bộ), 318/318 E2E (24 bộ), backend**). Gộp vào `develop` ở 09ca9d4. Tóm tắt ở bảng ngay dưới | CP4 |
| **Kịch bản FE end-to-end theo luồng hiện hành (`fe/scripts/e2e-scenario.mjs`): FitCheck chặn → tự sửa → file khóa vì chưa thanh toán → đặt in và thanh toán bằng tài khoản demo → xuất SVG, PDF_CMYK, DXF → đổi tên vẫn giữ quyền → sửa thiết kế thì phiên bản mới bị khóa** | Toàn đội IT | ✅ Đã kiểm bằng E2E (19/11/2026, commit c622f67): chạy đạt ở 375 px và 1440 px với bước mặc định `1-14,16-18`; đơn `WF-2026-186384` và `WF-2026-153719` (local) `PAID` 49.000đ; SVG, PDF_CMYK, DXF tải được; đổi tên vẫn giữ quyền; sửa thiết kế thì phiên bản mới nhận `402`. Ảnh mới liệt kê ở [15 §9](15_PATH2_DEPLOY_RUNBOOK.md#9-ảnh-bàn-giao-cho-slide). ⏳ Chưa chạy trên production | CP4 |
| **Đồng bộ tài liệu sau audit docs (plan 32): gỡ 14 kế hoạch đã xong, đánh số lại tài liệu còn giữ, sửa tham chiếu trong mã** | Toàn đội IT | ✅ Có trên nhánh `docs/sync-after-audit` (19/11/2026). ⏳ Chờ chủ dự án đối chiếu với bản audit rồi gộp vào `develop` | CP4 |

### Review backend 18/11/2026 và commit sửa

Review tại commit 1c76bdb tìm 7 lỗi. Cả 7 đã sửa, kèm test hồi quy. Ba vòng review sau đó tìm thêm 10 lỗi và cũng đã sửa (5bd336d, 3c7c67e, e7ebed7, 0767368, 520c5e7).

| # | Mức | Lỗi | Commit sửa |
|---|---|---|---|
| 1 | P1 | File in có thể khác phiên bản đã qua FitCheck và đã thanh toán, vì worker đọc lại thiết kế hiện tại. Giờ job lưu `project_version` và `design`, worker dựng file từ thiết kế đã lưu | 76eae02 |
| 2 | P1 | Tác vụ dọn storage có thể xóa phông tải lên còn được dùng, vì tham chiếu file bỏ sót `style.fontUrl` và `customFonts[].url` | 999823f |
| 3 | P1 | Hai thanh toán Pro xác nhận cùng lúc chỉ cộng một kỳ. Giờ nhánh Pro khóa theo người dùng | 58f02f7 |
| 4 | P1 | Xóa dự án có thể làm mất thiết kế của đơn đang in. Giờ xóa vĩnh viễn trả `409 PROJECT_IN_ACTIVE_ORDER`, dọn thùng rác bỏ qua dự án đó | 46bc654 |
| 5 | P2 | Khôi phục snapshot có thể ghi đè lần autosave vừa xong. Giờ bản sao lưu dựng từ dòng đã khóa | e2133ce |
| 6 | P2 | Giao lại một job xuất đã hoàn tất làm ghi file và lịch sử hai lần. Giờ worker bỏ qua job đã kết thúc | 76eae02 |
| 7 | P2 | Thư viện ảnh AI bỏ sót ảnh ở ranh giới hai trang. Giờ cursor là `(createdAt, id)` | e2133ce |

> **Ghi chú (02/10/2026)**: Backend được chuyển từ Express sang **NestJS 11** theo kiến trúc tại [`07_SYSTEM_BLUEPRINT_AND_TASK_BREAKDOWN.md`](07_SYSTEM_BLUEPRINT_AND_TASK_BREAKDOWN.md). Các API thử nghiệm của bản Express cũ (dự án, template, upload, AI, xuất SVG/PDF) đã được gỡ khỏi `be/` và sẽ được viết lại theo từng task IT3 ở trên.

## Tài liệu đã gỡ

Ngày 19/11/2026, đợt đồng bộ tài liệu (plan 32) gỡ các kế hoạch đã xong khỏi `docs/` và đánh số lại tài liệu còn giữ. Nội dung còn dùng của mỗi file đã được chuyển sang file nhận trước khi gỡ.

| Số cũ | Tên file (bỏ đuôi `.md`) | Commit cuối còn file | Nội dung đã chuyển tới |
|---|---|---|---|
| 10 | `10_DB_HARDENING_DESIGN` | aa47f4b | Quyết định khóa ngoại và giữ file dùng chung: [02](02_DATABASE_DESIGN.md). Đăng ký và xác minh email: [03](03_API_DESIGN.md), [06](06_FE_INTEGRATION_GUIDE.md) §3 |
| 12 | `12_FE_BE_INTEGRATION_PLAN` | aa47f4b | Kết quả T1–T12 của phiên S12 và các mục còn mở: [18](18_VIEC_CON_TREO_SAU_AUDIT_BE.md). Tiến độ S1–S11: bảng trên |
| 17 | `17_PATH2_MVP_PLAN` | aa47f4b | Deploy và bấm giờ hai lượt trên 4G: [15](15_PATH2_DEPLOY_RUNBOOK.md) |
| 20 | `20_XU_WRAP_FE_HANDOFF` | aa47f4b | Luồng FE của job ảnh: [06](06_FE_INTEGRATION_GUIDE.md). Quy tắc giá: [16](16_XU_WRAP_SPEC.md). Lỗi API: [03](03_API_DESIGN.md) |
| 21 | `21_PAYMENT_GATEWAYS_PLAN` | aa47f4b | Các trường hợp đối soát: [03](03_API_DESIGN.md), [06](06_FE_INTEGRATION_GUIDE.md). Việc người giữ tài khoản cần kiểm: [15](15_PATH2_DEPLOY_RUNBOOK.md) |
| 22 | `22_INTERACTIVE_TOURS_PLAN` | aa47f4b | Kết quả S1–S5: bảng trên. Khoảng trống chưa kiểm: [11](11_UI_VIEWPORT_AUDIT.md) |
| 23 | `23_STUDIO_EDITOR_PRO_PLAN` | aa47f4b | Chức năng editor: [01](01_REQUIREMENTS.md). Cấu trúc canvas và bảng review: [02](02_DATABASE_DESIGN.md). Duyệt mẫu theo phiên bản: [03](03_API_DESIGN.md), [06](06_FE_INTEGRATION_GUIDE.md). Nhập tài sản: [17](17_LIBRARY_CONTENT_GUIDE.md). Câu hỏi cho xưởng và nội dung nhãn: [18](18_VIEC_CON_TREO_SAU_AUDIT_BE.md) |
| 25 | `25_BACKEND_AUDIT_FIX_PLAN` | aa47f4b | Thay đổi API: [03](03_API_DESIGN.md), [06](06_FE_INTEGRATION_GUIDE.md). Đổi lượt xuất cũ sang xu và truy vấn kiểm trước hoàn xu: [15](15_PATH2_DEPLOY_RUNBOOK.md). Điều kiện khi chạy nhiều API: [07](07_SYSTEM_BLUEPRINT_AND_TASK_BREAKDOWN.md), [15](15_PATH2_DEPLOY_RUNBOOK.md). Mục hoãn: [18](18_VIEC_CON_TREO_SAU_AUDIT_BE.md) |
| 29 | `29_BACKEND_CODE_REVIEW` | aa47f4b | Tóm tắt bảy phát hiện và commit sửa: bảng "Review backend 18/11/2026" ở trên |
| 30 | `30_BACKEND_REVIEW_FIX_PLAN` | aa47f4b | Thứ tự migration và job cũ: [15](15_PATH2_DEPLOY_RUNBOOK.md). Quy tắc giữ phông, giữ phiên bản xuất, giữ thiết kế của đơn: [02](02_DATABASE_DESIGN.md), [03](03_API_DESIGN.md), [06](06_FE_INTEGRATION_GUIDE.md). Kết quả test: bảng trên |
| 26, 27, 27a, 31 | Kịch bản video quảng bá, clip demo Studio, prompt và tài liệu pitching | — | Chưa từng vào Git, đã xóa theo quyết định ngày 2026-11-19. Không chuyển nội dung |

Tra lại một file đã gỡ bằng commit ở cột thứ ba, ví dụ:

```powershell
$name = '25_BACKEND_AUDIT_FIX_PLAN'
git show "aa47f4b:docs/$name.md"
```

Hai quy ước về tham chiếu cũ:

- Chú thích trong mã dạng `docs-old/NN` trỏ vào bảng trên. `NN` là số cũ của file đã gỡ.
- Chú thích trong migration Prisma (`be/prisma/migrations/`) giữ nguyên số cũ, vì sửa file migration đã áp dụng làm lệch checksum. Tra số cũ theo bảng trên, hoặc theo bảng đổi số dưới đây.

| Số cũ | Số mới |
|---|---|
| 11 | 10 |
| 13 | 11 |
| 14 | 12 |
| 15 | 13 |
| 16 | 14 |
| 18 | 15 |
| 19 | 16 |
| 24 | 17 |
| 28 | 18 |

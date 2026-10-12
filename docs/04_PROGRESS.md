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
| **Nối Frontend ↔ Backend ([`12`](12_FE_BE_INTEGRATION_PLAN.md), phiên S1–S11): phiên đăng nhập cookie + refresh, 7 trang tài khoản, dashboard / dự án / thư mục / Brand Kit, studio `/editor/[id]` (autosave, xung đột, mốc phiên bản, xuất file, chia sẻ, QR, hoa văn AI), thư viện mẫu, trang công khai, quản trị tài khoản (`fe/`)** | Toàn đội IT | ✅ Đã hoàn thành (S8, 12/10/2026: build monorepo pass, kịch bản end-to-end 15 bước đạt ở 375 px và 1440 px, `fe/scripts/e2e-scenario.mjs`) | CP4 |
| **Rà soát giao diện theo 6 kích thước màn hình ([`13`](13_UI_VIEWPORT_AUDIT.md)) (`fe/`)** | 👤 **IT 1** | ✅ Đã hoàn thành | CP4 |
| **Công thức hộp bản 3 (bù độ dày giấy, nét cắt khép kín 4 cấu trúc), FitCheck chung editor + server, 3D gấp từ phôi ([`14`](14_BOX_FORMULA_AUDIT.md)) (`shared/`, `fe/`)** | 👤 **IT 2** | ✅ Đã hoàn thành (chưa in thử 1 : 1 và gấp tay) | CP4 |
| **File in chuẩn xưởng: PDF 4 lớp OCG, màu pha `CutContour` / `Crease` + overprint, `TrimBox` / `BleedBox`, nét liền, chữ khớp canvas (`be/`, `shared/`)** | 👤 **IT 3** | ✅ Đã hoàn thành (chưa mở thử bằng Illustrator / máy cắt) | CP4 |

> **Ghi chú (02/10/2026)**: Backend được chuyển từ Express sang **NestJS 11** theo kiến trúc tại [`07_SYSTEM_BLUEPRINT_AND_TASK_BREAKDOWN.md`](07_SYSTEM_BLUEPRINT_AND_TASK_BREAKDOWN.md). Các API thử nghiệm của bản Express cũ (dự án, template, upload, AI, xuất SVG/PDF) đã được gỡ khỏi `be/` và sẽ được viết lại theo từng task IT3 ở trên.

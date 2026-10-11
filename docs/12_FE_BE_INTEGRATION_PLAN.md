# 12 — Kế hoạch nối Frontend ↔ Backend

> Ngày lập: 2026-10-10 · Nhánh gốc: `feat/studio-editor-and-mascot-copilot` · Trạng thái: **đã duyệt 2026-10-10**,
> thực hiện theo từng phiên ở [§9](#9-chia-phiên-làm-việc-và-bàn-giao). Phase 7 (rà soát giao diện theo kích thước màn
> hình) thêm ngày 2026-10-11, duyệt và làm ở phiên S9 (kết quả: [`13`](13_UI_VIEWPORT_AUDIT.md)). Phase 8 (rà soát
> công thức hộp: dieline, 3D, FitCheck, file in) thêm ngày 2026-10-11, làm ở phiên S10
> Contract API: [`06_FE_INTEGRATION_GUIDE.md`](06_FE_INTEGRATION_GUIDE.md) (cách dùng), Swagger `http://localhost:8080/api/docs`
> (nguồn sự thật), [`03_API_DESIGN.md`](03_API_DESIGN.md). Kiến trúc Stitch: [`11_STITCH_PARITY_AUDIT.md`](11_STITCH_PARITY_AUDIT.md).

Mục lục: [1. Hiện trạng](#1-hiện-trạng) · [2. Quyết định](#2-quyết-định-đã-chốt) · [3. Bản đồ màn hình](#3-bản-đồ-màn-hình--api) ·
[4. Các phase](#4-các-phase) (Phase 8: [công thức hộp](#phase-8--rà-soát-và-sửa-công-thức-hộp-thêm-2026-10-11)) · [5. Sở hữu file](#5-ma-trận-sở-hữu-file) · [6. Điều phối subagent](#6-điều-phối-subagent) ·
[7. Kiểm thử](#7-kịch-bản-kiểm-thử-end-to-end) · [8. Rủi ro, câu hỏi mở](#8-rủi-ro-và-câu-hỏi-mở) ·
[9. Phiên làm việc](#9-chia-phiên-làm-việc-và-bàn-giao)

---

## 1. Hiện trạng

### 1.1. Backend: sẵn sàng

56 route HTTP đã chạy và có test (danh mục: `06` §16). Phiên đăng nhập bằng 2 cookie HttpOnly (`wf_access` path `/api`,
`wf_refresh` path `/api/auth`), lỗi có `code` ổn định, upload qua URL ký sẵn, xuất file in qua BullMQ + polling.
**Không cần thêm endpoint nào cho kế hoạch này**, trừ các mục ghi "cần BE" ở §8.

### 1.2. Frontend: gần như chưa nối

| Hạng mục | Thực tế trong code |
|---|---|
| Màn hình gọi API | 2 / 44: `views/editor/studio` (load, autosave, snapshot, export) và `views/unbox` (đọc dữ liệu nhưng **không render**) |
| HTTP client `services/api` | Có `credentials: 'include'` và `ApiError`, nhưng không xử lý `401` → refresh, không đọc `code` / `requestId` |
| Module `src/api/*` | `auth`, `users`, `common` rỗng. `projects`, `ai`, `exports`, `unboxing` trả **dữ liệu giả khi lỗi** (che lỗi API) |
| Kiểu `types/api` | Lệch backend ở mọi DTO (bảng `06` §13) |
| Trang đăng nhập | Màn Stitch generated, nút "Đăng nhập" chỉ hiện toast giả rồi chuyển `/dashboard` |
| Trang nhận link email | Chưa có `/verify-email`, `/reset-password`, `/complete-signup`, `/check-email`, `/forgot-password` |
| Header / avatar | Tên, ảnh, gói cước cứng (`Packy Studio`), "Đăng xuất" chỉ là link `/auth/login` |
| Dashboard, Brand Kit, Settings, Admin accounts | Markup tĩnh (Stitch), số liệu và thẻ dự án cứng |
| Luồng tạo dự án | `/editor/step-1..4` là mockup tĩnh, không tạo dự án, không mang `projectId`; `/editor/studio` không có id |
| Trang công khai, thư viện mẫu | Chưa có `/p/[slug]`, `/templates` |

### 1.3. Lỗi tích hợp tìm thấy khi đọc code (ngoài bảng `06` §13)

1. *(Đã xử lý ở S1)* **Generator Stitch xoá CSS khi đổi status.** `scripts/stitch/sync.mjs` chỉ sinh cho screen `converted` và xoá mọi file
   CSS / behavior có banner `AUTO-GENERATED` trước khi sinh lại. Đổi một screen sang `manual` để viết tay → lần sync sau
   mất `screens/<slug>.css` và biến token `[data-stitch="<slug>"]`, giao diện vỡ. Cần status mới (Phase 0).
2. *(Đã xử lý ở S1)* **`views/dashboard/index.tsx` đã sửa tay nhưng screen vẫn `converted`**: `npm run stitch:sync` sẽ
   ghi đè mất các thay đổi của commit `e509d8f`. S1 tìm thấy thêm 24 file generated khác cũng đã sửa tay.
3. **Cookie path `/api`** nên request trang `/dashboard` không mang cookie: không chặn được bằng Next `middleware.ts`,
   kiểm tra đăng nhập phải làm phía client (`GET /api/auth/me`).
4. *(Đã xử lý ở S1)* **`.env.example`, `fe/.env.example`, `docker-compose.yml` đặt `NEXT_PUBLIC_API_URL=http://localhost:8080/api`** (gọi
   thẳng cổng 8080), trái khuyến nghị proxy cùng domain của `07` §1.2. `next.config.mjs` đã có rewrite `/api/*` nhưng
   không được dùng.
5. **Studio upload ảnh bằng data URL** (`FileReader.readAsDataURL`): backend từ chối (`content` ≤ 5000 ký tự, chỉ nhận
   file đã upload).
6. **Xuất file**: gửi `fileType: "PDF"` (đúng là `PDF_CMYK`), không xử lý `422` FitCheck, `setInterval` 1.5 giây không
   dừng khi rời trang.
7. **Dieline trong studio** gọi thẳng `generateTuckTopDieline`… thay vì
   `generateDielinePieces(templateId, dimensions, formulaVersion)`: hình trên màn hình có thể lệch file in khi công thức
   đổi phiên bản.
8. **Hoa văn AI**: `canvasState.backgroundPattern` chỉ nhận id preset `[a-z0-9_-]{1,40}`, không nhận SVG. Tile SVG do
   `POST /api/ai/pattern` trả về muốn lưu được phải upload thành file (`purpose: LOGO`, nhận SVG) rồi thêm phần tử
   `type: "pattern"` với `content` = `fileUrl`.
9. *(Đã xử lý ở S1)* **Rewrite của Next ở chế độ `standalone` được chốt lúc build**: `BACKEND_INTERNAL_URL` phải có mặt khi `next build`
   trong Docker, không chỉ lúc chạy.

## 2. Quyết định đã chốt

| # | Quyết định | Lý do |
|---|---|---|
| D1 | **Editor chính là `/editor/[id]`** (view `editor/studio`). Thêm `/editor/new` cho bước 1–2 (chọn cấu trúc, kích thước) rồi `POST /api/projects` và `router.replace('/editor/<id>')`. `/editor`, `/editor/studio`, `/editor/step-1..4`, `/editor/export` chuyển hướng về `/editor/new` (dự án mới) hoặc giữ làm tham khảo | Studio đã có autosave + version + export; khớp `07` IT1-01; tránh viết logic lưu 5 lần |
| D2 | **Màn Stitch cần dữ liệu thật chuyển sang status `wired`**: generator vẫn sinh CSS, token, behavior nhưng **không** ghi view / page; view viết lại thành React component giữ nguyên markup và class | Có type, state React, không bị `stitch:sync` ghi đè, không mất CSS |
| D3 | **`@tanstack/react-query`** cho mọi lệnh đọc / ghi API | Cache, invalidate sau mutation, trạng thái loading / error thống nhất |
| D4 | **Proxy cùng domain**: trình duyệt luôn gọi `/api/...` (local qua rewrite của Next, production qua Caddy). Code server (SSR, `generateMetadata`) gọi `BACKEND_INTERNAL_URL` | Cookie same-origin, không phụ thuộc CORS, giống production |
| D5 | **Không còn dữ liệu giả khi API lỗi**. Lỗi hiện thông báo (kèm `requestId`). Riêng `/editor/demo` chạy offline hoàn toàn, không gọi API | Theo `06` §13: dữ liệu giả che lỗi API |
| D6 | **Màn không có backend giữ nguyên tĩnh**, không nối, không gắn nhãn, không ẩn link: `/pricing`, `/checkout/*`, `/dashboard/orders`, `/dashboard/materials`, `/dashboard/specs`, `/notifications`, `/team`, `/support`, `/auth/2fa`, `/editor/inspect/fefco`, `/editor/materials/backdrop`, mọi `/admin/*` trừ `/admin/accounts` | Backend chưa có module tương ứng (thanh toán, đơn hàng, thông báo, 2FA…); giữ nguyên để test UI/UX |
| D7 | **Xác minh email không bắt buộc nhập mật khẩu**: `/verify-email` xác minh xong → nút tới `/auth/login` | Bản hiện tại của backend (`06` §3.4); không cần sửa BE |
| D8 | **Làm theo từng phiên** (§9): mỗi phiên tự đủ, kết thúc bằng typecheck + commit + ghi nhật ký bàn giao, phiên sau đọc nhật ký để làm tiếp | Phòng hết hạn mức trong một lần chạy |

## 3. Bản đồ màn hình ↔ API

| Route | Nguồn hiện tại | Phase | API dùng (mục trong `06`) |
|---|---|---|---|
| `/auth/login`, `/auth/register` | Stitch `auth-login` → `wired` | 1 | `auth/login`, `auth/register`, `auth/google` (§3) |
| `/login`, `/register` | mới: chuyển hướng giữ query | 1 | — (backend chuyển về `/login?error=google_*`) |
| `/check-email`, `/verify-email`, `/forgot-password`, `/reset-password`, `/complete-signup` | mới | 1 | `verify-email`, `verify-email/resend`, `password/forgot`, `password/reset` (§3.3–3.6) |
| Header, avatar, bottom nav | viết tay | 1 | `auth/me`, `auth/logout` (§1) |
| `/dashboard` | viết tay, đang `converted` → `wired` | 2 | `GET /projects?limit=`, `storage/usage`, `ai/usage` |
| `/dashboard/projects` | Stitch → `wired` | 2 | `projects` (list, status, duplicate, delete), `collections` (§5.1, §5.4, §12) |
| `/dashboard/brand-kit` | Stitch → `wired` | 2 | `users/me/brand-kit`, upload `LOGO` (§4, §12) |
| `/dashboard/profile` | viết tay | 2 | `users/me`, upload `AVATAR` |
| `/dashboard/settings` | Stitch → `wired` | 2 | `auth/logout-all`, `password/forgot` (đổi mật khẩu qua email), `storage/usage` |
| `/editor/new` | mới (studio bước 1–2) | 3 | `templates/structures`, `templates/:id`, `POST /projects` (§5.1, §9) |
| `/editor/[id]` | viết tay, nối một phần | 3 | `projects/:id` (GET, PATCH), `snapshots`, `storage`, `exports`, `visibility`, `unboxing`, `ai` (§5–§11) |
| `/templates` | mới | 4 | `templates/hub` × 2 phân khu, `templates/structures` (§9) |
| Trang chủ `#thu-vien-mau` | viết tay | 4 | `templates/hub?section=curated&limit=6` |
| `/p/[slug]` | mới | 4 | `public/projects/:slug`, `fork`, `like` (§8) |
| `/unbox/[slug]` | viết tay, đọc API nhưng chưa render | 4 | `public/unboxing/:slug` (§10) |
| `/admin/accounts` | Stitch → `wired` | 5 | `GET/PATCH/DELETE /users` (admin, §16) |

## 4. Các phase

Mỗi phase có **DoD** (điều kiện xong). Mọi phase: `npx tsc --noEmit -p fe` sạch lỗi trong file mình sở hữu; tuân thủ
`AGENTS.md` §6 (đọc skill liên quan trong `.agents/skills/` trước khi code).

### Phase 0 — Nền móng (tuần tự, chặn mọi phase sau)

| # | Việc | File |
|---|---|---|
| 0.1 | Generator: status `wired` = sinh CSS + token + behavior, **không** ghi view / page. `STITCH_ROUTES` giữ route `wired` (BottomNavBar vẫn ẩn). `stitch:parity` bỏ qua `wired` trừ khi có `--include-wired`. *(Thêm trong S1)* `stitch/generated.lock.json`: không ghi đè / xoá file generated đã sửa tay (`--force` để ghi đè) | `scripts/stitch/sync.mjs`, `lib/guard.mjs`, `visual-parity.mjs` |
| 0.2 | Đổi `auth-login`, `dashboard`, `dashboard-projects`, `dashboard-brand-kit`, `dashboard-settings`, `admin-accounts` sang `wired`; chạy `stitch:sync`, `git diff` chỉ được đổi `screens.json` | `stitch/screens.json` |
| 0.3 | Cài `@tanstack/react-query`; `AppProviders` (QueryClient + AuthProvider + Toaster) bọc trong `app/layout.tsx` | `fe/package.json`, `src/layouts/main/` |
| 0.4 | Viết lại HTTP client: base `/api`; body `FormData` không đặt `Content-Type`; `204` → `undefined`; `401` → **một** `POST /auth/refresh` dùng chung (single-flight) rồi gửi lại 1 lần, trừ các route `auth/login|register|refresh|logout|verify-email*|password/*`; refresh thất bại → phát sự kiện `session-expired` (không tự `location.assign`); `ApiError { status, code, messages[], requestId, currentVersion?, fitCheck?, retryAfter? }`; hàm `errorMessage(err)` tiếng Việt theo bảng `06` §2 | `src/services/api/` |
| 0.5 | Kiểu dữ liệu theo `06` §14 và DTO thật trong `be/src/<module>/dto` (đối chiếu `GET /api/docs-json`): `SafeUser`, `ProjectSummary`, `ProjectDetail`, `Paginated<T>`, `SnapshotSummary`, `PresignedUpload`, `ApiErrorBody`, `ExportJob`, `AiPatternResult`, `AiUsage`, `StorageUsage`, `Collection`, `TemplateStructure`, `HubCard`, `TemplateDetail`, `UnboxingConfig`, `PublicUnboxing`, `PublicProject` | `src/types/api/` |
| 0.6 | Module API phủ đủ 56 route, **bỏ mọi fallback giả**: `auth`, `users`, `admin` (users + `health/details`), `projects` (+ snapshots), `collections`, `templates`, `public`, `storage`, `exports`, `unboxing`, `ai`. `uploadFileToStorage` giữ nguyên (đã đúng) | `src/api/*` |
| 0.7 | `queryKeys` dùng chung; hook `useMe()` | `src/hooks/data/` |
| 0.8 | Auth: `AuthProvider` (`useMe`, lắng nghe `session-expired`), `useAuth() { user, status, logout, logoutAll }`, `<RequireAuth role?>` (chưa đăng nhập → `/auth/login?redirect=<path>`; sai role → 403 view), `safeRedirect()` chỉ nhận đường dẫn nội bộ bắt đầu bằng `/` (không `//`) | `src/features/auth/` |
| 0.9 | UI chung: toast (Anime.js, theo skill `wrapfit-design-system`), `ErrorState` (hiện `requestId`), `EmptyState`, `app/error.tsx`, `app/not-found` giữ nguyên | `src/components/common/`, `src/app/error.tsx` |
| 0.10 | Môi trường: `NEXT_PUBLIC_API_URL=/api` trong `.env.example`, `fe/.env.example`, `docker-compose.yml`; frontend container có `BACKEND_INTERNAL_URL=http://backend:8080` ở **cả build arg lẫn runtime**; `fe/src/config` thêm `SERVER_API_BASE_URL`. Ghi chú `TRUST_PROXY=true` cho backend local khi đi qua proxy (giới hạn đăng nhập theo IP) | `.env.example`, `fe/.env.example`, `docker-compose.yml`, `fe/Dockerfile`, `fe/src/config/` |

**DoD**: `tsc` và `next build` pass; 29 màn Stitch còn lại không đổi (`stitch:parity` ≤ ngưỡng cũ); gọi thử
`useMe()` trên một trang trả `401` khi chưa đăng nhập và `SafeUser` sau khi đăng nhập bằng tài khoản seed.

### Phase 1 — Tài khoản và phiên (Agent A)

1. `views/auth/login` → React: một form 2 chế độ (đăng nhập / đăng ký) giữ markup Stitch. Đăng nhập thành công → `?redirect=`
   hoặc `/dashboard`; `EMAIL_NOT_VERIFIED` → `/check-email?email=`. Đăng ký luôn → `/check-email` (không bao giờ báo
   "email đã tồn tại"). Validate mật khẩu 8–72 ký tự, có chữ và số. Nút Google điều hướng trình duyệt tới
   `/api/auth/google?redirect=…`. Đọc `?error=google_auth_failed|google_account_rejected`.
2. `/auth/register` mở sẵn chế độ đăng ký. `/login`, `/register` chuyển hướng sang `/auth/*` giữ query.
3. Trang mới: `/check-email` (nút gửi lại khoá 60 giây), `/verify-email` (tự gọi khi mở, xử lý `AUTH_TOKEN_*`),
   `/forgot-password`, `/reset-password` và `/complete-signup` (chung component, khác tiêu đề; thành công → `/auth/login`
   với thông báo).
4. `MainHeader`, `UserAvatarDropdown`, `DashboardTopBar`, `DashboardHeaderNav`, `BottomNavBar`: tên, ảnh, gói cước thật từ
   `useAuth()`; chưa đăng nhập → nút "Đăng nhập"; "Đăng xuất" gọi `logout` rồi về `/`; mục "Admin" chỉ hiện với `ADMIN`.

**DoD**: đăng ký → mở thư trong Mailpit (`http://localhost:8025`) → xác minh → đăng nhập → header hiện đúng tên;
quên mật khẩu → đặt lại → mọi phiên bị đăng xuất; để `wf_access` hết hạn (15 phút, hoặc xoá cookie) thì request kế tiếp
tự refresh, không văng ra trang đăng nhập.

### Phase 2 — Dashboard, dự án, bộ sưu tập, hồ sơ (Agent B)

1. `/dashboard`: 4 dự án sửa gần nhất (thumbnail, cấu trúc, `fitcheckScore`), dung lượng (`storage/usage`), lượt AI
   (`ai/usage`), CTA "Tạo hộp mới" → `/editor/new`. Bọc `<RequireAuth>`.
2. `/dashboard/projects` → React: tab `ACTIVE` / `ARCHIVED` / `DELETED`, tìm kiếm `q` (debounce 300 ms), sắp xếp,
   phân trang `meta`, lọc theo thư mục (`collectionId=<id>|none`). Thao tác: mở (`/editor/<id>`), nhân bản, lưu trữ,
   chuyển thùng rác (`PATCH status DELETED`), khôi phục, xoá vĩnh viễn (chỉ trong thùng rác, có xác nhận), đưa vào thư
   mục. Thùng rác hiện "Tự xoá sau N ngày" = `deletedAt + 30 ngày`. Thanh thư mục: tạo / sửa / xoá collection
   (`colorTag`, tối đa 100).
3. `/dashboard/brand-kit` → React: logo (upload `LOGO`), 3–5 màu, ≤ 3 font, slogan; lưu **cả bộ**.
4. `/dashboard/profile`: `fullName`, `shopName`, ảnh đại diện (upload `AVATAR`, `null` = xoá).
5. `/dashboard/settings` → React: "Đăng xuất mọi thiết bị", "Đổi mật khẩu" (gửi link qua `password/forgot` tới email
   hiện tại), dung lượng lưu trữ theo gói. Phần không có API (thông báo, ngôn ngữ…) giữ tĩnh.

**DoD**: tạo dự án ở Phase 3 hiện ngay ở dashboard (invalidate query); vòng đời ACTIVE → ARCHIVED → DELETED → ACTIVE →
xoá vĩnh viễn chạy đúng; lỗi `FILE_NOT_OWNED` / `413` / `403` hạn mức hiện thông báo đúng.

### Phase 3 — Studio editor (Agent C, chia 2 đợt vì cùng sửa `views/editor/studio`)

**Đợt 3a — tạo, mở, lưu**

1. `/editor/new`: bước 1 lấy cấu trúc từ `GET /templates/structures` (thay danh sách cứng trong
   `Step1BoxTemplatePicker`), bước 2 validate theo `dimensionLimits`; "Tiếp tục" → `POST /projects` → `router.replace`.
   Hỗ trợ `?template=<designTemplateId>` (từ Thư viện mẫu): đọc `GET /templates/:id`, gửi `designTemplateId` +
   `canvasState`.
2. `/editor/[id]`: tải bằng React Query; dieline bằng `generateDielinePieces(template.id, dimensions, formulaVersion)`;
   hiện FitCheck theo `fitcheckState` server trả sau mỗi lần lưu (giữ FitCheck client để phản hồi tức thì khi kéo).
   `404` → trang "Không tìm thấy dự án". Bọc `<RequireAuth>`.
3. Autosave giữ cơ chế `version` hiện có; `409 PROJECT_VERSION_CONFLICT` → hộp thoại **Tải bản mới / Ghi đè** (ghi đè =
   gửi lại với `currentVersion`). Dự án trong thùng rác → chế độ chỉ đọc + nút khôi phục.
4. Upload ảnh / logo: `uploadFileToStorage(file, 'IMAGE'|'LOGO', projectId)` thay data URL; hiện tiến trình và lỗi.
5. Thumbnail: render canvas 2D thành PNG (`toBlob`) → upload `THUMBNAIL` → `PATCH { thumbnailUrl }`, tối đa 1 lần / 60
   giây và khi rời trang.
6. Chuyển hướng: `/editor`, `/editor/studio`, `/editor/step-1..4`, `/editor/export` → `/editor/new` (`next.config.mjs`
   `redirects`); cập nhật link trong trang chủ, header, dashboard trỏ `/editor/new`.

**Đợt 3b — tính năng quanh dự án** (mỗi tính năng là component riêng trong `features/studio/components/<tên>/`)

7. Mốc phiên bản: danh sách, tạo (kèm `previewUrl` = thumbnail mới nhất), khôi phục → thay state editor bằng `project`
   trả về + nút "Hoàn tác" (`backup.id`), xoá; báo `409` khi đủ 50 mốc.
8. Xuất file: chọn `PDF_CMYK` / `SVG` / `DXF`; `422` → mở `FitCheckDrawer` với `fitCheck.violations`; poll 2 giây bằng
   React Query `refetchInterval` (tự dừng khi rời trang); `COMPLETED` → nút tải, link hết hạn → tải lại job;
   mascot `delivery` khi chờ, `celebration` khi xong; lịch sử `GET /projects/:id/exports`.
9. Chia sẻ: `PATCH visibility` (`PRIVATE` / `UNLISTED` / `PUBLIC`, `allowFork`), sao chép link `/p/<slug>`; đưa lên thư
   viện cộng đồng = `PUBLIC` + `occasion` / `industry` (báo trước điều kiện `fitcheckScore ≥ 90`).
10. Mở hộp QR: form `recipientName`, `giftNote`, `particleEffect`, `audioTrackUrl` (https); xem / tải QR PNG, SVG
    (`qrCodeUrl` hoặc `GET .../unboxing/qr`); xoá.
11. Hoa văn AI: `POST /ai/pattern` → xem trước tile + palette → "Dùng" = upload SVG (`LOGO`) và thêm phần tử `pattern`;
    hiện lượt còn lại, `429` khi hết lượt.

**DoD**: tạo dự án mới → thêm chữ + ảnh upload → F5 vẫn còn; mở 2 tab, sửa cả hai → tab sau thấy hộp thoại xung đột;
xuất PDF có ảnh thành công và tải được; vi phạm safe margin → `422` mở FitCheck; link `/p/<slug>` và QR mở đúng trang.

### Phase 4 — Trang công khai và Thư viện mẫu (Agent D)

1. `/templates`: 2 phân khu (Curated, Community) gọi riêng, bộ lọc `structure`, `occasion`, `industry`, `material`, `q`
   (nhãn tiếng Việt), phân trang. Thẻ Curated → "Dùng mẫu này" → `/editor/new?template=<id>`; thẻ Community → `/p/<slug>`.
2. Trang chủ `#thu-vien-mau`: 6 mẫu Curated thật, nút "Xem tất cả" → `/templates`.
3. `/p/[slug]`: hộp 3D với canvas của dự án (dùng `InteractiveFoldingBox3D` có sẵn), tác giả, ghi công `forkedFrom`,
   lượt xem / tim. Thả tim, Remix (chưa đăng nhập → `/auth/login?redirect=/p/<slug>`; `allowFork: false` → ẩn nút; xong →
   `/editor/<id mới>`). `generateMetadata` gọi API phía server (`SERVER_API_BASE_URL`): `UNLISTED` → `robots: noindex`;
   `404` → `notFound()`.
4. `/unbox/[slug]`: render dữ liệu thật (`recipientName`, `giftNote`, `sender`, `box` lên 3D, `particleEffect`, nhạc nếu
   có); `404` → trang "Mã QR không còn hiệu lực"; bỏ dữ liệu giả.

**DoD**: mở `/templates` khi chưa đăng nhập vẫn xem được; Remix từ `/p/<slug>` của người khác tạo dự án trong tài khoản
mình; quét QR (mở `unboxUrl`) hiện đúng lời chúc.

### Phase 5 — Quản trị tài khoản (Agent E)

1. `/admin/accounts` → React, bọc `<RequireAuth role="ADMIN">`: bảng người dùng phân trang, đổi `role`, khoá / mở
   (`isActive`), xoá (xác nhận 2 bước, nói rõ file của người đó bị xoá). Không cho tự sửa mình (backend trả `400`).
2. (Tuỳ chọn) `/admin` hiện ô "Tình trạng hệ thống" từ `GET /health/details`. Phần còn lại của `/admin/*` giữ tĩnh (D6).

**DoD**: tài khoản `MAKER` mở `/admin/accounts` thấy trang 403; admin khoá một tài khoản thì phiên của tài khoản đó
bị thu hồi.

### Phase 6 — Tích hợp, kiểm thử, tài liệu (agent chính)

1. `npm run build` toàn monorepo; `stitch:parity` cho 23 màn còn `converted`.
2. Chạy kịch bản §7 trên trình duyệt với backend + worker + Mailpit thật; chụp ảnh bằng chứng.
3. Review diff (`/code-review`), sửa lỗi.
4. Cập nhật `06` §13 (đánh dấu đã sửa), `04_PROGRESS.md`, `fe/README.md` (cách chạy cùng backend), `11` (status `wired`).

### Phase 7 — Rà soát giao diện theo kích thước màn hình (thêm 2026-10-11)

**Lý do.** Từ S1 tới S5, giao diện được kiểm trong pane trình duyệt của ứng dụng. Pane chỉ rộng khoảng 570–720 px, và
ảnh chụp viewport giả lập lớn hơn bị thu nhỏ theo pane, nên các lần "kiểm trên trình duyệt" thực chất chỉ thấy bố cục
mobile / tablet. Lần kiểm lại desktop ở cuối S5 (chụp đủ độ phân giải) tìm ra lỗi có từ trước: nút CTA của
`MainHeader` bị đẩy ra ngoài màn hình ở mọi độ rộng desktop, tên cạnh avatar tràn khỏi thanh, thanh tab dashboard bị
cắt, dock trang Cài đặt che footer. Kiểm tra tự động cũ (`scrollWidth > clientWidth`) không bắt được các lỗi này: phần
tử `fixed` bị đẩy ra ngoài không làm trang cuộn ngang.

**Phạm vi.** Mọi màn đã làm hoặc đã sửa từ S1 tới S5, cộng khung chung xuất hiện trên mọi trang:

| Nhóm | Màn / thành phần | Phiên gốc | Ghi chú |
|---|---|---|---|
| G1 Khung chung | `MainHeader` (mega menu, menu mobile), `UserAvatarDropdown` (menu mở), `DashboardHeaderNav`, `AdminSidebarNav`, `BottomNavBar` + Gói (Dynamic Island), `MainFooter`, toast, `ErrorState` / `EmptyState` / `PageLoader`, `app/error.tsx`, `not-found`, trang 403 của `RequireAuth` | S3, S4, S5 | Sửa ở đây ảnh hưởng mọi trang: làm trước |
| G2 Tài khoản | `/auth/login`, `/auth/register`, `/check-email`, `/verify-email` (đang xác minh / thành công / link hết hạn), `/forgot-password`, `/reset-password`, `/complete-signup`, banner `?error=google_*`, `?notice=` | S4 | Chưa từng chụp ở desktop |
| G3 Quản trị | `/admin/accounts`: bảng, phân trang, drawer chi tiết, hộp thoại khoá / xoá, hàng của chính mình; 403 với MAKER | S4 | Bảng rộng: cuộn ngang trong vùng bảng, không phải cả trang |
| G4 Dashboard | 5 trang S5 + menu thao tác, hộp thoại thư mục / chuyển thư mục / xoá vĩnh viễn, thùng rác, trạng thái rỗng (tài khoản mới), lỗi upload | S5 | Đã chụp 1280–1920 ở cuối S5; còn 768, 1024, các hộp thoại và trạng thái rỗng |
| G5 Công khai | Trang chủ (toàn trang), `/templates` (lọc, không có kết quả, trang sau), `/p/[slug]` (khách / chủ / người khác, `allowFork: false`), `/unbox/[slug]` (trước / sau khi mở), `/unbox`, `/unbox/<mã sai>` | S5 | Như G4 |
| G6 Màn Stitch tĩnh | 23 màn `converted` và 11 màn `approximation` còn tĩnh theo D6 | trước S1, sửa tay ở `e07d23b`, `e509d8f` | Chỉ sửa khung (header, footer, nav, tràn, chồng lấn), không sửa nội dung. Sửa qua component dùng chung hoặc `stitch/overrides.json`; file generated đã khoá (docs/11 §3) thì ghi lý do khi sửa tay |
| G7 Studio | `/editor/[id]`, `/editor/step-1..4`, `/editor/studio`, `/editor/export` | trước S1 | Chỉ chụp mốc ban đầu và ghi lỗi; sửa trong S6 / S7 (Agent C sở hữu file) |

**Ma trận kích thước.** Mỗi màn chụp ở 6 kích thước, tương ứng các breakpoint Tailwind của app:

| Mã | Viewport | Đại diện | Breakpoint |
|---|---|---|---|
| M | 375 × 812, giả lập mobile + cảm ứng | điện thoại | dưới `sm` (BottomNavBar, bottom sheet) |
| T | 768 × 1024 | tablet dọc | `md` |
| L | 1024 × 768 | tablet ngang, laptop nhỏ | `lg` (nav desktop chưa hiện) |
| X | 1280 × 800 | laptop | `xl` (nav desktop hiện, chật nhất) |
| X+ | 1440 × 900 | màn laptop phổ biến | giữa `xl` và `2xl` |
| W | 1920 × 1080 | màn rời | `2xl` (`max-w-[1560px]`, `[1720px]`) |

Vai trò: khách, MAKER mới (chưa có dữ liệu, để thấy trạng thái rỗng), ADMIN có dữ liệu. Trạng thái lỗi (tắt backend):
một lượt ở M và X+ cho các trang G1, G4, G5.

**Các bước**

| # | Việc | File |
|---|---|---|
| 7.1 | Nâng `page-shots`: danh sách route trong file (đường dẫn, vai trò, thao tác trước khi chụp: mở menu, hộp thoại, drawer, hover mega menu); báo phần tử bị đẩy ra ngoài màn hình (kể cả trong `fixed` / `sticky`, bỏ qua vùng tự cuộn ngang), ảnh vỡ (`naturalWidth = 0`), request ≥ 400 ngoài danh sách dự kiến, chữ tràn khỏi nút; mobile giả lập cảm ứng | `fe/scripts/page-shots.mjs`, `fe/scripts/page-shots.routes.json` (mới) |
| 7.2 | Dữ liệu thử dựng lại được: tạo tài khoản MAKER (xác minh qua Mailpit), dự án ở cả 3 trạng thái, thư mục, dự án PUBLIC / UNLISTED / `allowFork: false`, mở hộp QR; `--clean` xoá sạch | `fe/scripts/ui-fixtures.mjs` (mới) |
| 7.3 | Quét tự động mọi route nhóm G1–G7 × 6 kích thước × vai trò; lưu kết quả thành bảng route × kích thước | `docs/13_UI_VIEWPORT_AUDIT.md` (mới) |
| 7.4 | Xem từng ảnh theo checklist bên dưới: G1–G5 ở cả 6 kích thước; G6 ở M, T, W (X đã có `stitch:parity` ở 1280); G7 ở M, X+ | — |
| 7.5 | Kiểm tương tác ở đúng kích thước: luồng bấm trong pane với `resize_window` nhỏ hơn hoặc bằng độ rộng pane; trạng thái mở (menu, hộp thoại, toast) ở desktop chụp bằng thao tác của 7.1 | — |
| 7.6 | Sửa lỗi: G1 trước, rồi G2–G5, G6. Mức P1 (che / cắt nội dung, không bấm được, tràn ngang) và P2 (bố cục lệch, nút xuống dòng, cột / khoảng trắng bất hợp lý) sửa trong phase; P3 (thẩm mỹ nhỏ) và mọi lỗi G7 ghi vào docs/13 | theo §5 |
| 7.7 | Chụp lại sau khi sửa, cập nhật docs/13 (trạng thái từng ô); đo lại `stitch:parity` làm mốc mới (header đã đổi font trên màn Stitch ở S5) | `docs/11` (mốc parity) |

**Checklist mỗi ảnh**

1. Không có gì bị cắt, đẩy ra ngoài màn hình hay tràn khỏi khung chứa (header, thẻ, bảng, nút).
2. Header và thanh điều hướng vừa một hàng; mục đang mở nhìn thấy được.
3. Phần tử nổi (dock, bottom nav, Gói, toast) không che nội dung hoặc footer ở cuối trang.
4. Nút và nhãn ngắn không xuống dòng; chữ dài cắt bằng `truncate` có `title`, hoặc xuống dòng có chủ đích.
5. Lưới đổi số cột hợp lý theo kích thước: không có thẻ khổng lồ ở W, không 1 cột ở desktop.
6. Khoảng cách và căn lề thống nhất giữa header, thanh tab và nội dung.
7. Mobile: vùng bấm ≥ 44 px, không cần zoom, bàn phím ảo không che ô nhập (form G2).
8. Font, màu đúng token của app (Cormorant / Playfair, Plus Jakarta, JetBrains Mono), kể cả bên trong màn Stitch.
9. Trạng thái rỗng, lỗi, đang tải căn giữa, đọc được, có lối thoát (nút thử lại / quay lại).
10. Ảnh, icon (Material Symbols) và mô hình 3D hiện đủ, không ảnh vỡ.

**DoD**: mọi route G1–G6 qua quét tự động ở 6 kích thước với 0 phần tử ra ngoài màn hình, 0 tràn ngang, 0 ảnh vỡ, 0 lỗi
console ngoài danh sách đã biết; mọi ảnh G1–G5 đã xem theo checklist, lỗi P1 / P2 đã sửa; P3 và G7 có trong docs/13 kèm
phiên sẽ sửa; `tsc`, `next build` pass; mốc `stitch:parity` mới đã ghi.

### Phase 8 — Rà soát và sửa công thức hộp (thêm 2026-10-11)

**Lý do.** Ở S6 tìm ra 2 lỗi trong công thức hộp nắp gài (nắp đè mặt sau, không có nét cắt), đã sửa bằng công thức
phiên bản 2 (`7e4e105`). Rà nhanh khi viết phase này thấy lỗi cùng loại ở mọi cấu trúc: hộp gối, âm dương, bao diêm
cũng **không có nét cắt**, nên lớp cắt của file in PDF / SVG / DXF trống, xưởng không bế được. Mỗi nơi vẽ hộp (dieline
2D, mô hình 3D, ảnh xem trước, file in, thumbnail) lại tự có công thức riêng, không đối chiếu với nhau. Phase này kiểm
toàn bộ chuỗi, từ công thức tới mọi nơi dùng nó, và sửa để hình trên màn hình, mô hình 3D và file in là **một** hộp,
gấp được thật.

**Nguyên tắc**

- **Một nguồn sự thật**: hình học hộp nằm ở `@wrapfit/shared` (`generateDielinePieces`). 2D, 3D, ảnh xem trước, file in
  và FitCheck đọc từ đó, hoặc có test chứng minh khớp với nó (sai lệch ≤ 0,5 mm).
- **Không xê dịch dự án cũ**: đổi công thức = phiên bản mới trong `registry.ts` (bản cũ đóng băng như
  `tuck-top.v1.ts`), seed gán `CURRENT_FORMULA_VERSION` cho box template. Dự án đã tạo giữ phiên bản của nó.
- **Quy ước kích thước** chốt một lần và ghi vào docs: L × W × H là **lòng trong** (vừa món quà), công thức tự cộng bù
  độ dày giấy `t` theo skill `fitcheck-validator` (`t = GSM × 0,0014 mm`, vd. 300 GSM ≈ 0,42 mm).
- Mỗi lỗi sửa kèm test (unit trong `be/src/**` chạy với `@wrapfit/shared`, như `dieline-geometry.spec.ts`).

**Phạm vi: mọi nơi có công thức hộp**

| # | Nơi | File | Điều đã biết / cần kiểm |
|---|---|---|---|
| H1 | Công thức dieline 4 cấu trúc | `shared/src/parametric/{tuck-top,pillow,lid-base,sleeve-drawer}.ts`, `registry.ts` | Gối, âm dương, bao diêm không có nét cắt. Âm dương thiếu tai dán góc (4 thành không dán được với nhau); nắp cao `max(15, 0,6H)`, dư `2t + 1,2`. Bao diêm: vỏ quấn theo chiều nào so với hướng rút khay, khay có tai dán / gập đôi thành không, dư `2t + 1` có đủ trượt. Gối: `faceWidth = W + 0,4H` là ước lượng, cung Bézier là nét gấp (`pathString`) nhưng hai đầu cong chưa có nét cắt. Nắp gài bản 2 chưa cộng bù `t` (bản 1 tính biến `clearance` mà không dùng) |
| H2 | Giới hạn kích thước | `be/prisma/seed-data.ts` (`dimensionParams`), DTO `be/src/projects`, `Step2DimensionAndMaterial` | Cả 4 cấu trúc chung 40–600 mm; tỉ lệ vô lý (vd. hộp gối 600 × 30) vẫn qua. Phôi trải phẳng có thể vượt khổ máy in: thêm kiểm khổ giấy tối đa (vd. B1 1020 × 720 mm) ở FitCheck hoặc validate |
| H3 | FitCheck | `shared/src/fitcheck/validator.ts`, `be/src/projects/domain/project-fitcheck.ts`, `fe/src/features/studio/utils/dieline.ts` | Chỉ có lề an toàn 3 mm và DPI. Thiếu so với skill: tràn lề (bleed ≥ 2 mm) cho hoa văn / nền, tai dán không có mực, phần tử nằm ngoài mọi mặt, phần tử xoay (đang bỏ qua `rotation`), chữ tràn khung. Công thức điểm (−30 lỗi, −10 cảnh báo) cần chốt |
| H4 | File in | `be/src/export/rendering/print-{layout,renderers}.ts` | Chỉ vẽ `segments`, nên nét cắt phụ thuộc H1. DXF xấp xỉ đường cong bằng dây cung. Cỡ chữ lệch: canvas vẽ `fontSize × 0,42 mm`, file in dùng `fontSize / 2,835` (= × 0,353 mm), chữ in nhỏ hơn trên màn hình ~16 % |
| H5 | Canvas 2D | `fe/src/features/studio/components/canvas/DielineCanvas2D.tsx` | Vẽ đúng `segments`, `panels` của phiên bản dự án; `pathString` có cộng lề `padding` không (bộ xuất cũ `shared/src/exporter/pdf-export.ts` quên cộng). Cỡ chữ (xem H4) |
| H6 | Mô hình 3D | `fe/src/features/studio/components/three/InteractiveFoldingBox3D.tsx`, `FoldingBox3D.tsx` | Tự dựng hình, không đọc dieline: âm dương nắp cao `max(16, 0,5H)` dư 2 mm (dieline `max(15, 0,6H)`, dư `2t + 1,2`); bao diêm vỏ dư 2 mm (dieline `2t + 1`); nắp gài gấp theo bản lề riêng. Chuyển sang dựng từ `panels` + bản lề của dieline (trường `hingeAxis` có sẵn trong `PanelFace`, chưa dùng) hoặc có test so kích thước khối 3D với dieline. Chữ / ảnh / hoa văn dán lên đúng mặt (`panelId`) |
| H7 | Ảnh xem trước, thumbnail | `fe/src/features/templates/components/{BoxPreview,DesignThumb}.tsx`, `fe/src/features/studio/utils/thumbnail.ts` | Phác thảo isometric tự tính, cần khớp tỉ lệ L : W : H. Thumbnail chỉ vẽ `pieces[0]` (hộp 2 mảnh chỉ thấy 1 mảnh) |
| H8 | Số liệu hiển thị | `Step2DimensionAndMaterial.tsx` (khổ trải phẳng `2L + 2W + 30`, bù `2t`), `Step1BoxTemplatePicker` (`creaseCount`), `PanelNavigator` | Lấy từ `totalBoundingBox` và `segments` thật thay vì công thức cứng |
| H9 | Vật liệu, độ dày | `fe/src/features/studio/utils/projectMaterial.ts`, `PAPER_MATERIALS`, `DimensionControls` (GSM → t) | Ba bảng GSM / caliper khác nhau; thống nhất theo `t = GSM × 0,0014` |
| H10 | Gợi ý của Gói | `fe/src/features/studio/components/copilot/AiCopilotAssistant.tsx`, skill `ai-packaging-copilot`, `handleAutoFix` trong `StudioWorkspace.tsx` | Heuristic kích thước; auto-fix lề chỉ đẩy phần tử về 4 mm ở mép trái / trên, không xét mép phải / dưới |
| H11 | Mã không dùng | `shared/src/core/contracts.ts` (870 dòng, không file nào import), `shared/src/exporter/pdf-export.ts` (`exportDielineToSVG`, không còn ai gọi) | Xoá hoặc ghi rõ trạng thái, tránh dùng nhầm công thức cũ |

**Các bước**

| # | Việc | File |
|---|---|---|
| 8.1 | Bảng kiểm công thức: với mỗi cấu trúc, vẽ phôi bằng code (SVG → PNG, như khi kiểm bản 2 nắp gài) ở 4 cỡ (rộng, cao, dẹt, nhỏ nhất); đối chiếu cấu trúc thật (ECMA / FEFCO: A20.20 nắp gài, hộp gối, hộp âm dương có tai dán góc, hộp bao diêm); ghi kết quả từng mục H1–H11 | `docs/14_BOX_FORMULA_AUDIT.md` (mới) |
| 8.2 | Chốt quy ước kích thước lòng trong + bù `t`; ghi vào docs/06 §5.1 và README của shared | `docs/06`, `shared/README.md` |
| 8.3 | Công thức phiên bản 3: nét cắt đủ cho gối / âm dương / bao diêm, tai dán còn thiếu, bù `t` cho cả 4 cấu trúc; bản 1, 2 đóng băng | `shared/src/parametric/**` |
| 8.4 | Test hình học cho mọi phiên bản đang dùng: mặt không chồng, nằm trong khổ, đường cắt khép kín (mỗi đầu mút nét cắt nối với nét cắt / gấp khác), mặt gấp lại khớp lòng trong ± 0,5 mm, bản cũ không đổi | `be/src/projects/domain/dieline-geometry.spec.ts` |
| 8.5 | FitCheck: thêm bleed, phần tử ngoài mặt, xoay, tai dán, khổ giấy tối đa (H2, H3); client (`checkDesign`) và server (`checkProject`) dùng chung một hàm; cập nhật thông báo và auto-fix (H10) | `shared/src/fitcheck`, `be/src/projects/domain`, `fe/src/features/studio` |
| 8.6 | File in: cỡ chữ khớp canvas (H4), đường cong trong DXF; xuất thử PDF / SVG / DXF cả 4 cấu trúc ở phiên bản mới (cần worker), mở bằng Illustrator / Inkscape / viewer DXF, kiểm lớp `CutContour`, `Crease` | `be/src/export/rendering` |
| 8.7 | 3D dựng từ dieline (H6): kích thước khối, vị trí bản lề, chữ / ảnh trên đúng mặt; test so kích thước 3D với dieline ở 4 cỡ | `fe/src/features/studio/components/three` |
| 8.8 | 2D, ảnh xem trước, số liệu (H5, H7, H8, H9) đọc từ dieline và một bảng vật liệu | `fe/src/features/studio`, `fe/src/features/templates` |
| 8.9 | Dọn mã không dùng (H11) | `shared/src` |
| 8.10 | Dự án đã tạo bằng công thức cũ: **D + B** (người dùng chốt 2026-10-11, chi tiết ở 8.10 bên dưới). 8.10a: script tự chuyển dự án chưa từng xuất file in; 8.10b: nút "Cập nhật lên công thức mới" trong studio | `be/prisma/scripts/`, `be/src/projects/**`, `be/prisma/schema.prisma` + migration, `fe/src/features/studio/**`, `fe/src/types/api`, `fe/src/api/projects` |
| 8.11 | Kiểm trên trình duyệt: tạo dự án mỗi cấu trúc, so 2D / 3D / thumbnail / file in của cùng một hộp; quét G7 (`--group=G7`); in thử phôi tỉ lệ 1 : 1 trên A4 và gấp tay nếu được | `docs/14` |

**8.10. Dự án đã tạo bằng công thức cũ** (đã chốt **D + B**, 2026-10-11). Mỗi dự án chốt `formulaVersion` lúc tạo; sau Phase 8
dự án mới dùng bản 3, còn dự án cũ vẫn ở bản 1 (hoặc 2). Phần tử canvas gắn theo mặt (`panelId`, toạ độ trong mặt), id
mặt giữ nguyên giữa các bản, nên đổi phiên bản không làm mất chữ / ảnh; kích thước mặt có thể đổi vài phần mm (bù `t`),
FitCheck có thể đổi điểm.

| Lựa chọn | Làm gì | Được | Mất / rủi ro | Công |
|---|---|---|---|---|
| A. Giữ nguyên | Không làm gì | Không rủi ro, đúng nguyên tắc "không xê dịch dự án cũ" | Dự án cũ giữ phôi lỗi mãi (nắp gài đè mặt sau, cả 4 cấu trúc không có nét cắt): file in vẫn không bế được; người dùng phải tạo dự án mới rồi làm lại thiết kế bằng tay | 0 |
| B. Nút "Cập nhật lên công thức mới" | Studio hiện banner khi `formulaVersion` của dự án cũ hơn của cấu trúc; bấm → BE (endpoint mới) tự lưu mốc "Trước khi cập nhật công thức", đổi `formulaVersion`, chạy lại FitCheck → editor tải lại. Hoàn tác = khôi phục mốc (mốc phải lưu thêm `formulaVersion`: migration cột mới ở `project_snapshots`) | Người dùng chủ động, có hoàn tác; dự án đã in mà không muốn đổi thì không bấm | Thêm endpoint, migration, banner, hộp thoại, e2e; người dùng phải tự thấy và bấm | ~0,5–1 ngày |
| C. Tự chuyển mọi dự án | Script một lần: đổi `formulaVersion` của mọi dự án lên bản mới, chạy lại FitCheck | Mọi dự án có phôi đúng ngay, không thêm UI | Phá nguyên tắc phiên bản: dự án đã in / đã gửi xưởng đổi phôi mà chủ không biết; điểm FitCheck có thể tụt, dự án PUBLIC tụt dưới 90 bị rớt khỏi thư viện cộng đồng | ~1–2 giờ |
| D. Tự chuyển dự án **chưa từng xuất file in** | Như C nhưng chỉ cho dự án không có `export_jobs` `COMPLETED`; dự án đã xuất giữ bản cũ | Dự án chưa in (chưa ai cầm phôi cũ) có phôi đúng ngay; dự án đã in không bị đổi | Dự án đã xuất mà lỗi vẫn kẹt bản cũ (cần B sau này); vẫn có thể tụt điểm FitCheck | ~2–3 giờ |

**Quyết định (2026-10-11): D + B, cả hai làm trong S10.** D đưa ngay mọi dự án chưa in lên công thức mới; B cho
dự án đã xuất file (và mọi lần đổi công thức sau này) một đường cập nhật chủ động, có hoàn tác. Dữ liệu local lúc chốt:
7 dự án, đều bản 1, 0 dự án đã xuất file.

*8.10a — D: script tự chuyển dự án chưa từng xuất file in*

1. `be/prisma/scripts/upgrade-formulas.ts` (chạy bằng ts-node như seed, image Docker đã có thư mục `prisma`), lệnh
   `npm --workspace=be run db:upgrade-formulas -- [--dry-run]`.
2. Chọn dự án có `formulaVersion` < `box_templates.formula_version` của cấu trúc **và** không có `export_jobs` nào
   `COMPLETED` (mọi trạng thái dự án, kể cả thùng rác).
3. Mỗi dự án, trong một transaction: lưu mốc tự động (`isAutomatic`, không tính vào giới hạn 50) "Trước khi cập nhật
   công thức (bản X → Y)" có `formulaVersion` X (cột mới của 8.10b), đổi `formulaVersion`, chạy lại FitCheck bằng
   `checkProject` của `be/src/projects/domain`, ghi `fitcheckScore` / `fitcheckState`, tăng `version` (tab đang mở sẽ
   nhận 409 và tải bản mới như S6).
4. In bảng: dự án, phiên bản cũ → mới, điểm FitCheck trước / sau; cảnh báo riêng dự án PUBLIC tụt dưới 90 (rớt khỏi
   thư viện cộng đồng). Chạy lại nhiều lần không đổi gì thêm (idempotent). `--dry-run` chỉ in bảng.
5. Không tự chạy khi container khởi động: chạy tay một lần sau khi công thức bản 3 vào, và sau mỗi lần thêm phiên bản
   công thức (ghi vào `be/README.md` mục triển khai).
6. Sửa `be/prisma/seed.ts`: dự án mẫu lấy `formulaVersion` của cấu trúc, không viết cứng `1`.
7. Test: unit cho phần chọn dự án (đã xuất / chưa xuất / đã mới nhất), e2e chạy script trên DB test.

*8.10b — B: nút "Cập nhật lên công thức mới"*

1. **DB**: migration thêm `project_snapshots.formula_version Int?` (mốc cũ: `null` = giữ phiên bản hiện tại khi khôi
   phục). Mọi mốc mới (thủ công, tự động, sao lưu trước khi khôi phục) lưu `formulaVersion` của dự án lúc đó.
2. **Khôi phục mốc** (`POST /projects/:id/snapshots/:sid/restore`): mốc có `formulaVersion` thì đặt lại phiên bản đó
   cho dự án (để hoàn tác việc cập nhật), rồi chạy lại FitCheck.
3. **API mới** `POST /projects/:id/formula-upgrade`, body `{ version }` (chống ghi đè như PATCH): chủ dự án; `409` khi
   dự án trong thùng rác; `409 PROJECT_VERSION_CONFLICT` khi `version` cũ; đã mới nhất thì trả nguyên dự án. Trong
   transaction: lưu mốc tự động như 8.10a.3, đổi `formulaVersion` sang của cấu trúc, chạy lại FitCheck. Trả
   `{ project, backup }` giống khôi phục mốc. Ghi vào docs/03, docs/06 §5–§6, Swagger.
4. **`ProjectDetail`** thêm `latestFormulaVersion` (phiên bản hiện tại của cấu trúc) để FE biết có bản mới.
5. **FE studio**: banner khi `formulaVersion < latestFormulaVersion`: "Phôi của dự án dùng công thức cũ (bản X). Bản
   mới: <tóm tắt thay đổi theo phiên bản, vd. bản 2 nắp gài: nắp không đè mặt sau, có nét cắt>". Nút mở hộp thoại xác
   nhận: hình phôi sẽ đổi, chữ / ảnh giữ nguyên theo mặt, điểm FitCheck có thể đổi, đã gửi file cũ cho xưởng thì cân
   nhắc; có mốc để hoàn tác. Xác nhận → gọi API qua hàng đợi lưu của `useProjectSync` (gửi hết thay đổi đang chờ
   trước) → dựng lại editor bằng `project` trả về → toast có nút "Hoàn tác" (khôi phục `backup.id`). Dự án trong thùng
   rác: không hiện banner.
6. **Dashboard** *(tuỳ chọn)*: nhãn nhỏ "Công thức cũ" trên thẻ dự án.
7. **Test**: e2e cập nhật → hoàn tác → phiên bản và FitCheck trở lại; 409 thùng rác, 409 version; quét G7 có ảnh
   banner + hộp thoại (thêm route vào `page-shots.routes.json`, dùng dự án fixture ở bản cũ).

Thứ tự: 8.10b.1–2 (cột `formula_version` của mốc) trước 8.10a (script cần lưu mốc có phiên bản); 8.10a chạy sau khi
công thức bản 3 (8.3) vào; 8.10b.5 sửa `StudioWorkspace.tsx` (thuộc C) nên làm sau S7.

**DoD**: 4 cấu trúc có phôi đủ nét cắt, nét gấp, tai dán, gấp lại đúng lòng trong (test 8.4 pass); file in 4 cấu trúc có
lớp cắt và lớp gấp, chữ cùng cỡ với canvas; 3D, 2D, ảnh xem trước cùng kích thước với dieline (test hoặc ảnh so sánh
trong docs/14); FitCheck đủ quy tắc của skill `fitcheck-validator`; dự án đã xuất file giữ phiên bản cũ, mở và xuất đúng
như trước; dự án chưa xuất đã lên bản mới (8.10a, có bảng kết quả trong docs/14); nút cập nhật + hoàn tác chạy đúng
(8.10b); unit, e2e backend, `tsc`, `next build` pass.

## 5. Ma trận sở hữu file

Agent chỉ sửa file trong cột của mình. File dùng chung (Phase 0) chỉ đọc; cần đổi thì báo lại agent chính.

| Agent | Được sửa |
|---|---|
| Chính (Phase 0, 6) | `src/services/`, `src/api/`, `src/types/api/`, `src/hooks/data/`, `src/features/auth/` (provider, guard), `src/components/common/` (toast, state), `src/layouts/`, `src/app/layout.tsx`, `src/app/error.tsx`, `src/config/`, `scripts/stitch/`, `stitch/screens.json`, `next.config.mjs` (trừ `redirects` của 3a), env, Docker, `docs/` |
| A — Phase 1 | `src/views/auth/**`, `src/app/auth/**`, `src/app/{login,register,check-email,verify-email,forgot-password,reset-password,complete-signup}/**`, `src/views/account/**` (mới), `src/components/layout/**` |
| B — Phase 2 | `src/views/dashboard/{index.tsx,projects,brand-kit,profile,settings}/**`, `src/features/dashboard/**`, `src/features/profile/**`, `src/features/settings/**` |
| C — Phase 3 | `src/views/editor/studio/**`, `src/app/editor/**`, `src/features/studio/**`, mục `redirects` trong `next.config.mjs`, link `/editor/*` trong `src/views/home/index.tsx` |
| D — Phase 4 | `src/views/{templates,public-project,unbox}/**`, `src/app/{templates,p,unbox}/**`, `src/features/{templates,showcase}/**` (mới), phần `#thu-vien-mau` trong `src/views/home/index.tsx` |
| E — Phase 5 | `src/views/admin/{index.tsx,accounts}/**`, `src/features/admin/**` (mới) |
| Chính (Phase 7) | Nhóm G1 (`src/components/layout/**`, `src/components/common/**`), G6 (qua `stitch/overrides.json` hoặc component dùng chung), `fe/scripts/page-shots*`, `fe/scripts/ui-fixtures.mjs`, `docs/13_UI_VIEWPORT_AUDIT.md` |
| F — Phase 7 (tuỳ chọn) | Sửa giao diện G2 + G3: như cột A (trừ `components/layout`) và cột E |
| G — Phase 7 (tuỳ chọn) | Sửa giao diện G4 + G5: như cột B và D, cả phần còn lại của `src/views/home/index.tsx` |
| H — Phase 8 | `shared/src/{parametric,fitcheck,exporter,core}/**`, `shared/README.md`, `be/src/export/rendering/**`, `be/src/projects/**` (8.10b: endpoint, mốc phiên bản), `be/prisma/{seed-data.ts,seed.ts,schema.prisma,migrations,scripts}/**`, `fe/src/features/studio/components/{three,canvas}/**`, `fe/src/features/studio/utils/**`, `fe/src/features/templates/components/{BoxPreview,DesignThumb}.tsx`, `docs/14_BOX_FORMULA_AUDIT.md` (mới). Cần sửa `StudioWorkspace.tsx`, `Step2DimensionAndMaterial.tsx` (thuộc C) thì làm sau S7 hoặc báo agent chính |

Hai agent cùng chạm `views/home/index.tsx` (C: link, D: section thư viện): C chỉ đổi `href`, D chỉ đổi khối
`<section id="thu-vien-mau">`. Agent chính gộp nếu xung đột.

## 6. Điều phối subagent

Thứ tự phụ thuộc: Phase 0 → (1, 2, 3a, 4, 5 độc lập với nhau) → 3b (sau 3a) → 6. Phase 7 (thêm sau) cần 1, 2, 4, 5
xong và nên chạy trước 3a; Phase 8 (thêm sau) cần 3a; Phase 6 cần cả 7 và 8. Để vừa hạn mức mỗi lần chạy, các phase
được xếp thành 10 phiên, mỗi phiên
tối đa 2 subagent song song (§9).

- **Cùng working tree, file tách biệt** (§5): không dùng git worktree vì mỗi worktree phải `npm install` lại monorepo.
- Quy tắc cho mọi subagent: không cài package, không chạy `stitch:sync`, không commit; chỉ chạy `npx tsc --noEmit -p fe`
  và sửa lỗi trong file của mình (lỗi ở file agent khác đang sửa thì bỏ qua); dùng API qua `src/api` + React Query,
  không gọi `fetch` trực tiếp; báo lại danh sách file đã đổi, việc chưa xong, giả định đã đặt.
- Prompt mỗi agent gồm: mục phase tương ứng ở §4, ma trận §5, các mục `06` liên quan, skill cần đọc
  (`wrapfit-design-system`, `ai-packaging-copilot`, `fitcheck-validator`, `r3f-stage-orchestration`,
  `insforge-backend-flow` tuỳ phase), và DoD.
- Commit cuối mỗi phiên sau khi agent chính review (Conventional Commits, ví dụ `feat(fe-auth): …`), không push.

## 7. Kịch bản kiểm thử end-to-end

Môi trường: `docker compose up -d postgres redis seaweedfs storage-init mailpit`, `db:migrate`, `db:seed`,
`npm run dev:be`, `npm --workspace=be run dev:worker`, `npm run dev:fe`.

1. Đăng ký tài khoản mới → Mailpit → xác minh → đăng nhập → header đúng tên.
2. Đăng nhập email chưa xác minh → trang "Kiểm tra hộp thư" → gửi lại → link cũ báo hết hiệu lực.
3. Quên mật khẩu → đặt lại → phiên cũ ở tab khác bị đăng xuất.
4. `/editor/new` → chọn tuck-top, 120 × 80 × 60 → vào `/editor/<id>` → thêm chữ, upload ảnh PNG → F5 còn nguyên.
5. Hai tab cùng dự án → sửa cả hai → hộp thoại xung đột → "Tải bản mới".
6. Lưu mốc → sửa → khôi phục mốc → "Hoàn tác".
7. Kéo chữ ra sát mép → xuất PDF → `422` mở FitCheck → sửa → xuất PDF, SVG, DXF thành công, tải được.
8. Chia sẻ `UNLISTED` → mở `/p/<slug>` ở cửa sổ ẩn danh (có `noindex`) → đăng nhập tài khoản khác → thả tim, Remix.
9. Tạo mở hộp QR → mở `unboxUrl` ở cửa sổ ẩn danh → đúng lời chúc, hiệu ứng.
10. Dashboard: lưu trữ, thùng rác, khôi phục, xoá vĩnh viễn, nhân bản, thư mục.
11. Brand Kit: upload logo, 3 màu, lưu, F5 còn.
12. `/templates` → "Dùng mẫu này" → dự án mới có canvas của mẫu.
13. Admin: khoá tài khoản ở bước 1 → tài khoản đó bị đăng xuất; `MAKER` mở `/admin/accounts` → 403.
14. Xoá cookie `wf_access` giữa chừng → thao tác tiếp tục bình thường (refresh tự động).
15. Tắt backend → các trang hiện lỗi có `requestId` / thông báo mất kết nối, không hiện dữ liệu giả.

## 8. Rủi ro và câu hỏi mở

| # | Vấn đề | Đề xuất |
|---|---|---|
| R1 | Màn `wired` không còn so pixel tự động với Stitch | Giữ class gốc khi viết lại; `stitch:parity --include-wired` khi cần so tay (khác ở dữ liệu là bình thường) |
| R2 | Màn không có backend (D6) vẫn có nút bấm "như thật" (thanh toán, đơn hàng, 2FA) | **Đã chốt**: giữ nguyên để test UI/UX (D6) |
| R3 | `/editor/step-1..4`, `/editor/export`, `/editor` chuyển hướng: mất bản mockup để tham khảo | Giữ file (chỉ chuyển hướng), không xoá; nguồn Stitch vẫn ở `fe/stitch/source` |
| R4 | `06` §3.4 đề xuất trang xác minh email hỏi mật khẩu rồi đăng nhập luôn | **Đã chốt**: làm bản hiện tại, xác minh xong → trang đăng nhập (D7) |
| R5 | Hai màu brand (Stitch Cobalt `#004ac6`, app Forest `#122e20`) | Ngoài phạm vi; component mới dùng token theo skill `wrapfit-design-system` |
| R6 | Thumbnail từ canvas 2D, không phải ảnh 3D | Đủ cho Dashboard MVP; ảnh 3D (`toDataURL` WebGL) làm sau |
| R7 | Đi qua proxy Next ở local, backend thấy mọi request cùng IP → giới hạn 10 lần đăng nhập / phút dùng chung | Local chấp nhận được; bật `TRUST_PROXY=true` nếu vướng. Production qua Caddy không bị |
| R8 | WebSocket chưa có sự kiện nghiệp vụ | Không dùng trong kế hoạch này; xuất file dùng polling |
| R9 | Bundle tăng do React Query (~13 kB gzip) | Chấp nhận |
| R10 | Pane trình duyệt của ứng dụng hẹp (~570–720 px) và thu nhỏ ảnh viewport lớn: không đánh giá được desktop | **Đã chốt** (2026-10-11): kiểm giao diện bằng `npm --workspace=fe run shots` (Chrome headless, đủ độ phân giải); pane chỉ dùng cho luồng bấm. Phase 7 rà lại S1–S5 |
| R11 | Sửa khung trên màn Stitch `converted` đụng file generated đã khoá | Ưu tiên sửa component dùng chung hoặc `overrides.json`; sửa tay file khoá thì ghi lý do trong docs/13 |

## Ước lượng

| Phase | Khối lượng | Ghi chú |
|---|---|---|
| 0 | ~1 ngày | Chặn mọi phase sau |
| 1 | ~1 ngày | 7 trang + header |
| 2 | ~1,5 ngày | Trang dự án nhiều thao tác nhất |
| 3 | ~2,5 ngày (3a 1,5 + 3b 1) | Rủi ro cao nhất: file studio 881 dòng |
| 4 | ~1,5 ngày | |
| 5 | ~0,5 ngày | |
| 6 | ~1 ngày | |
| 7 | ~1–1,5 ngày | ~50 route × 6 kích thước; phần lớn thời gian là xem ảnh và sửa G1 |

Chạy song song đợt 2: tổng thời gian thực ≈ 1 (Phase 0) + 1,5 (đợt 2, phase dài nhất) + 1 (3b) + 1 (Phase 6) ≈
**4,5 ngày làm việc** (so với ~9 ngày nếu làm tuần tự).

## 9. Chia phiên làm việc và bàn giao

Mỗi phiên là một lần chạy Claude Code độc lập (có thể là cuộc trò chuyện mới, không nhớ phiên trước). Mọi trạng thái
cần để làm tiếp nằm trong file này, `git log` và nhật ký §9.3.

### 9.1. Danh sách phiên

| Phiên | Nội dung | Subagent | Điều kiện bắt đầu | Kết thúc khi |
|---|---|---|---|---|
| **S1** | Phase 0: 0.1 generator `wired`, 0.2 đổi status 6 màn, 0.10 env / proxy / Docker. Tạo nhánh `feat/fe-be-integration` từ nhánh gốc | Không | Plan đã duyệt | `stitch:sync` không đổi file generated nào ngoài `screens.json`; `next build` pass; trang qua proxy `/api/health` trả `ok` |
| **S2** | Phase 0: 0.4 HTTP client, 0.5 kiểu dữ liệu, 0.6 module API, 0.7 `queryKeys`. Sửa tối thiểu `views/editor/studio`, `views/unbox` cho khớp kiểu mới (chưa đổi hành vi) | Không | S1 xong | `tsc` sạch; gọi được mọi module từ console dev với backend thật |
| **S3** | Phase 0: 0.3 React Query + `AppProviders`, 0.7 `useMe` (cần React Query, chuyển từ S2), 0.8 auth (`AuthProvider`, `RequireAuth`, `safeRedirect`), 0.9 toast / `ErrorState` / `error.tsx` | Không | S2 xong | DoD Phase 0 (§4) |
| **S4** | Phase 1 (auth, header) + Phase 5 (admin accounts) | A, E song song | S3 xong | DoD Phase 1 và Phase 5 |
| **S5** | Phase 2 (dashboard, dự án, Brand Kit, hồ sơ, cài đặt) + Phase 4 (thư viện mẫu, `/p/[slug]`, `/unbox/[slug]`) | B, D song song | S3 xong (không cần S4) | DoD Phase 2 và Phase 4 |
| **S6** | Phase 3a (`/editor/new`, mở / lưu / xung đột, upload, thumbnail, chuyển hướng) | C | S3 xong | DoD 3a |
| **S7** | Phase 3b (mốc phiên bản, xuất file, chia sẻ, QR, hoa văn AI) | C (hoặc 2 agent: xuất file + mốc / chia sẻ + QR + AI, mỗi tính năng một file component) | S6 xong | DoD Phase 3 |
| **S8** | Phase 6: build toàn monorepo, `stitch:parity`, kịch bản §7 trên trình duyệt, review, cập nhật docs `04`, `06`, `11`, `fe/README.md` | Không (có thể 1 agent review) | S4–S7, S9 và S10 xong | 15 bước §7 đạt, có ảnh bằng chứng ở M và X+ (Phase 7) |
| **S9** | Phase 7: rà soát giao diện các màn S1–S5, khung chung và màn Stitch tĩnh theo ma trận 6 kích thước; ghi mốc studio cho S6 / S7 | Không cho 7.1–7.5; F, G song song cho 7.6 nếu nhiều lỗi | S5 xong. **Nên chạy trước S6**: S6 / S7 làm trên khung đã sửa và dùng lại script | DoD Phase 7 |
| **S10** | Phase 8: rà soát và sửa công thức hộp (H1–H11): dieline phiên bản 3, FitCheck đủ quy tắc, file in, 3D / 2D / ảnh xem trước khớp dieline, `docs/14` | Không cho 8.1–8.4 (công thức là gốc, làm tuần tự); 8.5–8.8 có thể 2 agent: H (BE / shared: 8.5, 8.6) và H' (FE: 8.7, 8.8) | S6 xong. Không phụ thuộc S7 (khác file, trừ `StudioWorkspace.tsx`); **phải xong trước S8**. Lớn: tách S10a (8.1–8.4, 8.9), S10b (8.5–8.8, 8.11), S10c (8.10 = D + B đã chốt; phần FE của B làm sau S7) nếu thiếu hạn mức | DoD Phase 8 |

S4, S5, S6 chỉ phụ thuộc S3, nên chạy theo thứ tự nào cũng được. Thứ tự đề xuất cho phần còn lại: S9 → S6 → S7 → S10 → S8 (S10 có thể làm trước S7: S7 kiểm luồng xuất file, S10 kiểm nội dung file). Một phiên quá lớn so với hạn mức còn lại thì tách
theo từng agent (vd. S4 → S4a Phase 1, S4b Phase 5) và ghi rõ vào nhật ký.

### 9.2. Quy trình mỗi phiên

**Mở phiên** (dán vào cuộc trò chuyện mới):

```text
Tiếp tục kế hoạch nối FE-BE: làm phiên S<n> theo docs/12_FE_BE_INTEGRATION_PLAN.md §9.
```

1. Đọc §9.3 (nhật ký), mục phase tương ứng ở §4, ma trận §5; `git status`, `git log --oneline -10` trên nhánh
   `feat/fe-be-integration`.
2. Kiểm tra điều kiện bắt đầu (§9.1). Phiên trước dở dang → làm nốt phần dở trước.
3. Chạy backend nếu phiên cần (§7, phần môi trường).

**Trong phiên**: giao việc cho subagent theo §6; agent chính review diff của từng agent, chạy `npx tsc --noEmit -p fe`,
kiểm tra nhanh trên trình duyệt các màn vừa nối. **Bắt buộc từ 2026-10-11** (R10): mọi màn vừa sửa được chụp bằng
`npm --workspace=fe run shots -- <đường dẫn> --widths=375x812,1440x900,1920x1080` (thêm 768, 1024, 1280 khi đổi bố cục
hoặc khung chung) và xem ảnh trong `fe/.page-shots/`; không đánh giá desktop bằng ảnh của pane trình duyệt.

**Đóng phiên** (kể cả khi chưa xong hết):

1. `tsc` sạch, hoặc ghi rõ lỗi còn lại vào nhật ký.
2. Commit những phần đã chạy được (không push); phần dở dang để ở working tree **không** commit và ghi vào nhật ký.
3. Thêm một dòng vào §9.3: phiên, ngày, commit, đã xong, còn dở, giả định / quyết định mới, việc đầu tiên của phiên sau.

### 9.3. Nhật ký bàn giao

| Phiên | Ngày | Commit | Đã xong | Còn dở / ghi chú cho phiên sau |
|---|---|---|---|---|
| Plan | 2026-10-10 | — | Plan duyệt; chốt D1–D8 | Bắt đầu S1 |
| S1 | 2026-10-11 | `81aca6c`, `301fce2` | 0.1, 0.2, 0.10. Nhánh `feat/fe-be-integration`. `next build` pass. Qua proxy `localhost:3000/api`: `health` ok, `login` → cookie → `auth/me` → `refresh` → `logout` chạy đúng, OriginGuard nhận request qua proxy | **Phát hiện**: 25 file generated đã bị sửa tay (commit `e07d23b`, `e509d8f`), `stitch:sync` cũ sẽ xoá hết → thêm lock chống ghi đè (docs/11 §3). **Môi trường local**: (1) phải `npm run build:shared` trước `npm run dev:be` (backend đọc `shared/dist`); (2) Windows đang giữ cổng 8320–8419 → SeaweedFS chạy cổng 18333 (`STORAGE_PORT=18333` trong `.env` gốc, `STORAGE_ENDPOINT` / `STORAGE_PUBLIC_URL` trong `be/.env` đổi theo; file local, không commit); (3) `.claude/launch.json` có cấu hình `fe`, `be`; worker chưa chạy (S4 cần cho email: `npm --workspace=be run dev:worker`). Phiên sau: S2 |
| S2 | 2026-10-11 | `ba7c818` | 0.4, 0.5, 0.6, `queryKeys` (0.7). Client mới (`request` với `json` / `query`, `ApiError`, refresh 1 lần dùng chung, sự kiện `wrapfit:session-expired`, `errorMessage`). 12 module `src/api` phủ 56 route, bỏ dữ liệu giả. Đã gọi thật ~45 hàm qua proxy với tài khoản admin seed: auth, dự án (tạo, sửa, xung đột 409 + `currentVersion`, lưu trữ, nhân bản, xoá vĩnh viễn), mốc phiên bản (tạo, khôi phục, xoá), thư mục, upload ảnh lên SeaweedFS + dùng trong canvas / thumbnail, `FILE_URL_NOT_ALLOWED`, xuất file (202 PENDING), chia sẻ + trang công khai + tim + Remix, mở hộp + QR, AI (procedural), admin. Dữ liệu thử đã xoá | **Chưa kiểm**: nhánh 401 → refresh → gửi lại (cần cookie `wf_access` hết hạn, kiểm ở S3/S4). `useMe` dời sang S3 (cần React Query). `/auth/me` khi chưa đăng nhập cũng gọi thử `refresh` rồi phát `session-expired`: `AuthProvider` (S3) coi đó là "khách", không chuyển trang. **Lỗi có sẵn cho S4 (Agent A, `components/layout`)**: hydration error trên mọi trang có `BottomNavBar` vì `GoiMascot` render `<button>` bên trong `<button>` của nav. Phiên sau: S3 |
| S3 | 2026-10-11 | `4d1602a` | 0.3, 0.7 `useMe`, 0.8, 0.9 → **xong Phase 0**. `next build` pass. Đã kiểm trên trình duyệt: khách mở trang có `RequireAuth` → `/auth/login?redirect=<đường dẫn + query>`; đăng nhập → `authenticated`; access cookie hết hạn (tạm đặt `JWT_ACCESS_TTL_SECONDS=60`, đã trả về 900) → 3 request song song nhận 401 → **một** `/auth/refresh` → 3 request gửi lại 200; phiên hết hẳn → toast "Phiên đăng nhập đã hết hạn" + về trang đăng nhập; sai role → trang 403; backend tắt → ErrorState có "Thử lại" → bật lại backend → `authenticated`. Toast hiển thị đúng ở 576 px | **Cho các agent S4–S7**: sau `login()` gọi `useAuth().signedIn(session.user)`; bọc trang cần đăng nhập bằng `<RequireAuth role?>`; lỗi API → `useToast().error(err, "tiêu đề")` hoặc `<ErrorState error onRetry retrying>`; rỗng → `<EmptyState>`; đường dẫn dùng `ROUTES` (`@/constants`); `?redirect=` đi qua `safeRedirect()`; key cache dùng `queryKeys`; nút chính dùng `PRIMARY_BUTTON` (`@/components/common/StatusViews`). **Parity**: 22/23 màn `converted` vượt 1% từ trước S3 (sidebar / header sửa tay ở `e509d8f`, thêm badge "Issues" của Next dev do lỗi hydration ở S2); đo lại khi stash S3 cho cùng số (`/pricing` 5.45%, `/admin/print-shops` 1.35%, `not-found` 4.29%), nên S3 không gây lệch. S8 phải so với số đo này, không với ngưỡng 1%. **Lưu ý**: `next build` và `next dev` dùng chung `fe/.next`: dừng dev server trước khi build. Phiên sau: S4, S5 hoặc S6 (đều chỉ cần S3) |
| S4 | 2026-10-11 | `b15e029`, `a539e7f`, `b1bf6ea` | **Phase 1 + Phase 5 xong** (Agent A, E song song). `/auth/login`, `/auth/register` (màn Stitch thành form React), `/login`, `/register` chuyển hướng giữ query, `/check-email`, `/verify-email`, `/forgot-password`, `/reset-password`, `/complete-signup` (`views/account/`), header thật (`UserAvatarDropdown`, `MainHeader`), `/admin/accounts` (`features/admin/`). Nhãn vai trò / gói dùng chung `ROLE_LABELS`, `TIER_LABELS` (`@/constants`). Sửa lỗi hydration `button` lồng `button` (`GoiMascot` không `interactive` thành `span`). `tsc` sạch, `next build` pass, `stitch:sync` giữ 6 view `wired`. Đã kiểm trên trình duyệt với backend + worker + Mailpit: đăng ký (validate, luôn tới `/check-email`) → đăng nhập khi chưa xác minh → `/check-email` → gửi lại (khoá 60 giây) → link cũ "không còn hiệu lực" → link mới xác minh (gọi API 1 lần) → đăng nhập (sai mật khẩu hiện lỗi + mã lỗi; `?redirect=` giữ query) → header đúng tên, gói; quên mật khẩu → đặt lại → về đăng nhập với thông báo, link dùng lại báo "đã được dùng"; `/login?error=google_auth_failed` hiện banner; MAKER mở `/admin/accounts` → 403; admin khoá tài khoản → phiên của tài khoản đó `401` ngay (`auth/me`, `refresh`, `login`); mở khoá, đổi vai trò, xoá (gõ email để xác nhận), hàng của chính admin chỉ đọc; 375 px không tràn ngang. Dữ liệu thử đã xoá | **Cho mọi agent sau**: component của app đặt trong màn `wired` (`[data-stitch]`) mất màu / font vì token `initial` → bọc bằng phần tử có `data-app-tokens` (docs/11 §3); `ErrorState`, `EmptyState`, `PageLoader` đã có sẵn. Phần tử `sr-only` / `absolute` trong vùng `overflow-x-auto` cần vùng cuộn `relative`, không thì tràn trang trên mobile. **Phát hiện BE (đã sửa ngay trong S4)**: đặt lại mật khẩu / `logout-all` chỉ thu hồi refresh token, access token cũ còn dùng được tới khi hết hạn (≤ 15 phút) → thêm cột `users.session_version` (migration `20261011000100_session_version`), token mang claim `sv`, thu hồi phiên thì tăng số; `JwtStrategy`, `/auth/refresh`, handshake WebSocket từ chối số cũ. Unit 191/191, e2e `auth` + `app` pass (3 ca e2e `storage`/`unboxing`/`export` cố định cổng 8333 cũng đã sửa: `test/e2e-env.ts` đọc `STORAGE_PORT` của `.env` gốc; full e2e 145/145 pass ở local cổng 18333). Commit `8efe938`. **Deploy**: migration tự chạy khi container backend khởi động (`be/docker-entrypoint.sh`); chạy local thì `npm --workspace=be run db:deploy`. **Còn lại**: link `/editor*` trong header chưa đổi sang `/editor/new` (S6); 2 ảnh Stitch remote của màn đăng nhập đã hết hạn từ trước (không vendor được); `/api/auth/google` khi chưa cấu hình Google trả JSON 503 thô; ô "Tình trạng hệ thống" ở `/admin` (tuỳ chọn) chưa làm. **Môi trường**: pane trình duyệt ẩn thì `requestAnimationFrame` không chạy, React 19 chưa hiện nội dung Suspense (thấy 2 form, `div#S:0` ẩn): gọi `$RV($RB)` trong console khi test, không phải lỗi code. Worker chạy bằng `node be/dist/worker` (không mở thêm `nest --watch` thứ hai ghi chung `be/dist`). Phiên sau: S5 hoặc S6 |
| S5 | 2026-10-11 | `ade8c20`, `277a248`, `9666831`, `1bafdf6` | **Phase 2 + Phase 4 xong** (Agent B, D song song). `/dashboard` (4 dự án sửa gần nhất, dung lượng, lượt AI), `/dashboard/projects` (tab ACTIVE / ARCHIVED / DELETED có số đếm, tìm kiếm debounce 300 ms, sắp xếp, phân trang 12, lọc thư mục, nhân bản, lưu trữ, thùng rác "Tự xoá sau N ngày", khôi phục, xoá vĩnh viễn có xác nhận, chuyển thư mục; tạo / sửa / xoá thư mục), `/dashboard/brand-kit`, `/dashboard/profile`, `/dashboard/settings` (`features/{dashboard,profile,settings}`); `/templates`, `#thu-vien-mau` trang chủ (6 mẫu thật), `/p/[slug]`, `/unbox/[slug]`, `/unbox` thành trang nhập mã (`features/{templates,showcase}`). Agent chính: `errorMessage` 403 khi upload = hết hạn mức, 409 không `code` có câu tiếng Việt; `ROUTES.brandKit|profile|settings|unboxCode`; slug công khai `encodeURIComponent`; header "Thư Viện Mẫu" → `/templates`; ảnh mascot Stitch hết hạn → `GoiMascot`; sửa tràn ngang khung 3D `/p` trên màn hẹp. `tsc` sạch, `next build` pass, `stitch:sync` không đổi file nào. Đã kiểm trên trình duyệt với backend + worker + Mailpit: `/templates` khi chưa đăng nhập (2 phân khu, lọc `occasion=TET` giữ trên URL); trang chủ 6 mẫu, link `/editor/new?template=<id>`; `/p/<slug>` UNLISTED có `noindex, nofollow`, PUBLIC không có, slug lạ → 404; khách bấm tim → `/auth/login?redirect=/p/<slug>` → đăng nhập MAKER → quay lại, tim còn sau F5; Remix → `/editor/<id mới>` và hiện ngay ở dashboard của MAKER; `allowFork: false` ẩn nút; lượt xem: khách 1, F5 vẫn 1, người đăng nhập +1; `unboxUrl` đúng tên, lời chúc (giữ xuống dòng), hiệu ứng tim; mã sai → "Mã QR không còn hiệu lực". Admin: vòng đời lưu trữ → thùng rác → khôi phục → thùng rác → xoá vĩnh viễn (số đếm tab, thư mục cập nhật), tìm kiếm, lọc thư mục; Brand Kit upload logo PNG + slogan, F5 còn; hồ sơ đổi tên + ảnh → header đổi ngay; "Đổi mật khẩu" → thư trong Mailpit; "Đăng xuất mọi thiết bị" → về đăng nhập, phiên thứ hai `401`. 375 px: 10 trang không tràn ngang. Dữ liệu thử đã xoá | **Phát hiện BE (đã sửa trong S5)**: `GET /public/projects/:slug` từ SSR không có cookie nên người đăng nhập bị tính 2 lượt xem, chủ dự án 1 lượt → thêm `?count=false` (chỉ đọc), SSR / `generateMetadata` dùng nó, request của trình duyệt mới tính; e2e `public-showcase` 13/13 pass; docs `03`, `06` §8 đã ghi. **Phát hiện BE (đã sửa sau S5, `c81a5c2`)**: thay / gỡ avatar hoặc logo Brand Kit không xoá file cũ trong `stored_files` (vẫn tính vào hạn mức, không bao giờ bị xoá) → nay xoá file `AVATAR` / `LOGO` cũ khi không gắn dự án và không canvas nào hiển thị; thêm nữa, mọi upload không nơi nào dùng (thumbnail cũ, ảnh đã gỡ khỏi canvas và mọi mốc, logo upload rồi không lưu) bị cron dọn storage xoá sau 24 giờ; e2e `unused-files`. **Chưa kiểm trên trình duyệt**: thông báo lỗi 413 / 403 hạn mức / `FILE_NOT_OWNED` khi upload (đã kiểm logic, chưa dựng tình huống), logo SVG / PDF, nhạc của mở hộp (`fe/public` không có file mp3). **Cho S6 (Phase 3a)**: `createProject` phải invalidate `queryKeys.projects.all` (+ `collections.all` khi có `collectionId`); link `/editor`, `/editor/step-1` trong `DashboardHeaderNav` và "Studio 3D" (`/editor/studio`) trong `MAIN_NAV_ITEMS` chưa đổi sang `/editor/new`; `/editor/new?template=<id>` hiện vẫn rơi vào `editor/[id]` cho tới khi có trang; `InteractiveFoldingBox3D` in mọi `content` thành chữ (trang công khai chỉ truyền phần tử `text`), cần prop ẩn HUD ("Bump Map 4K", % gấp) và bỏ `min-h-[460px]` cố định. **Cho S8**: CSS generated của `dashboard-brand-kit` đặt `overflow: hidden` cho html / body / root (trang không cuộn được, có từ trước) → view tạm thêm `<style>` gỡ; nên chuyển thành `sourcePatches` trong `stitch/overrides.json`. **Môi trường**: mở FE trước khi BE sẵn sàng thì console có vài `500` (proxy `ECONNREFUSED`), không phải lỗi code. Phiên sau: S6 |
| S5 (bổ sung) | 2026-10-11 | `5b52376`, `167aaa3`, `f868d98` | **Kiểm lại bố cục desktop** (người dùng phát hiện ảnh test S5 bị bóp: pane trình duyệt chỉ rộng ~570–720 px, ảnh viewport lớn bị thu nhỏ, nên S5 thực chất chỉ kiểm bố cục mobile / tablet). Chụp đủ độ phân giải bằng Chrome headless ở 1024, 1180, 1280, 1366, 1440, 1536, 1920 và 375 px. Sửa: (1) `MainHeader` ở mọi trang desktop: nút "Bắt Đầu Hộp Quà" bị đẩy ra ngoài màn hình, tên + gói cạnh avatar tràn khỏi thanh (có từ trước S5) → CTA chỉ hiện dưới `xl`, badge "CAD CADRE" và tên hiện lại từ `2xl`; header và thanh tab dashboard mang `data-app-tokens` + `font-sans` (màn Stitch vẽ chúng bằng Inter, rộng hơn); (2) thanh tab dashboard tự cuộn tới tab đang mở, ẩn tên cạnh avatar dưới `2xl`; (3) Cài đặt: thanh tab ra khung rộng như các trang dashboard khác, dock thao tác `sticky` (trước che footer); (4) thẻ dự án chưa có ảnh vẽ đúng cấu trúc + kích thước (`BoxPreview`) thay vì cùng một dieline hộp nắp gài, 4 cột từ `2xl`; (5) chồng thẻ thư viện trang chủ có thẻ ở cả hai bên, nút "Xem tất cả" không xuống dòng. Sau sửa: header vừa ở mọi độ rộng đo được, 10 trang S5 không tràn ngang ở 375 px, `next build` pass | **Cho mọi phiên sau**: kiểm bố cục desktop bằng `npm --workspace=fe run shots -- <đường dẫn> --widths=1440x900,1920x1080,375x812 --login=<email>` (mật khẩu trong `SHOT_PASSWORD`; Git Bash cần `MSYS_NO_PATHCONV=1` để không đổi `/dashboard` thành đường dẫn Windows), rồi xem ảnh trong `fe/.page-shots/`. Không dùng ảnh chụp của pane trình duyệt để đánh giá desktop. **Cho S8**: header giờ dùng font của app trên cả các màn Stitch `converted` → đo lại số `stitch:parity` làm mốc mới. Thanh tab dashboard vẫn cuộn ngang ở 1280–1535 px (8 tab + 2 nút không đủ chỗ), đã tự cuộn tới tab đang mở |
| S9 | 2026-10-11 | `82db6ea`, `4908a64`, `8256330` | **Phase 7 xong** (không dùng subagent). 7.1 `page-shots` viết lại: `--routes` đọc `fe/scripts/page-shots.routes.json` (95 route × vai trò khách / MAKER / ADMIN, thao tác mở menu, drawer, hộp thoại, gõ, `waitFor`, chặn `/api` để thử mất kết nối), ma trận M T L X X+ W (M giả lập cảm ứng), kiểm tra `overflow`, `offscreen` (cả `fixed` / `sticky`), `image`, `request`, `console`, `text`, `overlap`, `covered`, `action`, `redirect`; `report.json` gộp nhiều lượt song song. 7.2 `fe/scripts/ui-fixtures.mjs` (+ `--clean`). 7.3–7.7: `docs/13_UI_VIEWPORT_AUDIT.md` (bảng 501 ô, 16 lỗi F1–F16 đã sửa, P3, mốc G7, mốc parity mới, giới hạn). Lượt cuối: G1–G5 0 ô trượt, G6 2 / 162 (P3-1). Sửa chính: mega menu mở khi chạm avatar / nút menu, footer và dock Stitch dưới `BottomNavBar`, 12 màn admin tĩnh tràn ngang trên điện thoại (nút menu + drawer dùng chung trong `AdminSidebarNav`, CSS `globals.css`), avatar lặp ở dashboard, ảnh Stitch / `lh3` chết, `&bull;` ở 2FA, favicon 404. `tsc` sạch, `next build` pass (build trong bản sao tạm vì `next dev` đang chạy), `stitch:sync` không đổi file. Dữ liệu thử **còn** (`node fe/scripts/ui-fixtures.mjs --clean` để xoá) | **Cho S6 / S7**: mốc G7 ở docs/13 §4 (L1–L6, có `/editor/studio` gọi `/api/projects/undefined`); chạy lại `npm --workspace=fe run shots -- --routes --group=G7` sau khi sửa. **Quy trình mới cho mọi phiên**: sau khi đổi giao diện, `node fe/scripts/ui-fixtures.mjs` rồi `npm --workspace=fe run shots -- --routes --group=<nhóm> [--sizes=…] --table`; không sửa code `fe/` trong lúc quét (Fast Refresh làm trang kẹt trạng thái tải, ra ô trượt giả). **Phát hiện ngoài phạm vi**: refresh của khách bị giới hạn 10 lần / phút / IP, 429 bị client coi là hết phiên (F16, đã tách việc riêng). **Cho S8**: so `stitch:parity` với cột "Sau S9" của docs/13 §2.3, không với 1%. Phiên sau: S6 |
| S9 (bổ sung) | 2026-10-11 | `292b5a9`, `738784d` | **Refresh 429 không còn đăng xuất người dùng** (F16 của docs/13). BE: `/auth/refresh` giới hạn theo phiên (`ThrottlePerSession` ở `common/decorators`: hash cookie `wf_refresh`, 30 / phút; không cookie 300 / phút / IP) thay cho 10 / phút / IP. FE (`services/api`): refresh 429 → chờ `Retry-After` ≤ 10 giây, thử lại một lần; chỉ refresh `401` mới phát `SESSION_EXPIRED_EVENT`, còn 429 / 5xx / mất mạng ném lỗi đó (trang hiện "thao tác quá nhanh", vẫn đăng nhập). Kèm **F17**: sự kiện hết phiên của khách xoá cache và huỷ request đang chạy, `/unbox/<mã>` kẹt loader trên mạng chậm → khách không xoá cache. Kiểm: unit BE 196/196 (+3), e2e 149/149 (+2 ở `auth`), 6 ca client với `fetch` giả (chạy bằng `node --experimental-transform-types`, không commit vì FE chưa có test runner), trong trình duyệt: 5 request 401 song song → một refresh 429 → báo lỗi, header vẫn đăng nhập; quét 44 lần tải trang của khách không còn 429; giữ response unboxing 1.5 giây: trước sửa 4/4 kẹt, sau sửa 4/4 mở được. Docs `03`, `06` §1, `13` đã cập nhật | `page-shots.routes.json` không còn chấp nhận 429 của khách. Phiên sau: S6 |
| S6 | 2026-10-11 | `61f5f3e`, `b4cd3d6`, `9d5d36a` | **Phase 3a xong** (agent chính làm, không dùng subagent). `/editor/new` (`views/editor/new`): bước 1 lấy cấu trúc từ `GET /templates/structures` (thứ tự, tên, mô tả của API; badge, gợi ý quà vẫn ở `BOX_STRUCTURES`), bước 2 slider + ô nhập mm theo `dimensionLimits` (ngoài giới hạn: khoá nút, báo lỗi; món quà mẫu ngoài giới hạn bị khoá), "Tạo Dự Án" → `POST /projects` → `router.replace('/editor/<id>')`, invalidate `projects.all`; `?template=<id>` → khoá bước 1, gửi `designTemplateId` + canvas của mẫu. `/editor/[id]` (`views/editor/studio/index.tsx` tải dự án bằng React Query, luôn lấy bản mới khi mở; `StudioWorkspace.tsx` giữ bản sao để sửa): dieline = `generateDielinePieces(template.id, dimensions, formulaVersion)` (hộp 2 mảnh có nút chọn mảnh), FitCheck tính như server (`checkDesign`, mọi mảnh), header hiện điểm server sau khi lưu; 404 / id sai → "Không tìm thấy dự án"; `/editor/demo` chạy offline không cần đăng nhập. `features/studio/hooks/useProjectSync.ts`: autosave 900 ms theo `version`, hàng đợi tuần tự, lỗi mạng / 5xx tự thử lại sau 5 giây, `beforeunload` khi chưa lưu, rời trang thì gửi nốt thay đổi; `409 PROJECT_VERSION_CONFLICT` → `VersionConflictDialog` (Tải bản mới = tải lại và dựng lại editor; Ghi đè = gửi với `currentVersion`); `409` không code / dự án `DELETED` → chỉ xem (`inert`) + "Khôi phục dự án". Ảnh PNG / JPG / WebP → `IMAGE`, SVG → `LOGO` qua `uploadFileToStorage` (kiểm định dạng, 15 MB; vừa mặt hộp đang chọn, giữ tỉ lệ, tính `dpi`). Thumbnail PNG 640 px (`utils/thumbnail.ts`, ảnh đọc thành data URL để canvas không bị "tainted") → `THUMBNAIL` → `PATCH { thumbnailUrl, version }` trong cùng hàng đợi, tối đa 1 lần / 60 giây và khi rời trang. `next.config.mjs` `redirects`: `/editor`, `/editor/studio`, `/editor/step-1..4`, `/editor/export` → `/editor/new` (307, giữ query); xoá `app/editor/studio`. Link: header, mega menu, bottom bar, avatar, sidebar admin, trang chủ → `ROUTES.editorNew`; footer, "3D Studio" ở dashboard → `ROUTES.editorDemo` (mới). Việc S5 để lại: `InteractiveFoldingBox3D` thêm `showStatusBar`, `minHeight`; trang công khai ẩn thanh trạng thái. `tsc` sạch, `next build` pass (bản sao tạm), `stitch:sync` không đổi file. Đã kiểm trên trình duyệt với backend thật (admin seed): tạo dự án 120 × 80 × 60 → đổi tên → upload PNG → thêm chữ → F5 còn đủ; thumbnail lên dashboard (ảnh có chữ + ảnh); sửa rồi chuyển trang ngay (< 900 ms) vẫn lưu; tab khác lưu trước → hộp thoại → Ghi đè đúng, lần 2 Tải bản mới đúng; chuyển dự án vào thùng rác khi đang mở → chỉ xem → Khôi phục → lưu tiếp; tạo từ mẫu lid-base → 2 mảnh phôi, canvas của mẫu. Quét G7 (docs/13 §4): 30 / 30 ô `ok` ở M, X+; xem thêm ảnh T, L, X. Dữ liệu thử đã xoá (fixture của S9 còn) | **Phát hiện ngoài phạm vi (đã tách việc)**: (1) mẫu Curated của seed đặt mọi chữ ở `panelId: 'front'`, chỉ hộp nắp gài có mặt đó → chữ của mẫu gối / âm dương / bao diêm không hiện, không được FitCheck, có thể không in; (2) `tuck-top.ts`: nắp trên `y = 0`, cao W, đè lên mặt sau (bắt đầu `y = H`) khi W > H; sửa phải thêm `formulaVersion` 2. **Cho S7**: nút xuất file, QR, mốc phiên bản vẫn là code cũ trong `StudioWorkspace.tsx` (xuất file còn `setInterval`, QR còn `api.qrserver.com`), thay bằng component riêng ở `features/studio/components/<tên>/`; `useProjectSync` có `serverReport` (FitCheck server) và hàng đợi lưu: thao tác đổi version (khôi phục mốc) phải đi qua nó hoặc dựng lại editor (`onReload`) để không bị `409`; bước 3 trên điện thoại: dock công cụ đứng dọc chiếm cả cột (có từ trước). **Môi trường**: `next dev` của phiên khác đang chạy ở cổng 3000 nên S6 dùng chung (Fast Refresh, `next.config` tự nạp lại); `window.scrollTo` trên Chromium mới trả Promise, đừng viết `useEffect(() => window.scrollTo(...))`. Phiên sau: S7 |
| S6 (bổ sung) | 2026-10-11 | `74bc021` | **Mẫu Curated của seed đặt chữ đúng mặt hộp** (phát hiện (1) của S6). Dữ liệu seed tách ra `be/prisma/seed-data.ts`; chữ dùng id mặt đầy đủ của từng cấu trúc (`panel_front`, `pillow_front`, `lid_top`, `sleeve_top`) và vị trí / bề rộng nằm trong mặt (mẫu "Hộp Skincare Tối Giản" trước tràn mặt trước 60 mm). Test `be/src/templates/seed-data.spec.ts`: mọi phần tử nằm trên một mặt của dieline, mọi mẫu qua FitCheck không vi phạm. Unit 202/202. Đã chạy `db:seed` ở local, tạo dự án từ mẫu âm dương: mở đúng mảnh "Nắp", chữ "Hỷ" hiện, FitCheck 100. Không dự án nào trong DB local dùng id cũ nên không cần migration | Phát hiện (2) (`tuck-top.ts` nắp đè mặt sau) vẫn là việc riêng. Phiên sau: S7 |
| S6 (bổ sung 2) | 2026-10-11 | `7e4e105` | **Dieline hộp nắp gài phiên bản công thức 2** (phát hiện (2) của S6). `shared/src/parametric/tuck-top.ts`: tai gài, nắp L × W, thân, đáy L × W, tai gài theo cột mặt sau; tai chống bụi ở 2 mặt hông; tai dán vát; đủ nét cắt và nét gấp. Id và kích thước các mặt giữ như bản 1 nên canvas và điểm FitCheck không đổi. Bản 1 đóng băng ở `tuck-top.v1.ts` cho dự án cũ; `CURRENT_FORMULA_VERSION = 2`, seed gán cho cả 4 cấu trúc (3 cấu trúc kia giống bản 1). Test `be/src/projects/domain/dieline-geometry.spec.ts`: mặt không chồng nhau, không ra ngoài khổ, ở 4 cỡ, cả 4 cấu trúc; bản 1 không đổi. Unit 221/221, e2e `export` `projects` `templates` `public-showcase` 66/66. Studio vẽ đúng phôi mới (415 × 256 mm cho 120 × 80 × 60) | **Phát hiện mới**: hộp gối, âm dương, bao diêm cũng **không có nét cắt** (`type: "cut"`), nên lớp cắt của file in PDF / SVG / DXF trống với 3 cấu trúc này; cần phiên bản 3. Môi trường: backend / `next dev` đang chạy tự nhận `shared/dist` mới sau `npm run build:shared` (nếu thấy `UnsupportedFormulaVersionError` 500 thì khởi động lại backend). Phiên sau: S7 |
| Plan (bổ sung Phase 8) | 2026-10-11 | — | Thêm Phase 8 (rà soát và sửa công thức hộp, mục H1–H11) và phiên S10 theo yêu cầu người dùng, sau khi S6 tìm ra lỗi công thức hộp nắp gài và thấy 3 cấu trúc còn lại cũng không có nét cắt | S10 phải xong trước S8; có thể làm trước hoặc sau S7. Mục 8.10 (cập nhật dự án cũ lên công thức mới): người dùng chốt **D + B** (`8.10a` script tự chuyển dự án chưa xuất file in, `8.10b` nút cập nhật có hoàn tác) |
| S7 | 2026-10-12 | `2068f24` | **Phase 3b xong** (agent chính làm, không dùng subagent). Mỗi tính năng một hộp thoại ở `features/studio/components/<tên>/` (khung chung `dialog/StudioDialog.tsx`: bottom sheet trên điện thoại, Esc / nền đóng, trả focus), thay code cũ trong `StudioWorkspace.tsx` (xuất file `setInterval`, QR `api.qrserver.com`). `useProjectSync` thêm `flush()` (gửi ngay thay đổi đang chờ, đợi hàng đợi: trước xuất file và lưu mốc, vì backend đọc bản đã lưu), `patch()` (lưu `occasion` / `industry` trong hàng đợi với version hiện tại), `replace()` (chạy thao tác đổi version như khôi phục mốc sau khi lưu xong, rồi tách editor để dựng lại bằng `project` trả về; lỗi lưu → `UnsavedChangesError`). **Mốc phiên bản** (`snapshots/`): danh sách, lưu kèm ảnh PNG mới (`THUMBNAIL`), khôi phục có xác nhận → dựng lại editor + thanh "Đã khôi phục mốc … · Hoàn tác" (khôi phục `backup.id`), xoá có xác nhận, `409` → "Đã đủ 50 mốc". **Xuất file** (`export/`): `PDF_CMYK` / `SVG` / `DXF`; `422` → khung lỗi + "Mở FitCheck để sửa" (bước 3, tab FitCheck hiện báo cáo của server tới khi thiết kế đổi); poll 2 giây bằng `refetchInterval`, dừng khi xong hoặc đóng hộp thoại; tải bằng `location.assign` (link `attachment`), link hết hạn thì GET job lấy link mới; lịch sử 6 lần gần nhất; mascot `delivery` / `celebration`. **Chia sẻ** (`share/`): `PRIVATE` / `UNLISTED` / `PUBLIC`, "Cho phép Remix", sao chép / mở `/p/<slug>`; `PUBLIC` có dịp + ngành hàng và cảnh báo khi FitCheck < 90. **Mở hộp QR** (`unboxing/`): tạo (tên, lời chúc, 6 hiệu ứng), xem QR (`qrCodeUrl` hoặc endpoint `/qr`), tải PNG / SVG, link `unboxUrl`, sửa (slug giữ nguyên), xoá. **Hoa văn AI** (`ai-pattern/`, trong tab "Màu & Font"): chủ đề + gợi ý + màu của bảng màu, xem trước tile và palette, lượt còn lại (khi AI bật), `429` hết lượt; "Dùng cho <mặt>" lặp tile thành **PNG** phủ mặt đang chọn (lề 3 mm, 300 DPI, cạnh ≤ 3600 px) → upload `IMAGE` → phần tử `pattern` nằm dưới các phần tử khác. Canvas 2D và thumbnail vẽ `pattern` như ảnh. Bố cục: nhãn trạng thái lưu từ `2xl`; nút Mốc / Chia sẻ ở header từ `sm`, trên điện thoại ở hàng công cụ bước 3; dock công cụ nằm ngang dưới `lg` (việc S6 để lại). `tsc` sạch; chưa chạy `next build` (`next dev` của phiên khác đang chạy). Đã kiểm trên trình duyệt với backend + worker thật (admin seed): thêm chữ → lưu "Mốc A" (có ảnh xem trước) → thêm chữ thứ hai rồi khôi phục ngay (< 900 ms: bản chưa lưu được lưu trước, v3 → v4 → v5) → canvas còn 1 chữ, có mốc "Trước khi khôi phục: Mốc A" → Hoàn tác → 2 chữ (v6), không `409`; xuất PDF, SVG, DXF đều `COMPLETED`, file PDF đúng `%PDF-`, bấm "Tải về" không rời trang; dự án có chữ ở `x = 0` → `422` → FitCheck → sửa tự động → xuất lại thành công; chia sẻ `UNLISTED` → `/p/<slug>` 200, tắt Remix, `PUBLIC` + Sinh nhật / Bánh ngọt (v7 qua hàng đợi), autosave sau đó vẫn lưu (v9); QR: tạo → `/unbox/<slug>` 200, API công khai đúng tên, lời chúc (giữ xuống dòng), `hearts`; PNG / SVG 200; sửa lời chúc giữ slug; xoá → 404; hoa văn "Tết hoa mai" (procedural) → PNG 300 DPI 114 × 54 mm trên mặt trước, FitCheck 100, PDF xuất ra có ảnh nhúng; `/editor/demo` không có nút Mốc / Chia sẻ, Xuất file báo cần đăng nhập. Quét G7 (docs/13 §4): 36 / 36 ô `ok` ở M, X+, thêm 4 route hộp thoại. Dữ liệu thử đã xoá; fixture của S9 được tạo lại (`node fe/scripts/ui-fixtures.mjs --clean` để xoá) | **Giả định**: (1) "Dùng" hoa văn upload **PNG** thay vì SVG như plan (§4 mục 11), vì file PDF in chỉ nhúng PNG / JPEG (`print-renderers.ts`); (2) form mở hộp **chưa có ô nhạc nền**: backend chỉ nhận file đã upload lên WrapFit hoặc đường dẫn của FE (không nhận `https` trang khác như plan ghi), mà upload chưa có `purpose` cho âm thanh và `fe/public` chưa có file nhạc → lưu giữ nguyên `audioTrackUrl` đang có; (3) poll xuất file tạm dừng khi tab bị ẩn (mặc định React Query), quay lại tab thì tự lấy trạng thái. **Sửa file của H (Phase 8)**: `DielineCanvas2D.tsx`, `utils/thumbnail.ts` chỉ thêm `"pattern"` vào nhánh vẽ ảnh. **Cho S10**: bước 4 / `InteractiveFoldingBox3D` in `content` của mọi phần tử thành chữ (cả URL ảnh, hoa văn) — thuộc 8.7; FitCheck coi `pattern` như phần tử thường (phải cách mép 3 mm), nên hoa văn chưa tràn lề được: nếu 8.x cho hoa văn tràn tới bleed thì đổi `SAFE_MARGIN_MM` trong `AiPatternPanel.tsx`. **Còn lại**: bước 3 trên điện thoại, hộp zoom của canvas đè một phần nhãn "Bản Bế 2D Phẳng" (có từ trước, `DielineCanvas2D`); chưa dựng được ca `409` 50 mốc và `429` hết lượt AI trên trình duyệt (AI tắt ở local). Phiên sau: S10 |

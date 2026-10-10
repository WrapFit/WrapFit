# 12 — Kế hoạch nối Frontend ↔ Backend

> Ngày lập: 2026-10-10 · Nhánh gốc: `feat/studio-editor-and-mascot-copilot` · Trạng thái: **đã duyệt 2026-10-10**,
> thực hiện theo từng phiên ở [§9](#9-chia-phiên-làm-việc-và-bàn-giao)
> Contract API: [`06_FE_INTEGRATION_GUIDE.md`](06_FE_INTEGRATION_GUIDE.md) (cách dùng), Swagger `http://localhost:8080/api/docs`
> (nguồn sự thật), [`03_API_DESIGN.md`](03_API_DESIGN.md). Kiến trúc Stitch: [`11_STITCH_PARITY_AUDIT.md`](11_STITCH_PARITY_AUDIT.md).

Mục lục: [1. Hiện trạng](#1-hiện-trạng) · [2. Quyết định](#2-quyết-định-đã-chốt) · [3. Bản đồ màn hình](#3-bản-đồ-màn-hình--api) ·
[4. Các phase](#4-các-phase) · [5. Sở hữu file](#5-ma-trận-sở-hữu-file) · [6. Điều phối subagent](#6-điều-phối-subagent) ·
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

Hai agent cùng chạm `views/home/index.tsx` (C: link, D: section thư viện): C chỉ đổi `href`, D chỉ đổi khối
`<section id="thu-vien-mau">`. Agent chính gộp nếu xung đột.

## 6. Điều phối subagent

Thứ tự phụ thuộc: Phase 0 → (1, 2, 3a, 4, 5 độc lập với nhau) → 3b (sau 3a) → 6. Để vừa hạn mức mỗi lần chạy, các
phase được xếp thành 8 phiên, mỗi phiên tối đa 2 subagent song song (§9).

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
| **S8** | Phase 6: build toàn monorepo, `stitch:parity`, kịch bản §7 trên trình duyệt, review, cập nhật docs `04`, `06`, `11`, `fe/README.md` | Không (có thể 1 agent review) | S4–S7 xong | 15 bước §7 đạt, có ảnh bằng chứng |

S4, S5, S6 chỉ phụ thuộc S3, nên chạy theo thứ tự nào cũng được. Một phiên quá lớn so với hạn mức còn lại thì tách
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
kiểm tra nhanh trên trình duyệt các màn vừa nối.

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

# 13 — Rà soát giao diện theo kích thước màn hình (Phase 7)

> Cập nhật: 2026-10-11 · Nhánh `feat/fe-be-integration` · Phiên S9 của [`12`](12_FE_BE_INTEGRATION_PLAN.md) §4 Phase 7

## 1. Cách chạy

Cần: Postgres, Redis, SeaweedFS, Mailpit (docker compose), backend (`npm run dev:be`), worker (`node be/dist/worker.js`
từ `be/`), frontend (`npm run dev:fe`).

```bash
node fe/scripts/ui-fixtures.mjs                       # dữ liệu thử (xoá bản cũ rồi tạo lại)
npm --workspace=fe run shots -- --routes               # toàn bộ route × 6 kích thước
npm --workspace=fe run shots -- --routes --group=G4 --sizes=M,X+ --table
node fe/scripts/ui-fixtures.mjs --clean               # xoá dữ liệu thử
```

| Thành phần | Vai trò |
|---|---|
| `fe/scripts/page-shots.mjs` | Chrome headless, chụp đủ độ phân giải, chạy kiểm tra trong trang, ghi `fe/.page-shots/report.json` (gộp theo route × vai trò × kích thước, nhiều lượt chạy song song không ghi đè nhau) |
| `fe/scripts/page-shots.routes.json` | Danh sách route của G1–G7: đường dẫn, vai trò, kích thước, thao tác trước khi chụp (bấm, rê chuột, gõ, phím), request / lỗi console dự kiến |
| `fe/scripts/ui-fixtures.mjs` | Dữ liệu thử dựng lại được: thư mục, 4 dự án ACTIVE (PUBLIC có mở hộp QR, UNLISTED `allowFork: false`, tên rất dài, trong thư mục), 1 ARCHIVED, 1 DELETED của admin seed; tài khoản MAKER mới (xác minh qua Mailpit). Ghi id, slug, mật khẩu MAKER vào `fe/.page-shots/fixtures.json` (git bỏ qua) |
| `fe/scripts/lib/app-session.mjs` | Đăng nhập qua proxy `/api`, giữ cookie, đọc `SEED_ADMIN_*` của `be/.env` |

**Ma trận kích thước**: M 375 × 812 (giả lập điện thoại + cảm ứng), T 768 × 1024, L 1024 × 768, X 1280 × 800,
X+ 1440 × 900, W 1920 × 1080. G6 chụp ở M, T, W; G7 ở M, X+.

**Kiểm tra tự động** (mỗi ô route × kích thước; mục nào cũng làm ô đó trượt):

| Mã | Bắt được |
|---|---|
| `overflow` | Trang cuộn ngang |
| `offscreen` | Phần tử thò ra ngoài màn hình, kể cả `fixed` / `sticky` (bỏ qua phần tử bị tổ tiên cắt hoặc cuộn, panel đẩy ra bằng `transform`, hình trang trí không chữ có `pointer-events: none`) |
| `image` | `<img>` tải hỏng |
| `request` | Response ≥ 400 hoặc request lỗi mạng ngoài danh sách dự kiến |
| `console` | Lỗi console / exception ngoài `knownConsole` |
| `text` | Chữ tràn khỏi nút / link, hoặc bị cắt bằng dấu "…" mà không có `title` |
| `overlap` | Hai thanh nổi (`fixed`) đè nhau, vd. dock của màn Stitch dưới `BottomNavBar` |
| `covered` | Chữ ở cuối trang bị thanh nổi che (không cuộn ra được) |
| `action` | Thao tác trước khi chụp không tìm thấy phần tử |
| `redirect` | Trang kết thúc ở đường dẫn khác (vd. bị đẩy về đăng nhập) |

Chỉ ghi nhận, không làm trượt: nhãn ngắn xuống dòng (`wrap`), vùng bấm < 44 px ở M (`small`).

## 2. Kết quả

### 2.1. Tổng hợp

Ô = một route × vai trò × kích thước. "Lượt 1" là lần quét đầu (G6 chỉ ở M, T, W), "Cuối" là sau khi sửa (G6 ở cả
6 kích thước). Lượt 1 không tính 429 `/auth/refresh` của khách (F16).

| Nhóm | Route × vai trò | Ô trượt lượt 1 | Ô trượt cuối | Ghi chú lượt 1 |
|---|---|---|---|---|
| G1 Khung chung | 12 | 6 / 38 | **0 / 39** | 404 dock + footer bị che, drawer admin, mega menu |
| G2 Tài khoản | 11 | 26 / 62 | **0 / 62** | Ảnh mosaic chết ở L → W |
| G3 Quản trị | 4 | 0 / 24 | **0 / 24** | |
| G4 Dashboard | 18 | 49 / 108 | **0 / 108** | 48 ô là báo nhầm "spills" của script (chữ đã `truncate`), đã sửa script; còn footer bị che ở M |
| G5 Công khai | 15 | 12 / 90 | **0 / 90** | Footer bị che ở M, dock 404 |
| G6 Màn Stitch tĩnh | 27 | 35 / 81 | **2 / 162** | Admin tĩnh tràn ngang ở M, T; ảnh chết; `/dashboard/specs`. Còn lại: P3-1 (`/intro/*` ở M) |
| G7 Studio | 8 | 10 / 16 | 10 / 16 | Chỉ ghi mốc, xem §4 |

Ngoài kiểm tra tự động, ảnh G1–G5 đã được xem ở cả 6 kích thước, G6 ở M, T, W, G7 ở M, X+ theo checklist của
docs/12 Phase 7 (ảnh ghép 6 kích thước / route). Lỗi chỉ thấy bằng mắt (avatar lặp, mega menu chồng menu tài khoản,
`&bull;`, sidebar admin) nằm trong §3.

### 2.2. Bảng route × kích thước (lượt cuối)

`ok` = qua mọi kiểm tra; `—` = không chụp ở kích thước đó (thao tác chỉ có ở một số kích thước, hoặc G7). Slug, id
thay bằng `…`.

| Nhóm | Route | Vai trò | M | T | L | X | X+ | W |
|---|---|---|---|---|---|---|---|---|
| G1 | `/admin/accounts` admin-mobile-nav | admin | ok | ok | — | — | — | — |
| G1 | `/admin/…` admin-static-mobile-nav | admin | ok | ok | — | — | — | — |
| G1 | `/dashboard` avatar-menu | admin | ok | ok | ok | ok | ok | ok |
| G1 | `/admin/accounts` forbidden-403 | maker | ok | ok | ok | ok | ok | ok |
| G1 | `/` header-mega-menu | guest | — | — | — | ok | ok | ok |
| G1 | `/` header-mobile-menu | admin | ok | ok | ok | — | — | — |
| G1 | `/` header-mobile-menu | guest | ok | ok | ok | — | — | — |
| G1 | `/…` not-found | guest | ok | ok | ok | ok | ok | ok |
| G1 | `/dashboard` offline-dashboard | admin | ok | — | — | — | ok | — |
| G1 | `/` offline-home | guest | ok | — | — | — | ok | — |
| G1 | `/dashboard/projects` offline-projects | admin | ok | — | — | — | ok | — |
| G1 | `/templates` offline-templates | guest | ok | — | — | — | ok | — |
| G2 | `/…?email=ui-maker@wrapfit.test` check-email | guest | ok | ok | ok | ok | ok | ok |
| G2 | `/…` complete-signup | guest | ok | ok | ok | ok | ok | ok |
| G2 | `/…` forgot-password | guest | ok | ok | ok | ok | ok | ok |
| G2 | `/auth/login?error=…` login-google-error | guest | ok | ok | ok | ok | ok | ok |
| G2 | `/auth/login?notice=…` login-notice | guest | ok | ok | ok | ok | ok | ok |
| G2 | `/auth/login` login-wrong-password | guest | ok | — | — | — | ok | — |
| G2 | `/auth/login` login | guest | ok | ok | ok | ok | ok | ok |
| G2 | `/auth/register` register | guest | ok | ok | ok | ok | ok | ok |
| G2 | `/…?token=…` reset-password | guest | ok | ok | ok | ok | ok | ok |
| G2 | `/…?token=…` verify-email-expired | guest | ok | ok | ok | ok | ok | ok |
| G2 | `/…` verify-email-missing | guest | ok | ok | ok | ok | ok | ok |
| G3 | `/admin/accounts` accounts-delete-dialog | admin | ok | ok | ok | ok | ok | ok |
| G3 | `/admin/accounts` accounts-drawer | admin | ok | ok | ok | ok | ok | ok |
| G3 | `/admin/accounts` accounts-lock-dialog | admin | ok | ok | ok | ok | ok | ok |
| G3 | `/admin/accounts` accounts | admin | ok | ok | ok | ok | ok | ok |
| G4 | `/dashboard/brand-kit` brand-kit | admin | ok | ok | ok | ok | ok | ok |
| G4 | `/dashboard/brand-kit` brand-kit | maker | ok | ok | ok | ok | ok | ok |
| G4 | `/dashboard` dashboard | admin | ok | ok | ok | ok | ok | ok |
| G4 | `/dashboard` dashboard | maker | ok | ok | ok | ok | ok | ok |
| G4 | `/dashboard/profile` profile | admin | ok | ok | ok | ok | ok | ok |
| G4 | `/dashboard/profile` profile | maker | ok | ok | ok | ok | ok | ok |
| G4 | `/dashboard/projects` projects-archived | admin | ok | ok | ok | ok | ok | ok |
| G4 | `/dashboard/projects` projects-delete-forever | admin | ok | ok | ok | ok | ok | ok |
| G4 | `/dashboard/projects` projects-menu | admin | ok | ok | ok | ok | ok | ok |
| G4 | `/dashboard/projects` projects-move-folder | admin | ok | ok | ok | ok | ok | ok |
| G4 | `/dashboard/projects` projects-new-folder | admin | ok | ok | ok | ok | ok | ok |
| G4 | `/dashboard/projects` projects-no-match | admin | ok | ok | ok | ok | ok | ok |
| G4 | `/dashboard/projects` projects-trash | admin | ok | ok | ok | ok | ok | ok |
| G4 | `/dashboard/projects` projects-trash | maker | ok | ok | ok | ok | ok | ok |
| G4 | `/dashboard/projects` projects | admin | ok | ok | ok | ok | ok | ok |
| G4 | `/dashboard/projects` projects | maker | ok | ok | ok | ok | ok | ok |
| G4 | `/dashboard/settings` settings | admin | ok | ok | ok | ok | ok | ok |
| G4 | `/dashboard/settings` settings | maker | ok | ok | ok | ok | ok | ok |
| G5 | `/` home | admin | ok | ok | ok | ok | ok | ok |
| G5 | `/` home | guest | ok | ok | ok | ok | ok | ok |
| G5 | `/p/…` public-no-remix | maker | ok | ok | ok | ok | ok | ok |
| G5 | `/p/…` public-not-found | guest | ok | ok | ok | ok | ok | ok |
| G5 | `/p/…` public-project | admin | ok | ok | ok | ok | ok | ok |
| G5 | `/p/…` public-project | guest | ok | ok | ok | ok | ok | ok |
| G5 | `/p/…` public-project | maker | ok | ok | ok | ok | ok | ok |
| G5 | `/templates?q=…` templates-empty | guest | ok | ok | ok | ok | ok | ok |
| G5 | `/templates?occasion=TET` templates-filter | guest | ok | ok | ok | ok | ok | ok |
| G5 | `/templates?page=2` templates-page-2 | guest | ok | ok | ok | ok | ok | ok |
| G5 | `/templates` templates | guest | ok | ok | ok | ok | ok | ok |
| G5 | `/unbox/…` unbox-closed | guest | ok | ok | ok | ok | ok | ok |
| G5 | `/unbox` unbox-code | guest | ok | ok | ok | ok | ok | ok |
| G5 | `/unbox/…` unbox-open | guest | ok | ok | ok | ok | ok | ok |
| G5 | `/unbox/…` unbox-wrong-code | guest | ok | ok | ok | ok | ok | ok |
| G6 | `/auth/2fa` 2fa | guest | ok | ok | ok | ok | ok | ok |
| G6 | `/admin/appraisal` admin-appraisal | admin | ok | ok | ok | ok | ok | ok |
| G6 | `/admin/…` admin-dieline-vault | admin | ok | ok | ok | ok | ok | ok |
| G6 | `/admin/…` admin-gpu-cluster | admin | ok | ok | ok | ok | ok | ok |
| G6 | `/admin/ledger` admin-ledger | admin | ok | ok | ok | ok | ok | ok |
| G6 | `/admin/media` admin-media | admin | ok | ok | ok | ok | ok | ok |
| G6 | `/admin/…` admin-print-shops | admin | ok | ok | ok | ok | ok | ok |
| G6 | `/admin/revenue` admin-revenue | admin | ok | ok | ok | ok | ok | ok |
| G6 | `/admin/security` admin-security | admin | ok | ok | ok | ok | ok | ok |
| G6 | `/admin/…` admin-studio-monitoring | admin | ok | ok | ok | ok | ok | ok |
| G6 | `/admin/…` admin-system-config | admin | ok | ok | ok | ok | ok | ok |
| G6 | `/admin/…` admin-vault-quotas | admin | ok | ok | ok | ok | ok | ok |
| G6 | `/admin` admin | admin | ok | ok | ok | ok | ok | ok |
| G6 | `/checkout/step-1` checkout-1 | admin | ok | ok | ok | ok | ok | ok |
| G6 | `/checkout/step-2` checkout-2 | admin | ok | ok | ok | ok | ok | ok |
| G6 | `/checkout/step-3` checkout-3 | admin | ok | ok | ok | ok | ok | ok |
| G6 | `/dashboard/materials` dashboard-materials | admin | ok | ok | ok | ok | ok | ok |
| G6 | `/dashboard/orders` dashboard-orders | admin | ok | ok | ok | ok | ok | ok |
| G6 | `/dashboard/specs` dashboard-specs | admin | ok | ok | ok | ok | ok | ok |
| G6 | `/editor/materials/backdrop` editor-backdrop | admin | ok | ok | ok | ok | ok | ok |
| G6 | `/editor/inspect/fefco` editor-fefco | admin | ok | ok | ok | ok | ok | ok |
| G6 | `/intro/blueprint` intro-blueprint | guest | **overflow** | ok | ok | ok | ok | ok |
| G6 | `/intro/minimal` intro-minimal | guest | **overflow** | ok | ok | ok | ok | ok |
| G6 | `/…` notifications | admin | ok | ok | ok | ok | ok | ok |
| G6 | `/pricing` pricing | guest | ok | ok | ok | ok | ok | ok |
| G6 | `/support` support | guest | ok | ok | ok | ok | ok | ok |
| G6 | `/team` team | admin | ok | ok | ok | ok | ok | ok |
| G7 | `/editor/export` editor-export | admin | **covered** | — | — | — | ok | — |
| G7 | `/editor/…` editor-project | admin | ok | — | — | — | **text** | — |
| G7 | `/editor/step-1` editor-step-1 | admin | **image, request** | — | — | — | **image, request** | — |
| G7 | `/editor/step-2` editor-step-2 | admin | **covered** | — | — | — | ok | — |
| G7 | `/editor/step-3` editor-step-3 | admin | **covered** | — | — | — | ok | — |
| G7 | `/editor/step-4` editor-step-4 | admin | **overflow, offscreen, covered** | — | — | — | ok | — |
| G7 | `/editor/studio` editor-studio | admin | **request** | — | — | — | **request, text** | — |
| G7 | `/editor` editor | admin | **covered** | — | — | — | ok | — |

### 2.3. Mốc `stitch:parity` (1280 px, 2026-10-11)

Đo cả trước (HEAD `fcc477c`, stash thay đổi S9) và sau S9 trong cùng môi trường, như cách S3 đã làm. Ngưỡng 1% của
docs/11 không còn dùng được: từ `e07d23b`, `e509d8f` các màn có header, sidebar, nav sửa tay, và header chung đổi font
ở S5.

| Màn | Trước S9 | Sau S9 | | Màn | Trước S9 | Sau S9 |
|---|---|---|---|---|---|---|
| `/intro/blueprint` | 22.64% | 21.52% | | `/team` | 3.26% | 3.29% |
| `/intro/minimal` | 0.32% | 0.32% | | `/notifications` | 1.92% | 1.92% |
| not-found | 4.04% | **5.51%** | | `/support` | 2.17% | 2.17% |
| `/editor` | 1.62% | 1.62% | | `/admin` | 2.27% | 2.27% |
| `/editor/export` | 5.15% | 5.15% | | `/admin/vault-quotas` | 1.48% | 1.57% |
| `/editor/inspect/fefco` | 9.85% | 9.89% | | `/admin/security` | 1.29% | 1.38% |
| `/editor/materials/backdrop` | 1.37% | 1.41% | | `/admin/dieline-vault` | 1.73% | 1.73% |
| `/dashboard/materials` | 12.97% | 13.04% | | `/admin/print-shops` | 1.18% | 1.25% |
| `/dashboard/specs` | 47.50% | 47.34% | | `/admin/studio-monitoring` | 1.75% | 1.82% |
| `/pricing` | 5.16% | 5.16% | | `/admin/revenue` | 2.72% | **4.64%** |
| `/checkout/step-1` | 1.86% | 1.89% | | `/admin/media` | 2.00% | 2.13% |
| `/checkout/step-3` | 2.58% | 2.63% | | `/` | 6.96% | 6.99% |

Hai chỗ tăng rõ đều là chủ đích: not-found có lại ảnh mascot (F7) và khoảng đệm dưới dock (F6); `/admin/revenue` hết
tràn ngang 302 px ở 1280 (cột nội dung `min-width: 0`, F11), nên khác bản Stitch vốn tràn. `/intro/blueprint` dao động
vì cảnh 3D xoay liên tục; `/dashboard/specs` (47%) đã khác hẳn bản Stitch từ `e509d8f` (thêm header, thẻ nhỏ hơn).
S8 so với cột "Sau S9".


## 3. Lỗi tìm thấy và cách sửa

Mức: **P1** che / cắt nội dung, không bấm được, tràn ngang; **P2** bố cục lệch, chữ lỗi, ảnh vỡ, phần tử thừa;
**P3** thẩm mỹ nhỏ. Kích thước: M, T, L, X, X+, W như §1.

| # | Nhóm | Mức | Màn / kích thước | Lỗi | Sửa |
|---|---|---|---|---|---|
| F1 | G1 | P1 | Mọi trang có `MainHeader`, mọi kích thước | `onMouseEnter` gắn trên cả khung header: rê / chạm bất kỳ đâu (avatar, nút menu, logo) mở mega menu. Trên cảm ứng, chạm cũng phát sự kiện enter, nên bấm avatar mở cả mega menu lẫn menu tài khoản; dưới `xl` panel mega menu (không giới hạn kích thước) đè lên drawer mobile | `MainHeader`: chỉ mở khi rê chuột thật (`pointerType === 'mouse'`) trên nút "Khám Phá Toàn Bộ" và panel; panel `hidden xl:block`; đóng bằng Escape và khi bấm ra ngoài header (cảm ứng ≥ xl); nút có `aria-expanded` |
| F2 | G1 | P2 | Mega menu, X, X+ | Tiêu đề mục bị cắt "…" không có `title` (5 cột hẹp) | Tiêu đề xuống dòng, mô tả 2 dòng |
| F3 | G1 | P1 | 16 trang có `MainFooter`, M | Dòng cuối footer nằm dưới `BottomNavBar`, không cuộn ra được | `MainFooter`: `pb-28` dưới `md` |
| F4 | G1 | P2 | Mọi trang, lần tải đầu | `GET /favicon.ico` 404 (app không khai báo icon) | `metadata.icons` trong `app/layout.tsx` |
| F5 | G1, G6 | P1 | 404, `/team`, `/pricing`, `/checkout/step-1`, `/checkout/step-3`, `/admin/vault-quotas`, M | Dock / thanh thao tác riêng của màn Stitch (`fixed` hoặc `sticky` + `bottom-*`) nằm dưới `BottomNavBar` (từ `e509d8f` bottom nav hiện cả trên màn Stitch, docs/11 A7 cũ ẩn nó) | `stitch/base.css`: dưới `md` nâng dock lên `bottom: 5.25rem` |
| F6 | G1, G6 | P2 | Cùng các màn trên, T → W | Dock nổi che dòng cuối footer ở mọi kích thước | `stitch/base.css`: màn có dock nổi được `padding-bottom: 5.5rem` |
| F7 | G1, G6 | P2 | 404, `/checkout/step-1`, `/checkout/step-3`, `/team` | Ảnh mascot `/stitch/img/*.png` không có trong `public` (URL Stitch hết hạn khi tải) | Khung giữa của sprite `box-directions` → `public/mascots/goi.webp`; sửa tay 4 view (đã khoá, docs/11 §3) |
| F8 | G2 | P2 | `/auth/login`, `/auth/register`, L → W | Ô ảnh "Luxury Rigid Studio" và mascot của mosaic là URL `lh3.googleusercontent.com` đã chết (403, `ERR_BLOCKED_BY_ORB`); script cũ bỏ sót vì ảnh `loading="lazy"` | `branding/hero-packaging-model.webp`, `mascots/goi.webp` |
| F9 | G4 | P2 | 8 trang dashboard, mọi kích thước | `DashboardHeaderNav` vẽ avatar thứ hai (header chính đã có): hai avatar trên điện thoại, chiếm chỗ của thanh tab ở 1280–1535 px | `showAvatar` mặc định `false` |
| F10 | G4 | P3 | `/dashboard/projects` | Chip thư mục tên dài bị cắt "…" không có `title` | `title` = tên thư mục |
| F11 | G6 | P1 | 12 màn admin tĩnh (`/admin`, `vault-quotas`, `security`, `print-shops`, `studio-monitoring`, `media`, `revenue`, `dieline-vault`, `appraisal`, `gpu-cluster`, `ledger`, `system-config`), M, T | Khung desktop của Stitch: sidebar `w-72` luôn hiện, nội dung đẩy sang phải (tràn 135–777 px), header bắt đầu từ `left-72`, không có cách mở menu trên điện thoại | `AdminSidebarNav` (dùng ở mọi màn admin) thêm nút menu cố định dưới `lg` (portal) và đặt `html[data-admin-nav]`; `globals.css`: sidebar thành drawer, bỏ `pl-72` / `ml-72` / `left-72`, `min-width: 0` cho cột nội dung, chip header một hàng cuộn ngang, ẩn ô tìm kiếm dưới `md`, chừa chỗ cho bottom nav. `/admin/accounts` giữ drawer riêng (`mobileToggle={false}`) |
| F12 | G6 | P1 | `/dashboard/specs`, M, T | Vệt mờ trang trí `w-[500px]` tràn 219 px; hàng nút "Xem Dạng Tối Giản…" tràn 61 px ở T | `main` `overflow-x-clip`; hàng nút `flex-wrap` |
| F13 | G6 | P2 | Avatar header của `admin/media`, `security`, `vault-quotas`; mascot `dashboard/specs`, `editor/materials/backdrop`; `/branding/mascot-hero.png` của `editor/inspect/fefco` (và `editor/step-2`, `editor/step-4`, `editor/export`) | URL `lh3` chết, file `mascot-hero.png` không tồn tại | Avatar thành chữ viết tắt; mascot → `mascots/goi.webp` |
| F14 | G6 | P2 | `/auth/2fa`, mọi kích thước | Ô OTP trống hiện chữ thô `&bull;` (entity HTML trong chuỗi JS); M: chú thích cuối dưới bottom nav | `'•'`; `pb-28` dưới `md` |
| F15 | G6 | P2 | `/intro/blueprint`, `/intro/minimal`, M | Dock chọn giai đoạn của cảnh 3D nằm dưới `BottomNavBar` | Ẩn `BottomNavBar` ở `/intro/*` như studio toàn màn hình |
| F16 | Kiểm thử | — | — | Mỗi lần khách tải trang gọi `/auth/me` (401) rồi `/auth/refresh` (401); hơn 10 lần / phút / IP thì refresh trả **429** (`AUTH_THROTTLE`). Client coi mọi refresh thất bại là hết phiên, nên người dùng đã đăng nhập sau cùng một IP (NAT văn phòng, mạng di động) có thể bị đăng xuất nhầm | Sửa sau S9 (cùng ngày): `/auth/refresh` giới hạn theo phiên (hash cookie `wf_refresh`, 30 / phút), không cookie 300 / phút / IP (`ThrottlePerSession`); client chờ `Retry-After` (≤ 10 giây) rồi thử lại một lần, chỉ refresh `401` mới là hết phiên, `429` / `5xx` / mất mạng báo lỗi mà không đăng xuất. Quét không còn chấp nhận 429 của khách |
| F17 | G5 | P1 | `/unbox/<mã>`, `/p/<slug>` của khách, mạng chậm | Mỗi lần tải trang, khách nhận `/auth/me` 401 → refresh 401 → sự kiện hết phiên, và `AuthProvider` xoá mọi query không thuộc `templates`. Xoá query còn huỷ request đang chạy, nên khi `/public/unboxing` về sau refresh, trang mở quà kẹt "Đang chuẩn bị hộp quà…" mãi (tái hiện 4/4 khi giữ response 1.5 giây; đây là ô `g5-unbox-*` thỉnh thoảng trượt khi quét) | Khách vẫn là khách thì chỉ đặt `me = null`, không xoá cache; chỉ xoá khi một người đã đăng nhập hết phiên |


## 4. Chuyển phiên sau

**G7 Studio (mốc ban đầu, Agent C sửa ở S6 / S7; quét `--group=G7`, kích thước M, X+):**

| # | Màn / kích thước | Lỗi | Phiên |
|---|---|---|---|
| L1 | `/editor/studio`, M, X+ | Gọi `GET /api/projects/undefined` → 400 (studio mở không có id) | S6 (`/editor/new`, chuyển hướng) |
| L2 | `/editor/step-1`, M, X+ | 4 ảnh mẫu là URL `lh3` đã chết | S6 |
| L3 | `/editor/step-4`, M | Tràn ngang 248 px: thanh bước "1. Mẫu Hộp … 4" và chip "100/100 PASS BOBST" không xuống dòng | S6 |
| L4 | `/editor`, `/editor/step-3`, M | Panel `fixed left-6 top-1/2` che nhãn dieline ("Dust Flap B2", "CREASE 90°", mã vạch) | S6 |
| L5 | `/editor/step-2`, `/editor/step-3`, `/editor/export`, M | Nút cuối trang ("Chọn Dáng Khác", "Tiến Hành Đặt In Gia Công") dưới `BottomNavBar` (bottom nav hiện ở `step-*` và `export`) | S6 |
| L6 | `/editor/[id]`, `/editor/studio`, X+ | Chip mẫu hoa văn "Giáng Sinh & Thông…", "Lưới Vàng Art Deco" bị cắt không có `title` | S7 (hoa văn AI) |

`editor/step-2`, `editor/step-4`, `editor/export` chỉ được đổi đường dẫn ảnh `mascot-hero.png` (F13), không đổi bố cục.

**P3 còn lại:**

| # | Màn / kích thước | Ghi chú |
|---|---|---|
| P3-1 | `/intro/blueprint`, `/intro/minimal`, M (giả lập Chrome) | Trang cuộn ngang 7 px. Không phần tử nào vượt màn hình; `visualViewport.scale` = 1.016 và layout viewport rộng 382 px ngay từ lần tải đầu (tải lại trong cùng tab có khi hết). Đã thử cho canvas Three.js giữ kích thước CSS (`setSize(…, false)`): không đổi, nên bỏ. Cần thử trên điện thoại thật trước khi sửa |
| P3-2 | Thanh tab ở `/admin/accounts` (M), `/dashboard/*` (M, T), trạng thái dự án (M) | Thanh tab cuộn ngang được nhưng không có dấu hiệu còn tab bên phải (bị cắt ngang chữ) |
| P3-3 | Dock `/pricing`, M | Nhãn "2D / 3D Proof", "Caliper Specs" xuống dòng trong dock |
| P3-4 | `/dashboard`, L (1024 px) | Lưới 4 cột: tên dự án và loại hộp bị cắt "…" (có `title`) |
| P3-5 | Màn admin tĩnh, L (1024–1279 px) | Sidebar hiện từ `lg` nên cột nội dung còn ~730 px: thẻ hẹp, chữ xuống nhiều dòng (không tràn). Có thể cho sidebar thành drawer tới `xl` |
| P3-6 | Thanh tab dashboard, X (1280 px) | Sau khi bỏ avatar lặp (F9) vẫn thiếu khoảng một tab ở đúng 1280 px (tab "Cài Đặt" cuộn ra); đủ chỗ từ 1440 px |


## 5. Giới hạn

- Trạng thái `/verify-email` **thành công** không chụp được bằng quét: token dùng một lần (đã kiểm bằng tay ở S4).
- Toast, lỗi upload (413, 403 hạn mức, `FILE_NOT_OWNED`) chưa dựng tình huống trong quét; toast đã kiểm ở 576 px (S3).
- Giả lập mobile của Chrome headless: không có thanh địa chỉ co giãn, bàn phím ảo, Safari iOS. Checklist mục 7 (bàn
  phím che ô nhập) chưa kiểm được; vùng bấm < 44 px chỉ được đếm (`small` trong `report.json`).
- Kiểm tra `offscreen` / `covered` dựa trên hình học và `elementFromPoint`: không bắt được chữ quá nhỏ, tương phản kém
  hay bố cục "xấu nhưng không tràn" (vd. thẻ quá to ở W). Những lỗi đó đến từ việc xem ảnh (§2).
- Ảnh có nút "N" của Next dev ở góc trái dưới: chỉ có ở `next dev`, không phải lỗi.
- Chạy 4 tiến trình song song trên `next dev` làm trang chậm; một số ô trượt vì backend trả 500 trong lúc khởi động lại
  (proxy `ECONNREFUSED`) đã được chạy lại riêng.


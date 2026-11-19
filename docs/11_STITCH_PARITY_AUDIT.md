# 11 — Stitch ↔ Frontend: Audit, kiến trúc và kế hoạch

> Cập nhật: 2026-10-08 · Branch `test-model` · Stitch project `15490463943889996451`
> Lượt 1: audit. Lượt 2: chuẩn hoá kiến trúc và sửa toàn bộ lỗi sửa được trong code.
> Đối chiếu lại: 2026-11-19 trên `develop` (fb720a9), đợt đồng bộ docs sau audit. Mọi tỷ lệ lệch trong file là **số đo tại
> commit cũ**, chưa đo lại.

## 0. Hiện trạng ngày 2026-11-19

Từ 2026-10-13 (commit `d6b622e`, `ea807d8`, `0f0f0a5`, `97665e9` trên `develop`), phần lớn màn Stitch đã được viết lại
bằng tay. `fe/stitch/screens.json` hiện có 42 screen:

| Status | Số screen | Route |
|---|---|---|
| `converted` | 3 | `/intro/blueprint`, `/intro/minimal`, `/editor` |
| `manual` | 35 | Trang chủ, dashboard, admin, thanh toán, đăng nhập, 404, `/pricing`, `/team`, `/support`… |
| `approximation` | 4 | `/editor/step-1` → `/editor/step-4` |
| `wired` | 0 | — |

Hệ quả:

- `/editor`, `/editor/new` và `/editor/step-1..4` chuyển hướng sang `/editor/demo` (`fe/next.config.mjs`), nên
  `stitch:parity` bỏ qua `/editor` và thực tế chỉ còn đo **2 màn** `/intro/*`.
- `fe/src/assets/styles/stitch/screens/` chỉ còn CSS của 3 màn `converted`; `features/stitch/behaviors/` chỉ còn
  behavior của 3 màn đó.
- Quy trình sync (§3) và cách bảo vệ file sửa tay vẫn dùng được, vì generator vẫn hỗ trợ `converted` và `wired`.
  [README FE](../fe/README.md) trỏ về file này cho nguồn Stitch và lệnh `stitch:parity`.
- Muốn công bố số parity mới: chạy `npm --workspace=fe run stitch:parity` (cần dev server ở `:3000`) và ghi viewport,
  ngày, commit. Lần đồng bộ này không chạy lại.

## 1. Trạng thái sau lượt 2 (2026-10-08, đo tại commit cũ)

| Hạng mục | Trước | Sau lượt 2 |
|---|---|---|
| Trang convert từ Stitch, lệch < 1% pixel ở 1280px | 0/29 | **28/29** (1 trang còn lại là cảnh 3D xoay liên tục, xem §4) |
| Mức lệch phổ biến | 1% – 40% | 0.00% – 0.54% |
| Script / tương tác của Stitch | mất hết | chạy đủ: 29 screen, 133 handler inline |
| Trang Stitch là Server Component | 0 (toàn bộ `'use client'`) | 29, JS mỗi trang ~2.5 kB |
| Ảnh hotlink Google | 55 URL tạm | 57 ảnh tải về `public/stitch/img/` (9 URL đã chết từ phía Stitch) |
| `tsc --noEmit`, `next build` | pass | pass (44 route, Stitch pages prerender static) |

Đo bằng `npm run stitch:parity` (xem §3.5). Ảnh so sánh: `fe/.visual-parity/<slug>.png` (Stitch | app | diff).

> **Mốc mới (2026-10-11, S9):** từ khi các màn được sửa tay header / sidebar (`e07d23b`, `e509d8f`) và header chung đổi
> font (S5), ngưỡng 1% không còn áp dụng: số đo từng màn trước / sau S9 ở [`13`](13_UI_VIEWPORT_AUDIT.md) §2.3. So sánh
> với cột "Sau S9" của bảng đó.
>
> **Đo lại ở S8 (2026-10-12, sau khi nối xong FE ↔ BE):** 20 / 22 màn `converted` lệch đúng như cột "Sau S9" (chênh
> ≤ 0,1 điểm %); `/intro/blueprint` (cảnh 3D tự xoay) và `/` (trang chủ, mascot động) dao động như mọi lần đo.
> `/editor` và `/editor/export` chuyển hướng sang `/editor/new` từ S6 của đợt nối FE–BE (`next.config.mjs`), nên
> `stitch:parity` bỏ qua mọi route có redirect thay vì so trang đích với bản Stitch. (Nay `/editor` chuyển sang
> `/editor/demo`, `/editor/export` sang `/dashboard/orders`, xem §0.)
>
> Các số trong khối này và trong §4 là số đo tại commit cũ (2026-10-08 đến 2026-10-12).

## 2. Đánh giá kiến trúc frontend (trước lượt 2)

| # | Vấn đề | Mức | Xử lý |
|---|---|---|---|
| A1 | 29 trang là output thô của một converter bỏ `<style>`, `<script>`, `on*`; không ai sửa tay sau đó | Cao | Thay bằng pipeline generator có nguồn chuẩn (§3) |
| A2 | Mọi trang Stitch là `'use client'` dù chỉ là markup tĩnh | Trung bình | Page = Server Component + một client island `StitchRuntime` |
| A3 | Một bộ token Tailwind global cho 30 bộ token Stitch khác nhau (`primary` = 3 giá trị khác nhau) | Cao | Token → CSS variable, scope theo `[data-stitch]` (§3.2) |
| A4 | CSS Material Symbols nạp sau Tailwind, đè cỡ icon và `hidden` | Cao | Tự host font, khai báo trước Tailwind (§3.3) |
| A5 | `tsconfig.json` không có `target` (mặc định ES3/ES5) | Thấp | Đặt `ES2017` |
| A6 | Tailwind `darkMode` mặc định `media`, Stitch dùng `class` | Trung bình | `darkMode: "class"` (OS tối không còn bật biến thể `dark:` của Stitch) |
| A7 | `BottomNavBar` gắn cho mọi route, đè dock của Stitch trên mobile | Trung bình | Ẩn trên route Stitch (`STITCH_ROUTES` sinh tự động) |
| A8 | `JetBrains_Mono` chỉ có subset `latin` | Thấp | Thêm `vietnamese` |
| A9 | `fe/scripts/` có 22 script debug một lần, hard-code đường dẫn `.gemini/...` không còn tồn tại | Thấp | Đề xuất xoá (chưa xoá, xem §5) |
| A10 | Route rỗng `src/app/admin/[section]/` | Thấp | Đã xoá |
| A11 | Không có `error.tsx` / `loading.tsx`, không có ESLint config, không có test FE; `docs/09` mô tả `hooks/`, `stores/`, `(auth)` route group, `dashboard/layout.tsx` nhưng code chưa có | Trung bình | Còn lại (§5) |
| A12 | Sidebar admin, navbar dashboard lặp lại trong từng trang | Thấp | Cố ý giữ: mỗi screen Stitch có biến thể riêng. Gom thành layout chung chỉ khi thiết kế Stitch được thống nhất trước (§5) |

## 3. Kiến trúc mới cho màn hình Stitch

```
fe/
├── stitch/                         Nguồn chuẩn (commit vào git)
│   ├── source/<screenId>.html      HTML export của 30 screen
│   ├── screens.json                manifest: id, slug, route, status, viewport
│   ├── overrides.json              sửa chữ lỗi, bảng link → route, vá bug script của Stitch
│   └── assets.json                 URL ảnh gốc → file trong public/stitch/img
├── scripts/stitch/
│   ├── sync.mjs                    npm run stitch:sync   (generator)
│   ├── visual-parity.mjs           npm run stitch:parity (so ảnh)
│   └── lib/                        source, assets, fonts, tokens, css, jsx, behavior, page
├── public/stitch/{img,fonts}/      ảnh và font tự host
└── src/
    ├── views/<route>/index.tsx                 GENERATED — Server Component chứa markup của screen
    ├── app/<route>/page.tsx                    GENERATED — metadata của route + import view ở trên
    ├── assets/styles/stitch/
    │   ├── index.css                           GENERATED — import trước Tailwind
    │   ├── fonts.css                           GENERATED — @font-face + .material-symbols-outlined
    │   ├── base.css                            viết tay — reset cho root [data-stitch]
    │   └── screens/<slug>.css                  GENERATED — biến token + <style> đã scope
    └── features/stitch/
        ├── runtime/                            viết tay, có type
        │   ├── StitchRuntime.tsx               client island, nạp behavior theo screen
        │   ├── mountStitchBehavior.ts          gắn handler inline, chạy lifecycle
        │   ├── createStitchScope.ts            window/document/timer có theo dõi để dọn dẹp
        │   └── threeCompat.ts                  three r125/r128 → three 0.168
        ├── behaviors/<slug>.ts                 GENERATED — script + handler của screen
        ├── behaviors/registry.generated.ts     GENERATED — lazy import theo screen
        ├── theme.generated.json                GENERATED — hợp token của mọi screen
        ├── tailwindStitch.ts                   viết tay — nối token vào tailwind.config.ts
        └── routes.generated.ts                 GENERATED — danh sách route Stitch
```

Quy tắc: không sửa file có banner `AUTO-GENERATED`. Muốn đổi, sửa `stitch/source`, `stitch/overrides.json` hoặc `scripts/stitch`, rồi chạy `npm run stitch:sync`.

`status` trong `screens.json` (cập nhật 2026-10-11):

| Status | Generator sinh | Dùng khi |
|---|---|---|
| `converted` | view, page, CSS, token, behavior | Màn hình tĩnh, giữ đúng bản Stitch |
| `wired` | CSS, token, behavior; **không** ghi view / page | View viết tay bằng React và nối API (đợt nối FE–BE tháng 10/2026), vẫn dùng CSS và token của screen. `stitch:parity` bỏ qua, trừ khi có `--include-wired`. Ngày 2026-11-19 không còn screen nào ở status này |
| `approximation`, `manual` | không sinh gì | Trang viết tay không có HTML Stitch; `manual` còn hiện BottomNavBar |

**Component của app bên trong màn `wired`**: CSS của một screen đặt `initial` cho mọi token screen đó không định nghĩa
(vd. `--st-c-brand-forest` ở các màn admin), nên class như `bg-brand-forest`, `font-serif` mất màu / font bên trong
`[data-stitch]`. Bọc component đó bằng phần tử có thuộc tính `data-app-tokens` để lấy lại giá trị `:root` của app
(`features/stitch/tailwindStitch.ts`). `ErrorState`, `EmptyState`, `PageLoader` đã mang sẵn thuộc tính này.

**Chống ghi đè sửa tay**: `stitch/generated.lock.json` lưu hash mọi file generator đã ghi. Lần sync sau chỉ thay / xoá
file còn đúng nội dung đó; file đã sửa tay (25 file lúc tạo lock: view, CSS, behavior của các màn được chỉnh header,
sidebar, link) được giữ nguyên và liệt kê cuối output. `npm run stitch:sync -- --force` ghi đè cả những file này.

### 3.1. Trang (`src/views/**/index.tsx` + `src/app/**/page.tsx`)
- `<body>` của Stitch thành `<div data-stitch="<slug>">` mang nguyên class và style của body.
- Giữ khoảng trắng giữa các phần tử inline (JSX mặc định sẽ nuốt), sửa hoa/thường tag SVG filter, thuộc tính số (`tabIndex={0}`), form state không kiểm soát (`defaultValue`, `defaultChecked`).
- `on*="..."` → `data-st-on="click:3"`; code chuyển vào behavior module.
- `<a href="#">` có nhãn trong `overrides.links` → `next/link` tới route thật (76 nhãn). Các link còn `href="#"` (khoảng 17, vd. "Xem Tất Cả", "Quên mật khẩu?", "Điều khoản") chưa có trang đích.
- `src/app/<route>/page.tsx` chỉ có `export const metadata` lấy từ tiêu đề screen và re-export view.

### 3.2. Token theo screen
Mỗi token mà một screen Stitch định nghĩa trở thành biến CSS (`--st-c-primary`, `--st-r-lg`, `--st-ff-sans`…):
- `:root` giữ giá trị của app (trang ngoài Stitch không đổi màu).
- `[data-stitch="<slug>"]` đặt giá trị của screen đó. Token screen không định nghĩa được đặt `initial`, nên class tương ứng không có tác dụng, đúng như trong Stitch.
- Plugin `@tailwindcss/forms` chỉ áp trong 20 screen đã nạp nó.

### 3.3. CSS
- `<style>` của từng screen được scope bằng `:where([data-stitch=…])`, không đổi specificity, và đứng trước Tailwind như trong Stitch.
- `body`/`html` trong CSS gốc ánh xạ sang root/`:root:has(…)`; nền body ánh xạ sang `body:has(…)` để phủ cả khung nhìn.
- `@layer base` (CSS layer gốc trong Stitch) đổi tên thành `stitch-base` để Tailwind không hiểu nhầm.
- Font Google (Jakarta, Playfair, JetBrains Mono, Inter, Material Symbols) tự host ở `public/stitch/fonts`.

### 3.4. Behavior
- Script được chuyển bằng Babel thành module: chạy trong `window`/`document` có theo dõi; mọi listener, timer, `requestAnimationFrame`, WebGL renderer được dọn khi rời trang.
- Mỗi `<script>` chạy trong `try/catch` riêng như trên trình duyệt; khai báo top-level vẫn dùng chung giữa các script và handler.
- Chạy sau một tick nên React Strict Mode (dev) không chạy script hai lần.
- Cảnh Three.js của `/intro/*` chạy trên `three` npm qua lớp tương thích: tắt color management, ánh xạ `outputEncoding`, cường độ đèn ×π, `decay = 0`, alias `*BufferGeometry`.

### 3.5. Kiểm tra hồi quy
`npm run stitch:parity [-- <từ khoá slug>] [--threshold=1]` (cần dev server). Chụp Chrome headless cả HTML Stitch lẫn route app ở viewport của screen, đếm pixel lệch bằng `pixelmatch`, thoát mã 1 nếu vượt ngưỡng.

## 4. Kết quả đo (sau lượt 2, đo tại commit cũ)

| Route | Lệch | Ghi chú |
|---|---|---|
| `/intro/blueprint` | 6–9% | Cảnh 3D tự xoay theo từng frame (`targetRotY += 0.0012`), nên góc tại thời điểm chụp khác nhau. Bố cục và màu đã khớp. |
| `/intro/minimal` | 0.25% | |
| `/checkout/step-1` | 0.44% | |
| `/editor/inspect/fefco` | 0.54% | |
| `/admin` | 0.34% | |
| 24 route còn lại | 0.00% – 0.27% | |
| `/` (trang chủ, ghép tay từ screen `e299`) | 3.39% | Khác biệt là chủ ý: mascot `GoiMascot` thay ảnh. Không do generator quản lý. |

## 5. Việc còn lại

Đối chiếu từng mục với manifest và route ngày 2026-11-19. Mục "bỏ do đổi thiết kế" là việc không còn cần làm, vì màn
liên quan đã chuyển sang `manual` hoặc đã có route khác (§0).

### Cần bạn làm / quyết định
- [x] **12 trang "companion"** (`/editor/step-1..4`, `/checkout/step-2`, `/auth/2fa`, `/dashboard/orders`, `/dashboard/profile`, `/admin/appraisal`, `/admin/gpu-cluster`, `/admin/ledger`, `/admin/system-config`) vẫn là JSX viết tay theo prompt, không phải bản Stitch. **Bỏ do đổi thiết kế:** 8 màn nay là `manual` (viết tay có chủ đích), `/editor/step-1..4` là `approximation` và chuyển hướng sang `/editor/demo`. Không còn cần export HTML Stitch cho các màn này.
- [x] Trang chủ `/` dùng ảnh nền hero `lh3.googleusercontent.com/...AEtjO1X2Cm…` nay trả HTTP 400 (ảnh hỏng). **Bỏ do đổi thiết kế:** trang chủ là `manual`, không dùng ảnh đó. URL `lh3` chỉ còn ở `fe/src/views/editor/step-1/index.tsx`, route này chuyển hướng nên không ai mở được.
- [x] 8 ảnh khác trong source Stitch trả 403 (cũng hỏng trên Stitch). **Bỏ do đổi thiết kế:** các màn chứa ảnh đó đã chuyển sang `manual` hoặc đã thay ảnh (F7, F8, F13 ở [13](13_UI_VIEWPORT_AUDIT.md) §3). Chưa kiểm lại ảnh trong HTML nguồn của 3 màn `converted`.
- [x] Xoá 22 script debug cũ trong `fe/scripts/*.js`. Có mã trên `develop`: `fe/scripts/` không còn file `.js` nào ở thư mục gốc.
- [x] Chốt màu brand: Stitch dùng Cobalt `#004ac6` cho CTA, token app (`appTheme`) dùng Forest `#122e20`. **Bỏ do đổi thiết kế:** các màn viết tay dùng token của design system; `fe/src` không còn `#004ac6`.

### Kỹ thuật, có thể làm tiếp
- [ ] Giảm font Material Symbols (4 MB, đủ mọi trục) bằng `icon_names=` chỉ gồm icon đang dùng. Còn mở: file 4 MB vẫn ở `fe/public/stitch/fonts/`, `fonts.css` vẫn khai báo, 7 file trong `fe/src` còn dùng class `material-symbols-outlined`.
- [ ] Gộp font: Stitch dùng tên family Google, phần app cũ dùng `next/font` (hash). Cùng họ font đang tải hai lần. Chưa kiểm lại ngày 2026-11-19.
- [x] `/unbox/[slug]`: hiện dữ liệu thật của API (tên người nhận, lời chúc, hiệu ứng); backend tắt thì hiện lỗi (S5, kiểm lại ở S8).
- [ ] Thêm `loading.tsx` cho các nhóm route (`app/error.tsx`, `ErrorState`, `PageLoader` đã có từ S3); thêm ESLint config (`next lint` hiện chưa cấu hình); thêm job `fe` vào CI chạy `tsc`, `next build`, `stitch:parity`. Còn mở: chỉ có `loading.tsx` cho `/editor/[id]` và `/templates`; chưa có ESLint config cho FE, script `lint` vẫn là `next lint`; CI chỉ chạy `tokens:check` cho FE. Phần ESLint và CI theo dõi ở [28](28_VIEC_CON_TREO_SAU_AUDIT_BE.md) §1.
- [ ] Đồng bộ `docs/09` với code thực tế (route group `(auth)`, `dashboard/layout.tsx`, `hooks/`, `stores/` đang chỉ có trên tài liệu). Chuyển cho [09](09_PROJECT_DIRECTORY_AND_FILE_ARCHITECTURE.md), file đó đang được đồng bộ trong cùng đợt.
- [x] Nếu muốn layout chung (sidebar admin, navbar dashboard): thống nhất biến thể trên Stitch trước, rồi tách thành `layout.tsx`. Có mã trên `develop`: `app/(workspace)/layout.tsx` (`WorkspaceShell`, commit `c7d5d4f`) và `app/admin/layout.tsx` (`AdminShell`, commit `50152c0`) giữ header và sidebar khi chuyển trang.
- [x] Viết lại dần behavior generated sang React/Anime.js (theo AGENTS.md) khi một màn hình cần logic thật; khi đó chuyển screen sang `status: "manual"`. Có mã trên `develop`: chỉ còn behavior của 3 màn `converted`.

## 6. Lệnh

```bash
npm run stitch:sync -w fe        # sinh lại trang, CSS, behavior từ fe/stitch (giữ file đã sửa tay; -- --force để ghi đè)
npm run stitch:parity -w fe      # so ảnh với Stitch (cần dev server ở :3000); nay chỉ còn 2 màn /intro/* được đo
npm run build -w fe              # build production
```

# 11 — Stitch ↔ Frontend: Audit, kiến trúc và kế hoạch

> Cập nhật: 2026-10-08 · Branch `test-model` · Stitch project `15490463943889996451`
> Lượt 1: audit. Lượt 2: chuẩn hoá kiến trúc và sửa toàn bộ lỗi sửa được trong code.

## 1. Trạng thái hiện tại

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
> `/editor` và `/editor/export` chuyển hướng sang `/editor/new` từ S6 (`next.config.mjs`, docs/12 R3), nên
> `stitch:parity` bỏ qua mọi route có redirect thay vì so trang đích với bản Stitch.

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
| `wired` | CSS, token, behavior; **không** ghi view / page | View viết tay bằng React và nối API ([`12`](12_FE_BE_INTEGRATION_PLAN.md)), vẫn dùng CSS và token của screen. `stitch:parity` bỏ qua, trừ khi có `--include-wired` |
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

## 4. Kết quả đo (sau lượt 2)

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

### Cần bạn làm / quyết định
- [ ] **12 trang "companion"** (`/editor/step-1..4`, `/checkout/step-2`, `/auth/2fa`, `/dashboard/orders`, `/dashboard/profile`, `/admin/appraisal`, `/admin/gpu-cluster`, `/admin/ledger`, `/admin/system-config`) vẫn là JSX viết tay theo prompt, không phải bản Stitch. HTML của chúng chỉ tải được khi đăng nhập Google bằng tài khoản sở hữu project. Cách làm: mở từng screen trên Stitch → Export code → lưu vào `fe/stitch/source/<id>.html`, đổi `status` trong `screens.json` thành `converted`, chạy `npm run stitch:sync` và `npm run stitch:parity`.
- [ ] Trang chủ `/` dùng ảnh nền hero `lh3.googleusercontent.com/...AEtjO1X2Cm…` nay trả HTTP 400 (ảnh hỏng). Cần export lại ảnh từ Stitch.
- [ ] 8 ảnh khác trong source Stitch trả 403 (cũng hỏng trên Stitch). Export lại nếu cần.
- [ ] Xoá 22 script debug cũ trong `fe/scripts/*.js` (đã có `scripts/stitch` thay thế; các file này chưa commit nên xoá là mất hẳn).
- [ ] Chốt màu brand: Stitch dùng Cobalt `#004ac6` cho CTA, token app (`appTheme`) dùng Forest `#122e20`. Hiện mỗi bên giữ màu của mình; nếu muốn một màu chung thì sửa ở Stitch rồi sync lại.

### Kỹ thuật, có thể làm tiếp
- [ ] Giảm font Material Symbols (4 MB, đủ mọi trục) bằng `icon_names=` chỉ gồm icon đang dùng.
- [ ] Gộp font: Stitch dùng tên family Google, phần app cũ dùng `next/font` (hash). Cùng họ font đang tải hai lần.
- [x] `/unbox/[slug]`: hiện dữ liệu thật của API (tên người nhận, lời chúc, hiệu ứng); backend tắt thì hiện lỗi (S5, kiểm lại ở S8).
- [ ] Thêm `loading.tsx` cho các nhóm route (`app/error.tsx`, `ErrorState`, `PageLoader` đã có từ S3); thêm ESLint config (`next lint` hiện chưa cấu hình); thêm job `fe` vào CI chạy `tsc`, `next build`, `stitch:parity`.
- [ ] Đồng bộ `docs/09` với code thực tế (route group `(auth)`, `dashboard/layout.tsx`, `hooks/`, `stores/` đang chỉ có trên tài liệu).
- [ ] Nếu muốn layout chung (sidebar admin, navbar dashboard): thống nhất biến thể trên Stitch trước, rồi tách thành `layout.tsx`; làm trước sẽ phá parity từng màn.
- [ ] Viết lại dần behavior generated sang React/Anime.js (theo AGENTS.md) khi một màn hình cần logic thật; khi đó chuyển screen sang `status: "manual"` để generator không ghi đè.

## 6. Lệnh

```bash
npm run stitch:sync -w fe        # sinh lại trang, CSS, behavior từ fe/stitch (giữ file đã sửa tay; -- --force để ghi đè)
npm run stitch:parity -w fe      # so ảnh với Stitch (cần dev server ở :3000)
npm run build -w fe              # build production
```

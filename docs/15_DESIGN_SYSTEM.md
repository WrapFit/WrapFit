# 15 — Design System WrapFit

> Cập nhật: 2026-10-15 · Token v1.0.0 · Catalog sống: [`/design-system`](../fe/src/views/design-system/index.tsx)
> Nguồn token duy nhất: [`fe/src/assets/styles/tokens.ts`](../fe/src/assets/styles/tokens.ts) · Thành phần: [`fe/src/components/ui/`](../fe/src/components/ui)

## 1. Định hướng

- **Trang giới thiệu** theo **pack.ly**: mực slate `fg`, nền `canvas`, nút chính lime chữ xanh đậm, thẻ trắng bo 32 px (48 px từ `lg`) có viền mảnh, tiêu đề đậm Be Vietnam Pro.
- **Thư viện mẫu, workspace, admin** theo **Pacdora**: ô xám `library-tile`, viền đen mảnh `library-ink`, bóng lệch `shadow-hard-sm` khi hover, nút `rounded-control`.
- **Màu FPT** (cam, xanh dương, xanh lá) dùng cho logo và điểm nhấn trang trí, không làm nền nút có chữ trắng.
- **Mục tiêu tiếp cận: WCAG 2.2 AA** cho mọi trang và mọi component chung.

## 2. Token — ba tầng

| Tầng | Ở đâu | Ví dụ | Ai dùng |
|---|---|---|---|
| Primitive | `fe/tailwind.config.ts` | `landing-ink`, `library-tile`, `paper-kraft`, `fpt-orange`, `dieline-cut` | Token ngữ nghĩa, minh hoạ, artwork |
| Ngữ nghĩa | `tokens.ts` → biến CSS `--ds-*` → Tailwind | `text-fg`, `bg-action`, `border-line-strong`, `text-danger-fg` | Component |
| Component | `components/ui/*.tsx` | `BUTTON_VARIANTS.primary`, `CARD_VARIANTS.panel`, `TONE_SOFT` | Trang |

**Quy tắc đặt tên**: `nhóm-vai trò-biến thể` (`fg-muted`, `success-bg`, `action-hover`, `card-lg`, `section-lg`). Tên mô tả mục đích, không mô tả màu hay pixel.

**Quản trị token**

- Giá trị mới vào `tokens.ts` (ngữ nghĩa) hoặc `tailwind.config.ts` (primitive), kèm dòng `use` và nếu cần `avoid`.
- Mỗi thay đổi giá trị: tăng `TOKENS_VERSION` và thêm mục vào `TOKEN_CHANGELOG` (trang `/design-system` hiển thị).
- Trong className, hex, `rounded-[…]`, `text-[Npx]`, `p-[…]` chỉ dùng khi có lý do (artwork, minh hoạ, file Stitch tự sinh) và ghi chú ngay cạnh. `npm run tokens:check` (trong `fe/`) liệt kê các chỗ còn lại; số lượng chỉ được giảm.
- File Stitch tự sinh (`views/**` có dòng `AUTO-GENERATED`) và các route đã chuyển hướng (`/editor`, `/editor/step-*`) không sửa tay.

### 2.1 Màu ngữ nghĩa

| Token | Giá trị | Dùng cho | Tương phản |
|---|---|---|---|
| `fg` | #1D293D | Chữ chính, icon | 14.6:1 trên trắng |
| `fg-muted` | #53647D | Chữ phụ, mô tả | 6.0:1 trắng, 5.5:1 canvas |
| `fg-inverse` | #FFFFFF | Chữ trên nền tối | — |
| `canvas` | #F1F5F9 | Nền trang marketing | — |
| `surface-raised` | #FFFFFF | Thẻ, panel, dialog | — |
| `surface-sunken` | #E9EFF5 | Ô xám, skeleton | — |
| `line` | #CAD5E2 | Viền trang trí | (không dùng làm viền input) |
| `line-strong` | #7C8BA1 | Viền input, checkbox, toggle | 3.5:1 |
| `action` / `action-fg` | #98E665 / #152B07 | Nút chính | 10:1 |
| `action-hover` / `action-pressed` | #AFEC88 / #86D652 | Trạng thái nút chính | ≥ 8.5:1 |
| `focus` | #2563EB | Vòng focus | 5.2:1 |
| `success` `-fg` `-bg` | #458C17 / #2D5C0F / #EAFAE0 | Thành công | 7.3:1 |
| `warning` `-fg` `-bg` | #D97706 / #92400E / #FEF3C7 | Cảnh báo | 6.4:1 |
| `danger` `-fg` `-bg` | #D92D20 / #B42318 / #FEE4E2 | Lỗi, xoá | 5.5:1 (trắng trên danger 4.8:1) |
| `info` `-fg` `-bg` | #2563EB / #1E4FB8 / #E8F0FE | Thông tin | 6.4:1 |
| `fpt-orange-ink` (primitive) | #B93F0A | Chữ cam trên nền sáng | 5.6:1 |

**Trạng thái tương tác**: default → hover (`action-hover`, `surface-sunken`) → pressed (`action-pressed`, `scale(0.98)`) → focus (vòng `focus` 3 px) → disabled (50 % opacity, `not-allowed`) → selected (`fg` nền, chữ `fg-inverse`).

**Chế độ tối**: chưa làm. Vì mọi màu ngữ nghĩa là biến CSS `--ds-*`, thêm theme tối chỉ cần định nghĩa lại biến dưới `[data-theme="dark"]`.

**Mù màu**: không truyền nghĩa chỉ bằng màu. Badge có chấm + chữ, Alert có icon riêng cho từng loại, lớp dieline khác nhau cả kiểu nét (liền / gạch 4-4 / chấm).

### 2.2 Chữ

| Vai trò | Font | Biến |
|---|---|---|
| Tiêu đề | Be Vietnam Pro 400–700 | `font-landing-heading` |
| Nội dung, control | Inter | `font-landing-body` |
| Số đo mm | JetBrains Mono 400–700 | `font-mono` |
| (cũ) root, studio cũ | Playfair Display, Plus Jakarta Sans | `font-serif`, `font-sans` |
| Chữ in trên hộp | 5 font trong `assets/fonts/print` | `PRINT_FONT_VARIABLES` |

Mọi font nạp qua `next/font`, subset `vietnamese`, `display: swap`; font in không preload.

Thang tỉ lệ ~1.25: `display-xl` 40→60 · `display` 32→48 · `heading-lg` 30→36 (co giãn bằng `clamp`) · `heading-md` 24 · `heading-sm` 20 · `title` 18 · `body-lg` 18 · `body` 16 · `body-sm` 14 · `label` 14 · `label-sm` 12 · `caption` 12 · `overline` 12 · `cad-dimension` 12 · `cad-spec-micro` 11. Line-height và letter-spacing gắn theo từng style (display 1.08–1.1, heading 1.2–1.3, body 1.55–1.6).

**Cỡ tối thiểu**: 12 px cho chữ đọc, 11 px cho nhãn kỹ thuật mono. Chữ nhỏ hơn chỉ được phép trong artwork (sticker, hộp thu nhỏ). Kiểm tra trên điện thoại thật và ở zoom 200 %.

### 2.3 Khoảng cách, lưới, breakpoint

- Thang gốc: 4 px của Tailwind (4, 8, 12, 16, 24, 32, 48, 64, 96).
- Trong component: `h-control-sm|control|control-lg` (36/40/44), `gap-stack-xs|sm|stack|lg` (4/8/16/24), `p-card-sm|card|card-lg` (20/24/32).
- Giữa khối trang: `py-section` 40 → `lg:py-section-lg` 56, dải CTA/hero `section-xl` 96.
- Lưới: < md 4 cột (gutter 16, lề 16) · md 8 cột (24/24) · lg+ 12 cột (24/32), `Container` tối đa 1280 px (1536 px từ `2xl`).
- Breakpoint: `sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536`; trong script dùng `mediaUp("md")` từ `tokens.ts`.
- Mật độ: bảng có `density="compact"` (hàng 8 px) cho trang admin.
- Bo góc: `rounded-control` 12 · `rounded-panel` 16 · `rounded-sheet` 28 · `rounded-card` 32 · `rounded-card-lg` 48.

## 3. Thành phần

Import từ `@/components/ui`. Mỗi thành phần có ví dụ chạy được ở `/design-system`.

| Thành phần | File | Ghi chú chính |
|---|---|---|
| Button, ButtonLink, `buttonClass()` | `button.tsx` | primary (lime), secondary, outline, dark, ghost, ghost-dark, white, danger, link; sm/md/lg/xl/icon; pill/rounded; loading, disabled |
| Card, CardHeader, `cardClass()` | `card.tsx` | soft, outline, panel, tile; padding sm/md/lg; interactive |
| Badge, CountBadge | `badge.tsx` | 5 tone; soft/solid/outline; chấm; số lệch góc |
| Field, Input, Textarea, Select | `field.tsx` | nhãn, hint, lỗi có icon, aria-describedby, icon đầu, đơn vị cuối |
| Checkbox, RadioGroup, Switch | `choice.tsx` | input gốc + vẽ lại; cả hàng bấm được; indeterminate; radio card |
| Tabs, TabList, Tab, TabPanel | `tabs.tsx` | WAI-ARIA tabs, ←/→ Home End; pill / segmented / underline |
| Accordion | `accordion.tsx` | single/multiple; disabled; heading + region |
| Tooltip | `tooltip.tsx` | hover + focus, Escape, 4 phía; thay `title=""` |
| Alert, Banner | `alert.tsx` | 5 tone; icon riêng; Banner chỉ đóng được với info/success, nhớ trên máy |
| Breadcrumb | `breadcrumb.tsx` | `aria-current`, chevron, gập cấp giữa thành “…” |
| ModalLayer, Dialog, Drawer | `dialog.tsx` | bẫy focus, Esc, nền, trả focus, khoá cuộn; bottom sheet trên mobile |
| DropdownMenu | `dropdown-menu.tsx` | icon, phím tắt, danger, disabled, nhóm, separator, submenu, tự lật |
| NumberStepper | `number-stepper.tsx` | − / +, gõ trực tiếp, ↑/↓ (Shift ×10), min/max, bước, 3 cỡ |
| Slider | `slider.tsx` | nhãn + giá trị, mốc, phần đã chọn tô màu |
| SearchBar | `search-bar.tsx` | combobox, gợi ý, tìm gần đây, nút Tìm, Escape |
| DatePicker | `date-picker.tsx` | T2 đầu tuần, DD/MM/YYYY, khoảng ngày, giờ, ngày bị khoá, Hôm nay |
| DataTable | `data-table.tsx` | sắp xếp `aria-sort`, dạng thẻ dưới md, compact |
| Skeleton, SkeletonText, FadeIn, Spinner, LoadingState | `feedback.tsx` | hiện loading sau 300 ms; mascot cho chờ lâu |
| Avatar | `avatar.tsx` | ảnh, chữ cái đầu, chấm trạng thái |
| Icon | `icon.tsx` | lucide-react, nhận tên Material cũ |
| Toast (`useToast`) | `components/common/Toast` | success/warning/error/info; dừng khi hover/focus |
| Carousel | `components/landing/Carousel.tsx` | nút, vuốt, thanh vị trí |

Các bộ cũ (`landing/ui`, `library/ui`, `site/SiteKit`, `workspace/ui`, `studioUi`, `StatusViews`) giữ tên export cũ nhưng đã dựng lại trên các primitive trên.

## 4. Tiếp cận — checklist khi thêm hoặc sửa component

- [ ] Tương phản chữ ≥ 4.5:1, chữ lớn / icon / viền control ≥ 3:1.
- [ ] Dùng được hoàn toàn bằng bàn phím; thứ tự Tab theo thứ tự đọc; vòng focus cobalt nhìn thấy.
- [ ] Vai trò, nhãn, trạng thái ARIA đúng mẫu WAI-ARIA Authoring Practices.
- [ ] Vùng chạm ≥ 44 × 44 px trên mobile.
- [ ] Không truyền nghĩa chỉ bằng màu.
- [ ] Zoom 200 % và cỡ chữ trình duyệt lớn không làm mất nội dung.
- [ ] Thử VoiceOver (Safari) và NVDA (Chrome) với luồng chính.
- [ ] `prefers-reduced-motion` tắt chuyển động không cần thiết.
- [ ] Thêm ví dụ vào `/design-system`.

Chú thích trong file thiết kế (Stitch/Figma) cho màn mới: nhãn ARIA của nút chỉ có icon, thứ tự đọc, nơi focus đến khi mở/đóng dialog.

## 5. Phiên bản

| Phiên bản | Ngày | Thay đổi |
|---|---|---|
| 1.0.0 | 2026-10-15 | Tầng token ngữ nghĩa, thang chữ, token khoảng cách/bo góc; nút chính đổi sang lime pack.ly; 20 primitive trong `components/ui`; trang `/design-system`; AGENTS.md §2 và skill `wrapfit-design-system` cập nhật theo code. |

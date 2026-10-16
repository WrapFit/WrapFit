# 15 — Design System WrapFit

> Cập nhật: 2026-10-15 · Token v1.1.0 · Catalog sống: [`/design-system`](../fe/src/views/design-system/index.tsx)
> Nguồn token duy nhất: [`fe/src/assets/styles/tokens.ts`](../fe/src/assets/styles/tokens.ts) · Thành phần: [`fe/src/components/ui/`](../fe/src/components/ui) · Bản xuất cho công cụ thiết kế: [`fe/design-tokens.json`](../fe/design-tokens.json)

## 1. Định hướng

- **Trang giới thiệu** (trang chủ, giới thiệu, bảng giá, liên hệ, chờ ra mắt, blog, pháp lý…): bố cục **pack.ly** (mực slate `fg`, nền `canvas`, thẻ trắng bo 32 px, tiêu đề đậm Be Vietnam Pro) với **màu chủ đạo cam FPT** #F26522, phối **xanh dương FPT** #005CA9 và **xanh lá FPT** #6DB33F: nút chính cam, tiêu đề hero chuyển màu xanh dương → cam → xanh lá, chip đang chọn nền cam nhạt.
- **Thư viện mẫu, workspace, admin, studio** theo **Pacdora**: ô xám, viền đen mảnh, bóng lệch `shadow-hard-sm` khi hover, nút chính cam như mọi trang.
- **Mục tiêu tiếp cận: WCAG 2.2 AA**. Ngoại lệ có chủ đích: nút cam chữ trắng (3.2:1) — xem §2.1.

## 2. Token — ba tầng

| Tầng | Ở đâu | Ví dụ | Ai dùng |
|---|---|---|---|
| Primitive | `tokens.ts` `PALETTE` (dải 50–950: neutral, green, orange, red, amber, blue → `wf-*`) và `tailwind.config.ts` (`landing-*`, `library-*`, `paper-*`, `brand-*`, `fpt-*`, `mist-*`, `dieline-*`) | `wf-neutral-800`, `fpt-orange`, `dieline-cut` | Token ngữ nghĩa, minh hoạ, artwork |
| Ngữ nghĩa | `tokens.ts` `SEMANTIC_COLORS` → biến CSS `--ds-*` (sáng + tối) → Tailwind | `text-fg`, `bg-action`, `border-line-strong`, `bg-accent`, `text-danger-fg` | Component |
| Component | `components/ui/*.tsx` | `BUTTON_VARIANTS.brand`, `CARD_VARIANTS.panel`, `TONE_SOFT` | Trang |

**Đặt tên**: `nhóm-vai trò-biến thể` (`fg-muted`, `success-bg`, `action-hover`, `card-lg`). Tên mô tả mục đích, không mô tả màu hay pixel. Ngoại lệ lịch sử: hàm `limeButton()` (trả về nút cam `brand`), giữ tên để không phá các import cũ.

### 2.0 Quản trị token

- Giá trị mới vào `tokens.ts` (ngữ nghĩa, dải màu) hoặc `tailwind.config.ts` (primitive), kèm `use` và nếu cần `avoid`. Mỗi thay đổi: tăng `TOKENS_VERSION`, thêm mục `TOKEN_CHANGELOG` (hiện trên `/design-system`), rồi `npm run tokens:export`.
- **`npm run tokens:check`** (trong `fe/`, chạy trong CI): không cho hex, `rounded-[…]`, `text-[Npx]` trong className, và kiểm tra `design-tokens.json` khớp code. Ngoại lệ phải ghi lý do:
  - cả file: comment `/* ds-artwork: <lý do> */` ở đầu file (minh hoạ, logo, sticker);
  - một dòng: `ds-allow: <lý do>` trên dòng đó hoặc dòng ngay trên.
  Hiện tại: 0 vi phạm; 59 giá trị được phép, nằm trong 5 file artwork và 3 dòng `ds-allow`.
- File Stitch tự sinh (`AUTO-GENERATED`), `features/stitch/` và các route đã chuyển hướng (`/editor`, `/editor/step-*`) không sửa tay, không kiểm.
- **Đồng bộ công cụ thiết kế**: `fe/design-tokens.json` theo chuẩn W3C Design Tokens (DTCG). Màu ngữ nghĩa là alias tới dải (`{color.palette.neutral.800}`), hai bộ `light` / `dark` tương ứng hai mode của Figma variables; Tokens Studio nhập trực tiếp. Chiều đồng bộ: code → thiết kế.

### 2.1 Màu

Bảng dưới là giá trị sáng / tối; tỉ lệ đo trên `surface-raised` cùng theme (trang `/design-system` tính lại trực tiếp).

| Token | Sáng / Tối | Dùng cho | Tương phản |
|---|---|---|---|
| `fg` | neutral 800 / 100 | Chữ chính, icon | 14.6 / 15.5 |
| `fg-muted` | neutral 600 / 400 | Chữ phụ | 6.0 / 6.5 |
| `fg-inverse` | trắng / neutral 950 | Chữ trên nền `fg` | 14.6 / 17.1 |
| `canvas` · `surface-raised` · `surface-sunken` | neutral 100 · trắng · 150 / 950 · 900 · 850 | Nền trang, thẻ, ô xám | — |
| `line` / `line-strong` | neutral 300 · 500 / 700 · 500 | Viền trang trí / viền input | — / 3.5 · 4.9 |
| `action` + `action-fg` | orange 500 + trắng (cả hai theme) | Nút chính của mọi trang | 3.2 — lựa chọn thương hiệu |
| `accent` + `accent-contrast` | orange 700 + trắng / orange 400 + 950 | Checkbox, radio, ngày được chọn | 5.6 / 6.2 |
| `accent-bg` + `accent-fg` | orange 50 + 700 / 950 + 200 | Hàng, thẻ đang chọn; chữ cam | 5.0 / 10.3 |
| `focus` | blue 600 / 400 | Vòng focus | 5.2 / 6.7 |
| `success` `warning` `danger` `info` (+ `-fg`, `-bg`, `-solid`) | xem `tokens.ts` | Trạng thái | chữ trên nền nhạt 5.5–12; chữ trắng trên `-solid` 4.8–7.9 |
| `fpt-orange` + trắng (`Button variant="brand"`) | #F26522 | **Nút chính trang giới thiệu** | **3.2** — lựa chọn thương hiệu |
| `fpt-orange-ink` | #B93F0A | Chữ cam trên nền sáng | 5.6 |

**Màu FPT**: cam là màu chủ đạo của trang giới thiệu; xanh dương và xanh lá đi kèm (chấm logo, tag, gradient tiêu đề, icon trên nền tối). **Chữ** cam/xanh lá trên nền sáng dùng `fpt-orange-ink` / `success-fg`, không dùng `fpt-orange` / `fpt-green` thuần (2.3–3.2:1).

**Nút cam chữ trắng (ngoại lệ)**: 3.2:1 chỉ đạt chuẩn cho chữ lớn (≥ 18.7 px đậm). Nút `brand` giữ chữ semibold và cao ≥ 40 px. Nếu cần đạt AA hoàn toàn: dùng nền `fpt-orange-ink` (#B93F0A, 5.6:1) hoặc chữ `fg` trên nền cam (4.7:1).

**Trạng thái tương tác**: default → hover (`action-hover`, `fpt-orange-dark`, `surface-sunken`) → pressed (`action-pressed`, `fpt-orange-ink`) → focus (vòng `focus` 3 px) → disabled (50 % opacity) → selected (`accent`, `bg-fg` + `fg-inverse`, chip cam nhạt).

**Chế độ tối**: mọi token ngữ nghĩa có giá trị tối, bật bằng `data-theme="dark"` trên bất kỳ phần tử nào (`data-theme="light"` giữ vùng con sáng, ví dụ canvas in). Component trong `components/ui` chỉ dùng token ngữ nghĩa nên tự đổi theme; xem công tắc “Xem ở chế độ tối” trên `/design-system` (axe không lỗi ở theme tối, trừ nút cam). Chưa bật cho toàn site: các trang còn dùng primitive `landing-*` / `library-*` (cố định màu sáng); muốn bật phải chuyển trang sang token ngữ nghĩa trước.

**Mù màu**: không truyền nghĩa chỉ bằng màu (badge có chấm + chữ, alert có icon riêng, lớp dieline khác kiểu nét: liền / gạch 4-4 / chấm 2-2 / chấm 3-3). `/design-system` có bộ mô phỏng protanopia, deuteranopia, tritanopia, mù màu hoàn toàn (ma trận Machado 2009) áp lên cả trang.

### 2.2 Chữ

| Vai trò | Font | Biến |
|---|---|---|
| Tiêu đề | Be Vietnam Pro 400–700 | `font-landing-heading` |
| Nội dung, control | Inter | `font-landing-body` |
| Số đo mm | Inter, chữ số đều (`tabular-nums`) | `font-mono` (trỏ về Inter) |
| (cũ) `font-serif`, `font-sans`, `font-headline-*`, `font-body-*` | trỏ về Be Vietnam Pro / Inter | — |
| Chữ in trên hộp | 5 font trong `assets/fonts/print` | `PRINT_FONT_VARIABLES` |

Mọi font nạp qua `next/font`, subset `vietnamese`, `display: swap`; font in không preload.

Thang ~1.25: `display-xl` 40→60 · `display` 32→48 · `heading-lg` 30→36 (`clamp`) · `heading-md` 24 · `heading-sm` 20 · `title` 18 · `body-lg` 18 · `body` 16 · `body-sm` 14 · `label` 14 · `label-sm` 12 · `caption` 12 · `overline` 12 · `cad-dimension` 12 · `cad-spec-micro` 11. Tiêu đề và nhãn mang sẵn độ đậm; `body*` và `caption` kế thừa độ đậm xung quanh. Các bộ UI dùng chung (`SiteKit`, `landing/ui`, `library/ui`, `workspace/ui`, `studioUi`) dùng style theo vai trò.

**Cỡ tối thiểu**: 12 px cho chữ đọc, 11 px cho nhãn mono. Nhỏ hơn chỉ trong artwork có `ds-artwork` / `ds-allow`.

### 2.3 Khoảng cách, lưới, breakpoint, icon

- Thang gốc 4 px của Tailwind. Trong component: `h-control-sm|control|control-lg` (36/40/44), `gap-stack-*` (4/8/16/24), `p-card-*` (20/24/32). Giữa khối: `py-section` 40 → `lg:py-section-lg` 56, `section-xl` 96.
- Lưới: < md 4 cột (gutter 16, lề 16) · md 8 cột (24/24) · lg+ 12 cột (24/32); `Container` tối đa 1280 px (1536 px từ `2xl`).
- Breakpoint `sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536`; script dùng `mediaUp("md")`.
- Mật độ: `DataTable density="compact"` cho admin.
- Bo góc: `rounded-control` 12 · `panel` 16 · `sheet` 28 · `card` 32 · `card-lg` 48.
- Icon: lucide-react, nét `ICON_STROKE` — 2 cho ≤ 16 px, 1.75 cho ≥ 20 px, 3 cho dấu tích trong ô 12–16 px.

## 3. Thành phần

Import từ `@/components/ui`. Mỗi thành phần có ví dụ chạy được (sáng và tối) ở `/design-system`.

| Thành phần | File | Ghi chú chính |
|---|---|---|
| Button, ButtonLink, `buttonClass()` | `button.tsx` | **primary và brand (cam FPT)**, secondary, outline, dark, ghost, ghost-dark, white, danger, link; sm/md/lg/xl/icon; pill/rounded; loading, disabled |
| Card, CardHeader, `cardClass()` | `card.tsx` | soft, outline, panel, tile; padding sm/md/lg; interactive |
| Badge, CountBadge | `badge.tsx` | 5 tone; soft/solid/outline; chấm; số lệch góc |
| Field, Input, Textarea, Select | `field.tsx` | nhãn nối `htmlFor`, hint, lỗi có icon, aria-describedby, icon đầu, đơn vị cuối; Select có mũi tên là icon |
| Checkbox, RadioGroup, Switch | `choice.tsx` | input gốc + vẽ lại; cả hàng bấm được; indeterminate; radio card |
| Tabs, TabList, Tab, TabPanel | `tabs.tsx` | WAI-ARIA tabs, ←/→ Home End; `aria-controls` chỉ khi panel có mặt; pill / segmented / underline |
| Accordion | `accordion.tsx` | single/multiple; disabled; heading + region |
| Tooltip | `tooltip.tsx` | hover + focus, Escape, 4 phía |
| Alert, Banner | `alert.tsx` | 5 tone; icon riêng; Banner đóng được với info/success |
| Breadcrumb | `breadcrumb.tsx` | `aria-current`, chevron, gập cấp giữa |
| ModalLayer, Dialog, Drawer | `dialog.tsx` | bẫy focus, Esc, nền, trả focus, khoá cuộn; footer cố định |
| DropdownMenu | `dropdown-menu.tsx` | icon, phím tắt, danger, disabled, nhóm, submenu, tự lật |
| NumberStepper, Slider | `number-stepper.tsx`, `slider.tsx` | − / +, ↑/↓ (Shift ×10), min/max, bước, 3 cỡ; nhãn, mốc |
| SearchBar | `search-bar.tsx` | combobox, gợi ý, tìm gần đây, nút Tìm |
| DatePicker | `date-picker.tsx` | T2 đầu tuần, DD/MM/YYYY, khoảng ngày, giờ, ngày khoá, Hôm nay |
| DataTable | `data-table.tsx` | ô lọc (bỏ dấu), sắp xếp `aria-sort`, vùng cuộn focus được, dạng thẻ dưới md, compact |
| Skeleton, FadeIn, Spinner, LoadingState | `feedback.tsx` | loading sau 300 ms; mascot khi chờ lâu |
| Avatar, Icon | `avatar.tsx`, `icon.tsx` | chữ cái đầu, chấm trạng thái (`role="img"`); lucide nhận tên Material cũ |
| Toast, Carousel | `common/Toast`, `landing/Carousel.tsx` | 4 loại, dừng khi hover/focus; nút, vuốt, “mục x / n” |

## 4. Tiếp cận

### 4.1 Kiểm tra tự động — `npm --workspace=fe run a11y`

Chrome headless + axe-core (luật WCAG 2.0/2.1/2.2 A và AA) trên 14 trang khách, `/design-system` ở cả hai theme, và 7 trang đăng nhập (admin seed của `be/.env`); đo thêm tràn ngang ở 640 px (zoom 200 %) và 320 px (zoom 400 %, 1.4.10). Chuyển động được giảm khi chạy. Logo (`data-logo`) được miễn luật tương phản (ngoại lệ của 1.4.3).

Kết quả ngày 2026-10-15:
- Không trang nào tràn ngang ở 640 px và 320 px.
- Trước khi đổi lại màu cam: 20/21 trang không lỗi axe.
- Sau khi đổi lại màu cam: mọi lỗi còn lại chỉ là `color-contrast` của nút/nhãn cam chữ trắng (3.15:1), có trên các trang giới thiệu và trên nút “Bắt đầu” của header dùng chung.
- Các lỗi đã sửa trong đợt này: select và input không có nhãn (form liên hệ, form chờ ra mắt), nút trong vùng `aria-hidden`, `aria-label` trên `div`/`span` không có role, `aria-controls` trỏ tới panel không tồn tại, vùng cuộn không focus được, chữ xanh lá/cam thuần trên nền sáng, chữ xám trên nền tối, vùng bấm < 24 px (số điện thoại, tag blog, chấm bước), link chỉ phân biệt bằng màu.

### 4.2 Trình đọc màn hình (thủ công)

Chưa có người chạy VoiceOver/NVDA. Năm luồng cần thử, ghi kết quả vào docs/13:
1. Trang chủ → Thư viện mẫu → mở một mẫu.
2. Đăng ký → xác minh email → đăng nhập.
3. Dashboard → tạo dự án → đổi tên, chuyển thư mục.
4. Studio: nhập kích thước, đọc kết quả FitCheck, xuất file.
5. Form liên hệ có lỗi.

Với mỗi luồng ghi lại ba điều: tên các control được đọc đúng không, thứ tự đọc, và focus đi đâu khi mở/đóng dialog.

### 4.3 Chú thích tiếp cận trong thiết kế

Mỗi màn mới trong Stitch/Figma có một lớp “A11y” ghi:
- **Nhãn**: tên đọc lên của nút chỉ có icon (“Đóng”, “Mở lịch chọn ngày”), ảnh có `alt` hay trang trí.
- **Thứ tự đọc / focus**: đánh số 1, 2, 3… trên các phần tử tương tác theo thứ tự Tab.
- **Vai trò**: vùng (`header`, `nav`, `main`, `aside`), mẫu WAI-ARIA dùng (tabs, menu, dialog, combobox).
- **Focus khi mở/đóng**: dialog mở thì focus vào đâu, đóng thì trả về nút nào.
- **Trạng thái ngoài màu**: icon/chữ đi kèm cho lỗi, thành công, đang chọn.

### 4.4 Checklist khi thêm hoặc sửa component

- [ ] Tương phản chữ ≥ 4.5:1, chữ lớn / icon / viền control ≥ 3:1 — ở cả theme sáng và tối.
- [ ] Chỉ dùng token ngữ nghĩa (để theo được theme tối); `npm run tokens:check` qua.
- [ ] Dùng được bằng bàn phím; thứ tự Tab theo thứ tự đọc; vòng focus cobalt nhìn thấy.
- [ ] Vai trò, nhãn, trạng thái ARIA theo WAI-ARIA Authoring Practices.
- [ ] Vùng bấm ≥ 24 × 24 px (2.5.8), ≥ 44 px cho control chính trên mobile.
- [ ] Không truyền nghĩa chỉ bằng màu; thử bộ mô phỏng mù màu trên `/design-system`.
- [ ] Zoom 200 % / 400 % không tràn ngang (`npm --workspace=fe run a11y`).
- [ ] `prefers-reduced-motion` tắt chuyển động không cần thiết.
- [ ] Thêm ví dụ vào `/design-system`.

## 5. Tình trạng theo checklist.design (185 mục)

Chấm lại ngày 2026-10-15 theo bảng audit gốc (76/185 đạt, Foundations 1/37).

| Nhóm | Đạt | Một phần | Ghi chú phần còn thiếu |
|---|---|---|---|
| Typography (8) | 8 | 0 | — |
| Accessibility (8) | 6 | 2 | Tương phản: nút cam chữ trắng 3.2:1 (lựa chọn thương hiệu). Trình đọc màn hình: mới kiểm tự động, chưa thử thủ công |
| Spacing / Grid (7) | 7 | 0 | — |
| Color (8) | 7 | 1 | Màu thương hiệu: cam làm nút chính chưa đạt 4.5:1 |
| Tokens (6) | 5 | 1 | Đồng bộ thiết kế: có file DTCG, chưa nối Figma variables thật |
| **Foundations (37)** | **33** | **4** | |
| Components (148) | 147 | 0 | 1 mục không áp dụng: Carousel “Focused item state” (không có carousel một mục) |

Chế độ tối đã định nghĩa và component hỗ trợ, nhưng chưa bật cho toàn site (xem §2.1).

## 6. Phiên bản

| Phiên bản | Ngày | Thay đổi |
|---|---|---|
| 1.2.0 | 2026-10-16 | Cam FPT là màu chủ đạo của mọi trang người dùng: `action`, `accent` chuyển sang dải orange; màu nhấn lime/xanh lá trong trang đổi sang cam; xanh dương, xanh lá là màu phụ (`success`, dải nền đậm, focus, link). Xoá các trang careers, press, events, compare, waitlist, blog, search; ô tìm kiếm chuyển lên header; `/design-system` gập theo mục. |
| 1.1.0 | 2026-10-15 | Dải primitive 50–950; giá trị tối cho mọi token ngữ nghĩa; token `accent*` và `*-solid`; `components/ui` chỉ dùng token ngữ nghĩa; mọi trang chuyển từ bảng màu mặc định của Tailwind sang token (0 giá trị tay ngoài artwork); `tokens:check` trong CI; xuất `design-tokens.json`; `ICON_STROKE`; DataTable có ô lọc; `npm run a11y`; trang giới thiệu trở lại cam FPT (`Button variant="brand"`) phối xanh dương và xanh lá. |
| 1.0.0 | 2026-10-15 | Tầng token ngữ nghĩa, thang chữ, token khoảng cách/bo góc; 20 primitive trong `components/ui`; trang `/design-system`; AGENTS.md §2 và skill `wrapfit-design-system` cập nhật theo code. |

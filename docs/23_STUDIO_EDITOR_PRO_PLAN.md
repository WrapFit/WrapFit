# 23. Studio bước 4 "Thiết kế": nâng lên mức trình chỉnh sửa chuyên nghiệp (ngang Canva, sâu như Pacdora)

> Ngày lập: 2026-11-13 · Nhánh gốc: `develop` (22bf016) · Trạng thái: **đã duyệt 2026-11-13; giai đoạn 1–2 xong, giai đoạn 1–3 xong (S1–S13), chưa commit**, xem §10
> Phạm vi: bước 4 của studio (`fe/src/views/editor/studio/StudioWorkspace.tsx`), kiểu dữ liệu chung (`shared`),
> DTO và bộ dựng file in của backend (`be/src/projects`, `be/src/export/rendering`), mô hình 3D.
> Các trang `/editor/step-1..4` là mockup tĩnh cũ, **không** thuộc phạm vi.
> Cách chia phiên giống [`17_PATH2_MVP_PLAN.md`](17_PATH2_MVP_PLAN.md): mỗi phiên là một cuộc trò chuyện Claude Code
> độc lập, mọi trạng thái nằm trong file này, `git log` và nhật ký §10.

Mục lục: [1. Hiện trạng](#1-hiện-trạng-2026-11-13) · [2. Đối chiếu Canva / Pacdora](#2-đối-chiếu-canva--pacdora) ·
[3. Quyết định](#3-quyết-định) · [4. Mô hình dữ liệu](#4-mô-hình-dữ-liệu-mới) · [5. Giao diện](#5-bố-cục-giao-diện-bước-4) ·
[6. Giai đoạn và phiên](#6-giai-đoạn-và-phiên) · [7. Kiểm thử](#7-kịch-bản-nghiệm-thu) · [8. Rủi ro](#8-rủi-ro) ·
[9. Câu hỏi mở](#9-câu-hỏi-mở) · [10. Nhật ký](#10-nhật-ký-bàn-giao)

---

## 1. Hiện trạng (2026-11-13)

| # | Vấn đề (nhận xét của nhóm) | Bằng chứng trong code |
|---|---|---|
| 1 | Ảnh chồng nhau, không chỉnh được trước/sau | Thứ tự lớp = thứ tự mảng `elements`, không có lệnh hay panel đổi thứ tự. Thanh nổi ([DielineCanvas2D.tsx:500](../fe/src/features/studio/components/canvas/DielineCanvas2D.tsx)) chỉ có: dịch 2 mm, xoay 45/90°, ±10%, xóa. Không có nhân bản, khóa, ẩn, chọn nhiều. |
| 2 | Không chỉnh chữ, sticker, ảnh chi tiết | `CanvasElement.style` chỉ có `fontFamily, fontSize, color, fillColor, opacity` ([project.ts:19](../shared/src/types/project.ts)). Chọn font ở rail "Văn bản" đổi font của **mọi** chữ ([StudioWorkspace.tsx:1136](../fe/src/views/editor/studio/StudioWorkspace.tsx)). Ảnh không cắt, lật hay chỉnh màu được. |
| 3 | Áp mẫu xong nền vẫn kéo được, lệch bìa | Nền của mẫu là phần tử `pattern` bình thường `bg_<mặt>` ([templates.ts:267](../shared/src/library/templates.ts)). Khi kéo, phần tử đổi sang mặt chứa tâm của nó ([DielineCanvas2D.tsx:250](../fe/src/features/studio/components/canvas/DielineCanvas2D.tsx)). Canvas 2D không cắt phần tử theo mặt (không có `clipPath`). |
| 4 | Ít kết cấu hộp | `BoxStructureType` = tuck-top, sleeve-drawer, lid-base, pillow, sticker-label ([dieline.ts:6](../shared/src/types/dieline.ts)). |
| 5 | Thư viện nghèo | Thư viện tĩnh [art.ts](../shared/src/library/art.ts): 13 sticker, 10 nhãn, 7 nền; 11 bộ mẫu `STYLE_KITS`. **Hạ tầng đã có**: bảng `LibraryAsset` (giấy phép, ghi nguồn, DPI), trang `/admin/library` để nhập, studio đã đọc tài sản đã nhập (`LibraryPanel.tsx:169`). Thiếu là **nội dung** và đổi màu cho SVG nhập vào. |
| 6 | (thêm) Không in được mặt trong | Mặt trong chỉ là màu giấy trong mô hình 3D (`PAPER.inside`, [boxModel.ts:38](../fe/src/features/studio/components/three/boxModel.ts)). |
| 7 | (thêm) Ép kim, UV chỉ là lựa chọn tính giá | `CanvasState.finishes` áp cho cả hộp; file in không có lớp màu pha (spot) cho vùng ép kim/UV. |
| 8 | (thêm) Thiếu thao tác cơ bản | Không có phím mũi tên để dịch, thước, đường gióng, hình khối, ống hút màu, màu chuyển, font riêng. |

**Ràng buộc kỹ thuật**: backend bật `forbidNonWhitelisted` ([app.middleware.ts:58](../be/src/app.middleware.ts)). Mỗi trường
mới của phần tử phải thêm **cùng lúc ở 5 chỗ**, nếu không thì lưu bị 400 hoặc file in khác màn hình:

1. `shared/src/types/project.ts` (kiểu chung)
2. `be/src/projects/presentation/dto/project-spec.dto.ts` (`CanvasElementDto`)
3. `be/src/export/rendering/` (file in thật: PDF, SVG, DXF)
4. `fe/src/features/studio/components/export/offline/renderers.ts` (file in bản demo offline)
5. `fe/src/features/studio/components/three/boxModel.ts` (texture 3D) và canvas 2D

## 2. Đối chiếu Canva / Pacdora

Ký hiệu: ✅ đã có · 🟡 có một phần · ❌ chưa có. Cột "Phiên" chỉ nơi bổ sung (§6).

### 2.1. Thao tác chỉnh sửa (mức Canva)

| Tính năng | Hiện tại | Phiên |
|---|---|---|
| Hoàn tác / làm lại, lưu tự động, phiên bản | ✅ | — |
| Brand Kit, mã vạch / QR, AI hoa văn, AI ảnh | ✅ | — |
| Panel Lớp, đổi thứ tự trước/sau, khóa, ẩn, đổi tên | ❌ | S2 |
| Nhân bản, sao chép/dán, sao chép kiểu, xóa bằng phím | ❌ | S2 |
| Phím mũi tên dịch 1 mm (Shift: 10 mm), Space + kéo để di chuyển khung nhìn, phóng vừa vùng chọn | ❌ | S2 |
| Menu chuột phải, Alt+click chọn phần tử nằm dưới | ❌ | S2 |
| Hình khối và đường kẻ (chữ nhật, bo góc, tròn, đường, mũi tên, sao, đa giác, khung viền) | ❌ | S4 |
| Kiểu chữ riêng từng phần tử: font, đậm, nghiêng, căn lề, giãn dòng, giãn chữ, hoa/thường | 🟡 (font đổi cả loạt) | S4 |
| Viền chữ, chữ uốn cong, kiểu chữ dựng sẵn từ Brand Kit, sửa chữ ngay trên canvas | ❌ | S9 |
| Cắt ảnh, khung ảnh (tròn, vòm, bo góc), lấp đầy/vừa khung, lật, sáng/tương phản/bão hòa, thay ảnh | ❌ | S10 |
| Chọn màu tự do, ống hút màu, màu chuyển, "màu trong thiết kế" | 🟡 (chỉ bảng màu có sẵn) | S11 |
| Chọn nhiều, nhóm, căn và phân bố đều, đường gióng thông minh, bắt dính | ❌ | S12 |
| Thước, đường gióng tự kéo, lưới | ❌ | S12 |
| Tải font riêng (kiểm tra đủ dấu tiếng Việt, nhúng vào PDF) | ❌ | S13 |
| Ảnh kho miễn phí (Unsplash / Pexels) | ✅ Pexels | S15 |
| Yêu thích, dùng gần đây, "Của tôi" | ✅ | S15 |
| Xóa nền ảnh, tăng độ phân giải ảnh (AI, trả bằng xu) | ✅ | S20 |
| Đổ bóng, chế độ hòa trộn, kiểm tra chính tả | ❌ | S22 (sau MVP) |
| Bình luận và duyệt mẫu với khách / xưởng in | ❌ | S23 (sau MVP) |

### 2.2. Đặc thù bao bì (mức Pacdora)

| Tính năng | Hiện tại | Phiên |
|---|---|---|
| Dieline tham số, FitCheck, mô hình 3D gập, môi trường mockup | ✅ | — |
| Nền gắn chặt vào mặt hộp, phần tử bị cắt theo mặt + tràn lề | ❌ | S3 |
| In mặt trong | ❌ | S5 |
| Lớp hoàn thiện cho từng phần tử (ép kim vàng/bạc, UV định hình, dập nổi/chìm), lớp spot trong PDF, ánh kim trên 3D | 🟡 (chỉ tính giá) | S6 |
| Màu dành cho in: nhập CMYK, cảnh báo ngoài dải màu in, đen đậm | ❌ | S7 |
| Thêm kết cấu: mailer, gable, cửa sổ, khay chia ngăn, sản phẩm phẳng | ✅ | S16–S18 |
| Xuất video / GIF hộp gập | ✅ | S19 |
| Đổi kích thước thông minh (neo bố cục) | ✅ | S20 |
| Kiểm tra hướng đọc sau khi gấp, tương phản, chữ < 6 pt, chữ đè nếp gấp | ✅ | S21 |
| Khối thông tin nhãn hàng hóa bắt buộc | 🟡 mẫu điền sẵn, chờ Q2 | S21 |

## 3. Quyết định

| Mã | Quyết định | Lý do |
|---|---|---|
| D1 | **Mọi trường mới đều tùy chọn** và có mặc định giữ nguyên hành vi cũ. Thêm `CanvasState.schemaVersion = 2`; hàm `normalizeCanvas()` trong `shared` nâng dữ liệu cũ khi mở (VD phần tử `bg_*` → `role: "background"`). | Dự án và snapshot cũ mở được, không cần migration SQL. |
| D2 | **Đổi mô hình dữ liệu một lần ở S1**: khai báo mọi trường của cả kế hoạch (kể cả `side`, `finish`, `shape`, `crop`, `anchor`), backend nhận và lưu. Các phiên sau chỉ thêm giao diện và bộ dựng. | Tránh sửa DTO và bộ dựng file in nhiều lần; các phiên sau chạy song song được. |
| D3 | Thứ tự lớp vẫn là **thứ tự mảng**. Hàm `orderElements()` luôn giữ phần tử `role: "background"` dưới phần tử `artwork` trên cùng một mặt và cùng một phía (in ngoài/trong). | Không thêm `zIndex` phải đồng bộ; bộ dựng file in đã vẽ theo thứ tự mảng. |
| D4 | Nền (`role: "background"`) mặc định **khóa**, luôn khớp mặt + tràn lề, tự tính lại khi đổi L×W×H. Không kéo được, chỉ chỉnh qua "Nền theo mặt". | Sửa tận gốc lỗi lệch bìa (#3). |
| D5 | Phần tử **không tự đổi mặt** khi kéo qua mép. Muốn chuyển mặt thì dùng lệnh "Chuyển sang mặt…" (menu chuột phải, panel Lớp). Phần tử bị cắt theo mặt + tràn lề ở 2D, 3D và file in. | Hành vi đoán theo tâm hiện tại gây nhảy mặt ngoài ý muốn. |
| D6 | Thanh nổi ở đáy canvas được **thay bằng thanh thuộc tính ngữ cảnh ở trên canvas** (giống Canva): nội dung đổi theo loại phần tử. | Thanh hiện tại che hình và không đủ chỗ cho thuộc tính chữ / ảnh. |
| D7 | Mặt trong in trên **trang riêng** của file in, dieline **lật gương theo chiều ngang**. Báo giá cộng chi phí in 2 mặt. | Xưởng in lật tờ khi in mặt sau; trộn chung một trang dễ in nhầm. |
| D8 | Ép kim / UV / dập nổi xuất thành **lớp màu pha riêng** (`Foil`, `SpotUV`, `Emboss`), tint 100%, overprint. `CanvasState.finishes` = hợp các `finish` của phần tử + cán màng toàn hộp (vẫn do người dùng chọn). | Cách xưởng in thật nhận file; báo giá tự đúng theo thiết kế. |
| D9 | **Không** đưa bảng màu Pantone vào sản phẩm (bản quyền). Người dùng nhập mã Pantone làm **ghi chú cho xưởng in**, màu hiển thị vẫn là hex/CMYK do người dùng chọn. | Bảng Pantone là dữ liệu có giấy phép. |
| D10 | Ảnh kho đi qua **proxy backend** (khóa API không ra trình duyệt), lưu bản sao vào R2 khi người dùng chèn, ghi nguồn tác giả theo điều khoản của từng nhà cung cấp. Chỉ chọn nhà cung cấp sau khi đọc điều khoản API (Q3). | Bản in cần ảnh độ phân giải cao, không phụ thuộc link ngoài. |
| D11 | Font tải lên: kiểm tra đủ bộ ký tự tiếng Việt bằng `fontkit` (backend đã dùng), người dùng tick xác nhận có quyền dùng, chỉ dùng trong dự án của chính họ. | Tránh font thiếu dấu in ra ô vuông; trách nhiệm bản quyền font thuộc người dùng. |
| D12 | Kết cấu mới theo quy tắc phiên bản công thức sẵn có ([registry.ts](../shared/src/parametric/registry.ts)): mỗi kết cấu có generator + cây bản lề 3D + luật FitCheck + giá + mẫu seed. | Không phá dự án cũ. |

## 4. Mô hình dữ liệu mới

Thêm vào `shared/src/types/project.ts` (mọi trường tùy chọn, D1):

```ts
export type CanvasElementType = "text" | "logo" | "image" | "pattern" | "barcode" | "shape";
export type ElementRole = "artwork" | "background";        // mặc định "artwork"
export type PrintSide = "outside" | "inside";              // mặc định "outside"
export type ElementFinish = "foil_gold" | "foil_silver" | "foil_rose" | "spot_uv" | "emboss" | "deboss";
export type ShapeKind = "rect" | "ellipse" | "line" | "arrow" | "star" | "polygon" | "frame";

export interface CanvasElement {
  // ...các trường hiện có
  side?: PrintSide;
  role?: ElementRole;
  name?: string;                 // tên lớp do người dùng đặt
  locked?: boolean;
  hidden?: boolean;              // ẩn: không vẽ ở 2D/3D, không in
  groupId?: string | null;
  flipX?: boolean;
  flipY?: boolean;
  finish?: ElementFinish | null;
  /** Neo theo mặt khi đổi kích thước hộp (S20). */
  anchor?: { h: "left" | "center" | "right" | "stretch"; v: "top" | "middle" | "bottom" | "stretch" };
  /** Ảnh: vùng cắt (tỉ lệ 0..1 của ảnh gốc), khung, cách lấp. */
  crop?: { x: number; y: number; width: number; height: number };
  mask?: "rect" | "rounded" | "circle" | "arch" | null;
  fit?: "fill" | "fit" | "tile";
  shape?: { kind: ShapeKind; cornerRadius?: number; points?: number; innerRatio?: number };
  style?: {
    // ...fontFamily, fontSize, color, fillColor, opacity
    fontWeight?: 400 | 500 | 600 | 700 | 800;
    fontStyle?: "normal" | "italic";
    textDecoration?: "none" | "underline";
    textAlign?: "left" | "center" | "right" | "justify";
    lineHeight?: number;          // bội số cỡ chữ
    letterSpacing?: number;       // phần nghìn em
    textTransform?: "none" | "uppercase" | "lowercase";
    curve?: number;               // độ uốn chữ, -360..360 độ
    strokeColor?: string;
    strokeWidth?: number;         // mm
    gradient?: { type: "linear" | "radial"; angle?: number; stops: { offset: number; color: string }[] };
    filters?: { brightness?: number; contrast?: number; saturation?: number }; // -100..100
    cmyk?: [number, number, number, number]; // màu in người dùng nhập (S7)
    pantoneNote?: string;         // ghi chú cho xưởng in (D9)
  };
}

export interface CanvasState {
  schemaVersion?: 2;
  // ...các trường hiện có
}
```

Hàm mới trong `shared` (có test): `normalizeCanvas`, `orderElements`, `fitBackground(panel, geometry)`,
`elementsOf(panelId, side)`, `finishesOf(elements)`.

## 5. Bố cục giao diện bước 4

```
┌ Thanh trên: tên dự án · các bước · hoàn tác/làm lại · lưu · Xuất ─────────────────────────┐
├ Rail ┬ Panel rail ───┬ Thanh thuộc tính ngữ cảnh (D6) ─────────────────────┬ 3D thu nhỏ ─┤
│ Thành│ (Thành phần,  │ Chữ: font · cỡ · B I U · căn · giãn · màu · viền · uốn │ (bật/tắt,   │
│ phần │  Văn bản, Tải │ Ảnh: cắt · khung · lật · chỉnh màu · thay · xóa nền    │  kéo đổi    │
│ Văn  │  lên, Màu &   │ Hình: kiểu · màu · viền · bo góc                       │  vị trí)    │
│ bản  │  nền, Hình    │ Chung: X Y W H (mm) · xoay · độ mờ · hoàn thiện · lớp  │             │
│ ...  │  khối, Lớp,   ├──────────────────────────────────────────────────────┤             │
│ Lớp  │  AI ...)      │ Canvas: thước, đường gióng, Ngoài|Trong, Tập trung mặt │             │
├──────┴───────────────┴ Dải "Mặt hộp" (đã có) + FitCheck ngay trên canvas ──────┴─────────────┤
```

- Rail thêm tab **Hình khối** và **Lớp**.
- Công tắc **Mặt ngoài / Mặt trong** ở góc canvas (S5).
- **Tập trung mặt**: bấm mặt ở dải "Mặt hộp" thì canvas phóng vừa mặt đó.
- **3D thu nhỏ** cập nhật trực tiếp khi sửa 2D.
- Menu chuột phải; bảng phím tắt (phím `?`).
- FitCheck: phần tử vi phạm viền đỏ ngay trên canvas, kèm nút "Sửa nhanh" của Gói.
- Mobile (< 768 px): thanh thuộc tính chuyển thành bottom sheet; chạm giữ để mở menu; không có thước.

## 6. Giai đoạn và phiên

Ước lượng tính theo phiên Claude Code + kiểm tay. "Song song" = chạy được cùng lúc sau phiên ghi ở cột đó.

### Giai đoạn 1 — Nền tảng và sửa 3 lỗi chính (~1,5 tuần)

| Phiên | Việc | Xong khi | Cần trước |
|---|---|---|---|
| S1 | Mô hình dữ liệu §4 ở **đủ 5 chỗ** (DTO nhận mọi trường mới); `normalizeCanvas`, `orderElements`; bộ dựng file in và 3D tôn trọng `hidden`, `opacity`, `flipX/Y`, chỉ vẽ `side: "outside"`. Test cho `shared` và DTO. | Dự án và snapshot cũ mở, lưu, xuất ra kết quả **giống hệt** trước; PATCH với trường mới không bị 400; `tsc`, lint, `be test` sạch. | — |
| S2 | Panel **Lớp** (theo mặt, kéo thả, mắt, khóa, đổi tên), lệnh trước/sau (Ctrl+] / Ctrl+[ ; Ctrl+Shift+] / [), nhân bản (Ctrl+D), sao chép/dán, Delete, phím mũi tên 1/10 mm, Space + kéo, Alt+click, menu chuột phải, "Chuyển sang mặt…". | Kịch bản 1–3 ở §7 đạt. | S1 |
| S3 | **Nền theo mặt** (D4, D5): nền khóa, khớp mặt + tràn lề, tự tính lại khi đổi kích thước; chế độ phủ kín / vừa khung / lặp; "Áp cho mọi mặt"; "Liền mạch qua các mặt". `clipPath` theo mặt ở 2D, 3D, file in. Mẫu (`templates.ts`) sinh nền `role: "background"`. Bỏ đổi mặt theo tâm khi kéo. | Kịch bản 4–5 đạt; xuất PDF mẫu "Xuân Son Đỏ" không có mực trên tai dán. | S1 (song song S2) |
| S4 | **Hình khối** (rail mới, 7 loại) ở 2D, 3D, file in. **Kiểu chữ theo từng phần tử**: sửa lỗi đổi font cả loạt; đậm, nghiêng, gạch chân, căn lề, giãn dòng, giãn chữ, hoa/thường; đo dòng bằng `@chenglou/pretext` như hiện tại. | Kịch bản 6–7 đạt; chữ in ra PDF khớp màn hình (so ảnh chụp). | S1 (song song S2, S3) |

### Giai đoạn 2 — Đặc thù in bao bì (~1,5 tuần)

| Phiên | Việc | Xong khi | Cần trước |
|---|---|---|---|
| S5 | **In mặt trong** (D7): công tắc Ngoài/Trong, dieline lật gương khi sửa mặt trong, texture mặt trong ở 3D, trang "Inside" trong PDF, báo giá in 2 mặt, FitCheck: mực mặt trong không được nằm dưới vùng dán. | Kịch bản 8 đạt. | S3 |
| S6 | **Lớp hoàn thiện** (D8): chọn hoàn thiện cho phần tử, lớp spot trong PDF, ánh kim / bóng UV trên 3D (metalness/roughness map), `finishes` tự tính cho báo giá, FitCheck: nét ép kim ≥ 0,3 mm, chữ ép kim ≥ 8 pt (chờ Q1). | Kịch bản 9 đạt. | S1 |
| S7 | **Màu dành cho in**: nhập CMYK, cảnh báo màu ngoài dải in (chuyển RGB↔CMYK xấp xỉ, ngưỡng sai lệch), cảnh báo đen đậm cho chữ nhỏ, ghi chú Pantone (D9). | Kịch bản 10 đạt. | S1 |

### Giai đoạn 3 — Thuộc tính đầy đủ (~2 tuần)

| Phiên | Việc | Xong khi | Cần trước |
|---|---|---|---|
| S8 | **Thanh thuộc tính ngữ cảnh** (D6) thay thanh nổi; ô X/Y/W/H mm, xoay tự do, tay cầm xoay, tay cầm cạnh, Shift giữ tỉ lệ, Alt co giãn từ tâm. | Mọi thao tác của thanh nổi cũ có ở thanh mới; 375 px dùng bottom sheet. | S2 |
| S9 | Chữ nâng cao: viền chữ, chữ uốn cong (cả file in), nhấp đúp sửa chữ trên canvas, kiểu chữ dựng sẵn từ Brand Kit. | Kịch bản 11 đạt. | S4, S8 |
| S10 | Ảnh: cắt, khung, lấp đầy/vừa, lật, sáng/tương phản/bão hòa (vẽ sẵn vào bản 300 DPI khi xuất), thay ảnh giữ khung, DPI cập nhật khi kéo. | Kịch bản 12 đạt. | S8 |
| S11 | Màu: bảng chọn tự do, ống hút màu (EyeDropper API, có dự phòng), màu chuyển, "màu trong thiết kế". | Màu chuyển in ra PDF đúng. | S8 |
| S12 | Chọn nhiều (Shift, khung chọn), nhóm/bỏ nhóm, căn và phân bố đều (theo vùng chọn, mặt, vùng an toàn), đường gióng thông minh, bắt dính tâm mặt và lề an toàn, thước + đường gióng tự kéo, lưới. | Kịch bản 13 đạt. | S2 |
| S13 | Font riêng (D11): tải TTF/OTF/WOFF2, kiểm tra dấu tiếng Việt, nhúng / chuyển nét khi xuất. | Font thiếu dấu bị từ chối kèm lý do; PDF dùng đúng font. | S4 |

### Giai đoạn 4 — Thư viện nội dung (~1 tuần code + thời gian làm nội dung)

| Phiên | Việc | Xong khi | Cần trước |
|---|---|---|---|
| S14 | Đổi màu cho SVG nhập qua `/admin/library` (đặt tên vùng màu khi nhập, recolor như `art.ts`), lọc theo ngành, tổ hợp chữ dựng sẵn, ký hiệu in bắt buộc (tái chế, Made in Vietnam, ô NSX/HSD). Hướng dẫn chuẩn file cho người vẽ nội dung. | Tài sản nhập vào đổi màu theo bảng màu được. | — |
| S15 | Yêu thích, dùng gần đây, "Của tôi" (ảnh tải lên + ảnh AI); ảnh kho qua proxy (D10). | Kịch bản 14 đạt. | Q3 |
| — | **Nội dung** (nhóm thiết kế, ngoài code): ~150 sticker, 50 nhãn, 40 nền, 30 tổ hợp chữ, 20 bộ mẫu. Chỉ dùng tự vẽ hoặc giấy phép rõ ràng (CC0, MIT, OFL, CC-BY có ghi nguồn; bảng đã kiểm). | Đủ số lượng, mỗi ngành ≥ 20 tài sản. | S14 |

### Giai đoạn 5 — Kết cấu mới và xuất video (~3 tuần)

| Phiên | Việc | Xong khi | Cần trước |
|---|---|---|---|
| S16 | **Hộp nắp cài (mailer, FEFCO 0427)**: generator, bản lề 3D, FitCheck, giá, 3 cỡ S/M/L, mẫu seed. | Hộp gập kín ở 3D; dieline đo đúng kích thước lòng. | S3 |
| S17 | **Hộp quai xách (gable)** + **biến thể cửa sổ** cho tuck-top và lid-base (nét cắt cửa sổ, cảnh báo hình dưới cửa sổ bị mất). | Như S16. | S3 |
| S18 | **Khay chia ngăn / lót** (dựa trên `tray.ts`) + **sản phẩm phẳng**: thẻ treo, đai giấy bọc hộp, thiệp gấp đôi. | Như S16; sản phẩm phẳng có báo giá. | S3 |
| S19 | **Xuất video / GIF hộp gập**: ghi canvas WebGL bằng `MediaRecorder` → WebM; GIF bằng thư viện encode phía trình duyệt; tôn trọng `prefers-reduced-motion` trong xem trước. | File 6–8 giây, ≤ 10 MB, tải về được. | — |

### Giai đoạn 6 — Tính năng thông minh (~1,5 tuần)

| Phiên | Việc | Xong khi | Cần trước |
|---|---|---|---|
| S20 | **Đổi kích thước thông minh** theo `anchor`; mẫu gán neo sẵn. **AI xóa nền, tăng độ phân giải** (trả bằng xu, dùng lại luồng AI ảnh và `shared/billing/ai-image-models.ts`). | Kịch bản 15 đạt. | S3, S10 |
| S21 | FitCheck mở rộng: **hướng đọc** (thêm hướng "lên" cho mỗi mặt trong generator, cảnh báo chữ ngược sau khi gấp, nút xoay tự động), tương phản chữ/nền, chữ < 6 pt, chữ đè nếp gấp. **Khối thông tin nhãn hàng hóa** (chờ Q2). | Kịch bản 16 đạt. | S4 |

### Sau MVP

| Phiên | Việc |
|---|---|
| S22 | Đổ bóng, chế độ hòa trộn, kiểm tra chính tả tiếng Việt. |
| S23 | Bình luận trên thiết kế, link duyệt mẫu cho khách / xưởng in (dùng lại `ShareDialog`), trạng thái "Đã duyệt in". |

**Thứ tự đề xuất**: S1 → (S2 ∥ S3 ∥ S4) → (S5 ∥ S6 ∥ S7 ∥ S14) → S8 → (S9 ∥ S10 ∥ S11 ∥ S12 ∥ S13) → còn lại.
Tổng ước lượng đến hết giai đoạn 6: **~11 tuần** một người; chạy song song theo nhánh worktree thì rút còn ~6–7 tuần.

## 7. Kịch bản nghiệm thu

Kiểm tay trong browser pane, cả 1440 px và 375 px; bản `fe-offline-demo` và bản có backend.

1. Hai ảnh chồng nhau trên mặt trước: chọn ảnh dưới bằng Alt+click, Ctrl+] đưa lên trên; panel Lớp phản ánh đúng; Ctrl+Z trả lại.
2. Khóa một ảnh: không kéo, không co giãn được; vẫn chọn được trong panel Lớp để mở khóa. Ẩn: biến mất ở 2D, 3D và PDF.
3. Ctrl+D nhân bản lệch 5 mm; Ctrl+C / Ctrl+V sang mặt khác qua "Chuyển sang mặt…"; phím mũi tên dịch 1 mm, Shift 10 mm.
4. Áp mẫu bất kỳ: không kéo được nền; đổi L×W×H, nền vẫn khớp mặt + tràn lề, không lấn tai dán.
5. Kéo một sticker qua mép mặt: phần ngoài mặt + tràn lề bị cắt ở 2D, 3D, PDF; sticker vẫn thuộc mặt cũ.
6. Thêm 7 loại hình khối, đổi màu, viền, bo góc; xuất PDF khớp màn hình.
7. Hai chữ trên cùng mặt dùng hai font khác nhau, một chữ đậm căn phải giãn chữ 100; lưu, tải lại trang, xuất PDF: giữ nguyên.
8. Mặt trong: đặt chữ "Cảm ơn bạn" ở mặt trong nắp; 3D mở nắp thấy chữ đúng chiều; PDF có trang Inside lật gương; báo giá tăng.
9. Đặt logo ép kim vàng: 3D có ánh kim; PDF có lớp `Foil`; báo giá có dòng ép kim.
10. Chọn màu #00FF66 cho chữ: FitCheck cảnh báo ngoài dải in, gợi ý màu gần nhất.
11. Chữ uốn cong 180° trong tem tròn, viền 0,3 mm; nhấp đúp sửa nội dung trên canvas.
12. Cắt ảnh vào khung tròn, tăng sáng 20; DPI hiển thị đổi khi co giãn; PDF đúng vùng cắt và màu.
13. Chọn 3 phần tử, căn giữa theo mặt, phân bố đều; nhóm lại, kéo cả nhóm; đường gióng hiện khi chạm tâm mặt.
14. Thả tim một sticker: có trong "Yêu thích" sau khi tải lại; chèn ảnh kho: có dòng ghi nguồn tác giả.
15. Đổi hộp từ 90×90×110 sang 120×80×60: tiêu đề vẫn ở giữa mặt trước, logo vẫn ở góc trên.
16. Đặt chữ trên nắp tuck-top ngược hướng: FitCheck cảnh báo "chữ sẽ ngược khi gấp", nút sửa xoay 180°.

## 8. Rủi ro

- **File in khác màn hình**: mỗi thuộc tính mới phải vẽ ở 4 bộ dựng (2D, 3D, PDF backend, PDF offline). Mỗi phiên có
  bước so ảnh chụp màn với ảnh PDF dựng ra; `print-rendering.spec.ts` thêm ca cho từng thuộc tính.
- **Hiệu năng SVG** khi > 100 phần tử hoặc ảnh lớn: dùng ảnh xem trước thu nhỏ trong canvas, bản gốc chỉ khi xuất;
  đo FPS khi kéo ở S2.
- **Chữ uốn cong và đo dòng**: `@chenglou/pretext` đo chữ thẳng; chữ uốn cong cần đặt từng ký tự theo đường tròn ở cả
  2D và PDF (S9 dành thời gian riêng).
- **Mặt trong lật gương** dễ nhầm hướng: thêm nhãn "Mặt trong (nhìn từ trong ra)" và ca kiểm thử 3D ở S5.
- **Giấy phép nội dung**: thư viện chỉ nhận file có mã giấy phép (bảng `LibraryAsset` đã bắt buộc); ảnh kho tuân
  điều khoản API của nhà cung cấp.
- **Tour hướng dẫn** của studio (`studioTour.ts`) trỏ vào thanh nổi cũ: cập nhật selector ở S8.

## 9. Câu hỏi mở

| Mã | Câu hỏi | Cần trước | Mặc định nếu chưa trả lời |
|---|---|---|---|
| Q1 | Xưởng in đối tác yêu cầu nét ép kim và cỡ chữ ép kim tối thiểu bao nhiêu? Tên lớp spot họ dùng? | S6 | 0,3 mm; 8 pt; `Foil`, `SpotUV`, `Emboss` |
| Q2 | Khối thông tin nhãn: cần đối chiếu NĐ 43/2017/NĐ-CP và NĐ 111/2021/NĐ-CP với người có chuyên môn trước khi phát hành | S21 | Chỉ là mẫu điền sẵn, ghi rõ "người bán tự chịu trách nhiệm nội dung" |
| Q3 | Dùng Unsplash, Pexels hay cả hai? Ai đăng ký khóa API? | S15 | Làm Pexels trước nếu điều khoản cho phép lưu bản sao để in |
| Q4 | In mặt trong có giới hạn theo loại giấy (kraft in mặt trong kém)? | S5 | Cho mọi loại giấy, cảnh báo với kraft |
| Q5 | Thứ tự ưu tiên kết cấu mới (mailer → gable → cửa sổ → khay → phẳng) có đúng với khảo sát khách hàng? | S16 | Theo thứ tự này |

## 10. Nhật ký bàn giao

| Ngày | Phiên | Commit | Ghi chú |
|---|---|---|---|
| 2026-11-13 | — | — | Lập kế hoạch; người dùng duyệt và giao thực hiện. |
| 2026-11-13 | S1 | (chưa commit) | Mô hình §4 ở đủ 5 chỗ: `shared/src/types/project.ts`, `CanvasElementDto` (mọi trường mới, `schemaVersion`), `shared/src/canvas/elements.ts` (`orderElements`, `normalizeCanvas`, `moveLayer`, `reorderLayers`, `duplicateElements`, `refitBackgrounds`, `setPanelBackground`, `panelPrintBox`…), `shared/src/print/placement.ts` dùng chung cho file in backend và offline. **Phát hiện**: file in cũ vẽ theo loại (nền → ảnh → tem → chữ → mã vạch), không theo thứ tự lớp; nay cả SVG và PDF (backend + offline) vẽ theo `order`, bỏ lớp ẩn, chỉ in mặt ngoài, có độ trong suốt và lật. FitCheck bỏ qua lớp ẩn, nhận nền theo `role`. `be`: 40/40 test `src/export/rendering` đạt (5 test mới), `src/export` + `src/projects` 202/204 trước khi sửa 2 test cũ theo cấu trúc mới. |
| 2026-11-13 | S2 | (chưa commit) | Rail "Lớp" (phím L): `LayersPanel` theo từng mặt, lớp trên cùng đầu tiên, kéo thả, ẩn/hiện, khóa, đổi tên (bấm đúp), lên/xuống/trên cùng/dưới cùng, nhân bản, xóa. Phím: Ctrl+] / Ctrl+[ (+Shift), Ctrl+D, Ctrl+C / Ctrl+V, Delete, mũi tên 1 mm (Shift 10 mm), Esc. Canvas: Alt+click chọn lớp nằm dưới, menu chuột phải (thứ tự, nhân bản, khóa, ẩn, "Chuyển sang mặt…", xóa). Lớp khóa không kéo, không có tay cầm. |
| 2026-11-13 | S3 | (chưa commit) | Nền (`role: "background"`, mặc định cho `pattern`) không bắt chuột, luôn dưới lớp thiết kế, khớp mặt + tràn lề và tự khớp lại khi đổi L×W×H (đã kiểm: dài 85 → 120 mm). Mỗi mặt một nền: chèn nền/hoa văn AI thay nền cũ của mặt. "Màu & nền": "Áp nền này cho mọi mặt", "Xóa nền mặt này". Mọi phần tử bị cắt theo mặt + tràn lề ở 2D, PDF, SVG; kéo không còn tự đổi mặt. **Chưa làm** (dời sang S10): chế độ phủ kín / vừa khung / lặp cho ảnh nền, "Liền mạch qua các mặt". |
| 2026-11-13 | S4 | (chưa commit) | Rail "Hình khối" (phím H): 7 loại (`shared/src/library/shapes.ts`, vẽ như tem thư viện nên 2D, 3D, thumbnail, PDF giống nhau), màu nền, viền, bo góc, số cánh/cạnh. Chữ theo từng phần tử (sửa lỗi đổi phông cả loạt): phông, cỡ (khung giãn theo cỡ), đậm, nghiêng, gạch chân, căn trái/giữa/phải, giãn dòng, hoa/thường, màu; độ trong suốt và lật cho mọi lớp. Thêm 13 file phông 400 / nghiêng (Big Shoulders không có nghiêng). **Chưa làm**: giãn chữ (`letterSpacing`) dời sang S9. |
| 2026-11-14 | S5 | (chưa commit) | Mặt trong: `shared/src/canvas/inside.ts` (`mirrorGeometry`, `mirrorPath`, `insidePieces`, `printsInside`). Studio có công tắc "Mặt ngoài / Mặt trong" cạnh "Khuôn bế 2D / Gập hộp 3D": mặt trong sửa trên khuôn lật gương, phần tử mới, nền, dán (Ctrl+V) tự nhận `side: "inside"`; nền mặt trong khớp theo khuôn lật gương. File in: `PrintLayout.inside` (backend + offline), PDF thêm trang 2 lật gương. 3D: mỗi mặt có texture mặt trong riêng, vẽ ngược để đọc đúng khi nhìn từ trong hộp. Báo giá: dòng "In mặt trong" (+ bộ kẽm thứ hai với offset). FitCheck kiểm phần tử mặt trong trên khuôn lật gương (lề, tràn lề, tai dán). **Quyết định thay đổi**: không có luật riêng "mực mặt trong dưới vùng dán" ngoài luật tai dán sẵn có. |
| 2026-11-14 | S6 | (chưa commit) | Hoàn thiện theo phần tử: `shared/src/print/finishes.ts` (`FINISH_SPOTS` 6 loại: ép kim vàng/bạc/vàng hồng, UV định hình, dập nổi, dập chìm; `quoteFinishesOf`). Bảng thuộc tính có "Hoàn thiện in"; canvas viền nét đứt màu lớp hoàn thiện; panel Lớp có nhãn "Hoàn thiện". PDF/SVG có lớp `Finish` với màu pha 100 %, overprint. 3D: ép kim ánh kim, UV bóng, dập nổi/chìm có sáng tối. Báo giá tự cộng `foil` / `spot-uv` / `emboss` (thêm `emboss` vào DTO, báo giá, bước 3). FitCheck theo mặc định Q1: chữ ép kim ≥ 8 pt, nét ≥ 0,3 mm, ảnh ép kim chỉ là ghi chú. |
| 2026-11-14 | S7 | (chưa commit) | Màu in: `shared/src/print/color.ts` (`outOfPrintGamut` theo tông/độ bão hòa/độ sáng, `printSafeColor`, `cmykToHex`). Ô màu chữ và nền hình khối: cảnh báo "in sẽ xỉn hơn" + nút "Dùng màu in gần nhất", nhập CMYK (file in dùng thẳng mực này cho chữ và nền hình khối), ghi chú Pantone (D9). FitCheck: `OUT_OF_GAMUT` (info) và chữ < 12 pt dùng đen 4 màu. `be`: 216/216 test `src/export` + `src/projects` (7 test mới cho giai đoạn 2). Kiểm tay trên bản offline: mặt trong, ép kim, CMYK, báo giá bước 6. **Ghi chú môi trường**: `npm run dev` (Turbopack) đang lỗi 500 ở `next/font/google` (Playfair Display), không liên quan docs/23; kiểm tay bằng cấu hình `fe-offline-demo-webpack` (`.claude/launch.json`). |
| 2026-11-14 | S8 | (chưa commit) | `SelectionToolbar` thay thanh nổi trong studio (thanh nổi chỉ còn ở biến thể "card"): X / Y / R / C (mm) và góc xoay nhập trực tiếp, căn theo mặt, lên/xuống cùng, lật, khóa, nhân bản, xóa, "Thuộc tính". Canvas: 8 tay cầm (góc + cạnh) và tay cầm xoay; đổi kích thước trong hệ trục đã xoay (`resizeBox` ở `shared/src/canvas/arrange.ts`), Shift giữ tỉ lệ (ảnh và góc của chữ giữ sẵn), Alt co giãn từ tâm; kéo góc chữ thì đổi cỡ chữ theo; xoay Shift bắt nấc 15°. Sửa lỗi cũ: kéo góc trái/trên không dời vị trí, kích thước tối thiểu 15 × 10 mm (đường kẻ cao 4 mm bị phình). |
| 2026-11-14 | S9 | (chưa commit) | Chữ: giãn chữ (‰ em), viền chữ (vẽ dưới phần tô), uốn cong theo cung (`arcPlacements`, `outlineTextOnArc` ở `shared/src/print/outline.ts`) ở 2D, 3D, thumbnail, PDF/SVG backend và offline. Bấm đúp sửa chữ ngay trên khung (Esc hủy, Ctrl+Enter / bấm ra ngoài để lưu, xóa hết chữ thì xóa lớp). Rail "Văn bản": "Thêm tiêu đề / tiêu đề phụ / đoạn văn", dùng phông Brand Kit khi có. |
| 2026-11-14 | S10 | (chưa commit) | Ảnh: `shared/src/print/imagery.ts` (`imageDraw` cho cắt + vừa/phủ khung, `maskPath` bo góc / tròn / vòm, `applyFilters` cùng công thức CSS). Bảng "Ảnh đang chọn" (rail Tải lên và Lớp): thay ảnh giữ khung, DPI thực của phần ảnh đang hiện, khung, cách đặt, cắt (phóng to + dịch ngang/dọc), sáng / tương phản / bão hòa. File in: backend cắt bằng sharp, áp chỉnh màu vào pixel, khung là clip; SVG nhúng PNG đã cắt (`svgImages`); offline dùng canvas. Đây cũng là phần "phủ kín / vừa khung" dời từ S3; "Liền mạch qua các mặt" vẫn chưa làm. |
| 2026-11-14 | S11 | (chưa commit) | Màu: ống hút màu (EyeDropper API, ẩn khi trình duyệt không có), dải "màu trong thiết kế" ở mọi ô màu (`designColorsOf`), màu chuyển tuyến tính 2 điểm + hướng cho nền hình khối: SVG `linearGradient`, PDF backend gradient CMYK của PDFKit, PDF offline shading kiểu 2 DeviceCMYK (nhiều điểm dùng hàm nối kiểu 3). |
| 2026-11-14 | S12 | (chưa commit) | Chọn nhiều: Shift + bấm, kéo khung chọn trên vùng trống, Ctrl+A (cả mặt), bấm vào một lớp trong nhóm chọn mà không kéo thì chỉ chọn lớp đó. Nhóm / bỏ nhóm (Ctrl+G / Ctrl+Shift+G): bấm một lớp chọn cả nhóm, kéo cùng nhau. Căn 6 kiểu (theo nhóm chọn, hoặc theo mặt khi chọn 1), phân bố đều ngang/dọc (≥ 3). Bắt dính 1,5 mm (Alt tắt) vào mép/tâm mặt, vùng an toàn, lớp khác, đường gióng, lưới; vẽ đường gióng thông minh khi kéo. Kéo từ thước để tạo đường gióng (thả lại thước để xóa); chip "Lưới" 5 mm ở chú giải. Phím Delete / mũi tên / Ctrl+D áp cho cả nhóm chọn. `be`: 223/223 test (`src/export` + `src/projects`, 7 test mới). |
| 2026-11-14 | S13 | (chưa commit) | Phông tải lên (D11): `FilePurpose.FONT` (migration `20261114000100_font_uploads`), luật tải lên TTF/OTF/WOFF/WOFF2 ≤ 10 MB, `POST /storage/fonts/inspect` (fontkit: 422 `FONT_UNREADABLE` / `FONT_NO_VIETNAMESE` kèm các chữ thiếu, trả tên họ phông). Phông của thiết kế lưu ở `canvasState.customFonts`, chữ trỏ tới file bằng `style.fontUrl` (khóa file như ảnh: `toStoredCanvas`, `storedCanvasKeys`, chỉ nhận file tải lên của WrapFit, dọn file không dùng). Mô hình chữ: `TextBoxLayout.fontUrl`, `MeasureText` nhận file phông; một file là một kiểu chữ (tắt đậm / nghiêng). Worker tải file phông cùng ảnh; PDF/SVG backend và offline đo + chuyển nét bằng chính file đó (mất file thì về phông in sẵn). Studio: rail "Văn bản" có "Phông của bạn" (bắt buộc tick xác nhận quyền dùng, kiểm dấu ngay trên trình duyệt trước khi tải), menu phông có nhóm "Phông của bạn"; trình duyệt nạp bằng FontFace dưới tên riêng mỗi file. `be`: 247/247 test (`src/export`, `src/projects`, `src/storage`; 3 test mới). Chưa thử tay với backend thật (bản offline giữ phông trong tab). **Ghi chú**: trên dev server webpack, tải mới trực tiếp `/editor/demo` đôi khi kẹt ở màn chờ dù module nạp được; chuyển trang phía client thì vào bình thường. |
| 2026-11-14 | Sửa lỗi | (chưa commit) | Màn chờ "Đang mở Studio 3D…" kẹt khi tải thẳng `/editor/demo`: tái hiện được cả ở bản build production (lần tải thứ 2–3 kẹt, mã studio đã nạp, không lỗi). Nguyên nhân khả dĩ: `<ViewTransition>` của React bọc trang trong `MainLayout`; khi tab bị ẩn trình duyệt hủy view transition ("Transition was aborted… Document hidden") và ranh giới Suspense của studio không được hiện. Sửa: `/editor` bỏ qua `ViewTransition` như `/admin` (studio là công cụ toàn màn hình, không cần hiệu ứng chuyển trang). Sau sửa: production 4/4, dev 6/6 lần tải thẳng vào được studio. **Chưa chứng minh tuyệt đối**: không ép được `document.hidden = true` trong khung trình duyệt kiểm thử. Lưới an toàn: sau 20 s ở màn chờ hiện thông báo kèm nút "Tải lại trang" (`SlowLoadNotice`). |
| 2026-11-14 | S14 | (chưa commit) | Đổi màu SVG: `shared/src/print/svg-colors.ts` (`svgColorsOf` theo mức dùng, `recolorSvg` đổi một lượt nên A↔B hoán đổi được, `paletteColorMap`, đọc hex / `rgb()` / tên màu / `style`, màu đen mặc định của hình không có `fill`). Phần tử giữ `style.colorMap` (DTO `ColorSwapDto`, ≤ 16), file gốc không đổi; vẽ bản đổi màu ở 2D, 3D, thumbnail, file in offline, và backend (`imageFileOf` cho PDF + SVG). Bảng "Màu của logo" (ảnh / logo SVG): ô màu cho 8 màu dùng nhiều nhất, "Theo bảng màu" 12 bảng, "Về màu gốc". **Thay đổi so với kế hoạch**: không đặt tên vùng màu lúc nhập ở `/admin/library`; studio tự đọc màu của file, thứ tự theo mức dùng (quy ước vẽ ở `docs/24_LIBRARY_CONTENT_GUIDE.md`). Lọc theo ngành (5 ngành, chip "Ngành"; mẫu của ngành lên đầu, mẫu chung theo sau; gán ngành theo từ khóa có ranh giới từ). Danh mục "Ký hiệu in": tái chế, Made in Vietnam, ô NSX/HSD/Số lô, hàng ký hiệu bảo quản, nhãn thông tin bắt buộc (17 mẫu). 12 tổ hợp chữ dựng sẵn (`TEXT_COMBOS`) ở rail "Văn bản", thêm thành một nhóm căn giữa mặt. Hướng dẫn chuẩn file: `docs/24_LIBRARY_CONTENT_GUIDE.md`. **Nội dung còn mỏng**: ngành Nến thơm 9, Trang sức 12 mẫu riêng (mục tiêu ≥ 20, việc của nhóm nội dung). |
| 2026-11-14 | S15 | (chưa commit) | Thư viện có kệ "Thư viện / Yêu thích / Gần đây / Của tôi / Ảnh kho". Yêu thích (ngôi sao trên mỗi mẫu, ≤ 60) và Gần đây (≤ 24) lưu cả mẫu trong `localStorage` theo thiết bị, bỏ qua file `blob:` / `data:`. "Của tôi": ảnh và logo đang có trong thiết kế (tải lên, ảnh AI, ảnh kho) để đặt lại lên mặt khác. Ảnh kho (D10, Q3 chọn Pexels): `GET /library/stock/photos` (tìm / ảnh chọn lọc, 24 ảnh mỗi trang) và `POST /library/stock/photos/:id/import` (tải bản gốc, giới hạn 4800 px / 15 MB, lưu thành tệp `IMAGE` của người dùng, trả ghi nguồn); khóa `PEXELS_API_KEY` chỉ ở backend, trống = tắt (`enabled: false`, studio báo "chưa bật"); lỗi Pexels → 502 `STOCK_PROVIDER_ERROR`. Ảnh chèn có tên lớp là ghi nguồn tác giả. Bản offline: ảnh kho tắt. `be`: 819/819 test (58 bộ; mới: `svg-recolor.spec.ts` 11, `stock-photos.service.spec.ts` 5). Kiểm tay trên bản offline: lọc ngành, yêu thích, gần đây, của tôi, tổ hợp chữ, đổi màu logo SVG. **Chưa thử** ảnh kho với khóa Pexels thật. |
| 2026-11-14 | S16 | (chưa commit) | Hộp nắp cài (mailer, FEFCO 0427 rút gọn): `shared/src/parametric/mailer.ts` (`generateMailerDieline`, `mailerSizesOf`). Một mảnh, không keo: vách trước và hai vách hông là vách đôi cuộn mép (lớp trong gập 178° để hai lớp 3D không đè nhau), lớp trong hông có 2 tai khóa cài vào khe ở đáy, tai chặn ở hai đầu vách trước / sau, nắp liền vách sau có tai cài và 2 tai chống bụi. Kích thước lòng L × W × H: đáy L + 3t × W + 2t, vách sau H + t, vách ngoài H + t/2, vách trong H − 1 mm. Mặt trước nằm trên đáy ở khuôn để chữ đứng thẳng khi gập; nắp đọc xuôi khi nhìn từ trước. Thêm vào công thức phiên bản 3 (kết cấu mới, không dự án cũ nào dùng nên không cần lên phiên bản). Đăng ký ở `registry.ts`, `BoxStructureType`, seed `BoxTemplate` (`be/prisma/seed-data.ts`, chạy seed để có trong DB), báo giá "Gấp hộp (không dùng keo)" 400đ/hộp, thống kê dashboard, 3 cỡ S/M/L ở bước 1, hình minh họa, 3D (vách lên trước, lớp trong cuộn vào, nắp đóng sau cùng; "Mở nắp" lật nắp ra sau). Mẫu seed: 2 sản phẩm mailer (mỹ phẩm, bánh giao tận nơi) → 32 mẫu tự sinh đạt FitCheck. Test: `mailer-dieline.spec.ts` 17 ca (không đè mặt, đường nằm trong tờ, lòng hộp đúng L × W × H ± 0,5 mm ở 5 cỡ, viền cắt khép kín, không keo, nắp nằm trên, lớp trong quay mặt in vào trong, báo giá, FitCheck). Kiểm tay: khuôn 2D, gập 3D, mở nắp, logo SVG đổi màu hiện đúng trên nắp 3D. **Xử lý lưu ý S14**: thêm 13 bộ mẫu ngành → Nến thơm 25, Trang sức 25 (mọi ngành ≥ 20). `be`: 868/868 test (59 bộ). |
| 2026-11-14 | S17 | (chưa commit) | **Hộp quai xách (gable)**: `shared/src/parametric/gable.ts` (`generateGableDieline`, `gableSizesOf`). Thân như hộp nắp gài (4 mặt + tai dán, đáy gài thường), mặt trước và mặt sau nối lên mái dốc (gập vào 35°) rồi quai đứng (gập ngược lại), hai quai áp lưng nhau cách đúng một độ dày giấy và lỗ xỏ tay trùng nhau. Hai đầu là mặt ngũ giác (vách hông + đầu hồi tam giác liền một mặt), mỗi cạnh dốc có tai đỡ mái gập vào dưới mái (không cần keo; chấm keo tay khi quà nặng), tai vát 45° và tự bỏ khi hộp quá hẹp. Kích thước lòng thân L × W × H như tuck-top. Quy tắc mới: dài tối thiểu 60 mm (`GABLE_MIN_LENGTH_MM`, chỗ khoét lỗ xỏ tay). **Cửa sổ trưng bày**: tùy chọn `window` của `BoxDimensions` (mặc định tắt, dự án cũ không đổi): ô khoét bo góc giữa mặt trước hộp nắp gài hoặc mặt nắp hộp âm dương, cách nếp ≥ 10 mm, bỏ qua khi mặt quá nhỏ (`shared/src/parametric/openings.ts`). Kiểu dữ liệu mới: `PanelFace.outline` (mặt không phải hình chữ nhật) và `DielineGeometry.openings` (cửa sổ, lỗ xỏ tay; lật theo mặt trong). FitCheck: `UNDER_OPENING` (hình dưới cửa sổ / lỗ xỏ tay bị cắt mất: cảnh báo, nền chỉ ghi chú) và giữ hình trong đường viền đầu hồi (`CUT_OVERLAP`). Báo giá: "Màng PET cửa sổ" 900đ/hộp, gấp dán hộp quai xách 700đ/hộp. 3D: mặt vẽ theo đường viền và khoét lỗ (`THREE.ShapeGeometry`), gable dựng vách trước rồi gập mái, "Mở mái" mở mái ra ngoài. Khuôn 2D tô ô cửa sổ "CỬA SỔ (MÀNG PET)". Bước 2 có thẻ "Cửa sổ trưng bày" cho hộp nắp gài và âm dương; API nhận `dimensions.window`. Đăng ký ở `registry.ts`, `BoxStructureType`, seed `BoxTemplate` (chạy seed để có trong DB), thống kê, 3 cỡ S/M/L, hình minh họa, 2 sản phẩm mẫu (hộp quà trà Tết, hộp bánh xách tay). Test: `gable-window-dieline.spec.ts` 20 ca (không đè mặt, viền khép kín, lòng thân đúng L × W, quai đứng và lỗ xỏ tay trùng nhau, đỉnh đầu hồi nằm đúng nóc, tai đỡ mái nằm trong cột của nó, quy tắc dài tối thiểu, cửa sổ hộp nắp gài / âm dương, không cửa sổ thì khuôn không đổi, giá màng PET, cảnh báo hình dưới cửa sổ cả mặt trong). Kiểm tay: khuôn 2D, gable gập kín ở 3D nhìn từ trước và từ đầu hồi, cửa sổ hiện ở 3D bước 2. |
| 2026-11-14 | S18 | (chưa commit) | **Khay chia ngăn** (`insert`, `shared/src/parametric/insert.ts`): hai phôi — khay lót (`tray.ts`, như đáy hộp âm dương; L × W × H là lòng khay) và tờ vách chia cài chéo kiểu vỉ trứng: vách dọc chạy theo L giữa các hàng, khe từ trên; vách ngang chạy theo W giữa các cột, khe từ dưới; khe sâu nửa chiều cao nên hai vách cài khít, rộng t + 0,3 mm; vách cao H − 2 mm, ngắn hơn lòng 0,5 mm. Số ngăn `BoxDimensions.cells` (hàng 1–4 × cột 1–6, mặc định 2 × 3; 1 × 1 thì không có tờ vách), chọn ở thẻ "Số ngăn" bước 2, API nhận `dimensions.cells`. 3D: vách không có bản lề nên được đặt thẳng vào khay theo `insertLayoutOf`, rơi vào khi khay dựng xong, "Nhấc vách ra" nhấc lên. **Sản phẩm phẳng** (`shared/src/parametric/flat.ts`): **thẻ treo** (`hang-tag`, L × H, vát hai góc trên, lỗ xỏ dây Ø5 mm cách mép trên 9 mm; `PanelFace.outline` + `DielineOpening` kiểu mới `hole`), **thiệp gấp đôi** (`folded-card`, L × H khi gấp, bìa sau | bìa trước một nếp cấn, trang trong in bằng "Mặt trong"; 3D đứng gấp, "Mở thiệp" mở ra), **đai giấy bọc hộp** (`belly-band`, quấn hộp phủ bì L × W × H qua mặt trên, hai đầu, đáy, dán mép dưới đáy; đoạn = cạnh hộp + t + 0,5 mm, bản rộng ≈ 40 % W trong 20–80 mm; 3D là vòng đai). Bước 2: thẻ và thiệp chỉ hỏi Ngang × Cao (ẩn Rộng, nhãn và gợi ý riêng), đai và khay có gợi ý đo riêng; sản phẩm phẳng ẩn "Món quà mẫu" và dòng phủ bì. Báo giá: nhãn công đoạn cuối theo sản phẩm ("Dán khay và cài vách chia ngăn" 1.200đ/bộ, "Đục lỗ và xỏ dây" 300đ/thẻ, "Cấn nếp và gấp thiệp" 150đ, "Dán đai" 200đ), đơn vị "bộ / thẻ / thiệp / đai" thay cho "hộp"; tem nhãn (`sticker-label`) không còn dòng "Gấp và dán". FitCheck: hình trên lỗ xỏ dây → `UNDER_OPENING`. Mẫu seed: thẻ treo trang sức, thiệp cảm ơn, đai hộp bánh (226 mẫu, 0 bị loại; vùng an toàn của mẫu tránh lỗ xỏ dây). Đăng ký `registry.ts`, `BoxStructureType`, seed `BoxTemplate` 4 kết cấu (thẻ và thiệp có giới hạn kích thước riêng; chạy seed), thống kê, bước 1 với S/M/L, hình minh họa. Test: `insert-flat-dieline.spec.ts` 14 ca (khay lòng đúng L × W, số vách, ô đều, khe đúng vị trí và cài khít, giới hạn lưới, thẻ treo / thiệp / đai: viền khép kín, kích thước khi gấp, mặt in quay ra ngoài, lỗ xỏ dây, giá). `be`: 970/970 test (61 bộ). Kiểm tay: khay 2 × 3 → 3 × 4 cập nhật trực tiếp ở 3D, thẻ treo, thiệp, đai ở 3D bước 2. |
| 2026-11-14 | S19 | (chưa commit) | **Video / GIF hộp gập** ở bước 5 ("Video hộp gập", dưới "Tải ảnh mockup"). Kịch bản 7 giây (`fe/src/features/studio/utils/film.ts`, `filmPose`): khuôn phẳng → gập kín ở giữa clip → giữ → mở nắp, camera xoay chậm 1,5 rad quanh hộp và tiến lại gần khi khuôn gập nhỏ lại. Sân khấu 3D có `filmRef` (`InteractiveFoldingBox3D`): `start()` tạm dừng vòng lặp trực tiếp, `frame(t)` đặt độ gập, nắp, camera rồi vẽ, `end()` trả camera và độ gập như cũ (đã kiểm: khoảng cách, tâm, bán kính khung y nguyên). Mỗi khung vẽ lên canvas vuông: nền bối cảnh đang chọn, hộp cắt vuông giữa sân khấu, chữ ký "Thiết kế với WrapFit" (`paintScene` / `paintSignature` tách từ `mockup.ts`, ảnh mockup dùng chung). **Video**: `MediaRecorder` trên `canvas.captureStream`, đẩy từng khung bằng `requestFrame`, 30 fps, 720 × 720, ~6 Mbit/s; WebM VP9 → VP8 → MP4 (Safari) tùy trình duyệt; trình duyệt không ghi được thì nút báo "Không hỗ trợ". **GIF**: bộ mã hóa tự viết, không thêm thư viện (`shared/src/media/gif.ts`: bảng màu 255 màu median cut trên histogram 15 bit, nén LZW, điểm ảnh không đổi so với khung trước ghi trong suốt; `GifWriter` ghi từng khung để trang không đứng), 12 fps, 400 × 400, lặp mãi. Tải về ngay, kèm ô xem trước nhỏ (không kéo giãn sân khấu 3D) và "Tải lại"; file > 10 MB thì cảnh báo. `prefers-reduced-motion`: xem trước không tự chạy (video có nút điều khiển, GIF bấm "Xem GIF" mới hiện). Đo trên trình duyệt (hộp nắp gài 100 × 60 × 150, Studio tối giản): GIF 84 khung, 6,72 giây, 0,5–0,7 MB, tạo trong 2,3 giây; WebM 6,99 giây, 720 × 720, 1,27 MB, quay 7,5 giây; xem 5 khung của video: khuôn phẳng đủ trong khung, gập, hộp kín, mở nắp. Test: `gif-encoder.spec.ts` 3 ca (LZW giải nén lại đúng với chuỗi dài, nhiễu, đặt lại bảng mã; bảng màu ≤ 255 màu sát màu gốc; file GIF89a lặp, từng khung giải mã đúng, điểm ảnh không đổi là trong suốt). `be`: 973 test, 971 đạt khi chạy cả bộ; 2 test xuất file in quá 5 giây do máy tải nặng, chạy riêng đạt 56/56. |
| 2026-11-14 | S20 | (chưa commit) | **Đổi kích thước thông minh** (`shared/src/canvas/reflow.ts`): đổi kích thước hộp (hoặc kết cấu, công thức) thì mỗi phần tử giữ chỗ trên mặt của nó theo `anchor`: trái / giữa / phải / giãn theo mặt × trên / giữa / dưới / giãn. Phần tử chưa có neo được suy ra theo một phần ba của mặt mà tâm nó nằm trong (chiếm ≥ 85 % thì giãn). Thứ gì không còn vừa mặt nhỏ hơn thì được thu nhỏ và kéo về vùng an toàn (`autoFixElements`, chỉ cho phần tử vừa dời). Nền vẫn do `refitBackgrounds`. Gắn vào effect "pieces đổi" của `StudioWorkspace`. Mẫu tự sinh ghi neo rõ cho mọi phần tử trừ nền (`withAnchors`). Inspector có "Neo khi đổi kích thước hộp" (ngang / dọc, mặc định tự động). **AI xóa nền, tăng độ phân giải trên mọi ảnh của thiết kế**: các công cụ AI (`XU_TOOL_COST`: xóa nền 5 xu, phóng to 20 xu) trước chỉ chạy trên ảnh AI; giờ chạy được trên ảnh tải lên của chính người dùng: `POST /ai/images/uploads/:tool` với URL hoặc khóa của ảnh (`AiImageService.runToolOnUpload`: chỉ file IMAGE / LOGO của người đó, PNG / JPEG / WebP; phóng to bị từ chối khi ảnh đã đủ lớn), cột mới `ai_image_jobs.source_file_id` (migration `20261114000200_ai_tool_uploads`, `prisma generate`; cần `migrate deploy` trên DB), worker đọc kích thước từ file. Studio: khối "Công cụ AI" trong inspector ảnh (`ImageAiTools`): chờ job xong rồi thay ảnh trong khung, giữ vị trí và cỡ; ảnh in mờ thì nút phóng to nổi bật; Ctrl+Z quay lại; bản offline có handler giả. Test: `smart-resize.spec.ts` 6 ca (kịch bản 15: 90×90×110 → 120×80×60, tiêu đề vẫn giữa mặt trước, logo vẫn ở góc trên; neo phải / dưới / giãn; thu nhỏ khi không vừa; nền, phần tử ẩn, mặt không đổi, mặt biến mất; suy neo; mẫu có neo), `ai-image.service.spec.ts` +3 ca (tính xu theo file tải lên, từ chối file người khác / URL ngoài / SVG, phóng to ảnh nhỏ và từ chối ảnh lớn), `ai-image.processor.spec.ts` +1 ca. Kiểm tay: kịch bản 15 trên studio (tiêu đề ở X 27,2 → 42,2 mm, tâm đúng giữa mặt 120,4 × 60,4). Công cụ AI trên ảnh tải lên chưa thử với fal.ai thật. |
| 2026-11-14 | S21 | (chưa commit) | **FitCheck mở rộng** (`shared/src/fitcheck/reading.ts`, `validator.ts`). **Hướng đọc** không cần thêm vào từng generator: tính từ bản lề của khuôn (`uprightRotationOf`): chữ trên vách đọc với đầu chữ hướng lên trời, trên mặt nắp đọc từ phía trước (đầu chữ hướng ra sau), trên mái dốc đọc theo chiều dốc; đáy hộp và mảnh không bản lề không xét. Chữ ngược sau khi gấp → cảnh báo `READING_DIRECTION` kèm `fix: { rotation }`; chữ nằm nghiêng 90° → ghi chú. Phát hiện thật: nắp hộp nắp gài và vách sau hộp nắp cài phải xoay 180° → mẫu tự sinh nay xoay sẵn chữ (`turnTextsUpright`); "Tự sửa" cũng xoay. Drawer FitCheck có nút "Xoay chữ cho đúng chiều" cho từng lỗi có `fix`. **Chữ < 6 pt** (`TEXT_TOO_SMALL`), **tương phản** chữ / màu đặc bên dưới < 3:1 (`LOW_CONTRAST`, chỉ khi biết màu nền: khối hình hoặc nền có `fillColor` phủ kín chữ), **chữ vắt qua nếp gấp trong mặt** (`TEXT_ON_CREASE`; nếp ở cạnh mặt đã có `CREASE_OVERLAP`). Bước 6 có thêm mục "Hướng đọc", "Chữ dễ đọc", "Cửa sổ & lỗ khoét". **Khối thông tin nhãn hàng hóa** (`shared/src/library/product-label.ts`): kiểu chữ dựng sẵn 7 pt với các mục thường gặp (tên hàng, tổ chức chịu trách nhiệm, xuất xứ, định lượng, ngày sản xuất, hạn dùng, thành phần, hướng dẫn, cảnh báo) và lời ghi "người bán tự chịu trách nhiệm nội dung nhãn" ngay dưới (Q2 vẫn chờ người có chuyên môn đối chiếu NĐ 43/2017, NĐ 111/2021). Test: `fitcheck-reading.spec.ts` 7 ca (kịch bản 16 và nút sửa, vách ngược / nghiêng / mặt trong, hướng "lên" của các kết cấu, mẫu không có chữ ngược, < 6 pt, tương phản, nếp gấp trong mặt). Kiểm tay: kịch bản 16 trên studio (cảnh báo hiện, bấm sửa → 180°, 100/100, nhìn 3D từ trên chữ đọc xuôi). `be`: 990 test, 989 đạt khi chạy cả bộ; 1 test xuất file in quá 5 giây do máy tải nặng, chạy riêng đạt 56/56. |

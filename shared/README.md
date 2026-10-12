# 📐 @wrapfit/shared — Core Packaging Math & Types

> **Phụ trách chính**: 👤 **IT 2** (Core Engineering & Print Physics)  
> **Nhiệm vụ**: Thư viện chứa các định nghĩa kiểu dữ liệu chung (TypeScript Types), công thức toán học hình học phẳng (Parametric Dieline) và bộ luật kiểm duyệt in ấn (FitCheck™ Validation).

---

## Cấu trúc thư mục `shared/`:

```text
shared/
├── src/
│   ├── types/                  # Các giao diện hợp đồng chung
│   │   ├── dieline.ts          # Tọa độ mặt hộp, nét cấn, nét cắt, bản lề gấp (fold)
│   │   ├── project.ts          # Dự án bao bì, phần tử đồ họa
│   │   └── fitcheck.ts         # Cấu trúc báo cáo lỗi in ấn
│   ├── parametric/             # Động cơ toán học tính tọa độ hộp
│   │   ├── registry.ts         # generateDielinePieces(cấu trúc, kích thước, formulaVersion), CURRENT_FORMULA_VERSION
│   │   ├── tuck-top.ts         # Hộp nắp gài (bản 3); tuck-top.v1.ts, tuck-top.v2.ts đóng băng
│   │   ├── pillow.ts           # Hộp gối (bản 3) + pillowShapeOf (dùng chung với 3D); pillow.v1.ts đóng băng
│   │   ├── lid-base.ts         # Hộp âm dương (bản 3); lid-base.v1.ts đóng băng
│   │   ├── sleeve-drawer.ts    # Hộp bao diêm (bản 3); sleeve-drawer.v1.ts đóng băng
│   │   ├── tray.ts             # Khay 1 tờ (đáy, 4 thành, 4 tai dán) của âm dương / bao diêm
│   │   ├── segments.ts         # Bộ ghi nét cắt / gấp, lấy điểm trên đường cong (DXF)
│   │   └── fold.ts             # Gấp phôi thành 3D từ bản lề của các mặt (panelTransforms, foldedSize)
│   ├── fitcheck/               # Động cơ kiểm duyệt in ấn
│   │   └── validator.ts        # Kiểm tra Bleed, Safe Margin, DPI
│   ├── print/text-layout.ts    # Mô hình chữ chung của canvas và file in
│   ├── core/contracts.ts       # Phác thảo thiết kế, không export, không dùng
│   └── index.ts                # Entrypoint xuất ra cho fe và be
├── scripts/render-dielines.mjs # Vẽ phôi 4 cấu trúc × 4 cỡ ra SVG / PNG (docs/14)
├── package.json
└── tsconfig.json
```

## Phiên bản công thức

Mỗi dự án chốt `formulaVersion` lúc tạo; luôn dựng phôi bằng `generateDielinePieces(templateId, dimensions,
formulaVersion)`, không gọi thẳng `generateTuckTopDieline`… Đổi công thức = thêm phiên bản: chép file đang dùng thành
`<tên>.v<N>.ts` (đóng băng, không sửa nữa), sửa file gốc, đăng ký bản mới trong `registry.ts`, tăng
`CURRENT_FORMULA_VERSION`, thêm tóm tắt vào `FORMULA_CHANGES`, rồi chạy `npm --workspace=be run db:seed` (gán bản mới
cho box template). Test: `be/src/projects/domain/dieline-geometry.spec.ts`.

## Quy ước kích thước (từ bản 3)

- `length × width × height` (L × W × H) là **lòng trong** của hộp: món quà kích thước đó phải vừa.
- `paperThickness` = `t` (mm) ≈ GSM × 0,0014 (300 GSM ≈ 0,42 mm).
- Nét gấp nằm giữa bề dày giấy: mặt phủ một kích thước lòng trong D giữa hai thành rộng **D + t**; thành đứng trên một
  đáy cao **H + t/2** (tính từ nét gấp đáy tới mép).
- Tai dán nằm trong thành chiếm thêm 2t theo chiều dài (hộp âm dương, khay bao diêm: đáy dài **L + 3t**).
- Hai mảnh lồng nhau: mặt trong của nắp / vỏ = mặt ngoài của đáy / khay + **1 mm** (`LID_CLEARANCE_MM`,
  `SLIDE_CLEARANCE_MM`).
- Hộp gối: mặt cắt là thấu kính dây cung W + t, hai cung cao (H + t) / 2; mỗi mặt rộng bằng một cung; L đo giữa hai
  nếp cong (`pillowShapeOf`).

Chi tiết từng cấu trúc và kết quả rà soát: `docs/14_BOX_FORMULA_AUDIT.md`.

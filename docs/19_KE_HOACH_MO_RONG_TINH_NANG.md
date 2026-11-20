# 19. Kế hoạch mở rộng tính năng: đơn in, hoa hồng, kết nối xưởng, vật liệu, cộng đồng mẫu, Brand Kit, editor, khuôn tùy chỉnh

> Ngày lập: 2026-11-20 · Đối chiếu trên `develop` (a0a3821) ngày 2026-11-20 · Trạng thái: **đang làm**, đợt 1 có mã trên nhánh `feat/print-partner-flows` (xem "Tiến độ" ngay dưới). Không đụng 6 bước studio và workspace chính (thành viên khác đang làm).
> Phạm vi: phần [14](14_PRICING_ENTITLEMENTS_SPEC.md) ghi là "không thuộc phạm vi" (chợ in ấn, đối tác xưởng in), cộng thêm các phần editor và khuôn. Tài liệu này **không lặp lại** đặc tả đã có ở [14](14_PRICING_ENTITLEMENTS_SPEC.md) Phần C (hoàn tiền thuê bao, affiliate, hóa đơn điện tử, báo cáo vi phạm, nhật ký ghi thêm); chỗ nào dùng lại sẽ dẫn link tới đó.
> Việc còn mở liên quan ở [18](18_VIEC_CON_TREO_SAU_AUDIT_BE.md): mục 7 (VNPay báo trả tiền cho đơn đã hủy), mục 22 (file in chưa in thử 1:1 tại xưởng) và các câu hỏi chờ xưởng ở §6.

Quy ước trong tài liệu:

- **BR-xx**: ràng buộc nghiệp vụ (business rule). Hệ thống phải chặn hoặc cảnh báo, không chỉ "nên".
- **MF**: luồng chính. **AF-xx**: luồng thay thế (vẫn thành công theo đường khác). **EF-xx**: luồng ngoại lệ (lỗi, hủy, tranh chấp).
- Giá trị trong `[ ]` là **đề xuất**, cần nhóm hoặc xưởng đối tác chốt (tổng hợp ở mục 9).
- Dẫn chứng code ghi dạng `đường/dẫn:dòng`, đã kiểm lại từng dòng trên `develop` (a0a3821). Mục 0 mô tả `develop` **trước** đợt 1.

## Tiến độ

### Đợt 1 (2026-11-20): xưởng trong DB, phí nền tảng theo đơn, sổ cái, chọn xưởng thật

| Việc | Mã | Đã kiểm |
|---|---|---|
| Bảng `print_shops` thay mảng viết cứng; 4 xưởng cũ giữ id; id lạ trong đơn cũ thành xưởng `PAUSED` giữ chỗ (B.1, BR-B1) | `be/prisma/migrations/20261120000100_print_partners`, `be/src/print-shops/print-shops.service.ts` | 44 migration chạy trên Postgres trong bộ nhớ (PGlite), có đơn cũ để kiểm backfill |
| Trạng thái `ACTIVE / REVIEW / PAUSED / SUSPENDED`, `pausedUntil`, `probationUntil`, năng lực (khổ, phương pháp, giấy, gia công, PET, số lượng, công suất, vùng giao) | như trên | Unit test |
| `print_shop_members.role` `OWNER / STAFF` (BR-B6); chưa có màn hình dùng | migration | – |
| Phí nền tảng chụp theo đơn: `platform_fee_bps / _vnd`, `shop_payable_vnd`, CHECK `payable = total − phí`; đơn cũ backfill 15 % (BR-A3, BR-A4) | `shared/src/partners/fees.ts`, `be/src/orders/orders.service.ts` | Unit test; CHECK thử trên PGlite |
| Khách không thấy phí; ADMIN và xưởng thấy trong danh sách đơn | `orders.service.ts` (`staff`) | Unit test |
| Sổ cái `ledger_entries` chỉ ghi thêm (trigger chặn UPDATE / DELETE), khóa `key` chống ghi trùng; `CUSTOMER_PAYMENT` khi đơn PAID, `PLATFORM_FEE` + `SHOP_PAYABLE` khi DELIVERED; backfill đơn cũ (A.8) | `be/src/orders/ledger.ts`, migration | Unit test; trigger, khóa trùng, ghi chú bắt buộc thử trên PGlite |
| Danh sách 34 tỉnh / thành, khoảng cách | `shared/src/partners/provinces.ts` | Unit test |
| Chọn xưởng: lọc cứng + điểm (giá 0.4, thời gian 0.3, chất lượng 0.2, khoảng cách 0.1), hàng đợi làm chậm ngày in, thưởng xưởng từng đặt, xoay vòng khi điểm lệch dưới 2 %, ngày nhận cụ thể theo ngày làm việc giờ Việt Nam (G.3) | `shared/src/partners/matching.ts`, `POST /orders/sample/match` | Unit test; bản demo offline trên trình duyệt |
| Đơn không chọn xưởng đi xưởng được đề xuất (không còn luôn là TP.HCM); xưởng đã chọn được kiểm lại lúc đặt: `400 PRINT_SHOP_UNAVAILABLE` / `NO_PRINT_SHOP` kèm lý do (BR-G12, BR-G16, AF-G1) | `orders.service.ts` | Unit test |
| Danh sách xưởng công khai không còn số điện thoại / email; số xưởng hiện cho khách từ `IN_PRODUCTION` (G.4) | `print-shops.service.ts`, `orders.service.ts` | Unit test |
| Giỏ hàng: chọn tỉnh, thẻ so sánh xưởng (ngày nhận, khoảng cách, đánh giá, lý do đề xuất), xưởng bị loại kèm lý do, tên xưởng hiện trước khi thanh toán; bỏ câu "xưởng sẽ gọi xác nhận" (BR-G20) | `fe/src/features/print-shops/ShopPicker.tsx`, `fe/src/views/cart/index.tsx` | Demo offline: chọn Hà Nội → Hà Thành 4 km lên đầu; đặt đơn thử đi đúng xưởng |
| Bỏ danh sách xưởng demo khi API lỗi (BR-G13); demo offline trả các route này từ mock API dùng cùng hàm chọn xưởng | `fe/src/api/print-shops`, `fe/src/services/mock-api/handlers/printShops.ts` | Demo offline |
| Trang admin xưởng: tỷ lệ phí, hàng đợi, đổi trạng thái; cột phí nền tảng trong bảng đơn | `fe/src/views/admin/print-shops/index.tsx`, `GET / POST / PATCH /admin/print-shops` | Type-check; **chưa mở trên trình duyệt** |

Mặc định đã chọn khi chưa có câu trả lời (đổi được sau):

- **Q-A2:** đơn in mẫu cũng tính phí nền tảng theo tỷ lệ của xưởng.
- **BR-A11:** đợt 1 ghi `PLATFORM_FEE` / `SHOP_PAYABLE` lúc DELIVERED. Hạn khiếu nại 3 ngày và trạng thái `COMPLETED` đến cùng đơn sản xuất (đợt 3).
- **Q-G3:** trọng số và ngưỡng xoay vòng 2 % như mục G.3. Hệ quả thấy trên demo: khi chưa chọn tỉnh, xưởng "từng đặt" có thể đứng trên xưởng giao sớm hơn một ngày vì hai điểm lệch dưới 2 %.
- **BR-G15:** tỉnh / thành bắt buộc trên giỏ hàng; API vẫn nhận đơn không có tỉnh (script e2e cũ), khi đó không xét khoảng cách.

Chưa kiểm: test e2e của backend (cần Postgres của dự án; Docker không chạy lúc làm). Cách xóa dữ liệu test của e2e đã sửa để xóa được sổ cái (`purgeLedger`).

### Đợt kế tiếp

- **Đợt 2:** cổng xưởng `/partner` (hàng đợi, nhận / từ chối, mã vận đơn, quét QR), tin nhắn trong đơn, theo dõi đơn đủ bước, thông báo.
- **Đợt 3:** đơn sản xuất theo báo giá, cọc, hoàn tiền, khiếu nại, `COMPLETED`, đối soát và báo cáo tài chính.
- **Đợt 4:** kiểm duyệt mẫu cộng đồng, Brand Kit ở trang hồ sơ (phần áp lên hộp chờ studio).

---

## 0. Hiện trạng đã kiểm tra trong code

| Mảng | Đã có | Chưa có |
|---|---|---|
| Đơn in | Chỉ **đơn in mẫu**: 1–10 hộp/thiết kế, giá cố định 49.000đ + 25.000đ/hộp thêm (`be/src/orders/orders.service.ts:22`). Vòng đời `PENDING_PAYMENT → PAID → IN_PRODUCTION → SHIPPED → DELIVERED`, hủy được trước khi in (`be/src/orders/order-status.ts:7`). Chuyển trạng thái chống tranh chấp bằng update có điều kiện (`orders.service.ts:275`). Thông tin xuất hóa đơn VAT `{ company, taxCode, email }` được chụp vào từng thanh toán ([18](18_VIEC_CON_TREO_SAU_AUDIT_BE.md) §7). | **Đơn in sản xuất** theo báo giá (số lượng lớn, offset/digital). Hoàn tiền: không có mã; [14](14_PRICING_ENTITLEMENTS_SPEC.md) §7.1 mới đặc tả cho thuê bao, chưa có cho đơn in. Phí ship (luôn 0). Khiếu nại hàng lỗi. Hóa đơn điện tử (chưa xuất). |
| Duyệt mẫu | **Đã có** link duyệt mẫu cho khách / xưởng: góp ý ghim theo mặt hộp, "Duyệt in phiên bản n", sửa thiết kế sau khi duyệt thì `409 DESIGN_CHANGED` ([06](06_FE_INTEGRATION_GUIDE.md) §8.2). | Chưa gắn với đơn in: xưởng không gửi được bản proof qua đơn, duyệt không chặn được bước in. |
| Hoa hồng 15% | Chỉ trong báo giá: `partnerShare: 0.15`, `commissionVnd` (`shared/src/pricing/quote.ts:89`, `:294`). Giá trong báo giá là **giả định demo** (`quote.ts:10`). | Bảng `orders` không lưu hoa hồng. Không sổ cái, không đối soát, không chi trả cho xưởng, không báo cáo tài chính. |
| Xưởng đối tác | 4 xưởng **viết cứng** trong `be/src/print-shops/print-shops.service.ts:23`, có trạng thái `active / review / paused`. Tài khoản `PRINT_SHOP` gắn 1 xưởng (`PrintShopMember`), chỉ được chuyển bước in / giao / đã giao. | Xưởng trong DB, hồ sơ đăng ký, năng lực máy, bảng giá riêng, nhận / từ chối đơn, nhiều nhân viên, đánh giá xưởng. |
| Cộng đồng mẫu | Dự án `PUBLIC` có dịp + ngành và FitCheck ≥ 90 **tự động** hiện trong Thư viện mẫu (`be/src/projects/domain/project-fitcheck.ts:24`, `be/src/templates/templates.service.ts:60`). Remix (`allowFork`), thông báo khi bị remix, ẩn nguồn `UNLISTED` khỏi bản remix (`be/src/public-showcase/public-projects.service.ts:78`). Báo cáo vi phạm, `hidden_at`, giấy phép remix theo gói đã có **đặc tả, chưa có mã** ([14](14_PRICING_ENTITLEMENTS_SPEC.md) §7.4). | Kiểm duyệt bởi người trước khi niêm yết, phiên bản đã duyệt cố định, kiểm soát logo / font của tác giả khi remix, thưởng cho người tạo mẫu. |
| Brand Kit | 1 logo, 3–5 màu, ≤ 3 font, slogan ≤ 150 ký tự (`fe/src/features/profile/brandKit.ts:7`). | Biến thể logo, gradient, họa tiết, kiểu chữ, nhiều bộ, áp cả bộ lên hộp. |
| Độ mờ / gradient | Độ mờ cho phần tử thường (`fe/src/features/studio/components/inspector/ElementInspector.tsx:300`). Gradient cho hình, UI chỉ 2 điểm màu (`ElementInspector.tsx:665`) dù kiểu dữ liệu cho phép nhiều điểm (`shared/src/types/project.ts:69`). | Nền theo mặt không có độ mờ hay gradient: `setPanelBackground` chỉ giữ `content` (`shared/src/canvas/elements.ts:243`). |
| Tràn qua mặt | Phần tử thường được vẽ tràn qua mặt kề **trong cùng một tấm** (`shared/src/canvas/elements.ts:167`), FitCheck cảnh báo khi đè nếp gấp. | Tem vắt qua **hai tấm khác nhau** (nắp và đáy), tem niêm phong là sản phẩm in riêng. |
| Khuôn / lỗ / PET | 12 cấu trúc theo công thức. Lỗ (`window / handle / hole / cup`) do công thức sinh ra (`shared/src/types/dieline.ts`, `shared/src/parametric/openings.ts`). Cửa sổ PET chỉ là công tắc ở `tuck-top` và `lid-base`. FitCheck đã xóa artwork nằm trong lỗ (`shared/src/fitcheck/validator.ts:30`). | Lỗ do người dùng đặt, PET cho cấu trúc khác, thêm mặt, nhập khuôn DXF/SVG, vẽ khuôn tự do. |

> Đính chính so với bản trước: mẫu cộng đồng **đã** lên Thư viện mẫu (tự động, theo điểm FitCheck). Phần thiếu là kiểm duyệt và quản trị nội dung, không phải "chưa có chia sẻ".

### Ràng buộc chung cho mọi mảng

- **BR-G1 – Một nguồn tính toán.** Mọi phép tính hình học, FitCheck, báo giá, hoa hồng nằm trong `shared/`, để studio, demo offline và API cho cùng một kết quả. Server **luôn tính lại**, không tin số client gửi lên.
- **BR-G2 – Hai bộ render phải khớp.** Tính năng nào thay đổi bản in phải sửa cả `be/src/export/rendering/print-renderers.ts` (PDF/SVG/DXF) và `fe/src/features/studio/components/export/offline/renderers.ts`, kèm 3D (`three/boxModel.ts`). Nếu không, màn hình và bản in sẽ lệch nhau.
- **BR-G3 – Tương thích ngược.** Dự án cũ mở ra không đổi: tăng `CANVAS_SCHEMA_VERSION` và nâng cấp trong `normalizeCanvas`. Dieline giữ `formulaVersion` đã chốt.
- **BR-G4 – Tiền là số nguyên VND.** Làm tròn theo `round100` như báo giá. Không lưu số thực.
- **BR-G5 – Không sửa bản ghi tài chính đã chốt.** Mọi điều chỉnh là bút toán mới.
- **BR-G6 – Tài khoản demo** (`isDemo`, VNPay sandbox) bị loại khỏi mọi báo cáo tài chính.
- **BR-G7 – Múi giờ.** Kỳ báo cáo, kỳ đối soát và mã đơn tính theo giờ Việt Nam (UTC+7), giống `newOrderCode` (`orders.service.ts:355`).

---

## A. Đơn in sản xuất và hoa hồng

### A.1 Phạm vi

- Trong phạm vi: đơn in sản xuất theo báo giá, duyệt bản in thử, cọc / thanh toán, hủy, hoàn tiền, khiếu nại, ghi nhận hoa hồng.
- Ngoài phạm vi: tích hợp hãng vận chuyển (xưởng tự gửi, nhập mã vận đơn tay), hóa đơn điện tử tự động (xem câu hỏi Q-A3).

### A.2 Tác nhân

Khách (chủ shop), Xưởng (`PRINT_SHOP`: chủ xưởng / nhân viên), Admin WrapFit, Hệ thống (job định kỳ, webhook SePay).

### A.3 Ràng buộc nghiệp vụ

| Mã | Ràng buộc |
|---|---|
| BR-A1 | Hai loại đơn: `SAMPLE` (giữ luật hiện tại, 1–10 hộp) và `PRODUCTION` (số lượng `[50]` – `[10.000]`). Không trộn hai loại trong một đơn. |
| BR-A2 | Giá đơn sản xuất do **server** tính lại từ bảng giá của **xưởng được chọn** (mục B), không dùng `QUOTE_PRICES` giả định. Báo giá có hạn `[7 ngày]`; hết hạn phải báo giá lại. |
| BR-A3 | Đơn lưu ảnh chụp lúc đặt: tỷ lệ hoa hồng, phiên bản bảng giá, các dòng báo giá, `platformFeeVnd`, `shopPayableVnd = total − platformFee`. Đổi tỷ lệ sau đó không ảnh hưởng đơn cũ. Trong dữ liệu gọi là **phí nền tảng** (`platformFee`), không dùng chữ `commission`, vì [14](14_PRICING_ENTITLEMENTS_SPEC.md) §6.2 đã dành bảng `commissions` cho hoa hồng affiliate. |
| BR-A4 | Cơ sở tính hoa hồng là giá hộp thành phẩm **chưa VAT, chưa phí ship**. Phí ship do xưởng nhập, đi thẳng vào phần của xưởng. |
| BR-A5 | Mỗi dòng đơn khóa một **file in đã xuất** (`ExportJob`) của đúng `projectVersion`. Khách sửa dự án sau khi đặt **không** làm đổi đơn. Muốn đổi phải đi luồng sửa file (AF-A3). |
| BR-A6 | Chỉ đặt được khi thiết kế không còn lỗi FitCheck mức chặn, và kích thước tấm in ≤ khổ máy của xưởng (`maxSheetMm`). |
| BR-A7 | Thanh toán: đơn sản xuất ≤ `[2.000.000đ]` trả đủ 100%; lớn hơn thì cọc `[50%]`, phần còn lại trả trước khi xưởng giao hàng. Mã chuyển khoản VietQR hết hạn sau 15 phút như hiện tại; đơn vẫn chờ thanh toán `[48 giờ]`, sau đó tự hủy. |
| BR-A8 | Xưởng có `[24 giờ làm việc]` để nhận hoặc từ chối đơn đã thanh toán. Quá hạn thì Admin được báo và có thể chuyển xưởng (AF-A2). |
| BR-A9 | Hủy: trước khi xưởng nhận thì hoàn 100%. Sau khi xưởng nhận nhưng chưa in thì hoàn tiền trừ phí đã phát sinh do xưởng kê (ví dụ khuôn bế), có Admin duyệt. Từ `IN_PRODUCTION` trở đi khách không tự hủy được, chỉ đi luồng khiếu nại. |
| BR-A10 | Khiếu nại hàng lỗi / vỡ khi vận chuyển (CP2: 8–10%): trong `[3 ngày]` sau `DELIVERED`, bắt buộc có ảnh. Kết quả là in bù, hoàn một phần hoặc từ chối. |
| BR-A11 | Hoa hồng chỉ được **ghi nhận doanh thu** khi đơn hết hạn khiếu nại (`DELIVERED` + 3 ngày, hoặc khiếu nại đã đóng). Trước đó là "hoa hồng tạm tính". |
| BR-A12 | Mọi lần hoàn tiền sinh bút toán đảo hoa hồng theo đúng tỷ lệ phần bị hoàn. |
| BR-A13 | Affiliate **không** tính trên đơn in, theo [14](14_PRICING_ENTITLEMENTS_SPEC.md) §7.6 (chỉ thuê bao và ghế). Trang `fe/src/app/affiliate/page.tsx:7` đang hứa "hoa hồng 15% trên gói trả phí **và đơn in**", lệch với đặc tả: phải sửa câu chữ, hoặc nhóm quyết định mở rộng affiliate sang đơn in (Q-A6). Nếu mở rộng, hoa hồng affiliate lấy từ phí nền tảng của WrapFit, không vượt quá phần đó và không trừ vào tiền xưởng. |
| BR-A20 | Hoàn tiền đơn in dùng lại khung của [14](14_PRICING_ENTITLEMENTS_SPEC.md) §7.1: yêu cầu hoàn tiền, Admin duyệt, phát sự kiện `payment.refunded`, ghi vào nhật ký chỉ ghi thêm (14 §6.2). Chỉ khác điều kiện được hoàn (BR-A9, BR-A10). |

### A.4 Vòng đời đơn sản xuất (đề xuất)

```
QUOTED ─► PENDING_PAYMENT ─► PAID ─► ACCEPTED ─► PROOF_PENDING ─► PROOF_APPROVED ─► IN_PRODUCTION ─► READY_TO_SHIP ─► SHIPPED ─► DELIVERED ─► COMPLETED
              │                │        │              │                                                     │                       │
              ▼                ▼        ▼              ▼                                                     ▼                       ▼
          CANCELLED      CANCELLED  CANCELLED     ON_HOLD (chờ sửa file) ─► PROOF_PENDING          (chờ trả phần còn lại)        DISPUTED ─► RESOLVED
                         (+refund)  (+refund một phần)
```

- `ACCEPTED`: xưởng nhận đơn, nhập phí ship và ngày dự kiến.
- `PROOF_PENDING`: xưởng tải lên bản kiểm tra trước in (ảnh proof số, hoặc ảnh mẫu thật nếu khách chọn in mẫu).
- `READY_TO_SHIP`: chỉ chuyển sang `SHIPPED` khi đã thu đủ tiền (BR-A7).
- `COMPLETED`: hết hạn khiếu nại, hoa hồng được ghi nhận (BR-A11).
- Đơn mẫu (`SAMPLE`) giữ vòng đời hiện tại, chỉ thêm `COMPLETED` / `DISPUTED`.

### A.5 Luồng chính (MF)

1. Khách mở bước 6 của studio, chọn số lượng, giấy, gia công và xưởng (danh sách đã lọc theo năng lực, mục B).
2. Server tính báo giá theo bảng giá xưởng và trả về mã báo giá kèm hạn.
3. Khách nhập người nhận / địa chỉ và xác nhận. Hệ thống xuất file in (PDF + DXF) cho phiên bản hiện tại và tạo đơn `PENDING_PAYMENT`.
4. Khách quét VietQR. Webhook SePay khớp mã tham chiếu và chuyển đơn sang `PAID` (dùng lại `markPaid` / `lockPayable`).
5. Xưởng thấy đơn trong hàng đợi, nhận đơn, nhập phí ship. Nếu ship > 0, khách được báo và trả phần ship cùng lần thanh toán sau.
6. Xưởng tải proof lên. Khách duyệt bằng luồng **duyệt mẫu theo link đã có** ([06](06_FE_INTEGRATION_GUIDE.md) §8.2): góp ý ghim theo mặt hộp, "Duyệt in phiên bản n", sửa thiết kế sau khi duyệt thì `409 DESIGN_CHANGED`. Phần thêm mới: lần duyệt gắn với dòng đơn, và xưởng chỉ chuyển sang `IN_PRODUCTION` khi dòng đơn đã được duyệt đúng `projectVersion`.
7. Xưởng in, đóng gói, nhập mã vận đơn, giao. Khách hoặc xưởng xác nhận đã nhận.
8. Sau 3 ngày không có khiếu nại thì đơn sang `COMPLETED`: ghi nhận hoa hồng, cộng `shopPayableVnd` vào kỳ đối soát.

### A.6 Luồng thay thế (AF)

- **AF-A1 – Xưởng điều chỉnh giá.** Ở bước 5, xưởng thấy file khác báo giá (thêm gia công, giấy hết hàng) và đề xuất giá mới. Chênh lệch ≤ `[5%]` thì khách chỉ cần bấm đồng ý. Lớn hơn thì khách chọn: chấp nhận (trả thêm, hoặc được hoàn phần dư), đổi xưởng (AF-A2), hoặc hủy và hoàn 100%. Hoa hồng tính lại theo giá mới.
- **AF-A2 – Chuyển xưởng.** Xưởng từ chối, quá hạn BR-A8, hoặc xưởng bị tạm dừng: Admin chọn xưởng khác cùng năng lực. Nếu giá khác thì đi như AF-A1. Lịch sử đơn ghi cả hai xưởng.
- **AF-A3 – Sửa file sau khi đặt.** Khi proof bị từ chối, hoặc xưởng phát hiện lỗi file, đơn sang `ON_HOLD`. Khách sửa dự án và bấm "Gửi bản sửa": hệ thống xuất file mới, cập nhật `projectVersion` của dòng đơn, giữ file cũ trong lịch sử. Giới hạn `[3]` vòng sửa miễn phí. Xưởng chỉ ra lỗi bằng góp ý ghim theo mặt hộp (bảng `design_comments` đã có), không chỉ nhắn chữ.
- **AF-A4 – In mẫu trước rồi in số lượng.** Khách đặt đơn `SAMPLE` trước. Khi đặt đơn sản xuất từ cùng thiết kế và **cùng `projectVersion`**, khách được bỏ qua bước proof và trừ `[100%]` phí mẫu vào đơn. Nếu đã sửa thiết kế thì không được trừ.
- **AF-A5 – Thanh toán sai số tiền hoặc sai nội dung.** Giao dịch rơi vào `BankTransaction` chưa khớp (luồng `unmatchedReason` đã có). Admin khớp tay. Trả dư thì giữ thành số dư hoàn lại; trả thiếu thì đơn vẫn `PENDING_PAYMENT` và báo khách số còn thiếu.
- **AF-A6 – Khách nhận tại xưởng.** Phí ship 0, bỏ bước `SHIPPED`, xưởng xác nhận đã giao kèm ảnh.

### A.7 Luồng ngoại lệ (EF)

- **EF-A1 – Hai thanh toán cho một đơn** (khách quét QR hai lần): `lockPayable` chặn lần thứ hai bằng 409. Khoản tiền về sau trở thành giao dịch chưa khớp, Admin hoàn trả.
- **EF-A2 – Hủy đúng lúc tiền về.** Khóa dòng hiện có đảm bảo chỉ một bên thắng. Nếu hủy thắng thì tiền về sau phải hoàn (sinh yêu cầu hoàn tiền tự động). Hiện tại: VietQR đưa khoản tiền này vào danh sách chưa khớp cho Admin; VNPay **chỉ ghi log**, Admin không thấy ([18](18_VIEC_CON_TREO_SAU_AUDIT_BE.md) mục 7). Phải đóng mục 7 trước khi làm đơn sản xuất.
- **EF-A3 – Xưởng ngừng hoạt động khi đang có đơn `IN_PRODUCTION`.** Admin chuyển xưởng. Chi phí in lại chịu ai là câu hỏi Q-A5. Đơn được gắn cờ trễ hạn.
- **EF-A4 – Khách xóa dự án.** Đã chặn xóa vĩnh viễn khi đơn còn giữ thiết kế (`ORDER_STATUSES_HOLDING_DESIGN`). Cần mở rộng danh sách này cho các trạng thái mới đến hết `IN_PRODUCTION` / `ON_HOLD`.
- **EF-A5 – Khách xóa tài khoản.** Bảng `orders` đã dùng `onDelete: Restrict`, giữ nguyên. Đơn đang chạy chặn việc xóa, đơn đã xong đi luồng ẩn danh hóa.
- **EF-A6 – Khiếu nại bị từ chối, khách không đồng ý.** Khách được kháng nghị một lần, Admin quyết định cuối. Hoa hồng giữ trạng thái tạm tính cho đến khi đóng.
- **EF-A7 – Hoàn tiền thất bại** (số tài khoản khách sai): yêu cầu hoàn ở trạng thái `FAILED`, Admin liên hệ lại. Số tiền vẫn nằm ở khoản phải trả khách, không quay về doanh thu.

### A.8 Sổ cái và đối soát

Bảng mới `LedgerEntry` (chỉ ghi thêm, không sửa, không xóa):

| Loại bút toán | Khi nào | Ảnh hưởng |
|---|---|---|
| `CUSTOMER_PAYMENT` | Thanh toán `PAID` | + tiền giữ hộ |
| `SHOP_PAYABLE` | Đơn `COMPLETED` | + phải trả xưởng (`total − commission + ship`) |
| `PLATFORM_FEE` | Đơn `COMPLETED` | + doanh thu WrapFit (phí nền tảng 15%) |
| `REFUND` | Hoàn tiền thành công | − tiền giữ hộ |
| `PLATFORM_FEE_REVERSAL` | Hoàn tiền / in bù do lỗi xưởng | − doanh thu, theo tỷ lệ |
| `REFERRAL_EXPENSE` | Chỉ khi Q-A6 quyết định tính affiliate trên đơn in | − doanh thu (BR-A13) |
| `PAYOUT` | Admin đánh dấu đã chuyển cho xưởng | − phải trả xưởng |
| `ADJUSTMENT` | Admin điều chỉnh, bắt buộc ghi lý do | ± |

Ràng buộc đối soát:

- **BR-A14** – Kỳ đối soát `[hằng tuần, thứ Hai]` theo xưởng. Bảng kê gồm các đơn `COMPLETED` trong kỳ, các bút toán điều chỉnh và số phải trả.
- **BR-A15** – Bảng kê đi qua `DRAFT → SENT → CONFIRMED (xưởng xác nhận) → PAID`. Xưởng không phản hồi trong `[3 ngày]` thì coi như xác nhận. Bảng kê `CONFIRMED` thì khóa, chênh lệch phát hiện sau đó đưa vào kỳ kế tiếp.
- **BR-A16** – `PAYOUT` bắt buộc có mã giao dịch ngân hàng và ảnh chứng từ. Số tài khoản xưởng hiện được che (chỉ 4 số cuối), chỉ chủ xưởng và Admin tài chính xem đầy đủ.
- **BR-A17** – Số dư phải trả xưởng không âm. Nếu hoàn tiền sau khi đã trả xưởng, phần âm thành công nợ trừ vào kỳ sau.

### A.9 Báo cáo tài chính (Admin)

- Chỉ số theo tháng / quý: GMV (tổng tiền khách trả cho đơn in), doanh thu WrapFit (hoa hồng + phí xuất file 19k + gói Pro + xu Wrap), hoàn tiền, công nợ xưởng, hoa hồng tạm tính và đã ghi nhận.
- Lọc theo xưởng, loại đơn, cấu trúc hộp. Xuất CSV / XLSX.
- **BR-A18** – Số trên báo cáo phải cộng lại khớp với sổ cái. Có một test đối chiếu: tổng bút toán theo kỳ bằng tổng báo cáo.
- **BR-A19** – Chỉ vai trò mới `ADMIN_FINANCE` (hoặc `ADMIN`) xem được báo cáo. Mỗi lần xuất file được ghi nhật ký.

### A.10 Thay đổi dữ liệu

- `Order`: thêm `kind (SAMPLE|PRODUCTION)`, `quoteSnapshot Json`, `priceListVersion`, `platformFeeRate`, `platformFeeVnd`, `shopPayableVnd`, `depositVnd`, `paidVnd`, `trackingCode`, `acceptDeadline`. Thêm các giá trị mới vào enum `OrderStatus`.
- `OrderItem`: thêm `exportJobId`, `revision`.
- Bảng mới: `Quote`, `OrderProof`, `Refund`, `Dispute`, `LedgerEntry`, `Settlement`, `SettlementLine`.
- `PaymentPurpose`: thêm `PRODUCTION_DEPOSIT`, `PRODUCTION_BALANCE`.

### A.11 Tiêu chí nghiệm thu

- Đặt đơn sản xuất bằng giá do client tự sửa thì server trả về giá tính lại. Test: gửi `totalVnd` sai thì bị bỏ qua.
- Hủy, hoàn một phần, in bù đều sinh bút toán đúng. Tổng sổ cái khớp báo cáo (BR-A18).
- Đổi tỷ lệ hoa hồng của xưởng không làm đổi đơn cũ.
- Hai yêu cầu đồng thời (thanh toán + hủy, xưởng nhận + Admin chuyển xưởng) chỉ một bên thắng, bên còn lại nhận 409.

---

## B. Quản lý xưởng đối tác

### B.1 Ràng buộc

| Mã | Ràng buộc |
|---|---|
| BR-B1 | Xưởng chuyển từ mảng `PARTNERS` sang bảng `PrintShop`. Id cũ (`ps-sg-01`…) giữ nguyên để đơn cũ vẫn trỏ đúng (`orders.printShopId`). |
| BR-B2 | Hồ sơ năng lực bắt buộc: phương pháp in (digital / offset), khổ tờ tối đa, loại giấy, gia công (khớp `QuoteFinish`), số lượng tối thiểu / tối đa, công suất `[hộp/ngày]`, khu vực giao, có dán PET hay không (cho mục F). |
| BR-B3 | Một đơn chỉ được giao cho xưởng `ACTIVE` có năng lực phủ **toàn bộ** yêu cầu của đơn: khổ tờ, giấy, gia công, số lượng, PET. |
| BR-B4 | Bảng giá theo xưởng, có phiên bản và ngày hiệu lực. Bản mới chỉ áp cho báo giá tạo sau ngày hiệu lực. Không sửa bản cũ. |
| BR-B5 | Tỷ lệ hoa hồng theo hợp đồng từng xưởng, mặc định 15%, có ngày hiệu lực (BR-A3). |
| BR-B6 | Tài khoản xưởng có vai trò `OWNER` (xem tài chính, bảng kê, cấu hình giá) và `STAFF` (chỉ hàng đợi sản xuất). Mỗi xưởng tối thiểu một `OWNER`. |
| BR-B7 | Xưởng `PAUSED`: không nhận đơn mới, đơn đang chạy vẫn tiếp tục (giống kiểm tra `status !== 'active'` hiện có). Xưởng `SUSPENDED` (vi phạm): đơn chưa in được Admin chuyển xưởng. |
| BR-B8 | Đánh giá xưởng: chỉ khách của đơn đã `DELIVERED`, mỗi đơn một lần, trong `[30 ngày]`. Điểm xưởng là trung bình có trọng số theo số đơn. |

### B.2 Luồng chính: xưởng đăng ký

1. Xưởng điền form đăng ký (thông tin pháp lý, năng lực, bảng giá, tài khoản nhận tiền). Trạng thái `APPLIED`.
2. Admin kiểm tra giấy phép kinh doanh và đặt in thử một file chuẩn của WrapFit. Trạng thái `REVIEW`.
3. Bản in thử đạt (đúng kích thước, đúng đường bế): Admin nhập tỷ lệ hoa hồng theo hợp đồng và kích hoạt. Trạng thái `ACTIVE`.

### B.3 Luồng thay thế / ngoại lệ

- **AF-B1** – Không có xưởng nào phù hợp (ví dụ khổ quá B1, gia công đặc biệt): khách gửi **yêu cầu báo giá riêng (RFQ)**. Admin chuyển cho các xưởng, xưởng trả giá trong `[48 giờ]`, khách chọn một. Sau đó đi tiếp MF-A từ bước 3.
- **AF-B2** – Xưởng tạm hết công suất: tự bật `PAUSED` có ngày mở lại. Khách thấy "tạm ngưng đến …".
- **EF-B1** – Bản in thử không đạt: trạng thái `REJECTED` kèm lý do, xưởng được nộp lại sau `[14 ngày]`.
- **EF-B2** – Xưởng đổi bảng giá khi đang có báo giá còn hạn: báo giá cũ vẫn giữ giá cũ đến hết hạn (BR-B4).
- **EF-B3** – Tỷ lệ trễ hạn hoặc khiếu nại vượt `[10%]` trong 30 ngày: hệ thống báo Admin, Admin quyết định `SUSPENDED`.

---

## C. Cộng đồng mẫu

### C.1 Ràng buộc

| Mã | Ràng buộc |
|---|---|
| BR-C1 | Tách **chế độ hiển thị** (`PRIVATE / UNLISTED / PUBLIC`, đã có) khỏi **trạng thái niêm yết** (mới): `NONE → SUBMITTED → APPROVED / REJECTED → LISTED`. Việc gỡ mẫu dùng cột `hidden_at` theo [14](14_PRICING_ENTITLEMENTS_SPEC.md) §7.4, không thêm trạng thái `HIDDEN` riêng. Link `PUBLIC` vẫn mở được dù mẫu chưa được duyệt. |
| BR-C2 | Điều kiện gửi duyệt: FitCheck ≥ 90 (giữ ngưỡng hiện tại), có dịp + ngành, có ảnh thu nhỏ, tài khoản đã xác minh email, đang có ít hơn `[5]` mẫu chờ duyệt. |
| BR-C3 | Thứ được niêm yết là một **snapshot** (`ProjectSnapshot`), không phải bản đang sửa. Tác giả sửa tiếp không làm đổi mẫu đã duyệt. Muốn cập nhật thì bấm "Gửi bản mới" và duyệt lại. |
| BR-C4 | Chính sách nội dung: không dùng logo hay nhãn hiệu của bên khác, không nội dung phản cảm, không số điện thoại / địa chỉ cá nhân, mã QR chỉ trỏ tới link đã kiểm tra. Ảnh kho Pexels không được là nội dung chính (đã có luật `STOCK_PHOTO_ALONE`). |
| BR-C5 | Khi remix: logo / slogan lấy từ Brand Kit của tác giả bị thay bằng ô chờ. Font tác giả tự tải lên **không** được sao chép (giấy phép font), bản remix tự đổi sang font có sẵn và hiện cảnh báo. |
| BR-C6 | Tác giả xóa dự án gốc không được làm vỡ ảnh của bản remix. Hiện `fork` chép nguyên `canvasState` (vẫn trỏ tới file của tác giả, `be/src/projects/application/projects.service.ts:219`), và tham chiếu file được ghi theo từng dự án (`syncProjectFileRefs`, `be/src/projects/infrastructure/project-file-refs.ts:18`), nên nhiều khả năng file đã được giữ lại. **Cần một test xác nhận**: xóa vĩnh viễn bản gốc thì ảnh của bản remix vẫn còn. |
| BR-C7 | Tác giả chuyển mẫu về `PRIVATE` hoặc tắt `allowFork`: mẫu bị gỡ khỏi thư viện ngay, các bản remix cũ vẫn là của người remix, link nguồn bị ẩn (giống cách đang làm với `UNLISTED`). |
| BR-C8 | Báo cáo vi phạm làm theo [14](14_PRICING_ENTITLEMENTS_SPEC.md) §7.4: `POST /api/public/projects/:slug/report` (5 lần / giờ / IP), Admin chọn `HIDE` hoặc `KEEP`, mục tiêu xử lý trong 48 giờ. **Phần thêm đề xuất**: đủ `[3]` báo cáo từ tài khoản khác nhau thì tự đặt `hidden_at` trong lúc chờ Admin. Điều này khác 14 (14 chỉ để Admin quyết), cần nhóm chọn (Q-C4). |
| BR-C10 | Giấy phép remix theo gói (`fork_license` PERSONAL / COMMERCIAL) làm theo [14](14_PRICING_ENTITLEMENTS_SPEC.md) §7.4. Mẫu niêm yết hiện rõ giấy phép bản remix sẽ nhận theo gói hiện tại của người xem. |
| BR-C9 | Thưởng cho người tạo mẫu (nếu làm): `[x xu Wrap]` mỗi khi bản remix **trả phí** (xuất file hoặc đặt in). Không tính khi người remix là chính tác giả hoặc cùng thiết bị / thanh toán. Trần `[y xu/tháng]`. |

### C.2 Luồng chính

1. Tác giả mở hộp thoại Chia sẻ, chọn `PUBLIC`, gắn dịp + ngành, bấm "Gửi lên Thư viện mẫu".
2. Hệ thống kiểm tra BR-C2, tạo snapshot, trạng thái `SUBMITTED`.
3. Admin duyệt theo checklist BR-C4: `APPROVED → LISTED`.
4. Người khác xem mẫu, bấm "Dùng mẫu này" để remix (áp BR-C5, BR-C6). Tác giả nhận thông báo (đã có).

### C.3 Luồng thay thế / ngoại lệ

- **AF-C1 – Duyệt tự động có điều kiện.** Tác giả có ≥ `[3]` mẫu đã duyệt, không có vi phạm, và mẫu mới không có ảnh tải lên mới: duyệt tự động, Admin kiểm tra lại sau.
- **AF-C2 – Gửi bản cập nhật.** Bản đang niêm yết vẫn hiện trong lúc chờ duyệt bản mới. Bản mới bị từ chối thì bản cũ giữ nguyên.
- **EF-C1 – Bị từ chối.** Có lý do theo mã luật BR-C4. Tác giả sửa và gửi lại, tối đa `[3]` lần cho một mẫu.
- **EF-C2 – Bị gỡ sau khi đã niêm yết** (vi phạm bản quyền): đặt `hidden_at`, gửi email cho tác giả ([14](14_PRICING_ENTITLEMENTS_SPEC.md) §7.4). Bản remix đã tạo vẫn giữ nhưng Admin có thể gắn cờ chúng. Tác giả được kháng nghị một lần.
- **EF-C3 – Thiết kế hiện đang tự hiện chỉ nhờ điểm FitCheck.** Khi ra mắt luồng duyệt, các mẫu đang hiện được chuyển thẳng sang `LISTED` (không ẩn đột ngột), sau đó Admin rà lại dần.

---

## D. Brand Kit mở rộng

### D.1 Ràng buộc

| Mã | Ràng buộc |
|---|---|
| BR-D1 | Logo có tối đa 4 biến thể: chính, đơn sắc, trên nền tối, biểu tượng. Định dạng SVG / PNG / PDF. PDF không hiển thị được bằng `<img>` (`isPdfUrl`), cần ảnh xem trước dựng ở server. |
| BR-D2 | Logo raster: cảnh báo khi kích thước đặt trên hộp làm độ phân giải dưới `[300 dpi]`, chặn khi dưới `[150 dpi]`. Dùng chung luật DPI với ảnh thường. |
| BR-D3 | Màu: giữ 3–5 màu chính, thêm tối đa `[5]` màu phụ. Mỗi màu có thể kèm CMYK và ghi chú Pantone (kiểu dữ liệu đã có `cmyk`, `pantoneNote`). Màu ngoài gam CMYK hiện cảnh báo. |
| BR-D4 | Gradient đã lưu: tối đa `[5]`, mỗi gradient 2–5 điểm màu. Họa tiết đã lưu: tối đa `[10]`, lấy từ AI Pattern hoặc tải lên. |
| BR-D5 | Kiểu chữ dựng sẵn: Tiêu đề / Nội dung / Nhấn, mỗi kiểu gồm font, cỡ, độ đậm, màu. Font phải là font có sẵn hoặc font đã tải lên và qua kiểm tra chữ tiếng Việt. |
| BR-D6 | Thiết kế giữ **bản sao** giá trị (mã màu, URL logo), không liên kết sống với kit. Sửa kit không âm thầm đổi hộp đã thiết kế. Có nút "Cập nhật theo Brand Kit" để áp lại chủ động. |
| BR-D7 | Số bộ Brand Kit theo gói: Free 1 (bản rút gọn hiện tại), Pro 1 (đầy đủ), Business `[5]`. Hạ gói thì các bộ vượt quota chỉ còn đọc, không bị xóa. |

### D.2 Luồng

- **MF:** Mở studio, bấm "Áp Brand Kit". Hệ thống ánh xạ vai trò: nền ← màu nền, tiêu đề ← kiểu Tiêu đề, logo ← biến thể phù hợp với độ sáng nền. Người dùng xem trước rồi xác nhận. Toàn bộ thay đổi là **một bước hoàn tác**.
- **AF-D1:** Phần tử không xác định được vai trò thì giữ nguyên và được liệt kê để người dùng tự gán.
- **AF-D2:** Logo trên nền tối thiếu biến thể "trên nền tối" thì dùng logo chính và cảnh báo độ tương phản.
- **EF-D1:** Font trong kit chưa tải được (mạng lỗi) thì hiện tạm font dự phòng nhưng **chặn xuất file** cho đến khi font tải xong, để không in sai font.

---

## E. Editor: độ mờ nền, nền nhiều màu, tem vắt hai mặt

### E.1 Độ mờ và gradient cho nền theo mặt

| Mã | Ràng buộc |
|---|---|
| BR-E1 | `setPanelBackground` và "Áp cho mọi mặt" phải giữ `style` (opacity, gradient) cùng `content`. |
| BR-E2 | Độ mờ 0–100%. Phần tử 0% vẫn nằm trong file nhưng không in gì: FitCheck cảnh báo "phần tử vô hình". Chữ dưới `[30%]` cảnh báo khó đọc. |
| BR-E3 | Phần tử có gia công ép kim / UV định hình bắt buộc 100% (lớp gia công là khuôn nhị phân, không có độ trong). |
| BR-E4 | Trên giấy kraft hoặc giấy màu (không in mực trắng), màu trong suốt sẽ trộn với màu giấy: 3D và bản xem trước phải mô phỏng đúng màu giấy, FitCheck hiện thông báo. |
| BR-E5 | PDF xuất ra phải giữ được độ trong (transparency group) hoặc làm phẳng (flatten) trước. Hai bộ render cho cùng kết quả (BR-G2). DXF không bị ảnh hưởng. |

### E.2 Nền nhiều màu

| Mã | Ràng buộc |
|---|---|
| BR-E6 | Gradient tuyến tính / tỏa tròn, 2–`[5]` điểm màu, hai điểm cách nhau tối thiểu `[5%]`. |
| BR-E7 | Hai chế độ: **theo từng mặt** (mỗi mặt một gradient) và **liền mạch** (gradient tính theo tọa độ của cả tấm, màu nối tiếp khi gấp hộp). Chế độ liền mạch không áp được qua hai tấm khác nhau. |
| BR-E8 | Mặt có vùng dán keo không có nền (luật `panelTouchesGlue` hiện có). Gradient liền mạch phải chừa vùng keo. |
| BR-E9 | Gradient phải phủ ra cả vùng tràn lề (bleed) của cạnh cắt. |
| BR-E10 | Khối màu (chia một mặt thành nhiều vùng màu): là các hình có vai trò nền, khóa trong mặt, không kéo ra ngoài. Vẫn nằm dưới mọi artwork (`orderElements`). |
| BR-E11 | Gradient chênh màu nhỏ trên khoảng dài dễ bị sọc khi in offset: cảnh báo khi chênh lệch giữa hai điểm màu < `[10%]` trên chiều dài > `[150 mm]`. |

**EF-E1:** Dự án cũ có nền là chuỗi `content` không có `style` vẫn hiển thị y như cũ (BR-G3).

### E.3 Tem vắt qua hai mặt

Có hai trường hợp khác nhau, cần tách rõ trên giao diện:

1. **In thẳng lên hộp, vắt qua nếp gấp, trên cùng một tấm**: đã làm được. Chỉ cần làm rõ trên UI và giữ cảnh báo FitCheck về nếp gấp.
2. **Tem niêm phong rời**, dán sau khi đóng hộp, vắt qua chỗ nắp gặp thân (hai tấm khác nhau, hoặc nắp gài với mặt trước): tính năng mới.

| Mã | Ràng buộc (trường hợp 2) |
|---|---|
| BR-E12 | Tem niêm phong là một sản phẩm in riêng (dùng cấu trúc `sticker-label`), có dòng riêng trong đơn và báo giá riêng (decal giấy / decal trong). |
| BR-E13 | Tem chỉ đặt được trên một **đường ghép** có thật: cạnh mở của hộp khi đã gấp (nắp – thân, nắp gài – mặt trước). Hệ thống tính đường ghép từ cây gấp 3D (`fold.ts`). Cấu trúc không có đường ghép thì không bật tính năng. |
| BR-E14 | Tem phải phủ đường ghép, mỗi bên tối thiểu `[10 mm]`. Kích thước tem `[20–120 mm]`. Không đặt lên vùng keo hay lỗ khoét. |
| BR-E15 | Đổi kích thước hộp: tem bám theo đường ghép (giữ vị trí tương đối). Đổi cấu trúc làm mất đường ghép: tem bị tách ra, cảnh báo và yêu cầu đặt lại. |
| BR-E16 | 3D hiển thị tem gập 90° qua mép. Bản in xuất tem trên tờ riêng, không lẫn vào file khuôn hộp. |

---

## F. Khuôn tùy chỉnh: lỗ khoét, cửa sổ PET, thêm mặt, nhập khuôn

Chia thành bốn bậc, làm theo thứ tự. Bậc sau phụ thuộc bậc trước.

### F.1 Bậc 1: lỗ khoét do người dùng đặt

| Mã | Ràng buộc |
|---|---|
| BR-F1 | Hình lỗ: chữ nhật bo góc, tròn, elip. Đường SVG tùy ý (phải kín, không tự cắt nhau) chỉ cho gói Pro. |
| BR-F2 | Lỗ nằm trọn trong **một mặt**, không cắt qua nếp gấp. Cách nếp gấp ≥ `[5 mm]`, cách cạnh cắt ≥ `[5 mm]`, cách lỗ khác ≥ `[5 mm]`. Không chạm vùng keo, tai gài, khe khóa. |
| BR-F3 | Kích thước tối thiểu `[5 mm]`, bán kính góc tối thiểu `[1 mm]` (giới hạn dao bế / dao cắt). |
| BR-F4 | Tổng diện tích lỗ ≤ `[50%]` diện tích mặt. Mặt chịu lực (đáy, và các mặt bên khi quà > 300 g) ≤ `[25%]`, đáy khóa (crash-lock) không được khoét. |
| BR-F5 | Artwork trong lỗ bị loại khi in (luật `overlapsOpening` đã có). Lỗ áp cho cả mặt trong lẫn mặt ngoài (mặt trong là bản lật gương). |
| BR-F6 | Báo giá: digital tính thêm theo chiều dài đường cắt. Offset tính thêm vào giá dao bế theo số lỗ và độ phức tạp. |
| BR-F7 | Đổi kích thước hộp: lỗ giữ vị trí tương đối trong mặt. Nếu không còn thỏa BR-F2 thì đánh dấu lỗi FitCheck mức chặn, không tự dời đi. |

- **AF-F1:** Lỗ đặt sát nếp gấp thì gợi ý tự dời vào vị trí hợp lệ gần nhất, người dùng xác nhận.
- **EF-F1:** Đường SVG không kín hoặc tự cắt: từ chối kèm vị trí lỗi.

### F.2 Bậc 2: cửa sổ PET cho mọi lỗ

| Mã | Ràng buộc |
|---|---|
| BR-F8 | Mỗi lỗ có thể bật "Màng PET trong suốt". Miếng màng = lỗ + `[10 mm]` mỗi bên, dán ở mặt trong. |
| BR-F9 | Vùng dán màng nằm trọn trong mặt, không qua nếp gấp. Thiếu chỗ thì không bật được (thông báo cần thêm bao nhiêu mm). |
| BR-F10 | Vùng dán màng ở mặt trong không được có mực (keo không bám trên mực). Nếu có in mặt trong, hệ thống tự chừa vùng này và FitCheck báo. |
| BR-F11 | Độ dày màng `[0.2 / 0.3 mm]`. Hộp thực phẩm bắt buộc PET đạt chuẩn tiếp xúc thực phẩm (lựa chọn này lưu vào đơn). |
| BR-F12 | Chỉ giao đơn cho xưởng có năng lực dán cửa sổ (BR-B3). Báo giá thêm chi phí màng theo diện tích và phí dán theo hộp. |
| BR-F13 | 3D hiển thị màng trong suốt, nhìn được sản phẩm bên trong (mở rộng `fe/src/features/studio/utils/film.ts`). Cửa sổ công tắc hiện có của `tuck-top` / `lid-base` trở thành một lỗ dựng sẵn của hệ thống mới. |

### F.3 Bậc 3: thêm mặt / thêm tai vào khuôn có sẵn

| Mã | Ràng buộc |
|---|---|
| BR-F14 | Chỉ gắn mặt mới vào **cạnh cắt** chưa có mặt kề của một mặt có sẵn. Mặt mới tạo nếp gấp ở cạnh đó, góc gấp `[0–180°]`. |
| BR-F15 | Khổ tấm phẳng sau khi thêm không vượt khổ B1 (`MAX_SHEET_MM`) và khổ máy của xưởng. |
| BR-F16 | Kiểm tra va chạm khi gấp: MVP chỉ kiểm tra chồng lấn trên bản phẳng và chồng lấn cơ bản giữa các mặt khi gấp. Ca va chạm phức tạp ghi rõ là "chưa kiểm tra được", bắt buộc in mẫu trước khi in số lượng. |
| BR-F17 | Khuôn đã chỉnh tay **thoát khỏi công thức**: đổi L×W×H không còn tự tính lại khuôn. Hệ thống hỏi người dùng chọn: giữ chỉnh sửa, hoặc dựng lại từ công thức và mất chỉnh sửa. |

### F.4 Bậc 4: nhập khuôn DXF / SVG

| Mã | Ràng buộc |
|---|---|
| BR-F18 | Nhận DXF / SVG, đơn vị mm. Đường cắt / đường gấp nhận diện theo tên lớp hoặc màu, theo một quy ước công bố sẵn. Không nhận diện được thì người dùng gán tay. |
| BR-F19 | Đường cắt ngoài phải kín. File quá `[5.000]` đoạn thẳng hoặc quá `[5 MB]` thì từ chối. |
| BR-F20 | Mặt được tự tách theo đồ thị nếp gấp. Tách thất bại: người dùng khoanh mặt bằng tay. |
| BR-F21 | Khuôn nhập không có cây gấp: không có 3D gấp (chỉ có mockup phẳng), FitCheck chỉ chạy các luật 2D. Giao diện ghi rõ điều này. |
| BR-F22 | Báo giá khuôn nhập: theo diện tích phẳng và tổng chiều dài đường cắt / gấp, bắt buộc in mẫu trước khi in số lượng. |

**Vẽ khuôn tự do hoàn toàn: ngoài phạm vi học kỳ này.** Cần trình chỉnh sửa vector, cây gấp và kiểm tra va chạm 3D đầy đủ. Đề xuất làm sau khi bậc 4 chạy ổn.

---

## G. Kết nối khách hàng với xưởng: tích hợp, chọn xưởng, liên lạc, theo dõi đơn

### G.0 Hiện trạng đã kiểm tra

| Điểm | Code hiện tại | Hệ quả |
|---|---|---|
| Chọn xưởng | Giỏ hàng có một ô chọn: tên · thành phố · thời gian làm (`fe/src/views/cart/index.tsx:322`). Lựa chọn mặc định là "Để WrapFit chọn xưởng phù hợp". | Khách không thấy giá, ngày nhận hàng, đánh giá hay khoảng cách để so sánh. |
| "WrapFit chọn" | Backend luôn lấy `PARTNERS[0]`, tức xưởng TP.HCM (`be/src/orders/orders.service.ts:131`). Trong khi giao diện hứa "WrapFit sẽ chọn xưởng gần bạn" (`cart/index.tsx:331`). | **Lời hứa sai**: khách ở Hà Nội vẫn bị giao cho xưởng TP.HCM. |
| Danh sách xưởng | API lỗi thì web **lặng lẽ** hiện danh sách xưởng demo (`fe/src/api/print-shops/index.ts:7`). | Khi chạy thật, khách có thể đặt vào một danh sách xưởng không đúng. |
| Liên lạc | Giỏ hàng ghi "Xưởng in sẽ gọi xác nhận trước khi in" (`cart/index.tsx:127`). Số điện thoại xưởng bị che `xxxx`. Không có tin nhắn trong đơn. | Không có cơ chế nào bảo đảm cuộc gọi đó. Khách không có kênh nào để hỏi xưởng. |
| Theo dõi đơn | Mốc thời gian dựng từ 3 dấu thời gian `paidAt / shippedAt / deliveredAt` (`fe/src/views/dashboard/orders/OrderDetailDialog.tsx:175`). | Không có mã vận đơn, ngày dự kiến, ảnh từ xưởng, cảnh báo trễ hạn. |
| Phía xưởng | API đã cho tài khoản `PRINT_SHOP` xem và chuyển đơn của mình. Nhưng web chỉ có trang `/admin/print-shops` dành cho ADMIN. | Xưởng **chưa có màn hình nào để làm việc** trên web. |
| Địa chỉ | `shippingAddress` là một chuỗi tự do. | Không tính được khoảng cách, phí ship hay thời gian giao. |

### G.1 Ba mức tích hợp một xưởng vào web

Các xưởng có mức độ dùng công nghệ rất khác nhau. Không bắt xưởng nào cũng phải dùng API.

| Mức | Dành cho | Cách hoạt động | Ràng buộc |
|---|---|---|---|
| **1. Cổng đối tác** (mặc định, bắt buộc) | Mọi xưởng | Trang `/partner` trên web WrapFit: hàng đợi đơn, tải file in, nhận / từ chối, cập nhật trạng thái, nhắn tin, bảng kê đối soát. Dùng được trên điện thoại (thợ đứng máy dùng điện thoại). | Đăng nhập bằng tài khoản `PRINT_SHOP`, bật 2FA cho `OWNER`. Mỗi thao tác ghi người làm. |
| **2. Thông báo đa kênh** | Xưởng ít mở web | Email + Zalo (ZNS qua Zalo OA) + SMS khi có đơn mới, sắp hết hạn nhận, khách nhắn. Trong thông báo có **link hành động một chạm**: "Nhận đơn", "Từ chối". | Link ký số, dùng một lần, hết hạn `[24 giờ]`, chỉ cho phép đúng hành động đó. Hành động có tiền (đề xuất giá mới) vẫn phải vào cổng. ZNS cần OA đã xác thực và mẫu tin được Zalo duyệt, có phí theo tin (Q-G1). |
| **3. API + webhook** | Xưởng có phần mềm quản lý sản xuất riêng | REST API với khóa riêng cho từng xưởng. Webhook `order.paid`, `order.cancelled`, `message.created`. Xưởng gọi API để đổi trạng thái hoặc gửi mã vận đơn. | Webhook ký HMAC, gửi lại với thời gian chờ tăng dần tối đa `[24 giờ]`, mỗi sự kiện có id để xưởng bỏ qua bản trùng. Khóa API thu hồi được. Giới hạn `[60 yêu cầu/phút]`. Luật chuyển trạng thái giống hệt cổng (`order-status.ts`). |

### G.2 Quy trình đưa một xưởng lên web (onboarding)

| Bước | Ai làm | Việc | Dữ liệu cần | Xong khi |
|---|---|---|---|---|
| 1. Đăng ký | Xưởng | Form trên trang `/partner/apply` | Tên pháp lý, mã số thuế, địa chỉ xưởng, người đại diện, hotline, Zalo, email | Hồ sơ `APPLIED` |
| 2. Thẩm định hồ sơ | Admin | Kiểm tra giấy phép kinh doanh, gọi xác minh | Ảnh giấy phép, ảnh xưởng / máy | `REVIEW`, hoặc `REJECTED` kèm lý do |
| 3. Khai năng lực | Xưởng (Admin hỗ trợ) | Khai máy, khổ tờ, vật liệu có sẵn (mục H), gia công, số lượng tối thiểu / tối đa, công suất, giờ làm, ngày nghỉ (Tết), khu vực giao | Có **file Excel mẫu** để nhập bảng giá hàng loạt | Hồ sơ năng lực đầy đủ, không trống trường bắt buộc |
| 4. In thử | Xưởng | In **bộ file thử chuẩn** của WrapFit: một khuôn có dấu chồng màu, thang màu, chữ 6 pt, đường cắt / gấp. Gửi bản in thật về WrapFit. | – | Admin đo: sai lệch đường bế ≤ `[0.5 mm]`, màu trong ngưỡng, nếp gấp không nứt |
| 5. Hợp đồng | Admin + chủ xưởng | Tỷ lệ hoa hồng, thời hạn nhận đơn, phạt trễ hạn, chính sách lỗi / in bù, tài khoản nhận tiền | Hợp đồng ký | Tỷ lệ hoa hồng có ngày hiệu lực (BR-B5) |
| 6. Tài khoản | Admin | Tạo tài khoản `OWNER`, chủ xưởng tự mời `STAFF` | Email của từng người | Đăng nhập được cổng |
| 7. Đơn chạy thử | Admin | Một đơn nội bộ đi hết vòng đời: nhận, proof, in, giao | – | Không lỗi, đúng thời gian cam kết |
| 8. Kích hoạt | Admin | `ACTIVE`, gắn nhãn "Xưởng mới" | – | Hiện cho khách. **Thời gian thử thách** `[30 ngày / 20 đơn]`: tối đa `[3]` đơn đang chạy cùng lúc |

**Ràng buộc:**

- **BR-G9:** Bước 4 và bước 7 là bắt buộc, Admin không bỏ qua được. Đây là bằng chứng chất lượng: 90% file Canva hỏng khi in (CP2), nên chất lượng xưởng là thứ WrapFit bán. Lần in thử **đầu tiên** cũng là cách đóng [18](18_VIEC_CON_TREO_SAU_AUDIT_BE.md) mục 22 (file in chưa từng được in 1:1 và gấp tay): kết quả ghi vào bảng nghiệm thu vật lý ở [12](12_BOX_FORMULA_AUDIT.md) §6.1.
- **BR-G10:** Xưởng đổi năng lực hoặc bảng giá sau khi kích hoạt: áp từ lần báo giá kế tiếp (BR-B4). Bỏ một vật liệu đang có đơn chạy thì không xóa được, chỉ "ngừng nhận mới".
- **BR-G11:** Nghỉ dài ngày (Tết, sửa máy): xưởng khai trước. Những ngày đó không tính vào thời gian làm, và nếu cả quãng nghỉ nằm trong thời gian làm của đơn thì xưởng bị ẩn khỏi lựa chọn.

### G.3 Chọn xưởng hợp lý cho khách

**Bước 1: Lọc theo điều kiện cứng.** Xưởng bị loại nếu vi phạm bất kỳ điều kiện nào:
khác `ACTIVE`; thiếu năng lực (BR-B3: khổ tờ, vật liệu, gia công, số lượng, PET); không giao tới tỉnh của khách (trừ khi khách tự nhận); đầy công suất trong khoảng ngày cần làm; đang nghỉ (BR-G11).

**Bước 2: Xếp hạng.** Mỗi xưởng còn lại có:

- **Giá**: báo giá do server tính từ bảng giá của xưởng đó, cộng phí ship ước tính.
- **Ngày nhận dự kiến**: ngày cụ thể (không ghi "3–5 ngày"), bằng thời gian chờ thanh toán + thời gian làm theo phương pháp in (cộng hàng đợi hiện tại của xưởng, chỉ tính ngày làm việc) + thời gian giao từ tỉnh xưởng đến tỉnh khách.
- **Chất lượng**: điểm đánh giá, tỷ lệ đúng hạn, tỷ lệ khiếu nại trong 90 ngày.
- **Khoảng cách**: từ xưởng tới địa chỉ nhận.

Điểm "Đề xuất" = `[0.4]` giá + `[0.3]` thời gian + `[0.2]` chất lượng + `[0.1]` khoảng cách, mỗi yếu tố chuẩn hóa 0–1. Khách đổi được cách sắp xếp: Đề xuất / Rẻ nhất / Nhanh nhất / Đánh giá cao / Gần nhất.

**Bước 3: Hiển thị.** Mỗi xưởng là một thẻ so sánh: tổng tiền và giá mỗi hộp, ngày nhận dự kiến, thành phố + khoảng cách, đánh giá + số đơn đã làm, nhãn năng lực (PET, ép kim…), và **lý do được đề xuất** ("rẻ nhất", "giao sớm nhất").

**Ràng buộc:**

- **BR-G12:** "Để WrapFit chọn" là lấy xưởng điểm cao nhất, và **hiện rõ tên xưởng trước khi thanh toán**. Không được chọn ngầm sau khi khách đã trả tiền như hiện nay.
- **BR-G13:** Không dùng danh sách xưởng demo khi chạy thật. Gọi API lỗi thì báo lỗi và cho thử lại, không thay bằng dữ liệu giả (bỏ fallback ở `fe/src/api/print-shops/index.ts` ngoài chế độ offline demo).
- **BR-G14:** Hai xưởng điểm bằng nhau (lệch dưới `[2%]`) thì xoay vòng thứ tự, để xưởng mới cũng có đơn. Xưởng không được trả tiền để lên đầu (hoặc nếu có thì phải gắn nhãn "Quảng cáo").
- **BR-G15:** Địa chỉ nhận phải có cấu trúc (tỉnh/thành, phường/xã, số nhà) theo danh mục hành chính mới hai cấp từ 01/07/2025, cần kiểm tra lại danh mục chính thức. Địa chỉ cũ dạng chuỗi tự do vẫn hiển thị được nhưng phải chọn lại khi đặt đơn mới.
- **BR-G16:** Kiểm tra lại toàn bộ điều kiện lọc **lúc thanh toán**, không chỉ lúc báo giá.

**Luồng thay thế / ngoại lệ:**

- **AF-G1:** Không xưởng nào qua được bước 1: hiện lý do cụ thể ("chưa xưởng nào có khổ 1.100 mm") kèm 2 lựa chọn: sửa thiết kế theo gợi ý, hoặc gửi yêu cầu báo giá riêng (AF-B1).
- **AF-G2:** Tỉnh của khách không có xưởng: hiện xưởng gần nhất kèm phí và thời gian ship liên tỉnh.
- **AF-G3:** Khách muốn tự đến lấy: lọc theo bán kính `[20 km]`, phí ship 0, hiện địa chỉ và giờ nhận hàng của xưởng.
- **AF-G4:** Khách đã đặt với một xưởng trước đó: xưởng đó được đánh dấu "Đã từng đặt" và được cộng điểm `[0.05]`.
- **EF-G1:** Xưởng chuyển `PAUSED` giữa lúc báo giá và lúc thanh toán (BR-G16): đề xuất xưởng kế tiếp. Nếu giá cao hơn thì hiện chênh lệch để khách đồng ý lại. Nếu tiền đã về thì đi AF-A2.
- **EF-G2:** Thiếu dữ liệu ship (tỉnh chưa có bảng phí): hiện "Phí ship xưởng báo sau", đơn vẫn đặt được, phí ship đi theo bước 5 của MF-A.

### G.4 Liên lạc giữa khách và xưởng

| Giai đoạn | Khách thấy về xưởng | Xưởng thấy về khách | Kênh |
|---|---|---|---|
| Trước khi thanh toán | Tên, thành phố, đánh giá, năng lực. **Không có** số điện thoại riêng. | Không thấy gì | Hỏi trước khi đặt qua WrapFit (hỗ trợ) |
| Đã thanh toán, chờ xưởng nhận | Như trên | Tên khách, nội dung đơn, file in. **Chưa có** số điện thoại. | Tin nhắn trong đơn |
| Từ khi xưởng nhận đến khi giao xong | Hotline + Zalo của xưởng, tên người phụ trách | Tên + số điện thoại người nhận, địa chỉ | Tin nhắn trong đơn (chính), điện thoại / Zalo (phụ) |
| Sau khi giao `[30 ngày]` | Chỉ tin nhắn trong đơn | Số điện thoại bị ẩn lại | Tin nhắn trong đơn, khiếu nại |

**Ràng buộc:**

- **BR-G17:** **Tin nhắn trong đơn** là kênh chính thức. Có lịch sử, đính kèm ảnh / PDF (≤ `[10 MB]` mỗi tệp), Admin vào xem được. Đây là bằng chứng khi có tranh chấp (EF-A6). Điều đã thỏa thuận qua điện thoại phải được ghi lại trong đơn thì mới có giá trị khi tranh chấp.
- **BR-G18:** Xưởng trả lời tin nhắn trong `[4 giờ làm việc]`. Quá hạn thì nhắc xưởng, quá `[8 giờ]` thì báo Admin. Thời gian phản hồi trung bình được hiện trên thẻ xưởng.
- **BR-G19:** Chống lách nền tảng: trước khi xưởng nhận đơn, tin nhắn có số điện thoại hoặc số tài khoản ngân hàng thì **hiện cảnh báo** (không chặn) và ghi nhận lại. Hợp đồng xưởng có điều khoản về việc giao dịch riêng với khách do WrapFit giới thiệu.
- **BR-G20:** Dòng "Xưởng in sẽ gọi xác nhận" chỉ giữ nếu có bước tương ứng: xưởng bấm "Đã gọi xác nhận" kèm kết quả trước khi chuyển sang in. Nếu không thì bỏ câu đó khỏi giỏ hàng.
- **BR-G21:** Xóa tài khoản: tin nhắn được ẩn danh hóa, không xóa trong `[2 năm]` (bằng chứng giao dịch), theo cách xóa tài khoản hiện có (ẩn danh hóa, các bảng tiền dùng `onDelete: Restrict`).

### G.5 Theo dõi đơn

**Màn hình của khách** (thay `OrderDetailDialog`):

- Thanh tiến trình có **mọi bước** của vòng đời A.4. Mỗi bước có ngày dự kiến và ngày thật; bước trễ tô màu cảnh báo.
- Xem proof và duyệt (A.5 bước 6), ảnh xưởng chụp lúc in xong / đóng gói (không bắt buộc).
- Mã vận đơn + hãng vận chuyển + link tra cứu.
- Chỉ hiện nút đúng với trạng thái: Thanh toán, Hủy, Duyệt proof, Đã nhận hàng, Khiếu nại, Đánh giá xưởng.

**Màn hình của xưởng** (`/partner/orders`):

- Bảng cột theo trạng thái. Mỗi đơn có đồng hồ đếm ngược hạn nhận / hạn giao.
- Tải file in đã khóa của đơn (BR-A5), in phiếu đóng gói có QR mã đơn.
- **Quét QR trên phiếu** bằng điện thoại để chuyển trạng thái, cho thợ ở xưởng không cần ngồi máy tính.
- Thao tác nhiều đơn cùng lúc chỉ cho phép ở bước "đang in → sẵn sàng giao".

**Màn hình của Admin:** mọi đơn, lọc đơn trễ hạn, đơn đứng yên quá `[3 ngày]`, khiếu nại đang mở.

**Ma trận thông báo:**

| Sự kiện | Khách | Xưởng | Admin |
|---|---|---|---|
| Đơn đã thanh toán | Web + email | Web + email + Zalo | – |
| Còn `[4 giờ]` đến hạn nhận đơn | – | Zalo + SMS | – |
| Quá hạn nhận đơn | Web ("đang tìm xưởng khác") | – | Web + email |
| Proof sẵn sàng | Web + email | – | – |
| Đang giao (có mã vận đơn) | Web + email | – | – |
| Bước bị trễ so với dự kiến | Web + email | Web | Web |
| Tin nhắn mới | Web (gộp mỗi `[15 phút]`) | Web + Zalo | – |
| Khiếu nại mới | – | Web + email | Web + email |

Thông báo trên web dùng lại module `notifications` đã có.

**Ràng buộc:**

- **BR-G22:** Ngày dự kiến tính theo ngày làm việc của xưởng (bỏ ngày nghỉ BR-G11). Ngày dự kiến thay đổi thì khách được báo, kèm lý do.
- **BR-G23:** Xưởng không được tự chuyển `DELIVERED` nếu không có bằng chứng: hãng vận chuyển báo đã giao, ảnh giao hàng, hoặc khách bấm "Đã nhận". Chặn việc báo giao hàng giả để kết thúc đơn sớm.
- **BR-G24:** Khách không bấm "Đã nhận" thì đơn tự chuyển `DELIVERED` sau `[3 ngày]` kể từ khi hãng báo đã giao, hoặc `[10 ngày]` kể từ `SHIPPED` nếu không có dữ liệu của hãng.
- **BR-G25:** MVP nhập mã vận đơn bằng tay, kiểm tra định dạng theo hãng. Tích hợp API hãng vận chuyển (GHN, GHTK, Viettel Post…) để tự cập nhật trạng thái là bước sau (Q-G2).
- **BR-G26:** Một đơn giao một lần. Không tách thành nhiều kiện giao lệch ngày trong MVP.

**Luồng thay thế / ngoại lệ:**

- **AF-G5:** Giao không thành (khách vắng, sai địa chỉ), hãng hoàn hàng: xưởng chuyển đơn sang `RETURNED`. Khách xác nhận lại địa chỉ, trả phí giao lại, đơn quay về `READY_TO_SHIP`.
- **EF-G3:** Mất hàng: khách mở khiếu nại. Xưởng làm việc với hãng vận chuyển. Kết quả xử lý theo BR-A10.
- **EF-G4:** Xưởng không cập nhật quá hạn: Admin được báo và có thể cập nhật thay, ghi rõ "Admin cập nhật thay xưởng".

---

## H. Vật liệu giấy: dữ liệu và hiển thị đúng thực tế

### H.0 Vì sao đổi vật liệu mà hình gần như không đổi

Các nguyên nhân dưới đây rút ra từ code. Code của các file này trên `develop` (a0a3821) giống hệt bản đã đọc. Chưa xem được trên trình duyệt: bản chạy thử bị lỗi build vì một thay đổi chưa commit ở nhánh làm việc (`demoData.ts` import file `./templatePrint` không tồn tại). `develop` không có lỗi này.

| # | Nguyên nhân | Chỗ trong code | Người dùng thấy |
|---|---|---|---|
| H-1 | 3D tô màu giấy trước, rồi vẽ mực **đè kín** lên trên. Mẫu nào có nền phủ kín mặt hộp thì che hết màu giấy. Ngoài thực tế, mực CMYK trong suốt, hòa với màu giấy: trên kraft màu tối đi, màu trắng và màu nhạt biến mất. | `fe/src/features/studio/components/three/boxModel.ts:313`–`330` | Đổi ivory → kraft → duplex chỉ thấy mép giấy và mặt trong đổi màu, mặt ngoài y nguyên. |
| H-2 | Canvas 2D luôn tô tấm giấy màu **trắng**, bất kể chọn giấy gì. | `fe/src/features/studio/components/canvas/DielineCanvas2D.tsx:1319` | Thiết kế trên kraft vẫn trông như trên giấy trắng. |
| H-3 | Cán màng mờ / bóng / nhung, ép kim, UV ở bước 3 **không được truyền vào 3D**: `Box3DView` chỉ nhận `theme`. Độ bóng chỉ phụ thuộc loại giấy. | `fe/src/features/studio/components/Step3PaperFinish.tsx:509`–`518`, bảng `FINISH` trong `boxModel.ts:90` | Bật / tắt cán màng không đổi gì trên hình. |
| H-4 | Chỉ có 4 loại giấy cố định, không chọn được định lượng (GSM). Kiểu dữ liệu chỉ có `ivory / kraft / duplex`: "Carton bồi" thực chất được lưu là `duplex 400`. Báo giá thì lại có loại `rigid` riêng. | `fe/src/features/studio/utils/paperStocks.ts:118`, `shared/src/types/project.ts:8`, `shared/src/pricing/quote.ts` | Dữ liệu ba nơi không khớp nhau, không thể hiện đúng loại giấy xưởng có. |
| H-5 | Màu giấy được viết cứng ở hai nơi (`PAPER_STOCKS.swatch` và `PAPER` trong `boxModel.ts:52`). | như trên | Sửa một nơi, quên nơi kia thì màu lệch nhau. |

### H.1 Mô hình dữ liệu vật liệu (đề xuất)

**Danh mục vật liệu** (lưu trong DB, Admin quản lý), thay cho mảng `PAPER_STOCKS` viết cứng:

| Trường | Ý nghĩa | Ràng buộc |
|---|---|---|
| `family` | ivory, couche, kraft, duplex, carton bồi, carton sóng E/B, giấy mỹ thuật | Enum, thêm loại mới không cần sửa code hiển thị |
| `gsm`, `caliperMm` | Định lượng và **độ dày đo thật** | `caliperMm` lấy từ đo mẫu thật; công thức `GSM × 0.0014` chỉ để dự phòng (CP2: bù độ dày giấy) |
| `surface` | Màu mặt in và mặt trong (hex + Lab), độ trắng, ảnh vân giấy (màu, gồ ghề, độ nhám) | Ảnh vân giấy ≤ `[1024 px]`, lặp liền mạch |
| `ink` | In được mực trắng không, độ ăn mực, độ loang chấm (dot gain), hồ sơ màu (ICC) dùng để mô phỏng | Kraft và carton sóng mặc định `canPrintWhite = false` |
| `suitability` | Cấu trúc hộp phù hợp, kích thước hộp tối đa, tải trọng tối đa | Dùng cho `paperAdvice` thay cho các ngưỡng viết cứng |
| `meta` | Đạt chuẩn tiếp xúc thực phẩm, tỷ lệ tái chế, ảnh chụp mẫu thật | – |

**Gia công** tách thành hai nhóm: cán màng (`none / matte / gloss / soft-touch`, chỉ chọn một) và gia công điểm (ép kim theo màu, UV định hình, dập nổi / dập chìm). Kèm **bảng tương thích**, ví dụ:

| Vật liệu \ Gia công | Cán màng bóng | Cán màng nhung | UV định hình | Ép kim | Dập nổi |
|---|---|---|---|---|---|
| Ivory / couche | ✓ | ✓ | ✓ (cần cán màng mờ) | ✓ | ✓ |
| Kraft | `[?]` | ✗ | ✗ | ✓ | ✓ |
| Duplex | ✓ | ✓ | ✓ (cần cán màng mờ) | ✓ | hạn chế |
| Carton bồi | ✓ (trên giấy bồi) | ✓ | ✓ | ✓ | ✓ |
| Carton sóng | ✗ | ✗ | ✗ | ✗ | ✗ |

Bảng này phải được xưởng xác nhận (Q-H1).

**Vật liệu theo xưởng:** mỗi xưởng có danh sách vật liệu còn hàng và giá theo tờ.

**Ràng buộc:**

- **BR-H1:** Một vật liệu chỉ được chọn khi có ít nhất một xưởng `ACTIVE` đang có hàng. Danh sách xưởng ở G.3 lọc theo vật liệu đã chọn.
- **BR-H2:** Đổi vật liệu thì đổi độ dày, nên **khuôn được tính lại** (độ dày giấy là đầu vào của công thức), nền được căn lại (`refitBackgrounds`), FitCheck và báo giá chạy lại. Tất cả gộp thành một bước hoàn tác.
- **BR-H3:** Chọn gia công không tương thích thì bị chặn ngay trên giao diện, kèm lý do. Đổi vật liệu làm gia công đã chọn không còn hợp lệ thì gia công đó bị bỏ và người dùng được báo.
- **BR-H4:** Dự án lưu ảnh chụp vật liệu lúc chọn. Vật liệu bị ngừng cung cấp thì dự án vẫn mở được, nhưng phải chọn vật liệu thay thế trước khi đặt in (EF-H1).
- **BR-H5:** Màu giấy chỉ đọc từ danh mục vật liệu. Bỏ việc viết cứng ở hai nơi (H-5).

### H.2 Yêu cầu hiển thị đúng thực tế

| Mã | Yêu cầu | Sửa cho |
|---|---|---|
| BR-H6 | 3D: vẽ mực bằng chế độ **nhân màu (multiply)** lên màu giấy, gần với cách mực trong suốt in lên giấy màu. Giấy không in được mực trắng thì vùng trắng trong thiết kế để lộ màu giấy. | H-1 |
| BR-H7 | 2D: tấm giấy lấy màu của vật liệu đã chọn. Có công tắc "Mô phỏng in" (giấy + mực hòa màu) và "Màu thiết kế" (màu gốc, để chỉnh sửa dễ). | H-2 |
| BR-H8 | Cán màng hiện đúng: mờ thì nhám, ánh nhẹ; bóng thì phản chiếu rõ; nhung thì mềm, ánh tán. UV định hình bóng trên nền mờ. Ép kim là kim loại (đã có cho từng phần tử). | H-3 |
| BR-H9 | Mép giấy dày đúng `caliperMm` (đã có `setThickness`). Carton sóng hiện lớp sóng ở mép cắt. | H-4 |
| BR-H10 | Đổi vật liệu hoặc gia công thì hình cập nhật trong `[200 ms]`, không tải lại cảnh 3D. | – |
| BR-H11 | Bên cạnh 3D có **ảnh chụp mẫu giấy thật**, kèm câu: "Màu trên màn hình chỉ gần đúng, nên in mẫu trước" (CP2: 90,8% khách cần mẫu thật). Có nút đặt in mẫu. | – |
| BR-H12 | Máy yếu hoặc không có WebGL: hiện mẫu giấy 2D đã hòa màu thay cho 3D, vẫn đổi được vật liệu. | – |

**Luồng thay thế / ngoại lệ:**

- **AF-H1:** Chọn kraft trong khi thiết kế có chữ trắng hoặc màu nhạt: FitCheck cảnh báo "chữ sẽ chìm", gợi ý sửa tự động (đổi màu chữ đậm, hoặc chọn xưởng in được mực trắng nếu có).
- **AF-H2:** Gợi ý vật liệu (`paperAdvice`) khác lựa chọn của khách: chỉ cảnh báo, không chặn. Riêng hộp lớn hoặc quà nặng mà chọn giấy mỏng hơn mức tối thiểu thì FitCheck báo lỗi mức chặn.
- **EF-H1:** Vật liệu ngừng cung cấp ở mọi xưởng: dự án hiện "Vật liệu ngừng cung cấp" và gợi ý vật liệu gần nhất (cùng loại, GSM gần nhất). File in đã xuất trước đó vẫn tải được.
- **EF-H2:** Ảnh vân giấy tải lỗi: dùng màu phẳng của giấy, không chặn thao tác.

### H.3 Thứ tự làm

1. **Sửa nhanh (S, có thể làm ngay):** H-1 (multiply trên 3D), H-2 (màu giấy trên 2D), H-3 (truyền cán màng vào 3D). Chưa cần đổi dữ liệu.
2. **Danh mục vật liệu (M):** bảng vật liệu, gia công và bảng tương thích; vật liệu theo xưởng; chuyển `PAPER_STOCKS` sang dữ liệu.
3. **Mô phỏng in (M):** công tắc mô phỏng / màu thiết kế, hồ sơ màu theo giấy, ảnh mẫu thật.

---

## 7. Phân quyền theo gói (đề xuất, thêm vào bảng hạn mức của [14](14_PRICING_ENTITLEMENTS_SPEC.md) §3.1)

| Tính năng | Free | Pro | Business |
|---|---|---|---|
| Đơn in mẫu / sản xuất | ✓ | ✓ | ✓ |
| Gửi mẫu lên Thư viện | `[2 mẫu]` | `[20]` | không giới hạn |
| Brand Kit | rút gọn | đầy đủ, 1 bộ | `[5]` bộ |
| Độ mờ, gradient | ✓ | ✓ | ✓ |
| Tem niêm phong | – | ✓ | ✓ |
| Lỗ khoét hình cơ bản / PET | ✓ / – | ✓ / ✓ | ✓ / ✓ |
| Lỗ đường SVG, thêm mặt, nhập DXF | – | ✓ | ✓ |

- **BR-G8:** Hạ gói không xóa dữ liệu. Tính năng vượt quyền chuyển sang chỉ đọc. Dự án đang dùng tính năng Pro vẫn mở được nhưng không xuất được cho đến khi nâng gói hoặc gỡ tính năng đó.

## 8. Thứ tự làm và phụ thuộc

```
H.3 bước 1 (sửa hiển thị vật liệu, độc lập, làm ngay được)
B (xưởng vào DB, bảng giá) ─► H danh mục vật liệu ─► G.2–G.3 (onboarding, chọn xưởng)
                         └─► A (đơn sản xuất, sổ cái, đối soát, báo cáo) ─► G.4–G.5 (liên lạc, theo dõi đơn)
E.1–E.2 (độc lập, làm song song được)
D (cần E.2 cho gradient trong kit)
C (độc lập về code; cần chốt chính sách Q-C*)
F.1 ─► F.2 ─► E.3 (tem cần đường ghép từ cây gấp) ─► F.3 ─► F.4
```

| Đợt | Nội dung | Ước lượng |
|---|---|---|
| 0 | H.3 bước 1: sửa hiển thị vật liệu trên 2D/3D; sửa lời hứa "chọn xưởng gần bạn" và bỏ danh sách xưởng demo khi chạy thật (BR-G12, BR-G13) | 3–5 ngày |
| 1 | B + danh mục vật liệu (H.1) + A cơ bản: đơn sản xuất, hoa hồng lưu theo đơn, hoàn tiền, sổ cái | 4–5 tuần |
| 1b | G: cổng đối tác, onboarding, chọn và xếp hạng xưởng, tin nhắn trong đơn, theo dõi đơn | 3–4 tuần |
| 2 | E.1, E.2; đối soát + báo cáo tài chính (phần sau của A) | 2–3 tuần |
| 3 | C (kiểm duyệt, báo cáo vi phạm), D | 2–3 tuần |
| 4 | F.1, F.2, E.3 | 3–4 tuần |
| 5 | F.3, F.4 | 4+ tuần |

## 9. Câu hỏi cần chốt trước khi code

| Mã | Câu hỏi | Ảnh hưởng |
|---|---|---|
| Q-A1 | **Dòng tiền:** WrapFit thu hộ toàn bộ rồi trả lại xưởng, hay xưởng tự thu và WrapFit xuất hóa đơn hoa hồng cho xưởng? Thu hộ có thể làm WrapFit phải đăng ký là sàn thương mại điện tử với Bộ Công Thương; nhóm cần hỏi người có chuyên môn pháp lý. | Toàn bộ mục A.8 |
| Q-A2 | Đơn in mẫu có tính hoa hồng 15% không? | BR-A3 |
| Q-A3 | Ai xuất hóa đơn VAT cho khách: xưởng (cho hàng hóa) hay WrapFit? Thông tin xuất hóa đơn đã được chụp vào từng thanh toán; hóa đơn điện tử (`einvoiceRef`) mới là đề xuất ở [14](14_PRICING_ENTITLEMENTS_SPEC.md) Phần C. | A.9, xuất báo cáo |
| Q-A6 | Affiliate có tính trên đơn in không? [14](14_PRICING_ENTITLEMENTS_SPEC.md) §7.6 nói không, trang `/affiliate` nói có. Chọn một rồi sửa bên còn lại. | BR-A13 |
| Q-A4 | Các mốc 50% cọc, 24 giờ nhận đơn, 3 ngày khiếu nại, 5% điều chỉnh giá: xưởng đối tác (Minh Tâm Prolab) có đồng ý không? | BR-A7–A10 |
| Q-A5 | Xưởng ngừng giữa chừng: ai chịu chi phí in lại? | EF-A3 |
| Q-B1 | Bảng giá thật của xưởng thay cho `QUOTE_PRICES` giả định. | BR-A2, BR-B4 |
| Q-C1 | Kiểm duyệt bằng người hay tự động? Ai trong nhóm làm người duyệt? | BR-C1, AF-C1 |
| Q-C2 | Có thưởng xu cho người tạo mẫu không, mức bao nhiêu? | BR-C9 |
| Q-C4 | Đủ 3 báo cáo vi phạm thì tự ẩn mẫu (đề xuất ở đây), hay luôn chờ Admin quyết như [14](14_PRICING_ENTITLEMENTS_SPEC.md) §7.4? | BR-C8 |
| Q-C3 | Ảnh của tác giả trong bản remix có còn sau khi bản gốc bị xóa không (viết test để xác nhận)? Nếu tác giả yêu cầu gỡ ảnh vì bản quyền thì gỡ khỏi cả bản remix hay không? | BR-C6 |
| Q-F1 | Thông số kỹ thuật thật của xưởng: khoảng cách lỗ tới nếp gấp, bán kính dao tối thiểu, phần dán PET. Hỏi cùng lần với các câu đang chờ xưởng ở [18](18_VIEC_CON_TREO_SAU_AUDIT_BE.md) §6 (nét và cỡ chữ ép kim, in mặt trong trên kraft, cách đọc file 4 lớp). | BR-F2–F9 |
| Q-G1 | Có dùng Zalo OA / ZNS không? Ai đứng tên OA, ngân sách phí tin nhắn bao nhiêu? | G.1 mức 2, ma trận thông báo |
| Q-G2 | Xưởng đối tác hay dùng hãng vận chuyển nào? Có cần tích hợp API hãng ngay không? | BR-G25 |
| Q-G3 | Trọng số xếp hạng xưởng (giá / thời gian / chất lượng / khoảng cách) và có cho xưởng trả tiền để lên đầu không? | G.3, BR-G14 |
| Q-G4 | Mức chống lách nền tảng: chỉ cảnh báo hay chặn số điện thoại trong tin nhắn trước khi xưởng nhận đơn? | BR-G19 |
| Q-H1 | Danh sách vật liệu thật xưởng có sẵn (loại, GSM, độ dày đo được), bảng tương thích gia công, và mẫu giấy thật để chụp ảnh / đo màu. | H.1, BR-H11 |

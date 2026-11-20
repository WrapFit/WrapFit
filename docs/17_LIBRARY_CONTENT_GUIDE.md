# Chuẩn file cho người vẽ nội dung thư viện

Tài liệu cho nhóm thiết kế làm sticker, nhãn, nền, biểu tượng, hình minh họa nhập qua `/admin/library`. Mục tiêu: file nhập vào in được ngay, đổi màu được trong studio, và không bị máy chủ từ chối.

Máy chủ kiểm mọi file khi nhập ([luật nhập file](../be/src/library/library-file.rules.ts), [service](../be/src/library/library.service.ts)). File không đạt bị trả `400 LIBRARY_FILE_REFUSED` kèm lý do bằng tiếng Việt. Trạng thái các quy tắc dưới đây: có mã trên `develop`.

## 1. Định dạng

| Loại | Định dạng nên dùng | Ghi chú |
| --- | --- | --- |
| Sticker, biểu tượng, nhãn, ký hiệu in | **SVG** | Vector: in nét ở mọi cỡ, đổi màu được trong studio |
| Nền, hoa văn, ảnh minh họa có chất liệu | PNG, JPEG hoặc WebP | Cạnh dài ≥ 591 px (in được 50 mm ở 300 DPI); nên làm ≥ 2400 px |

- Máy chủ chỉ nhận SVG, PNG, JPEG và WebP. Mỗi file tối đa 15 MB.
- Máy chủ từ chối ảnh raster có cạnh dài in được dưới 50 mm ở 300 DPI (`LIBRARY_FILE_REFUSED`). Cỡ in được tính bằng cạnh dài (px) ÷ 300 × 25,4, làm tròn tới 0,1 mm, nên làm từ 591 px là chắc chắn đạt.
- Khi đặt lên hộp, ảnh raster vẫn phải đạt 300 DPI ở kích thước in. Từ 150 đến dưới 300 DPI, FitCheck cảnh báo; dưới 150 DPI là lỗi chặn xuất file. Ảnh càng lớn thì người dùng càng phóng được to trên hộp.

## 2. SVG an toàn

Máy chủ từ chối SVG có các thành phần sau:

- `<script>`, thuộc tính sự kiện (`onload`, `onclick`…), liên kết `javascript:`
- `<foreignObject>`, `<iframe>`, `<embed>`, `<object>`, khai báo `<!ENTITY`
- Liên kết hoặc `url()` trỏ ra file bên ngoài. Chỉ dùng tham chiếu nội bộ (`#id`) hoặc ảnh nhúng `data:image/…`.

Khi xuất từ Illustrator / Figma / Inkscape:

- Chuyển chữ thành nét (outline). Máy in không có phông của bạn.
- Có `viewBox`. Không đặt kích thước bằng `%`.
- Bỏ metadata của phần mềm, layer ẩn, artboard thừa.

## 3. Để đổi màu được trong studio

Studio đổi màu SVG bằng cách thay từng màu của file (`shared/src/print/svg-colors.ts`). File gốc không đổi; thiết kế chỉ lưu bảng thay màu (tối đa 16 cặp). Khi nhập không cần đặt tên vùng màu: studio tự đọc màu của file.

Trong bảng "Màu của logo", người dùng thấy tối đa 8 màu, xếp theo **mức dùng nhiều nhất**. Nút "Theo bảng màu" gán lần lượt cho 6 màu đầu: màu dùng nhiều nhất → màu nền của bảng màu, màu thứ hai → màu nhấn, màu thứ ba → màu chữ, rồi lặp lại thứ tự đó cho màu thứ tư đến thứ sáu. Nút "Về màu gốc của file" trả lại màu ban đầu.

- Dùng **ít màu** (2–4 màu), màu đặc. Mỗi vai trò một màu duy nhất: mọi chỗ "nền" cùng một mã hex, mọi chỗ "nét" cùng một mã hex khác.
- Ghi màu bằng `fill="#RRGGBB"` / `stroke="#RRGGBB"` (hex, `rgb()`, tên màu hoặc `style="fill: …"` đều đọc được). Không dùng `currentColor` hay biến CSS. Hình không có `fill` được tính là màu đen.
- Màu chính (nền của tem) nên là màu chiếm nhiều chỗ nhất trong file, để "Theo bảng màu" ra kết quả đúng ý.
- Tránh hai màu gần giống nhau (`#1A1A1A` và `#1B1B1B`): người dùng sẽ thấy hai ô màu như nhau.
- Màu chuyển (gradient) đổi được ở từng điểm dừng (`stop-color`); ảnh raster nhúng bên trong SVG thì không đổi màu.

## 4. Tên, nhóm, thẻ, ngành

- **Tên hiển thị** bằng tiếng Việt, 2–120 ký tự, mô tả hình: "Tem tròn hoa mai", không phải "sticker_01".
- **Loại** chọn một trong: tem/sticker, nhãn, hình minh họa, nền/hoa văn, biểu tượng.
- **Từ khóa** (thẻ) gồm từ người dùng sẽ gõ, cách nhau bằng dấu phẩy, tối đa 16 thẻ, mỗi thẻ ≤ 40 ký tự. Có dấu và không dấu đều được (tìm kiếm bỏ dấu): `tết, hoa mai, xuân`.
- **Ngành** được suy ra từ tên và thẻ (`industriesOf` trong `shared/src/library/catalog.ts`, so sau khi bỏ dấu). Studio có 6 ngành: Bánh & kẹo, Nến thơm, Mỹ phẩm, Trang sức, Trà & nông sản, Đồ uống. Muốn tài sản hiện ở ngành nào thì thêm thẻ của ngành đó, ví dụ: `bánh`, `kẹo`, `nến thơm`, `mỹ phẩm`, `hữu cơ`, `trang sức`, `kim cương`, `trà`, `mật ong`, `nông sản`, `đồ uống`, `cà phê`, `trà sữa`… Tài sản không có thẻ ngành hiện ở mọi ngành.

## 5. Giấy phép và ghi nguồn

Chỉ nhập file tự vẽ hoặc có giấy phép cho phép in trên sản phẩm bán ra. Ô "Giấy phép" là bắt buộc và chỉ nhận các mã sau:

| Mã | Giấy phép | Bắt buộc ghi nguồn |
| --- | --- | --- |
| `CC0-1.0` | CC0 / Public Domain Dedication | Không |
| `PUBLIC-DOMAIN` | Public domain (hết bảo hộ) | Không |
| `OFL-1.1` | SIL Open Font License 1.1 | Không |
| `MIT` | MIT | Không |
| `ISC` | ISC | Không |
| `APACHE-2.0` | Apache 2.0 | Không |
| `CC-BY-4.0` | CC BY 4.0 | **Có** |
| `OWN-WORK` | WrapFit tự thiết kế | Không |
| `COMMERCIAL` | Đã mua bản quyền thương mại | Không |

- Với `CC-BY-4.0`, ô "Ghi nguồn tác giả" (≤ 300 ký tự) bắt buộc. Để trống thì máy chủ trả `400 ATTRIBUTION_REQUIRED`.
- Lưu link nguồn vào ô "Nguồn (URL)" (`http`/`https`, ≤ 500 ký tự) để sau này tra lại được.
- Ảnh kho Pexels không nhập vào thư viện. Người dùng chèn ảnh kho trực tiếp trong studio; ảnh đó có ghi nguồn tác giả, và hộp chỉ có ảnh kho mà không có chữ, logo, hoa văn hoặc ảnh riêng thì FitCheck báo lỗi `STOCK_PHOTO_ALONE`.

## 6. Mục tiêu nội dung

Mục tiêu nội dung của thư viện, do nhóm thiết kế làm ngoài code: khoảng 150 sticker, 50 nhãn, 40 nền, 30 tổ hợp chữ và 20 bộ mẫu; mỗi ngành có ít nhất 20 tài sản. Trạng thái: chờ kiểm thực tế (trưởng nhóm nội dung đếm lại trên `/admin/library` và trong studio).

Tài sản đã nhập có thể ẩn khỏi studio bằng công tắc "Hiện … trong studio" ở danh sách của `/admin/library`. Thiết kế đang dùng tài sản đó vẫn giữ file.

## 7. Kiểm trước khi nhập

1. Mở file SVG trong trình duyệt: hiện đúng, không lỗi.
2. Đếm màu: ≤ 4 màu, mỗi vai trò một mã.
3. Với ảnh raster: cạnh dài ≥ 591 px. Thử nhập một file nhỏ hơn ngưỡng (ví dụ 500 px) một lần để thấy thông báo `LIBRARY_FILE_REFUSED`.
4. Nhập vào `/admin/library`, mở studio, đặt lên hộp, thử "Theo bảng màu" với 2–3 bảng màu.
5. Kiểm file in: lưu thiết kế thử thành dự án, mở bước 6 (Đặt in). File in chỉ mở khi phiên bản thiết kế có đơn in đã thanh toán, nếu chưa thì máy chủ trả `402 ORDER_PAYMENT_REQUIRED` (xem [03 · Thiết kế API](03_API_DESIGN.md#xuất-file-in)). Sau khi xuất, mở PDF xem màu và nét đúng như màn hình. Nếu chưa có đơn in đã thanh toán, dùng ảnh 3D và khuôn 2D ở bước 6 để so màu, rồi kiểm PDF ở lần đặt in thật.

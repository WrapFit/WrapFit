# Chuẩn file cho người vẽ nội dung thư viện

Tài liệu cho nhóm thiết kế làm sticker, nhãn, nền, ký hiệu in nhập qua `/admin/library` (docs/23 S14). Mục tiêu: file nhập vào in được ngay, đổi màu được trong studio, và không bị máy chủ từ chối.

## 1. Định dạng

| Loại | Định dạng nên dùng | Ghi chú |
| --- | --- | --- |
| Sticker, biểu tượng, nhãn, ký hiệu in | **SVG** | Vector: in nét ở mọi cỡ, đổi màu được trong studio |
| Nền, hoa văn, ảnh minh họa có chất liệu | PNG hoặc JPEG | Cạnh dài ≥ 591 px (in được 50 mm ở 300 DPI); nên làm ≥ 2400 px |

Máy chủ từ chối ảnh raster in được dưới 50 mm ở 300 DPI (`LIBRARY_FILE_REFUSED`).

## 2. SVG an toàn

Máy chủ từ chối SVG có các thành phần sau (`be/src/library/library-file.rules.ts`):

- `<script>`, thuộc tính sự kiện (`onload`, `onclick`…), liên kết `javascript:`
- `<foreignObject>`, `<iframe>`, `<embed>`, `<object>`, khai báo `<!ENTITY`
- Liên kết hoặc `url()` trỏ ra file bên ngoài. Chỉ dùng tham chiếu nội bộ (`#id`) hoặc ảnh nhúng `data:image/…`.

Khi xuất từ Illustrator / Figma / Inkscape:

- Chuyển chữ thành nét (outline). Máy in không có phông của bạn.
- Có `viewBox`. Không đặt kích thước bằng `%`.
- Bỏ metadata của phần mềm, layer ẩn, artboard thừa.

## 3. Để đổi màu được trong studio

Studio đổi màu SVG bằng cách thay từng màu của file (`shared/src/print/svg-colors.ts`). Người dùng thấy các màu xếp theo **mức dùng nhiều nhất**, và nút "Theo bảng màu" gán lần lượt: màu dùng nhiều nhất → màu nền của bảng màu, màu thứ hai → màu nhấn, màu thứ ba → màu chữ.

- Dùng **ít màu** (2–4 màu), màu đặc. Mỗi vai trò một màu duy nhất: mọi chỗ "nền" cùng một mã hex, mọi chỗ "nét" cùng một mã hex khác.
- Ghi màu bằng `fill="#RRGGBB"` / `stroke="#RRGGBB"` (hex, `rgb()` hoặc `style="fill: …"` đều đọc được). Không dùng `currentColor` hay biến CSS.
- Màu chính (nền của tem) nên là màu chiếm nhiều chỗ nhất trong file, để "Theo bảng màu" ra kết quả đúng ý.
- Tránh hai màu gần giống nhau (`#1A1A1A` và `#1B1B1B`): người dùng sẽ thấy hai ô màu như nhau.
- Màu chuyển (gradient) đổi được ở từng điểm dừng (`stop-color`); ảnh raster nhúng bên trong SVG thì không đổi màu.

## 4. Tên, thẻ, ngành

- **Tên** bằng tiếng Việt, mô tả hình: "Tem tròn hoa mai", không phải "sticker_01".
- **Thẻ** gồm từ người dùng sẽ gõ, có dấu và không dấu đều được (tìm kiếm bỏ dấu): `tết, hoa mai, xuân`.
- Ngành được suy ra từ tên và thẻ (`industriesOf` trong `shared/src/library/catalog.ts`): muốn tài sản hiện ở ngành nào thì thêm thẻ của ngành đó: `bánh`, `kẹo`, `nến thơm`, `mỹ phẩm`, `hữu cơ`, `trang sức`, `kim cương`, `trà`, `mật ong`, `nông sản`… Tài sản không có thẻ ngành hiện ở mọi ngành.

## 5. Giấy phép

Chỉ nhập file tự vẽ hoặc có giấy phép rõ ràng: CC0, Public domain, OFL, MIT, ISC, Apache 2.0, CC BY 4.0 (bắt buộc điền ghi nguồn), tự thiết kế, hoặc đã mua bản quyền thương mại. Lưu link nguồn vào ô "Nguồn".

## 6. Kiểm trước khi nhập

1. Mở file SVG trong trình duyệt: hiện đúng, không lỗi.
2. Đếm màu: ≤ 4 màu, mỗi vai trò một mã.
3. Nhập vào `/admin/library`, mở studio, đặt lên hộp, thử "Theo bảng màu" với 2–3 bảng màu.
4. Xuất PDF ở bước 6, mở xem màu và nét đúng như màn hình.

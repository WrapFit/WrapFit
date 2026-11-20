# 📦 HƯỚNG DẪN BAO BÌ & KỊCH BẢN HỖ TRỢ KHÁCH HÀNG (PACKAGING GUIDELINES & SUPPORT)

> **Dự án**: WrapFit Platform (EXE101 — FPT University)  
> **Tài liệu tham chiếu**: Dành cho Khách hàng cá nhân, Chủ shop Handmade, và Bộ phận Kỹ thuật / CSKH WrapFit.  
> **Cập nhật**: 2026-11-19. Mọi thông số in lấy từ [prepress.ts](../shared/src/print/prepress.ts) và [validator.ts](../shared/src/fitcheck/validator.ts).

---

## 1. Thuật Ngữ Tiêu Chuẩn Trong Ngành Bao Bì (Packaging Lexicon)

Khi tư vấn hoặc kiểm tra file thiết kế của khách hàng, đội ngũ cần nắm vững các định nghĩa kỹ thuật sau:

| Thuật ngữ | Tiếng Anh | Định nghĩa kỹ thuật | Tiêu chuẩn WrapFit |
| :--- | :--- | :--- | :--- |
| **Nét Cắt** | Cut Line | Đường cắt đứt rời chu vi bên ngoài của tấm bìa bằng dao bế cơ học. | Màu đỏ `#E53E3E`, nét liền (solid). Trong file in là màu pha `CutContour`, nét $0.25\text{mm}$. |
| **Nét Cấn / Gấp** | Crease / Score Line | Đường ấn lõm tạo nếp gấp để thợ dễ dàng gập hộp mà không làm nứt sớ giấy. | Màu xanh dương `#3182CE`, nét đứt (dashed `4,4`). Trong file in là màu pha `Crease`, nét $0.25\text{mm}$. |
| **Vùng Tràn Lề** | Bleed Margin | Phần màu nền/hoa văn phải phủ tràn ra ngoài nét cắt để tránh viền trắng khi máy bế lệch $1\text{mm}$. | Nền chạm nét cắt phải tràn ra ngoài $\ge 2\text{mm}$. Thiếu là cảnh báo, chưa chặn xuất. |
| **Khung Tràn Lề của PDF** | BleedBox | Khung trong file PDF cho nhà in biết vùng được phép in tràn quanh phôi. | Rộng hơn phôi $3\text{mm}$ mỗi phía. Đây là khung của file, không phải yêu cầu với thiết kế. |
| **Lề An Toàn** | Safe Area / Inner Margin | Vùng tối thiểu cách nét cắt và nếp cấn; chữ hoặc logo không được nằm ngoài vùng này. | Cách nét cắt $\ge 5\text{mm}$, cách nếp gấp $\ge 3\text{mm}$. Thiếu lề là cảnh báo. Cách dưới $1\text{mm}$ hoặc tràn ra ngoài mặt là lỗi chặn xuất. |
| **Độ Phân Giải Ảnh** | Resolution (DPI) | Số điểm ảnh trên mỗi inch, tính ở kích thước in thật trên hộp. | Đạt từ $300\text{ DPI}$. Từ 150 đến dưới 300 là cảnh báo. Dưới $150\text{ DPI}$ là lỗi chặn xuất. |
| **Độ Dày Giấy** | Caliper / Paper Thickness ($t$) | Chiều dày thực tế của tấm giấy tính bằng milimet (công thức $t = \text{GSM} \times 0.0014\text{ mm}$). | $0.35\text{mm} - 0.56\text{mm}$ (tương ứng $250 - 400\text{ GSM}$). |
| **Định Lượng Giấy** | GSM ($\text{g/m}^2$) | Khối lượng trên một mét vuông giấy, quyết định độ cứng của hộp. | Tối thiểu $250\text{ GSM}$ cho hộp nhỏ, $350 - 400\text{ GSM}$ cho hộp lớn. |

> **Nền tràn 2 mm và `BleedBox` 3 mm khác nhau.** 2 mm là mức tối thiểu nền phải tràn ra ngoài nét cắt để FitCheck không cảnh báo. 3 mm là khung tràn lề WrapFit ghi vào PDF cho nhà in. Nút "Tự sửa lề nhanh" kéo nền tràn đủ 3 mm, nên nền đã sửa luôn lấp kín `BleedBox`.

---

## 2. Bảng Ma Trận Chọn Chất Liệu Giấy (Material Selection Matrix)

Khách hàng thường băn khoăn không biết chọn loại giấy nào cho sản phẩm của mình. Dưới đây là bảng tra cứu khuyến nghị:

| Món quà / Sản phẩm | Kích thước gợi ý | Chất liệu khuyên dùng | Định lượng (GSM) | Kiểu hộp tối ưu |
| :--- | :--- | :--- | :--- | :--- |
| **Nến thơm hũ thủy tinh** | $80 \times 80 \times 100\text{ mm}$ | Giấy Kraft nâu / Ivory bồi sóng E | $350\text{ GSM}$ | *Tuck Top Box (Khóa đáy)* |
| **Khuyên tai / Nhẫn bạc** | $50 \times 50 \times 25\text{ mm}$ | Giấy mỹ thuật dập nổi vân mây | $250 - 300\text{ GSM}$ | *Pillow Box (Hộp gối)* |
| **Khăn lụa / Áo thun handmade** | $200 \times 150 \times 40\text{ mm}$ | Giấy Kraft vàng nhám + cửa sổ mica | $300\text{ GSM}$ | *Sleeve & Drawer (Hộp bao diêm)* |
| **Set mỹ phẩm cao cấp** | $180 \times 120 \times 60\text{ mm}$ | Giấy mỹ thuật bồi Carton lạnh cứng | $350\text{ GSM}$ | *Lid & Base (Hộp âm dương)* |
| **Xà bông organic** | $90 \times 60 \times 35\text{ mm}$ | Giấy Kraft nâu tái chế 100% | $280\text{ GSM}$ | *Tuck Top Box* |

---

## 3. Xử Lý Sự Cố In Ấn Thường Gặp (Printing & Die-Cutting Troubleshooting)

### ⚠️ Sự cố 1: "Hộp gập xong bị bung đáy khi để quà nặng"
- **Nguyên nhân**: Sử dụng đáy cài thường thay vì đáy tự khóa (Crash Lock Bottom) cho vật phẩm $> 300\text{g}$.
- **Giải pháp WrapFit**: Ở bước 2 (Kích thước), nhập cân nặng món quà. Hộp nắp gài tự dùng đáy khóa khi quà nặng hơn $300\text{g}$, trừ khi khách chủ động chọn đáy cài thường ([tuck-top.ts](../shared/src/parametric/tuck-top.ts)).

### ⚠️ Sự cố 2: "Nắp gài quá chật, bị phồng hoặc cong vênh khi đóng"
- **Nguyên nhân**: Không tính dung sai độ dày giấy ($t$). Khi gập $90^\circ$, bề dày giấy chiếm mất không gian bên trong hộp.
- **Giải pháp WrapFit**: Công thức của WrapFit đặt mọi nếp gấp ở giữa bề dày giấy. Một mặt nằm giữa hai vách được cộng thêm $t$ (mỗi bên nửa độ dày), nên kích thước lòng hộp đúng bằng $L \times W \times H$ khách nhập.

### ⚠️ Sự cố 3: "Viền trắng xuất hiện quanh mép hộp sau khi cắt"
- **Nguyên nhân**: File thiết kế không vẽ tràn lề (Bleed) đủ $2\text{mm}$.
- **Giải pháp WrapFit**: FitCheck™ cảnh báo `BLEED_INSUFFICIENT` (mức cảnh báo, không chặn xuất) khi nền chạm nét cắt mà tràn chưa đủ $2\text{mm}$. Khách kéo nền tràn ra ngoài nét cắt 2–3 mm, lùi hẳn vào trong 3 mm, hoặc bấm "Tự sửa lề nhanh".

### ⚠️ Sự cố 4: "Logo hoặc chữ bị nếp gập đè lên làm mất thẩm mỹ"
- **Nguyên nhân**: Phần tử đồ họa nằm trong lề an toàn: cách nét cắt dưới $5\text{mm}$ hoặc cách nếp gấp dưới $3\text{mm}$.
- **Giải pháp WrapFit**: FitCheck™ báo `CUT_OVERLAP` hoặc `CREASE_OVERLAP`. Còn cách từ $1\text{mm}$ trở lên thì chỉ là cảnh báo (màu vàng), vẫn xuất được. Dưới $1\text{mm}$ hoặc tràn ra ngoài mặt thì thành lỗi chặn xuất (màu đỏ). Ở bước 6 (Đặt in), nút **"Tự sửa lề nhanh"** dời và thu nhỏ phần tử vào vùng an toàn; khách cũng có thể bấm "Mở bước Thiết kế để sửa" để tự dời.

---

## 4. Kịch Bản Tư Vấn Khách Hàng (Support Script)

WrapFit hiện chưa có chatbot trả lời tự do. "Trợ lý Gói" trên giao diện chỉ là linh vật hiện mẹo. Các kịch bản dưới là lời thoại mẫu để CSKH trả lời khách qua chat, email hoặc mạng xã hội, và làm nội dung cho chatbot sau này.

### 💬 Kịch bản A: Tư vấn kích thước & loại hộp
- **Người dùng**: *"Mình muốn làm hộp đựng một lọ nước hoa $50\text{ml}$ có kích thước $4.5 \times 4.5 \times 9.5\text{ cm}$, nên chọn kiểu gì?"*
- **CSKH WrapFit**:
  > *"Chào bạn! Với kích thước chai nước hoa $45 \times 45 \times 95\text{ mm}$, trọng lượng khoảng $180\text{g}$:*  
  > *1. **Kích thước hộp lọt lòng đề xuất**: $48 \times 48 \times 98\text{ mm}$ (dư $3\text{mm}$ mỗi chiều để dễ rút chai ra vào).*  
  > *2. **Kiểu hộp tối ưu**: **Hộp nắp gài đáy khóa (Tuck Top Box)** với tai gài ma sát để tránh tuột.*  
  > *3. **Chất liệu giấy**: Giấy Ivory $300\text{ GSM}$ cán màng mờ tạo cảm giác mịn màng sang trọng.*  
  > *👉 Bạn mở Studio, chọn "Hộp nắp gài" ở bước 1 (Kiểu hộp), rồi ở bước 2 (Kích thước) chọn đo "Lọt lòng" và nhập $48 \times 48 \times 98$. Hộp 3D bên cạnh cập nhật ngay để bạn xem thử."*

### 💬 Kịch bản B: Khách hàng hỏi cách lấy file đem đi in
- **Người dùng**: *"Sau khi thiết kế xong thì mình tải file gì và đem ra đâu in được?"*
- **CSKH WrapFit**:
  > *"Bạn mở bước 6 (**Đặt in**) và xem thẻ **Gói File Xuất Xưởng** nhé:*  
  > *- Thiết kế cần được lưu thành dự án (đăng nhập rồi bấm "Lưu dự án để thanh toán"). Bản dùng thử chưa xuất được file in.*  
  > *- FitCheck™ không còn **lỗi chặn xuất** (màu đỏ). Cảnh báo màu vàng vẫn cho xuất, nhưng nên sửa để bản in đẹp hơn.*  
  > *- File in mở sau khi bạn **thanh toán đơn in** của đúng bản thiết kế này: bấm "Thanh toán" để thêm thiết kế vào giỏ in, đặt và trả tiền. Quay lại Studio, thẻ đổi thành "Đã thanh toán" và có nút "Xuất file in ngay".*  
  > *- Lưu thiết kế luôn miễn phí. Nếu bạn sửa thiết kế sau khi đã thanh toán, bản mới cần một đơn in mới; đổi tên dự án thì không ảnh hưởng.*  
  > *- Bạn chọn loại file: **PDF CMYK** cho xưởng in (lớp `CutContour`, `Crease`, `Artwork` tách riêng), **PDF in A4/A3** có dấu xén để tự in, **SVG** cho máy cắt Cricut/laser, **DXF** cho máy bế CNC, hoặc **gói nhà in (ZIP)** gồm đủ các file trên.*  
  > *- Mang file PDF CMYK tới xưởng in, yêu cầu in trên giấy Kraft hoặc Ivory định lượng từ 250 - 300 GSM và chạy máy bế theo đường `CutContour` có sẵn."*

### 💬 Kịch bản C: Khách hỏi về cảnh báo FitCheck và vì sao chưa tải được file
Dùng bảng dưới để trả lời nhanh. Cột cuối là việc khách cần làm tiếp.

| Khách gặp | FitCheck / máy chủ báo | Còn xuất được không | Việc cần làm tiếp |
| :--- | :--- | :--- | :--- |
| Logo cách nét cắt $4\text{mm}$ | Cảnh báo `CUT_OVERLAP` "Quá sát nét cắt" (cần ≥ 5 mm) | Có | Dời logo vào trong thêm **ít nhất 1 mm** (cách nét cắt ≥ 5 mm), hoặc bấm "Tự sửa lề nhanh". |
| Logo cách nét cắt dưới $1\text{mm}$, hoặc tràn ra ngoài mặt | Lỗi `CUT_OVERLAP` (chặn xuất) | Không | Bắt buộc dời logo vào trong, cách nét cắt ≥ 5 mm. Với nếp gấp, cách ≥ 3 mm. |
| Ảnh $200\text{ DPI}$ ở kích thước in | Cảnh báo `LOW_DPI` "có thể bị mờ nhòe" | Có | Nên thay ảnh gốc chất lượng cao hơn, hoặc thu nhỏ ảnh trên hộp cho tới khi đạt 300 DPI. |
| Ảnh dưới $150\text{ DPI}$ | Lỗi `LOW_DPI` "chắc chắn sẽ vỡ hạt" (chặn xuất) | Không | Phải thay ảnh khác, hoặc thu nhỏ ảnh cho tới khi đạt ít nhất 150 DPI (nên 300 DPI). |
| Thiết kế đạt FitCheck nhưng chưa thanh toán | Thẻ "Cần đặt in"; máy chủ trả `402 ORDER_PAYMENT_REQUIRED` | Chưa | Bấm "Thanh toán" ở bước 6 để thêm thiết kế vào giỏ in, đặt in và trả tiền, rồi quay lại bấm "Xuất file in ngay". |

Ghi chú cho CSKH: máy chủ chạy lại FitCheck mỗi lần xuất file, nên lỗi chặn xuất luôn được kiểm trước khi kiểm thanh toán. Còn lỗi thì máy chủ trả `422`, kể cả khi đơn in đã trả tiền.

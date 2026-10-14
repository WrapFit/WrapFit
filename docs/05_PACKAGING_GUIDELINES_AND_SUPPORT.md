# 📦 HƯỚNG DẪN BAO BÌ & KỊCH BẢN HỖ TRỢ KHÁCH HÀNG (PACKAGING GUIDELINES & SUPPORT)

> **Dự án**: WrapFit Platform (EXE101 — FPT University)  
> **Tài liệu tham chiếu**: Dành cho Khách hàng cá nhân, Chủ shop Handmade, và Bộ phận Kỹ thuật / CSKH WrapFit Bot.

---

## 1. Thuật Ngữ Tiêu Chuẩn Trong Ngành Bao Bì (Packaging Lexicon)

Khi tư vấn hoặc kiểm tra file thiết kế của khách hàng, đội ngũ cần nắm vững các định nghĩa kỹ thuật sau:

| Thuật ngữ | Tiếng Anh | Định nghĩa kỹ thuật | Tiêu chuẩn WrapFit |
| :--- | :--- | :--- | :--- |
| **Nét Cắt** | Cut Line | Đường cắt đứt rời chu vi bên ngoài của tấm bìa bằng dao bế cơ học. | Màu đỏ `#E53E3E`, nét liền (solid), stroke $0.5\text{pt}$. |
| **Nét Cấn / Gấp** | Crease / Score Line | Đường ấn lõm tạo nếp gấp để thợ dễ dàng gập hộp mà không làm nứt sớ giấy. | Màu xanh dương `#3182CE`, nét đứt (dashed `4,4`), stroke $0.5\text{pt}$. |
| **Vùng Tràn Lề** | Bleed Margin | Phần màu nền/hoa văn phải phủ tràn ra ngoài nét cắt để tránh viền trắng khi máy bế lệch $1\text{mm}$. | Bắt buộc $\ge 2.0\text{mm}$ tính từ nét cắt ra ngoài. |
| **Lề An Toàn** | Safe Area / Inner Margin | Vùng tối thiểu cách nét cắt và nếp cấn; chữ hoặc logo không được nằm ngoài vùng này. | Bắt buộc $\ge 3.0\text{mm}$ bên trong nếp cấn/nét cắt. |
| **Độ Dày Giấy** | Caliper / Paper Thickness ($t$) | Chiều dày thực tế của tấm giấy tính bằng milimet (công thức $t = \text{GSM} \times 0.0014\text{ mm}$). | $0.35\text{mm} - 0.55\text{mm}$ (tương ứng $250 - 400\text{ GSM}$). |
| **Định Lượng Giấy** | GSM ($\text{g/m}^2$) | Khối lượng trên một mét vuông giấy, quyết định độ cứng của hộp. | Tối thiểu $250\text{ GSM}$ cho hộp nhỏ, $350 - 400\text{ GSM}$ cho hộp lớn. |

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
- **Giải pháp WrapFit**: Khuyên khách hàng chuyển sang cấu trúc *Hộp nắp gài đáy khóa* hoặc tăng tai gài đáy thêm $3\text{mm}$.

### ⚠️ Sự cố 2: "Nắp gài quá chật, bị phồng hoặc cong vênh khi đóng"
- **Nguyên nhân**: Không tính dung sai độ dày giấy ($t$). Khi gập $90^\circ$, bề dày giấy chiếm mất không gian bên trong hộp.
- **Giải pháp WrapFit**: Công thức toán học của WrapFit tự động cộng thêm $0.5 \times t$ cho mỗi nếp gập liên tiếp ($L_{\text{outside}} = L + 2t$).

### ⚠️ Sự cố 3: "Viền trắng xuất hiện quanh mép hộp sau khi cắt"
- **Nguyên nhân**: File thiết kế không vẽ tràn lề (Bleed) đủ $2\text{mm}$.
- **Giải pháp WrapFit**: Trình kiểm tra `FitCheck™` sẽ chặn xuất file và hiển thị cảnh báo đỏ nếu ảnh nền kết thúc sát nét cắt.

### ⚠️ Sự cố 4: "Logo hoặc chữ bị nếp gập đè lên làm mất thẩm mỹ"
- **Nguyên nhân**: Phần tử đồ họa nằm phạm vào Lề an toàn Safe Margin ($< 3\text{mm}$).
- **Giải pháp WrapFit**: Drawer cảnh báo FitCheck tự động highlight màu vàng các phần tử vi phạm và cung cấp nút "Tự động căn chỉnh lề an toàn" (Auto Safe Margin Snapping).

---

## 4. Kịch Bản Chatbot Tư Vấn (WrapFit AI Assistant Script)

Khi người dùng mở trợ lý WrapFit trên Web Studio, bot sẽ tương tác theo các kịch bản sau:

### 💬 Kịch bản A: Tư vấn kích thước & loại hộp
- **Người dùng**: *"Mình muốn làm hộp đựng một lọ nước hoa $50\text{ml}$ có kích thước $4.5 \times 4.5 \times 9.5\text{ cm}$, nên chọn kiểu gì?"*
- **WrapFit Bot**:
  > *"Chào bạn! Với kích thước chai nước hoa $45 \times 45 \times 95\text{ mm}$, trọng lượng khoảng $180\text{g}$:*  
  > *1. **Kích thước hộp lọt lòng đề xuất**: $48 \times 48 \times 98\text{ mm}$ (dư $3\text{mm}$ mỗi chiều để dễ rút chai ra vào).*  
  > *2. **Kiểu hộp tối ưu**: **Hộp nắp gài đáy khóa (Tuck Top Box)** với tai gài ma sát để tránh tuột.*  
  > *3. **Chất liệu giấy**: Giấy Ivory $300\text{ GSM}$ cán màng mờ tạo cảm giác mịn màng sang trọng.*  
  > *👉 Mình đã áp dụng thông số này lên khung vẽ 2D cho bạn rồi nhé, bạn có thể xem thử mô phỏng 3D ngay bên cạnh!"*

### 💬 Kịch bản B: Khách hàng hỏi cách đem file đi in
- **Người dùng**: *"Sau khi thiết kế xong thì mình tải file gì và đem ra đâu in được?"*
- **WrapFit Bot**:
  > *"Bạn bấm nút **'Xuất bản vẽ' (Export Dieline)** góc trên bên phải nhé:*  
  > *- Hệ thống sẽ xuất cho bạn file **PDF chuẩn in Vector** với 3 Layer tách biệt:*  
  > *  🔴 Layer 1: Nét cắt dao bế (CutContour).*  
  > *  🔵 Layer 2: Nếp cấn gập (Crease).*  
  > *  🎨 Layer 3: Đồ họa nghệ thuật (Artwork & Bleed).*  
  > *- Bạn chỉ cần mang file này ra bất kỳ tiệm photocopy/in nhanh kỹ thuật số nào gần nhất, yêu cầu họ in trên giấy Kraft hoặc Ivory định lượng từ 250 - 300 GSM và chạy máy bế theo đường line có sẵn là sẽ có hộp hoàn hảo!"*

# 📋 ĐẶC TẢ YÊU CẦU HỆ THỐNG (REQUIREMENTS SPECIFICATION)

> **Dự án**: WrapFit Platform (EXE101 — FPT University)  
> **Cập nhật**: 2026-11-19, đối chiếu với mã trên `develop`.  
> **Cách ghi trạng thái**: mỗi yêu cầu ghi một trong ba mức: *có mã trên `develop`*; *đã kiểm bằng test hoặc E2E* (kèm ngày); *chờ kiểm thực tế* (kèm vai trò người kiểm). Số test backend ngày 19/11/2026: 1.180/1.180 unit (77 bộ) và 318/318 E2E (24 bộ).

---

## 1. Yêu Cầu Chức Năng (Functional Requirements)

### 1.1. Phân Hệ Thiết Kế Bao Bì (Frontend - IT 1 & IT 2)
- **FR-01 (Khai báo kích thước)**: Người dùng nhập $L, W, H$ theo đơn vị `mm` hoặc `cm` (lưu theo mm). Với hộp, hệ thống giới hạn phạm vi hợp lệ $L \ge 40\text{mm}$, $W \ge 30\text{mm}$, $H \ge 20\text{mm}$, tối đa $600\text{mm}$ mỗi chiều. Thẻ treo và thiệp gấp đôi chỉ hỏi Ngang × Cao, tối thiểu $30\text{mm}$ mỗi chiều. Một số kết cấu có luật riêng: hộp quai xách dài ≥ 60 mm, khay xách ly dài ≥ 70 mm, hộp gối dày tối đa bằng nửa chiều rộng ([seed](../be/prisma/seed-data.ts), [validator](../shared/src/fitcheck/validator.ts)).
  *Trạng thái: có mã trên `develop`.*
- **FR-02 (Cấu trúc hộp)**: Hỗ trợ sinh bản vẽ bế tự động. **Phạm vi MVP ban đầu là 4 cấu trúc**:
  1. *Tuck Top Box* (Hộp nắp gài đáy khóa, `tuck-top`).
  2. *Sleeve & Drawer Box* (Hộp kéo bao diêm, `sleeve-drawer`).
  3. *Lid & Base Box* (Hộp âm dương, `lid-base`).
  4. *Pillow Box* (Hộp gối, `pillow`).

  **Hiện trạng**: seed của CSDL có **11 cấu trúc** (bảng `box_templates`): 4 cấu trúc trên và `mailer` (hộp nắp cài), `gable` (hộp quai xách), `cup-carrier` (khay xách ly), `insert` (khay chia ngăn), `hang-tag` (thẻ treo), `folded-card` (thiệp gấp đôi), `belly-band` (đai giấy bọc hộp). Bước 1 của Studio lấy danh sách từ API nên hiện đúng 11 cấu trúc này ([seed](../be/prisma/seed-data.ts)).

  **Trường hợp `sticker-label`** (tem nhãn): bộ công thức v3 trong `@wrapfit/shared` có công thức này ([registry](../shared/src/parametric/registry.ts)), nhưng seed không tạo dòng `box_templates` cho nó. Vì vậy `sticker-label` chỉ hiện ở bản Studio chạy không có API (bản demo offline), và không lưu thành dự án trên máy chủ được. Khi nêu số cấu trúc, luôn ghi rõ đang đếm cấu trúc trong CSDL (11) hay công thức (12).
  *Trạng thái: có mã trên `develop`. Kích thước lòng hộp của các kết cấu mới đã kiểm bằng test (`mailer-dieline.spec.ts`, `gable-window-dieline.spec.ts`, `insert-flat-dieline.spec.ts`, 19/11/2026).*
- **FR-03 (Canvas 2D phẳng)**: Hiển thị nét cắt dao màu đỏ `#E53E3E` (solid) và nếp cấn gấp màu xanh `#3182CE` (dashed `4,4`).
  *Trạng thái: có mã trên `develop`.*
- **FR-04 (Mô phỏng gập 3D)**: Cho phép xoay $360^\circ$ và kéo thanh trượt từ $0\%$ (phẳng) đến $100\%$ (hộp đóng kín hoàn toàn).
  *Trạng thái: có mã trên `develop`.*
- **FR-05 (FitCheck™ Validation)**: Một bộ luật dùng chung cho Studio (chấm điểm trực tiếp) và máy chủ (chấm lại khi xuất file), nguồn [validator](../shared/src/fitcheck/validator.ts) và [prepress](../shared/src/print/prepress.ts):
  - **Lề an toàn**: chữ, logo, mã vạch cách nét cắt $\ge 5\text{mm}$ và cách nếp gấp $\ge 3\text{mm}$. Thiếu lề (`CUT_OVERLAP`, `CREASE_OVERLAP`) là cảnh báo. Cách dưới $1\text{mm}$ hoặc tràn ra ngoài mặt thì thành lỗi chặn xuất.
  - **Tràn lề**: nền chạm nét cắt phải tràn ra ngoài $\ge 2\text{mm}$, nếu không là cảnh báo `BLEED_INSUFFICIENT`. Trong file PDF, `BleedBox` rộng hơn phôi $3\text{mm}$.
  - **Độ phân giải**: chỉ áp dụng cho ảnh raster có DPI, tính ở kích thước in. Ranh giới:

    | DPI ở kích thước in | Kết quả |
    | :--- | :--- |
    | 149 | Lỗi `LOW_DPI`, chặn xuất |
    | 150 | Cảnh báo `LOW_DPI` |
    | 299 | Cảnh báo `LOW_DPI` |
    | 300 | Đạt |

  - **Chấm điểm** trên thang $100$: trừ 30 điểm mỗi lỗi, 10 điểm mỗi cảnh báo. Được xuất file khi không còn lỗi mức `error`. Mốc ≥ 90 điểm chỉ dùng khi đưa mẫu vào thư viện cộng đồng.
  - **Nút "Tự sửa lề nhanh"** ở bước 6 dời và thu nhỏ phần tử vào vùng an toàn, kéo nền tràn ra ngoài nét cắt $3\text{mm}$.

  *Trạng thái: đã kiểm bằng test (`fitcheck.spec.ts`, 19/11/2026). Ranh giới DPI 149/150/299/300 và lề 4 mm / 0,5 mm được chạy lại trực tiếp với hàm `checkBox` ngày 19/11/2026.*

### 1.2. Phân Hệ Xuất File & Backend (Backend - IT 3 & IT 2)
- **FR-06 (Xuất file vector đa lớp)**: Xuất 5 loại file: PDF CMYK cho xưởng in, PDF in A4/A3 có dấu xén, SVG nhiều lớp cho máy cắt Cricut/laser, DXF cho máy bế CNC, và gói nhà in ZIP. PDF và SVG tách lớp `Artwork`, `Finish`, `Crease`, `CutContour`, `Dimensions` (lớp kích thước không in) ([DTO](../be/src/export/dto/create-export.dto.ts)).
  *Trạng thái: đã kiểm bằng E2E (`export.e2e-spec.ts`, 19/11/2026).*
- **FR-07 (Lưu trữ dự án)**: Cho phép lưu trạng thái thiết kế và tải lại theo mã ID. Dự án đã lưu tự lưu khi sửa. Mỗi lần nội dung thiết kế đổi thì số phiên bản tăng, còn đổi tên thì không.
  *Trạng thái: có mã trên `develop`.*
- **FR-08 (Gợi ý hoa văn AI)**: Gợi ý bảng màu và hoa văn theo từ khóa phong cách người dùng nhập. Hoa văn AI tính bằng xu. Thiếu xu, máy chủ trả `402 INSUFFICIENT_CREDITS { kind: 'XU', balance, cost }`. Khi AI tắt hoặc hết ngân sách, hệ thống có thể trả hoa văn thuật toán miễn phí.
  *Trạng thái: có mã trên `develop`.*

### 1.3. Quyền Xuất File, Đơn In, Ví Xu và Duyệt Mẫu
- **FR-09 (Quyền xuất theo phiên bản)**: File in của một phiên bản thiết kế chỉ mở khi có đơn in đã thanh toán, chưa hủy, giữ đúng phiên bản đó, hoặc khi quyền mở khóa cũ (mua trước khi có giỏ in) còn hạn. Nghiệm thu:
  - Thiết kế đạt FitCheck nhưng chưa thanh toán → `402 ORDER_PAYMENT_REQUIRED`, không tạo job.
  - FitCheck còn lỗi → `422`. Request chỉ có `{ fileType }`. Gửi thêm `useCredit` → `400`.
  - Đổi tên dự án vẫn giữ quyền. Sửa thiết kế tạo phiên bản mới, phiên bản đó cần đơn in mới.
  - Gói Pro không tự mở file in cho dự án mới.
  - Studio đọc quyền qua `GET …/exports/access` → `{ unlocked, unlockExpiresAt }`.

  Chi tiết API ở [03 · Thiết kế API](03_API_DESIGN.md#xuất-file-in).
  *Trạng thái: đã kiểm bằng E2E (`export.e2e-spec.ts`, 19/11/2026).*
- **FR-10 (Đơn in)**: Người dùng thêm thiết kế vào giỏ in, đặt một đơn gồm 1–20 thiết kế, mỗi thiết kế 1–10 bản. Mỗi dòng hàng giữ phiên bản dự án lúc đặt. Mã đơn có dạng `WF-<năm>-<6 chữ số>`. Đơn đi qua các trạng thái chờ thanh toán → đã thanh toán → đang in → đang giao → đã giao, hoặc bị hủy trước khi in. Chỉ ADMIN và PRINT_SHOP đổi được trạng thái. Đơn `PENDING_PAYMENT`, `PAID` hoặc `IN_PRODUCTION` giữ thiết kế: xóa vĩnh viễn dự án đó → `409 PROJECT_IN_ACTIVE_ORDER`.
  *Trạng thái: đã kiểm bằng E2E (`orders.e2e-spec.ts`, `projects.e2e-spec.ts`, 19/11/2026).*
- **FR-11 (Thanh toán)**: Mỗi lần tạo thanh toán gửi `termsVersion` (hiện là `2026-11-12`). Tài khoản demo dùng VNPay sandbox. Tài khoản thường dùng VietQR/SePay. Gói lượt xuất cũ đã ngừng bán: tạo mới → `400 EXPORT_PACK_DISCONTINUED`. Luật giả lập thanh toán ở [03 · Cổng thanh toán và giả lập](03_API_DESIGN.md#cổng-thanh-toán-và-giả-lập).
  *Trạng thái: đã kiểm bằng E2E (`payments.e2e-spec.ts`, `vnpay.e2e-spec.ts`, `sepay-webhook.e2e-spec.ts`, 19/11/2026). Thanh toán với cổng thật: chờ kiểm thực tế (người giữ tài khoản ngân hàng và VNPay).*
- **FR-12 (Ví xu)**: Người dùng nạp xu theo gói hoặc theo số tùy chọn từ 100 đến 50.000 xu, bội số của 10 (giá niêm yết, không thưởng). Xu dùng cho hoa văn AI và ảnh AI (tạo ảnh, xóa nền, tăng độ phân giải). Thiếu xu → `402`, không tạo job. Bấm hai lần cùng một yêu cầu chỉ trừ xu một lần. Job lỗi do nhà cung cấp hoặc bị từ chối nội dung thì hoàn xu đúng một lần. Lịch sử ví xem ở `/dashboard/wallet`. Quy tắc giá chi tiết ở [19 · Xu Wrap](19_XU_WRAP_SPEC.md).
  *Trạng thái: đã kiểm bằng E2E (`ai-images.e2e-spec.ts`, 19/11/2026) và test unit cho nạp tùy chọn (`payments.service.spec.ts`, 19/11/2026).*
- **FR-13 (Duyệt mẫu)**: Chủ dự án tạo link duyệt bí mật (token 24 ký tự) trong hộp chia sẻ, đổi hoặc tắt link bất cứ lúc nào. Khách hoặc xưởng in mở `/review/<token>` không cần đăng nhập, xem hộp 3D, góp ý theo từng mặt, rồi bấm "Duyệt in phiên bản n" (cần tên và tick đã kiểm tra). Lần duyệt gắn với phiên bản khách đã xem: nếu chủ dự án vừa lưu bản mới → `409 DESIGN_CHANGED`. Sửa thiết kế sau khi duyệt thì trạng thái đổi thành "Đã sửa sau khi duyệt, cần duyệt lại". Tối đa 500 góp ý mỗi dự án. Link lạ, đã tắt, hoặc dự án nằm trong thùng rác → `404`.
  *Trạng thái: đã kiểm bằng E2E (`reviews.e2e-spec.ts`, 19/11/2026).*

### 1.4. Trình Chỉnh Sửa Bước 4–6
Các chức năng dưới đây đã có trong Studio. Mỗi trường mới của phần tử được nhận ở cả kiểu dữ liệu chung, DTO của backend, bộ dựng file in (backend và bản offline), mô hình 3D và canvas 2D, để file in khớp với màn hình.

- **FR-14 (Lớp và thao tác cơ bản)**: Panel Lớp theo từng mặt (kéo thả, ẩn, khóa, đổi tên), đưa lên/xuống, nhân bản, sao chép/dán, chọn nhiều, nhóm, căn và phân bố đều, bắt dính, thước và đường gióng, lưới 5 mm, menu chuột phải, phím tắt. Thanh thuộc tính ngữ cảnh nhập X/Y/R/C (mm), góc xoay, tay cầm xoay. Phần tử không tự đổi mặt khi kéo qua mép, muốn chuyển mặt thì dùng "Chuyển sang mặt…". Lớp ẩn không in.
  *Trạng thái: có mã trên `develop`.*
- **FR-15 (Nền theo mặt)**: Nền (`role: "background"`) khóa vào mặt hộp, khớp mặt và tràn lề, tự khớp lại khi đổi $L \times W \times H$. Mọi phần tử bị cắt theo mặt và tràn lề ở 2D, 3D và file in.
  *Trạng thái: có mã trên `develop`.*
- **FR-16 (Chữ, ảnh, màu, hình khối)**: Chữ theo từng phần tử (phông, cỡ, đậm, nghiêng, gạch chân, căn lề, giãn dòng, giãn chữ, hoa/thường, viền chữ, chữ uốn cong, sửa trực tiếp trên khung). Phông tải lên (TTF/OTF/WOFF/WOFF2 ≤ 10 MB) phải đủ dấu tiếng Việt, người dùng tick xác nhận có quyền dùng. Ảnh: cắt, khung (bo góc, tròn, vòm), lấp đầy/vừa khung, lật, sáng/tương phản/bão hòa, thay ảnh giữ khung. Màu: ống hút màu, màu trong thiết kế, màu chuyển, nhập CMYK, cảnh báo màu ngoài dải in. Hình khối 7 loại. Đổi màu logo SVG theo bảng màu.
  *Trạng thái: có mã trên `develop`.*
- **FR-17 (In mặt trong và hoàn thiện)**: Công tắc "Mặt ngoài / Mặt trong". Mặt trong sửa trên khuôn lật gương và in ở trang riêng của PDF. Hoàn thiện theo phần tử (ép kim vàng/bạc/vàng hồng, UV định hình, dập nổi, dập chìm) xuất thành lớp màu pha riêng, có ánh kim trên 3D, báo giá tự cộng.
  *Trạng thái: có mã trên `develop`. Cách xưởng đối tác nhận lớp màu pha: chờ kiểm thực tế (người liên hệ xưởng in).*
- **FR-18 (Đổi kích thước thông minh)**: Khi đổi kích thước hộp, mỗi phần tử giữ chỗ trên mặt theo neo (trái/giữa/phải/giãn × trên/giữa/dưới/giãn). Phần tử chưa có neo được suy ra theo vị trí. Thứ gì không còn vừa thì thu nhỏ và kéo về vùng an toàn. Ví dụ nghiệm thu: đổi hộp từ 90×90×110 sang 120×80×60, tiêu đề vẫn ở giữa mặt trước, logo vẫn ở góc trên.
  *Trạng thái: đã kiểm bằng test (`smart-resize.spec.ts`, 19/11/2026).*
- **FR-19 (FitCheck mở rộng)**: Cảnh báo chữ sẽ ngược sau khi gấp (`READING_DIRECTION`, kèm nút "Xoay chữ cho đúng chiều"), chữ dưới 6 pt (`TEXT_TOO_SMALL`), tương phản chữ/nền dưới 3:1 (`LOW_CONTRAST`), chữ vắt qua nếp gấp trong mặt (`TEXT_ON_CREASE`), hình dưới cửa sổ hoặc lỗ khoét (`UNDER_OPENING`). Ghi chú chính tả tiếng Việt (`SPELLING`, không trừ điểm) và màu ngoài dải in (`OUT_OF_GAMUT`).
  *Trạng thái: đã kiểm bằng test (`fitcheck-reading.spec.ts`, `effects-spelling.spec.ts`, 19/11/2026).*
- **FR-20 (Hiệu ứng)**: Đổ bóng (màu, độ đậm, độ nhòe ≤ 10 mm, lệch ±20 mm) và 5 chế độ hòa trộn, cho kết quả như nhau ở khung 2D, hộp 3D, SVG và PDF in.
  *Trạng thái: đã kiểm bằng test (`effects-spelling.spec.ts`, 19/11/2026).*
- **FR-21 (Bước 5 · Quà & mở hộp)**: Xem hộp 3D trong bối cảnh, tạo lời chúc và mã QR mở hộp, tải ảnh mockup, xuất video WebM (720 × 720) hoặc GIF (400 × 400) hộp gập khoảng 7 giây. Xem trước không tự chạy khi người dùng bật giảm chuyển động.
  *Trạng thái: có mã trên `develop`. Bộ mã hóa GIF đã kiểm bằng test (`gif-encoder.spec.ts`, 19/11/2026).*
- **FR-22 (Bước 6 · Đặt in)**: Hiện kết quả FitCheck theo từng tiêu chí, nút "Tự sửa lề nhanh", báo giá theo số lượng, thẻ duyệt mẫu (FR-13), và thẻ "Gói File Xuất Xưởng" theo quyền xuất (FR-09).
  *Trạng thái: có mã trên `develop`. Toàn bộ luồng đặt in → thanh toán → tải file trên trình duyệt: chờ kiểm thực tế (thành viên IT phụ trách Studio).*
- **FR-23 (Thư viện và ảnh kho)**: Thư viện có kệ Yêu thích, Gần đây, Của tôi, lọc theo ngành. Ảnh kho Pexels đi qua máy chủ (khóa API không ra trình duyệt), ảnh chèn có ghi nguồn tác giả. Hộp chỉ có ảnh kho mà không có chữ, logo, hoa văn hoặc ảnh của người dùng → lỗi `STOCK_PHOTO_ALONE`. Chuẩn file cho người vẽ nội dung ở [24 · Chuẩn nội dung thư viện](24_LIBRARY_CONTENT_GUIDE.md).
  *Trạng thái: có mã trên `develop`. Ảnh kho với khóa Pexels thật: chờ kiểm thực tế (người giữ khóa API).*

---

## 2. Yêu Cầu Phi Chức Năng (Non-Functional Requirements)

- **NFR-01 (Hiệu năng 3D)** — *mục tiêu, chưa đo*: Mô phỏng 3D chạy mượt ở mức tối thiểu 45–60 FPS trên trình duyệt máy tính.
- **NFR-02 (Thời gian phản hồi)** — *mục tiêu, chưa đo*: Tính toán tham số hình học dieline hoàn tất dưới $50\text{ms}$ khi người dùng kéo thanh trượt kích thước.
- **NFR-03 (Bảo mật)**: Phân quyền truy cập tài khoản, mã hóa dữ liệu nhạy cảm. Backend từ chối mọi trường lạ trong request (`forbidNonWhitelisted`).
  *Trạng thái: có mã trên `develop`.*

# 19 — Hợp nhất workspace thiết kế WrapFit

Ngày thực hiện **20/11/2026** · Nhánh **`codex/meshy-workspace`** · Commit triển khai **`85c541f`** · 19 tệp frontend và kiểm thử.

## 1. Mục tiêu và quyết định thiết kế

Studio cũ tách việc làm một chiếc hộp thành sáu màn hình. Người dùng chọn kiểu hộp, nhập kích thước, chọn giấy, thiết kế hình in, xem quà và cuối cùng mới tới đặt in. Ba thao tác chọn kiểu, chỉnh số đo và đổi giấy đều cần nhìn cùng một chiếc hộp. Việc tách chúng ra khiến người dùng phải đổi màn hình để thấy tác động của từng lựa chọn.

Workspace mới tổ chức công việc theo cách Meshy bố trí công cụ bên trái, vùng xem trước ở giữa và bảng thao tác bên phải. WrapFit dùng bảng bên phải cho quy cách sản xuất, hình in, quà tặng hoặc thông tin đặt in tùy công cụ đang mở. Màu cam FPT, đơn vị mm, khuôn bế và FitCheck™ tiếp tục là các dấu hiệu nhận biết của WrapFit. Thay đổi tập trung vào Studio tại `/editor/demo` và `/editor/[id]`. [Tham khảo bố cục workspace của Meshy](https://help.meshy.ai/en/articles/12618267-meshy-interface-tour-workspace-tabs-and-navigation)

## 2. Từ sáu bước sang bốn công cụ

| Công việc trước đây | Vị trí hiện tại | Người dùng có thể làm gì |
| --- | --- | --- |
| 1. Chọn kiểu hộp | **Hộp & giấy** → Kiểu hộp | Chọn cấu trúc từ bảng cạnh canvas. Dự án đã lưu hiển thị cấu trúc cố định. |
| 2. Nhập kích thước | **Hộp & giấy** → Kích thước | Chỉnh dài, rộng, cao, xem đường đo trên hộp và kích thước phôi. Mở **Tuỳ chọn đo** để đổi đơn vị, đo lọt lòng hoặc phủ bì, khóa tỉ lệ hay đổi chiều. |
| 3. Chọn giấy và hoàn thiện | **Hộp & giấy** → Giấy & gia công | Đổi giấy, độ dày, cán màng và gia công trong khi vẫn xem cùng mô hình. Chọn nhanh kích thước theo món quà giữ lại độ dày giấy đã chọn. |
| 4. Thiết kế hình in | **Thiết kế** | Chọn mặt hộp trên khuôn 2D, thêm chữ, hình khối, ảnh hoặc hoa văn. Bảng bên phải chứa công cụ màu, lớp, tài nguyên và FitCheck. Có thể chuyển sang hộp 3D để xem vị trí hình in sau khi gấp. |
| 5. Xem 3D, tạo quà | **Quà tặng** | Tạo lời chúc và mã QR mở hộp, chọn bối cảnh, chụp ảnh hoặc tạo clip. Người chỉ cần làm hộp in có thể đi thẳng tới **Đặt in**. |
| 6. Kiểm tra và xuất | **Đặt in** | Xem kết quả FitCheck, báo giá, gói file, thiết lập màu ICC và lịch sử xuất của dự án đã lưu. |

**Ví dụ sử dụng.** Với một hộp trà, mở **Hộp & giấy**, nhập kích thước rồi chuyển sang tab giấy để so sánh chất liệu ngay trên hộp. Mở **Thiết kế** để đặt nhãn lên nắp, dùng **Hộp 3D** để xem nhãn lúc đóng hộp, sau đó chọn **Đặt in**. Nếu cần đổi chiều cao, quay lại **Hộp & giấy** và sửa trên cùng bản thiết kế.

## 3. Canvas, điều hướng và thiết bị di động

- **Trên máy tính**, thanh bên trái chuyển trực tiếp giữa bốn công cụ. Canvas ở giữa dùng chung cho cấu trúc, kích thước, giấy và hình in. Bảng phải có vùng cuộn riêng. Thanh đầu hiển thị tên dự án và các tác vụ phù hợp với trạng thái đăng nhập như lưu, chia sẻ và mở mốc phiên bản.
- **Trên điện thoại và máy tính bảng dưới 1024 px**, thanh công cụ chuyển xuống đáy màn hình. Bảng chỉnh sửa nằm dưới vùng xem trước. Chạm tiêu đề bảng để thu gọn và dành thêm chỗ cho hộp. Trợ lý **Gói** mở từ thanh dưới.
- **Trong vùng 3D**, dùng một thanh điều khiển góc nhìn để tránh hai bộ nút chồng lên mô hình. Người dùng vẫn có thể xoay hộp, xem các mặt và điều chỉnh mức gấp. Vùng 2D hỗ trợ chọn mảnh phôi của hộp nhiều phần và thiết kế mặt trong hoặc mặt ngoài.
- **Khi mở Studio**, giao diện chờ phản ánh bố cục mới. Hướng dẫn giới thiệu công cụ, canvas và điểm vào đặt in. Người dùng có thể gọi lại hướng dẫn từ thanh đầu trên desktop.
- **Liên kết và bản nháp cũ** vẫn dùng `?step=1` đến `?step=6` theo bảng trên. Khi URL không chỉ định bước, dự án đã lưu mở ở **Thiết kế**, bản nháp demo mở lại công cụ đã lưu và phiên demo mới bắt đầu ở **Hộp & giấy**.

## 4. Kiểm tra trước khi in và bảo toàn bản thiết kế

**Kích thước.** Bảng đặt in xét lỗi kích thước cùng với báo cáo FitCheck. Nếu quy cách chưa hợp lệ, **Sửa kích thước** đưa người dùng về đúng bảng nhập. Ví dụ, hộp gối rộng 80 mm và cao 60 mm vượt giới hạn chiều cao bằng nửa chiều rộng. Trong ca đã thử, nút tự sửa đưa chiều cao về 40 mm.

**Xuất file.** Có thể mở báo giá và lịch sử xuất trực tiếp từ bảng đặt in. Dự án phải đáp ứng điều kiện FitCheck và quyền xuất của phiên bản đã thanh toán mới lấy được file in. Nếu khách đăng nhập từ thẻ thanh toán của bản demo, liên kết đưa họ trở lại khu vực đặt in.

**Lỗi hình khối.** Khi kiểm tra tải lại trang, một hình chữ nhật biến mất khỏi bảng Lớp. Hình khối lưu hình học trong trường `shape` và có `content` rỗng hợp lệ. Mã cũ lọc mọi phần tử có `content` rỗng trong lúc khôi phục ảnh tải lên hoặc chuyển bản demo thành dự án. Hai đường xử lý hiện dùng chung `remapDraftElements`. Hàm chỉ thay URL bắt đầu bằng `blob:`, bỏ ảnh cục bộ không khôi phục được và giữ các phần tử còn lại theo đúng thứ tự.

## 5. Các tệp trong commit triển khai

| Nhóm | Tệp thay đổi | Vai trò |
| --- | --- | --- |
| Khung Studio | `StudioWorkspace.tsx`, `StudioSkeleton.tsx`, `studioUi.tsx`, `WorkspaceNav.tsx`, `StudioStepper.tsx`, `studioTour.ts` | Ghép canvas với bảng chỉnh sửa, thay thanh sáu bước bằng điều hướng theo công cụ, đồng bộ màn hình chờ và hướng dẫn. |
| Quy cách hộp | `Step1BoxTemplatePicker.tsx`, `Step2DimensionAndMaterial.tsx`, `Step3PaperFinish.tsx` | Đưa chọn kiểu hộp, số đo và giấy vào bảng quy cách. |
| Hình in và xem trước | `DesignRail.tsx`, `LayersPanel.tsx`, `InteractiveFoldingBox3D.tsx`, `AiCopilotAssistant.tsx` | Bố trí lại công cụ hình in, hướng dẫn thêm lớp, thanh góc nhìn và điểm mở Gói. |
| Quà và in | `Step5Model3DWithEnvironments.tsx`, `Step6ReviewExport.tsx`, `ExportPurchaseCard.tsx` | Tích hợp bối cảnh, QR, kiểm tra, báo giá và thanh toán vào workspace. |
| Bản nháp và kiểm thử | `demoDraftAssets.ts`, `demo-draft-assets.test.mjs`, `e2e-scenario.mjs` | Sửa lỗi mất hình khối, thêm test hồi quy và cập nhật thao tác của kịch bản E2E theo điều hướng mới. |

Điểm vào để đọc mã là [StudioWorkspace](../fe/src/views/editor/studio/StudioWorkspace.tsx). Các bảng công cụ nằm trong [thư mục components của Studio](../fe/src/features/studio/components).

## 6. Kết quả xác minh

| Phạm vi | Kết quả |
| --- | --- |
| Chrome tại chiều rộng 320, 375, 768, 1024 và 1440 px | Đã kiểm tra chuyển công cụ, bố cục không tràn ngang, thu mở bảng trên màn hình nhỏ và mở Gói từ thanh dưới. |
| Tạo và mở lại bản nháp | Đã đổi sang hộp bao diêm, nhập chiều dài 142 mm, chọn giấy Kraft, thêm hình chữ nhật, chuyển 2D/3D và tải lại. Đã xác nhận hình còn trong bảng Lớp cả sau khi lưu thành dự án. |
| Quà và đặt in | Đã mở hộp thoại lời chúc/QR, báo giá, lịch sử xuất, mốc phiên bản và chia sẻ. Đã thử sửa kích thước hộp gối và kiểm tra dự án chưa thanh toán bị chặn khi yêu cầu xuất SVG. |
| Build và kiểm tra tự động | Build production frontend thành công, sinh 71 trang tĩnh. Kiểm tra design token và test hồi quy dữ liệu bản nháp đều đạt. |

Các thao tác tài khoản, dự án và quyền xuất ở trên được kiểm tra với chế độ demo cục bộ. Thanh toán thật và chuỗi xử lý xuất file qua backend/worker production chưa được kiểm thử trong đợt này. Kịch bản E2E toàn hệ thống đã được cập nhật bộ chọn giao diện và kiểm tra cú pháp. Kết quả ở bảng là các ca đã chạy trực tiếp.

Để chạy lại các kiểm tra nhanh, dùng các lệnh sau tại thư mục gốc của repository.

```sh
node --test fe/scripts/demo-draft-assets.test.mjs
npm --workspace=fe run tokens:check
npm --workspace=fe run build
```

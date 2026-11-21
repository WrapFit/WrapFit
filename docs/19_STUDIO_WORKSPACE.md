# 19 — Hợp nhất workspace thiết kế WrapFit

Ngày thực hiện **20/11/2026** · Nhánh **`codex/meshy-workspace`** · Đợt hợp nhất ban đầu **`85c541f`** · Đợt bổ sung thư viện dự án theo [kế hoạch 20, mục 5](20_MESHY_WORKSPACE_ANALYSIS.md).

## 1. Mục tiêu và quyết định thiết kế

Studio cũ tách việc làm một chiếc hộp thành sáu màn hình. Người dùng chọn kiểu hộp, nhập kích thước, chọn giấy, thiết kế hình in, xem quà và cuối cùng mới tới đặt in. Ba thao tác chọn kiểu, chỉnh số đo và đổi giấy đều cần nhìn cùng một chiếc hộp. Việc tách chúng ra khiến người dùng phải đổi màn hình để thấy tác động của từng lựa chọn.

Studio trên desktop đặt thanh công cụ và bảng thông số bên trái, canvas ở giữa và thư viện dự án bên phải. Người dùng có thể chỉnh hộp và chuyển dự án ngay tại `/editor/demo` hoặc `/editor/[id]`. Cả bốn công cụ đều dùng màu cam FPT, kích thước theo mm và FitCheck™. [Tham khảo bố cục workspace của Meshy](https://help.meshy.ai/en/articles/12618267-meshy-interface-tour-workspace-tabs-and-navigation)

## 2. Từ sáu bước sang bốn công cụ

| Công việc trước đây | Vị trí hiện tại | Người dùng có thể làm gì |
| --- | --- | --- |
| 1. Chọn kiểu hộp | **Hộp & giấy** → Kiểu hộp | Chọn cấu trúc từ bảng cạnh canvas. Dự án đã lưu hiển thị cấu trúc cố định. |
| 2. Nhập kích thước | **Hộp & giấy** → Kích thước | Chỉnh dài, rộng, cao, xem đường đo trên hộp và kích thước phôi. Mở **Tuỳ chọn đo** để đổi đơn vị, đo lọt lòng hoặc phủ bì, khóa tỉ lệ hay đổi chiều. |
| 3. Chọn giấy và hoàn thiện | **Hộp & giấy** → Giấy & gia công | Đổi giấy, độ dày, cán màng và gia công trong khi vẫn xem cùng mô hình. Chọn nhanh kích thước theo món quà giữ lại độ dày giấy đã chọn. |
| 4. Thiết kế hình in | **Thiết kế** | Chọn mặt hộp trên khuôn 2D, thêm chữ, hình khối, ảnh hoặc hoa văn. Bảng thông số chứa công cụ màu, lớp, tài nguyên và FitCheck. Có thể chuyển sang hộp 3D để xem vị trí hình in sau khi gấp. |
| 5. Xem 3D, tạo quà | **Quà tặng** | Tạo lời chúc và mã QR mở hộp, chọn bối cảnh, chụp ảnh hoặc tạo clip. Người chỉ cần làm hộp in có thể đi thẳng tới **Đặt in**. |
| 6. Kiểm tra và xuất | **Đặt in** | Xem kết quả FitCheck, báo giá, gói file, thiết lập màu ICC và lịch sử xuất của dự án đã lưu. |

**Ví dụ sử dụng.** Với một hộp trà, mở **Hộp & giấy**, nhập kích thước rồi chuyển sang tab giấy để so sánh chất liệu ngay trên hộp. Mở **Thiết kế** để đặt nhãn lên nắp, dùng **Hộp 3D** để xem nhãn lúc đóng hộp, sau đó chọn **Đặt in**. Nếu cần đổi chiều cao, quay lại **Hộp & giấy** và sửa trên cùng bản thiết kế.

## 3. Canvas, điều hướng và thiết bị di động

- **Trên máy tính**, thanh điều hướng rộng 72 px. Bảng thông số nằm ngay bên phải thanh này và cuộn độc lập. Từ 1280 px, cột **Dự án của tôi** rộng 300 px, tăng lên 340 px từ 1536 px. Nút thu gọn dành thêm chiều rộng cho canvas và trình duyệt nhớ lựa chọn qua lần tải lại. Từ 1024 đến 1279 px, nút **Dự án** mở ngăn trượt từ phải.
- **Trên điện thoại và máy tính bảng dưới 1024 px**, thanh công cụ chuyển xuống đáy màn hình. Bảng chỉnh sửa nằm dưới vùng xem trước. Chạm tiêu đề bảng để thu gọn và dành thêm chỗ cho hộp. Từ thanh đáy, **Dự án** mở thư viện từ dưới lên, còn **Gói** mở trợ lý.
- **Trong vùng 3D**, dùng một thanh điều khiển góc nhìn để tránh hai bộ nút chồng lên mô hình. Người dùng vẫn có thể xoay hộp, xem các mặt và điều chỉnh mức gấp. Bấm một mặt hộp mở menu tại điểm bấm để thiết kế mặt đó trên khuôn 2D, tải ảnh lên mặt đó, mở nắp hoặc đổi kích thước (xem [tài liệu 21, mục Tiến độ](21_PACDORA_EDITOR_ANALYSIS.md#tiến-độ)). Từ 768 px, chế độ 2D có thẻ **Xem trước 3D** ở góc phải trên: hộp cập nhật theo hình in, mặt dưới con trỏ trên khuôn sáng lên trên hộp, và có thể thu gọn thẻ. Vùng 2D hỗ trợ chọn mảnh phôi của hộp nhiều phần và thiết kế mặt trong hoặc mặt ngoài.
- **Khi mở Studio**, giao diện chờ phản ánh bố cục mới. Hướng dẫn giới thiệu công cụ, canvas và điểm vào đặt in. Người dùng có thể gọi lại hướng dẫn từ thanh đầu trên desktop.
- **Liên kết và bản nháp cũ** vẫn dùng `?step=1` đến `?step=6` theo bảng trên. Khi URL không chỉ định bước, dự án đã lưu mở ở **Thiết kế**, bản nháp demo mở lại công cụ đã lưu và phiên demo mới bắt đầu ở **Hộp & giấy**.

## 4. Kiểm tra trước khi in và bảo toàn bản thiết kế

**Đổi dự án.** Thư viện hiển thị các dự án đang thiết kế theo lần sửa gần nhất, tìm theo tên hoặc thẻ và lọc theo kiểu hộp. Mỗi lần cuộn đến cuối tải tiếp 12 dự án. Viền cam đánh dấu dự án đang mở. Chấm đỏ lấy từ trường `hasFitcheckErrors` của `GET /projects`. Backend không tải báo cáo FitCheck của từng dự án trong danh sách. Một truy vấn phụ lọc trường `isValidForProduction` của báo cáo đã lưu ngay trong Postgres và chỉ trả mã các dự án có lỗi. Thư viện có nút thử lại khi tải lỗi. **Dự án mới** mở trang chọn mẫu, **Xem tất cả** mở trang quản lý dự án.

Khi chọn dự án khác, Studio chờ `useProjectSync.flush()` hoàn tất rồi mới điều hướng. Nếu lưu lỗi, Studio giữ dự án trên màn hình để người dùng thử lại. Người đang xem dự án trong thùng rác vẫn mở được dự án khác. Với bản demo, khách thấy thẻ **Bản nháp** và liên kết đăng nhập quay lại demo. Người đã đăng nhập thấy cả bản nháp lẫn thư viện. Studio lưu bản demo đang sửa thành dự án khi chuyển sang dự án khác. Khi API không trả lời, ứng dụng dùng tài khoản demo thay thế. Lúc đó thư viện hiện các dự án mẫu như dashboard, và bản demo đang sửa chỉ được lưu trong trình duyệt trước khi chuyển. Tài khoản thật không bao giờ thấy dự án mẫu: lỗi tải danh sách hiện nút **Thử lại**.

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

Đợt bổ sung dùng [StudioProjectLibrary](../fe/src/features/studio/components/StudioProjectLibrary.tsx) cho cả cột desktop, ngăn trượt và bảng trên điện thoại. Thư viện dùng chung truy vấn và ô xem trước với dashboard. [Repository dự án](../be/src/projects/infrastructure/prisma-project.repository.ts) lấy cờ lỗi FitCheck cho danh sách. [Bộ ánh xạ dự án](../be/src/projects/infrastructure/project.select.ts) trả báo cáo đầy đủ khi mở chi tiết. Camera tính lại khoảng cách theo kích thước canvas khi đóng hoặc mở cột.

## 6. Kết quả xác minh

| Phạm vi | Kết quả |
| --- | --- |
| Chrome tại chiều rộng 320, 375, 768, 1024 và 1440 px | Đã kiểm tra chuyển công cụ, bố cục không tràn ngang, thu mở bảng trên màn hình nhỏ và mở Gói từ thanh dưới. |
| Tạo và mở lại bản nháp | Đã đổi sang hộp bao diêm, nhập chiều dài 142 mm, chọn giấy Kraft, thêm hình chữ nhật, chuyển 2D/3D và tải lại. Đã xác nhận hình còn trong bảng Lớp cả sau khi lưu thành dự án. |
| Quà và đặt in | Đã mở hộp thoại lời chúc/QR, báo giá, lịch sử xuất, mốc phiên bản và chia sẻ. Đã thử sửa kích thước hộp gối và kiểm tra dự án chưa thanh toán bị chặn khi yêu cầu xuất SVG. |
| Build và kiểm tra tự động | Build production frontend thành công, sinh 71 trang tĩnh. Kiểm tra design token và test hồi quy dữ liệu bản nháp đều đạt. |

Các thao tác tài khoản, dự án và quyền xuất ở trên được kiểm tra với chế độ demo cục bộ. Thanh toán thật và chuỗi xử lý xuất file qua backend/worker production chưa được kiểm thử trong đợt này. Kịch bản E2E toàn hệ thống đã được cập nhật bộ chọn giao diện và kiểm tra cú pháp. Kết quả ở bảng là các ca đã chạy trực tiếp.

Trong đợt thư viện, Chrome đã kiểm tra các chiều rộng 320, 375, 768, 1024, 1280, 1440 và 1536 px. Ca thử với API mô phỏng có 26 dự án đang thiết kế và một dự án trong thùng rác. Đã kiểm tra tải ba trang, tìm kiếm và lọc, chuyển qua cả bốn công cụ, đóng thư viện bằng phím Escape, ghi nhớ trạng thái thu gọn, lưu bản nháp trước khi chuyển, giữ dự án khi lưu lỗi và chuyển thành công sau khi thử lại. Cũng đã thử danh sách rỗng, lỗi tải danh sách và đường dẫn đăng nhập của khách. Build frontend, build backend, kiểm tra token và 1.180 unit test backend đều đạt.

Đợt sửa sau review ngày 20/11/2026 kiểm tra với backend và Postgres cục bộ. Kịch bản E2E bước 1–4 đạt ở 375 × 812 và 1440 × 900, gồm dự án vừa lưu được đánh dấu đang mở trong ngăn trượt và trong cột thư viện. Truy vấn cờ lỗi FitCheck được thử trên Postgres với một báo cáo lỗi tạm trong transaction rồi rollback. Khi tắt API, thư viện hiện 8 dự án mẫu, và chuyển từ bản demo đã sửa sang dự án mẫu không gọi API tạo dự án. Chưa chạy lại build production frontend trong đợt này. Chuyển giữa hai dự án đã lưu với backend thật cũng chưa được kiểm tra.

Để chạy lại các kiểm tra nhanh, dùng các lệnh sau tại thư mục gốc của repository.

```sh
node --test fe/scripts/demo-draft-assets.test.mjs
npm --workspace=fe run tokens:check
npm --workspace=fe run build
```

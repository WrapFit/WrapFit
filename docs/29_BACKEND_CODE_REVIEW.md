# 29. Review backend WrapFit

Ngày 18/11/2026 · Nhánh `develop` · Commit `1c76bdb`

**Có 4 lỗi P1 nên sửa trước khi nhận đơn in hoặc thanh toán thật.** Trong luồng xuất file, khách có thể nhận bản thiết kế khác với bản đã qua FitCheck. Trong luồng lưu trữ, tác vụ dọn file có thể xóa phông chữ của một thiết kế đang dùng. Hai lỗi P1 còn lại ảnh hưởng đến số ngày Pro đã mua và khả năng giữ thiết kế cho xưởng in. Cả bốn đều có thể xảy ra khi hệ thống chỉ chạy một API NestJS và một worker BullMQ.

## P1 · Ưu tiên trước khi nhận đơn thật

### 1. File in có thể khác phiên bản đã qua FitCheck và được thanh toán

Khách yêu cầu xuất bản A rồi tiếp tục chỉnh sửa trong lúc job đang chờ. API đã chạy FitCheck và kiểm tra quyền xuất, nhưng job chỉ giữ mã dự án và định dạng file. Khi worker bắt đầu, nó đọc lại kích thước và canvas hiện tại. Nếu khách vừa lưu bản B, xưởng có thể nhận file B dù quyền xuất thuộc bản A. [API tạo job](../be/src/export/export.service.ts#L79) · [Worker đọc thiết kế](../be/src/export/export.processor.ts#L67)

**Cách sửa.** Lưu snapshot bất biến của thiết kế cho job. FitCheck, kiểm tra quyền xuất và tạo job phải cùng tham chiếu một phiên bản. Worker dùng snapshot đó cho mọi lần render và retry.

**Test hồi quy.** Cho A và B có kích thước khác nhau. Tạo job cho A, lưu B rồi mới cho worker chạy. Đọc kích thước trong file DXF và xác nhận file vẫn mang kích thước của A.

### 2. Tác vụ dọn storage có thể xóa phông chữ đang dùng

Canvas lưu phông tải lên ở `elements[].style.fontUrl` và `customFonts[].url`. Truy vấn đồng bộ `project_file_refs` chỉ lấy `content` của logo, ảnh và họa tiết. Khi file phông đã tồn tại hơn 24 giờ, tác vụ dọn storage có thể coi nó là file thừa và xóa cả bản ghi lẫn object. Khách có thể phát hiện mất phông lần đầu khi xuất PDF hoặc mở lại một snapshot cũ. [Cách canvas lưu phông](../be/src/storage/asset-keys.ts#L97) · [Truy vấn đồng bộ](../be/src/projects/infrastructure/project-file-refs.ts#L10) · [Điều kiện dọn file](../be/src/storage/storage.service.ts#L548)

**Cách sửa.** Đồng bộ cả hai trường chứa phông cho canvas hiện tại và các snapshot. Khi triển khai, bổ sung tham chiếu cho dữ liệu đã lưu trước khi cho tác vụ dọn file chạy lại.

**Test hồi quy.** Lưu một phông chỉ có trong canvas và một phông chỉ còn trong snapshot. Chạy tác vụ dọn sau mốc 24 giờ. Cả hai file phải còn đọc được, còn một phông đối chứng chưa từng dùng phải được dọn.

### 3. Hai thanh toán Pro thành công có thể chỉ cộng một kỳ

Hai payment gia hạn của cùng khách có thể được xác nhận đồng thời. Mỗi transaction khóa payment của riêng nó, đọc cùng ngày hết hạn của subscription rồi cùng ghi một giá trị mới. Cả hai payment có thể thành `PAID`, trong khi khách chỉ nhận thêm 30 ngày dù đã mua 60 ngày. Test gia hạn hiện tại xác nhận hai payment lần lượt. [Nhánh gia hạn Pro](../be/src/payments/payments.service.ts#L421) · [Test thanh toán hiện tại](../be/test/e2e/payments.e2e-spec.ts#L219)

**Cách sửa.** Giữ cơ chế khóa từng payment trong `confirmPaid` để xử lý webhook gửi lại. Với mua Pro, khóa thêm theo người dùng trong cùng transaction trước khi đọc và cập nhật subscription.

**Test hồi quy.** Trên PostgreSQL, tạo hai payment khác nhau cho một khách đang có Pro rồi xác nhận đồng thời. Kiểm tra cả hai payment đều `PAID`, chỉ có một subscription đang hoạt động và ngày hết hạn tăng đúng 60 ngày.

### 4. Xóa dự án có thể làm mất thiết kế của đơn đang in

Khách có thể đưa dự án vào thùng rác rồi xóa vĩnh viễn khi đơn đang ở `IN_PRODUCTION`. Dòng hàng vẫn tồn tại, nhưng `order_items.project_id` trở thành `NULL`. Canvas, snapshot và các file xuất gắn với dự án có thể bị xóa khi xưởng vẫn cần chúng. Tác vụ dọn thùng rác sau 30 ngày cũng có đường xóa này. Luồng ẩn danh hóa tài khoản đã có quy tắc giữ thiết kế của đơn chưa hủy. [Xóa thủ công](../be/src/projects/application/projects.service.ts#L310) · [Dọn thùng rác](../be/src/projects/infrastructure/prisma-project.repository.ts#L178) · [Quan hệ của dòng hàng](../be/prisma/schema.prisma#L882) · [Quy tắc giữ thiết kế](../be/src/users/user-removal.ts#L98)

**Cách sửa.** Chặn xóa ở thao tác ghi của cả hai luồng khi đơn còn cần thiết kế, tối thiểu với `PAID` và `IN_PRODUCTION`. Chỉ xóa object khỏi storage sau khi DB xác nhận đã xóa được dự án.

**Test hồi quy.** Với một đơn đang in, thử cả xóa thủ công và dọn tự động. Sau mỗi lần, kiểm tra dòng hàng vẫn trỏ đến dự án và file phục vụ in vẫn tải được.

## P2 · Sai lệch khi có autosave, retry hoặc phân trang

### 5. Khôi phục snapshot có thể làm mất lần autosave vừa thành công

Service đọc canvas để làm bản sao lưu trước khi repository khóa dòng dự án. Nếu tab khác autosave trong khoảng này, thao tác khôi phục sẽ ghi đè phần vừa lưu. Bản sao dùng để hoàn tác lại chứa canvas cũ hơn. [Service chuẩn bị bản sao](../be/src/projects/application/snapshots.service.ts#L63) · [Repository khóa và khôi phục](../be/src/projects/infrastructure/prisma-snapshot.repository.ts#L72)

**Cách sửa và kiểm tra.** Lấy dữ liệu sao lưu từ dòng vừa khóa trong transaction, hoặc kiểm tra phiên bản dự kiến và trả `409` nếu đã có lần lưu mới. Cho autosave hoàn tất giữa bước đọc và bước khôi phục. Nếu khôi phục thành công, bản sao phải chứa chính nội dung vừa autosave. Nếu trả `409`, nội dung đó phải còn trên dự án.

### 6. Giao lại một job xuất đã hoàn tất làm ghi file và lịch sử hai lần

Worker đặt job về `PROCESSING` theo ID dù job có thể đã `COMPLETED`. Nếu worker dừng sau khi PostgreSQL commit nhưng trước khi BullMQ nhận xác nhận hoàn tất, lần giao lại có thể render và ghi kết quả lần nữa. Trong mô phỏng với DB và storage trong bộ nhớ, chạy cùng một job DXF hai lần tạo **2 lần ghi file, 2 snapshot và 2 sự kiện hoàn tất**. [Worker nhận job](../be/src/export/export.processor.ts#L65) · [Transaction hoàn tất](../be/src/export/export.processor.ts#L121)

**Cách sửa và kiểm tra.** Bỏ qua job đã kết thúc trước khi render. Khi hoàn tất, chỉ ghi snapshot và sự kiện nếu transaction chuyển được job sang `COMPLETED`. Giao lại cùng job sau lần commit đầu và kiểm tra mỗi kết quả chỉ ghi một lần.

### 7. Thư viện AI bỏ sót ảnh ở ranh giới giữa hai trang

Một job lưu nhiều ảnh bằng `createMany`, nên các ảnh có thể cùng `createdAt`. Gallery lấy thời điểm của ảnh cuối làm cursor và trang sau chỉ lấy ảnh cũ hơn. Trong mô phỏng có hai ảnh cùng thời điểm và `limit=1`, trang đầu trả một ảnh, trang hai trả rỗng dù ảnh còn lại vẫn tồn tại. [Worker lưu ảnh](../be/src/ai/image/ai-image.processor.ts#L145) · [Gallery phân trang](../be/src/ai/image/ai-image.service.ts#L305)

**Cách sửa và kiểm tra.** Sắp xếp theo cặp `(createdAt, id)`, trả cả hai giá trị trong cursor và dùng cùng thứ tự khi truy vấn trang sau. Backend đã có helper dùng cho thông báo. Với hai ảnh cùng thời điểm và mỗi trang một ảnh, hai lần đọc phải trả đủ hai ID khác nhau. [Helper cursor dùng chung](../be/src/common/utils/page-cursor.util.ts#L18) · [Cách dùng trong notifications](../be/src/notifications/notifications.service.ts#L103)

## Kết quả kiểm chứng

| Hạng mục | Kết quả tại commit được review |
| --- | --- |
| Unit test backend | 1.160/1.160 test đạt, trong 75 bộ |
| ESLint và kiểm tra kiểu TypeScript | Cả hai đạt |
| Đọc mã nguồn | Đối chiếu API, worker, truy vấn và schema cho cả 7 phát hiện |
| Mô phỏng riêng | Đã tái hiện mục 6 và 7 với các phụ thuộc trong bộ nhớ |
| E2E với PostgreSQL, Redis và object storage | Chưa chạy trong lần review này vì Docker Engine đang dừng |

Các test hồi quy đề xuất ở từng mục là tiêu chí xác nhận sau khi sửa. Kết quả unit test phía trên thuộc phiên bản đã review.

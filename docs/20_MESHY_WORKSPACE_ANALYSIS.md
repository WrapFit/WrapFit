# 20 — Phân tích bố cục workspace Meshy và đối chiếu với Studio WrapFit

Ngày phân tích **20/11/2026** · Nhánh **`codex/meshy-workspace`** · Nối tiếp [19 — Hợp nhất workspace thiết kế](19_STUDIO_WORKSPACE.md) · Kế hoạch mục 5 đã triển khai trong **`2fc1cb1`**, kết quả ở mục 5.7.

## 1. Phạm vi và cách làm

Tài liệu ghi lại bố cục, thành phần và trạng thái tương tác của trang `https://www.meshy.ai/workspace` (tab Model, tài khoản đã đăng nhập). Mục đích là lấy cấu trúc và cách sắp xếp thao tác làm tham chiếu cho Studio WrapFit.

- **Công cụ.** Plugin REA không gắn được vào trình duyệt vì REA cần cổng Chrome DevTools Protocol (`127.0.0.1:9222`), mà trình duyệt đang dùng không bật cổng này. Số liệu được lấy qua extension Claude in Chrome: đo `getBoundingClientRect`, `getComputedStyle`, đọc tooltip và chụp màn hình.
- **Kích thước đo.** Viewport 2040 × 986 CSS px, `devicePixelRatio` 1.25. Các số đo dưới đây tính theo CSS px.
- **Giới hạn sử dụng.** Chỉ tham khảo bố cục và luồng thao tác. Không sao chép mã nguồn, CSS đã build, icon, hình minh hoạ, font, banner hay tên thương hiệu của Meshy vào repo. Ảnh chụp màn hình không được lưu vào repo vì chứa tài sản của Meshy và thư viện riêng của tài khoản.

## 2. Bố cục Meshy workspace

Trang không có thanh header. Bốn vùng chạy hết chiều cao, cách mép và cách nhau 8 px trên nền `#181818`.

| Vùng | Vị trí, kích thước | Nội dung |
| --- | --- | --- |
| Rail điều hướng | x 0, rộng 68 px | Logo ở trên. Các mục gồm icon và nhãn nhỏ: Agent, Image, Model, Print, Animate, Assets, ngăn nhóm bằng vạch ngắn. Phía dưới: quà tặng, thông báo có badge số, số credit, nút Upgrade dạng pill, avatar. |
| Bảng thông số | x 68, rộng 280 px, bo 16 px, nền `#1E1E1E` | Toàn bộ thông số để tạo model. Nút Generate dính ở đáy bảng. |
| Canvas | x 356, rộng co giãn (1149 px ở viewport đo) | Trạng thái rỗng: hướng dẫn ba bước. Khi chọn model: khung xem 3D có thanh công cụ trên, thẻ thống kê và thanh thao tác nổi ở dưới. |
| Thư viện | x 1513, rộng 519 px | Các model đã tạo dạng lưới, có tìm kiếm, lọc và phân trang. |

### 2.1 Bảng thông số (280 px)

Thứ tự từ trên xuống:

1. **Hai tab chế độ lớn** (122 × 40 px, chỉ có hình minh hoạ, tên ở tooltip): Image to 3D và Batch Images to 3D. Tab đang chọn đổi query `?model-tab=`.
2. **Chọn dòng model**: thanh tab chữ High Detail / Smart Topology / Relief, bên dưới là thẻ dropdown "Meshy 7.1 – Flagship" có một dòng mô tả.
3. **Ảnh đầu vào**: tiêu đề "Image" có hai icon (gợi ý, thư viện mẫu). Vùng thả ảnh viền nét đứt ghi rõ định dạng và dung lượng tối đa. Ba ô nhỏ cho ảnh nhiều góc, bật bằng công tắc Multi-view.
4. **Các nhóm thông số** theo một mẫu: nhãn 12 px đậm vừa, icon (i) cho tooltip, rồi một điều khiển. Điều khiển là thanh chọn phân đoạn (Resolution, Model, Texture Resolution, Pose) hoặc công tắc (Split, Texture, Image Enhancement). Tuỳ chọn trả phí có icon vương miện vàng.
5. **Chân bảng cố định**: thời gian ước tính ("2 min") và chi phí credit ("30") trên một dòng, dưới là nút **Generate** rộng hết bảng.

Phần thông số cuộn trong bảng, chân bảng luôn hiện.

### 2.2 Canvas

**Trạng thái rỗng.** Ba bước ngang hàng, mỗi bước có hình minh hoạ và hai dòng chữ: tải ảnh lên ở bảng trái, tạo và tô màu model, tải model về.

**Khi chọn một model**, canvas chuyển thành khung xem 3D:

- **Thanh trên, bên trái**: Display Settings, dropdown chế độ xem ("Standard"), ba nút Solid / Unlit / Lit, Wireframe, Material Adjustment, Environment Settings. Nút 28 × 28 px, ngăn nhóm bằng vạch dọc.
- **Thanh trên, bên phải**: bốn ô thumbnail kênh texture (Base Color, Roughness, Metallic, Normal) và nút View UV texture.
- **Thẻ thống kê** góc trên trái, nổi trên canvas: Topology, Faces, Vertices. Thẻ thứ hai là Printability có badge đỏ đếm số lỗi.
- **Thanh thao tác nổi** giữa đáy, hai nhóm pill tách rời:
  - Nhóm sửa model: Edit, Retry (cần gói trả phí), Edit Texture, Retexture, Remesh, DCC Bridge, Share, rồi **Download** tô màu nhấn.
  - Nhóm chuyển sang công cụ khác: Send to Agent, Print, Animate.
  - Mỗi nút có tooltip gồm tên và một câu mô tả, ví dụ Remesh "dựng lại lưới với số polygon mục tiêu".
- **Dòng dưới cùng**: "Reuse prompt" kèm ảnh nguồn thu nhỏ ở trái. Nút thích / không thích và nút mở rộng ở phải.

### 2.3 Thư viện (519 px)

- Banner nâng cấp gói ở đầu.
- Ô tìm kiếm "Search my generations" và nút **Upload** màu nhấn.
- Hàng lọc bằng icon: All, Model, Textured, Animation, nút Filter. Bên phải có nút bật chế độ chọn nhiều.
- Lưới 4 cột, ô vuông khoảng 123 px, bo góc, nền tối hơn nền bảng. Ô có icon trạng thái ở góc (đã tải về, có animation, lỗi). Ô đang chọn có viền màu nhấn, hiện ngày tạo và các thao tác nhanh.
- Chân: chuyển List / Grid, phân trang `1/2`, chọn số mục mỗi trang (20).

### 2.4 Token giao diện đo được

| Token | Giá trị |
| --- | --- |
| Font | Barlow, nội dung 12–16 px |
| Chữ | `#DEDEDE`, nhãn 12 px weight 500 |
| Nền trang / bảng | `#181818` / `#1E1E1E` |
| Màu nhấn | gradient `#D2FF6F` → `#B3FF1D`, chữ đen trên nền nhấn |
| Bo góc | bảng 16 px, nút 8 px |
| Chiều cao điều khiển | 24–28 px trong bảng, nút chính 32 px |

## 3. Đối chiếu với Studio WrapFit

Bảng dưới mô tả Studio **trước** đợt đổi bố cục (commit `2ad2b9c`), đo tại `/editor/demo` trên dev server cổng 3107, viewport 1547 × 784 CSS px. Bố cục sau khi đổi ở mục 5.

| Hạng mục | Meshy | WrapFit hiện tại | Khoảng cách |
| --- | --- | --- | --- |
| Header | Không có. Bốn vùng chạy hết chiều cao. | Header cao 64 px: logo, tên dự án, huy hiệu FitCheck, Hướng dẫn, Lưu dự án, nút **Đặt in**. | WrapFit mất 64 px chiều cao canvas. |
| Rail | 68 px, icon kèm nhãn. Credit, thông báo và tài khoản ở đáy rail. | `WorkspaceNav` rộng 96 px (`lg:w-24`), bốn mục: Hộp & giấy, Thiết kế, Quà tặng, Đặt in. Đáy rail trống, bong bóng trợ lý Gói nổi ở góc trái dưới. | Rail rộng hơn, đáy rail chưa dùng. |
| Bảng thông số | Bên **trái** canvas, 280 px. | `WorkspaceInspector` bên **phải**, 360 px (392 px từ `xl`). Chế độ Thiết kế có lưới 10 công cụ (`DesignRail`) ở đầu bảng. | Ngược phía. Doc 19 đã chọn đặt bảng bên phải. |
| Hành động chính | Nút Generate dính ở chân bảng, kèm thời gian và chi phí. | Nút **Đặt in** trên header. Bảng phải không có chân cố định. | Thiếu một chỗ cố định cho hành động chính kèm giá tạm tính. |
| Thanh công cụ canvas | Thanh trên cho chế độ hiển thị, thanh thao tác nổi giữa đáy chia hai nhóm. | Thanh trên: hoàn tác/làm lại, thước mm, chuyển Khuôn 2D / Hộp 3D. Dòng dưới: góc nhìn 3D, Mở nắp, zoom. Comment trong `studioUi.tsx` ghi rõ "Nothing floats over the model". | Nguyên tắc ngược nhau: Meshy cho thanh nổi trên canvas, WrapFit gắn thanh vào mép. |
| Thẻ thống kê | Topology, Faces, Vertices, Printability nổi góc trên trái. | Thông số hộp (thể tích, khổ phôi, số hộp/tờ) nằm trong bảng phải. FitCheck ở header. | WrapFit chưa có bảng tóm tắt nhìn thấy ngay trên canvas. |
| Thư viện | Cột 519 px luôn hiện, chứa mọi model đã tạo. | Không có trong Studio. Danh sách dự án nằm ở dashboard. Mốc phiên bản mở bằng hộp thoại. | Thiếu hẳn vùng này. Cần dữ liệu dự án và mốc thật để làm. |
| Trạng thái rỗng | Ba bước có minh hoạ ở giữa canvas. | Bản demo mở thẳng một hộp mẫu. | Không cần thiết cho WrapFit vì luôn có hộp mẫu. |
| Giao diện màu | Nền tối, nhấn xanh chanh, font Barlow. | Nền sáng, nhấn cam FPT, font landing của WrapFit. | Doc 19 giữ cam FPT làm dấu hiệu nhận biết. |

## 4. Đề xuất

Đề xuất lấy **cấu trúc** của Meshy và giữ **nhận diện** của WrapFit (nền sáng, cam FPT, đơn vị mm, FitCheck). Thứ tự theo giá trị trên công sức:

1. **Chân bảng cố định trong `WorkspaceInspector`.** Hiện giá tạm tính, số lỗi FitCheck và nút chính của công cụ đang mở: "Tiếp tục thiết kế" ở Hộp & giấy, "Đặt in" ở Thiết kế và Quà tặng. Người dùng luôn thấy bước tiếp theo mà không cần nhìn lên header.
2. **Thẻ tóm tắt nổi trên canvas.** Đặt góc trên trái: kích thước D × R × C, khổ phôi, thể tích, và một dòng FitCheck có badge lỗi như Printability. Thẻ thu gọn được để không che hộp.
3. **Thanh thao tác nổi giữa đáy canvas.** Gom các thao tác hiện ở dòng dưới thành hai nhóm pill. Nhóm xem: góc nhìn, Mở nắp, Gấp thử, zoom. Nhóm chuyển công cụ: Quà tặng, Đặt in. Mỗi nút có tooltip gồm tên và một câu mô tả. Việc này đảo nguyên tắc "không nổi trên model" của commit `85c541f`, nên cần đồng ý trước.
4. **Gọn header và rail.** Thu rail về khoảng 68–72 px. Chuyển trạng thái lưu, tài khoản và trợ lý Gói xuống đáy rail. Header còn một dòng mỏng cho tên dự án và Lưu, hoặc bỏ hẳn để canvas thêm 64 px.
5. **Bảng thông số theo mẫu nhãn và điều khiển.** Nhãn 12 px kèm icon (i), điều khiển phân đoạn và công tắc gọn 28 px, tuỳ chọn trả phí đánh dấu thống nhất. Áp cho Kích thước, Giấy & gia công và Tuỳ chọn hộp.
6. **Thư viện bên phải.** Cột hiện dự án gần đây, có tìm kiếm và lọc. Mốc phiên bản và ảnh đã tải lên chưa đưa vào cột.

**Trạng thái.** Đã làm mục 6 theo kế hoạch ở mục 5, và phần thu rail về 72 px của mục 4. Các mục 1, 2, 3, 5 và phần header của mục 4 chưa làm.

### Quyết định

- **Vị trí bảng thông số**: đã chốt ngày 20/11/2026. Bảng chuyển sang **trái** canvas, và bên phải hiện **danh sách dự án của người dùng**. Kế hoạch ở mục 5.
- **Thanh nổi trên canvas**: chưa quyết. Chưa làm trong đợt này.
- **Màu**: giữ nền sáng và cam FPT.

## 5. Kế hoạch: bảng thông số bên trái, dự án của tôi bên phải

### 5.1 Khả thi

Gần như toàn bộ việc nằm ở frontend. Backend chỉ thêm một trường cho chấm đỏ FitCheck, xem gạch đầu dòng cuối.

- `GET /projects` đã hỗ trợ đủ cho cột dự án. Có tìm theo tên hoặc tag (`q`), sắp xếp theo `updatedAt`, lọc theo kiểu hộp, thư mục và trạng thái, và phân trang. Hook `useProjectList` trong `fe/src/features/dashboard/useProjects.ts` đã gọi sẵn API này.
- Ảnh xem trước không cần file ảnh. `ProjectTile` trong `fe/src/features/dashboard/components/ProjectCard.tsx` vẽ khuôn hộp từ kiểu hộp, kích thước và loại giấy của `ProjectSummary`. Dự án chưa có `thumbnailUrl` vẫn có hình.
- Đổi dự án không làm mất thay đổi. `useProjectSync` tự lưu sau một khoảng chờ ngắn, gửi nốt thay đổi còn chờ khi rời editor, và cảnh báo `beforeunload` khi còn thay đổi chưa lưu.
- Bảng thông số dùng chung `WorkspaceInspector` ở cả bốn công cụ: Hộp & giấy, Thiết kế (`StudioWorkspace.tsx`), Quà tặng (`Step5Model3DWithEnvironments.tsx`), Đặt in (`Step6ReviewExport.tsx`). Chỉ cần sửa một chỗ trong `studioUi.tsx` để chuyển bảng sang trái.
- `ProjectSummary` chỉ có `fitcheckScore`, chưa đủ để biết dự án có lỗi. Điểm bằng 100 trừ 30 cho mỗi lỗi và 10 cho mỗi cảnh báo, nên 70 điểm có thể là một lỗi hoặc ba cảnh báo. Danh sách vì vậy cần thêm trường `hasFitcheckErrors`.

### 5.2 Bố cục mới trên máy tính

Thứ tự từ trái sang phải: rail công cụ, bảng thông số, canvas, cột **Dự án của tôi**.

| Vùng | Hiện tại | Sau khi đổi |
| --- | --- | --- |
| Rail | 96 px | 72 px, icon và nhãn nhỏ như Meshy |
| Bảng thông số | Bên phải, 360 px (392 px từ `xl`) | Bên trái canvas, cùng độ rộng |
| Canvas | Phần còn lại | Phần còn lại |
| Dự án của tôi | Không có | Bên phải, 300 px từ `xl` (1280 px), 340 px từ `2xl` (1536 px). Có nút thu gọn. Khi thu gọn còn một dải 44 px có nút mở lại. |

Canvas còn lại theo chiều rộng màn hình: khoảng 516 px ở 1280 px, 676 px ở 1440 px, 732 px ở 1536 px, 1116 px ở 1920 px. Từ 1024 đến 1279 px, cột dự án luôn hiện sẽ làm canvas còn dưới 300 px. Ở khoảng này cột dự án mặc định thu gọn và mở thành ngăn trượt phủ lên canvas.

### 5.3 Nội dung cột "Dự án của tôi"

- **Đầu cột**: tiêu đề và số dự án, ô tìm kiếm, nút **Dự án mới** mở trang chọn mẫu `/templates`.
- **Lọc nhanh**: Gần đây (mặc định, sắp theo `updatedAt` giảm dần) và lọc theo kiểu hộp.
- **Danh sách**: lưới 2 cột `ProjectTile` thu nhỏ, dưới mỗi ô là tên dự án và thời gian sửa. Dự án đang mở được viền cam và không bấm được. Dự án lỗi FitCheck có chấm đỏ.
- **Phân trang**: tải thêm khi cuộn tới cuối, mỗi lần 12 dự án (`PROJECTS_PAGE_SIZE`).
- **Chân cột**: liên kết "Xem tất cả" mở `/dashboard/projects` để đổi tên, chuyển thư mục hoặc xoá. Cột trong Studio chỉ dùng để mở dự án, không có thao tác sửa hay xoá.
- **Bấm một dự án**: gửi ngay thay đổi đang chờ lưu, chờ lưu xong rồi mới chuyển sang `/editor/[id]`. Nếu lưu lỗi thì ở lại trang và báo lỗi.

### 5.4 Các trạng thái

| Trường hợp | Cột dự án hiển thị |
| --- | --- |
| Đang tải | Khung chờ dạng lưới 2 cột |
| Chưa có dự án | Một dòng giải thích và nút **Dự án mới** |
| Khách chưa đăng nhập ở `/editor/demo` | Thẻ của bản nháp demo hiện tại và nút **Đăng nhập để lưu và xem dự án** dẫn về đúng trang demo sau đăng nhập |
| Đã đăng nhập ở `/editor/demo` | Danh sách dự án như bình thường. Bản nháp demo nằm trên cùng, gắn nhãn "Bản nháp" |
| Dự án đang mở nằm trong thùng rác | Danh sách vẫn hiện để người dùng chuyển sang dự án khác |
| Lỗi tải danh sách | Thông báo lỗi và nút **Thử lại** |
| API không trả lời, ứng dụng dùng tài khoản demo thay thế | Các dự án mẫu như trên dashboard. Khi chuyển dự án, bản demo đang sửa chỉ được lưu trong trình duyệt |

### 5.5 Điện thoại và máy tính bảng dưới 1024 px

Bố cục hiện tại được giữ: canvas ở trên, bảng thông số ở dưới, rail ở đáy màn hình. Rail đáy có thêm mục **Dự án**. Mục này mở danh sách dự án dạng sheet từ dưới lên, cùng nội dung với cột desktop.

### 5.6 Các bước thực hiện

| Bước | Việc | Tệp chính |
| --- | --- | --- |
| S1 | Đặt `WorkspaceInspector` sang trái canvas từ `lg` (đổi thứ tự và viền). Thu rail về 72 px. Cập nhật màn hình chờ `StudioSkeleton` và vị trí các bước hướng dẫn trong `studioTour.ts`. | `studioUi.tsx`, `WorkspaceNav.tsx`, `StudioSkeleton.tsx`, `studioTour.ts` |
| S2 | Tạo component `StudioProjectLibrary`: tìm kiếm, lọc, lưới 2 cột, tải thêm, đủ các trạng thái ở mục 5.4. Dùng lại `useProjectList` và `ProjectTile`. | `fe/src/features/studio/components/StudioProjectLibrary.tsx` (mới) |
| S3 | Gắn cột vào `StudioWorkspace` cho cả bốn công cụ. Thêm nút thu gọn (nhớ lựa chọn trong `localStorage`) và ngăn trượt cho khoảng 1024–1279 px. Đổi dự án qua `flush()` có sẵn của `useProjectSync`. | `StudioWorkspace.tsx` |
| S4 | Thêm mục **Dự án** vào rail đáy trên điện thoại, mở sheet danh sách. | `WorkspaceNav.tsx`, `StudioWorkspace.tsx` |
| S5 | Kiểm tra theo mục 6. Cập nhật kịch bản E2E nếu bộ chọn đổi. Cập nhật doc 19. | `fe/scripts/e2e-scenario.mjs`, `docs/19_STUDIO_WORKSPACE.md` |

### 5.7 Kết quả thực hiện

S1–S5 được triển khai trong commit `2fc1cb1`. Ngoài các tệp ở bảng trên, đợt này còn sửa:

- **Backend**: `GET /projects` trả thêm `hasFitcheckErrors` (`project.types.ts`, `project.select.ts`, `prisma-project.repository.ts`).
- **Thư viện dùng chung**: `ProjectTile` có dạng thu nhỏ (`compact`). `useProjectList` nhận thêm `enabled` và `accountOnly`; khi bật `accountOnly`, `listProjects` không thay danh sách lỗi bằng dự án mẫu. `ModalLayer` có thêm kiểu `sheet-bottom` cho điện thoại.
- **Phiên đăng nhập**: `useMe` trả `null` khi API báo 401, không dùng tài khoản demo thay thế nữa.
- **Khung xem 3D**: `InteractiveFoldingBox3D` giữ mức zoom khi cột dự án đóng hoặc mở.

Sau review cùng ngày có hai sửa đổi:

- Khi API không trả lời, cột dự án hiện dự án mẫu thay vì báo lỗi, như ở mục 5.4.
- Danh sách không tải báo cáo FitCheck đầy đủ của từng dự án. Một truy vấn phụ lọc `isValidForProduction` ngay trong Postgres và chỉ trả mã các dự án có lỗi.

Kết quả kiểm tra ở [doc 19, mục 6](19_STUDIO_WORKSPACE.md#6-kết-quả-xác-minh). Còn hai việc chưa kiểm tra: build production frontend sau các sửa đổi, và chuyển giữa hai dự án đã lưu với backend thật.

## 6. Kiểm chứng sau khi sửa

- So ảnh chụp desktop bằng `npm --workspace=fe run shots -- --routes` trước và sau (xem doc 13).
- Kiểm tra lại 320, 375, 768, 1024 và 1440 px như mục 6 của doc 19, vì rail và chân bảng đổi chỗ trên di động.
- Chạy `npm --workspace=fe run tokens:check` và `npm --workspace=fe run build`.

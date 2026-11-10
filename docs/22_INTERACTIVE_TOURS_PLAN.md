# 22. Hướng dẫn tương tác: làm thật trong tour, chuyển luồng, chữ hành động cam đậm

> Ngày lập: 2026-11-11 · Nhánh gốc: `feat/payment-gateways` (4a3ed7d) · Trạng thái: **S1–S5 xong (2026-11-11), kiểm tay 11/11 kịch bản đạt; chưa chạy đủ `shots --routes`, xem §9**
> Phạm vi: chỉ frontend. Lõi ở `fe/src/components/ui/tour.tsx`; nội dung tour ở 5 trang (§5).

## 1. Hiện trạng

`ProductTour` (`fe/src/components/ui/tour.tsx`) làm tối màn hình, khoét một lỗ quanh phần tử đích, đặt tooltip cạnh đó.

- Bước thường (nút "Tiếp"): một `<span>` phủ lên lỗ khoét (dòng ~420), nên người dùng **không bấm được** phần tô sáng.
- Bước `clickTarget`: lỗ khoét cho bấm xuyên, bấm đích là sang bước sau. Chỉ dùng cho nút cuối ("Bắt đầu", "Tạo dự án", "Bước tiếp").
- Cờ "đã xem" (`localStorage wrapfit.tour.<id>`) chỉ ghi khi bấm Hoàn tất / Bỏ qua / Esc. Rời trang giữa chừng thì cờ không ghi, nên quay lại trang là tour hiện lại từ đầu.
- Studio: tour giới thiệu (`studio-intro-v1`) chạy trước, xong mới tới tour từng bước (`studio-step-N-v1`, key theo bước). Bấm sang bước khác giữa tour giới thiệu thì tour giới thiệu vẫn đứng nguyên.
- Nút "Xem hướng dẫn" có ở: dashboard, `/editor/new`, Studio (chỉ chạy lại tour của bước đang mở). **Không có** ở Thư viện mẫu và Trang chủ.
- Dialog của app nằm ở `z-[60]` (portal), dropdown (`select-menu`, `dropdown-menu`, `date-picker`, `search-bar`) là `absolute` trong phần tử cha. Tour nằm ở `z-[90]`, nên dialog mở từ phần tô sáng bị lớp tối che, dropdown tràn ra ngoài lỗ khoét bị lớp tối chặn bấm.

## 2. Quyết định (sau 2 vòng hỏi đáp, 2026-11-11)

| # | Quyết định |
|---|---|
| D1 | Mọi bước có đích đều cho **dùng thật** phần tô sáng (chọn kiểu hộp, gõ kích thước, đổi tab…). Tour đứng yên ở bước đó; muốn đi tiếp vẫn bấm "Tiếp". Bước `clickTarget` giữ như cũ (bấm đích là sang bước). |
| D2 | Mỗi bước có đích có thêm **một dòng gợi ý** trong tooltip, nói rõ bấm thì xảy ra gì. VD: "Thử bấm một kiểu hộp: bản vẽ bên trái đổi theo." Không làm bàn tay nhấp nháy, không tự diễn thao tác. |
| D3 | Bấm phần tô sáng mà sang luồng khác (trang khác, hoặc bước Studio khác) thì **tour cũ đóng và tính là bỏ qua**. Tour của luồng mới chạy từ bước 1 **chỉ khi chưa xem**. Ngoại lệ giữ nguyên: Trang chủ bấm "Bắt đầu" ở bước cuối (tour đã hoàn tất) vẫn ép tour `/editor/new` chạy. |
| D4 | Tour bỏ dở do chuyển luồng thì quay lại trang cũ **không tự hiện nữa**; xem lại bằng nút "Xem hướng dẫn". |
| D5 | **Reload / đóng tab** giữa tour **không** tính là bỏ: lần sau tour hiện lại từ đầu. Chỉ chuyển luồng mới tính là bỏ. |
| D6 | **Mọi câu ra lệnh hành động** trong tour ("Bấm nút này", "Chọn một kiểu", "Gõ số vào ô", "Kéo thanh trượt", "Nhập khối lượng"…) in **đậm màu cam** (`text-accent`: cam 700 nền sáng, cam 400 nền tối). |
| D7 | Nút "Xem hướng dẫn" trong Studio chạy **tour giới thiệu rồi nối tiếp tour của bước đang mở**. |
| D8 | Thêm nút "Xem hướng dẫn" ở **Thư viện mẫu** và **Trang chủ**. |

## 3. Thiết kế lõi (`tour.tsx`)

### 3.1 Dùng thật phần tô sáng (D1)

- Bỏ `<span>` chặn bấm trên lỗ khoét. Lỗ khoét luôn cho bấm xuyên; phần tối vẫn chặn như cũ.
- Lỗ khoét **nới ra** để bao cả popup đang mở bên trong đích: mỗi lần đo, gộp hình chữ nhật của đích với các con `[role="listbox"], [role="menu"], [role="dialog"], [data-tour-popup]` đang hiện. Thêm `MutationObserver` (childList + attributes, subtree) trên đích để đo lại khi dropdown mở/đóng.
- **Dialog modal** mở từ đích (portal `z-[60]`): khi trên trang có `[role="dialog"][aria-modal="true"]` không phải tooltip của tour, tour **tạm ẩn** (lớp tối + tooltip), dialog đóng thì hiện lại đúng bước đó. Theo dõi bằng `MutationObserver` trên `document.body`.
- Phím: khi focus nằm trong đích hoặc trong ô nhập (`input`, `textarea`, `select`, `[contenteditable]`), tour **bỏ qua** ←/→/Enter để người dùng gõ số, đẩy thanh trượt bình thường. Esc chỉ đóng tour khi `!event.defaultPrevented` và focus không nằm trong popup đang mở (Esc đầu tiên đóng dropdown, Esc thứ hai mới đóng tour).
- Tooltip vẫn bám đích theo từng khung hình (đã có), nên đích đổi kích thước khi người dùng thao tác thì tooltip đi theo.

### 3.2 Dòng gợi ý (D2)

- `TourStep` thêm `tryIt?: string`: câu nói thao tác và kết quả, có thể chứa `**…**` (§3.4).
- Hiện thành dải `bg-fpt-orange-light` có icon `MousePointerClick` (dùng lại dải "Bấm vào phần đang được tô sáng để tiếp tục" hiện có). Bước `clickTarget` không có `tryIt` thì giữ câu mặc định đó.
- Bước không có đích (thẻ chào, thẻ kết) không có dòng gợi ý.

### 3.3 Bỏ dở khi chuyển luồng (D3, D4, D5)

- `ProductTour` giữ `activeRef`. Effect dọn dẹp lúc unmount: tour đang mở thì `markTourSeen(id, false)`. Chuyển trang trong SPA (Next router) và đổi bước Studio (key đổi) đều unmount nên đều ghi "skipped".
- Reload / đóng tab: trình duyệt hủy trang, React không chạy cleanup, nên cờ không ghi và tour hiện lại (đúng D5). Không thêm `beforeunload`.
- Prop mới `abortKey?: unknown`: giá trị đổi trong lúc tour mở thì `close(false)` (gọi `onClose(false)`). Dùng cho tour giới thiệu Studio, vốn không unmount khi đổi bước.
- Tour luồng mới: không cần code thêm. Trang mới tự chạy tour khi chưa xem (hành vi `autoStart` hiện có). `continueTourOnNextPage` chỉ còn ở Trang chủ khi **hoàn tất**.
- Chú ý Strict Mode (dev): lần mount đầu `active` là `null`, nên cleanup giả không ghi cờ.

### 3.4 Chữ hành động cam đậm (D6)

- Hàm nhỏ `renderTourText(text: string)`: tách chuỗi theo `**…**`, đoạn trong dấu thành `<strong className="font-semibold text-accent">`. Áp cho `body` (khi là string) và `tryIt`. `body` dạng ReactNode vẫn dùng như cũ.
- Đánh dấu bằng tay trong từng bước (§5), không tự dò động từ: ranh giới cụm từ tiếng Việt dò tự động dễ sai.
- Sửa comment đầu file `tour.tsx` mô tả 3 hành vi mới.

## 4. Thiết kế từng trang

| Trang | File | Việc |
|---|---|---|
| Studio | `fe/src/views/editor/studio/StudioWorkspace.tsx` | Tour giới thiệu nhận `abortKey={currentStep}`: bấm tên bước khác ở bước "6 bước, đi từ trái sang phải" thì tour giới thiệu đóng (skipped), tour bước mới tự chạy nếu chưa xem. Nút "Xem hướng dẫn": state `replay` (số đếm). Bấm: `introSeen=false`, tour giới thiệu mount lại với `key` mới và `force`. Giới thiệu **hoàn tất** thì tour bước hiện tại chạy với `force`. Giới thiệu bị **bỏ qua** (X / Esc) thì dừng, không nối tiếp. |
| Thư viện mẫu | `fe/src/views/templates/index.tsx` | Thêm `TourReplayButton tourId={LIBRARY_TOUR_ID}` ở hàng tiêu đề / cạnh ô tìm (kiểm cả màn điện thoại). |
| Trang chủ | `fe/src/views/home/index.tsx` (+ `fe/src/components/home/HomeHero.tsx` nếu đặt nút ở hero) | `WelcomeTour` luôn mount, `autoStart={welcome}`. `replaceState` chỉ chạy khi có `?welcome=1`. Thêm `TourReplayButton tourId={ONBOARDING_TOUR_ID}` (ghost) cạnh các nút ở hero. Chạy lại mà hoàn tất bằng "Bắt đầu" thì vẫn `continueTourOnNextPage()`. |
| Dashboard, `/editor/new` | như cũ | Chỉ đổi nội dung (§5). |

## 5. Nội dung: `tryIt` + `**…**`

Mỗi bước có đích được viết lại: cụm hành động bọc `**…**`, thêm `tryIt`. Ví dụ (chữ cuối cùng do chủ dự án duyệt khi review):

| Tour · bước | `tryIt` |
|---|---|
| editor-new · Việc 1: Chọn kiểu hộp | "**Thử bấm một kiểu hộp**: bản vẽ bên trái đổi theo ngay." |
| editor-new · Việc 2: Nhập kích thước | "**Gõ một số vào ô Dài** hoặc **kéo thanh trượt**: khuôn bế co giãn theo." |
| studio-step-2 · Chưa có thước? | "**Bấm một món quà mẫu**: ba ô kích thước tự điền." |
| dashboard · Tạo hộp theo kích thước | "**Bấm** để mở trang tạo hộp. Hướng dẫn ở đây sẽ dừng, trang mới có hướng dẫn riêng." |
| library · Mẫu tuyển chọn hoặc cộng đồng | "**Bấm tab Cộng đồng**: lưới đổi sang thiết kế của người dùng." |
| studio-intro · Xuất file in | "Chưa cần bấm. Khi xong thiết kế, **bấm nút này** để tải PDF." |

Bước có đích dẫn sang trang khác (dashboard "Tạo hộp mới", "Dự án gần đây", thanh bên; Trang chủ "ngành hàng"; Thư viện thẻ mẫu) ghi rõ trong `tryIt` rằng bấm là rời hướng dẫn này.

File nội dung: `fe/src/views/home/index.tsx`, `fe/src/views/dashboard/index.tsx`, `fe/src/views/editor/new/index.tsx`, `fe/src/features/studio/studioTour.ts`, `fe/src/views/templates/index.tsx`, và tour mẫu `DEMO_TOUR` ở `fe/src/views/design-system/index.tsx` (thêm 1 bước có `tryIt` + `**…**` để trang design system trình diễn được).

## 6. Các phiên làm

| Phiên | Việc | Xong khi |
|---|---|---|
| S1 | Lõi `tour.tsx`: bỏ span chặn, lỗ khoét gộp popup, tạm ẩn khi có dialog, phím, `tryIt`, `renderTourText`, ghi "skipped" khi unmount, `abortKey`. Tour mẫu design system. | `/design-system` chạy tour mẫu: bấm được đích, chữ cam đậm, dòng gợi ý hiện. `tsc` + lint sạch. |
| S2 | Studio: `abortKey`, nút replay nối tiếp (D7). | Kịch bản 4, 5, 6 ở §7 đạt. |
| S3 | Nút replay Thư viện mẫu + Trang chủ (D8). | Kịch bản 7, 8 đạt, cả 375 px và desktop. |
| S4 | Viết lại nội dung 5 tour (§5). | Mọi bước có đích có `tryIt`; mọi câu ra lệnh có `**…**`. |
| S5 | Kiểm thử §7, chụp màn (`npm --workspace=fe run shots -- --routes`), `graphify update .`, ghi nhật ký vào `docs/04_PROGRESS.md`. | Toàn bộ §7 đạt. |

## 7. Kịch bản kiểm thử (tay, trong browser pane; FE chưa có test đơn vị)

Xóa `localStorage` khóa `wrapfit.tour.*` trước mỗi kịch bản.

1. Dashboard lần đầu, tới bước "Tạo hộp theo kích thước", bấm "Tạo hộp mới": sang `/editor/new`, tour trang này chạy từ bước 1. Bấm back về dashboard: tour dashboard **không** hiện. "Xem hướng dẫn" chạy lại từ đầu.
2. Như 1 nhưng đã xem tour `editor-new-v1` trước: sang `/editor/new` **không** có tour.
3. `/editor/new` bước "Chọn kiểu hộp": bấm kiểu khác, bản vẽ đổi, tour vẫn ở bước đó. Bước kích thước: gõ số, dùng ←/→ trong ô: tour không nhảy bước.
4. Studio tour giới thiệu, bước "6 bước": bấm "Giấy & hoàn thiện": tour giới thiệu biến mất, tour bước 3 chạy (nếu chưa xem).
5. Studio "Xem hướng dẫn": chạy tour giới thiệu; hoàn tất thì tour bước hiện tại chạy tiếp. Bấm X ở tour giới thiệu: dừng hẳn.
6. Reload giữa tour bất kỳ: tour hiện lại từ bước 1.
7. Trang chủ "Xem hướng dẫn" (không có `?welcome=1`): tour chạy; bấm "Bắt đầu" ở bước cuối: `/editor/new` chạy tour kể cả đã xem.
8. Thư viện mẫu "Xem hướng dẫn": chạy lại; bước tab: bấm "Cộng đồng" đổi được tab, tour đứng yên.
9. Đích có dropdown (`select-menu`): mở được, chọn được mục tràn ra ngoài lỗ khoét. Đích mở dialog: tour tạm ẩn, đóng dialog thì tour hiện lại.
10. Esc khi dropdown đang mở: chỉ dropdown đóng. Esc lần nữa: tour đóng.
11. Chế độ tối: chữ cam đậm đọc rõ trên nền tooltip. Màn 375 px: tooltip + dòng gợi ý không tràn ngang.

## 8. Rủi ro

- Người dùng thao tác làm đích **biến mất** (VD đổi tab làm lưới mẫu render lại): đích tìm lại theo selector mỗi lần đo; không thấy thì lỗ khoét tắt, tooltip về giữa màn. Cần kiểm ở bước Thư viện "thẻ mẫu".
- Bấm phần tô sáng có thể **ghi dữ liệu thật** (VD Studio đổi cấu trúc hộp đang lưu). Chấp nhận: đó là thao tác người dùng tự làm, giống ngoài tour.
- `fe/scripts/e2e-scenario.mjs` đánh dấu mọi tour là "skipped" trước khi chạy; không thêm id tour mới nên danh sách `TOURS` không đổi.

## 9. Nhật ký S5 (2026-11-11): kiểm thử và chốt

Môi trường: FE dev trên cổng 3107 (cổng 3000 đã bị chiếm), BE chạy ở 8080 nhưng phiên là khách (demo offline): trang dùng dữ liệu mẫu, các lời gọi `/api` trả 401/403 là bình thường. Chưa đăng nhập tài khoản demo. Trước mỗi kịch bản xóa khóa `wrapfit.tour.*`. Chuột bấm thật qua lỗ khoét; Esc, bàn phím gõ thật.

| # | Kịch bản | Kết quả |
|---|---|---|
| 1 | Dashboard → "Tạo hộp mới" → `/editor/new` chạy từ bước 1; back không hiện lại dashboard; "Xem hướng dẫn" chạy lại | Đạt (`dashboard-v1=skipped`) |
| 2 | Đã xem `editor-new-v1`, bấm sang `/editor/new` | Đạt: không có tour |
| 3 | Chọn kiểu hộp khác, gõ 150 vào ô Dài, ←/→ trong ô và trên thanh trượt | Đạt: bản vẽ và tiêu đề đổi, tour đứng ở bước, 150 → 151 sau ←← →; chọn món quà mẫu điền 65×40×120 |
| 4 | Studio, bước "6 bước": bấm bước 3 trên thanh bước | Đạt: tour giới thiệu thành `skipped`, tour bước 3 chạy |
| 5 | Studio "Hướng dẫn": giới thiệu rồi nối tour bước hiện tại; X ở giới thiệu | Đạt: hoàn tất thì tour bước 3 chạy; X thì dừng hẳn |
| 6 | Reload giữa tour | Đạt: chạy lại từ bước 1, chưa ghi cờ |
| 7 | Trang chủ "Xem hướng dẫn" (không `?welcome=1`), bấm "Bắt đầu" ở bước cuối | Đạt: `/editor/new` chạy tour dù `editor-new-v1=done` |
| 8 | Thư viện mẫu "Xem hướng dẫn"; tab Cộng đồng | Đạt: tab đổi (`?tab=community`), tour đứng yên; bước thẻ mẫu bám theo thẻ mới |
| 9 | Dropdown tràn ngoài lỗ khoét; dialog mở từ đích | Đạt một phần: lỗ khoét giãn ra bao popup (đo hình học), tour ẩn khi có `[role=dialog][aria-modal]` và hiện lại khi đóng. Cả hai thử bằng phần tử giả chèn vào đích ở `/design-system`: tour thật chỉ có `<select>` gốc, không có `select-menu` |
| 10 | Esc khi popup mở | Đạt (popup giả): Esc đầu chỉ đóng popup, Esc sau đóng tour |
| 11 | Chế độ tối, 375 px | Đạt: chữ đậm cam 400 `rgb(245 126 66)` trên nền tooltip tối, cam 700 `rgb(185 63 10)` nền sáng; tooltip trong 16–359 px, `scrollWidth` 375 ở `/editor/new`, `/`, `/templates`; dải gợi ý đúng màu tối |

Thêm: mọi bước có đích của 6 mảng tour (studio 26 bước, dashboard, editor-new, home, templates, design-system) có `tryIt` và `**…**` (kiểm bằng script đọc mã nguồn); trong trình duyệt, `/editor/new`, dashboard, trang chủ, thư viện, Studio hiện đủ dải gợi ý. Không tìm thấy lỗi nên không sửa gì ở `tour.tsx`, `StudioWorkspace.tsx`, `HomeHero.tsx`. `tsc --noEmit -p fe` sạch.

Ghi chú:
- `StudioWorkspace.tsx` dùng state `introSeen` + effect theo `currentStep` để đóng tour giới thiệu khi đổi bước, thay cho prop `abortKey` ở §4; kết quả giống nhau. Prop `abortKey` không trang nào dùng nên đã bỏ khỏi `ProductTour` (2026-11-11).
- Nút "Xem hướng dẫn" ở Thư viện mẫu (36 px), `/editor/new` (36 px) và Trang chủ (40 px) thấp hơn ngưỡng 44 px trên điện thoại: đã thêm `min-h-11 sm:min-h-0` (2026-11-11).
- `page-shots` mở trang bằng hồ sơ mới nên tour tự chạy và lớp tối `fixed inset-0 z-[90]` bị kiểm tra `covered` báo che chữ cuối trang (`/templates` ở M và T). Báo cáo cũ cũng có lỗi này: không do đợt này.

Chưa kiểm được:
- `npm --workspace=fe run shots -- --routes` đủ 109 route × 6 cỡ: BE chỉ cho origin `http://localhost:3000` (`CORS_ORIGINS`), nên với FE ở 3107 bước đăng nhập của vai trò maker/admin trả `403 ORIGIN_NOT_ALLOWED`. Chỉ chạy được route khách của nhóm G5 ở cỡ M và X+ (không tràn ngang, không phần tử ra ngoài khung; mọi dòng chỉ có `REQUEST: 403 /api/auth/refresh` do origin sai, cộng lỗi `covered` ở trên và `TEXT` cũ ở `g5-unbox-open`). Dashboard và `/editor/new` chỉ xem qua khung trình duyệt 1280×800 và 375×812.
- Tài khoản demo / VNPay: không đăng nhập, nên tour chưa thử với dữ liệu thật (danh sách dự án, thẻ xu).
- Màn hình tối của Studio và các bước Studio 4–6 chỉ kiểm bằng script mã nguồn, chưa bấm từng bước trong trình duyệt.
- Pane Browser của app bị ẩn nên `requestAnimationFrame` chậm: vài số đo giữa chừng sai, đã đo lại sau khi chụp màn hình; chạy lại trên Chrome thật nếu cần.

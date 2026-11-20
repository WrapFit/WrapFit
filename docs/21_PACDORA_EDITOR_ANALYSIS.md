# 21 — Phân tích editor hộp của Pacdora và đề xuất nâng cấp workspace 2D/3D

Ngày khảo sát **20/11/2026** · Nhánh **`codex/meshy-workspace`** · Tài liệu liên quan: [19 — Workspace Studio](19_STUDIO_WORKSPACE.md), [20 — Phân tích workspace Meshy](20_MESHY_WORKSPACE_ANALYSIS.md).

## 1. Phạm vi và phương pháp

Mục tiêu là tìm các kỹ thuật Pacdora dùng khi người dùng mở và chỉnh một chiếc hộp, rồi chọn những kỹ thuật đáng đưa vào phần sửa hộp 2D và 3D của WrapFit.

Khảo sát dùng hai nguồn bằng chứng:

- **Thao tác trực tiếp bằng Claude in Chrome.** Mở thư viện khuôn, mở hộp *Rollover hinged lid mailer box* (mẫu 150010), đổi kích thước, mở các tab thông số, kéo thanh gập, rê và bấm mặt hộp trong 3D, mở trình *Mockup Generator* và *3D modeling software*. Đọc DOM, canvas và danh sách tài nguyên mạng của trang.
- **Phân tích tĩnh bằng REA.** `capture_browser_scenario` mở trang khuôn trong Chromium riêng và lưu nội dung các script. `export_web_scripts` xuất 153 script. `analyze_javascript_application` dựng đồ thị của 13 module liên quan. Phần còn lại đọc trực tiếp bundle đã rút gọn `pacdora-3d-*.js` (5,5 MB) theo từ khóa.

Mỗi kết luận bên dưới ghi rõ là **quan sát** (thấy trên trang hoặc trong mã) hay **suy luận** (rút ra từ mã rút gọn, chưa chạy kiểm chứng).

## 2. Luồng làm việc khi mở một hộp

Pacdora chia việc sửa hộp thành ba trang. Cả ba dùng cùng một dữ liệu khuôn của dự án.

| Trang | Bố cục | Việc người dùng làm |
| --- | --- | --- |
| **Dieline generator** | Thanh icon bên trái (Dielines, Basic, Details, Parts, Info, More) và bảng thông số. Khuôn 2D ở giữa. Thẻ 3D nhỏ ở góc phải trên, dưới là định dạng xuất. Thanh công cụ nổi ở đáy canvas. | Nhập dài, rộng, cao theo mm hoặc inch, chọn vật liệu, độ dày và cách đo (sản xuất, lọt lòng, phủ bì). Chỉnh thông số chi tiết của tai, khóa và lề tràn. Đổi biến thể bộ phận. |
| **Mockup Generator** | Thanh icon trái (Edit, Models, Layout, AI Background, Video, More, AI Design). Hộp 3D chiếm giữa. Thanh công cụ dọc bên phải, thanh gập và góc nhìn ở đáy. | Tải ảnh lên mặt hộp, đổi vật liệu và kích thước, chọn góc nhìn, xuất ảnh. |
| **3D modeling software** | Giao diện tối, sàn lưới, bóng đổ. Bảng Layout với nhiều bố cục nhiều hộp. | Dựng cảnh nhiều hộp, ánh sáng, nền, render ảnh chất lượng cao. |

**Quan sát trên Dieline generator:**

- Khi nhập chiều dài mới và nhấn Enter, khuôn vẽ lại ngay. Trang không gọi lại API khuôn, chỉ gửi `PUT /api/v2/projects` để tự lưu. Biểu tượng mây ở đầu trang hiện "All changes saved at 22:27".
- Tab **Details** hiện các số đo chi tiết (tai góc, lưỡi khóa, tai hông, lề tràn) ngay trên khuôn. Khi rê chuột lên một thông số, khuôn chỉ giữ lại đường đo của thông số đó.
- Tab **Parts** hiện các biến thể nắp (Standard, Thumb notch, Tab lock, Handle, Tear strip) dưới dạng thẻ có hình khuôn thu nhỏ.
- Thẻ 3D nhỏ có thanh *Open ↔ Close*. Kéo về *Open* thì tấm bìa trải phẳng trong 3D với vân giấy sóng. Gợi ý "Drag to view the model" cho biết có thể kéo để xoay.
- Thanh công cụ đáy có chọn, kéo khung nhìn, phóng to, thu nhỏ, đo kích thước, thêm cửa sổ và cài đặt.

**Quan sát trên Mockup Generator:**

- Rê chuột lên một mặt hộp thì mặt đó phủ màu tím nhạt. Bấm vào mặt thì hiện menu tại điểm bấm với **Upload your images** và **Custom size**.
- Nút góc nhìn mở bảng sáu góc có sẵn (Front Right, Front Left, Front, Top Left, Top Right, Top) và **Save view**.
- Thanh gập có điểm cuối "Open fully".

## 3. Kỹ thuật bên trong

### 3.1 Nền tảng

- **Quan sát.** Vue 3, đóng gói bằng Vite với rolldown, mỗi trang là một ứng dụng riêng (không có router phía client). Three.js bản r149 (`window.__THREE__ === "149"`). Mỗi trang 3D dùng một canvas WebGL2 duy nhất, kích thước theo `devicePixelRatio`.
- **Quan sát.** Ánh sáng môi trường lấy từ file `.hdr` (RGBELoader, PMREMGenerator), tone mapping ACESFilmic. Bundle có OrbitControls, GLTFLoader, GLTFExporter, DRACOLoader và KTX2Loader.

### 3.2 Khuôn 2D bằng SVG có định danh từng mặt

- **Quan sát.** Khuôn là một SVG. Mỗi mặt là một `path` có id theo vị trí: `knifeFace_F` (mặt trước), `knifeFace_FL`, `knifeFace_FT`, `knifeFace_HB`, `knifeFace_L`, `knifeFace_R`… Đường đo nằm trong nhóm `knife-size-arrows`.
- **Quan sát.** Màu lớp: nét cắt `#2028b0`, nét gấp `#fa0000` nét đứt, lề tràn `#46ba00`. Watermark là một `image` bị cắt theo `clipPath` của đường cắt.
- **Quan sát.** Kéo và phóng khuôn bằng CSS `transform: translate(...) scale(...)` trên khối bao, không vẽ lại SVG. Module `usePreviewZoom` phóng quanh vị trí con trỏ, dùng `translate3d` và `scale3d`, giới hạn từ 1× đến 20×.

### 3.3 Mô hình gập: cây mặt và các bước xoay

**Quan sát trong mã rút gọn.** Lớp khuôn giữ:

- `faceMap` (các mặt và cạnh của chúng), `foldMap` (đường gấp giữa hai mặt, đặt tên `cha_con`) và `rootFaces` (gốc của cây gập).
- `animations`: danh sách các bước. Mỗi bước gồm các lệnh `{ name: "cha_con", action: "rotate", rotate: độ }`. Lệnh xoay lớn hơn 45° được tách thành nhiều bước 45°.
- `completedCaps` với `baseEdge` và `bendEdge`: điểm của tai được kéo theo đường cong khi gập, tạo nếp uốn mềm ở góc thay vì gãy cứng.
- `innerMesh`, `outerMesh`, `sideMesh`, `roundMesh` và `thickness` mặc định 1,5 mm. Mặt trong, mặt ngoài và cạnh dày là các lưới riêng.
- `getUV(x, y)` trả về `[x / totalX, y / totalY]`. Cả tấm bìa phẳng là một ảnh texture duy nhất.

**Suy luận.** Vì UV lấy thẳng từ toạ độ khuôn phẳng, hình in vẽ trên khuôn 2D tự nằm đúng chỗ khi gập. Tách bước xoay theo thứ tự giúp tai và nắp gập lần lượt, không xuyên qua nhau. Thanh *Open ↔ Close* chọn đến bước nào trong danh sách.

### 3.4 Chuyển khuôn sang 3D bằng WebAssembly

- **Quan sát.** Trang tải `knife2gltf.min.wasm` bản 1.1.8. Hàm chuyển đổi chọn `knife2gltf` cho hộp thường, `curveKnife2Gltf` cho hộp cong (`CurveBox`) và một nhánh riêng cho bao bì mềm (`SoftPacking`).
- **Suy luận.** Khuôn được dựng thành glTF có độ dày ngay trên trình duyệt, sau đó Three.js nạp như một model thông thường.

### 3.5 Hiệu năng render

- **Quan sát.** Vòng lặp chỉ vẽ khi cờ `needRenderOnce` bật (71 chỗ bật cờ). Không có thay đổi thì không vẽ khung mới.
- **Quan sát.** Hàm `setPerformanceFirstOrEffectFirst("performance")` hạ `pixelRatio` xuống 0,5. Chế độ `effect` trả lại giá trị gốc.
- **Suy luận.** Pacdora hạ độ phân giải khi người dùng đang xoay hoặc kéo, rồi vẽ lại sắc nét khi thả tay.

### 3.6 Chọn mặt và tô sáng bằng shader

- **Quan sát.** Mô hình giữ `colorMap` theo khoá `` `${model}_${side}` ``, ánh xạ tên mặt sang một màu riêng. `getHoverFaceNames` đọc tên mặt từ bảng này. `setHover` đẩy tối đa 10 màu vào shader cùng màu tô `#731EFF`. Sau khi đổi trạng thái tô sáng, mã bật `needRenderOnce`.
- **Suy luận.** Mỗi mặt có một màu định danh trong một texture. Shader so màu đó để phủ màu tô sáng, nên cả hộp vẫn là một lưới với một vật liệu. Không cần tách mỗi mặt thành một mesh riêng chỉ để tô sáng.

### 3.7 Hoàn thiện in (ép kim, phủ UV, dập nổi)

- **Quan sát.** `elementFinishPreview` mang `foilShader`, `coatingShader` và `reliefShader`. Mỗi shader gắn vào vật liệu qua `onBeforeCompile` với `customProgramCacheKey`. Mã chèn thêm đoạn vào khối `USE_METALNESSMAP` của shader chuẩn.
- **Suy luận.** Vùng ép kim và phủ UV được đưa vào các map kim loại, độ nhám và phủ bóng của vật liệu vật lý. Khi xoay hộp, ánh sáng môi trường phản chiếu khác nhau trên vùng ép kim.

### 3.8 Vật liệu giấy

- **Quan sát.** Danh mục giấy sóng có N, F, E, B, C, A và các loại 5 lớp (BE, BB, BC, AB, AC, AA). Cạnh tấm bìa sóng dùng ảnh `materials/flute-side.jpeg`. Ảnh mẫu vật liệu gồm giấy kraft, giấy trắng, giấy tráng phủ và giấy sóng.

### 3.9 Phím tắt

- **Quan sát.** `V` chọn, `H` kéo khung nhìn, `C` bình luận. `Ctrl/⌘+Z` hoàn tác, `Ctrl/⌘+Shift+Z` làm lại. `Ctrl/⌘+=`, `Ctrl/⌘+-` phóng, thu, `Ctrl/⌘+0` về khung nhìn gốc. Phím tắt bỏ qua khi con trỏ đang ở ô nhập liệu.

## 4. So sánh với WrapFit hiện tại

Đối chiếu với `/editor/demo` chạy trên máy (cổng 3107) và mã nguồn hiện tại.

| Khía cạnh | WrapFit đã có | Khoảng trống so với Pacdora |
| --- | --- | --- |
| Khuôn 2D | SVG, chú giải lớp, thước, đường gióng, hút cạnh, phóng quanh con trỏ, phím tắt, chọn mặt theo dải tab | Thông số chi tiết không liên kết với đường đo trên khuôn khi rê chuột |
| Xem 2D và 3D cùng lúc | Nút chuyển **Khuôn 2D / Hộp 3D** (`artView` trong `StudioWorkspace.tsx`) | Chỉ xem được một chế độ. Khi thiết kế, không thấy hộp 3D cập nhật cùng lúc |
| Bấm mặt trong 3D | Hộp 3D có prop `onFlapClick` và tô sáng khi rê chuột | `StudioWorkspace` không truyền `onFlapClick`. Bấm mặt chỉ mở hoặc đóng nắp, không chọn mặt đó trong 2D và không có menu thao tác |
| Gập hộp | Thanh gập 0–100 %, mở nắp, nhãn mặt, đường đo 3 trục màu | `boxModel.ts` không dựng tai và mép dán. Không có thứ tự gập theo bước |
| Chất liệu | Màu giấy theo chủ đề, vân sợi tạo bằng canvas, `RoomEnvironment` + `NeutralToneMapping` | Không có ảnh vân giấy thật, không có cạnh giấy sóng. Độ dày chỉ ở viền |
| Hoàn thiện in | Vẽ ép kim, phủ UV, dập nổi thành dải màu trong texture (`drawFinished` trong `boxModel.ts`) | Hiệu ứng cố định trong ảnh. Ép kim không lóe sáng khi xoay hộp |
| Hiệu năng 3D | Chỉ vẽ khi có thay đổi (cờ `dirty`), dừng khi khuất (`IntersectionObserver`) | `pixelRatio` cố định `min(dpr, 2)` cả khi đang xoay |
| Biến thể bộ phận | **Tuỳ chọn hộp** dạng danh sách chữ | Chưa có thẻ hình khuôn thu nhỏ cho từng biến thể |
| Góc nhìn | Các nút Trước, Bên, Trên, Cận cảnh | Chưa lưu được góc nhìn riêng |
| Lưu | Trạng thái "Đã lưu trên Cloud", nút Lưu dự án | Tương đương |

## 5. Đề xuất nâng cấp

Thứ tự ưu tiên dựa trên lợi ích cho người thiết kế so với công sức. Các tệp chính: [StudioWorkspace](../fe/src/views/editor/studio/StudioWorkspace.tsx), [InteractiveFoldingBox3D](../fe/src/features/studio/components/three/InteractiveFoldingBox3D.tsx), [boxModel](../fe/src/features/studio/components/three/boxModel.ts) và [DielineCanvas2D](../fe/src/features/studio/components/canvas/DielineCanvas2D.tsx).

### Ưu tiên 1 — trải nghiệm thiết kế

**A. Thẻ 3D nhỏ trong chế độ 2D.** Khi `artView === "2d"`, đặt một thẻ 3D khoảng 260 × 200 px ở góc phải trên của vùng canvas. Thẻ có thanh gập, kéo để xoay và nút mở rộng sang **Hộp 3D**. Thẻ dùng lại texture của từng mặt, nên chữ hay ảnh vừa thêm hiện ngay trên hộp. Cho phép thu gọn thẻ và nhớ lựa chọn trong trình duyệt. Thẻ chỉ vẽ khi texture hoặc góc nhìn đổi, và dừng khi bị che.

**B. Liên kết mặt hai chiều.** Truyền `onFlapClick` để bấm một mặt trong 3D chọn đúng mặt đó trong 2D (`selectPanel`). Bấm mặt hiện menu tại điểm bấm: **Thiết kế mặt này**, **Tải ảnh lên mặt này**, **Đổi kích thước**. Chiều ngược lại, khi rê chuột lên một mặt trên khuôn 2D hoặc trên dải tab mặt, gọi `model.highlight(panelId)` để tô sáng mặt đó trên thẻ 3D.

**C. Đường đo theo ngữ cảnh.** Khi rê chuột hoặc đặt con trỏ vào ô **Dài**, **Rộng**, **Cao**, khuôn 2D chỉ hiện đường đo của kích thước đó và tô đậm trục tương ứng trên hộp 3D. Làm tương tự cho các thông số trong **Tuỳ chọn hộp**.

### Ưu tiên 2 — độ chân thực của hộp 3D

**D. Dựng tai, mép dán và thứ tự gập.** Mở rộng mô hình gập thành cây mặt có danh sách bước như Pacdora: mỗi bước xoay một nhóm cạnh gấp, góc lớn tách thành bước 45°. Thanh gập 0–1 chạy qua các bước theo thứ tự (thân hộp, tai bụi, nắp, lưỡi gài). Đây là thay đổi lớn nhất, chạm vào công thức gập của `@wrapfit/shared` và `boxModel.ts`. Cần test cho từng kiểu hộp.

**E. Vật liệu giấy thật.** Tạo bộ texture riêng của WrapFit (không dùng ảnh của Pacdora) cho kraft, ivory, duplex và giấy sóng: ảnh màu lặp, bump và roughness cỡ nhỏ. Thêm texture cạnh giấy sóng cho các mặt cạnh khi chọn giấy sóng. Dựng độ dày bằng lưới mặt trong, mặt ngoài và cạnh.

**F. Hoàn thiện in theo vật liệu vật lý.** Thay vì vẽ dải màu cố định, xuất từ mỗi mặt thêm một ảnh mặt nạ cho vùng ép kim, phủ UV và dập nổi. Đưa ảnh này vào `metalnessMap`, `roughnessMap`, `clearcoatMap` và `bumpMap` của `MeshPhysicalMaterial`. Chỉ dùng `onBeforeCompile` khi cần ghép nhiều hiệu ứng. Khi xoay hộp, vùng ép kim phản chiếu ánh sáng môi trường.

### Ưu tiên 3 — hiệu năng và hoàn thiện

**G. Độ phân giải thích ứng.** Khi OrbitControls phát `start`, hạ `pixelRatio` xuống 1 (hoặc 0,75 trên máy yếu). Khi phát `end`, trả lại `min(dpr, 2)` và vẽ một khung sắc nét.

**H. Thẻ biến thể có hình.** Đổi **Tuỳ chọn hộp** thành thẻ có khuôn thu nhỏ vẽ từ chính hình học của khuôn (đáy khóa, đáy thường, có cửa sổ, có quai).

**I. Lưu góc nhìn.** Thêm **Lưu góc nhìn** vào thanh góc nhìn 3D, lưu theo dự án để dùng lại khi chụp ảnh và tạo clip.

**Không đề xuất.** Không sao chép `knife2gltf.wasm`, ảnh vật liệu hay mã của Pacdora. Hình học khuôn của WrapFit đã có sẵn bằng TypeScript. Chỉ học cách tổ chức và tự viết lại.

## 6. Lộ trình gợi ý

| Đợt | Nội dung | Kiểm chứng |
| --- | --- | --- |
| S1 | B: truyền `onFlapClick`, menu tại điểm bấm, tô sáng mặt khi rê chuột trên khuôn 2D | E2E: bấm mặt trước trong 3D thì tab **Mặt trước** được chọn trong 2D |
| S2 | A: thẻ 3D nhỏ trong chế độ 2D, thu gọn và nhớ lựa chọn | Thêm chữ trên khuôn 2D thì chữ hiện trên thẻ 3D. Đo thời gian khung khi kéo phần tử |
| S3 | C + G: đường đo theo ngữ cảnh, độ phân giải thích ứng | Ảnh chụp theo [hướng dẫn chụp bố cục desktop](13_DESIGN_SYSTEM.md). Đo FPS khi xoay |
| S4 | F: hoàn thiện in theo vật liệu vật lý | So ảnh trước và sau với hộp có logo ép kim |
| S5 | E: bộ texture giấy và cạnh giấy sóng | So ảnh 4 loại giấy. Kiểm tra dung lượng tải thêm |
| S6 | D: tai, mép dán và thứ tự gập | Test gập cho từng kiểu hộp. Kiểm tra không xuyên mặt ở 0 %, 50 % và 100 % |

### Tiến độ

**S1 xong ngày 20/11/2026 (chưa commit).** Bấm một mặt của hộp 3D trong Studio mở menu ngay tại điểm bấm. Dòng đầu menu ghi tên mặt và phía giấy, ví dụ "Nắp trên · mặt trong" khi bấm vào lòng nắp đang mở. Mặt đó được tô sáng trong lúc menu mở.

| Mục menu | Tác dụng |
| --- | --- |
| **Thiết kế mặt này** | Chuyển sang **Thiết kế**, mở **Khuôn 2D**, chọn đúng phía giấy và chọn mặt trên khuôn. |
| **Tải ảnh lên mặt này** | Như trên, mở bảng **Tải lên** và hộp chọn tệp. Ảnh được đặt vào mặt vừa bấm. |
| **Mở nắp / Đóng nắp** | Đổi trạng thái nắp, đồng bộ với nút ở thanh đáy. Không có với hộp gối. |
| **Đổi kích thước** | Mở **Hộp & giấy** → **Kích thước**. Ẩn ở bước 1 và 2 vì ô kích thước đã nằm cạnh hộp. |

Menu điều khiển được bằng bàn phím (mũi tên, Enter, Escape). Bấm ra ngoài, kéo xoay hộp hoặc đổi chế độ xem sẽ đóng menu. Các trang khác dùng hộp 3D (trang giới thiệu, thư viện kiểu hộp) giữ cách cũ: bấm mặt hộp thì mở hoặc đóng nắp.

Mã chính: prop `onFaceClick` và `highlightPanelId` của [InteractiveFoldingBox3D](../fe/src/features/studio/components/three/InteractiveFoldingBox3D.tsx), `ContextMenu` trong [dropdown-menu](../fe/src/components/ui/dropdown-menu.tsx) và `faceMenuItems` trong [StudioWorkspace](../fe/src/views/editor/studio/StudioWorkspace.tsx).

Mặt trong không được tô sáng. Mặt trong của mọi tấm dùng chung một vật liệu, trừ khi thiết kế có in mặt trong.

**S2 xong ngày 20/11/2026 (chưa commit).** Ở chế độ **Khuôn 2D**, góc phải trên của vùng thiết kế có thẻ **Xem trước 3D** rộng 240 px.

- Hình in hiện trên hộp sau khi người dùng ngừng chỉnh 250 ms. Lúc đang kéo một lớp, hộp không dựng lại, vì mỗi lần dựng phải vẽ lại texture của mọi mặt.
- Rê chuột lên một mặt trên khuôn 2D thì mặt đó sáng lên trên hộp. Phần tô sáng của S1 dùng lại đúng cơ chế này.
- Bấm một mặt trên thẻ chọn ngay mặt đó và đúng phía giấy trên khuôn, không qua menu.
- Thanh **Mở ↔ Gập** của thẻ dùng chung mức gập với chế độ **Hộp 3D**. Nút mở rộng chuyển sang **Hộp 3D**.
- Nút thu gọn biến thẻ thành nút **Xem trước 3D** và trình duyệt nhớ lựa chọn này. Khi thu gọn, hộp 3D được gỡ hẳn để trả lại ngữ cảnh WebGL.
- Thẻ chỉ hiện từ 768 px trở lên. Trên điện thoại, vùng thiết kế quá nhỏ để chia sẻ, nên thẻ không được dựng.

Độ sáng khi tô một mặt tăng từ 0,14 lên 0,26 để nhìn rõ trên thẻ nhỏ và trên giấy ivory. Mặt đang thiết kế không được tô sáng thường trực, để màu hình in trên thẻ giữ đúng.

Mã chính: [Preview3DCard](../fe/src/features/studio/components/three/Preview3DCard.tsx), prop `onHoverPanel` của [DielineCanvas2D](../fe/src/features/studio/components/canvas/DielineCanvas2D.tsx).

Giới hạn của S2: thẻ nằm đè lên góc phải trên của khuôn. Người dùng có thể thu gọn thẻ hoặc kéo khuôn sang chỗ khác. Thẻ chưa tự né khuôn khi khuôn vừa khít khung.

**S3 xong ngày 20/11/2026 (chưa commit).**

- **Đường đo theo ngữ cảnh trên khuôn 2D.** Khi rê chuột hoặc đặt con trỏ vào ô **Dài**, **Rộng** hoặc **Cao** ở bước 1–2 mà đang xem **Khuôn 2D**, mỗi cạnh tấm có độ dài đó hiện một đường đo cùng màu với trục, kèm nhãn như "C 60,4". Ví dụ với hộp 120 × 80 × 60 mm, ô **Cao** đánh dấu bốn mặt thân hộp. Đường có viền trắng để đọc được trên mọi hình in. Ở chế độ **Hộp 3D**, trục tương ứng đã sáng từ trước.
- **Cách nhận cạnh.** Công thức khuôn không gắn trục cho từng cạnh, nên một cạnh được coi là khớp khi lệch so với số đo không quá hai lần độ dày giấy cộng 0,6 mm (công thức cộng thêm độ dày giấy). Nếu hai số đo bằng nhau, cả hai trục đánh dấu cùng các cạnh.
- **Độ phân giải thích ứng.** Khi kéo để xoay hộp 3D, canvas vẽ ở nửa mật độ điểm ảnh, không thấp hơn 1 điểm ảnh cho mỗi pixel CSS. Thả tay thì vẽ lại sắc nét. Cuộn chuột và bấm không kéo không đổi độ phân giải. Trên màn hình tỉ lệ 1,25, canvas rộng 1545 px còn 1236 px trong lúc kéo. Màn hình tỉ lệ 1 không đổi.

Mã chính: prop `measure` của [DielineCanvas2D](../fe/src/features/studio/components/canvas/DielineCanvas2D.tsx), vòng lặp vẽ trong [InteractiveFoldingBox3D](../fe/src/features/studio/components/three/InteractiveFoldingBox3D.tsx).

Chưa đo số khung hình mỗi giây trước và sau khi hạ độ phân giải.

**S4 xong ngày 20/11/2026 (chưa commit).** Hoàn thiện in trên hộp 3D không còn là ánh sáng vẽ sẵn vào ảnh màu. Mỗi mặt có phần tử hoàn thiện vẽ thêm hai ảnh mặt nạ ở nửa độ phân giải của ảnh màu, rồi đưa vào vật liệu vật lý của mặt đó.

| Hoàn thiện | Ảnh màu | Bản đồ vật liệu | Kết quả khi xoay hộp |
| --- | --- | --- | --- |
| Ép kim vàng, bạc, vàng hồng | Màu kim loại phẳng trong hình phần tử | Kim loại 1, độ nhám 0,2–0,24 | Phản chiếu căn phòng, sắc đổi theo góc nhìn |
| UV định hình | Giữ nguyên hình in | Lớp phủ bóng 1, độ nhám lớp phủ 0,08 | Vùng phủ bóng bắt sáng riêng |
| Dập nổi, dập chìm | Giữ nguyên hình in | Bản đồ cao độ quanh màu xám giữa, làm mềm mép 0,5 mm | Mép phần tử có vệt sáng và bóng như giấy bị ép |

- Ảnh mặt nạ bề mặt gộp lớp phủ bóng (kênh R), độ nhám (G) và kim loại (B), đúng kênh mà three.js đọc. Quanh phần tử là giá trị của chính tờ giấy, nên phần giấy trơn trông như cũ.
- Phần tử in thường nằm trên vùng ép kim sẽ che vùng đó, theo đúng thứ tự in.
- Môi trường của sân khấu chỉ sáng 0,55, hợp với giấy nhưng làm ép kim xỉn màu ô liu. Một đoạn shader nhỏ chèn qua `onBeforeCompile` nhân phản chiếu môi trường lên 2,6 lần, chỉ ở nơi bản đồ kim loại cao. Giấy chủ đề **gold_foil** vốn là kim loại toàn tờ nên không được tăng.
- Hệ số nổi là 30. Ở hệ số 3, dập nổi không thấy được vì three.js ước lượng độ nổi theo độ thay đổi trên mỗi điểm ảnh màn hình.

Mã chính: `FinishMaps`, `paintMap` và `applyFinishMaps` trong [boxModel](../fe/src/features/studio/components/three/boxModel.ts).

Giới hạn của S4:

- Mặt có dập nổi mất vân sợi giấy, vì bản đồ cao độ thay bản đồ vân sợi ở mặt đó. Mặt có ép kim hoặc UV mất độ nhám thay đổi theo vân sợi.
- UV định hình trên nền đậm khá khó thấy. Chưa so sánh với ảnh chụp hộp thật.
- Hệ số tăng phản chiếu và hệ số nổi được chỉnh bằng mắt trên một hộp đỏ với giấy ivory, chưa thử trên giấy kraft hay giấy forest.

**S5 xong ngày 21/11/2026 (chưa commit).** Mỗi loại giấy có hạt và lõi riêng, vẽ bằng canvas lúc chạy. Không dùng ảnh giấy của ai.

- **Hạt giấy theo mm.** Mỗi mặt giấy (ngoài và trong) của sáu loại có một ô hạt 40 mm: sợi ngắn, đốm tái chế và mảng mây nhạt. Ô hạt neo theo tọa độ tấm phôi nên hai mặt kề nhau khớp nhau qua nếp gấp. Ví dụ: kraft có sợi nâu đậm nhạt; mặt sau xám của duplex và carton bồi có đốm như giấy tái chế; giấy tráng phủ gần như trơn; gold_foil mặt ngoài không có hạt.
- **Mực thấm vào kraft.** Trên kraft, hạt được nhân chồng lên hình in ở mức 0,55, nên sợi giấy hiện xuyên qua màu in.
- **Mặt trong không in.** Trước đây mặt trong dùng chung một màu trơn. Giờ mỗi tấm có vật liệu riêng với ô hạt lặp theo kích thước tấm.
- **Vân sợi nổi đúng tỉ lệ.** Bản đồ sợi giấy chung trước đây lặp 4 lần trên mọi mặt, nên mặt dài có sợi bị kéo giãn. Giờ mỗi mặt lặp một lần cho mỗi 30 mm. Bản sao dùng chung ảnh nên GPU chỉ giữ một bản.
- **Lõi giấy ở mép cắt.** Mép cắt có tọa độ UV và ảnh các lớp giấy theo độ dày, tính từ mặt in: duplex là lớp tráng trắng trên lõi xám; carton bồi là giấy bọc, greyboard rồi giấy lót; forest và gold_foil có lớp mặt màu trên lõi kem. Mép chỉ dày khoảng 1,3 mm trên màn hình, nên phải nhìn gần mới thấy.

Mã chính: [paperLook](../fe/src/features/studio/components/three/paperLook.ts) và [boxModel](../fe/src/features/studio/components/three/boxModel.ts).

Giới hạn của S5:

- **Chưa có giấy sóng.** Bảng giá (`QuotePaper`) chỉ có ivory, kraft, duplex và rigid, nên chưa có mép giấy sóng E. Muốn thêm giấy sóng thì phải sửa cả báo giá, thông số vật liệu và mô hình 3D.
- Hạt sinh ngẫu nhiên mỗi lần tải trang, nên hai lần mở hộp có hạt hơi khác nhau.
- Chỉ so bằng mắt trên hộp đỏ phủ kín. Chưa thử hộp để trống nhiều giấy mộc.

## 7. Giới hạn của khảo sát

- Mã Pacdora đã được rút gọn. Các kết luận về mô hình gập, chọn mặt và hoàn thiện in đọc từ tên thuộc tính và đoạn mã, chưa chạy riêng từng hàm. Đồ thị REA của `pacdora-3d` chỉ đầy đủ một phần vì chạm giới hạn phân tích bí danh.
- Không đọc nội dung WebAssembly `knife2gltf`. Chưa xem trình thiết kế 2D của Pacdora sau khi tải ảnh lên, vì việc này cần tải tệp lên dịch vụ của họ.
- Khi đổi kích thước và mở trình mockup, Pacdora tự tạo hai dự án khách trên tài khoản ẩn danh của trình duyệt. Không có dữ liệu cá nhân nào được gửi đi.

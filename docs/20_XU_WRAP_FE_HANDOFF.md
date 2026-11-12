# 20. Xu Wrap: bàn giao cho frontend

> Từ: backend. Ngày: 2026-10-31. Nhánh: `feat/xu-wrap` (chưa push, chưa merge vào `develop`).
> Spec đầy đủ và lý do từng quyết định: [docs/19_XU_WRAP_SPEC.md](19_XU_WRAP_SPEC.md). File này chỉ gom những gì frontend cần biết để dùng, sửa hoặc làm lại phần giao diện.

Mục lục:
1. Tóm tắt thay đổi
2. Khái niệm cần nắm
3. Bảng giá
4. API
5. Mã lỗi
6. Các luồng chuẩn
7. Thay đổi phá vỡ tương thích (breaking changes)
8. Giao diện đã làm sẵn
9. Chạy và thử ở máy local
10. Việc còn mở và gợi ý
11. Checklist trước khi merge

---

## 1. Tóm tắt thay đổi

- **Xu Wrap** là đơn vị chung cho mọi tác vụ AI. 1 xu = 100đ giá niêm yết.
- Xu thay cho "lượt AI mỗi ngày". Khách không còn thấy "Còn N/M lượt", chỉ thấy số dư xu và giá xu của từng tác vụ.
- **Lượt xuất file (EXPORT) giữ nguyên.** Xu và lượt xuất là hai sổ riêng, không quy đổi qua lại.
- Ba nhóm tác vụ trả bằng xu:
  - Ảnh AI (text-to-image) để dán lên mặt hộp. Có 7 model, giá khác nhau.
  - Hoa văn AI: bản `fast` 1 xu, bản `premium` 65 xu. Bản premium nay mở cho mọi gói.
  - Công cụ ảnh: phóng to 20 xu, xóa nền 5 xu, vector hóa 10 xu.
- Nguồn xu:
  - Hạn mức của gói mỗi kỳ: Free 50, Lượt xuất 100, Pro 1.000, Business 3.500.
  - Gói nạp lẻ qua VietQR: `XU_500`, `XU_1050`, `XU_2200`.
  - Admin tặng.
- API mới: `/ai/models`, `/ai/images*`, `/billing/xu/history`, `/admin/analytics/xu`. API có đổi dạng dữ liệu: `/billing/me`, `/ai/usage`, `/ai/pattern`, `/payments`.
- Phần lớn giao diện đã có (mục 8). Frontend có thể giữ, sửa hoặc thay. Hợp đồng API ở mục 4 là thứ cố định.

## 2. Khái niệm cần nắm

| Khái niệm | Ý nghĩa với giao diện |
| :- | :- |
| **Số dư** (`balance`) | Tổng xu còn dùng được, đã trừ các lô hết hạn. Là số duy nhất cần hiện ở chip số dư. |
| **Lô** (`CreditLot`) | Mỗi lần nhận xu là một lô: nguồn, số nhận, số còn, hạn dùng. Khi tiêu, lô sắp hết hạn bị trừ trước. API trả các lô theo đúng thứ tự sẽ bị trừ. |
| **Hạn mức kỳ** (`allowance`) | Xu của gói. Backend tự cấp khi khách đọc ví hoặc tiêu xu lần đầu trong kỳ, không có cron. `resetsAt` là lúc kỳ sau bắt đầu. |
| **Kỳ** | Free và Lượt xuất: theo tháng dương lịch, giờ Việt Nam. Pro và Business có subscription còn hiệu lực: kỳ 30 ngày tính từ ngày mua. |
| **Dồn kỳ** | Xu gói thừa dùng thêm được đúng một kỳ nữa, rồi hết hạn. Vì vậy số dư từ gói có thể lên tới 2 lần hạn mức. |
| **Xu nạp lẻ** | Hạn 12 tháng kể từ lúc thanh toán. |
| **Hoàn xu** | Lỗi phía hệ thống (nhà cung cấp lỗi, timeout, worker chết, nhà cung cấp chặn ảnh) thì hoàn đủ, tự động. Khách không ưng ảnh thì không hoàn. Prompt bị bước kiểm duyệt chặn thì chưa trừ xu. |
| **Thư viện ảnh AI** | Ảnh AI được giữ 30 ngày (`keepUntil`). Ảnh đã nằm trên một thiết kế đã lưu thì được giữ như ảnh upload thường. Ảnh tính vào dung lượng lưu trữ của gói. |

## 3. Bảng giá

**Không chép giá vào code FE.** Lấy giá từ:
- API `GET /ai/models` (model đang bật và giá công cụ), `GET /ai/usage` (giá hoa văn).
- Hoặc package `@wrapfit/shared`: `AI_IMAGE_MODELS`, `XU_TOOL_COST`, `XU_PATTERN_COST`, `XU_PACKS`, `XU_ALLOWANCE`, `XU_VALUE_VND`.

Hai nguồn trên dùng chung một catalog, nên giá luôn khớp với backend. Nếu bảng giá đổi, frontend không phải sửa gì.

Bảng tham khảo (theo `shared/src/billing/ai-image-models.ts` ngày 2026-10-31):

| `key` | Nhãn | `tier` | Xu/ảnh | Tỉ lệ khung | Chữ trong ảnh | Ảnh/lần |
| :- | :- | :- | -: | :- | :- | -: |
| `flux2-klein` | FLUX.2 klein | draft | 10 | chung* | không | 1–4 |
| `gpt-image-2-low` | GPT Image 2 (nháp) | draft | 10 | 1:1, 3:2, 2:3 | không | 1–4 |
| `seedream-4.5` | Seedream 4.5 | standard | 30 | chung* | không | 1–4 |
| `gpt-image-2-medium` | GPT Image 2 | standard | 40 | 1:1, 3:2, 2:3 | **có** | 1–4 |
| `nano-banana-2` | Nano Banana 2 | standard | 60 | chung* | không | 1–4 |
| `recraft-v3-vector` | Recraft V3 Vector | vector | 60 | 1:1, 4:3, 3:4, 16:9, 9:16 | không | **1** |
| `nano-banana-pro` | Nano Banana Pro | premium | 120 | chung* | **có** | 1–4 |
| `gpt-image-2-high` | GPT Image 2 (cao) | premium | 300 | 1:1, 3:2, 2:3 | có | **đang tắt**, không có trong `/ai/models` |

\* Tỉ lệ khung chung: `1:1`, `4:3`, `3:4`, `3:2`, `2:3`, `16:9`, `9:16`. Luôn đọc `aspectRatios` của từng model.

Các khoản khác:

| Mục | Xu |
| :- | -: |
| Phóng to (`upscale`), tối đa 16 MP, cạnh dài ≤ 4096 px | 20 |
| Xóa nền (`remove-bg`) | 5 |
| Vector hóa (`vectorize`) | 10 |
| Hoa văn `fast` / `premium` | 1 / 65 |
| Hoa văn thuật toán (khi AI tắt hoặc cầu chì ngân sách đã chạm) | 0 |
| Gói nạp `XU_500` / `XU_1050` / `XU_2200` | 50.000đ / 100.000đ / 200.000đ |

Xu mỗi lần tạo ảnh = `model.xu × numImages`.

## 4. API

Mọi route có tiền tố `/api`, xác thực bằng cookie như các route khác. Route `POST` cần header CSRF như hiện nay; client `request()` trong `fe/src/services/api` đã xử lý. Ngày giờ là chuỗi ISO 8601.

Kiểu TypeScript đã khai báo sẵn trong `fe/src/types/api/index.ts`, hàm gọi trong `fe/src/api/ai/index.ts` và `fe/src/api/payments/index.ts`.

### 4.1 `GET /ai/models`: catalog ảnh AI

Trả 200 `AiImageCatalog`:

```ts
{
  enabled: boolean;              // false: server không có nhà cung cấp ảnh hoặc không có storage → ẩn hoặc khóa tính năng
  models: {
    key: string;                 // gửi lại ở POST /ai/images
    label: string;               // tiếng Việt, hiện được ngay
    tier: "draft" | "standard" | "premium" | "vector";
    xu: number;                  // xu cho mỗi ảnh
    output: "raster" | "vector"; // vector = SVG
    supportsText: boolean;       // false thì không được bật allowText
    aspectRatios: AiImageAspectRatio[];
    maxImages: number;           // trần của numImages
    summary: string;             // một câu mô tả điểm mạnh, tiếng Việt
  }[];
  tools: { upscale: number; "remove-bg": number; vectorize: number }; // xu mỗi lần chạy
}
```

Chỉ chứa model đang bật (biến môi trường `AI_IMAGE_MODELS`). Danh sách ít thay đổi: cache khoảng 5 phút là đủ.

### 4.2 `POST /ai/images`: tạo ảnh (trừ xu, đưa vào hàng đợi)

Body `CreateAiImageRequest`:

| Trường | Kiểu | Bắt buộc | Ràng buộc |
| :- | :- | :- | :- |
| `prompt` | string | có | 1–500 ký tự sau khi trim. Tiếng Việt được: server tự dịch và đóng khung thành "artwork phẳng cho mặt hộp". |
| `modelKey` | string | có | Phải có trong `/ai/models` |
| `aspectRatio` | `AiImageAspectRatio` | có | Phải nằm trong `model.aspectRatios`. Dùng `nearestAspectRatio(widthMm, heightMm, model.aspectRatios)` của `@wrapfit/shared` để chọn theo mặt hộp. |
| `numImages` | int | không (mặc định 1) | 1 đến `model.maxImages` |
| `allowText` | boolean | không (mặc định false) | Chỉ khi `model.supportsText` |
| `clientRequestId` | UUID | nên gửi | Tạo **một lần cho mỗi cú bấm**. Gửi lại cùng giá trị thì nhận lại job cũ, không bị trừ xu lần hai. |

Trả **202** `AiImageJobStarted`:

```ts
{ job: AiImageJob; balance: number } // balance = số dư sau khi trừ
```

Job lúc này có `status: "PENDING"`, `outputs: []`. Throttle: 5 request mỗi phút cho mỗi người dùng; vượt thì 429 không có `code`.

Lỗi có thể gặp: 400 (dữ liệu sai), 402, 422, 429, 503, 403 (mục 5).

### 4.3 `GET /ai/images/jobs/:id`: theo dõi một job

Trả 200 `AiImageJob`:

```ts
{
  id: string;
  kind: "GENERATE" | "UPSCALE" | "REMOVE_BG" | "VECTORIZE";
  modelKey: string;               // với công cụ: tên công cụ
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  prompt: string | null;          // prompt khách gõ (null với công cụ)
  aspectRatio: string | null;
  numImages: number;
  xuCost: number;                 // tổng xu của job
  error: string | null;           // tiếng Việt, chỉ khi FAILED; xu đã được hoàn
  createdAt: string;
  completedAt: string | null;
  outputs: AiImageOutput[];
}

AiImageOutput = {
  id: string;                     // dùng cho các công cụ ở mục 4.5
  url: string | null;             // URL công khai; null nếu server không cấu hình STORAGE_PUBLIC_URL
  contentType: string;            // "image/png" | "image/webp" | "image/jpeg" | "image/svg+xml"
  width: number | null;           // px; null với SVG
  height: number | null;
  keepUntil: string;              // bị xóa sau ngày này nếu không nằm trên thiết kế đã lưu
  createdAt: string;
}
```

- Poll mỗi 2 giây cho tới khi `COMPLETED` hoặc `FAILED`.
- Lần thử đầu lỗi thì worker thử lại sau 5 giây, nên một job có thể mất 10–60 giây (Nano Banana Pro khoảng 25–40 giây).
- Job treo quá 10 phút bị chuyển FAILED và hoàn xu, chậm nhất khoảng 15 phút.
- Hai thông điệp `error` hiện có:
  - "Tạo ảnh không thành công. Xu đã được hoàn lại."
  - "Nhà cung cấp AI từ chối vẽ nội dung này. Xu đã được hoàn lại."
- Job của người khác trả 404.

### 4.4 `GET /ai/images?before&limit`: "Ảnh AI của tôi"

- `limit` 1–60, mặc định 30.
- `before` là `nextBefore` của trang trước; bỏ trống nghĩa là tính từ bây giờ.

Trả 200 `AiImageGalleryPage`:

```ts
{
  items: (AiImageOutput & { job: { id: string; kind: AiImageJob["kind"]; modelKey: string; prompt: string | null } })[];
  nextBefore: string | null;      // null = hết trang
}
```

Sắp xếp mới nhất trước. Thư viện có thể vẫn trả ảnh đã quá `keepUntil` mà job dọn file chưa chạy tới. Nên hiện "còn N ngày" và làm mờ ảnh sắp hết hạn.

### 4.5 `POST /ai/images/:outputId/:tool`: công cụ ảnh

- `tool` là `upscale`, `remove-bg` hoặc `vectorize`.
- Body `{ clientRequestId?: UUID }`.
- Trả 202 `{ job, balance }`, rồi theo dõi job như mục 4.3.

Ràng buộc:
- Cả ba công cụ không chạy trên ảnh SVG, tức output có `width` null (400). Ẩn menu công cụ với ảnh vector.
- `upscale` báo 400 khi ảnh đã đạt trần 16 MP hoặc cạnh dài đã 4096 px.
- `outputId` không phải của mình: 404.

Ảnh tạo ra là một output mới. Ảnh gốc giữ nguyên.

### 4.6 `GET /billing/me`: thêm ví xu

Response cũ thêm trường `xu: XuWallet`:

```ts
XuWallet = {
  balance: number;
  lots: CreditLot[];              // các lô còn hạn, xếp theo thứ tự sẽ bị trừ (hạn gần trước); có thể có lô remaining = 0
  allowance: { perPeriod: number; periodKey: string; resetsAt: string };
}

CreditLot = {
  id: string;
  source: "PURCHASE" | "ADMIN" | "PLAN_ALLOWANCE";
  quantity: number;               // số xu nhận
  remaining: number;
  expiresAt: string | null;
  createdAt: string;
}
```

Đọc route này sẽ cấp hạn mức của kỳ nếu chưa cấp, nên số dư luôn đúng ngay cả với tài khoản mới.

### 4.7 `GET /billing/xu/history?before&limit`: lịch sử xu

`limit` 1–100, mặc định 30. Trả 200 `XuHistoryPage`:

```ts
{
  entries: {
    type: "GRANT" | "SPEND";
    id: string;
    quantity: number;             // GRANT dương, SPEND âm
    source: "PURCHASE" | "ADMIN" | "PLAN_ALLOWANCE" | null;  // chỉ với GRANT
    reason: "AI_IMAGE" | "AI_PATTERN" | "AI_TOOL" | "ADMIN_ADJUSTMENT" | "EXPORT_UNLOCK" | null; // chỉ với SPEND
    refId: string | null;         // id job ảnh, nếu có
    refundedAt: string | null;    // khác null: lần trừ này đã được hoàn (gạch ngang hoặc ghi "đã hoàn")
    expiresAt: string | null;
    createdAt: string;
  }[];
  nextBefore: string | null;
}
```

Một lần tạo ảnh có thể trừ từ nhiều lô, nhưng lịch sử gộp lại thành **một dòng** cho mỗi thao tác.

### 4.8 `GET /ai/usage`: đổi dạng

```ts
{
  aiEnabled: boolean;             // false: server không có key Claude, hoa văn luôn là thuật toán và miễn phí
  budgetReached: boolean;         // true: cầu chì ngân sách tháng đã chạm, hoa văn thuật toán miễn phí tới tháng sau
  patternCost: { fast: number; premium: number };
  xu: { balance: number; allowance: XuAllowance };
}
```

Đã bỏ các trường `tier`, `used`, `limit` (mục 7).

### 4.9 `POST /ai/pattern`: hoa văn AI trả bằng xu

- Body giữ nguyên: `{ theme, preferredColors?, quality?: "fast" | "premium" }`.
- Bỏ giới hạn theo gói: `premium` dùng được với mọi gói.
- Thiếu xu: 402 `INSUFFICIENT_CREDITS` (kind `XU`), trả về trước khi gọi AI.

Trường `usage` của response đổi:

```ts
usage: { charged: number; balance: number } | null
// null: AI tắt hoặc cầu chì đã chạm → hoa văn thuật toán, không trừ xu
// charged = 0: AI lỗi, xu đã hoàn, trả hoa văn thuật toán (source: "procedural")
```

Gợi ý: khi `source === "procedural"` và `usage?.charged === 0`, báo nhẹ "AI đang bận, đây là hoa văn tự sinh, xu đã được hoàn".

### 4.10 `POST /payments`: gói nạp xu

- `purpose` nhận thêm `"XU_500" | "XU_1050" | "XU_2200"`.
- `PaymentView` (response của `POST /payments` và `GET /payments/:id`) có thêm trường `xu: number | null`, là số xu của gói. Mục khác thì `xu` là null.
- Khi thanh toán xác nhận, backend cấp một lô `PURCHASE` hạn 12 tháng. Sau đó gọi lại `/billing/me` để lấy số dư mới.
- `CheckoutDialog` đã hỗ trợ các purpose này.

### 4.11 Admin

- `GET /admin/analytics/xu?month=yyyy-mm` (role ADMIN). Bỏ `month` thì lấy tháng hiện tại theo giờ Việt Nam. Trả `XuReport` (kiểu trong `fe/src/types/api`):
  - Xu phát ra theo nguồn, xu đã tiêu theo tác vụ, xu đã hoàn.
  - Doanh thu ghi nhận, xu hết hạn, xu bán chưa tiêu (doanh thu chưa thực hiện).
  - Chi phí nhà cung cấp theo model, biên lãi gộp.
- `POST /admin/users/:id/credits` thêm `kind?: "EXPORT" | "XU"` (mặc định `EXPORT`). Với xu, `quantity` tối đa 100.000.

## 5. Mã lỗi

Mọi lỗi theo dạng chung `{ statusCode, code?, message, ...extra }`. Hàm `errorMessage()` trong `fe/src/services/api/index.ts` đã đổi các mã dưới đây thành câu tiếng Việt.

| HTTP | `code` | Khi nào | Trường thêm | Gợi ý giao diện |
| :- | :- | :- | :- | :- |
| 402 | `INSUFFICIENT_CREDITS` | Không đủ xu (`kind: "XU"`) hoặc không đủ lượt xuất (`kind: "EXPORT"`) | `kind`, `balance`, `cost` | "Cần N xu, bạn còn M xu", kèm nút "Nạp xu" mở `CheckoutDialog`. Tốt nhất là khóa nút trước khi bấm nếu `balance < cost`. |
| 422 | `PROMPT_REJECTED` | Bước kiểm duyệt chặn prompt (18+, bạo lực, logo hoặc nhân vật có bản quyền). Chưa trừ xu. | `message` tiếng Việt, nêu lý do | Hiện `message` nguyên văn, giữ prompt trong ô để khách sửa |
| 429 | `AI_IMAGE_BUSY` | Đã có 3 job ảnh đang chạy | `message` tiếng Việt | Hiện `message`, chờ một job xong |
| 429 | (không có) | Vượt 5 request/phút | Header `Retry-After` (giây), client đọc vào `error.retryAfter` | "Bạn thao tác quá nhanh. Thử lại sau N giây." (`errorMessage` đã có) |
| 503 | `AI_IMAGE_UNAVAILABLE` | Tính năng tắt, cầu chì ngân sách đã chạm, hoặc hàng đợi lỗi (xu đã hoàn) | `message` tiếng Việt | Hiện `message`, khóa nút tạo |
| 403 | `STORAGE_QUOTA_EXCEEDED` | Bộ nhớ của gói đã đầy | `message` | Dẫn tới trang quản lý file hoặc nâng cấp gói |
| 400 | (không có) | Model không bật, tỉ lệ khung sai, `numImages` vượt trần, `allowText` với model không hỗ trợ, công cụ không áp dụng được | `message` tiếng Anh | Không nên xảy ra nếu giao diện dựa vào catalog. Hiện câu chung. |
| 404 | (không có) | Job hoặc ảnh không tồn tại hoặc không phải của mình | — | — |

Lưu ý: với 422 không có `code`, `errorMessage` trả câu mặc định về FitCheck. Vì vậy luôn kiểm `code` trước khi dựa vào status.

Các lỗi xảy ra **sau** khi job đã vào hàng đợi không trả qua HTTP. Chúng nằm trong `job.status = "FAILED"` và `job.error`.

## 6. Các luồng chuẩn

### 6.1 Tạo ảnh AI cho một mặt hộp

1. Mở panel: gọi `GET /ai/models` và `GET /billing/me` (hoặc `/ai/usage`) để có catalog và số dư. Nếu `enabled === false` thì hiện trạng thái "Ảnh AI đang tạm tắt".
2. Khách chọn model. Tính `aspectRatio = nearestAspectRatio(face.widthMm, face.heightMm, model.aspectRatios)`.
3. Nút hiện "Tạo · {model.xu × numImages} xu". Khóa nút khi `balance` nhỏ hơn số đó.
4. Khi bấm: tạo `clientRequestId = crypto.randomUUID()` (trang http không phải localhost thì dùng fallback như `AiImagePanel`) và gửi `POST /ai/images`.
5. Nhận 202: cập nhật số dư ngay bằng `balance` trong response, rồi poll `GET /ai/images/jobs/:id` mỗi 2 giây. Mascot Gói ở trạng thái `delivery`.
6. Khi `COMPLETED`: hiện lưới `outputs`, mascot `celebration`, làm mới thư viện ảnh.
7. Khi `FAILED`: hiện `job.error` và làm mới số dư (`/billing/me`), vì xu đã được hoàn.
8. Gặp lỗi mạng khi gửi: gửi lại với **cùng** `clientRequestId`. Khách không bị trừ hai lần.

### 6.2 Đặt ảnh lên mặt hộp

- `output.url` là ảnh upload hợp lệ của chính người dùng (StoredFile purpose `IMAGE`). Canvas chấp nhận và lưu như ảnh upload thường.
- Tính DPI: `dpi = width_px / width_mm × 25.4`.
  - FitCheck cảnh báo khi dưới 300 DPI và chặn khi dưới 150 DPI.
  - Panel gợi ý "Phóng to" khi dưới 200 DPI.
- SVG (`output: "vector"`) không có `width`/`height`, in nét ở mọi cỡ. Hiện tại SVG được đặt như phần tử `logo`.
- Ảnh đã nằm trên một thiết kế đã lưu thì không bị xóa sau 30 ngày.
- Code tham khảo: `handlePlaceAiImage` trong `fe/src/views/editor/studio/StudioWorkspace.tsx`.

### 6.3 Công cụ ảnh

`POST /ai/images/:outputId/upscale|remove-bg|vectorize`, rồi theo dõi job như mục 6.1. Kết quả là ảnh mới trong thư viện. Giá lấy từ `catalog.tools`.

### 6.4 Nạp xu

`CheckoutDialog` với `purpose: "XU_500" | "XU_1050" | "XU_2200"`, giá lấy từ `XU_PACKS`. Sau khi thanh toán xác nhận, invalidate `queryKeys.billing`.

### 6.5 Cache và invalidate (React Query)

Query key mới trong `fe/src/hooks/data/queryKeys.ts`: `aiImageCatalog`, `aiImages`, `xuHistory`, `xuReport(month)`.

| Sự kiện | Cần invalidate |
| :- | :- |
| Tạo ảnh hoặc chạy công cụ (202) | `billing`, `aiUsage` (hoặc dùng luôn `balance` trong response) |
| Job `COMPLETED` | `aiImages` |
| Job `FAILED` | `billing`, `aiUsage`, `xuHistory` |
| Tạo hoa văn | `billing`, `aiUsage` |
| Nạp xu thành công | `billing`, `xuHistory` |

## 7. Thay đổi phá vỡ tương thích (breaking changes)

| Chỗ | Trước | Sau |
| :- | :- | :- |
| `GET /ai/usage` | `{ tier, used, limit, aiEnabled, budgetReached }` | `{ aiEnabled, budgetReached, patternCost, xu }` |
| `POST /ai/pattern` → `usage` | `{ used, limit }` | `{ charged, balance }` |
| `POST /ai/pattern` với `premium` trên gói Free | 403 `PLAN_FEATURE_REQUIRED` | Chạy được, trừ 65 xu, hoặc 402 nếu không đủ |
| Giới hạn lượt AI mỗi ngày | Free 10 / Lượt xuất 25 / Pro 50 / Business 300 | Bỏ. Chỉ còn số dư xu và throttle 5 request/phút. |
| `fe/src/api/ai` | Nuốt lỗi, trả kết quả giả `used: 12, limit: 100` | Lỗi được ném ra cho nơi gọi |
| `PLANS[tier].aiPatternsPerDay` (`fe/src/features/pricing/plans.ts`) | Số lượt mỗi ngày | Bỏ, thay bằng `xuPerPeriod` |
| `INSUFFICIENT_CREDITS` | Chỉ cho lượt xuất | Thêm `kind` và `cost`, nên kiểm `kind` trước khi hiện câu |

Trong repo đã sửa hết các chỗ dùng cũ: dashboard `UsageTiles`, `demoData`, thông báo, trang checkout, trang giá, bài hỗ trợ. Nếu nhánh FE khác còn dùng các trường cũ thì sẽ lỗi typecheck khi merge.

## 8. Giao diện đã làm sẵn

Do phiên backend làm để kiểm luồng đầu cuối. Bên FE có thể chỉnh lại thiết kế, chữ, bố cục.

| Màn hình | File | Nội dung |
| :- | :- | :- |
| Studio: công cụ "Ảnh AI" (phím I) | `fe/src/features/studio/components/StudioToolDock.tsx`, `fe/src/views/editor/studio/StudioWorkspace.tsx` | Mở tab "Ảnh AI" trong bảng thuộc tính. `handlePlaceAiImage` đặt ảnh vào vùng an toàn. |
| Panel Ảnh AI | `fe/src/features/studio/components/ai-image/AiImagePanel.tsx` | Prompt, thẻ model kèm giá, tỉ lệ theo mặt, 1–4 ảnh, công tắc chữ, nút "Tạo · N xu", poll, lưới kết quả, "Dùng cho <mặt>", menu công cụ, thư viện, chip số dư, mascot |
| Panel hoa văn AI | `fe/src/features/studio/components/ai-pattern/AiPatternPanel.tsx` | Chọn fast/premium kèm giá xu. Thay dòng "Còn N/M lượt". |
| Ví xu ở trang Thanh toán | `fe/src/views/dashboard/billing/XuWalletPanel.tsx`, `index.tsx` | Số dư, 3 gói nạp, danh sách lô, lịch sử có "Xem thêm", dòng đã hoàn bị gạch ngang |
| Trang giá | `fe/src/components/pricing/XuWrapSection.tsx`, `content.ts`, `fe/src/features/pricing/plans.ts` | Xu mỗi gói, bảng "1.000 xu làm được gì", gói nạp |
| Admin | `fe/src/views/admin/xu/index.tsx`, `fe/src/app/admin/xu/page.tsx`, `AdminShell.tsx` | Báo cáo xu theo tháng, menu "Xu Wrap" |
| Dashboard | `fe/src/features/dashboard/components/UsageTiles.tsx` | Ô số dư xu thay ô lượt AI |
| Lớp API | `fe/src/api/ai/index.ts`, `fe/src/api/payments/index.ts`, `fe/src/types/api/index.ts`, `fe/src/services/api/index.ts`, `fe/src/hooks/data/queryKeys.ts` | Hàm gọi, kiểu, câu lỗi tiếng Việt, query key |

Đã kiểm:
- Trên trình duyệt với provider giả: tạo ảnh, đặt lên mặt, phóng to, hoàn xu, khóa nút khi thiếu xu.
- Ảnh chụp màn hình `npm --workspace=fe run shots` cỡ M và X+ cho studio, billing, pricing, `/admin/xu`.
- Ở 375 px, các tab của bảng thuộc tính đã đổi sang flex để 5 tab không tràn.

Chưa kiểm:
- Bấm "đã trả" trong dialog nạp xu, vì server dev không bật `PAYMENT_SIMULATION`. Luồng cộng xu đã có e2e ở backend.
- Rà soát accessibility đầy đủ (bàn phím, trình đọc màn hình) cho panel Ảnh AI.

## 9. Chạy và thử ở máy local

1. Hạ tầng: `docker compose up -d postgres redis seaweedfs storage-init`.
2. Migration: `npm --workspace=be run db:deploy`. Có 4 migration mới: `20261031000100` đến `20261031000400`.
3. Build shared: `npm --workspace=shared run build`.
4. `be/.env`: đặt `AI_IMAGE_PROVIDER=fake` để không tốn tiền. Provider giả vẽ ảnh gradient ngay trong worker.
5. Chạy **cả API và worker**. Thiếu worker thì job ảnh đứng ở `PENDING` mãi.
6. Mẹo thử với provider giả:
   - Prompt chứa `#fail`: nhà cung cấp lỗi cả hai lần thử, job FAILED, xu được hoàn (mất khoảng 5 giây vì lần thử lại).
   - Prompt chứa `#blocked`: nhà cung cấp từ chối nội dung, FAILED ngay, xu được hoàn.
   - Thêm xu cho tài khoản thử: `POST /api/admin/users/:id/credits` với `{ "kind": "XU", "quantity": 1000 }` bằng tài khoản admin.
   - Thử nạp xu: bật `PAYMENT_SIMULATION=true` để có nút giả lập trả tiền.
7. Không có `ANTHROPIC_API_KEY`: hoa văn luôn là thuật toán và miễn phí (`aiEnabled: false`). Prompt ảnh được gửi nguyên văn, không có bước dịch và kiểm duyệt, nên `PROMPT_REJECTED` không xuất hiện ở local.
8. Swagger: `http://localhost:8080/api/docs` (tag `ai`, `billing`, `payments`, `analytics`).

## 10. Việc còn mở và gợi ý

Phía backend:
- Chưa gọi fal thật lần nào. Giá đã đối chiếu qua bảng giá fal, riêng GPT Image 2 là ước tính theo token (docs/19 §3).
- Chưa merge, chưa deploy. Khi deploy cần `FAL_KEY` và các biến `AI_IMAGE_*` (docs/18).

Gợi ý cho FE (không bắt buộc):
- Chip số dư xu trên thanh điều hướng chung (hiện có trong studio và ô xu ở dashboard).
- Hiện "còn N ngày" trên ảnh trong thư viện, dựa vào `keepUntil`.
- Hỏi xác nhận trước các thao tác đắt (ví dụ trên 100 xu, hoặc Nano Banana Pro × 4 = 480 xu).
- Khi 402, mở thẳng `CheckoutDialog` với gói nạp nhỏ nhất đủ bù phần thiếu.
- Trang điều khoản: ghi rõ xu chỉ dùng cho dịch vụ WrapFit, không đổi ra tiền, không chuyển cho người khác (docs/19, phần rủi ro pháp lý).

Nếu FE cần backend thêm hoặc đổi gì, hãy ghi vào docs/19 §7 hoặc báo backend. Ví dụ: trường mới trong `AiImageOutput`, đổi trần `numImages`, endpoint xóa ảnh khỏi thư viện (hiện **chưa có**).

## 11. Checklist trước khi merge (phía FE)

- [ ] `npm --workspace=shared run build` rồi `npx tsc --noEmit` trong `fe/` không lỗi.
- [ ] Không còn chỗ nào dùng `aiPatternsPerDay`, `usage.used` hoặc `usage.limit`.
- [ ] Mọi giá xu lấy từ API hoặc `@wrapfit/shared`, không chép tay.
- [ ] Nút tạo ảnh gửi `clientRequestId` mới cho mỗi cú bấm và dùng lại giá trị đó khi gửi lại.
- [ ] Xử lý đủ 402, 422, 429 (có và không có `code`), 503, 403, và `job.status = "FAILED"`.
- [ ] Số dư được làm mới sau khi job FAILED (xu được hoàn).
- [ ] Panel Ảnh AI và ví xu dùng được ở 375 px, đủ thao tác bằng bàn phím, có focus rõ ràng (WCAG 2.2 AA, docs/15).

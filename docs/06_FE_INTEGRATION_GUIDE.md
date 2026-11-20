# 06 — Hướng dẫn tích hợp Frontend ↔ Backend

> **Dành cho**: team Frontend (Next.js) khi dựng lại FE.
> **Khớp với**: nhánh `develop`, migration mới nhất `20261118000200_export_job_design`. Ngày cập nhật: 2026-11-19.
> **Nguồn sự thật khi có mâu thuẫn**: Swagger `http://localhost:8080/api/docs` (sinh từ code đang chạy), sau đó là
> [`03_API_DESIGN.md`](03_API_DESIGN.md). Tài liệu này giải thích *cách dùng* các API đó cho đúng.

Mục lục: [1. Kết nối](#1-kết-nối-và-phiên-đăng-nhập) · [2. Lỗi](#2-định-dạng-lỗi-và-mã-lỗi) ·
[3. Tài khoản](#3-tài-khoản-đăng-ký-xác-minh-đăng-nhập-mật-khẩu) · [4. Upload](#4-upload-file-và-quy-tắc-url-ảnh) ·
[5. Editor](#5-dự-án-và-editor) · [6. Phiên bản](#6-mốc-phiên-bản-snapshots) · [7. Đặt in và xuất file](#7-đặt-in-thanh-toán-và-xuất-file-in) ·
[8. Chia sẻ](#8-chia-sẻ-remix-thả-tim) · [9. Thư viện mẫu](#9-thư-viện-mẫu) · [10. Mở hộp](#10-mở-hộp-3d-qua-qr) ·
[11. AI](#11-ai-xu-wrap-ảnh-ai-và-hoa-văn) · [12. Hồ sơ](#12-hồ-sơ-brand-kit-bộ-sưu-tập) ·
[13. Lệch cũ (đã sửa)](#13-những-chỗ-apiclient-cũ-lệch-backend-đã-sửa) · [14. Kiểu dữ liệu](#14-kiểu-dữ-liệu-typescript) ·
[15. Chạy local](#15-chạy-và-kiểm-thử-local) · [16. Danh mục endpoint](#16-danh-mục-đầy-đủ-endpoint-đối-chiếu-với-code)

---

## 1. Kết nối và phiên đăng nhập

- **Base URL**: `NEXT_PUBLIC_API_URL` (local `http://localhost:8080/api`; production `https://<domain>/api`, cùng domain
  với FE qua Caddy).
- **Mọi request phải có `credentials: 'include'`**: phiên đăng nhập nằm trong 2 cookie HttpOnly, JavaScript không đọc
  được và không bao giờ thấy token trong body.

| Cookie | Path | Thời hạn | Vai trò |
|---|---|---|---|
| `wf_access` | `/api` | 15 phút (`expiresIn: 900`) | Gửi kèm mọi request API và Socket.IO (`/api/socket.io`) |
| `wf_refresh` | `/api/auth` | 7 ngày | Chỉ gửi tới `/api/auth/*`, dùng để xin `wf_access` mới |

- Backend chỉ nhận request có `Origin` nằm trong `CORS_ORIGINS` (local: `http://localhost:3000`).
- **Làm mới phiên**: khi một request trả `401`, gọi `POST /api/auth/refresh` (không body) **một lần**, thành công thì
  gửi lại request cũ; refresh cũng `401` → chuyển về `/login`. Chỉ cho **một** refresh chạy cùng lúc (nhiều tab / nhiều
  request song song cùng chờ một promise). Backend chấp nhận 2 tab refresh gần như đồng thời (30 giây), nhưng dùng lại
  refresh token cũ sau đó bị coi là bị đánh cắp và **đăng xuất mọi thiết bị**.
- **Chỉ `401` của refresh mới là hết phiên.** Refresh `429` (bị chặn trước khi token được xem: chờ `Retry-After`, tối đa
  10 giây, rồi thử lại **một** lần), `5xx` hay mất mạng không nói gì về phiên: báo lỗi đó, **không** đăng xuất. Không thử
  lại refresh khi mất mạng (server có thể đã đổi token). Giới hạn của refresh tính **theo phiên** (30 / phút cho một
  cookie `wf_refresh`), không theo IP, nên nhiều người sau một IP (NAT văn phòng, mạng di động) không chia nhau; request
  không có cookie (khách) 300 / phút / IP. Code thật: `fe/src/services/api/index.ts`.

```ts
let refreshing: Promise<boolean> | null = null;

async function api<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init.headers },
  });
  if (res.status === 401 && retry && !path.startsWith('/auth/')) {
    // Rút gọn: bản đầy đủ chờ Retry-After khi refresh trả 429 và chỉ đăng xuất khi refresh trả 401 (xem trên).
    refreshing ??= fetch(`${API_BASE}/auth/refresh`, { method: 'POST', credentials: 'include' })
      .then((r) => r.ok)
      .finally(() => (refreshing = null));
    if (await refreshing) return api<T>(path, init, false);
    window.location.assign('/login');
  }
  if (!res.ok) throw new ApiError(res.status, await res.json().catch(() => null));
  return (res.status === 204 ? undefined : await res.json()) as T;
}
```

- Biết ai đang đăng nhập: `GET /api/auth/me` (hoặc `/api/users/me`) → `SafeUser` (mục 14). `401` = chưa đăng nhập.
- Đăng xuất: `POST /api/auth/logout` (204, xóa cookie). Đăng xuất mọi thiết bị: `POST /api/auth/logout-all` (có hiệu
  lực ngay: các thiết bị khác nhận `401`, refresh cũng `401`, FE coi là phiên hết hạn).

## 2. Định dạng lỗi và mã lỗi

Mọi lỗi có cùng khung; một số lỗi thêm `code` ổn định (FE **rẽ nhánh theo `code`**, không theo `message`) và trường
phụ (`currentVersion`, `fitCheck`):

```json
{ "statusCode": 409, "error": "Conflict", "message": "…", "code": "PROJECT_VERSION_CONFLICT", "currentVersion": 7,
  "path": "/api/projects/…", "requestId": "0b6f1c1e-…", "timestamp": "2026-10-07T09:00:00.000Z" }
```

- `message` có thể là **chuỗi hoặc mảng chuỗi** (lỗi validation `400` liệt kê từng trường).
- `requestId` (cũng là header `X-Request-Id`): hiển thị nhỏ trong thông báo lỗi để người dùng gửi kèm khi báo lỗi.

| HTTP | `code` | Khi nào | FE nên làm |
|---|---|---|---|
| 403 | `EMAIL_NOT_VERIFIED` | Đăng nhập đúng mật khẩu nhưng chưa xác minh email | Màn hình "Kiểm tra hộp thư" + nút gửi lại (mục 3.3) |
| 400 | `AUTH_TOKEN_INVALID` | Link email sai, hoặc đã bị link mới hơn thay thế | "Link không còn hiệu lực" + nút gửi email mới |
| 400 | `AUTH_TOKEN_EXPIRED` | Link email quá hạn (xác minh 24 giờ, mật khẩu 30 phút) | "Link đã hết hạn" + nút gửi email mới |
| 400 | `AUTH_TOKEN_CONSUMED` | Link đặt mật khẩu đã dùng rồi | "Link đã được dùng" + chuyển tới đăng nhập |
| 400 | `FILE_URL_NOT_ALLOWED` | URL ảnh không phải file upload lên WrapFit | Bắt người dùng upload (mục 4) |
| 400 | `FILE_NOT_OWNED` | File thuộc người khác | Bắt người dùng upload ảnh của chính họ |
| 409 | `PROJECT_VERSION_CONFLICT` | Lưu dự án từ bản cũ hơn bản trên server | Hỏi "Tải bản mới / Ghi đè" (mục 5.3) |
| 409 | `PROJECT_IN_ACTIVE_ORDER` | Xóa vĩnh viễn dự án mà một đơn in chưa gửi đi còn giữ | Hiện nguyên `message` (có mã đơn) (mục 5.4) |
| 422 | — (có `fitCheck`) | Xuất file in khi FitCheck còn lỗi | Mở bảng FitCheck với `fitCheck.violations` |
| 402 | `ORDER_PAYMENT_REQUIRED` | Xuất file khi phiên bản này chưa có đơn in đã trả | Dẫn tới giỏ in (mục 7.1) |
| 402 | `INSUFFICIENT_CREDITS` | Không đủ xu (`kind: "XU"`, có `balance`, `cost`) | "Cần N xu, bạn còn M xu" + nút "Nạp xu" (mục 11) |
| 400 | `EXPORT_PACK_DISCONTINUED` | Tạo thanh toán gói lượt xuất cũ | Không hiện gói này nữa |
| 403 | `SIMULATION_DEMO_ONLY` | Giả lập thanh toán VietQR khi máy chủ có tài khoản ngân hàng thật | Ẩn nút giả lập theo `billing.paymentSimulation` (mục 7.2) |
| 409 | `ORDER_NOT_PAYABLE` | Thanh toán đơn in đã hủy hoặc đã được trả | Tải lại đơn, báo đơn không còn chờ thanh toán |
| 409 | `PAYMENT_EXPIRED` | Xác nhận thanh toán đã hết hạn 15 phút | Cho tạo mã thanh toán mới |
| 409 | `DESIGN_CHANGED` | Duyệt in một phiên bản cũ qua link duyệt mẫu | Tải lại thiết kế rồi cho duyệt lại (mục 8.2) |
| 422 | `PROMPT_REJECTED` | Mô tả ảnh AI bị kiểm duyệt chặn (chưa trừ xu) | Hiện `message`, giữ mô tả để sửa |
| 429 | `AI_IMAGE_BUSY` | Đã có 3 job ảnh AI đang chạy | Hiện `message`, chờ một job xong |
| 503 | `AI_IMAGE_UNAVAILABLE` | Ảnh AI tắt hoặc cầu chì ngân sách đã chạm | Khóa nút tạo ảnh |
| 429 | — | Vượt giới hạn tần suất | Thông báo "thử lại sau ít phút", có thể đọc header `Retry-After` |
| 503 | — | Storage / hàng đợi chưa cấu hình hoặc đang lỗi | Thông báo tạm thời, cho thử lại |

Danh sách mã đầy đủ theo endpoint: [03 · mục 2](03_API_DESIGN.md#2-endpoints-đã-triển-khai). Hàm `errorMessage()` trong
`fe/src/services/api/index.ts` đổi các mã trên thành câu tiếng Việt.

Không có `code` → dùng `statusCode`: `400` hiển thị `message` cạnh form; `404` "không tìm thấy" (dự án của người khác
cũng trả `404`); `409` khác (vd. sửa dự án trong thùng rác) hiển thị `message`.

## 3. Tài khoản: đăng ký, xác minh, đăng nhập, mật khẩu

**Quy tắc cốt lõi: chưa xác minh email thì không đăng nhập được.** Đăng ký không mở phiên.

### 3.1. Các trang FE cần có

| Route FE | Mục đích | Gọi API |
|---|---|---|
| `/register` | Form đăng ký | `POST /api/auth/register` |
| `/check-email?email=` | "Kiểm tra hộp thư" (sau đăng ký, hoặc khi login trả `EMAIL_NOT_VERIFIED`) | `POST /api/auth/verify-email/resend` |
| `/verify-email?token=` | Link trong email xác minh | `POST /api/auth/verify-email` |
| `/login` | Đăng nhập (mật khẩu + nút Google) | `POST /api/auth/login`, `GET /api/auth/google` |
| `/forgot-password` | Nhập email để nhận link đặt lại | `POST /api/auth/password/forgot` |
| `/reset-password?token=` | Link trong email "Đặt lại mật khẩu" | `POST /api/auth/password/reset` |
| `/complete-signup?token=` | Link trong email "Hoàn tất đăng ký" | `POST /api/auth/password/reset` (cùng API, có thể dùng chung component với `/reset-password`, chỉ khác tiêu đề) |

Ba route nhận `?token=` **phải có đúng tên như trên**: backend dựng link email theo `FRONTEND_URL` + các đường dẫn này.
Backend cũng chuyển hướng về `/login?error=google_auth_failed` hoặc `/login?error=google_account_rejected` khi đăng
nhập Google lỗi.

### 3.2. Đăng ký

```http
POST /api/auth/register
{ "email": "an@example.com", "password": "Passw0rd123", "fullName": "Nguyễn An" }

201 { "email": "an@example.com", "emailVerificationRequired": true }
```

- **Luôn `201` với đúng body này**, kể cả khi email đã có tài khoản: API không cho biết email nào đã đăng ký. Chỉ email
  gửi đi khác nhau (email mới → "Xác nhận email"; email chưa xác minh → "Hoàn tất đăng ký"; email đã có tài khoản →
  "Email của bạn đã có tài khoản"). Sau `201` luôn chuyển tới `/check-email?email=…`.
- **Không có `409`**, không đặt cookie. Đừng hiển thị "email đã tồn tại".
- Mật khẩu: 8–72 ký tự, có ít nhất 1 chữ và 1 số. `fullName` ≤ 100 ký tự. Email được chuyển chữ thường ở backend.
- Giới hạn 10 request / phút / IP cho các route đăng ký, đăng nhập, xác minh, đặt lại mật khẩu. `refresh` tính theo phiên
  (mục 1).

### 3.3. Kiểm tra hộp thư, gửi lại email

```http
POST /api/auth/verify-email/resend    { "email": "an@example.com" }      → 202 {}
```

- Luôn `202 {}` (không lộ email nào có tài khoản). Mỗi tài khoản tối đa 1 email / phút và 5 / ngày: vượt thì backend
  bỏ qua im lặng. FE nên khóa nút 60 giây sau mỗi lần bấm. Giới hạn route: 5 request / phút / IP.
- Gửi lại làm link cũ hết hiệu lực: nhắc người dùng mở **email mới nhất**.

### 3.4. Trang `/verify-email?token=`

```http
POST /api/auth/verify-email    { "token": "<giá trị ?token=>" }   → 200 { "verified": true }
```

- Gọi tự động khi trang mở. `200` → "Email đã được xác nhận" + nút tới `/login` (**không tự đăng nhập**).
- Mở lại cùng link lần hai vẫn `200`. Lỗi `AUTH_TOKEN_INVALID` / `AUTH_TOKEN_EXPIRED` → mục 2.
- **Nên làm (khi dựng FE)**: trang này hỏi thêm mật khẩu và gọi `login` ngay sau khi xác minh. Ngoài tiện lợi, việc
  này chặn trường hợp ai đó đăng ký bằng email của người khác rồi chủ hộp thư vô tình bấm link xác nhận. Cần backend
  hỗ trợ thêm nếu muốn bắt buộc; báo team BE khi làm.

### 3.5. Đăng nhập

```http
POST /api/auth/login   { "email": "an@example.com", "password": "Passw0rd123" }
200 { "user": SafeUser, "expiresIn": 900 }      + Set-Cookie wf_access, wf_refresh
401 Invalid credentials                          (sai email / mật khẩu / tài khoản bị khóa / tài khoản chỉ có Google)
403 { "code": "EMAIL_NOT_VERIFIED" }             → /check-email?email=…
```

- Sau `200`, đi tới `?redirect=` nếu có (chỉ nhận đường dẫn nội bộ bắt đầu bằng `/`), không thì `/dashboard`.
- **Google**: điều hướng trình duyệt (không dùng `fetch`) tới
  `${API_BASE}/auth/google?redirect=/duong-dan-sau-khi-dang-nhap`. Backend đặt cookie rồi chuyển về
  `FRONTEND_URL + redirect`. Tài khoản Google luôn coi như đã xác minh email.

### 3.6. Quên mật khẩu, đặt lại, hoàn tất đăng ký

```http
POST /api/auth/password/forgot   { "email": "an@example.com" }                       → 202 {}
POST /api/auth/password/reset    { "token": "<?token=>", "password": "NewPassw0rd1" } → 200 {}
```

- `forgot` luôn `202` (không lộ email). Link có hạn **30 phút**, dùng 1 lần. Tài khoản chỉ có Google cũng dùng được để
  đặt mật khẩu lần đầu.
- `reset` dùng cho **cả** `/reset-password` và `/complete-signup`. Thành công thì **mọi phiên bị đăng xuất ngay** (thiết
  bị khác nhận `401` ở request kế tiếp, không chờ access token hết hạn) và cookie bị xóa → chuyển tới `/login` với thông
  báo "Đặt mật khẩu thành công, hãy đăng nhập". Email cũng được xác minh luôn.
- Mật khẩu mới cùng quy tắc với đăng ký (lỗi `400` không có `code`, link vẫn còn dùng được).

### 3.7. Các quy tắc an toàn FE cần biết

- **Đăng nhập Google vào email đã có tài khoản mật khẩu chưa xác minh**: backend xóa mật khẩu đó và thu hồi mọi phiên
  (chặn trường hợp ai đó đăng ký trước bằng email của người khác). Chủ email đăng nhập bằng Google, hoặc đặt lại mật
  khẩu bằng "Quên mật khẩu". FE không cần xử lý riêng, chỉ cần không hứa "mật khẩu cũ vẫn dùng được".
- **Tài khoản mật khẩu chưa xác minh**, không có dự án và file nào, bị xóa sau 7 ngày. Trang `/check-email` nên nhắc
  người dùng xác nhận sớm.
- **Mỗi mục đích chỉ có một link còn hiệu lực**: gửi lại email xác minh hay đặt lại mật khẩu làm link cũ hết hiệu lực
  (`AUTH_TOKEN_INVALID`). Thông báo lỗi nên gợi ý mở email mới nhất.
- **Tài khoản bị khóa hoặc bị ẩn danh hóa** (admin xóa một tài khoản có lịch sử tiền) không đăng nhập, refresh hay đặt lại
  mật khẩu được nữa; FE nhận `401` như hết phiên.

## 4. Upload file và quy tắc URL ảnh

Backend **không nhận byte file**: FE xin URL ký sẵn rồi `PUT` thẳng lên bucket (Cloudflare R2; local là SeaweedFS).

```ts
const ticket = await api<PresignedUpload>('/storage/presigned-upload', {
  method: 'POST',
  body: JSON.stringify({ purpose: 'IMAGE', contentType: file.type, size: file.size, projectId }),
}); // 200
const put = await fetch(ticket.uploadUrl, { method: ticket.method, headers: ticket.headers, body: file }); // KHÔNG credentials
if (!put.ok) throw new Error('Upload failed');
// ticket.fileUrl: URL công khai, dùng cho canvas / thumbnailUrl / avatarUrl / logoUrl
```

| `purpose` | Định dạng | Tối đa | Dùng cho |
|---|---|---|---|
| `LOGO` | PNG, JPEG, WebP, SVG, PDF | 15 MB | Logo trên canvas, logo Brand Kit |
| `IMAGE` | PNG, JPEG, WebP | 15 MB | Ảnh trên canvas (cũng nhận làm thumbnail / avatar / logo) |
| `THUMBNAIL` | PNG, JPEG, WebP | 2 MB | Ảnh xem trước dự án, ảnh xem trước mốc phiên bản |
| `AVATAR` | PNG, JPEG, WebP | 2 MB | Ảnh đại diện |
| `FONT` | TTF, OTF, WOFF, WOFF2 | 10 MB | Phông người dùng tải lên cho thiết kế (`canvasState.customFonts`, `style.fontUrl`) |

- `PUT` phải gửi **đúng** `headers` nhận được và đúng file đã khai báo (`Content-Type`, dung lượng `size`): khác đi thì
  bucket trả `403`. URL ký hết hạn sau 5 phút. `projectId` (tùy chọn) gắn file vào dự án: file bị xóa cùng dự án.
- Lỗi xin URL: sai định dạng `400`, quá dung lượng `413`, hết hạn mức `403` (FREE 100 MB, PAY_PER_EXPORT 500 MB,
  STARTER 2 GB, PRO_BUSINESS 20 GB; xem `GET /api/storage/usage`), chưa cấu hình storage `503`.
- **Phông tải lên**: sau khi `PUT`, gọi `POST /api/storage/fonts/inspect { url: fileUrl }` để lấy tên họ phông. Phông
  không đọc được → `422 FONT_UNREADABLE`; thiếu chữ tiếng Việt → `422 FONT_NO_VIETNAMESE` kèm các chữ thiếu (chữ thiếu sẽ
  in ra ô vuông). Studio bắt người dùng tick xác nhận có quyền dùng phông trước khi tải.
- **Quy tắc URL ảnh khi lưu** (backend kiểm tra):
  - `thumbnailUrl`, `previewUrl`, `avatarUrl`, `brandKit.logoUrl` phải là `fileUrl` của **chính người dùng** upload →
    nếu không: `FILE_URL_NOT_ALLOWED` / `FILE_NOT_OWNED`. Không dán URL ảnh trang khác, không gửi data URL.
  - Ảnh `logo` / `image` / `pattern` trong canvas: được thêm ảnh của mình; ảnh mà dự án **đã có sẵn** (vd. ảnh của tác
    giả gốc trong bản Remix) được giữ nguyên khi lưu. Thêm ảnh của người khác → `FILE_NOT_OWNED`.
  - Đường dẫn tĩnh của FE (`/branding/...`, sticker trong `public/`) vẫn lưu được, nhưng **không được nhúng vào file
    in** (chỉ ảnh upload lên WrapFit được in). Data URL (`data:image/...`) không dùng được: `content` tối đa 5000 ký tự.
- Backend lưu key và luôn trả lại URL; FE chỉ làm việc với URL như trước.

## 5. Dự án và editor

### 5.1. Tạo, liệt kê, mở

```http
POST /api/projects   { "templateId": "tuck-top", "title": "Hộp nến", "dimensions": { "length": 120, "width": 80, "height": 60 },
                       "materialSpec"?: {...}, "canvasState"?: {...}, "collectionId"?: "<uuid>", "tags"?: ["tet"],
                       "designTemplateId"?: "<uuid>", "occasion"?: "TET", "industry"?: "CANDLES" }   → 201 ProjectDetail
GET  /api/projects?status=ACTIVE&templateId=&collectionId=<uuid>|none&q=&sortBy=updatedAt&order=desc&page=1&limit=20
     → { "items": ProjectSummary[], "meta": { "total", "page", "limit", "totalPages" } }
GET  /api/projects/:id   → ProjectDetail
```

- `templateId`: id một cấu trúc hộp trong `GET /api/templates/structures`. MVP ban đầu có 4 cấu trúc (`tuck-top`,
  `sleeve-drawer`, `lid-base`, `pillow`); seed hiện có 11 cấu trúc trong DB (thêm `mailer`, `gable`, `cup-carrier`,
  `insert`, `hang-tag`, `folded-card`, `belly-band`). Không chép danh sách vào FE: đọc từ API, kèm `dimensionLimits` để
  validate form trước khi gửi.
- `paperThickness` bỏ trống → lấy `materialSpec.caliper`. Mặc định `materialSpec = { type: "ivory", gsm: 300,
  caliper: 0.42, finish: "matte" }` (độ dày = GSM × 0,0014, `caliperOf` của shared), `canvasState = { elements: [] }`.
- Ngoài min / max từng kích thước, mỗi cấu trúc có **quy tắc tỉ lệ** (`dimensionRuleErrors` của shared; API trả 400 với
  câu tiếng Anh, editor hiện câu tiếng Việt `vi`): hộp gối dày tối đa bằng nửa chiều rộng.
- Tìm kiếm dùng tham số **`q`** (tiêu đề hoặc đúng 1 tag), không phải `search`. Danh sách không có `canvasState`.
- **`formulaVersion`** (trong `ProjectDetail`): phiên bản công thức dieline mà dự án được chốt khi tạo. Editor phải
  dựng dieline / 3D / FitCheck bằng `generateDielinePieces(templateId, dimensions, formulaVersion)` của
  `@wrapfit/shared`, **không** gọi thẳng `generateTuckTopDieline`…, để hình trên màn hình khớp đúng file in.
  Các phiên bản (`shared/src/parametric/registry.ts`, tóm tắt tiếng Việt cho studio: `FORMULA_CHANGES`): **1** bản
  đầu (hộp nắp gài: nắp trên đè mặt sau khi W > H; cả 4 cấu trúc chưa có nét cắt); **2** (2026-10-11) hộp nắp gài có
  nắp và đáy gắn vào mặt sau, tai gài, tai chống bụi, tai dán và nét cắt, 3 cấu trúc còn lại giống bản 1; **3**
  (2026-10-12, dự án mới) cả 4 cấu trúc có đủ nét cắt, khay / đáy / nắp có tai dán 4 góc, vỏ bao diêm quấn quanh khay
  theo chiều rộng (khay rút theo chiều dài), bề rộng mặt hộp gối tính theo cung, mọi công thức cộng bù độ dày giấy
  (quy ước dưới đây), mỗi mặt có bản lề `fold` để dựng 3D. Id các mặt giữ nguyên qua các phiên bản; kích thước mặt
  đổi vài phần mm (bù `t`) hoặc nhiều hơn (mặt hộp gối, hai mặt hông vỏ bao diêm nay là L × H). Dự án cũ giữ phiên
  bản của nó; cách đưa lên bản mới ở mục 6.1.
- **Quy ước kích thước** (từ công thức bản 3): `length × width × height` là **lòng trong** của hộp, món quà phải vừa;
  `paperThickness` (`t`, mm) ≈ GSM × 0,0014 (300 GSM ≈ 0,42 mm). Nét gấp nằm giữa bề dày giấy, nên mặt nào phủ một
  kích thước lòng trong giữa hai thành thì rộng thêm `t`; hộp âm dương và khay bao diêm còn cộng 2t theo chiều dài cho
  tai dán nằm trong thành, nắp / vỏ rộng hơn mặt ngoài của đáy / khay 1 mm. Chi tiết từng cấu trúc: docs/12 §2.

### 5.2. `canvasState`

```ts
{ schemaVersion?: number;               // hiện là 2; normalizeCanvas() của shared nâng dữ liệu cũ khi mở
  elements: CanvasElement[];            // tối đa 300 phần tử; thứ tự mảng = thứ tự lớp
  customFonts?: { family: string; url: string }[];   // phông tải lên của thiết kế (mục 4)
  backgroundPattern?: string | null;    // id preset [a-z0-9_-]{1,40}, không phải SVG / CSS
  backgroundTheme?: string | null;
  materialTheme?: string | null;
  finishes?: string[]; }                // hoàn thiện của xưởng in, dùng cho báo giá
```

- `CanvasElement`: `id` ≤ 64, `type` `text|logo|image|pattern|barcode|shape`, `panelId` (`panel_front` hoặc `front`),
  `x, y, width, height, rotation` (mm, so với mặt hộp), `content` (chữ, hoặc URL ảnh — mục 4) ≤ 5000,
  `style?` (`fontFamily` ≤ 100, `fontUrl` của phông tải lên, `fontSize` 1–1000, `color` / `fillColor`, `opacity` 0–1, cùng
  các thuộc tính chữ, viền, màu chuyển, bộ lọc ảnh, đổ bóng), `dpi?` 1–2400, và các trường tùy chọn của editor: `side`
  (in ngoài / trong), `role` (`artwork` / `background`), `locked`, `hidden`, `groupId`, `flipX`, `flipY`, `finish`,
  `anchor`, `crop`, `mask`, `fit`, `shape`. Danh sách đầy đủ và ý nghĩa: [02 · mục 3](02_DATABASE_DESIGN.md#3-cấu-trúc-canvas_state).
- Mọi trường mới đều tùy chọn: thiếu thì backend và bộ dựng file in dùng mặc định cũ.
- Body request tối đa 1 MB.

### 5.3. Lưu (autosave) và xung đột giữa hai tab

```http
PATCH /api/projects/:id   { "version": 7, "canvasState": {...}, "dimensions"?: {...}, "title"?: "...", "thumbnailUrl"?: "...|null", ... }
200 ProjectDetail (version: 8)
409 { "code": "PROJECT_VERSION_CONFLICT", "currentVersion": 9 }
```

- **Luôn gửi `version`** đang giữ; lấy `version` từ response để lần lưu sau dùng. Bị `409` nghĩa là tab / thiết bị khác
  vừa lưu: hỏi người dùng *Tải bản mới* (GET lại) hoặc *Ghi đè* (gửi lại với `version: currentVersion`).
- **`version` chỉ tăng khi nội dung thiết kế đổi**: `canvasState`, `dimensions` hoặc `materialSpec` khác bản đã lưu. Đổi
  tên, tag, thumbnail, thư mục trả lại `version` cũ. FE không được giả định `version` luôn tăng sau mỗi `PATCH`: luôn đọc
  `version` từ response. Quyền xuất file in (mục 7) và trạng thái "Đã duyệt in" (mục 8.2) gắn với `version`, nên đổi tên
  không làm mất chúng; sửa thiết kế thì có.
- Chỉ gửi trường thay đổi; `null` xóa `collectionId`, `thumbnailUrl`, `occasion`, `industry`. Không đổi được
  `templateId`. Dự án trong thùng rác: `409` cho mọi thao tác sửa.
- Mỗi lần đổi `canvasState` / `dimensions`, server chạy lại FitCheck và trả `fitcheckState`
  (`{ isValidForProduction, score, violations[] }`) + `fitcheckScore`: hiển thị theo bản của server.
- FitCheck là **một hàm** của `@wrapfit/shared` ([validator](../shared/src/fitcheck/validator.ts)), editor và server
  cùng gọi. Thông số in lấy từ [prepress](../shared/src/print/prepress.ts). Các quy tắc chính (`code`, mức):

  | Quy tắc | `code` | Mức |
  |---|---|---|
  | Chữ / logo / ảnh (phần tử `artwork`) phải cách **nét cắt ≥ 5 mm** và cách **nếp gấp ≥ 3 mm**, tính theo khung đã xoay | `CUT_OVERLAP` (mép gần nhất là nét cắt) / `CREASE_OVERLAP` (nếp gấp) | Thiếu lề: `warning`. Cách **dưới 1 mm** hoặc tràn ra ngoài mặt: `error` |
  | Nền (`role: "background"`, mặc định với hoa văn) chạm nét cắt phải **tràn ≥ 2 mm** ra ngoài, hoặc lùi vào trong ≥ 3 mm | `BLEED_INSUFFICIENT` | `warning` |
  | Ảnh raster có `dpi`, tính ở kích thước in: từ 150 đến dưới **300 DPI** | `LOW_DPI` | `warning` |
  | Ảnh raster **dưới 150 DPI** | `LOW_DPI` | `error` |
  | Mực lấn lên tai dán | `GLUE_CONTAMINATED` | `error` |
  | Ảnh kho đứng một mình, không có nội dung khác | `STOCK_PHOTO_ALONE` | `error` |
  | Phần tử trên mặt không có trong hộp (không được in) | `NO_PANEL` | `warning` |
  | Phôi lớn hơn khổ B1 1020 × 720 mm | `DIMENSION_OUT_OF_BOUNDS` | `warning` |

  Ngoài ra còn các cảnh báo về nét quá mảnh, chữ quá nhỏ, chữ nằm trên nếp gấp, tương phản thấp, màu ngoài gam in, mã
  vạch khó đọc, hình nằm dưới cửa sổ / lỗ khoét. Điểm = 100 − 30 × lỗi − 10 × cảnh báo. Còn lỗi mức `error` thì xuất file
  trả `422`; cảnh báo không chặn xuất. Mốc ≥ 90 điểm chỉ dùng khi đưa mẫu vào thư viện cộng đồng. Sửa tự động:
  `autoFixElements`.
- Thumbnail: render canvas thành ảnh → upload `purpose: THUMBNAIL` (+ `projectId`) → `PATCH { thumbnailUrl }`.

#### 5.3.1. Đồng bộ giữa hai tab

Khi người dùng mở cùng một dự án ở hai tab (hoặc hai thiết bị), tab không sửa sẽ tự tải bản mới:

1. Mỗi tab có một id riêng (`TAB_ID` trong `fe/src/services/realtime.ts`) và gửi kèm header `X-WF-Tab` ở mọi
   `PATCH /api/projects/:id` (`fe/src/api/projects/index.ts`).
2. Sau một lần lưu có đổi trường khác `version` và `thumbnailUrl`, API đẩy sự kiện WebSocket `project.saved`
   `{ projectId, version, updatedAt, tabId }` tới mọi tab đang mở của chủ dự án (mục 16, WebSocket).
3. [`useProjectSync`](../fe/src/features/studio/hooks/useProjectSync.ts) bỏ qua sự kiện của chính tab mình (`tabId`
   trùng) và sự kiện có `version` cũ hơn bản đang giữ. Với các sự kiện khác, hook chờ 1,5 giây cho tab kia ngừng lưu
   (tab đang sửa lưu khoảng mỗi giây), và chờ tới khi tab được hiện lại nếu đang ẩn. Sau đó:
   - tab không có thay đổi chưa lưu → tải lại dự án (`onOtherTabSave`, dựng lại editor);
   - tab có thay đổi chưa lưu hoặc đang lưu → hiện banner xung đột, như khi nhận `409 PROJECT_VERSION_CONFLICT`.
4. Không có WebSocket thì hai tab vẫn an toàn: lần lưu sau của tab cũ nhận `409` và hỏi người dùng như trên.

FitCheck hiển thị luôn theo bản của server sau mỗi lần lưu, nên tab vừa tải lại cũng thấy đúng kết quả FitCheck mới.

### 5.4. Vòng đời

```http
PATCH  /api/projects/:id/status      { "status": "ARCHIVED" | "DELETED" | "ACTIVE" }
DELETE /api/projects/:id             (chỉ khi đang DELETED, nếu không 409)   → 204
POST   /api/projects/:id/duplicate   → 201 ProjectDetail  ("[Bản sao] <tên>", không chép thumbnail)
```

- "Xóa" trên Dashboard = chuyển vào thùng rác (`status: DELETED`); "Xóa vĩnh viễn" chỉ có trong thùng rác. Thùng rác tự
  xóa sau 30 ngày: hạn = `deletedAt + 30 ngày` (FE tự tính để hiển thị).
- **Giới hạn xóa vĩnh viễn**: dự án nằm trong một đơn in `PENDING_PAYMENT`, `PAID` hoặc `IN_PRODUCTION` không xóa vĩnh
  viễn được. `DELETE` trả `409 PROJECT_IN_ACTIVE_ORDER`; `message` là câu tiếng Việt có mã đơn, FE hiện nguyên văn ở toast
  (không thay bằng câu chung). Tác vụ dọn thùng rác cũng bỏ qua dự án đó, nên dự án có thể nằm trong thùng rác quá 30 ngày
  cho tới khi đơn đã gửi đi hoặc đã hủy. Chuyển vào thùng rác và khôi phục vẫn làm được bình thường.
- Khôi phục khỏi thùng rác (`status: ACTIVE`) không đổi `version`, nên quyền xuất file của phiên bản đó còn nguyên.

## 6. Mốc phiên bản (snapshots)

```http
GET    /api/projects/:id/snapshots                      → SnapshotSummary[] (mới nhất trước)
POST   /api/projects/:id/snapshots   { "name": "Mốc 1", "previewUrl"?: "<fileUrl THUMBNAIL/IMAGE>" } → 201 SnapshotSummary
POST   /api/projects/:id/snapshots/:snapshotId/restore → 200 { "project": ProjectDetail, "backup": SnapshotSummary }
DELETE /api/projects/:id/snapshots/:snapshotId         → 204
```

- Tối đa 50 mốc thủ công (`409`). Mốc tự động (mỗi lần xuất in, mỗi lần khôi phục) không tính, backend giữ 20 mốc tự
  động mới nhất.
- Khôi phục trả `backup` (trạng thái ngay trước khi khôi phục): nút "Hoàn tác" = khôi phục `backup.id`. Sau khôi phục
  `project.version` tăng: thay dữ liệu editor bằng `project` trả về.
- `SnapshotSummary.formulaVersion`: phiên bản công thức của dự án lúc lưu mốc (`null` với mốc lưu trước 2026-10-12).
  Khôi phục mốc có số này thì dự án về đúng phiên bản đó.

### 6.1. Cập nhật công thức dieline (từ 2026-10-12)

```http
POST /api/projects/:id/formula-upgrade   { "version": 7 }   → 200 { "project": ProjectDetail, "backup": SnapshotSummary | null }
```

- `ProjectDetail.latestFormulaVersion` > `formulaVersion` → studio hiện banner "Phôi của dự án dùng công thức cũ (bản X)"
  với tóm tắt thay đổi (`FORMULA_CHANGES` của shared) và nút mở hộp thoại xác nhận
  (`features/studio/components/formula/FormulaUpgrade.tsx`). Xác nhận → gọi API qua `useProjectSync().replace` (gửi hết
  thay đổi đang chờ, truyền `version` vừa lưu) → dựng lại editor bằng `project` → thanh "Phôi đã lên công thức bản Y ·
  Hoàn tác" (khôi phục `backup.id`). Dự án trong thùng rác không hiện banner.
- Backend lưu mốc tự động "Trước khi cập nhật công thức (bản X → Y)" có `formulaVersion` X, đổi `formulaVersion`, chạy
  lại FitCheck, tăng `version`. `409` thùng rác, `409 PROJECT_VERSION_CONFLICT` khi `version` cũ, đã mới nhất →
  `backup: null`.
- Dự án **chưa từng xuất file in** được đưa lên bản mới bằng script `npm --workspace=be run db:upgrade-formulas`
  (be/README.md, mục triển khai); dự án đã xuất giữ bản cũ tới khi chủ dự án bấm cập nhật.

## 7. Đặt in, thanh toán và xuất file in

File in không cho tải miễn phí: nó mở khi **một đơn in đã trả tiền giữ đúng phiên bản thiết kế hiện tại** (hoặc khi một
lần mở khóa cũ của đúng phiên bản đó còn hạn). Pro, xu và lượt xuất còn dư không mở file in. Hợp đồng API:
[03 · Xuất file in](03_API_DESIGN.md#xuất-file-in), [03 · Gói, xu và thanh toán](03_API_DESIGN.md#gói-xu-và-thanh-toán),
[03 · Đơn in mẫu](03_API_DESIGN.md#đơn-in-mẫu).

### 7.1. Trình tự ở bước Đặt in

```http
GET  /api/projects/:id/exports/access   → { unlocked, unlockExpiresAt }
POST /api/orders/sample/bundle          { items: [{ projectId, quantity?, paperStock? }], recipientName, phone, shippingAddress, notes?, printShopId? }  → đơn PENDING_PAYMENT
POST /api/payments                      { purpose: "SAMPLE_ORDER", orderId, termsVersion }   → 201 PaymentView
GET  /api/payments/:id                  → hỏi mỗi 3 giây tới PAID
POST /api/projects/:id/exports          { fileType }   → 202 { jobId, status, fitCheck }
GET  /api/exports/:jobId                → hỏi mỗi 2 giây tới COMPLETED (có downloadUrl)
```

1. **Đọc quyền của phiên bản.** Bước 6 của Studio ([`ExportPurchaseCard`](../fe/src/features/studio/components/export/ExportPurchaseCard.tsx))
   và hộp xuất file ([`ExportDialog`](../fe/src/features/studio/components/export/ExportDialog.tsx)) gọi
   `getExportAccess` → `GET …/exports/access`. `unlocked: true` thì cho chọn định dạng; `unlockExpiresAt` khác `null` chỉ
   khi quyền đến từ một lần mở khóa cũ.
2. **Chưa có quyền: cho vào giỏ in.** Nút "Thanh toán" dẫn tới `/cart?add=<projectId>` (`cartWith` trong
   `ExportPurchaseCard.tsx`). Trang giỏ ([`views/cart`](../fe/src/views/cart/index.tsx)) thêm thiết kế vào giỏ một lần, cho
   chỉnh số hộp và giấy từng thiết kế.
3. **Tạo đơn và thanh toán.** Giỏ gọi `createSampleBundle` (`fe/src/api/orders`) → `POST /api/orders/sample/bundle`, rồi
   mở [`CheckoutDialog`](../fe/src/features/payments/CheckoutDialog.tsx) với `purpose="SAMPLE_ORDER"` và `orderId` vừa tạo.
   Hộp thanh toán bắt người dùng đọc và tick đồng ý điều khoản trước, rồi mới gọi `createPayment` (`fe/src/api/payments`)
   → `POST /api/payments` với `termsVersion = PAYMENT_TERMS_VERSION`. Sau đó hỏi `getPayment` mỗi 3 giây (mục 7.2).
4. **Kiểm lại quyền.** Khi thanh toán `PAID`, `CheckoutDialog` invalidate các query `billing`, `orders`, `projects`…; thẻ
   ở bước 6 đọc lại `exports/access` và tự mở khóa mà không cần tải lại trang.
5. **Tạo job.** `requestExport` → `POST /api/projects/:id/exports { fileType }`. Trước khi gọi, Studio `flush()` để server
   có đúng thiết kế đang thấy trên màn hình. Kết quả:
   - `202 { jobId, status, fitCheck }`: theo dõi job;
   - `422` kèm `fitCheck`: mở bảng FitCheck với `fitCheck.violations` (cần sửa lỗi mức `error`);
   - `402 ORDER_PAYMENT_REQUIRED`: phiên bản này chưa có đơn đã trả, quay lại bước 2;
   - `409`: dự án đang ở thùng rác, cần khôi phục trước.
   Request chỉ có `fileType`. Gửi thêm trường cũ như `useCredit` → `400`.
6. **Hỏi trạng thái** `getExportJob` → `GET /api/exports/:jobId` mỗi 2 giây: `PENDING` → `PROCESSING` → `COMPLETED` (có
   `downloadUrl`, hết hạn sau 15 phút: hết hạn thì GET lại để lấy link mới) hoặc `FAILED` (`error`). Không có trường
   `progress`. `watermarked` luôn `false` với job mới, FE không cần hiện nhãn watermark.

Mỗi job dựng file từ **bản thiết kế lúc bấm xuất**: người dùng sửa tiếp trong lúc job chờ cũng không làm lệch file. Job xong
tạo một thông báo "file in đã xong" (mục 8.1).

**Ba tình huống cần xử lý riêng:**

| Tình huống | Kết quả | FE nên làm |
|---|---|---|
| Đổi tên (hoặc tag, thumbnail) sau khi đơn đã trả | `version` không đổi, quyền còn nguyên | Không cần làm gì |
| Sửa thiết kế (canvas, kích thước, giấy) sau khi đơn đã trả | Phiên bản mới chưa có quyền: `exports/access` trả `unlocked: false`, xuất → `402 ORDER_PAYMENT_REQUIRED` | Báo "Bản thiết kế đã thay đổi, cần đặt in bản mới" và dẫn lại giỏ in. File của các lần xuất cũ vẫn ở danh sách xuất |
| Dự án nằm trong thùng rác | Xuất → `409` | Khôi phục (`PATCH …/status { "status": "ACTIVE" }`) rồi xuất lại. Khôi phục không đổi `version`, nên quyền cũ còn. Khôi phục một **mốc phiên bản** thì là phiên bản mới, cần quyền mới |

### 7.2. Hộp thanh toán và giả lập

- `PaymentView.provider` quyết định giao diện: `VIETQR` hiện mã QR (`vietqr.qrSvg`), số tài khoản, nội dung chuyển khoản
  `reference` và đếm ngược 15 phút; `VNPAY` (tài khoản demo) hiện nút "Mở cổng VNPay" chuyển trình duyệt tới
  `vnpay.payUrl` (chỉ có trong phản hồi `POST`, nên lưu `paymentId` và đường quay lại vào `sessionStorage` trước khi rời
  trang). VNPay trả trình duyệt về `/payments/vnpay-return`, trang này gọi `GET /api/payments/vnpay/return` với nguyên
  query.
- `vietqr.sample: true` nghĩa là máy chủ chưa có tài khoản ngân hàng thật (QR mang tên "WRAPFIT MO PHONG"): hiện nhãn
  "Mô phỏng", không thể chuyển tiền thật.
- **Nút "Giả lập đã thanh toán"** chỉ hiện khi `GET /api/billing/me` trả `paymentSimulation: true`: máy chủ bật
  `PAYMENT_SIMULATION=true` **và** (tài khoản demo **hoặc** máy chủ chưa cấu hình `VIETQR_*`). Có tài khoản VietQR thật mà
  tài khoản thường vẫn bấm (ví dụ trên localhost, nơi FE luôn hiện nút) → `403 SIMULATION_DEMO_ONLY`: hiện lỗi, không đánh
  dấu đã trả.
- Với thanh toán VietQR, nút giả lập gọi `simulateTransfer` (`POST /api/payments/:id/simulate-transfer`) để giao dịch đi
  qua đúng đường webhook SePay và hiện ở trang admin đối soát; với VNPay, gọi `simulatePayment`
  (`POST …/simulate-confirm`).
- Khi `PAID`: hiện màn thành công và invalidate `billing`, `aiUsage`, `xuHistory`, `me`, `orders`, `projects`,
  `paymentHistory`. Không bao giờ hiện "đã thanh toán" khi server chưa xác nhận.

### 7.3. Hiển thị các trường hợp đối soát

Chuyển khoản VietQR được SePay báo về và khớp tự động theo mã `WF…` và số tiền ([03 · Đối soát chuyển khoản](03_API_DESIGN.md#đối-soát-chuyển-khoản)).
Phía khách, thanh toán chỉ có `PENDING`, `PAID` hoặc `EXPIRED`; trường hợp lệch nằm ở trang admin.

| Trường hợp | Khách thấy | Admin thấy (`/admin/bank-transactions`) |
|---|---|---|
| Khớp tiền | Hộp thanh toán chuyển sang thành công trong vài giây | Dòng `MATCHED` |
| Lệch tiền (chuyển thiếu hoặc dư) | Thanh toán vẫn chờ. Khi giả lập kịch bản `underpaid`, toast "Chuyển chưa đủ tiền": khoản thiếu không tự khớp, admin sẽ liên hệ hoàn tiền, khách chuyển lại đúng số tiền | Dòng `UNMATCHED`, nhãn "Sai số tiền". Chuyển dư thì gán tay được; chuyển thiếu thì gán bị từ chối (`AMOUNT_TOO_LOW`), admin hoàn tiền tay rồi "Bỏ qua" |
| Quên ghi mã `WF` | Thanh toán vẫn chờ. Kịch bản `no_reference`: toast "Ngân hàng đã báo tiền về… đang chờ admin đối soát"; hộp thanh toán tự cập nhật khi admin gán | Dòng `UNMATCHED`, nhãn "Không có mã thanh toán" |
| Gán tay | Hộp thanh toán (nếu còn mở) hoặc lịch sử thanh toán chuyển sang `PAID`, kể cả khi đã quá 15 phút | Hộp "Gán cho thanh toán": nhập mã `WF…`, xem trước thanh toán, xác nhận → `RESOLVED` |
| Đơn in đã hủy khi tiền về | Thanh toán không cấp gì | Dòng `UNMATCHED`, nhãn "Đơn in đã hủy, cần hoàn tiền" |

Nhãn của trang admin nằm ở `fe/src/views/admin/bank-transactions/labels.ts`.

### 7.4. Nội dung file in

- Chỉ ảnh và phông upload lên WrapFit được nhúng vào file in. Tối đa 10 yêu cầu xuất / phút.
- Nội dung file:
  - `PDF_CMYK`: PDF 1.6, khổ thật (1 mm = 2,8346 pt), 4 lớp OCG `Artwork`, `Crease`, `CutContour`, `Dimensions`
    (lớp cuối chỉ xem, không in). Nét cắt là màu pha `CutContour` (thay thế 100 % M), nét gấp là màu pha `Crease`
    (100 % C, nét đứt 4 mm), cả hai overprint; mỗi đường cắt / gấp là một đường liền. `TrimBox` = vùng phôi,
    `BleedBox` = phôi + 3 mm. Nhúng ảnh (giữ tỉ lệ trong khung) và font của chữ, kể cả phông người dùng tải lên.
  - `SVG`: cùng 4 lớp (`<g id>` + nhãn lớp Inkscape), ảnh mọi định dạng nhúng base64; chữ ghi tên font (máy mở file
    cần có font).
  - `DXF`: R12, mm, lớp `CUT` / `CREASE`, mỗi đường là một `POLYLINE` (đường cong tạm thay bằng dây cung).
  - `PDF_A4_PRINT`: in tại nhà, khổ A4 / A3, có dấu xén; file sạch như mọi định dạng khác.
  - `PRINT_PACKAGE`: ZIP gửi nhà in (file gốc `.ai` tương thích PDF, PDF in, JPG đối chiếu, SVG, DXF, phiếu kiểm tra).
  - Chữ dùng cùng mô hình với canvas (`layoutTextBox` của `@wrapfit/shared`): `style.fontSize` là pt, đậm 700, dòng
    cao 1,2, xuống dòng trong bề rộng khung, căn giữa ngang và dọc, xoay quanh tâm khung. Font in được: Be Vietnam Pro
    (mặc định), Playfair Display, Cormorant Garamond, Big Shoulders Display, Inter; tên khác in bằng Be Vietnam Pro.

## 8. Chia sẻ, remix, thả tim

```http
PATCH /api/projects/:id/visibility   { "visibility"?: "PRIVATE" | "UNLISTED" | "PUBLIC", "allowFork"?: boolean }
GET   /api/public/projects/:slug              (công khai; có cookie thì biết người xem; ?count=false: không tính lượt xem)
POST  /api/public/projects/:slug/fork         → 201 ProjectDetail (bản remix của tôi)
POST  /api/public/projects/:slug/like         → { "liked": true, "likesCount": 12 }
DELETE /api/public/projects/:slug/like        → { "liked": false, "likesCount": 11 }
```

- Trang `/p/[slug]` hiển thị `slug, title, visibility, allowFork, template, dimensions, materialSpec, canvasState,
  thumbnailUrl, tags, occasion, industry, viewsCount, likesCount, createdAt, updatedAt, author { fullName, shopName,
  avatarUrl }, forkedFrom { slug, title, author } | null, viewer { isOwner, liked }`.
- Lượt xem: mỗi người xem (tài khoản, hoặc IP + trình duyệt) tính 1 lần / 10 phút, chủ dự án không tính. Code chạy trên
  server Next.js (SSR, `generateMetadata`) không mang cookie phiên nên gọi với `?count=false`; request của trình duyệt
  mới tính lượt xem (`features/showcase/server.ts`).
- `PRIVATE` / thùng rác / slug sai → `404` (kể cả với chủ dự án). Trang `UNLISTED` nên có
  `<meta name="robots" content="noindex">`. `allowFork: false` → fork trả `403`.
- Đưa lên Thư viện cộng đồng: `PUBLIC` + gắn `occasion` / `industry` (qua `PATCH /api/projects/:id`); chỉ thiết kế có
  `fitcheckScore ≥ 90` mới xuất hiện ở phân khu cộng đồng.
- Remix của người khác tạo thông báo cho tác giả (mục 8.1); tự remix thiết kế của mình thì không.

### 8.1. Thông báo (chuông ở header)

```http
GET  /api/notifications?before=&limit=     → { items: Notification[], nextBefore: string | null }   (mới nhất trước, limit ≤ 50, mặc định 20)
GET  /api/notifications/unread-count       → { count }
POST /api/notifications/:id/read           → 204 (gọi lại không đổi gì; 404 nếu không phải của tôi)
POST /api/notifications/read-all           → { updated }
```

- `Notification`: `{ id, type: "PROJECT_REMIXED" | "EXPORT_COMPLETED", createdAt, readAt, project { id, title }, count,
  actorName, export { jobId, fileType } | null }`. `project` là thiết kế **của tôi** (bản gốc bị remix, hoặc thiết kế vừa
  xuất file), không bao giờ là bản sao của người remix.
- Remix: `actorName` là họ tên (không có thì tên shop) của người remix gần nhất, `null` khi không có tên hoặc tài khoản đã
  xóa / ẩn danh hóa (FE ghi "Một người dùng WrapFit"). Các lượt remix chưa đọc của cùng thiết kế gộp vào một dòng:
  `count` tăng, dòng lên đầu.
- Chỉ dòng của chính người đăng nhập. Giới hạn: mức chung (100 request/phút/IP).
- FE (`features/notifications`): hỏi `unread-count` lúc tải, khi tab focus lại và mỗi 60 giây; lắng nghe
  `notifications.changed` trên WebSocket (bên dưới) để hỏi lại ngay. Không có socket vẫn đúng.
- Backend xóa thông báo đã đọc sau 30 ngày và giữ tối đa 200 dòng mới nhất mỗi người.
- Thông báo "file in đã xong" link tới trang "Đơn hàng & File In", không lưu link tải (link tải hết hạn sau 15 phút).
- Đồng bộ hai tab dùng một sự kiện WebSocket khác, `project.saved` (mục 5.3.1); hai cơ chế độc lập với nhau.

### 8.2. Duyệt mẫu theo link (khách, xưởng in)

Chủ dự án gửi một link bí mật cho khách hoặc xưởng in để góp ý và bấm "Duyệt in" mà không cần tài khoản. Hợp đồng API:
[03 · Duyệt mẫu theo link](03_API_DESIGN.md#duyệt-mẫu-theo-link). Hàm gọi: [`fe/src/api/reviews`](../fe/src/api/reviews/index.ts).

```http
GET    /api/projects/:id/review                           → { token, approval, comments }     (chủ dự án)
POST   /api/projects/:id/review/link                      → tạo hoặc đổi link (link cũ hết hiệu lực)
DELETE /api/projects/:id/review/link                      → tắt link, giữ lần duyệt
POST   /api/projects/:id/review/comments                  { body, panelId?, x?, y? }
PATCH  /api/projects/:id/review/comments/:commentId       { resolved }
DELETE /api/projects/:id/review/comments/:commentId       → 204
GET    /api/review/:token                                  → thiết kế đã lưu + góp ý + approval   (công khai)
POST   /api/review/:token/comments                         { authorName, body, panelId?, x?, y? }
POST   /api/review/:token/approve                          { name, version }  → approval | 409 DESIGN_CHANGED
```

- **Phía chủ dự án.** Hộp chia sẻ ([`ShareDialog`](../fe/src/features/studio/components/share/ShareDialog.tsx)) có mục
  "Duyệt mẫu với khách / xưởng in": tạo, chép, đổi, tắt link. Link là `/review/<token>`. Bước 6 có thẻ "Duyệt mẫu"
  ([`ReviewPanel`](../fe/src/features/studio/components/review/ReviewPanel.tsx)): trạng thái duyệt, góp ý theo mặt hộp,
  "Đã xử lý" / "Mở lại", xóa, trả lời (nhãn "Người thiết kế"). Thẻ tự làm mới mỗi phút.
- **Phía người duyệt.** Trang [`/review/[token]`](../fe/src/views/review/index.tsx) (không index) hiện hộp 3D của **bản đã
  lưu**, góp ý theo mặt và nút "Duyệt in phiên bản n". Nút cần tên người duyệt và tick "đã kiểm tra"; tên được nhớ trong
  trình duyệt. Link lạ, đã tắt hoặc dự án trong thùng rác → `404`: hiện "Link duyệt mẫu không còn hiệu lực".
- **Duyệt đúng phiên bản.** Trang gửi `version` của bản đang hiển thị. Chủ dự án vừa lưu bản mới → `409 DESIGN_CHANGED`:
  trang tải lại thiết kế (`refetch`) và người duyệt duyệt lại bản mới. Không bao giờ duyệt một phiên bản người duyệt chưa
  xem.
- **"Đã duyệt in"** = `approval.current`. Chủ dự án sửa nội dung thiết kế sau khi duyệt (phiên bản mới) thì `current`
  thành `false`: hiện "Đã sửa sau khi duyệt, cần duyệt lại" và nút "Duyệt in phiên bản <mới>". Đổi tên hay thumbnail không
  làm mất trạng thái duyệt (mục 5.3).
- Góp ý ghim vào một mặt khi có `panelId` cùng `x`, `y` (mm trên mặt). Khách có tối đa 500 góp ý mỗi dự án
  (`400 TOO_MANY_COMMENTS`); trả lời của chủ dự án đếm riêng.
- Duyệt mẫu không mở quyền xuất file in: file in vẫn cần đơn in đã trả (mục 7).

## 9. Thư viện mẫu

```http
GET /api/templates/structures    → [{ id, name, category, description, preview3dUrl, dimensionLimits }]
GET /api/templates/hub?section=curated|community&structure=&occasion=&industry=&material=&q=&page=&limit=
GET /api/templates/:id           → mẫu Curated kèm canvasState + dimensionLimits
```

- Hai phân khu gọi riêng. Thẻ Curated mở bằng `id`; thẻ Community mở trang công khai bằng `slug`. Kết quả cache 60 giây.
- "Dùng mẫu này": `POST /api/projects { templateId: <structure.id của mẫu>, designTemplateId, title, dimensions,
  canvasState? }`. Khi người dùng đổi kích thước theo món quà, FE co giãn canvas rồi gửi kèm (ảnh của mẫu được giữ).

## 10. Mở hộp 3D qua QR

```http
GET    /api/projects/:id/unboxing          → { slug, recipientName, giftNote, audioTrackUrl, particleEffect, viewsCount, createdAt, qrCodeUrl, qrCodeSvgUrl, unboxUrl }
POST   /api/projects/:id/unboxing  { "recipientName", "giftNote", "audioTrackUrl"?: "/audio/xuan.mp3" | "<fileUrl đã tải lên>", "particleEffect"? }  → 201 lần đầu / 200 khi sửa
DELETE /api/projects/:id/unboxing          → 204
GET    /api/projects/:id/unboxing/qr?format=png|svg   → tải file QR
GET    /api/public/unboxing/:slug          → { recipientName, giftNote, audioTrackUrl, particleEffect, viewsCount, sender { fullName, shopName, avatarUrl }, box { title, template, dimensions, materialSpec, canvasState, thumbnailUrl } }
```

- `particleEffect`: `confetti` (mặc định) | `fireworks` | `hearts` | `petals` | `snow` | `none`.
- `recipientName` ≤ 100, `giftNote` ≤ 2000. `slug` không đổi khi sửa (QR có thể đã in). Trang FE: `/unbox/[slug]`.
- `qrCodeUrl` / `qrCodeSvgUrl` là `null` khi storage chưa cấu hình: dùng endpoint `.../unboxing/qr`.
- `audioTrackUrl` chỉ nhận file đã tải lên WrapFit hoặc đường dẫn tĩnh của FE bắt đầu bằng `/` (ví dụ nhạc có sẵn trong
  `public/audio/`). URL trang khác → `400 FILE_URL_NOT_ALLOWED`, vì trình duyệt của người nhận sẽ tải nó.

## 11. AI: xu Wrap, ảnh AI và hoa văn

Mọi tác vụ AI trả bằng **xu Wrap** (1 xu = 100đ), không còn "lượt / ngày" hay `usage.used / limit`. Quy tắc giá, cấp xu
theo kỳ, trừ và hoàn xu: [16 · Xu Wrap](16_XU_WRAP_SPEC.md). Lỗi API: [03 · Xu Wrap và ảnh AI](03_API_DESIGN.md#xu-wrap-và-ảnh-ai).
**Không chép giá vào code FE**: lấy từ `GET /api/ai/models`, `GET /api/ai/usage`, hoặc `@wrapfit/shared`
(`AI_IMAGE_MODELS`, `XU_TOOL_COST`, `XU_PATTERN_COST`, `XU_PACKS`, `XU_CUSTOM`, `XU_ALLOWANCE`).

### 11.1. Hoa văn AI

```http
POST /api/ai/pattern   { "theme": "Tết hoa mai", "preferredColors"?: ["#D4AF37"], "quality"?: "fast" | "premium" }
→ { "source": "ai" | "procedural", "themeName", "description", "palette": ["#…"], "tile": { "size": 120, "svg": "<svg…>" },
    "usage": { "charged", "balance" } | null }
GET  /api/ai/usage     → { aiEnabled, budgetReached, patternCost: { fast, premium }, xu: { balance, allowance } }
```

- `tile.svg` là ô lặp liền mạch, an toàn để chèn (không script / tài nguyên ngoài). Tối đa 5 yêu cầu / phút.
- Giá: `fast` 1 xu, `premium` 65 xu, mọi gói. Khóa nút khi `xu.balance` nhỏ hơn giá. Thiếu xu →
  `402 INSUFFICIENT_CREDITS { kind: "XU", balance, cost }`, trả về trước khi gọi AI: hiện "Cần N xu, bạn còn M xu" và nút
  "Nạp xu".
- **Hoa văn thuật toán dự phòng** (`source: "procedural"`, luôn có kết quả):
  - `usage: null`: AI tắt (`aiEnabled: false`) hoặc cầu chì ngân sách tháng đã chạm (`budgetReached: true`), không trừ xu.
  - `usage.charged === 0`: AI lỗi, xu đã được hoàn. Gợi ý báo nhẹ "AI đang bận, đây là hoa văn tự sinh, xu đã được hoàn".
- Sau khi tạo hoa văn, invalidate `billing` và `aiUsage` (hoặc dùng luôn `usage.balance`).

### 11.2. Ảnh AI cho mặt hộp

```http
GET  /api/ai/models                                     → { enabled, models[], tools }
POST /api/ai/images      { prompt, modelKey, aspectRatio, numImages?, allowText?, clientRequestId }  → 202 { job, balance }
GET  /api/ai/images/jobs/:id                            → AiImageJob (hỏi mỗi 2 giây)
GET  /api/ai/images?before=&limit=                      → "Ảnh AI của tôi" { items, nextBefore }
POST /api/ai/images/:outputId/upscale|remove-bg|vectorize   { clientRequestId }        → 202 { job, balance }
POST /api/ai/images/uploads/upscale|remove-bg|vectorize     { content, clientRequestId } → 202 { job, balance }
```

Panel: [`AiImagePanel`](../fe/src/features/studio/components/ai-image/AiImagePanel.tsx), hàm gọi `fe/src/api/ai`.

1. Mở panel: gọi `GET /api/ai/models` và `GET /api/billing/me` để có catalog và số dư. `enabled: false` → hiện "Ảnh AI
   đang tạm tắt".
2. Khách chọn model; `aspectRatio = nearestAspectRatio(face.widthMm, face.heightMm, model.aspectRatios)`. Nút hiện
   "Tạo · {model.xu × numImages} xu", khóa khi `balance` nhỏ hơn số đó.
3. Khi bấm: tạo `clientRequestId` **một lần cho mỗi cú bấm** (`crypto.randomUUID()`, có fallback cho trang http không
   phải localhost) rồi gửi `POST /api/ai/images`.
4. Nhận `202`: cập nhật số dư ngay bằng `balance` trong response, rồi hỏi job mỗi 2 giây. Job có thể mất 10–60 giây (lần
   thử đầu lỗi thì worker thử lại sau 5 giây).
5. `COMPLETED`: hiện lưới `outputs`, làm mới "Ảnh AI của tôi" (`aiImages`).
6. `FAILED`: hiện `job.error` rồi làm mới số dư (`billing`, `aiUsage`, `xuHistory`).

**Các tình huống FE phải xử lý:**

| Tình huống | Backend làm gì | FE làm gì |
|---|---|---|
| **Thử lại cùng `clientRequestId`** (mất mạng, timeout, bấm hai lần) | Trả lại **cùng job** cùng số dư hiện tại; xu chỉ bị trừ một lần, kể cả khi hai request đến cùng lúc | Gửi lại với **đúng** `clientRequestId` cũ, không tạo id mới. Dùng `job.id` trả về để tiếp tục theo dõi |
| **Mô tả bị kiểm duyệt chặn** | `422 PROMPT_REJECTED`, `message` nêu lý do; chưa trừ xu, không tạo job | Hiện `message` nguyên văn, giữ mô tả trong ô để khách sửa |
| **Job bị nhà cung cấp từ chối** | Job `FAILED` ngay, `error` "Nhà cung cấp AI từ chối vẽ nội dung này. Xu đã được hoàn lại." | Hiện `error`, làm mới số dư |
| **Thiếu xu** | `402 INSUFFICIENT_CREDITS { kind: "XU", balance, cost }`, không tạo job | Hiện "Cần {cost} xu, bạn còn {balance} xu" + nút "Nạp xu" mở `CheckoutDialog` (`XU_500`, `XU_1050`, `XU_2200` hoặc `XU_CUSTOM`). Tốt nhất khóa nút trước khi bấm |
| **Hoàn xu sau lỗi hệ thống** (nhà cung cấp lỗi cả hai lần thử, hàng đợi hay worker sập, job treo quá 10 phút) | Job `FAILED`, `error` "Tạo ảnh không thành công. Xu đã được hoàn lại."; xu hoàn đúng một lần. Job treo được xử lý chậm nhất khoảng 15 phút | Hiện `error`, gọi lại `GET /api/billing/me` để **làm mới số dư** (số dư trong response lúc tạo job đã cũ) |
| **Đang có 3 job chạy** | `429 AI_IMAGE_BUSY` | Hiện `message`, chờ một job xong |
| **Vượt 5 request / phút** | `429` không có `code`, header `Retry-After` | "Bạn thao tác quá nhanh. Thử lại sau N giây." |
| **Bộ nhớ đầy** | `403 STORAGE_QUOTA_EXCEEDED` | Dẫn tới quản lý file hoặc nâng cấp gói |
| **Ảnh AI tắt / hết ngân sách** | `503 AI_IMAGE_UNAVAILABLE` | Hiện `message`, khóa nút tạo |

Lỗi xảy ra **sau** khi job đã vào hàng đợi không trả qua HTTP: luôn đọc `job.status` và `job.error`.

**Đặt ảnh lên mặt hộp.** `output.url` là một ảnh upload hợp lệ của chính người dùng (purpose `IMAGE`), canvas lưu như ảnh
upload thường. DPI = `width_px / width_mm × 25,4`: FitCheck cảnh báo dưới 300 DPI, chặn dưới 150 DPI (mục 5.3). Ảnh SVG
(`output: "vector"`) không có `width` / `height`, đặt như phần tử `logo`. Ảnh chưa nằm trên thiết kế đã lưu nào bị xóa sau
`keepUntil` (30 ngày).

**Công cụ ảnh** (`upscale` 20 xu, `remove-bg` 5 xu, `vectorize` 10 xu, giá lấy từ `catalog.tools`): chạy trên một ảnh AI
(`:outputId`) hoặc một ảnh mình đã tải lên (`uploads/:tool`, `content` = URL hoặc key của ảnh PNG / JPEG / WebP). Kết quả
là ảnh mới, ảnh gốc giữ nguyên. Không chạy trên SVG (`400`); `upscale` báo `400` khi ảnh đã đạt trần 16 MP hoặc cạnh dài
4096 px.

### 11.3. Ví xu và lịch sử

- Số dư và lô xu: `GET /api/billing/me` → `xu: { balance, lots, allowance }`. Đọc route này cũng cấp xu của kỳ nếu chưa
  cấp, nên số dư luôn đúng cả với tài khoản mới.
- Trang ví `/dashboard/wallet` ([`views/dashboard/wallet`](../fe/src/views/dashboard/wallet/index.tsx)): nạp xu bằng gói
  cố định hoặc số xu tùy chọn (100–50.000 xu, bội số của 10), số dư, xu sắp hết hạn, và **lịch sử ví**.
- **Lịch sử ví**: `GET /api/billing/xu/history?before=&limit=&type=&from=&to=` → `{ entries, nextBefore }`. Lọc theo
  `type` (`grant` nạp / cấp, `spend` chi tiêu, `adjust` admin điều chỉnh) và khoảng ngày. Mỗi thao tác là **một dòng**,
  dù trừ từ nhiều lô. Dòng `SPEND` có `refundedAt` khác `null` là lần trừ **đã được hoàn**: gạch ngang hoặc ghi "đã hoàn",
  không hiện thêm dòng hoàn riêng.
- Nạp xu thành công (thanh toán `PAID`): invalidate `billing` và `xuHistory`.

## 12. Hồ sơ, Brand Kit, bộ sưu tập

```http
PATCH /api/users/me             { "fullName"?, "shopName"?, "avatarUrl"?: "<fileUrl AVATAR/IMAGE>" | null }   → SafeUser
PATCH /api/users/me/brand-kit   { "logoUrl"?: "<fileUrl LOGO/IMAGE>" | null, "colors": ["#RRGGBB" × 3–5], "fonts"?: [≤ 3], "slogan"? }  → SafeUser
GET|POST /api/collections       · GET|PATCH|DELETE /api/collections/:id   (colorTag #RRGGBB, title ≤ 100, description ≤ 500)
```

- Brand Kit được **thay cả bộ**: trường bỏ trống bị xóa. `avatarUrl: null` xóa ảnh đại diện (cả ảnh Google).
- Ảnh đại diện / logo bị thay hoặc gỡ được xóa luôn khỏi storage (không còn tính vào hạn mức), nếu file đó upload với
  purpose `AVATAR` / `LOGO` và không gắn dự án. Giữ lại: file `IMAGE` (có thể đang là thumbnail), logo còn hiện trên
  canvas của một dự án. Đừng dùng lại `fileUrl` cũ sau khi đã thay: upload lại.
- File upload mà **không nơi nào dùng** (canvas, mốc phiên bản, avatar, logo, thumbnail, ảnh xem trước của mốc) bị
  xoá **24 giờ** sau khi upload (cron dọn storage mỗi 10 phút): ảnh đã gỡ khỏi canvas và mọi mốc, thumbnail cũ, logo
  upload rồi không bấm lưu. Upload xong thì lưu (`PATCH`) trong vòng 24 giờ; quá hạn → `400 FILE_NOT_OWNED`, upload lại.
- Thư mục: tối đa 100; xóa thư mục giữ lại dự án. Đưa dự án vào / ra: `PATCH /api/projects/:id { collectionId }`.

## 13. Những chỗ `apiClient` cũ lệch backend (đã sửa)

Danh sách lập trước khi nối FE với backend (đợt tích hợp FE–BE tháng 10/2026). Tất cả đã sửa trong các module
[`fe/src/api/`](../fe/src/api/) và kiểu dữ liệu [`fe/src/types/api/`](../fe/src/types/api/index.ts); đã kiểm lại ngày
2026-10-12: không còn chỗ nào trong `fe/src` dùng tên cũ, kịch bản đầu cuối của FE (`fe/scripts/e2e-scenario.mjs`) chạy qua
cả 15 bước lúc đó. Mục này là ghi chú lịch sử; luồng hiện hành ở các mục trên.

| Chỗ lệch | Trước đây | Đúng theo backend | Sửa ở |
|---|---|---|---|
| Đăng ký / đăng nhập | Chưa có trang và hàm nào | Mục 3: 7 trang, xử lý `EMAIL_NOT_VERIFIED` | S4 |
| Làm mới phiên | Không xử lý `401` | Refresh 1 lần rồi gửi lại (mục 1) | S2, S3 |
| `listProjects` | Tham số `search`; đọc `{ items, total }` | Tham số `q`; response `{ items, meta: { total, page, limit, totalPages } }` | S2 |
| `uploadFileToStorage` | `purpose: "CANVAS_IMAGE" \| "PROJECT_THUMBNAIL"` | `LOGO` \| `IMAGE` \| `THUMBNAIL` \| `AVATAR` | S2 |
| `uploadFileToStorage` | Tự đặt header `PUT`; lỗi thì trả data URL | Dùng đúng `ticket.method` + `ticket.headers`; kiểm tra `put.ok`; **không** dùng data URL (bị từ chối khi lưu) | S2 |
| `deleteProject` (Dashboard) | Gọi `DELETE` trực tiếp | Trước hết `PATCH .../status { DELETED }`; `DELETE` chỉ trong thùng rác | S5 |
| `AiPatternResponse` | `{ theme, palette, svgTile }` | `{ source, themeName, description, palette, tile: { size, svg }, usage }` | S2, S7 |
| `ExportJobStatus` | Có `progress`, thiếu `downloadExpiresIn` | Mục 7.1 | S2 |
| `SnapshotDto` | Có `projectId` | `{ id, name, previewUrl, dimensions, createdAt }` | S2 |
| `PublicUnboxingData` | `project`, `slug`, `qrCodeUrl`; hiệu ứng `sparkles`, `stars` | `box`, `sender`; không có `slug` / `qrCodeUrl`; hiệu ứng ở mục 10 | S2, S5 |
| Dieline trong editor | Gọi thẳng `generateTuckTopDieline`… | `generateDielinePieces(templateId, dimensions, formulaVersion)` | S6, S10 |
| Dữ liệu giả khi lỗi | Nhiều hàm `catch` trả dữ liệu mẫu | Hiển thị lỗi thật (`ErrorState` có mã `requestId`, toast) | S2, S3 |

## 14. Kiểu dữ liệu TypeScript

Kiểu hình học, canvas, FitCheck lấy từ `@wrapfit/shared` (`BoxDimensions`, `MaterialSpecification`, `CanvasState`,
`CanvasElement`, `FitCheckReport`, `BrandKit`, `generateDielinePieces`). Các response chính:

```ts
export interface SafeUser {
  id: string; email: string; emailVerifiedAt: string | null;
  fullName: string | null; avatarUrl: string | null; shopName: string | null;
  role: 'MAKER' | 'PRO_ARTISAN' | 'PRINT_SHOP' | 'ADMIN';
  subscriptionTier: 'FREE' | 'PAY_PER_EXPORT' | 'STARTER' | 'PRO_BUSINESS';
  brandKit: BrandKit | null; referralCode: string | null; isActive: boolean;
  isDemo: boolean;   // tài khoản demo: thanh toán qua VNPay sandbox (mục 7.2)
  createdAt: string; updatedAt: string;
}

export interface ProjectSummary {
  id: string; title: string; slug: string;
  status: 'ACTIVE' | 'ARCHIVED' | 'DELETED'; visibility: 'PRIVATE' | 'UNLISTED' | 'PUBLIC';
  template: { id: string; name: string };
  collection: { id: string; title: string; colorTag: string | null } | null;
  dimensions: BoxDimensions; materialSpec: MaterialSpecification;
  fitcheckScore: number | null; thumbnailUrl: string | null; tags: string[];
  occasion: 'TET' | 'CHRISTMAS' | 'WEDDING' | 'VALENTINE' | 'BIRTHDAY' | 'MINIMAL' | null;
  industry: 'COSMETICS' | 'CANDLES' | 'BAKERY' | 'JEWELRY' | 'TEA_AGRI' | 'BEVERAGE' | null;
  viewsCount: number; likesCount: number; deletedAt: string | null; createdAt: string; updatedAt: string;
}

export interface ProjectDetail extends ProjectSummary {
  version: number; formulaVersion: number; allowFork: boolean; forkedFromId: string | null;
  canvasState: CanvasState; fitcheckState: FitCheckReport | null;
}

export interface SnapshotSummary { id: string; name: string; previewUrl: string | null; dimensions: BoxDimensions; createdAt: string }

export interface PresignedUpload {
  fileId: string; key: string; uploadUrl: string; method: 'PUT';
  headers: { 'Content-Type': string }; fileUrl: string; expiresIn: number;
}

export interface Paginated<T> { items: T[]; meta: { total: number; page: number; limit: number; totalPages: number } }

export interface ApiErrorBody {
  statusCode: number; error: string; message: string | string[]; path: string; requestId: string; timestamp: string;
  code?: string;   // mã ổn định, ví dụ 'EMAIL_NOT_VERIFIED', 'PROJECT_VERSION_CONFLICT', 'ORDER_PAYMENT_REQUIRED',
                   // 'INSUFFICIENT_CREDITS', 'DESIGN_CHANGED', 'PROJECT_IN_ACTIVE_ORDER' (bảng ở mục 2)
  currentVersion?: number; fitCheck?: FitCheckReport;
  kind?: 'XU' | 'EXPORT'; balance?: number; cost?: number;   // INSUFFICIENT_CREDITS
}
```

Ngày giờ là chuỗi ISO 8601 (UTC). `id` là UUID (bản ghi mới dùng UUIDv7).

## 15. Chạy và kiểm thử local

```bash
docker compose up -d postgres redis seaweedfs storage-init mailpit
npm --workspace=be run db:migrate && npm --workspace=be run db:seed
npm run dev:be                                  # API: http://localhost:8080/api, Swagger: /api/docs
npm --workspace=be run dev:worker               # gửi email + xuất file in
npm --workspace=fe run dev                      # FE: http://localhost:3000
```

- **Email**: mọi email (xác nhận, đặt mật khẩu, hoàn tất đăng ký, thông báo) nằm ở Mailpit `http://localhost:8025`,
  không gửi ra ngoài. Mở link trong thư để thử các trang `?token=`. Cần chạy worker thì email mới được gửi.
- **Tài khoản admin seed**: `admin@wrapfit.vn` / `Admin@12345` (đã xác minh).
- Kiểm tra gửi mail bằng cấu hình hiện tại: `npm --workspace=be run mail:test -- you@example.com`.
- `FRONTEND_URL` của backend (`be/.env`) phải là địa chỉ FE đang chạy (mặc định `http://localhost:3000`), vì link email
  và chuyển hướng sau đăng nhập Google dựa vào nó.

## 16. Danh mục đầy đủ endpoint (đối chiếu với code)

Toàn bộ 113 route HTTP của backend (đối chiếu 2026-11-19), nhóm theo chức năng, kèm mục tài liệu tương ứng. Bảng đầy đủ
từng route, quyền và mã lỗi: [03 · mục 2](03_API_DESIGN.md#2-endpoints-đã-triển-khai). Route nào chưa có ở đây thì chưa
tồn tại ở backend.

| Nhóm | Route | Quyền | Mục |
|---|---|---|---|
| Hệ thống | `GET /api/health` → `{ status: "ok" \| "degraded", database, redis, worker }`; `GET /api/health/details` (thêm hàng đợi, thời gian chạy) | Public / ADMIN | 16 |
| Auth | `POST /api/auth/register` · `/login` · `/refresh` · `/logout` · `/logout-all` | Public (logout-all: đăng nhập) | 1, 3 |
| Auth | `GET /api/auth/me` | Đăng nhập | 1 |
| Auth | `GET /api/auth/google` · `/google/callback` | Public (điều hướng trình duyệt) | 3.5 |
| Auth | `POST /api/auth/verify-email` · `/verify-email/resend` · `/password/forgot` · `/password/reset` | Public | 3 |
| Người dùng | `GET` · `PATCH /api/users/me`, `PATCH /api/users/me/brand-kit` | Đăng nhập | 12 |
| Quản trị | `GET /api/users?page=&limit=` · `GET /api/users/:id` · `PATCH /api/users/:id { role?, isActive?, isDemo? }` · `DELETE /api/users/:id` → `200 { id, result: "DELETED" \| "ANONYMIZED" }` (có thanh toán / đơn / xu đã mua thì ẩn danh hóa) | ADMIN | 16 |
| Quản trị | `POST /api/admin/users/:id/credits` (cấp xu tay), `GET /api/admin/analytics/xu?month=` | ADMIN | 11.3 |
| Dự án | `POST` · `GET /api/projects`, `GET` · `PATCH` · `DELETE /api/projects/:id` | Đăng nhập / chủ dự án | 5 |
| Dự án | `PATCH /api/projects/:id/status` · `/visibility`, `POST /api/projects/:id/duplicate` · `/formula-upgrade` · `/events` | Chủ dự án | 5.4, 6.1, 8 |
| Phiên bản | `GET` · `POST /api/projects/:id/snapshots`, `POST .../:snapshotId/restore`, `DELETE .../:snapshotId` | Chủ dự án | 6 |
| Xuất in | `POST` · `GET /api/projects/:id/exports`, `GET /api/projects/:id/exports/access`, `GET /api/exports/:jobId` | Chủ dự án | 7 |
| Đơn in | `POST /api/orders/sample` · `/sample/bundle`, `GET /api/orders/my-orders` · `/api/orders/:id` | Đăng nhập (chủ đơn) | 7.1 |
| Đơn in | `GET /api/orders`, `PATCH /api/orders/:id/status` | ADMIN, PRINT_SHOP | 7.1 |
| Xưởng in | `GET /api/print-shops?city=` · `/api/print-shops/:id` | Đăng nhập | 7.1 |
| Thanh toán | `POST` · `GET /api/payments`, `GET /api/payments/:id`, `POST .../simulate-confirm` · `.../simulate-transfer` | Đăng nhập (chủ thanh toán) | 7.2 |
| Thanh toán | `GET /api/payments/vnpay/return` (chủ thanh toán), `GET /api/payments/vnpay/ipn` · `POST /api/webhooks/sepay` (cổng gọi, có chữ ký / khóa) | — | 7.2, 7.3 |
| Đối soát | `GET /api/admin/bank-transactions`, `GET .../payment-preview/:reference`, `POST .../:id/resolve` | ADMIN | 7.3 |
| Ví, gói | `GET /api/billing/me`, `GET` · `PUT /api/billing/details`, `GET /api/billing/xu/history` | Đăng nhập | 7.2, 11.3 |
| Công khai | `GET /api/public/projects/:slug`, `POST .../fork`, `POST` · `DELETE .../like` | Public / đăng nhập | 8 |
| Thông báo | `GET /api/notifications`, `GET /api/notifications/unread-count`, `POST /api/notifications/:id/read`, `POST /api/notifications/read-all` | Đăng nhập (chỉ của mình) | 8.1 |
| Duyệt mẫu | `GET /api/projects/:id/review`, `POST` · `DELETE .../review/link`, `POST .../review/comments`, `PATCH` · `DELETE .../review/comments/:commentId` | Chủ dự án | 8.2 |
| Duyệt mẫu | `GET /api/review/:token`, `POST .../comments`, `POST .../approve` | Public (cầm link) | 8.2 |
| Mẫu | `GET /api/templates/structures` · `/hub` · `/:id` | Public | 9 |
| Thư viện | `GET /api/library/assets` · `/licenses` (Public); `GET /api/library/stock/photos`, `POST .../stock/photos/:id/import` (đăng nhập); `GET /api/library/assets/manage`, `POST /api/library/assets`, `PATCH /api/library/assets/:id` (ADMIN) | Xem cột Route | 9 |
| Lưu trữ | `POST /api/storage/presigned-upload`, `POST /api/storage/fonts/inspect`, `GET /api/storage/usage` → `{ tier, usedBytes, quotaBytes, fileCount }` | Đăng nhập | 4 |
| AI | `POST /api/ai/pattern`, `GET /api/ai/usage`, `GET /api/ai/models`, `POST` · `GET /api/ai/images`, `GET /api/ai/images/jobs/:id`, `POST /api/ai/images/:outputId/:tool`, `POST /api/ai/images/uploads/:tool` | Đăng nhập | 11 |
| Số liệu | `GET /api/analytics/summary?scope=&days=` | Đăng nhập | — |
| Mở hộp | `GET` · `POST` · `DELETE /api/projects/:id/unboxing`, `GET .../unboxing/qr` | Chủ dự án | 10 |
| Mở hộp | `GET /api/public/unboxing/:slug` | Public | 10 |
| Bộ sưu tập | `GET` · `POST /api/collections`, `GET` · `PATCH` · `DELETE /api/collections/:id` | Đăng nhập | 12 |

**Quản trị**: chỉ `role = ADMIN`; người khác nhận `403`. Admin không tự đổi role / tự khóa / tự xóa mình (`400`). Khóa
tài khoản (`isActive: false`) thu hồi mọi phiên của người đó, có hiệu lực ngay: request kế tiếp của người đó nhận `401`.

**Health**: `status: "degraded"` khi Redis lỗi (xuất file in và email tạm dừng); `worker: "down"` khi không có worker
nào chạy. Dùng cho trang trạng thái / giám sát, không cần gọi từ giao diện người dùng.

**WebSocket** (`socket.io-client`): `io(`${API_ORIGIN}/events`, { path: '/api/socket.io', withCredentials: true })`,
xác thực bằng cookie `wf_access` (hết hạn thì refresh rồi kết nối lại). Có `emit('ping')` → sự kiện `pong`
`{ timestamp }`. Server đẩy hai sự kiện tới các tab của chính người dùng:
- `notifications.changed` (payload `{}`) khi hộp thư của tôi có dòng mới (remix, file in xong ở worker qua Redis): hỏi lại
  `GET /api/notifications/unread-count` (mục 8.1);
- `project.saved` `{ projectId, version, updatedAt, tabId }` khi tôi lưu một dự án ở tab khác: tab đang mở dự án đó tải
  bản mới (mục 5.3.1).

Trạng thái xuất file in, thanh toán và ảnh AI vẫn lấy bằng polling (mục 7, 11). Qua proxy `/api/*` của Next.js dev, dùng thêm `addTrailingSlash: false` (server nhận cả hai dạng).

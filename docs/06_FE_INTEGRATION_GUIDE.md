# 11 — Hướng dẫn tích hợp Frontend ↔ Backend

> **Dành cho**: team Frontend (Next.js) khi dựng lại FE.
> **Khớp với**: backend nhánh `test-model`, migration `20261008000600`. Ngày cập nhật: 2026-10-07.
> **Nguồn sự thật khi có mâu thuẫn**: Swagger `http://localhost:8080/api/docs` (sinh từ code đang chạy), sau đó là
> [`03_API_DESIGN.md`](03_API_DESIGN.md). Tài liệu này giải thích *cách dùng* các API đó cho đúng.

Mục lục: [1. Kết nối](#1-kết-nối-và-phiên-đăng-nhập) · [2. Lỗi](#2-định-dạng-lỗi-và-mã-lỗi) ·
[3. Tài khoản](#3-tài-khoản-đăng-ký-xác-minh-đăng-nhập-mật-khẩu) · [4. Upload](#4-upload-file-và-quy-tắc-url-ảnh) ·
[5. Editor](#5-dự-án-và-editor) · [6. Phiên bản](#6-mốc-phiên-bản-snapshots) · [7. Xuất file in](#7-xuất-file-in) ·
[8. Chia sẻ](#8-chia-sẻ-remix-thả-tim) · [9. Thư viện mẫu](#9-thư-viện-mẫu) · [10. Mở hộp](#10-mở-hộp-3d-qua-qr) ·
[11. AI](#11-ai-sinh-hoa-văn) · [12. Hồ sơ](#12-hồ-sơ-brand-kit-bộ-sưu-tập) ·
[13. Lệch hiện tại](#13-những-chỗ-apiclientts-hiện-tại-lệch-backend) · [14. Kiểu dữ liệu](#14-kiểu-dữ-liệu-typescript) ·
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
| 422 | — (có `fitCheck`) | Xuất file in khi FitCheck còn lỗi | Mở bảng FitCheck với `fitCheck.violations` |
| 429 | — | Vượt giới hạn tần suất | Thông báo "thử lại sau ít phút", có thể đọc header `Retry-After` |
| 503 | — | Storage / hàng đợi chưa cấu hình hoặc đang lỗi | Thông báo tạm thời, cho thử lại |

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

- `PUT` phải gửi **đúng** `headers` nhận được và đúng file đã khai báo (`Content-Type`, dung lượng `size`): khác đi thì
  bucket trả `403`. URL ký hết hạn sau 5 phút. `projectId` (tùy chọn) gắn file vào dự án: file bị xóa cùng dự án.
- Lỗi xin URL: sai định dạng `400`, quá dung lượng `413`, hết hạn mức `403` (FREE 100 MB, STARTER 1 GB, PRO_BUSINESS
  10 GB; xem `GET /api/storage/usage`), chưa cấu hình storage `503`.
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

- `templateId`: `tuck-top` | `sleeve-drawer` | `lid-base` | `pillow`. Giới hạn kích thước từng cấu trúc:
  `GET /api/templates/structures` → `dimensionLimits` (dùng để validate form trước khi gửi).
- `paperThickness` bỏ trống → lấy `materialSpec.caliper`. Mặc định `materialSpec = { type: "ivory", gsm: 300,
  caliper: 0.35, finish: "matte" }`, `canvasState = { elements: [] }`.
- Tìm kiếm dùng tham số **`q`** (tiêu đề hoặc đúng 1 tag), không phải `search`. Danh sách không có `canvasState`.
- **`formulaVersion`** (trong `ProjectDetail`): phiên bản công thức dieline mà dự án được chốt khi tạo. Editor phải
  dựng dieline / 3D / FitCheck bằng `generateDielinePieces(templateId, dimensions, formulaVersion)` của
  `@wrapfit/shared`, **không** gọi thẳng `generateTuckTopDieline`…, để hình trên màn hình khớp đúng file in.
  Các phiên bản (`shared/src/parametric/registry.ts`): **1** bản đầu (hộp nắp gài: nắp trên đè mặt sau khi W > H,
  chưa có nét cắt); **2** (từ 2026-10-11, dự án mới) hộp nắp gài có nắp và đáy gắn vào mặt sau, tai gài, tai chống
  bụi, tai dán và nét cắt; 3 cấu trúc còn lại giống bản 1, kích thước các mặt không đổi nên điểm FitCheck không đổi.
  Dự án cũ giữ phiên bản 1.

### 5.2. `canvasState`

```ts
{ elements: CanvasElement[];            // tối đa 300 phần tử
  backgroundPattern?: string | null;    // id preset [a-z0-9_-]{1,40}, không phải SVG / CSS
  backgroundTheme?: string | null;
  materialTheme?: string | null; }
```

- `CanvasElement`: `id` ≤ 64, `type` `text|logo|image|pattern|barcode`, `panelId` (`panel_front` hoặc `front`),
  `x, y, width, height, rotation` (mm, so với mặt hộp), `content` (chữ, hoặc URL ảnh — mục 4) ≤ 5000,
  `style?` (`fontFamily` ≤ 100, `fontSize` 1–1000, `color` / `fillColor`, `opacity` 0–1), `dpi?` 1–2400.
- Body request tối đa 1 MB.

### 5.3. Lưu (autosave) và xung đột giữa hai tab

```http
PATCH /api/projects/:id   { "version": 7, "canvasState": {...}, "dimensions"?: {...}, "title"?: "...", "thumbnailUrl"?: "...|null", ... }
200 ProjectDetail (version: 8)
409 { "code": "PROJECT_VERSION_CONFLICT", "currentVersion": 9 }
```

- **Luôn gửi `version`** đang giữ; lấy `version` từ response để lần lưu sau dùng. Bị `409` nghĩa là tab / thiết bị khác
  vừa lưu: hỏi người dùng *Tải bản mới* (GET lại) hoặc *Ghi đè* (gửi lại với `version: currentVersion`).
- Chỉ gửi trường thay đổi; `null` xóa `collectionId`, `thumbnailUrl`, `occasion`, `industry`. Không đổi được
  `templateId`. Dự án trong thùng rác: `409` cho mọi thao tác sửa.
- Mỗi lần đổi `canvasState` / `dimensions`, server chạy lại FitCheck và trả `fitcheckState`
  (`{ isValidForProduction, score, violations[] }`) + `fitcheckScore`: hiển thị theo bản của server.
- Thumbnail: render canvas thành ảnh → upload `purpose: THUMBNAIL` (+ `projectId`) → `PATCH { thumbnailUrl }`.

### 5.4. Vòng đời

```http
PATCH  /api/projects/:id/status      { "status": "ARCHIVED" | "DELETED" | "ACTIVE" }
DELETE /api/projects/:id             (chỉ khi đang DELETED, nếu không 409)   → 204
POST   /api/projects/:id/duplicate   → 201 ProjectDetail  ("[Bản sao] <tên>", không chép thumbnail)
```

- "Xóa" trên Dashboard = chuyển vào thùng rác (`status: DELETED`); "Xóa vĩnh viễn" chỉ có trong thùng rác. Thùng rác tự
  xóa sau 30 ngày: hạn = `deletedAt + 30 ngày` (FE tự tính để hiển thị).

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

## 7. Xuất file in

```http
POST /api/projects/:id/exports   { "fileType": "PDF_CMYK" | "SVG" | "DXF" }
202 { "jobId": "…", "status": "PENDING", "fitCheck": {...} }
422 { "message": "FitCheck found errors…", "fitCheck": { "violations": [...] } }
GET  /api/exports/:jobId   → { id, projectId, fileType, status, error, createdAt, completedAt, fileName, downloadUrl, downloadExpiresIn }
GET  /api/projects/:id/exports   → 20 lần xuất gần nhất
```

- Hỏi trạng thái mỗi 2 giây: `PENDING` → `PROCESSING` → `COMPLETED` (có `downloadUrl`, hết hạn sau 15 phút: hết hạn
  thì GET lại để lấy link mới) hoặc `FAILED` (`error`). Không có trường `progress`.
- Chỉ ảnh upload lên WrapFit được nhúng vào file in. Tối đa 10 yêu cầu xuất / phút.

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
POST   /api/projects/:id/unboxing  { "recipientName", "giftNote", "audioTrackUrl"?: "https://…", "particleEffect"? }  → 201 lần đầu / 200 khi sửa
DELETE /api/projects/:id/unboxing          → 204
GET    /api/projects/:id/unboxing/qr?format=png|svg   → tải file QR
GET    /api/public/unboxing/:slug          → { recipientName, giftNote, audioTrackUrl, particleEffect, viewsCount, sender { fullName, shopName, avatarUrl }, box { title, template, dimensions, materialSpec, canvasState, thumbnailUrl } }
```

- `particleEffect`: `confetti` (mặc định) | `fireworks` | `hearts` | `petals` | `snow` | `none`.
- `recipientName` ≤ 100, `giftNote` ≤ 2000. `slug` không đổi khi sửa (QR có thể đã in). Trang FE: `/unbox/[slug]`.
- `qrCodeUrl` / `qrCodeSvgUrl` là `null` khi storage chưa cấu hình: dùng endpoint `.../unboxing/qr`.

## 11. AI sinh hoa văn

```http
POST /api/ai/pattern   { "theme": "Tết hoa mai", "preferredColors"?: ["#D4AF37"] }
→ { "source": "ai" | "procedural", "themeName", "description", "palette": ["#…"], "tile": { "size": 120, "svg": "<svg…>" }, "usage": { "used", "limit" } | null }
GET  /api/ai/usage     → { tier, used, limit, aiEnabled }
```

- `tile.svg` là ô lặp liền mạch, an toàn để chèn (không script / tài nguyên ngoài). Hết lượt trong 24 giờ → `429`.
  Tối đa 5 yêu cầu / phút.

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

## 13. Những chỗ `apiClient` hiện tại lệch backend

Danh sách sửa khi dựng lại FE (các module trong [`fe/src/api/`](../fe/src/api/), kiểu dữ liệu ở [`fe/src/types/api/`](../fe/src/types/api/index.ts)):

| Chỗ lệch | Hiện tại | Đúng theo backend |
|---|---|---|
| Đăng ký / đăng nhập | Chưa có trang và hàm nào | Mục 3: 7 trang, xử lý `EMAIL_NOT_VERIFIED` |
| Làm mới phiên | Không xử lý `401` | Refresh 1 lần rồi gửi lại (mục 1) |
| `listProjects` | Tham số `search`; đọc `{ items, total }` | Tham số `q`; response `{ items, meta: { total, page, limit, totalPages } }` |
| `uploadFileToStorage` | `purpose: "CANVAS_IMAGE" \| "PROJECT_THUMBNAIL"` | `LOGO` \| `IMAGE` \| `THUMBNAIL` \| `AVATAR` |
| `uploadFileToStorage` | Tự đặt header `PUT`; lỗi thì trả data URL | Dùng đúng `ticket.method` + `ticket.headers`; kiểm tra `put.ok`; **không** dùng data URL (bị từ chối khi lưu) |
| `deleteProject` (Dashboard) | Gọi `DELETE` trực tiếp | Trước hết `PATCH .../status { DELETED }`; `DELETE` chỉ trong thùng rác |
| `AiPatternResponse` | `{ theme, palette, svgTile }` | `{ source, themeName, description, palette, tile: { size, svg }, usage }` |
| `ExportJobStatus` | Có `progress`, thiếu `downloadExpiresIn` | Mục 7 |
| `SnapshotDto` | Có `projectId` | `{ id, name, previewUrl, dimensions, createdAt }` |
| `PublicUnboxingData` | `project`, `slug`, `qrCodeUrl`; hiệu ứng `sparkles`, `stars` | `box`, `sender`; không có `slug` / `qrCodeUrl`; hiệu ứng ở mục 10 |
| Dieline trong editor | Gọi thẳng `generateTuckTopDieline`… | `generateDielinePieces(templateId, dimensions, formulaVersion)` |
| Dữ liệu giả khi lỗi | Nhiều hàm `catch` trả dữ liệu mẫu | Chỉ dùng cho demo offline; khi tích hợp nên hiển thị lỗi thật để không che lỗi API |

## 14. Kiểu dữ liệu TypeScript

Kiểu hình học, canvas, FitCheck lấy từ `@wrapfit/shared` (`BoxDimensions`, `MaterialSpecification`, `CanvasState`,
`CanvasElement`, `FitCheckReport`, `BrandKit`, `generateDielinePieces`). Các response chính:

```ts
export interface SafeUser {
  id: string; email: string; emailVerifiedAt: string | null;
  fullName: string | null; avatarUrl: string | null; shopName: string | null;
  role: 'MAKER' | 'PRO_ARTISAN' | 'PRINT_SHOP' | 'ADMIN';
  subscriptionTier: 'FREE' | 'STARTER' | 'PRO_BUSINESS';
  brandKit: BrandKit | null; referralCode: string | null; isActive: boolean;
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
  industry: 'COSMETICS' | 'CANDLES' | 'BAKERY' | 'JEWELRY' | 'TEA_AGRI' | null;
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
  code?: 'EMAIL_NOT_VERIFIED' | 'AUTH_TOKEN_INVALID' | 'AUTH_TOKEN_EXPIRED' | 'AUTH_TOKEN_CONSUMED'
       | 'FILE_URL_NOT_ALLOWED' | 'FILE_NOT_OWNED' | 'PROJECT_VERSION_CONFLICT';
  currentVersion?: number; fitCheck?: FitCheckReport;
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

Toàn bộ 56 route HTTP của backend và mục tài liệu tương ứng. Route nào chưa có ở đây thì chưa tồn tại ở backend.

| Nhóm | Route | Quyền | Mục |
|---|---|---|---|
| Hệ thống | `GET /api/health` → `{ status: "ok" \| "degraded", database, redis, worker, exportQueue, uptime, timestamp }` | Public | 16 |
| Auth | `POST /api/auth/register` · `/login` · `/refresh` · `/logout` · `/logout-all` | Public (logout-all: đăng nhập) | 1, 3 |
| Auth | `GET /api/auth/me` | Đăng nhập | 1 |
| Auth | `GET /api/auth/google` · `/google/callback` | Public (điều hướng trình duyệt) | 3.5 |
| Auth | `POST /api/auth/verify-email` · `/verify-email/resend` · `/password/forgot` · `/password/reset` | Public | 3 |
| Người dùng | `GET` · `PATCH /api/users/me`, `PATCH /api/users/me/brand-kit` | Đăng nhập | 12 |
| Quản trị | `GET /api/users?page=&limit=` · `GET /api/users/:id` · `PATCH /api/users/:id { role?, isActive? }` · `DELETE /api/users/:id` | ADMIN | 16 |
| Dự án | `POST` · `GET /api/projects`, `GET` · `PATCH` · `DELETE /api/projects/:id` | Đăng nhập / chủ dự án | 5 |
| Dự án | `PATCH /api/projects/:id/status` · `/visibility`, `POST /api/projects/:id/duplicate` | Chủ dự án | 5.4, 8 |
| Phiên bản | `GET` · `POST /api/projects/:id/snapshots`, `POST .../:snapshotId/restore`, `DELETE .../:snapshotId` | Chủ dự án | 6 |
| Xuất in | `POST` · `GET /api/projects/:id/exports`, `GET /api/exports/:jobId` | Chủ dự án | 7 |
| Công khai | `GET /api/public/projects/:slug`, `POST .../fork`, `POST` · `DELETE .../like` | Public / đăng nhập | 8 |
| Mẫu | `GET /api/templates/structures` · `/hub` · `/:id` | Public | 9 |
| Lưu trữ | `POST /api/storage/presigned-upload`, `GET /api/storage/usage` → `{ tier, usedBytes, quotaBytes, fileCount }` | Đăng nhập | 4 |
| AI | `POST /api/ai/pattern`, `GET /api/ai/usage` | Đăng nhập | 11 |
| Mở hộp | `GET` · `POST` · `DELETE /api/projects/:id/unboxing`, `GET .../unboxing/qr` | Chủ dự án | 10 |
| Mở hộp | `GET /api/public/unboxing/:slug` | Public | 10 |
| Bộ sưu tập | `GET` · `POST /api/collections`, `GET` · `PATCH` · `DELETE /api/collections/:id` | Đăng nhập | 12 |

**Quản trị**: chỉ `role = ADMIN`; người khác nhận `403`. Admin không tự đổi role / tự khóa / tự xóa mình (`400`). Khóa
tài khoản (`isActive: false`) thu hồi mọi phiên của người đó, có hiệu lực ngay: request kế tiếp của người đó nhận `401`.

**Health**: `status: "degraded"` khi Redis lỗi (xuất file in và email tạm dừng); `worker: "down"` khi không có worker
nào chạy. Dùng cho trang trạng thái / giám sát, không cần gọi từ giao diện người dùng.

**WebSocket** (`socket.io-client`): `io(`${API_ORIGIN}/events`, { path: '/api/socket.io', withCredentials: true })`,
xác thực bằng cookie `wf_access` (hết hạn thì refresh rồi kết nối lại). Hiện mới có `emit('ping')` → sự kiện `pong`
`{ timestamp }`. **Backend chưa đẩy sự kiện nghiệp vụ nào** (xuất file xong, có người remix...): trạng thái xuất file
in vẫn lấy bằng polling (mục 7). Khi backend thêm sự kiện, danh sách sẽ được bổ sung ở đây.

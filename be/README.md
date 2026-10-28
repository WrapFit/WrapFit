# WrapFit Backend (NestJS)

REST API của nền tảng **WrapFit** — thiết kế & đóng gói bao bì quà tặng (tham chiếu Pacdora.com).
Đây là workspace `be/` (`@wrapfit/backend`) trong monorepo WrapFit. Kiến trúc và phân công nhiệm vụ: xem [`docs/07_SYSTEM_BLUEPRINT_AND_TASK_BREAKDOWN.md`](../docs/07_SYSTEM_BLUEPRINT_AND_TASK_BREAKDOWN.md) và [`docs/08_PACDORA_SYSTEM_CLASS_DIAGRAM_SPECIFICATION.md`](../docs/08_PACDORA_SYSTEM_CLASS_DIAGRAM_SPECIFICATION.md).

- **NestJS 11** theo kiến trúc modular monolith, mã nguồn tổ chức theo skeleton [nestjs-project-structure](https://github.com/CatsMiaow/nestjs-project-structure) (mục [Cấu trúc thư mục](#cấu-trúc-thư-mục))
- **2 process từ cùng mã nguồn**: API HTTP (`dist/app.js`) và worker BullMQ + Redis (`dist/worker.js`) xuất file in, gửi email
- **PostgreSQL 16 + Prisma 6** — Schema v2.1 (migration, seed)
- **Auth**: email/mật khẩu + **Google OAuth 2.0**, JWT trong **HttpOnly Cookie** (refresh token xoay vòng, phát hiện dùng lại token, nhiều thiết bị) và **RBAC** theo `Role`
- **WebSocket** (Socket.IO) có xác thực JWT ở bước handshake
- **Swagger/OpenAPI** tại `/api/docs`
- **Validation** (class-validator), cấu hình có kiểu theo `NODE_ENV` (kiểm tra biến môi trường khi khởi động), logging request, exception filter thống nhất, rate limit, helmet, CORS
- **Docker**: image build từ gốc repo (`be/Dockerfile`), chạy cùng PostgreSQL + Frontend bằng `docker-compose.yml` ở gốc

## Trạng thái so với WBS (tài liệu 07, Mục 5.3)

| Task | Trạng thái |
| --- | --- |
| IT3-01 Khởi tạo NestJS, hạ tầng chung & Schema v2.1 | ✅ Xong (Redis thêm ở IT3-11) |
| IT3-02 Auth Google & JWT | ✅ Xong: email/mật khẩu, Google OAuth, HttpOnly Cookie, refresh token xoay vòng, RBAC, rate limit |
| IT3-03 API CRUD dự án, lọc trạng thái & thư mục | ✅ Xong: tạo / danh sách (lọc `status`, `collectionId`, tìm `q`, sắp xếp, phân trang) / xem / sửa / xóa vĩnh viễn, `ProjectOwnerGuard` |
| IT3-04 Trạng thái, nhân bản & snapshot | ✅ Xong: lưu trữ / thùng rác / khôi phục, nhân bản, lịch sử phiên bản (tạo, khôi phục kèm bản lưu dự phòng, xóa), cron 02:00 dọn thùng rác quá 30 ngày (kèm file trên S3/R2 từ IT3-08) |
| IT3-05 Bộ sưu tập (collections) | ✅ Xong: CRUD `/api/collections`, màu `#RRGGBB`, đếm dự án (không tính thùng rác), xóa thư mục giữ lại dự án |
| IT3-06 Public Showcase & Remix | ✅ Xong: quyền riêng tư `PRIVATE/UNLISTED/PUBLIC` + `allowFork`, trang công khai theo slug (đếm view), Remix (fork + sự kiện `project.forked`), thả tim |
| IT3-07 Thư viện mẫu | ✅ Xong: `/api/templates/structures`, `/hub` (Curated + Community, lọc cấu trúc / dịp lễ / ngành hàng / giấy / từ khóa, cache 60 s), `/:id`; tạo dự án từ mẫu (`designTemplateId`); bảng `design_templates` + 6 mẫu seed |
| IT3-08 Lưu trữ file S3 / R2 | ✅ Xong: pre-signed upload (khóa định dạng + dung lượng), hạn mức theo gói, xóa file khi xóa dự án / dọn thùng rác; SeaweedFS local thay MinIO (chưa có `sharp`) |
| IT3-09 AI sinh hoa văn | ✅ Xong: `/api/ai/pattern` (Claude + structured outputs, SVG dựng & làm sạch phía server, lặp liền mạch), giới hạn lượt theo gói, dự phòng sinh hoa văn bằng thuật toán khi chưa có API key |
| IT3-10 Mở hộp 3D & QR | ✅ Xong: cấu hình lời chúc / nhạc / hiệu ứng, QR (PNG 1200 px + SVG, sửa lỗi mức H) lưu lên storage và tải trực tiếp, trang công khai `/api/public/unboxing/:slug` |
| IT3-11 Xuất file in & CI/CD | ✅ Xong: `/api/projects/:id/exports` (FitCheck phía server → BullMQ), process `worker` riêng xuất PDF CMYK / SVG / DXF, thử lại 3 lần, link tải 15 phút, snapshot tự động; CI chạy unit + e2e; deploy VPS qua HTTPS (Caddy) |

## Cấu trúc thư mục

Theo skeleton [CatsMiaow/nestjs-project-structure](https://github.com/CatsMiaow/nestjs-project-structure): mỗi module nghiệp vụ nằm thẳng dưới `src/`, hạ tầng dùng chung ở `common/` và `shared/`, cấu hình ở `config/`.

```
prisma/
  schema.prisma            # Schema v2.1: users, packaging_projects, box_templates, collections, snapshots...
  migrations/              # SQL migration
  seed.ts                  # admin + 4 mẫu hộp (tuck-top, sleeve-drawer, lid-base, pillow) + collection/dự án mẫu
src/
  app.ts                   # khởi động API (HTTP) -> dist/app.js
  worker.ts                # khởi động worker BullMQ (không mở cổng HTTP) -> dist/worker.js
  repl.ts                  # shell tương tác trên module API: npm run start:repl
  mail-test.ts             # gửi thử 1 email bằng cấu hình SMTP hiện tại
  storage-check.ts         # kiểm tra kết nối bucket R2 / S3 và Cloudinary (chỉ đọc): npm run storage:check
  app.middleware.ts        # cấu hình dùng chung (request id, helmet, CORS, prefix /api, ValidationPipe)
  app.module.ts            # ghép module + guard/filter/interceptor toàn cục
  swagger.ts
  config/
    env.validation.ts      # kiểm tra + giá trị mặc định của biến môi trường
    envs/default.ts        # gom biến môi trường thành cấu hình lồng nhau (app, auth, storage, mail...)
    envs/production.ts     # khác biệt theo NODE_ENV (development.ts, test.ts: chưa có gì)
    configuration.ts       # default + file của NODE_ENV, nạp bằng ConfigModule.forRoot({ load })
    logger.config.ts       # AppLogger (JSON ở production, kèm request id)
  common/                  # @Global CommonModule: ConfigService có kiểu, decorators, guards, filters,
                           # interceptors, dto, constants, utils...
  shared/
    prisma/                # PrismaModule (global) + PrismaService
    queue/                 # kết nối BullMQ (Redis)
    redis/                 # RedisModule (global): client ioredis `REDIS` cho bộ đếm nhỏ (đăng nhập sai, lượt xem)
    cloudinary/            # CloudinaryModule (global): CloudinaryService, CDN ảnh công khai (chưa dùng)
  auth/                    # register, login, refresh, logout, Google OAuth, JwtAuthGuard
  base/                    # GET /api/health
  users/                   # hồ sơ cá nhân + quản trị user (ADMIN)
  projects/                # CRUD dự án, 4 tầng: presentation / application / domain / infrastructure
  collections/             # thư mục dự án (CRUD gọn: controller -> service -> Prisma)
  public-showcase/         # trang công khai /p/[slug], Remix (fork), thả tim
  templates/               # Thư viện mẫu Curated & Community (cache 60 s)
  storage/                 # @Global: pre-signed upload lên S3 / R2, hạn mức, xóa file
  ai/                      # sinh bảng màu + hoa văn SVG (Claude hoặc thuật toán dự phòng)
  unboxing/                # trải nghiệm mở hộp 3D + mã QR in đáy hộp
  export/                  # xuất file in: API (hàng đợi) + ExportProcessor (worker) + rendering/
  mail/                    # MailService (đưa vào hàng đợi) + MailProcessor (worker gửi SMTP)
  events/                  # WebSocket gateway (thông báo realtime)
test/
  e2e/                     # e2e test (*.e2e-spec.ts) + helpers/
```

**Quy ước**

- Module nhỏ để phẳng (`<ten>.module.ts`, `.controller.ts`, `.service.ts`, `dto/`); chỉ thêm thư mục con khi module lớn (`auth/guards`, `export/rendering`, 4 tầng của `projects/`).
- Mỗi module có `index.ts` export class module và những gì module khác dùng. Import module khác qua thư mục: `from '../common'`, `from '../users'`. Trong cùng module import thẳng file; không import `'.'` hay `'..'`.
- `common/` và `shared/` không import module nghiệp vụ. ESLint (`import/no-cycle`) báo lỗi nếu có vòng import.
- Đọc cấu hình bằng `ConfigService` của `common/` (không dùng bản của `@nestjs/config`): `config.get('auth.jwt.accessTtlSeconds')` trả về `number`, đường dẫn sai thì ném lỗi. Thêm biến môi trường: khai báo trong `config/env.validation.ts`, rồi đặt vào `config/envs/default.ts`.

**Khác skeleton**: dùng Prisma thay TypeORM (không có `src/entity/`, schema ở `prisma/`); có thêm entry `worker.ts` và `mail-test.ts` (cả hai chạy trong container production nên nằm trong `src/`, không ở `bin/`); `AuthController` ở `auth/` chứ không ở `base/`; `ValidationPipe` và middleware request id đăng ký trong `app.middleware.ts` để request id có mặt từ middleware đầu tiên; giữ Jest thay Vitest; không khai báo `Express.User` toàn cục vì `req.user` là `GoogleProfile` ở callback OAuth.

## Chạy nhanh (local)

Yêu cầu: Node.js >= 20, Docker. Các lệnh dưới đây chạy **tại gốc repo** (`WrapFit/`).

```bash
npm install                                  # cài toàn bộ workspace (fe, be, shared)
docker compose up -d postgres                # chỉ chạy database (postgres / password, db: wrapfit)
docker compose up -d seaweedfs storage-init  # lưu trữ file S3 local (cổng 8333, bucket wrapfit + wrapfit-private)
docker compose up -d redis                   # hàng đợi BullMQ (xuất file in, email)
docker compose up -d mailpit                 # bắt mọi email (xác minh, quên mật khẩu): xem tại http://localhost:8025
cp be/.env.example be/.env                   # nhớ đổi JWT_ACCESS_SECRET / JWT_REFRESH_SECRET
npm run build:shared                         # backend đọc @wrapfit/shared từ shared/dist (chạy lại khi shared/ đổi)
npm --workspace=be run db:generate
npm --workspace=be run db:migrate            # áp dụng migration vào database dev
npm --workspace=be run db:seed               # tạo 4 mẫu hộp + admin: admin@wrapfit.vn / Admin@12345 + dữ liệu mẫu
npm run dev:be                               # = npm --workspace=be run dev (watch mode)
npm --workspace=be run dev:worker           # terminal thứ 2: worker xuất file in + gửi email
```

Hoặc `cd be` rồi dùng trực tiếp `npm run <script>`.

Gộp tất cả thành một lệnh (từ gốc repo, sau `npm install` và `cp be/.env.example be/.env`): `npm run dev:all` chạy các bước
trên (migration bằng `db:deploy`, không hỏi tên migration) rồi API, worker, frontend trong một terminal. `npm run dev:setup`
chỉ làm phần Docker + database.

`dev` build vào `dist/`, `dev:worker` build vào `dist-worker/` (`tsconfig.worker.json`): `nest start --watch` xóa thư mục build khi khởi động, nên hai process dùng chung `dist/` thì bật process này sẽ làm process kia dừng với `Cannot find module ...dist\worker`.

- API: `http://localhost:8080/api`
- Swagger: `http://localhost:8080/api/docs`
- Health: `http://localhost:8080/api/health`

> **Vì sao cổng 8080?** Next.js (frontend) dùng cổng 3000. Trên Windows, Hyper-V/WSL thường giữ chỗ các dải cổng quanh 3500–5000 (ví dụ 4000 sẽ báo `EACCES`). Kiểm tra bằng `netsh interface ipv4 show excludedportrange protocol=tcp` nếu cần đổi cổng.

## Chạy toàn bộ bằng Docker

```bash
# tại gốc repo
cp .env.example .env            # điền JWT_ACCESS_SECRET / JWT_REFRESH_SECRET trước khi chạy
docker compose up -d --build
```

Container backend tự chạy `prisma migrate deploy` và seed 4 mẫu hộp rồi mới khởi động server. Ở production, admin chỉ được tạo khi đặt `SEED_ADMIN_PASSWORD`.

Stack gồm: `postgres`, `redis`, `seaweedfs` (+ `storage-init` tạo bucket), `backend` (API), `worker` (cùng image, lệnh `worker`, chỉ chạy hàng đợi xuất file), `frontend`.

## Biến môi trường

Xem `.env.example`. Ứng dụng sẽ **từ chối khởi động** (cả API lẫn worker) nếu thiếu `DATABASE_URL` hoặc secret JWT ngắn hơn 32 ký tự.

Biến môi trường được kiểm tra trong `src/config/env.validation.ts`, rồi gom thành cấu hình lồng nhau trong `src/config/envs/default.ts` (ghi đè theo `NODE_ENV` ở `envs/production.ts`...). Code đọc bằng `ConfigService` của `src/common` theo cột **Khóa cấu hình**, ví dụ `config.get('auth.jwt.accessTtlSeconds')` trả về `number`; các biến `true` / `false` trở thành boolean.

| Biến | Khóa cấu hình | Mặc định | Ý nghĩa |
| --- | --- | --- | --- |
| `NODE_ENV` | `app.env` | `development` | `development` / `production` / `test`; chọn file ghi đè trong `config/envs/` |
| `PORT` | `app.port` | `8080` | Cổng server |
| `DATABASE_URL` | – (Prisma đọc trực tiếp) | – | Chuỗi kết nối PostgreSQL (database `wrapfit`) |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | `auth.jwt.accessSecret` / `auth.jwt.refreshSecret` | – | Secret ký token (>= 32 ký tự, hai giá trị khác nhau) |
| `JWT_ACCESS_TTL_SECONDS` | `auth.jwt.accessTtlSeconds` | `900` | Thời hạn access token (15 phút) |
| `JWT_REFRESH_TTL_SECONDS` | `auth.jwt.refreshTtlSeconds` | `604800` | Thời hạn refresh token (7 ngày) |
| `AUTH_TOKEN_SECRET` | `auth.tokenSecret` | *(= `JWT_REFRESH_SECRET`)* | Sinh link một lần trong email xác minh / đặt lại mật khẩu (>= 32 ký tự nếu đặt). Đổi giá trị chỉ vô hiệu các link đã gửi |
| `BCRYPT_ROUNDS` | `auth.bcryptRounds` | `10` | Độ khó băm mật khẩu |
| `COOKIE_SECURE` | `auth.cookieSecure` | *(tự động)* | `Secure` cho cookie đăng nhập; trống = tắt ở development, bật ở production (`envs/production.ts`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | `auth.google.clientId` / `.clientSecret` | *(trống)* | Google OAuth; để trống cả hai = tắt đăng nhập Google |
| `GOOGLE_CALLBACK_URL` | `auth.google.callbackUrl` | `http://localhost:8080/api/auth/google/callback` | Phải nằm trong *Authorized redirect URIs* của OAuth client |
| `CORS_ORIGINS` | `app.corsOrigins` | `*` | Danh sách origin, ngăn cách bằng dấu phẩy. Phải là origin cụ thể (vd. `http://localhost:3000`) để trình duyệt gửi cookie |
| `FRONTEND_URL` | `app.frontendUrl` | `http://localhost:3000` | Trang frontend: đích sau khi đăng nhập Google, gốc của link trong email và mã QR |
| `SWAGGER_ENABLED` | `app.swaggerEnabled` | `true` | Bật/tắt `/api/docs` |
| `TRUST_PROXY` | `app.trustProxy` | `false` | `true` khi chạy sau reverse proxy (Caddy) |
| `THROTTLE_TTL_SECONDS` / `THROTTLE_LIMIT` | `throttle.ttlSeconds` / `throttle.limit` | `60` / `100` | Rate limit mặc định (theo IP) |
| `STORAGE_BUCKET` | `storage.bucket` | *(trống)* | Bucket S3 / R2; để trống = tắt upload (API trả `503`) |
| `STORAGE_PRIVATE_BUCKET` | `storage.privateBucket` | *(= `STORAGE_BUCKET`)* | Bucket **không có URL công khai** chứa file xuất in (key `private/...`), chỉ tải qua link pre-signed 15 phút. Để trống = dùng bucket công khai (log cảnh báo); `docker-compose.prod.yml` bắt buộc đặt |
| `STORAGE_ENDPOINT` | `storage.endpoint` | *(trống)* | R2: `https://<account-id>.r2.cloudflarestorage.com`; SeaweedFS local: `http://localhost:8333`; AWS S3: để trống |
| `STORAGE_PUBLIC_ENDPOINT` | `storage.publicEndpoint` | *(= `STORAGE_ENDPOINT`)* | Địa chỉ ghi vào pre-signed URL khi trình duyệt truy cập storage bằng địa chỉ khác backend (Docker) |
| `STORAGE_REGION` | `storage.region` | `auto` | `auto` cho R2, `us-east-1` cho SeaweedFS |
| `STORAGE_ACCESS_KEY_ID` / `STORAGE_SECRET_ACCESS_KEY` | `storage.accessKeyId` / `.secretAccessKey` | – | Khóa API của bucket (R2: *R2 API Token*) |
| `STORAGE_PUBLIC_URL` | `storage.publicUrl` | – | URL công khai để đọc file, vd. `https://cdn.wrapfit.vn` hoặc `http://localhost:8333/wrapfit` |
| `STORAGE_FORCE_PATH_STYLE` | `storage.forcePathStyle` | `false` | `true` cho SeaweedFS |
| `STORAGE_BACKUP_BUCKET` | `storage.backupBucket` | *(trống)* | Bucket R2 không công khai chứa bản dump DB đã mã hóa; job backup ghi, API không dùng. Chỉ `storage:check` đọc |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | `cloudinary.cloudName` / `.apiKey` / `.apiSecret` | *(trống)* | CDN ảnh công khai (`shared/cloudinary`). Đặt cả ba hoặc để trống cả ba (= tắt). Hiện chỉ có kết nối, chưa có dữ liệu nào đi qua |
| `CLOUDINARY_FOLDER` | `cloudinary.folder` | `wrapfit` | Thư mục gốc của môi trường trên Cloudinary, vd. `wrapfit-dev` ở máy dev |
| `ANTHROPIC_API_KEY` | `ai.anthropicApiKey` | *(trống)* | Khóa Claude API cho `/api/ai/pattern`; để trống = chỉ dùng hoa văn sinh bằng thuật toán (miễn phí) |
| `AI_MODEL` | `ai.model` | `claude-opus-5-5` | Model Claude dùng để sinh hoa văn |
| `AI_TIMEOUT_MS` | `ai.timeoutMs` | `30000` | Thời gian chờ tối đa mỗi lần gọi Claude |
| `REDIS_URL` | `redis.url` | `redis://localhost:6379` | Redis cho hàng đợi BullMQ (`rediss://` = TLS) |
| `EXPORT_CONCURRENCY` | `export.concurrency` | `2` | Số job xuất file một worker chạy song song |
| `SMTP_HOST` / `SMTP_PORT` | `mail.smtp.host` / `.port` | `localhost` / `1025` | SMTP của worker; mặc định là Mailpit trong `docker-compose.yml` (thư bị giữ lại, xem tại `http://localhost:8025`) |
| `SMTP_SECURE` | `mail.smtp.secure` | `false` | `true` = TLS ngay từ đầu (cổng 465); `false` = STARTTLS nếu server hỗ trợ (587) |
| `SMTP_USER` / `SMTP_PASS` | `mail.smtp.user` / `.pass` | *(trống)* | Đặt cả hai hoặc để trống cả hai (không xác thực) |
| `MAIL_FROM` | `mail.from` | `WrapFit <no-reply@wrapfit.local>` | Người gửi; ở production tên miền cần bản ghi SPF / DKIM |
| `LOG_FORMAT` | – (logger đọc trực tiếp) | *(tự động)* | `json` (một dòng JSON mỗi log) hoặc `text`; trống = `json` ở production |

## API hiện có

Mặc định mọi route đều yêu cầu đăng nhập (trừ những route ghi `public`). Xem đầy đủ và thử trực tiếp tại Swagger `/api/docs`.

| Method | Đường dẫn | Quyền | Mô tả |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | public | Đăng ký (`email`, `password`, `fullName`) → gửi email xác minh, chưa mở phiên đăng nhập |
| POST | `/api/auth/verify-email` | public | Xác minh email bằng token trong link → đăng nhập được |
| POST | `/api/auth/verify-email/resend` | public | Gửi lại link xác minh |
| POST | `/api/auth/password/forgot` / `/api/auth/password/reset` | public | Gửi link đặt lại mật khẩu / đặt mật khẩu mới bằng token |
| POST | `/api/auth/login` | public | Đăng nhập email & mật khẩu → đặt cookie đăng nhập |
| POST | `/api/auth/refresh` | public (cần cookie `wf_refresh`) | Xoay vòng refresh token, cấp access token mới |
| POST | `/api/auth/logout` | public | Thu hồi phiên hiện tại, xoá cookie |
| POST | `/api/auth/logout-all` | đã đăng nhập | Đăng xuất mọi thiết bị |
| GET | `/api/auth/google?redirect=/p/abc` | public | Bắt đầu "Đăng nhập bằng Google" (điều hướng trình duyệt, không gọi bằng fetch) |
| GET | `/api/auth/google/callback` | public | Google gọi lại → đặt cookie → chuyển về `FRONTEND_URL + redirect` |
| GET/PATCH | `/api/users/me` | đã đăng nhập | Xem / sửa hồ sơ (`fullName`, `shopName`, `avatarUrl`) |
| GET | `/api/users`, `/api/users/:id` | ADMIN | Danh sách (phân trang) / chi tiết user |
| PATCH | `/api/users/:id` | ADMIN | Đổi role, khoá/mở khoá tài khoản |
| DELETE | `/api/users/:id` | ADMIN | Xoá user |
| GET | `/api/health` | public | Kiểm tra server: `status`, `database`, `redis`, `worker` (up / down) |
| GET | `/api/health/details` | ADMIN | Như trên, thêm số job của hàng đợi xuất file và uptime |

Định dạng lỗi thống nhất (tài liệu 07, Mục 4.3):

```json
{ "statusCode": 401, "error": "Unauthorized", "message": "Unauthorized", "path": "/api/users/me", "timestamp": "..." }
```

## Xác thực bằng HttpOnly Cookie

Token **không bao giờ** nằm trong body response hay `localStorage`. Backend đặt 2 cookie `HttpOnly; SameSite=Lax` (thêm `Secure` ở production):

| Cookie | Path | Thời hạn | Vai trò |
| --- | --- | --- | --- |
| `wf_access` | `/api` | 15 phút | Access token, gửi kèm mọi request API và kết nối WebSocket |
| `wf_refresh` | `/api/auth` | 7 ngày | Refresh token, chỉ gửi tới `refresh` / `logout` |

Response của `register` / `login` / `refresh` chỉ gồm `{ user, expiresIn }`.

### Gọi API từ frontend (Next.js)

```ts
// Gọi thẳng cổng 8080 (cross-origin): bắt buộc credentials: 'include' và CORS_ORIGINS chứa origin của FE.
// Nếu dùng Next.js rewrites /api/* → backend (same-origin, khuyến nghị trong docs/07 Mục 1.2) thì cookie tự gửi.
const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/me`, { credentials: 'include' });

if (res.status === 401) {
  // Access token hết hạn: xin token mới rồi thử lại 1 lần; nếu refresh cũng 401 → chuyển tới trang đăng nhập.
  await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`, { method: 'POST', credentials: 'include' });
}
```

- Server Component (RSC) gọi API phải tự chuyển tiếp cookie: `headers: { cookie: cookies().toString() }`.
- Nút "Đăng nhập bằng Google" là **link điều hướng**: `window.location.href = '/api/auth/google?redirect=/p/abc'`.
- Khi đăng nhập Google thất bại, trình duyệt quay về `FRONTEND_URL/login?error=google_auth_failed` (hoặc `google_account_rejected` nếu tài khoản bị khoá / email đã gắn với tài khoản Google khác).
- **CSRF**: `SameSite=Lax` chặn cookie trên request POST/PATCH/DELETE từ site khác, nhưng vẫn cho qua từ subdomain cùng site (vd. file mở trên `cdn.wrapfit.vn`). Vì vậy `OriginGuard` (`src/common/guards/origin.guard.ts`) chặn thêm (`403 ORIGIN_NOT_ALLOWED`) mọi request khác `GET`/`HEAD`/`OPTIONS` có header `Origin` không thuộc `CORS_ORIGINS`, `FRONTEND_URL` hay chính API; không có `Origin` thì xét `Sec-Fetch-Site`. Tool không phải trình duyệt (không gửi hai header này) không bị ảnh hưởng. Tắt khi `CORS_ORIGINS=*`. Route `GET` vẫn **không được** thay đổi dữ liệu.
- Tool không phải trình duyệt vẫn có thể gửi `Authorization: Bearer <wf_access>`.

### Luồng token

1. `login` / `register` / Google callback đặt cookie `wf_access` (ngắn hạn) và `wf_refresh` (dài hạn). Mỗi phiên lưu kèm User-Agent và IP.
2. Khi access token hết hạn, gọi `POST /api/auth/refresh` → nhận cặp cookie mới, refresh token cũ bị thu hồi (rotation).
3. Nếu một refresh token đã bị thu hồi mà vẫn bị gửi lại, hệ thống coi là có khả năng bị đánh cắp và thu hồi **toàn bộ** phiên của user đó (cookie trên trình duyệt cũng bị xoá).
4. Mỗi request, `JwtStrategy` kiểm tra lại user trong database nên việc khoá tài khoản hay đổi role có hiệu lực ngay.
5. Tài khoản chỉ đăng nhập bằng Google (`passwordHash = null`) không thể đăng nhập bằng mật khẩu.
6. Ngoài giới hạn 10 lần / phút theo IP, mỗi **địa chỉ email** chỉ được đăng nhập sai 10 lần trong 15 phút (đếm trong Redis, kể cả địa chỉ không có tài khoản): sau đó `429 LOGIN_RATE_LIMITED` kèm `retryAfterSeconds`, kể cả khi đúng mật khẩu. Đăng nhập thành công hoặc đặt lại mật khẩu xoá bộ đếm. Redis lỗi thì bỏ qua bước này.
7. Thu hồi phiên (`logout-all`, phát hiện refresh token bị dùng lại, đặt lại mật khẩu, admin khoá / xoá tài khoản) có hiệu lực ngay với cả access token đã cấp: mỗi token mang `users.session_version` lúc ký (claim `sv`), thu hồi phiên thì số này tăng (`revokeUserSessions`, `src/users/user-sessions.ts`) và `JwtStrategy`, `/auth/refresh`, handshake WebSocket từ chối token mang số cũ. Thu hồi phiên cũng đóng mọi kết nối WebSocket của user. Email gửi tới tài khoản chưa xác minh không chèn `fullName` (ai cũng có thể đăng ký địa chỉ của người khác với tên tuỳ ý).

### Đăng nhập bằng Google — cách lấy Client ID

Khi `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` để trống, server vẫn chạy bình thường và `/api/auth/google` trả `503`.

1. Vào [Google Cloud Console](https://console.cloud.google.com/) → tạo (hoặc chọn) một project.
2. **APIs & Services → OAuth consent screen**: chọn *External*, điền tên app "WrapFit", email hỗ trợ; ở mục *Test users* thêm email Google của các thành viên trong nhóm (app ở chế độ Testing chỉ cho phép test user đăng nhập).
3. **APIs & Services → Credentials → Create credentials → OAuth client ID** → loại *Web application*.
4. **Authorized redirect URIs** — thêm đúng các URL sẽ dùng:
   - `http://localhost:8080/api/auth/google/callback` (gọi thẳng backend)
   - `http://localhost:3000/api/auth/google/callback` (nếu FE proxy `/api/*`)
   - URL production, ví dụ `https://wrapfit.vn/api/auth/google/callback`
5. Chép *Client ID* và *Client secret* vào `be/.env` (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`), đặt `GOOGLE_CALLBACK_URL` trùng với một URI ở bước 4, rồi khởi động lại server.
6. Thử: mở `http://localhost:8080/api/auth/google` trên trình duyệt.

Quy tắc liên kết tài khoản: tìm theo Google ID → nếu chưa có thì gắn Google vào tài khoản có **cùng email đã được Google xác minh** → nếu vẫn chưa có thì tạo tài khoản mới (không mật khẩu, role `MAKER`).

## Lưu trữ file (S3 / Cloudflare R2)

Trình duyệt **upload thẳng lên bucket**, backend chỉ cấp chữ ký. Chữ ký khóa đúng `Content-Type` và dung lượng đã khai báo, nên không thể đổi file sau khi xin URL.

```ts
// 1. Xin URL (cookie đăng nhập đi kèm)
const ticket = await fetch(`${API_URL}/storage/presigned-upload`, {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ purpose: 'LOGO', contentType: file.type, size: file.size, projectId }),
}).then((r) => r.json());

// 2. Upload trực tiếp với đúng ticket.headers (KHÔNG gửi cookie, KHÔNG thêm / bớt header nào)
await fetch(ticket.uploadUrl, { method: 'PUT', headers: ticket.headers, body: file });

// 3. Dùng ticket.fileUrl trong canvasState / thumbnailUrl / avatarUrl
```

| `purpose` | Định dạng | Tối đa |
| --- | --- | --- |
| `LOGO` | PNG, JPEG, WebP, SVG, PDF | 15 MB |
| `IMAGE` | PNG, JPEG, WebP | 15 MB |
| `THUMBNAIL`, `AVATAR` | PNG, JPEG, WebP | 2 MB |

- Hạn mức theo gói: FREE 100 MB, STARTER 1 GB, PRO_BUSINESS 10 GB (`GET /api/storage/usage`). Vượt → `403`.
- Gửi `projectId` khi file thuộc một dự án (thumbnail, ảnh trên canvas): file bị xóa khỏi bucket khi dự án bị xóa vĩnh viễn hoặc bị cron dọn thùng rác. Nhân bản / Remix dùng chung file với dự án gốc.
- URL upload hết hạn sau 5 phút. Hạn mức được tính ngay khi cấp URL (kể cả khi FE không upload).
- Phần tử `logo` / `image` / `pattern` của `canvasState` và nhạc của trải nghiệm mở hộp (`audioTrackUrl`) chỉ nhận file của WrapFit: URL upload, đường dẫn của frontend (`/branding/...`) hoặc (với canvas) nhãn sticker có sẵn. URL site khác, `//host`, `data:` → `400 FILE_URL_NOT_ALLOWED`, vì trang công khai sẽ tải chúng trên trình duyệt của mọi người xem. Nội dung thiết kế đã lưu từ trước vẫn được giữ khi lưu lại. Màu trong `style` phải là `#RGB` / `#RRGGBB` / `#RRGGBBAA`.
- Logo SVG / PDF được lưu kèm `Content-Disposition: attachment` (ký vào URL, nên `ticket.headers` có thêm header này): mở thẳng URL của file chỉ tải file về, script trong SVG không chạy trên domain CDN. `<img>` và worker xuất file vẫn đọc bình thường.

**Local**: `docker compose up -d seaweedfs storage-init` chạy [SeaweedFS](https://github.com/seaweedfs/seaweedfs) (Apache 2.0, tương thích S3) ở cổng 8333, khóa dev nằm trong `docker/seaweedfs/s3.json`; bucket `wrapfit` ai cũng đọc được, `wrapfit-private` thì không. MinIO không còn phát hành image Docker bản community nên không dùng.

**Cloudflare R2 (production)**:

1. Cloudflare Dashboard → **R2 Object Storage** → bật R2 (cần thêm thẻ thanh toán, gói miễn phí 10 GB) → **Create bucket** `wrapfit`.
2. Bucket → **Settings** → **Custom Domains** → gắn `cdn.wrapfit.vn` (hoặc bật `r2.dev` chỉ để thử; domain này bị giới hạn tốc độ). Đây là `STORAGE_PUBLIC_URL`.
3. Bucket → **Settings** → **CORS Policy**:

   ```json
   [{ "AllowedOrigins": ["https://wrapfit.vn", "http://localhost:3000"], "AllowedMethods": ["PUT", "GET"], "AllowedHeaders": ["content-type", "content-disposition"], "MaxAgeSeconds": 3600 }]
   ```

   Domain `cdn.wrapfit.vn` → **Rules** → **Transform Rules** → **Modify Response Header**, áp cho mọi request của hostname này: đặt `Content-Security-Policy: sandbox; default-src 'none'` và `X-Content-Type-Options: nosniff`. File người dùng mở thẳng trên CDN không chạy được script (kể cả file SVG upload trước khi có `Content-Disposition`); `<img>` không bị ảnh hưởng. Lâu dài nên phục vụ file người dùng từ một domain riêng (không phải subdomain của `wrapfit.vn`).

4. **Create bucket** thứ hai `wrapfit-private` cho file xuất in: **không** gắn Custom Domain, **không** bật `r2.dev`. CORS chỉ cần `GET` từ `https://wrapfit.vn` (trình duyệt tải file qua link pre-signed).
5. **R2** → **Manage R2 API Tokens** → **Create API token**, quyền *Object Read & Write*, chỉ hai bucket `wrapfit` và `wrapfit-private` → lấy *Access Key ID* / *Secret Access Key*. *Account ID* nằm trong endpoint `https://<account-id>.r2.cloudflarestorage.com`.
6. Điền vào `.env`: `STORAGE_ENDPOINT`, `STORAGE_REGION=auto`, `STORAGE_BUCKET=wrapfit`, `STORAGE_PRIVATE_BUCKET=wrapfit-private`, hai khóa, `STORAGE_PUBLIC_URL`, `STORAGE_FORCE_PATH_STYLE=false`.
7. (Tùy chọn, cho backup DB) **Create bucket** thứ ba `wrapfit-backups`: không Custom Domain, không `r2.dev`, không CORS; thêm **Lifecycle rule** xóa object sau 30 ngày. Job backup nên dùng một API token riêng chỉ có quyền ghi bucket này. Đặt `STORAGE_BACKUP_BUCKET=wrapfit-backups`.
8. Kiểm tra: `npm --workspace=be run storage:check` (container: `docker compose exec backend node dist/storage-check.js`) gọi `HeadBucket` trên từng bucket đã khai báo và báo `OK` hoặc mã lỗi HTTP (403 = token thiếu quyền bucket đó, 404 = sai tên bucket). Không ghi gì.

**Cloudinary (CDN ảnh công khai)**: theo kế hoạch lưu trữ hybrid (`docs/wrapfit_architecture_security_blueprint.md`, mục 4), avatar, logo, texture AI và thumbnail sẽ chuyển sang Cloudinary (resize, `f_auto,q_auto`); file xuất in và backup ở lại R2. Hiện mới có kết nối (`src/shared/cloudinary`, `CloudinaryService` toàn cục), **chưa** có upload hay URL nào của ứng dụng đi qua Cloudinary: mọi file vẫn nằm trên R2 như trên.

1. Tạo tài khoản tại [cloudinary.com](https://cloudinary.com) (gói Free). **Dashboard** → *Product Environment* hiện *Cloud name*.
2. **Settings** → **API Keys** → **Generate New API Key** → lấy *API Key* / *API Secret*. Không commit secret.
3. **Settings** → **Security**: bật *Strict transformations* (chỉ cho phép transformation đã khai báo, chống người lạ dùng hạn mức) và tắt *Allow delivery of PDF and ZIP files* (để mặc định tắt).
4. Điền vào `.env`: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_FOLDER` (`wrapfit-dev` ở máy dev, `wrapfit` ở production để không lẫn file).
5. `npm --workspace=be run storage:check` phải báo `Cloudinary "<cloud name>": OK`.

File xuất in tạo trước khi có bucket riêng tư (key `projects/<id>/exports/...`) vẫn nằm trong bucket công khai và vẫn tải được; chúng bị xóa cùng dự án như trước.

## AI sinh hoa văn

`POST /api/ai/pattern { theme, preferredColors? }` trả bảng màu và **một ô hoa văn SVG lặp liền mạch** (`tile.svg`, dùng làm `background-image` hoặc phần tử `pattern` trên canvas).

- **Claude** (`ANTHROPIC_API_KEY` có giá trị): gọi model `AI_MODEL` với *structured outputs* — model chỉ trả **danh sách hình** (tròn, chữ nhật, đường, path) theo JSON schema, không trả SVG. Backend kiểm tra từng giá trị (màu `#RRGGBB`, toạ độ trong ô, `d` chỉ gồm lệnh path và số) rồi tự dựng SVG, nên SVG không thể chứa script, link hay tài nguyên ngoài. Ô được vẽ 9 lần (ô + 8 ô bên cạnh) và cắt theo `viewBox` để hình tràn mép xuất hiện lại ở mép đối diện → lặp không lộ đường nối.
- Request bật `fallbacks: "default"` (beta `server-side-fallback-2026-07-01`): nếu bộ lọc an toàn của model từ chối, Anthropic tự chạy lại trên model dự phòng. Effort `low` vì đây là việc đơn giản. System prompt được cache.
- **Dự phòng**: chưa có API key, hoặc Claude lỗi / hết thời gian / trả kết quả không hợp lệ → dùng bộ sinh hoa văn bằng thuật toán (theo từ khóa Tết, Noel, cưới, Valentine, sinh nhật, tối giản; cùng chủ đề luôn ra cùng hoa văn). Trường `source` cho biết `ai` hay `procedural`.
- **Giới hạn**: lượt gọi Claude trong 24 giờ: FREE 10, STARTER 50, PRO_BUSINESS 300 (hết → `429`; `GET /api/ai/usage`). Thêm giới hạn 5 lần / phút. Mỗi lượt được ghi vào bảng `ai_generations` kèm số token để theo dõi chi phí.
- Lấy API key: [platform.claude.com](https://platform.claude.com) → *API Keys*. Không commit key; test e2e luôn tắt AI.

## WebSocket

Socket.IO namespace `/events` chạy ở path **`/api/socket.io`** (để nhận cookie `wf_access` và đi qua proxy `/api/*`):

```ts
import { io } from 'socket.io-client';

// Trình duyệt: cookie wf_access tự được gửi kèm
const socket = io('http://localhost:8080/events', { path: '/api/socket.io', withCredentials: true });
// Client khác: io(url, { path: '/api/socket.io', auth: { token: accessToken } })

socket.on('pong', (data) => console.log(data)); // { timestamp }
socket.emit('ping', {});
```

Mỗi kết nối tự vào room `user:<id>` (và `admins` với ADMIN). Từ service khác, inject `EventsGateway` và gọi `emitToAll` / `emitToUser`.

Token chỉ được kiểm tra lúc handshake, nên server tự đóng socket khi access token hết hạn (client kết nối lại bằng cookie mới sau `refresh`) và khi phiên của user bị thu hồi (sự kiện nội bộ `auth.sessions_revoked`).

Handshake từ trình duyệt có `Origin` ngoài `CORS_ORIGINS` / `FRONTEND_URL` bị từ chối (`allowRequest` trong `src/common/adapters/socket-io.adapter.ts`): CORS của Socket.IO không áp dụng cho transport WebSocket.

## Chạy test

```bash
npm --workspace=be test                 # unit test (không cần database) — CI chạy bước này

# e2e cần PostgreSQL đã áp dụng migration + Redis + SeaweedFS (upload thật). CI chạy y hệt (job `e2e`).
# SeaweedFS chạy ở cổng STORAGE_PORT của .env gốc (mặc định 8333): test/e2e-env.ts tự đọc cổng này.
docker compose up -d postgres redis seaweedfs storage-init
npm --workspace=be run db:deploy
npm --workspace=be run test:e2e
```

## Thêm module mới

1. `npx nest g module <ten>` (và `controller`, `service` tương ứng), rồi tạo `src/<ten>/index.ts` export module. Module nghiệp vụ phức tạp chia 4 thư mục `presentation/ application/ domain/ infrastructure/` (tài liệu 08, Mục 1.1–1.3).
2. Sửa `prisma/schema.prisma`, rồi `npm run db:migrate -- --name <ten>` (trong `be/`).
3. Mặc định mọi route đều yêu cầu đăng nhập; dùng `@Public()` để mở, `@Roles(Role.ADMIN)` để giới hạn theo role, `@CurrentUser()` để lấy user hiện tại.
4. DTO đặt trong `dto/`; plugin Swagger tự sinh tài liệu từ DTO có hậu tố `.dto.ts`.

## Xuất file in (BullMQ)

1. `POST /api/projects/:id/exports { fileType: "PDF_CMYK" | "SVG" | "DXF" }` — backend chạy lại **FitCheck** (kết quả lưu vào `fitcheckState`); có lỗi mức `error` → `422` kèm `fitCheck`. Hợp lệ → tạo `ExportJob` (PENDING), đẩy vào hàng đợi Redis, trả `202 { jobId }`.
2. Process **worker** (`src/worker.ts`) dựng dieline từ `@wrapfit/shared`, xuất file, tải lên storage, đánh dấu `COMPLETED` và tự tạo mốc phiên bản "Bản xuất in ...". Lỗi → BullMQ thử lại 3 lần (2 s, 4 s), lần cuối mới ghi `FAILED` + `error`. Số job song song: `EXPORT_CONCURRENCY`.
3. FE hỏi `GET /api/exports/:jobId` mỗi 2 giây; khi `COMPLETED` có `downloadUrl` (pre-signed, hết hạn 15 phút, tải về với tên `hop-nen-tet-pdf-cmyk.pdf`). File nằm trong `STORAGE_PRIVATE_BUCKET` (key `private/projects/<id>/exports/<jobId>.<ext>`), không có URL công khai: hết 15 phút là link hết hiệu lực.

| Định dạng | Dùng cho | Nội dung |
| --- | --- | --- |
| `PDF_CMYK` | Xưởng in | Kích thước thật (1 mm = 2,8346 pt), đường cắt 0/100/100/0, đường gấp 100/0/0/0 nét đứt, ảnh / logo PNG, JPEG (dưới nét dao) và chữ trên canvas (font Be Vietnam Pro nhúng sẵn) |
| `SVG` | Cricut / máy cắt laser | Lớp `info`, `crease`, `cut`, `artwork` (ảnh nhúng data URI + chữ), đơn vị mm |
| `DXF` | Máy bế CNC | R12, mm, lớp `CUT` (đỏ) và `CREASE` (xanh, nét đứt) |

**Giới hạn hiện tại (phụ thuộc IT2 / `@wrapfit/shared`)**: bộ sinh dieline mới tạo **đường gấp**, chưa có **đường cắt bao ngoài** và tai dán; chưa có lớp **bleed** (`LineType` có `bleed` nhưng bộ sinh chưa tạo); chưa có hàm `exportLayeredPDF` nên backend tự vẽ PDF. Ảnh / logo / hoa văn chỉ lấy từ file đã upload lên storage của WrapFit (`users/...`, worker không gọi host khác); PDF chỉ nhúng được PNG / JPEG (logo SVG / WebP / PDF có trong file SVG, không có trong PDF); mã vạch chưa vẽ; DXF chỉ có nét cắt / gấp và vẽ đường cong (hộp gối) thành đoạn thẳng. Khi IT2 bổ sung, chỉ cần sửa `be/src/export/rendering/`.

## Triển khai production (VPS + HTTPS)

1. VPS có Docker (Compose ≥ 2.24), mở cổng 80/443, bản ghi DNS `A` của domain trỏ về VPS. Clone repo vào `~/WrapFit`.
2. `cp .env.example .env`, điền `APP_DOMAIN` (vd. `wrapfit.vn`), `ACME_EMAIL`, `JWT_*_SECRET`, `POSTGRES_PASSWORD` và `REDIS_PASSWORD` (`openssl rand -hex 32`, phải an toàn trong URL), các biến `STORAGE_*` của Cloudflare R2 (cả `STORAGE_PRIVATE_BUCKET`), `SMTP_*` / `MAIL_FROM`, (tùy chọn) `ANTHROPIC_API_KEY`, `GOOGLE_*`, `SEED_ADMIN_*`. Thiếu biến bắt buộc nào thì `docker compose` dừng trước khi thay container, không bao giờ rơi về mặc định của môi trường dev (mật khẩu `password`, Redis không mật khẩu, khóa SeaweedFS).
   - `POSTGRES_PASSWORD` chỉ được đọc khi volume dữ liệu được tạo lần đầu. Database đã chạy với mật khẩu khác thì đổi trong Postgres **trước**, rồi mới sửa `.env`: `docker exec wrapfit-postgres psql -U postgres -c "ALTER USER postgres PASSWORD '<mật khẩu mới>'"`.
   - Redis chỉ chạy trong mạng nội bộ của Docker, nhưng vẫn đặt mật khẩu (`--requirepass`) để container khác trên máy không đọc / sửa được hàng đợi.
3. `bash be/deploy.sh` — có `APP_DOMAIN` thì chạy `docker-compose.yml` + `docker-compose.prod.yml`: **Caddy** tự lấy / gia hạn chứng chỉ Let's Encrypt, phục vụ frontend và `/api/*` trên **cùng một domain** (không cần CORS, cookie là first-party), đóng các cổng nội bộ (Postgres, Redis, 8080, 3000), bật `COOKIE_SECURE`, `TRUST_PROXY`, tắt Swagger.
4. GitHub: thêm secrets `VPS_HOST`, `VPS_USERNAME`, `VPS_SSH_KEY` (hoặc `VPS_PASSWORD`), `VPS_PORT`. Workflow `Deploy WrapFit to VPS` tự chạy sau khi **CI** (build + unit + e2e) xanh trên `main`, hoặc chạy tay. Action SSH được ghim theo commit SHA (bước này giữ khóa SSH của VPS); khi nâng phiên bản, thay SHA chứ không dùng tag.
5. Google OAuth: thêm `https://<APP_DOMAIN>/api/auth/google/callback` vào *Authorized redirect URIs*. R2: thêm `https://<APP_DOMAIN>` vào CORS của bucket.

## Lưu ý khi triển khai production

- **Sau mỗi lần thêm phiên bản công thức dieline** (`CURRENT_FORMULA_VERSION` của `@wrapfit/shared`, docs/12 Phase 8):
  container mới tự seed nên box template nhận phiên bản mới; sau đó chạy tay **một lần**
  `npm run db:upgrade-formulas -- --dry-run` (xem bảng: dự án, phiên bản cũ → mới, điểm FitCheck trước / sau, cảnh báo dự
  án PUBLIC tụt dưới 90) rồi `npm run db:upgrade-formulas` (trong container: `docker compose exec backend npm run
  db:upgrade-formulas`). Script chỉ chuyển dự án **chưa từng có file in xuất xong**, mỗi dự án kèm một mốc tự động để
  hoàn tác; chạy lại không đổi gì thêm. Không chạy tự động lúc khởi động. Dự án đã xuất file: chủ dự án tự bấm "Cập nhật
  lên công thức mới" trong studio (`POST /api/projects/:id/formula-upgrade`).

- Đặt `JWT_*_SECRET` bằng giá trị ngẫu nhiên riêng (`openssl rand -base64 48`), không dùng giá trị trong `.env.example`.
- Đặt `CORS_ORIGINS` là danh sách origin cụ thể; cân nhắc `SWAGGER_ENABLED=false`.
- Chạy sau reverse proxy / load balancer: đặt `TRUST_PROXY=true` (bản prod đã bật) để rate limit tính theo IP thật của client.
- Bảng `refresh_tokens` sẽ tăng dần; nên có job định kỳ xoá các dòng đã hết hạn hoặc đã thu hồi.
- Nếu chạy nhiều instance, gateway Socket.IO cần Redis adapter để broadcast giữa các instance.

# 17 — Deploy miễn phí: Vercel + Render + Neon + Redis Cloud + R2 + Brevo

Bản deploy cho kỳ hiện tại: đủ tính năng, không tốn tiền, không cần tên miền hay VPS. Bản production sau này
(VPS + Caddy + tên miền riêng) vẫn theo `be/README.md`, mục "Triển khai production".

Các gói free bên dưới được kiểm tra ngày 2026-10-15. Nhà cung cấp có thể đổi điều kiện, xem lại trang giá của họ khi
có gì khác.

## 1. Kiến trúc

```
Trình duyệt ──► https://<app>.vercel.app          Vercel: Next.js (fe/)
                   │  /api/*  (rewrite, cookie vẫn là first-party trên vercel.app)
                   ▼
               https://wrapfit-api.onrender.com   Render: API NestJS + worker trong cùng một container
                   ├── Neon           PostgreSQL
                   ├── Redis Cloud    hàng đợi BullMQ (email, xuất file in), giới hạn đăng nhập sai
                   ├── Cloudflare R2  file upload (bucket `wrapfit`) và file in (bucket `wrapfit-private`)
                   └── Brevo          SMTP gửi email xác minh / quên mật khẩu
Trình duyệt ──► R2 trực tiếp: upload bằng link pre-signed, tải file in bằng link pre-signed 15 phút
```

| Dịch vụ | Dùng cho | Gói free | Lưu ý |
| --- | --- | --- | --- |
| Vercel Hobby | Frontend | Miễn phí, chỉ cho dự án phi thương mại | Biến môi trường đổi thì phải Redeploy |
| Render Free | API + worker | 512 MB RAM, 0,1 CPU, 750 giờ / tháng | Ngủ sau 15 phút không có request, thức dậy mất khoảng 1 phút. Chặn SMTP cổng 25, 465, 587. Không có background worker free |
| Neon Free | PostgreSQL | 0,5 GB, 100 CU-giờ / tháng | Compute tự tắt sau 5 phút không dùng. Không dùng Postgres free của Render: bị xóa sau 30 ngày |
| Redis Cloud Free | Redis | 30 MB, 30 kết nối, 100 lệnh / giây | Upstash free (500K lệnh / tháng) không đủ cho BullMQ |
| Cloudflare R2 | File | 10 GB | Phải thêm thẻ thanh toán để bật R2 (không bị trừ tiền trong hạn mức) |
| Brevo Free | Email | 300 email / ngày | Dùng cổng 2525, vì Render free chặn 587 |

Code đã chuẩn bị sẵn:
- `render.yaml`: Render tạo service từ file này (Blueprint).
- `RUN_WORKER=true` (`be/docker-entrypoint.sh`): worker chạy cùng container với API, tự khởi động lại nếu dừng.
- `fe/vercel.json`: Vercel cài `fe` + `shared`, build `shared` trước rồi mới build Next.js.
- `TRUST_PROXY` nhận số proxy đứng trước API (mục 9).

## 2. Thứ tự làm

1. Neon → 2. Redis Cloud → 3. Cloudflare R2 → 4. Brevo → 5. Render → 6. Vercel → 7. Cập nhật địa chỉ Vercel vào
Render và R2 → 8. Kiểm tra.

Ghi các giá trị lấy được vào một chỗ riêng tư (password manager). **Không** commit, không gửi vào nhóm chat.

Deploy từ nhánh nào thì Render và Vercel cùng dùng nhánh đó: `main` sau khi merge, hoặc `feat/fe-be-integration`
trong lúc chưa merge.

## 3. Neon (PostgreSQL)

1. Đăng ký tại neon.com (đăng nhập bằng GitHub được).
2. **Create project**: tên `wrapfit`, Postgres 16 (giống local), region **AWS Asia Pacific (Singapore)**.
3. **Connect** → tắt **Connection pooling** → chép connection string.
4. Sửa phần query của chuỗi thành `?sslmode=require&connect_timeout=15` (bỏ `channel_binding=require` nếu có). Kết quả:

   ```
   postgresql://neondb_owner:<mật khẩu>@ep-xxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&connect_timeout=15
   ```

   Đây là `DATABASE_URL`. Bảng được tạo tự động khi container Render khởi động (`prisma migrate deploy`).

## 4. Redis Cloud

1. Đăng ký tại redis.io (Try Redis Cloud free), không cần thẻ.
2. **New database** → gói **Free** (30 MB) → AWS, region gần Singapore nhất có trong danh sách.
3. Database → **Configuration** → **Data eviction policy**: chọn **noeviction**. BullMQ cần chính sách này, nếu không
   Redis có thể xóa job đang chờ.
4. Lấy **Public endpoint** (`host:port`) và mật khẩu của user `default`. `REDIS_URL`:

   ```
   redis://default:<mật khẩu>@redis-12345.c1.ap-southeast-1-1.ec2.redns.redis-cloud.com:12345
   ```

## 5. Cloudflare R2

1. Đăng ký tại dash.cloudflare.com → **R2 Object Storage** → thêm phương thức thanh toán để bật R2.
   Không có thẻ thì báo lại, đổi sang nhà cung cấp S3 khác.
2. **Create bucket** `wrapfit`.
   - Settings → **Public Development URL** (`r2.dev`) → Enable. Chép `https://pub-xxxx.r2.dev`: đây là
     `STORAGE_PUBLIC_URL`. Domain `r2.dev` bị giới hạn tốc độ, đủ cho demo.
   - Settings → **CORS Policy** (tạm dùng địa chỉ Vercel dự kiến, sửa ở mục 8):

     ```json
     [{ "AllowedOrigins": ["https://<app>.vercel.app"], "AllowedMethods": ["PUT", "GET"], "AllowedHeaders": ["content-type", "content-disposition"], "MaxAgeSeconds": 3600 }]
     ```

3. **Create bucket** `wrapfit-private`: **không** bật `r2.dev`. CORS chỉ cần `GET` từ `https://<app>.vercel.app`.
4. **Manage API tokens** → **Create API token**: quyền **Object Read & Write**, chỉ áp dụng cho `wrapfit` và
   `wrapfit-private`. Chép:
   - *Access Key ID* → `STORAGE_ACCESS_KEY_ID`
   - *Secret Access Key* → `STORAGE_SECRET_ACCESS_KEY`
   - Endpoint `https://<account-id>.r2.cloudflarestorage.com` → `STORAGE_ENDPOINT`

## 6. Brevo (email)

1. Đăng ký tại brevo.com (gói Free). Nếu Brevo yêu cầu kích hoạt tài khoản gửi email, làm theo hướng dẫn của họ.
2. **Senders, Domains & Dedicated IPs** → **Senders** → **Add a sender**: email của nhóm (Gmail cũng được) → bấm link
   xác minh Brevo gửi tới email đó.
3. **SMTP & API** → tab **SMTP** → **Generate a new SMTP key**. Chép:
   - *Login* (dạng `xxxx@smtp-brevo.com`) → `SMTP_USER`
   - SMTP key → `SMTP_PASS`
4. `MAIL_FROM` = `WrapFit <email-đã-xác-minh@gmail.com>`.

Không có tên miền riêng nên email có thể vào thư mục Spam. Khi test, nhắc người dùng kiểm tra Spam.

## 7. Render (API + worker)

1. Đăng ký tại render.com bằng GitHub. Cấp quyền cho Render đọc repo `WrapFit/WrapFit`; repo thuộc tổ chức nên có thể
   cần chủ tổ chức duyệt.
2. **New** → **Blueprint** → chọn repo `WrapFit/WrapFit` và nhánh deploy. Render đọc `render.yaml` và tạo service
   `wrapfit-api` (Docker, gói Free, Singapore).
3. Điền các biến Render hỏi:

   | Biến | Giá trị |
   | --- | --- |
   | `FRONTEND_URL`, `CORS_ORIGINS` | `https://<app>.vercel.app` (tạm, sửa ở mục 8) |
   | `DATABASE_URL` | mục 3 |
   | `REDIS_URL` | mục 4 |
   | `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`, `STORAGE_PUBLIC_URL` | mục 5 |
   | `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | mục 6 |
   | `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | tài khoản admin, mật khẩu mạnh |

   `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `AUTH_TOKEN_SECRET` được Render tự sinh. Các biến còn lại đã có giá trị
   trong `render.yaml`.
4. **Apply**. Lần build đầu mất khoảng 5–10 phút. Trong **Logs** phải thấy lần lượt: `Applying database migrations`,
   `Seeded admin user`, `WrapFit worker started`, `mail.smtp_ready`.
5. Chép địa chỉ service (ví dụ `https://wrapfit-api.onrender.com`; nếu tên bị trùng, Render thêm hậu tố). Mở
   `https://wrapfit-api.onrender.com/api/health`, phải thấy:

   ```json
   {"status":"ok","database":"up","redis":"up","worker":"up"}
   ```

Tùy chọn, thêm sau trong **Environment** của service:
- `ANTHROPIC_API_KEY`: bật AI sinh hoa văn bằng Claude. Không có thì dùng hoa văn sinh bằng thuật toán.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL=https://<app>.vercel.app/api/auth/google/callback`:
  đăng nhập Google (cách lấy: `be/README.md`). Thêm đúng URL callback đó vào *Authorized redirect URIs*.

## 8. Vercel (frontend)

1. Đăng ký tại vercel.com bằng GitHub → **Add New** → **Project** → import `WrapFit/WrapFit`.
2. **Root Directory**: `fe`. Framework: Next.js (tự nhận). Không sửa Install / Build Command: lấy từ `fe/vercel.json`.
3. **Environment Variables**:

   | Biến | Giá trị |
   | --- | --- |
   | `BACKEND_INTERNAL_URL` | địa chỉ Render ở mục 7, không có `/` ở cuối |
   | `NEXT_PUBLIC_API_URL` | `/api` |
   | `NEXT_PUBLIC_SITE_URL` | `https://<app>.vercel.app` |
   | `NEXT_PUBLIC_APP_NAME` | `WrapFit Studio` |

4. **Deploy**. Xong thì xem địa chỉ production ở **Settings** → **Domains** (ví dụ `https://wrapfit-xxxx.vercel.app`).
5. Deploy từ `feat/fe-be-integration` (chưa merge) thì vào **Settings** → **Git** → **Production Branch** đặt nhánh
   này. Nếu không, bản build là *Preview*: địa chỉ khác và bị Vercel yêu cầu đăng nhập.

Sau khi biết địa chỉ Vercel thật, cập nhật 3 chỗ:
1. Render → `wrapfit-api` → **Environment**: `FRONTEND_URL` và `CORS_ORIGINS` = địa chỉ Vercel → Save (Render tự deploy
   lại).
2. Vercel → `NEXT_PUBLIC_SITE_URL` = địa chỉ Vercel → **Deployments** → **Redeploy**.
3. R2: `AllowedOrigins` trong CORS của cả hai bucket = địa chỉ Vercel.

`BACKEND_INTERNAL_URL` và `NEXT_PUBLIC_*` được ghi vào bản build, nên đổi chúng thì luôn phải Redeploy trên Vercel.

## 9. Kiểm tra

1. Mở địa chỉ Vercel. Lần đầu sau khi Render ngủ, request API có thể lỗi hoặc chờ khoảng 1 phút: tải lại trang.
2. `https://<app>.vercel.app/api/health` trả `database`, `redis`, `worker` đều `up`.
3. Đăng ký bằng email thật → nhận email xác minh (xem cả Spam) → bấm link → đăng nhập.
4. Tạo dự án → upload logo → lưu → xuất PDF, SVG, DXF và tải về.
5. Mở trang mở hộp `/unbox/...` của dự án.
6. Đăng nhập admin (`SEED_ADMIN_*`) → trang `/admin`.

**Rate limit theo IP thật (`TRUST_PROXY`)**: request đi qua Vercel rồi qua các proxy của Render. Nếu API đếm sai số
proxy, mọi người dùng bị tính chung một IP: đăng ký / đăng nhập (10 lần / phút / IP) sẽ báo `429` khi cả lớp cùng thử.
1. Đăng nhập admin, mở `https://<app>.vercel.app/api/health/details`.
2. `client.ip` phải là IP của bạn (so với https://api.ipify.org).
3. Nếu không phải: đặt `TRUST_PROXY` trên Render bằng **số địa chỉ trong `client.forwardedFor`** (IP của bạn đứng đầu
   danh sách), Save, kiểm tra lại.

Ai gọi thẳng địa chỉ Render (không qua Vercel) có thể tự khai IP để né giới hạn theo IP. Giới hạn đăng nhập sai theo
từng email vẫn hoạt động. Chấp nhận được cho bản demo.

## 10. Giữ Render không ngủ (tùy chọn)

Render free ngủ sau 15 phút không có request. Muốn demo không phải chờ:
1. Đăng ký cron-job.org (miễn phí).
2. Tạo job gọi `https://wrapfit-api.onrender.com/api/health` **mỗi 14 phút**, chỉ trong giờ cần dùng (ví dụ 7:00–23:00).

Một service chạy cả tháng hết khoảng 744 giờ, vẫn dưới 750 giờ free của Render. Mỗi lần gọi làm Neon thức 5 phút,
nên gọi 24/7 tốn khoảng 65 / 100 CU-giờ của Neon. Giới hạn theo giờ trong ngày để còn dư cho lúc dùng thật.

## 11. Cập nhật code sau này

- Push lên nhánh đã chọn: Render và Vercel tự build lại. Migration chạy khi container khởi động.
- Render free không có Shell. Chạy script một lần (ví dụ `db:upgrade-formulas`, `be/README.md`) từ máy local, trỏ
  vào Neon:

  ```bash
  DATABASE_URL="<chuỗi Neon>" npm --workspace=be run db:upgrade-formulas -- --dry-run
  ```

- Mỗi lần build Render tốn phút build (500 phút / tháng free). Không cần thì tắt **Auto-Deploy** và bấm
  **Manual Deploy** khi muốn.

## 12. Sự cố thường gặp

| Hiện tượng | Nguyên nhân / cách xử lý |
| --- | --- |
| Request đầu tiên báo lỗi 502 / 504, tải lại thì được | Render đang thức dậy. Xem mục 10 |
| Thao tác lưu / đăng nhập báo `403 ORIGIN_NOT_ALLOWED` | `FRONTEND_URL` / `CORS_ORIGINS` trên Render khác địa chỉ đang mở, hoặc đang mở bản Preview của Vercel |
| Upload báo lỗi CORS | `AllowedOrigins` của bucket R2 chưa có địa chỉ Vercel |
| Không nhận được email | Xem Spam. Logs Render có `mail.smtp_ready` không; sender Brevo đã xác minh chưa; `SMTP_USER` là login dạng `@smtp-brevo.com`, không phải email |
| `/api/health` có `"redis":"down"` | Sai `REDIS_URL` |
| `"worker":"down"` | Logs Render có `Worker stopped, restarting`: xem lỗi in ngay trước đó |
| Render báo hết bộ nhớ (vượt 512 MB) | Giảm `API_MAX_OLD_SPACE_MB` (mặc định 256) / `WORKER_MAX_OLD_SPACE_MB` (mặc định 160) |
| Build Vercel lỗi `next/font` khi tải Google Fonts | Lỗi mạng tạm thời: Redeploy |
| Đăng ký báo `429` khi nhiều người cùng thử | `TRUST_PROXY`, mục 9 |

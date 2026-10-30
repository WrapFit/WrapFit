# 18 — Runbook deploy bản demo Path 2 (CP4)

> Ngày lập: 2026-10-30 (phiên S8 của [`17_PATH2_MVP_PLAN.md`](17_PATH2_MVP_PLAN.md)). Nhánh: `feat/path2-mvp`.
> Mục tiêu: `https://wrap-fit.vercel.app` chạy thật kịch bản demo 3 phút (docs/17 §5) trên điện thoại 4G.
> Mọi bước cần đăng nhập (GitHub, VPS, Vercel, Cloudflare, Anthropic) do người giữ tài khoản tự làm. File này không
> chứa mật khẩu, khóa hay token: chỉ tên biến và chỗ điền.

Mục lục: [1. Kiến trúc](#1-kiến-trúc-bản-demo) · [2. Trước khi deploy](#2-trước-khi-deploy) ·
[3. Biến môi trường VPS](#3-biến-môi-trường-mới-trên-vps) · [4. Deploy backend](#4-deploy-backend-lên-vps) ·
[5. Vercel](#5-tạo-dự-án-vercel-cho-fe) · [6. Kiểm trên điện thoại](#6-kiểm-trên-điện-thoại-4g) ·
[7. Chi phí cloud (Q3)](#7-dịch-vụ-cloud-và-chi-phí-q3) · [8. Rủi ro demo](#8-rủi-ro-khi-demo-và-cách-xử-lý) ·
[9. Ảnh bàn giao](#9-ảnh-bàn-giao-cho-slide)

---

## 1. Kiến trúc bản demo

```text
Điện thoại / laptop hội đồng
        │  https://wrap-fit.vercel.app  (trang, JS, ảnh tĩnh)
        ▼
Vercel (Next.js, thư mục fe/) ── rewrite /api/* ──►  https://<APP_DOMAIN>/api/*   (VPS, Caddy HTTPS)
                                                     ├─ backend (NestJS) ── PostgreSQL, Redis
                                                     └─ worker (BullMQ: xuất file in, email)
Trình duyệt ── PUT ảnh tải lên / GET ảnh ──► Cloudflare R2 (bucket wrapfit, r2.dev)
```

- Trình duyệt chỉ gọi `/api` trên chính `wrap-fit.vercel.app`; Vercel chuyển tiếp tới VPS
  (`fe/next.config.mjs`, `rewrites()` đọc `BACKEND_INTERNAL_URL` **lúc build**). Cookie đăng nhập vì vậy là cookie của
  `wrap-fit.vercel.app`, không cần cookie khác miền.
- VPS vẫn phục vụ frontend của chính nó ở `https://<APP_DOMAIN>` (Caddy, `docker-compose.prod.yml`). Đây là **phương án
  dự phòng**: nếu Vercel lỗi lúc demo, mở thẳng `https://<APP_DOMAIN>`, cùng dữ liệu, cùng tài khoản.
- Câu hỏi mở **Q2** (docs/17 §2.2): ai giữ dự án Vercel, API production ở tên miền nào. Runbook giả định
  `APP_DOMAIN=wrapfit.vn` (giá trị đã dùng khi tạo CORS của R2, 2026-10-30). Đổi tên miền thì thay ở mọi chỗ ghi
  `<APP_DOMAIN>`.

## 2. Trước khi deploy

1. Merge `feat/path2-mvp` vào `main` (người dùng quyết định). Workflow `Deploy WrapFit to VPS` chỉ chạy sau khi CI xanh
   trên `main`, hoặc chạy tay (`workflow_dispatch`); `workflow_run` dùng file workflow của nhánh mặc định.
2. Kết quả kiểm trên bản gộp local (S8, 2026-10-30): migration áp sạch trên CSDL mới, `prisma migrate diff` không lệch
   schema; `tsc` sạch `shared`, `be`, `fe`; unit `be` 605/605; e2e `be` 187/187 (15 suite); `next build` xanh;
   `node fe/scripts/e2e-scenario.mjs` (xem nhật ký docs/17 §7 cho kết quả từng bước).
3. **Sao lưu CSDL production** trước khi container mới áp migration:

   ```bash
   docker exec wrapfit-postgres pg_dump -U postgres -Fc wrapfit > ~/wrapfit-before-path2.dump
   ```

4. GitHub secrets của repo `WrapFit/WrapFit`: `VPS_HOST`, `VPS_USERNAME`, `VPS_SSH_KEY` (hoặc `VPS_PASSWORD`),
   `VPS_PORT`. Thiếu `VPS_HOST` thì workflow chỉ cảnh báo và bỏ qua bước SSH.

## 3. Biến môi trường mới trên VPS

Sửa `~/WrapFit/.env` trên VPS (file gốc repo, `docker compose` đọc). Các biến đã có từ trước (JWT, Postgres, Redis,
SMTP, Google) giữ nguyên; danh sách đầy đủ ở `be/README.md`, mục "Biến môi trường" và "Triển khai production".

### 3.1. Mới từ Path 2

| Biến | Giá trị cho bản demo CP4 | Ghi chú |
|---|---|---|
| `AI_MODEL` | **xóa dòng này** | Tên cũ của `AI_MODEL_FAST`. Nếu còn `AI_MODEL=claude-opus-5-5`, mọi lượt AI chạy bằng Opus (đắt gấp ~40 lần Haiku) |
| `AI_MODEL_FAST` | `claude-haiku-5-5` | Mặc định trong compose, có thể không ghi |
| `AI_MODEL_PREMIUM` | `claude-opus-5-5` | Chỉ gói khác Free mới dùng được (`quality: 'premium'`) |
| `AI_MONTHLY_BUDGET_USD` | đề xuất `5` | Cầu chì: vượt ngân sách tháng (giờ VN) thì hoa văn sinh bằng thuật toán, không gọi Claude. Trống = không giới hạn |
| `ANTHROPIC_API_KEY` | khóa của tài khoản Anthropic | Trống = chỉ hoa văn thuật toán (miễn phí), demo vẫn chạy |
| `PAYMENT_SIMULATION` | `true` | Bật nút "Giả lập đã thanh toán" (docs/17 M6). **Đặt lại `false` sau CP4** trước khi bán thật |
| `VIETQR_BANK_BIN`, `VIETQR_ACCOUNT_NO`, `VIETQR_ACCOUNT_NAME` | trống, hoặc tài khoản thật (Q1) | Đặt cả ba hoặc để trống cả ba. Trống = tài khoản mẫu, giao diện ghi "Mô phỏng" |
| `SEED_DEMO_EMAIL` | `demo@wrapfit.vn` (mặc định) | Tài khoản demo, xem 3.2 |
| `SEED_DEMO_PASSWORD` | mật khẩu riêng, chỉ người demo biết | Trống = không tạo tài khoản demo. Không ghi vào slide, tài liệu, chat |
| `SEED_DEMO_CREDITS` | `5` (mặc định) | Số lượt xuất được nạp lại mỗi lần container khởi động |
| `EXTRA_CORS_ORIGINS` | `https://wrap-fit.vercel.app` | Origin của frontend Vercel, để `OriginGuard` (CSRF) và CORS nhận request được Vercel chuyển tiếp. Nhiều origin: ngăn cách bằng dấu phẩy |

### 3.2. Tài khoản demo (`be/prisma/seed-demo.ts`)

Container backend chạy `prisma db seed` mỗi lần khởi động. Khi có `SEED_DEMO_PASSWORD`:

- Tạo một lần tài khoản `MAKER` gói **Free**, email đã xác minh, tên "Chị Linh (demo)", cửa hàng "Nến thơm Mộc An".
  Địa chỉ đã thuộc tài khoản khác vai trò thì bỏ qua (không chiếm tài khoản).
- Nạp lượt xuất (lô `ADMIN`, không hết hạn) cho đủ `SEED_DEMO_CREDITS`. Buổi tập dùng hết lượt thì lần deploy / khởi
  động lại sau nạp lại. Muốn nạp ngay không khởi động lại: admin gọi `POST /api/admin/users/:id/credits`.
- Tạo một lần dự án **"Hũ nến thơm Mộc An"**: hộp nắp gài 80 × 80 × 95 mm, quà 350 g (đáy khóa FEFCO 0215), Ivory 300 GSM
  mờ, logo SVG ở mặt trước (tải lên bucket công khai như một upload của studio), FitCheck 100.
- Muốn có lại dự án mới tinh: xóa vĩnh viễn dự án đó trong thùng rác, rồi khởi động lại backend.

Lưu ý: tài khoản có 5 lượt nên trong ExportDialog file sạch hiện "Dùng 1 lượt? Còn 5 lượt", không phải khung "Bạn đã hết
lượt xuất". Muốn diễn đúng bước "SVG → 402 → mua 1 lượt qua VietQR" của §5, dùng một tài khoản Free mới (đăng ký trước
buổi demo) hoặc đặt `SEED_DEMO_CREDITS=0`.

### 3.3. Cloudflare R2 (còn thiếu từ 2026-10-30)

Bucket `wrapfit` (r2.dev bật), `wrapfit-private`, `wrapfit-backups` đã tạo ở APAC. Còn phải làm:

1. Tạo **R2 API token** (Object Read & Write, chỉ 3 bucket trên) trong Cloudflare Dashboard, ghi vào `.env`:
   `STORAGE_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com`, `STORAGE_REGION=auto`, `STORAGE_BUCKET=wrapfit`,
   `STORAGE_PRIVATE_BUCKET=wrapfit-private`, `STORAGE_BACKUP_BUCKET=wrapfit-backups`, `STORAGE_ACCESS_KEY_ID`,
   `STORAGE_SECRET_ACCESS_KEY`, `STORAGE_PUBLIC_URL=https://pub-<id>.r2.dev` (hoặc `https://cdn.wrapfit.vn`),
   `STORAGE_FORCE_PATH_STYLE=false`.
2. CORS của bucket `wrapfit`: thêm `https://wrap-fit.vercel.app` vào `AllowedOrigins` (PUT, GET; header
   `content-type`, `content-disposition`). Hiện chỉ có `https://wrapfit.vn` và `http://localhost:3000`: thiếu thì tải
   logo lên từ bản Vercel bị trình duyệt chặn.
3. Kiểm: tải một logo lên từ studio, hoặc chạy `npm --workspace=be run storage:check` trên máy dev với các biến
   `STORAGE_*` của R2 (image production chỉ có `dist/` và `prisma/`, không có `src/` nên không chạy được script này).
   Log khởi động backend có dòng "Demo account: project … with its logo" khi seed tải được logo demo lên R2.

## 4. Deploy backend lên VPS

1. Chạy workflow `Deploy WrapFit to VPS` (tự chạy sau CI trên `main`, hoặc *Run workflow*), hoặc SSH vào VPS:

   ```bash
   cd ~/WrapFit && bash be/deploy.sh
   ```

2. Container backend tự áp migration (`prisma migrate deploy`) rồi seed. Path 2 thêm 4 migration:
   `20261030000100_billing_core`, `20261030000300_orders`, `20261030000500_payments`, `20261030000700_product_events`.
   Xem log:

   ```bash
   docker compose -f docker-compose.yml -f docker-compose.prod.yml logs backend | grep -E "migration|Seeded|Demo account"
   ```

3. Một lần sau migration: tạo sự kiện analytics cho dữ liệu cũ (dự án, file in đã có trước Path 2), để dashboard
   "Toàn WrapFit" không bắt đầu từ 0:

   ```bash
   docker compose -f docker-compose.yml -f docker-compose.prod.yml exec backend npm run db:backfill-events -- --dry-run
   ```

   ```bash
   docker compose -f docker-compose.yml -f docker-compose.prod.yml exec backend npm run db:backfill-events
   ```

4. Kiểm: `curl https://<APP_DOMAIN>/api/health` trả `"status":"ok"`, `"database":"up"`, `"redis":"up"`,
   `"worker":"up"`.

## 5. Tạo dự án Vercel cho `fe`

Người giữ tài khoản Vercel làm trên vercel.com (Q2):

1. *Add New → Project*, nhập repo GitHub `WrapFit/WrapFit`, tên dự án `wrap-fit` (cho URL `wrap-fit.vercel.app`).
2. *Root Directory*: `fe`, bật *Include files outside of the root directory in the Build Step* (fe dùng workspace
   `@wrapfit/shared`).
3. *Framework Preset*: Next.js. *Install Command*: `cd .. && npm ci`. *Build Command*:
   `cd .. && npm run build:shared && npm --workspace=fe run build`. *Output Directory*: để mặc định.
4. *Environment Variables* (Production, và Preview nếu muốn):

   | Biến | Giá trị | Vì sao |
   |---|---|---|
   | `BACKEND_INTERNAL_URL` | `https://<APP_DOMAIN>` | Đích của rewrite `/api/*`, cố định lúc build |
   | `NEXT_PUBLIC_API_URL` | `/api` | Trình duyệt gọi API trên chính origin Vercel |
   | `NEXT_PUBLIC_SITE_URL` | `https://wrap-fit.vercel.app` | Link chia sẻ, metadata |
   | `NEXT_PUBLIC_OFFLINE_DEMO` | **không đặt** | Bật thì studio xuất file trong trình duyệt, không qua backend: mất gating, VietQR, dashboard |

5. *Production Branch*: `main` (hoặc nhánh demo người dùng chọn). Deploy, mở `https://wrap-fit.vercel.app/api/health`:
   phải thấy JSON của backend. Thấy trang 404 của Next.js nghĩa là `BACKEND_INTERNAL_URL` chưa có lúc build: sửa biến
   rồi *Redeploy* (không dùng cache).
6. Thêm `https://wrap-fit.vercel.app` vào `EXTRA_CORS_ORIGINS` của VPS (3.1) và CORS của R2 (3.3), khởi động lại backend.

Giới hạn đã biết: "Đăng nhập bằng Google" quay về `GOOGLE_CALLBACK_URL` (`https://<APP_DOMAIN>/...`), nên cookie nằm ở
`<APP_DOMAIN>`, không ở `wrap-fit.vercel.app`. Trên bản Vercel, demo bằng email + mật khẩu. Link trong email xác minh /
đặt lại mật khẩu và mã QR mở hộp trỏ về `FRONTEND_URL` = `https://<APP_DOMAIN>` (cùng backend, vẫn chạy).

## 6. Kiểm trên điện thoại 4G

Tắt Wi-Fi, dùng 4G, mở `https://wrap-fit.vercel.app`. Chạy hai lần liên tiếp, bấm giờ (mục tiêu ≤ 3 phút, docs/17 §4 S8):

| # | Thao tác | Đạt khi |
|---|---|---|
| 1 | Đăng nhập tài khoản demo | Vào `/dashboard`, thấy tên "Chị Linh (demo)" |
| 2 | `/editor/new` → Hộp nắp gài → 80 × 80 × 95 → 350 g → Ivory 300 → Tạo | Chip "Đáy khóa FEFCO 0215" |
| 3 | Kéo logo sát mép cắt → Auto-Fix | FitCheck đỏ, Gói `measuring`; sau Auto-Fix chỉ logo dời, FitCheck 100 |
| 4 | Gập 0 → 100 %, xoay 360° | Nhãn Nắp, Đáy, Mặt trước trên mô hình 3D |
| 5 | Xuất → PDF A4 | File có dòng watermark ở tai dán (tài khoản Free không lượt) |
| 6 | Xuất SVG → 402 → Mua 1 lượt → QR → Giả lập | File SVG sạch, số lượt về 0 (tài khoản Free không lượt) |
| 7 | Đặt in mẫu 1 hộp → giỏ → Đặt in mẫu 49.000đ → QR → Giả lập | Đơn `PAID` trong `/dashboard/orders` |
| 8 | Quét QR trên nắp bằng camera điện thoại | Trang 3D mở hộp kèm lời chúc |
| 9 | `/dashboard` | Số hộp, kiểu hộp, lỗi FitCheck đã chặn, thời gian tạo hộp tăng |
| 10 | Quét mã VietQR trong CheckoutDialog bằng app ngân hàng (không chuyển) | Ghi lại app nào đọc được tên ngân hàng, số tiền, nội dung `WF…` (S5 chưa kiểm) |

Ghi kết quả (giờ, máy, trình duyệt, lần 1 / lần 2) vào nhật ký docs/17 §7.

## 7. Dịch vụ cloud và chi phí (Q3)

IT xác nhận số tiền thật trên trang thanh toán của từng dịch vụ rồi điền cột "Chi phí thật / tháng". Gói miễn phí theo
trang giá công khai của nhà cung cấp, kiểm lại trước khi đưa vào slide.

| Dịch vụ | Dùng cho | Gói đang dùng / đề xuất | Hạn mức miễn phí (tham khảo) | Chi phí thật / tháng |
|---|---|---|---|---|
| VPS (nhà cung cấp: IT điền) | backend, worker, PostgreSQL, Redis, Caddy, frontend dự phòng | IT điền (RAM tối thiểu ~2 GB: 4 container Node ≤ 512 MB + Postgres 512 MB) | Không | _điền_ |
| Vercel | frontend `wrap-fit.vercel.app` | Hobby | Miễn phí; điều khoản Hobby chỉ cho dùng cá nhân, phi thương mại. Bán thật cần Pro (theo thành viên) | 0đ (Hobby) |
| Cloudflare R2 | ảnh tải lên, QR, file in, bản sao lưu CSDL | Free tier | 10 GB lưu trữ / tháng, 1 triệu thao tác ghi (Class A), 10 triệu thao tác đọc (Class B), không tính phí băng thông ra | _điền_ (dự kiến 0đ) |
| Anthropic Claude API | AI sinh hoa văn (`claude-haiku-5-5`) | Trả theo token, cầu chì `AI_MONTHLY_BUDGET_USD` | Không | ≤ `AI_MONTHLY_BUDGET_USD` USD. Ước tính một lượt Haiku 13–34đ (S3, chưa có token thật) |
| Email SMTP (Resend theo docs/10) | email xác minh, đặt lại mật khẩu | Free | 3.000 email / tháng, 100 email / ngày | _điền_ |
| Cloudinary | CDN ảnh công khai (đã kết nối, chưa dùng) | Free (dùng chung tài khoản) | 25 credit / tháng | 0đ |
| Tên miền `wrapfit.vn` | `APP_DOMAIN`, email gửi đi | Nhà đăng ký: IT điền | Không | _điền_ (theo năm / 12) |
| GitHub (repo, Actions CI + deploy) | CI, deploy | Free | Repo công khai: Actions không giới hạn phút; repo riêng: 2.000 phút / tháng | 0đ |
| Let's Encrypt (qua Caddy), Google OAuth | HTTPS, đăng nhập Google | Free | Không giới hạn đáng kể | 0đ |
| VietQR (NAPAS) | QR chuyển khoản | Backend tự dựng payload (M5), không gọi dịch vụ ngoài | Không phí | 0đ |

S8 không đọc được hóa đơn (không đăng nhập tài khoản nào). Số liệu dùng thật trong 30 ngày: xem `/admin` hoặc
`GET /api/analytics/summary?scope=global&days=30` sau khi deploy.

## 8. Rủi ro khi demo và cách xử lý

| Rủi ro | Dấu hiệu | Cách xử lý |
|---|---|---|
| Mạng sân khấu yếu / mất | Trang tải chậm, xoay vòng | Dùng 4G điện thoại phát; mở sẵn các tab (studio, dashboard, giỏ in) trước khi lên; VietQR dựng tại backend nên không cần dịch vụ ngoài |
| Vercel hoặc rewrite `/api` lỗi | `/api/health` trên Vercel trả 404 / 502 | Chuyển sang `https://<APP_DOMAIN>` (VPS phục vụ cả frontend), cùng tài khoản và dữ liệu |
| Backend VPS chết | Mọi trang báo "Máy chủ…" | `docker compose ... ps`, `logs backend`; khởi động lại `docker compose ... up -d`. Dự phòng cuối: video quay sẵn kịch bản §5 |
| Worker chết, file in không ra | ExportDialog đứng ở "Đang dựng file" quá 30 s | `/api/health` báo `worker` khác `up`: `docker compose ... restart worker`. Lượt đã trừ được hoàn tự động khi job thất bại (docs/16 §5.3) |
| Quên bật `PAYMENT_SIMULATION` | CheckoutDialog không có nút "Giả lập đã thanh toán" | Đặt `PAYMENT_SIMULATION=true` trong `.env`, `docker compose ... up -d backend` |
| Tài khoản demo hết lượt sau buổi tập | Khung "Bạn đã hết lượt xuất" | Đúng là bước 6 của §6 (mua 1 lượt qua VietQR giả lập). Muốn nạp lại: khởi động lại backend (seed nạp đủ `SEED_DEMO_CREDITS`) hoặc admin cấp lượt |
| Tài khoản demo còn lượt nên không thấy 402 | Hộp thoại "Dùng 1 lượt? Còn N lượt" | Diễn bằng tài khoản Free mới, hoặc nói rõ "tài khoản đã mua gói 5 lượt" rồi bấm "Dùng 1 lượt" |
| Tên xưởng "Minh Tâm Prolab" của kịch bản không có trong danh sách xưởng | Giỏ in chỉ có 4 xưởng mẫu (Sài Gòn Xanh, Hà Thành, Đà Nẵng, Cần Thơ) | Chọn "Để WrapFit chọn xưởng phù hợp" hoặc một xưởng mẫu; muốn đúng tên cần thêm xưởng vào `be/src/print-shops/print-shops.service.ts` (danh sách tĩnh) |
| Hết ngân sách AI hoặc chưa có `ANTHROPIC_API_KEY` | Hoa văn "AI" là hoa văn thuật toán | Không chặn demo; nói rõ cầu chì chi phí là tính năng (S3) |
| Throttle (100 request / phút / IP, 10 lần đăng nhập) khi cả hội đồng dùng chung Wi-Fi | 429 | Hội đồng thử trên 4G riêng; demo chính dùng một máy |
| Đăng nhập Google trên bản Vercel | Đăng nhập xong vẫn ở trạng thái khách | Dùng email + mật khẩu (mục 5) |
| Quét VietQR bằng app ngân hàng thật báo lỗi | App không nhận mã | Chưa kiểm bằng app thật (S5). Demo dùng nút giả lập; kiểm trước bằng mục 6 bước 10 |
| Lộ mật khẩu demo trên màn hình chiếu | — | Đăng nhập trước khi chiếu; mật khẩu chỉ trong `.env` VPS, không vào slide |

## 9. Ảnh bàn giao cho slide

Chụp bằng `npm --workspace=fe run shots` và `node fe/scripts/e2e-scenario.mjs`, nằm trong `fe/.page-shots/`
(thư mục bị git bỏ qua: chép sang thư mục slide khi cần). Danh sách và tên file: nhật ký S8 ở docs/17 §7.

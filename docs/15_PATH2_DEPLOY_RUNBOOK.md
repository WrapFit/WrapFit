# 15 — Runbook deploy và demo bản Path 2

> Ngày lập: 2026-10-30, trong đợt hoàn thiện MVP Path 2 cho buổi demo CP4. Cập nhật: 2026-11-19, đồng bộ với mã sau
> audit backend và review backend (luồng đặt in mẫu thay cho mua lượt xuất, hai migration mới, luật giả lập thanh toán).
> Nhánh deploy: `main` (đã gộp `develop`).
> Mục tiêu: `https://wrap-fit.vercel.app` chạy thật kịch bản demo 3 phút (§6.1) trên điện thoại 4G.
> Mọi bước cần đăng nhập (GitHub, VPS, Vercel, Cloudflare, Anthropic, fal.ai, SePay, VNPay) do người giữ tài khoản tự
> làm. File này không chứa mật khẩu, khóa hay token: chỉ tên biến và chỗ điền.

Mục lục: [0. Trạng thái](#0-trạng-thái) · [1. Kiến trúc](#1-kiến-trúc-bản-demo) ·
[2. Trước khi deploy](#2-trước-khi-deploy) · [3. Biến môi trường VPS](#3-biến-môi-trường-trên-vps) ·
[4. Deploy thường kỳ](#4-deploy-thường-kỳ-và-kiểm-sau-deploy) · [5. Vercel](#5-tạo-dự-án-vercel-cho-fe) ·
[6. Kiểm và nghiệm thu](#6-kiểm-và-nghiệm-thu) · [7. Chi phí cloud](#7-dịch-vụ-cloud-và-chi-phí) ·
[8. Rủi ro demo](#8-rủi-ro-khi-demo-và-cách-xử-lý) · [9. Ảnh bàn giao](#9-ảnh-bàn-giao-cho-slide)

---

## 0. Trạng thái

Mỗi dòng ghi một trong ba mức: **có mã trên `develop`**, **đã kiểm bằng test hoặc E2E** (kèm ngày), hoặc **chờ kiểm
thực tế** (kèm vai trò người kiểm).

| Hạng mục | Trạng thái |
|---|---|
| Mã của mọi bước trong runbook (seed demo, cổng thanh toán, quyền xuất theo đơn in, migration, script đổi lượt xuất) | Có mã trên `develop`, đã gộp vào `main` |
| Unit và E2E backend | Đã kiểm bằng test, 19/11/2026: 1.180/1.180 unit (77 bộ), 318/318 E2E (24 bộ) |
| Kịch bản FE `fe/scripts/e2e-scenario.mjs` theo luồng đặt in mẫu | Đã kiểm bằng E2E trên máy local, 19/11/2026 và chạy lại 20/11/2026 (`M` và `Xp`, bước `1-14,16-18`). Ảnh bàn giao ở §9 |
| Trình tự deploy lần này (§2.3) | Chờ kiểm thực tế (người deploy) |
| R2 API token và CORS cho Vercel (§3.3) | Chờ kiểm thực tế (người giữ tài khoản Cloudflare) |
| Lượt A: tài khoản demo, VNPay sandbox (§6.1) | Chờ kiểm thực tế (người giữ tài khoản VNPay sandbox, người demo) |
| Lượt B: tài khoản thường, VietQR/SePay, quét QR (§6.2) | Chờ kiểm thực tế (người giữ tài khoản ngân hàng và SePay) |
| Deploy và bấm giờ hai lượt trên 4G (§6.3) | Chờ kiểm thực tế (người deploy) |

## 1. Kiến trúc bản demo

```text
Điện thoại / laptop hội đồng
        │  https://wrap-fit.vercel.app  (trang, JS, ảnh tĩnh)
        ▼
Vercel (Next.js 15, thư mục fe/) ── rewrite /api/* ──►  https://<APP_DOMAIN>/api/*   (VPS, Caddy HTTPS)
                                                        ├─ backend (NestJS API) ── PostgreSQL, Redis
                                                        └─ worker (BullMQ: hàng đợi export, mail, ai-image)
Trình duyệt ── PUT ảnh tải lên / GET ảnh ──► Cloudflare R2 (bucket wrapfit, r2.dev)
```

- Trình duyệt chỉ gọi `/api` trên chính `wrap-fit.vercel.app`; Vercel chuyển tiếp tới VPS
  (`fe/next.config.mjs`, `rewrites()` đọc `BACKEND_INTERNAL_URL` **lúc build**). Cookie đăng nhập vì vậy là cookie của
  `wrap-fit.vercel.app`, không cần cookie khác miền.
- VPS vẫn phục vụ frontend của chính nó ở `https://<APP_DOMAIN>` (Caddy, `docker-compose.prod.yml`). Đây là **phương án
  dự phòng**: nếu Vercel lỗi lúc demo, mở thẳng `https://<APP_DOMAIN>`, cùng dữ liệu, cùng tài khoản.
- FitCheck chặn ở API ngay khi tạo job xuất: thiết kế còn lỗi mức `error` nhận `422`, không vào hàng đợi.
- Câu hỏi còn mở từ đợt CP4: ai giữ dự án Vercel, API production ở tên miền nào. Runbook giả định
  `APP_DOMAIN=wrapfit.vn` (giá trị đã dùng khi tạo CORS của R2, 2026-10-30). Đổi tên miền thì thay ở mọi chỗ ghi
  `<APP_DOMAIN>`.

## 2. Trước khi deploy

### 2.1. Điều kiện

1. Mã cần deploy đã ở `main` và CI xanh trên `main`. Mốc test của backend ở §0.
2. Kịch bản FE `fe/scripts/e2e-scenario.mjs` đi theo luồng đặt in mẫu (điều kiện chạy ở §9). Chạy kịch bản trên máy
   local, rồi diễn tập §6.1 bằng tay trên môi trường thử trước khi deploy.
3. GitHub secrets của repo `WrapFit/WrapFit`: `VPS_HOST`, `VPS_USERNAME`, `VPS_SSH_KEY` (hoặc `VPS_PASSWORD`),
   `VPS_PORT`. Thiếu `VPS_HOST` thì workflow chỉ cảnh báo và bỏ qua bước SSH.

> **Lưu ý.** Workflow `Deploy WrapFit to VPS` tự chạy sau khi CI xanh trên `main` (hoặc chạy tay bằng
> `workflow_dispatch`). Workflow chỉ gọi [`be/deploy.sh`](../be/deploy.sh): kéo mã, dựng image, khởi động lại mọi
> container. Lần deploy này cần làm theo trình tự ở §2.3, nên **làm tay qua SSH** và không để workflow chạy giữa chừng
> (ví dụ: chưa đặt `VPS_HOST`, hoặc làm xong §2.3 rồi mới đẩy commit mới lên `main`).

### 2.2. Kiểm `.env` trên VPS

Sửa `~/WrapFit/.env` theo §3 trước khi bắt đầu. Ba điểm hay sai:

1. `PAYMENT_SIMULATION`. Container luôn chạy với `NODE_ENV=production`. Khi đó `PAYMENT_SIMULATION=true` cùng đủ ba
   `VIETQR_*` thật làm API **từ chối khởi động** ([kiểm cấu hình](../be/src/config/env.validation.ts)). Bán thật thì
   đặt `false`. Chỉ bật `true` khi cố ý chạy bản demo không nhận tiền thật, với cả ba `VIETQR_*` để trống. Luật đầy đủ
   ở §3.1.
2. `VIETQR_BANK_BIN`, `VIETQR_ACCOUNT_NO`, `VIETQR_ACCOUNT_NAME` đặt cả ba hoặc để trống cả ba. `VNPAY_TMN_CODE` và
   `VNPAY_HASH_SECRET` đặt cả hai hoặc để trống cả hai. Sai một trong hai luật này thì API cũng không khởi động.
3. Các biến R2 (§3.3). `docker-compose.prod.yml` dừng ngay nếu thiếu một biến bắt buộc, trước khi thay container nào.

### 2.3. Trình tự deploy lần này

Từ bản đang chạy trên VPS lên bản hiện tại có hai việc phải làm khi API và worker cũ đã dừng:

- **Hai migration tham chiếu phông và thiết kế của job** (`20261118000100_font_file_refs`,
  `20261118000200_export_job_design`). Migration đầu bổ sung các tham chiếu tới phông tải lên mà bảng
  `project_file_refs` bỏ sót. Nếu bản cũ còn chạy sau migration này, mỗi lần lưu canvas sẽ xóa lại các tham chiếu đó, và
  tác vụ dọn file hằng ngày sẽ xóa phông mà thiết kế vẫn dùng.
- **Đổi lượt xuất còn lại sang xu.** Gói lượt xuất đã ngừng bán, file in chỉ mở bằng đơn in mẫu đã thanh toán. Script
  [`convert-export-credits.ts`](../be/prisma/scripts/convert-export-credits.ts) chạy tay một lần. Script không chạy từ
  migration hay lúc khởi động.

Trình tự dưới chạy trên VPS, trong thư mục repo. Tên container `wrapfit-postgres`, người dùng `postgres` và CSDL `wrapfit`
là mặc định của compose. Nếu `.env` đặt `POSTGRES_USER` hoặc `POSTGRES_DB` khác thì thay tương ứng.

```bash
cd ~/WrapFit
COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"
```

1. **Sao lưu CSDL production.**

   ```bash
   docker exec wrapfit-postgres pg_dump -U postgres -Fc wrapfit > ~/wrapfit-before-deploy-$(date +%F).dump
   ```

2. **Bước đếm khoản xu hoa văn AI chờ hoàn đã chuyển xuống bước 6a**, sau khi dừng bản cũ và áp migration. Lúc đó không
   còn yêu cầu mới, và CSDL đã có đủ bảng theo schema mới.

3. **Đếm lượt xuất còn hạn (chỉ đọc).** Kết quả `0` (hoặc lỗi "relation does not exist" khi CSDL chưa có bảng
   `credit_lots`) nghĩa là không có gì để đổi: bỏ qua bước 7.

   ```bash
   docker exec wrapfit-postgres psql -U postgres -d wrapfit -c "SELECT count(DISTINCT user_id) AS users, coalesce(sum(remaining), 0) AS credits FROM credit_lots WHERE kind = 'EXPORT' AND remaining > 0 AND (expires_at IS NULL OR expires_at > now())"
   ```

   Nếu CSDL đã có bảng `social_mockups`, kiểm thêm bảng này không có dòng nào
   (`SELECT count(*) FROM social_mockups`). Migration `20261117000100_drop_social_mockups` xóa bảng. Chưa từng có mã
   nào ghi vào bảng này, nên kết quả mong đợi là `0`.

4. **Kéo mã và dựng image mới.** Bước này chưa thay container nào.

   ```bash
   git pull origin main
   $COMPOSE build
   ```

5. **Dừng API và worker cũ.** Caddy và frontend vẫn chạy; trong lúc dừng, trang báo lỗi máy chủ.

   ```bash
   $COMPOSE stop backend worker
   ```

6. **Áp migration bằng image mới, chưa khởi động API.** Lệnh này áp mọi migration còn thiếu (danh sách ở §4), trong đó có
   hai migration ở trên. Các migration tạo lại khóa ngoại, `CHECK` và chỉ mục thường (không `CONCURRENTLY`), nên giữ khóa
   ghi ngắn trên vài bảng nhỏ. API đã dừng nên không ảnh hưởng.

   ```bash
   $COMPOSE run --rm --no-deps --entrypoint npx backend prisma migrate deploy
   $COMPOSE run --rm --no-deps --entrypoint npx backend prisma migrate status
   ```

   `migrate status` phải báo CSDL đã cập nhật đủ. Migration chạy trước bước 7 vì script đổi lượt xuất dùng mã mới, đọc
   các bảng theo schema mới.

7. **Đổi lượt xuất còn lại sang xu** (bỏ qua nếu bước 3 ra `0`). Script import mã trong `be/src`, mà image production
   chỉ có `dist/` và `prisma/`. Vì vậy lệnh dưới gắn thư mục `be/src` của bản vừa kéo vào container. Chạy thử trước (in
   số, không ghi), đọc số, rồi chạy thật:

   ```bash
   $COMPOSE run --rm --no-deps -v "$PWD/be/src:/app/be/src:ro" --entrypoint npm backend run db:convert-export-credits
   $COMPOSE run --rm --no-deps -v "$PWD/be/src:/app/be/src:ro" --entrypoint npm backend run db:convert-export-credits -- --apply
   ```

   Quy tắc của script: lô đã mua đổi thành lô xu `PURCHASE`, bằng `ceil(còn lại × số tiền đã trả / số lượt / 100)` xu,
   giữ thanh toán gốc và hạn dùng của lô cũ. Lô tặng (admin, seed demo cũ) về 0, không đổi gì. Lô đã hết hạn để nguyên.
   Chạy lại không đổi thêm gì. Trạng thái: script đã kiểm bằng E2E (16/11/2026), cách chạy trong container **chờ kiểm
   thực tế (người deploy)**. Nếu lệnh lỗi, vẫn khởi động bản mới được: bản mới không đọc hay trừ lượt xuất cũ, nên có
   thể đổi sau, bằng cùng lệnh.

6a. **Lưu danh sách khoản xu hoa văn AI sẽ được hoàn (chỉ đọc).** Bản mới có tác vụ chạy 5 phút một lần, hoàn xu cho
   các lần trừ `AI_PATTERN` trong 7 ngày gần nhất, **đã quá 10 phút**, chưa hoàn và không có dòng `ai_generations`. Mỗi
   lần chạy, tác vụ xét tối đa 100 khoản, khóa từng khoản rồi đọc lại trước khi hoàn
   ([tác vụ hoàn xu](../be/src/ai/ai-pattern.service.ts)). Vì vậy không so số dòng log với một con số đếm trước: lưu danh
   sách `operation_id` đủ điều kiện rồi đối chiếu từng mã ở bước 9.

   ```bash
   rm -f ~/orphan-pattern-ops.txt ~/orphan-pattern-ops.tmp
   if docker exec wrapfit-postgres psql -U postgres -d wrapfit -At -v ON_ERROR_STOP=1 -c "SELECT DISTINCT operation_id FROM credit_debits d WHERE reason = 'AI_PATTERN' AND refunded_at IS NULL AND created_at > now() - interval '7 days' AND created_at < now() - interval '10 minutes' AND NOT EXISTS (SELECT 1 FROM ai_generations g WHERE g.debit_operation_id = d.operation_id)" > ~/orphan-pattern-ops.tmp; then
     mv ~/orphan-pattern-ops.tmp ~/orphan-pattern-ops.txt
     echo "Truy vấn thành công: $(wc -l < ~/orphan-pattern-ops.txt) khoản chờ hoàn"
   else
     echo "TRUY VẤN LỖI: dừng lại, sửa lỗi rồi chạy lại bước này" >&2
     false
   fi
   ```

   Lệnh chỉ tạo `~/orphan-pattern-ops.txt` khi `psql` chạy thành công. Khi lỗi, khối lệnh trả mã khác 0 (`false`, không
   dùng `exit` để khỏi đóng phiên SSH), nên script tự động gọi khối này cũng dừng được. Thấy "TRUY VẤN LỖI", hoặc không có file này, thì
   **chưa** khởi động bản mới: đọc lỗi `psql` ngay phía trên, sửa (thường là sai tên container hoặc CSDL), rồi chạy lại
   bước 6a.

8. **Khởi động bản mới.** Container backend chạy lại `prisma migrate deploy` (không còn gì để áp), seed, rồi mở API.
   Worker chờ backend khỏe rồi mới chạy.

   ```bash
   $COMPOSE up -d --remove-orphans
   $COMPOSE ps
   ```

9. **Kiểm sau khi khởi động.**
   - `curl https://<APP_DOMAIN>/api/health` trả `"status":"ok"`, `"database":"up"`, `"redis":"up"`, `"worker":"up"`.
   - **Hoàn xu hoa văn AI.** Chỉ bỏ qua khi bước 6a báo "Truy vấn thành công: 0 khoản chờ hoàn". Không có file
     `~/orphan-pattern-ops.txt` nghĩa là bước 6a chưa chạy thành công: quay lại bước đó, không được bỏ qua. Mỗi 5 phút tác vụ xử lý tối đa 100 khoản, nên chờ ít
     nhất `ceil(số mã / 100) × 5` phút, rồi đếm các mã trong danh sách vẫn chưa hoàn và chưa có kết quả:

     ```bash
     IDS=$(paste -sd, ~/orphan-pattern-ops.txt)
     docker exec wrapfit-postgres psql -U postgres -d wrapfit -c "SELECT count(DISTINCT operation_id) FROM credit_debits d WHERE operation_id = ANY(string_to_array('$IDS', ',')::uuid[]) AND refunded_at IS NULL AND NOT EXISTS (SELECT 1 FROM ai_generations g WHERE g.debit_operation_id = d.operation_id)"
     ```

     Kết quả mong đợi là `0`. Một mã vẫn còn thì tra log để biết lý do: `$COMPOSE logs backend worker | grep ai_pattern`. Mỗi lần
     hoàn ghi một dòng `ai_pattern.orphan_refunded op=<operation_id> xu=<số xu>`. Mã nào có dòng `ai_generations` được tạo
     muộn thì không được hoàn, và đó là hành vi đúng.

   - **Job xuất cũ.** Job tạo trước migration `20261118000200_export_job_design` có `design = NULL`. Worker vẫn xử lý
     được, bằng nhánh tương thích: dựng file từ dự án ở thời điểm chạy, thay vì từ thiết kế đã chốt lúc tạo job
     ([xử lý job](../be/src/export/export.processor.ts)). Liệt kê các job cũ còn chờ:

     ```bash
     docker exec wrapfit-postgres psql -U postgres -d wrapfit -c "SELECT id, status, created_at FROM export_jobs WHERE design IS NULL AND status IN ('PENDING', 'PROCESSING')"
     ```

     Không cần làm gì với các job này: để worker xử lý xong, hoặc để tác vụ đối soát export đổi job treo sang lỗi. Nếu dự
     án của một job cũ đã bị sửa sau khi tạo job, file in ra theo bản đã sửa. Khi truy vấn trên trả về rỗng, dev BE có
     thể bỏ nhánh tương thích ở bản phát hành sau.

10. **Một lần, nếu CSDL có dữ liệu từ trước Path 2:** tạo sự kiện analytics cho dữ liệu cũ (§4, bước 3).

### 2.4. Giới hạn vận hành cần biết

- **Chỉ chạy một API và một worker.** Throttler, cầu chì chi phí AI và Socket.IO giữ trạng thái trong bộ nhớ từng
  process. Trước khi chạy từ hai process API trở lên, phải làm lại ba phần đó: lưu trạng thái throttler trong Redis, dùng
  Redis adapter cho Socket.IO, cho cầu chì AI đọc thẳng CSDL. Việc này đang hoãn, theo dõi ở
  [18 · Việc còn treo](18_VIEC_CON_TREO_SAU_AUDIT_BE.md) và [07 · Blueprint hệ thống](07_SYSTEM_BLUEPRINT_AND_TASK_BREAKDOWN.md#16-điều-kiện-khi-chạy-nhiều-instance-api).
- **Đăng xuất xóa cookie của cả tên miền.** Logout gửi `Clear-Site-Data: "cookies"`, xóa cookie của cả tên miền đăng ký,
  kể cả subdomain khác. Kiểm không có ứng dụng nào khác dùng chung tên miền với cookie cần giữ.
- **Tên cookie cũ.** Ở production, cookie đăng nhập mang tiền tố `__Secure-`. Bản hiện tại vẫn đọc và xóa tên cookie cũ
  để phiên đang mở không bị đăng xuất. Dev BE bỏ phần đọc tên cũ ở bản phát hành sau.

## 3. Biến môi trường trên VPS

Sửa `~/WrapFit/.env` trên VPS (file ở gốc repo, `docker compose` đọc). Các biến đã có từ trước (JWT, Postgres, Redis,
SMTP, Google) giữ nguyên; danh sách đầy đủ ở [`be/README.md`](../be/README.md), mục "Biến môi trường" và "Triển khai
production".

### 3.1. Biến thêm từ Path 2

| Biến | Giá trị cho bản demo | Ghi chú |
|---|---|---|
| `AI_MODEL` | **xóa dòng này** | Tên cũ của `AI_MODEL_FAST`. Nếu còn `AI_MODEL=claude-opus-5-5`, mọi lượt AI chạy bằng Opus (đắt gấp ~40 lần Haiku) |
| `AI_MODEL_FAST` | `claude-haiku-5-5` | Mặc định trong compose, có thể không ghi |
| `AI_MODEL_PREMIUM` | `claude-opus-5-5` | Chỉ gói khác Free mới dùng được (`quality: 'premium'`) |
| `AI_MONTHLY_BUDGET_USD` | đề xuất `5` | Cầu chì: vượt ngân sách tháng (giờ VN) thì hoa văn sinh bằng thuật toán, không gọi Claude. Trống = không giới hạn |
| `ANTHROPIC_API_KEY` | khóa của tài khoản Anthropic | Trống = chỉ hoa văn thuật toán (miễn phí), demo vẫn chạy |
| `PAYMENT_SIMULATION` | `false` khi bán thật. `true` chỉ khi cố ý chạy bản demo không nhận tiền thật, cùng `VIETQR_*` trống | Bật nút "Giả lập đã thanh toán". Luật: tài khoản demo (`users.is_demo`) luôn được giả lập. Tài khoản thường chỉ được giả lập khi máy chủ chưa cấu hình `VIETQR_*` (QR dùng tài khoản mẫu "WRAPFIT MO PHONG", không thể nhận tiền thật). Có tài khoản VietQR thật thì tài khoản thường giả lập nhận `403 SIMULATION_DEMO_ONLY`. Trên VPS (`NODE_ENV=production`), `true` cùng `VIETQR_*` thật làm API không khởi động, nên ca `403` chỉ gặp ở môi trường dev |
| `VIETQR_BANK_BIN`, `VIETQR_ACCOUNT_NO`, `VIETQR_ACCOUNT_NAME` | trống, hoặc tài khoản ngân hàng thật | Đặt cả ba hoặc để trống cả ba. Trống = tài khoản mẫu, giao diện ghi "Mô phỏng". Có tài khoản thật thì cần thêm webhook SePay (3.4) |
| `SEED_DEMO_EMAIL` | `demo@wrapfit.vn` (mặc định) | Tài khoản demo, xem 3.2 |
| `SEED_DEMO_PASSWORD` | mật khẩu riêng, chỉ người demo biết | Trống = không tạo tài khoản demo. Không ghi vào slide, tài liệu, chat |
| `FAL_KEY` | khóa fal.ai (Xu Wrap, [16](16_XU_WRAP_SPEC.md)) | Truyền vào cả `backend` và `worker`. Trống = tắt ảnh AI (studio báo "đang tắt"), hoa văn và phần còn lại vẫn chạy. Không ghi vào slide, tài liệu, chat |
| `AI_IMAGE_PROVIDER` | `fal` (mặc định) | `fake` chỉ cho dev / e2e, bị từ chối khi `NODE_ENV=production` |
| `AI_IMAGE_MODELS` | trống | Trống = các model có `enabled: true`. GPT Image 2 medium chưa đo giá thật ([16](16_XU_WRAP_SPEC.md) §3): bỏ khỏi danh sách nếu muốn chắc biên, vd. `flux2-klein,gpt-image-2-low,seedream-4.5,nano-banana-2,recraft-v3-vector,nano-banana-pro` |
| `AI_IMAGE_TIMEOUT_MS`, `AI_IMAGE_CONCURRENCY` | `180000`, `2` (mặc định) | Worker: thời gian chờ một job ở fal, số job ảnh chạy song song |
| `USD_VND_RATE` | `26000` (mặc định) | Tỉ giá quy đổi chi phí model trong báo cáo `/admin/xu` |
| `EXTRA_CORS_ORIGINS` | `https://wrap-fit.vercel.app` | Origin của frontend Vercel, để `OriginGuard` (CSRF) và CORS nhận request được Vercel chuyển tiếp. Nhiều origin: ngăn cách bằng dấu phẩy |
| `SEPAY_WEBHOOK_API_KEY` | chuỗi ngẫu nhiên 16–256 ký tự, không khoảng trắng (`openssl rand -hex 24`) | Chỉ khi nhận tiền thật qua SePay. Trống = mọi webhook bị từ chối `401`. Điền cùng giá trị vào cấu hình webhook trên SePay (3.4). Không ghi vào slide, tài liệu, chat |
| `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET` | "Mã website" (8 ký tự) và "Chuỗi bí mật" của sandbox VNPay | Đặt cả hai hoặc để trống cả hai. Trống = tài khoản demo không mở được cổng VNPay: `503 VNPAY_NOT_CONFIGURED`, trừ khi `PAYMENT_SIMULATION=true` (khi đó thanh toán vẫn tạo, chỉ còn nút giả lập). Xem 3.5 |
| `VNPAY_PAY_URL` | `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html` (mặc định trong compose) | Không để trống: backend từ chối khởi động nếu không phải URL hợp lệ |
| `VNPAY_RETURN_URL` | `https://wrap-fit.vercel.app/payments/vnpay-return` | Trang FE nhận trình duyệt quay về từ VNPay. Trống = `${FRONTEND_URL}/payments/vnpay-return`, tức `https://<APP_DOMAIN>/...`; trên bản Vercel phải đặt rõ để cookie đăng nhập của `wrap-fit.vercel.app` đi kèm |

`PEXELS_API_KEY` (ảnh kho trong studio) có trong cấu hình backend nhưng `docker-compose.yml` chưa truyền biến này vào
container. Trên VPS, ảnh kho vì vậy đang tắt (`503 STOCK_UNAVAILABLE`) dù `.env` có khóa. Demo không dùng ảnh kho.

### 3.2. Tài khoản demo ([`be/prisma/seed-demo.ts`](../be/prisma/seed-demo.ts))

Container backend chạy `prisma db seed` mỗi lần khởi động. Khi có `SEED_DEMO_PASSWORD`:

- Tạo một lần tài khoản `MAKER` gói **Free**, email đã xác minh, tên "Chị Linh (demo)", cửa hàng "Nến thơm Mộc An".
  Địa chỉ đã thuộc tài khoản khác vai trò thì bỏ qua (không chiếm tài khoản).
- Bật cờ `is_demo` cho `SEED_DEMO_EMAIL` ở mỗi lần khởi động, kể cả tài khoản đã tồn tại. Tài khoản demo thanh toán qua
  VNPay sandbox (3.5).
- Không nạp lượt xuất. File in chỉ mở bằng đơn in mẫu đã thanh toán, đúng phiên bản thiết kế. Lượt xuất còn lại từ bản cũ
  đã đổi sang xu ở §2.3, bước 7.
- Tạo một lần dự án **"Hũ nến thơm Mộc An"**: hộp nắp gài 80 × 80 × 95 mm, quà 350 g (đáy khóa FEFCO 0215), Ivory 300 GSM
  mờ, logo SVG ở mặt trước (tải lên bucket công khai như một upload của studio), FitCheck 100.
- Muốn có lại dự án mới tinh: xóa vĩnh viễn dự án đó trong thùng rác, rồi khởi động lại backend. Dự án đang có đơn in
  `PENDING_PAYMENT`, `PAID` hoặc `IN_PRODUCTION` thì không xóa vĩnh viễn được (`409 PROJECT_IN_ACTIVE_ORDER`).

### 3.3. Cloudflare R2

Bucket `wrapfit` (r2.dev bật), `wrapfit-private`, `wrapfit-backups` đã tạo ở APAC ngày 2026-10-30. Còn phải làm (chờ kiểm
thực tế, người giữ tài khoản Cloudflare):

1. Tạo **R2 API token** (Object Read & Write, chỉ 3 bucket trên) trong Cloudflare Dashboard, ghi vào `.env`:
   `STORAGE_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com`, `STORAGE_REGION=auto`, `STORAGE_BUCKET=wrapfit`,
   `STORAGE_PRIVATE_BUCKET=wrapfit-private`, `STORAGE_BACKUP_BUCKET=wrapfit-backups`, `STORAGE_ACCESS_KEY_ID`,
   `STORAGE_SECRET_ACCESS_KEY`, `STORAGE_PUBLIC_URL=https://pub-<id>.r2.dev` (hoặc `https://cdn.wrapfit.vn`),
   `STORAGE_FORCE_PATH_STYLE=false`.
2. CORS của bucket `wrapfit`: thêm `https://wrap-fit.vercel.app` vào `AllowedOrigins` (PUT, GET; header
   `content-type`, `content-disposition`). Hiện chỉ có `https://wrapfit.vn` và `http://localhost:3000`: thiếu thì tải
   logo lên từ bản Vercel bị trình duyệt chặn.
3. Kiểm: tải một logo lên từ studio, hoặc chạy `npm --workspace=be run storage:check` trên máy dev với các biến
   `STORAGE_*` của R2 (image production không có `src/` nên không chạy được script này).
   Log khởi động backend có dòng "Demo account: project … with its logo" khi seed tải được logo demo lên R2.

### 3.4. Webhook SePay (tiền thật)

Chỉ làm khi đã điền `VIETQR_*` bằng tài khoản ngân hàng thật và `PAYMENT_SIMULATION=false`. Tài khoản `is_demo` không
đi đường này.

1. Trên my.sepay.vn: liên kết tài khoản ngân hàng nhận tiền (đúng tài khoản trong `VIETQR_BANK_BIN`, `VIETQR_ACCOUNT_NO`).
2. *Tích hợp Webhooks → Thêm webhooks*: URL `https://<APP_DOMAIN>/api/webhooks/sepay` (miền VPS, **không** qua Vercel; có
   tiền tố `/api`), sự kiện *Có tiền vào*, kiểu chứng thực **API Key**, giá trị = `SEPAY_WEBHOOK_API_KEY`. SePay gửi
   header `Authorization: Apikey <key>`.
3. Khởi động lại backend (`$COMPOSE up -d backend`, với `COMPOSE` như ở §2.3). Thiếu key thì log lúc khởi động có dòng lỗi và mọi webhook bị `401`.
4. Kiểm bằng tiền thật: §6.2.

### 3.5. VNPay sandbox cho tài khoản demo

1. Đăng ký tại sandbox.vnpayment.vn, lấy "Mã website" (`VNPAY_TMN_CODE`) và "Chuỗi bí mật" (`VNPAY_HASH_SECRET`) trong
   email sandbox.
2. Trong cổng quản lý sandbox khai **IPN URL**: `https://<APP_DOMAIN>/api/payments/vnpay/ipn` (VNPay gọi bằng `GET`, miền
   VPS).
3. Đặt `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_RETURN_URL` (3.1), khởi động lại backend. Backend từ chối khởi động
   nếu chỉ điền một trong hai biến đầu.
4. Tài khoản đi đường VNPay khi `users.is_demo = true`. Seed demo (3.2) bật cờ cho `SEED_DEMO_EMAIL`. Tài khoản khác:
   admin bật / tắt ở *Quản trị → Tài khoản → chi tiết* hoặc `PATCH /api/users/:id { "isDemo": true }`.
5. Kiểm bằng thẻ test: §6.1.

## 4. Deploy thường kỳ và kiểm sau deploy

Các lần deploy sau, khi không còn bước nào phải làm lúc API dừng như §2.3:

1. Chạy workflow `Deploy WrapFit to VPS` (tự chạy sau CI trên `main`, hoặc *Run workflow*), hoặc SSH vào VPS:

   ```bash
   cd ~/WrapFit && bash be/deploy.sh
   ```

2. Container backend tự áp migration (`prisma migrate deploy`) rồi seed. Migration từ Path 2 trở đi:
   - Path 2: `20261030000100_billing_core`, `20261030000300_orders`, `20261030000500_payments`,
     `20261030000700_product_events`.
   - Xu Wrap: `20261031000100_xu_enums`, `20261031000200_xu_wallet`, `20261031000300_ai_images`,
     `20261031000400_ai_pattern_xu`.
   - Cổng thanh toán và ví: `20261110000100_payment_gateways` (cột `users.is_demo`, `payments.provider` /
     `confirmed_via` / `provider_txn_id`, bảng `bank_transactions`), `20261111000100_promo_and_billing_details`,
     `20261112000100_xu_custom_topup`.
   - Studio: `20261114000100_font_uploads`, `20261114000200_ai_tool_uploads`, `20261115000100_design_review`,
     `20261115000200_beverage_industry`, `20261117000100_cup_carrier_template`.
   - Sửa sau audit backend: `20261116000100_order_code_six_digits`, `20261116000200_ai_pattern_orphan_refund`,
     `20261116000300_bank_tx_order_not_payable`, `20261116000400_user_anonymization`, `20261116000500_notifications`,
     `20261117000100_drop_social_mockups`.
   - Sửa sau review backend: `20261118000100_font_file_refs`, `20261118000200_export_job_design` (phải áp khi API và
     worker cũ đã dừng, xem §2.3).

   Xem log:

   ```bash
   docker compose -f docker-compose.yml -f docker-compose.prod.yml logs backend | grep -E "migration|Seeded|Demo account"
   ```

3. Một lần sau migration, nếu CSDL có dữ liệu từ trước Path 2: tạo sự kiện analytics cho dữ liệu cũ (dự án, file in đã
   có), để dashboard "Toàn WrapFit" không bắt đầu từ 0. Chạy thử trước, rồi chạy thật:

   ```bash
   docker compose -f docker-compose.yml -f docker-compose.prod.yml exec backend npm run db:backfill-events -- --dry-run
   ```

   ```bash
   docker compose -f docker-compose.yml -f docker-compose.prod.yml exec backend npm run db:backfill-events
   ```

4. Kiểm: `curl https://<APP_DOMAIN>/api/health` trả `"status":"ok"`, `"database":"up"`, `"redis":"up"`,
   `"worker":"up"`.

## 5. Tạo dự án Vercel cho `fe`

Người giữ tài khoản Vercel làm trên vercel.com:

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
   | `NEXT_PUBLIC_OFFLINE_DEMO` | **không đặt** | Bật thì studio xuất file trong trình duyệt, không qua backend: mất quyền xuất theo đơn in, thanh toán, dashboard |

5. *Production Branch*: `main` (hoặc nhánh demo người dùng chọn). Deploy, mở `https://wrap-fit.vercel.app/api/health`:
   phải thấy JSON của backend. Thấy trang 404 của Next.js nghĩa là `BACKEND_INTERNAL_URL` chưa có lúc build: sửa biến
   rồi *Redeploy* (không dùng cache).
6. Thêm `https://wrap-fit.vercel.app` vào `EXTRA_CORS_ORIGINS` của VPS (3.1) và CORS của R2 (3.3), khởi động lại backend.

Giới hạn đã biết: "Đăng nhập bằng Google" quay về `GOOGLE_CALLBACK_URL` (`https://<APP_DOMAIN>/...`), nên cookie nằm ở
`<APP_DOMAIN>`, không ở `wrap-fit.vercel.app`. Trên bản Vercel, demo bằng email + mật khẩu. Link trong email xác minh /
đặt lại mật khẩu và mã QR mở hộp trỏ về `FRONTEND_URL` = `https://<APP_DOMAIN>` (cùng backend, vẫn chạy).

## 6. Kiểm và nghiệm thu

Hai lượt kiểm dùng hai loại tài khoản, vì backend chọn cổng thanh toán theo tài khoản
([chọn cổng](../be/src/payments/payments.service.ts)):

| | Lượt A | Lượt B |
|---|---|---|
| Tài khoản | Demo (`users.is_demo = true`) | Thường (đăng ký mới, không bật cờ demo) |
| Cổng | VNPay sandbox, thẻ test | VietQR, SePay báo tiền về |
| Nút "Giả lập đã thanh toán" | Có khi `PAYMENT_SIMULATION=true` | Chỉ có khi `PAYMENT_SIMULATION=true` **và** máy chủ chưa cấu hình `VIETQR_*` |
| Người kiểm | Người giữ tài khoản VNPay sandbox, người demo | Người giữ tài khoản ngân hàng và SePay |

Với cấu hình bán thật (`VIETQR_*` thật, `PAYMENT_SIMULATION=false`), không lượt nào có nút giả lập: lượt A trả bằng thẻ
test VNPay, lượt B chuyển tiền thật.

### 6.1. Lượt A: tài khoản demo, VNPay sandbox (kịch bản demo 3 phút)

Điều kiện: đã làm 3.2 và 3.5. Điều kiện dùng nút giả lập: máy chủ bật `PAYMENT_SIMULATION=true`. Trên VPS, điều đó chỉ
có được khi `VIETQR_*` để trống (§2.2), nên chỉ dùng nút giả lập làm phương án dự phòng khi VNPay sandbox lỗi (§8).

Tắt Wi-Fi, dùng 4G, mở `https://wrap-fit.vercel.app`. Các bước theo thanh bước của studio: **Kiểu hộp → Kích thước →
Giấy → Thiết kế → Quà & mở hộp → Đặt in**.

| # | Thao tác | Đạt khi |
|---|---|---|
| 1 | Đăng nhập tài khoản demo | Vào `/dashboard`, thấy tên "Chị Linh (demo)" |
| 2 | `/editor/new` (chuyển sang `/editor/demo`) → bước Kiểu hộp: hộp nắp gài → bước Kích thước: 80 × 80 × 95, quà 350 g → bước Giấy: Ivory 300 → bấm "Lưu dự án" trên thanh trên cùng | Bước Kích thước báo "Đáy khóa tự động (FEFCO 0215)". Sau khi lưu, địa chỉ đổi sang `/editor/<id>`. Chưa lưu thì bước Đặt in chỉ có nút "Lưu dự án để thanh toán" |
| 3 | Bước Thiết kế (canvas của thiết kế mới trống): bấm "Tải lên" trên thanh công cụ → trong bảng vừa mở, bấm "Tải ảnh hoặc logo lên" (phím U mở thẳng hộp chọn file) → chọn một file PNG logo chuẩn bị sẵn trên máy → kéo logo sát mép cắt → bấm "FitCheck" trên thanh công cụ → "1-Click: Tự Động Sửa Lỗi Nếp Gấp & Tràn Lề" | Logo hiện trên canvas. FitCheck báo lỗi lề; sau khi bấm nút sửa, chỉ logo dời, FitCheck không còn lỗi. Nút "Tự sửa lề nhanh" là nút tương tự ở bước Đặt in, không có ở bước này |
| 4 | Bước Quà & mở hộp: gập hộp 0 → 100 %, xoay 360°. Bấm "Tạo lời chúc & mã QR", nhập tên người nhận và lời chúc, chọn hiệu ứng, bấm "Tạo mã QR". Nếu muốn mã QR có trên file in, bấm thêm "Đặt mã lên hộp" trong cùng hộp thoại, trước khi sang bước Đặt in | Nhãn Nắp, Đáy, Mặt trước trên mô hình 3D. Mã QR hiện trong hộp thoại và quét được (kiểm ở bước 9). Chỉ sau "Đặt mã lên hộp" thì nút mới đổi thành "Sửa lời chúc & mã QR" và bước này ghi "Đã in mã QR trên mặt đáy hộp" |
| 5 | Bước Đặt in, trước khi thanh toán | Thẻ file in ghi "mở sau khi bạn thanh toán đơn in ở giỏ hàng", nút "Thanh toán". Không có file in nào tải được trước khi thanh toán |
| 6 | "Thanh toán" → giỏ `/cart` → điền người nhận → "Đặt in mẫu · 49.000đ" → đọc hết điều khoản, đánh dấu đồng ý → "Đồng ý & thanh toán" → "Mở cổng VNPay" → thẻ test NCB trong tài liệu sandbox | Quay về `/payments/vnpay-return` báo thành công; đơn `PAID` trong `/dashboard/orders` |
| 7 | Quay lại bước Đặt in → "Xuất file in ngay" → SVG, rồi PDF CMYK | Hai file tải về |
| 8 | Sửa thiết kế (ví dụ dời logo), quay lại bước Đặt in | Nút về "Thanh toán": phiên bản mới cần đơn mới. File đã xuất ở bước 7 vẫn tải được trong lịch sử xuất. Đổi tên dự án thì không mất quyền |
| 9 | Quét mã QR tạo ở bước 4 bằng camera điện thoại | Trang 3D mở hộp kèm lời chúc |
| 10 | `/dashboard` | Số hộp, kiểu hộp, lỗi FitCheck đã chặn, thời gian tạo hộp tăng |

Nhãn nút trong bảng lấy từ mã studio 6 bước ngày 20/11/2026 và khớp với kịch bản FE (bước 4, 9, 16). Lượt A chưa được diễn tập trọn vẹn trên môi trường thử.

Kiểm thêm của lượt A (từ việc còn lại của đợt cổng thanh toán):

- VNPay chấp nhận chữ ký của URL thanh toán, và IPN tới được VPS: thanh toán sang `PAID` dù người dùng đóng tab trước khi
  quay về trang `vnpay-return`.
- Mua gói Pro ở `/pricing`, hoặc một gói xu ở `/dashboard/billing`, qua VNPay: `/dashboard/billing` ghi gói Pro (hoặc số
  xu tăng).
- **Quyền xuất theo phiên bản (bằng API).** Với một đơn đã trả và một phiên bản vừa sửa: file của phiên bản cũ vẫn tải
  được (`GET /api/exports/:jobId`), còn `POST /api/projects/:id/exports` cho phiên bản mới nhận
  `402 ORDER_PAYMENT_REQUIRED`. `GET /api/projects/:id/exports/access` trả `{ unlocked, unlockExpiresAt }`.
- Nếu dùng nút giả lập (dự phòng): IPN và nút giả lập đến cùng lúc vẫn chỉ cấp quyền lợi một lần.

Kết quả lượt A:

| Ngày | Môi trường (URL, commit) | Người kiểm | Máy, trình duyệt | Kết quả | Ghi chú |
|---|---|---|---|---|---|
| _điền_ | _điền_ | _điền_ | _điền_ | _điền_ | _điền_ |

### 6.2. Lượt B: tài khoản thường, VietQR/SePay

Điều kiện: `VIETQR_*` là tài khoản ngân hàng thật, `PAYMENT_SIMULATION=false`, đã làm 3.4. Dùng một tài khoản đăng ký
mới, không bật cờ demo.

| # | Thao tác | Đạt khi |
|---|---|---|
| 1 | Tạo một thanh toán nhỏ (ví dụ đặt in mẫu 49.000đ, hoặc nạp xu) | `CheckoutDialog` hiện mã VietQR với tên ngân hàng, số tài khoản, số tiền và nội dung `WF…`; không có nút giả lập |
| 2 | Quét mã VietQR bằng app ngân hàng trên điện thoại thật | Ghi lại app nào đọc đúng ngân hàng, số tiền, nội dung `WF…` |
| 3 | Chuyển đúng số tiền, đúng nội dung `WF…`, trong 15 phút | Thanh toán sang `PAID` trong vài giây; `/admin/bank-transactions` có dòng `MATCHED` |
| 4 | Tạo thanh toán khác, chuyển thiếu tiền | Thanh toán vẫn `PENDING`; `/admin/bank-transactions` có dòng `UNMATCHED` (lệch tiền) |
| 5 | Admin gán tay giao dịch ở bước 4 cho thanh toán, hoặc bỏ qua rồi hoàn tiền tay | Dòng sang `RESOLVED` (hoặc `IGNORED`); gán tay thì thanh toán sang `PAID` đúng một lần |

Nếu SePay đổi tên trường trong payload webhook, giao dịch sẽ không khớp: báo dev BE sửa bộ đọc payload.

Diễn tập trước khi có tiền thật: trên môi trường thử để trống `VIETQR_*` và bật `PAYMENT_SIMULATION=true`. Khi đó tài
khoản thường cũng có nút "Giả lập đã thanh toán" và ba nút "Giả lập ngân hàng báo tiền về" ("Chuyển đúng", "Chuyển thiếu
10.000đ", "Quên ghi mã"). Ba nút này đi qua đúng webhook SePay, nên thấy được các dòng `MATCHED` và `UNMATCHED` ở
`/admin/bank-transactions` mà không cần chuyển tiền. Lần diễn tập này không thay cho bước 2–5 ở trên.

Kết quả lượt B:

| Ngày | Môi trường (URL, commit) | Người kiểm | Ngân hàng, app | Kết quả | Ghi chú |
|---|---|---|---|---|---|
| _điền_ | _điền_ | _điền_ | _điền_ | _điền_ | _điền_ |

### 6.3. Nghiệm thu bản deploy

| # | Việc | Đạt khi | Trạng thái |
|---|---|---|---|
| 1 | Deploy theo §2.3, Vercel theo §5 | `/api/health` qua cả `https://<APP_DOMAIN>` và `https://wrap-fit.vercel.app` trả `"status":"ok"` | Chờ kiểm thực tế (người deploy) |
| 2 | Chạy lượt A (§6.1, bước 1–10) **hai lần liên tiếp** trên điện thoại 4G, bấm giờ | Mỗi lần ≤ 3 phút | Chờ kiểm thực tế (người deploy) |
| 3 | Lượt B (§6.2) | Đạt bước 1–5 | Chờ kiểm thực tế (người giữ tài khoản ngân hàng và SePay) |
| 4 | Đặt lại `PAYMENT_SIMULATION=false` sau buổi demo, trước khi bán thật | API khởi động lại bình thường; checkout không còn nút giả lập | Chờ kiểm thực tế (người deploy) |

Ghi kết quả bấm giờ:

| Ngày | URL, commit | Máy, trình duyệt, mạng | Lần 1 | Lần 2 | Ghi chú |
|---|---|---|---|---|---|
| _điền_ | _điền_ | _điền_ | _điền_ | _điền_ | _điền_ |

Khi có kết quả, ghi thêm một dòng vào [04 · Tiến độ](04_PROGRESS.md).

## 7. Dịch vụ cloud và chi phí

Câu hỏi còn mở từ đợt CP4: chi phí cloud thật mỗi tháng. IT xác nhận số tiền thật trên trang thanh toán của từng dịch vụ
rồi điền cột "Chi phí thật / tháng". Gói miễn phí theo trang giá công khai của nhà cung cấp, kiểm lại trước khi đưa vào
slide.

| Dịch vụ | Dùng cho | Gói đang dùng / đề xuất | Hạn mức miễn phí (tham khảo) | Chi phí thật / tháng |
|---|---|---|---|---|
| VPS (nhà cung cấp: IT điền) | backend, worker, PostgreSQL, Redis, Caddy, frontend dự phòng | IT điền (RAM tối thiểu ~2 GB: 4 container Node ≤ 512 MB + Postgres 512 MB) | Không | _điền_ |
| Vercel | frontend `wrap-fit.vercel.app` | Hobby | Miễn phí; điều khoản Hobby chỉ cho dùng cá nhân, phi thương mại. Bán thật cần Pro (theo thành viên) | 0đ (Hobby) |
| Cloudflare R2 | ảnh tải lên, QR, file in, bản sao lưu CSDL | Free tier | 10 GB lưu trữ / tháng, 1 triệu thao tác ghi (Class A), 10 triệu thao tác đọc (Class B), không tính phí băng thông ra | _điền_ (dự kiến 0đ) |
| fal.ai | Ảnh AI cho mặt hộp, phóng to, xóa nền, vector hóa (Xu Wrap, [16](16_XU_WRAP_SPEC.md)) | Trả theo ảnh / MP, nạp trước; cầu chì `AI_MONTHLY_BUDGET_USD` tính cả ảnh | Không | Theo lượt dùng; mỗi ảnh $0.01–0.15 ([16](16_XU_WRAP_SPEC.md) §3), giá bán ≥ 2,5 lần chi phí |
| Anthropic Claude API | AI sinh hoa văn (`claude-haiku-5-5`), viết lại mô tả ảnh AI | Trả theo token, cầu chì `AI_MONTHLY_BUDGET_USD` | Không | ≤ `AI_MONTHLY_BUDGET_USD` USD. Ước tính một lượt Haiku 13–34đ (chưa đo bằng token thật) |
| Email SMTP (dự kiến Resend) | email xác minh, đặt lại mật khẩu | Free | 3.000 email / tháng, 100 email / ngày | _điền_ |
| Tên miền `wrapfit.vn` | `APP_DOMAIN`, email gửi đi | Nhà đăng ký: IT điền | Không | _điền_ (theo năm / 12) |
| GitHub (repo, Actions CI + deploy) | CI, deploy | Free | Repo công khai: Actions không giới hạn phút; repo riêng: 2.000 phút / tháng | 0đ |
| Let's Encrypt (qua Caddy), Google OAuth | HTTPS, đăng nhập Google | Free | Không giới hạn đáng kể | 0đ |
| VietQR (NAPAS) | QR chuyển khoản | Backend tự dựng payload, không gọi dịch vụ ngoài | Không phí | 0đ |
| SePay | báo tiền về qua webhook (lượt B) | IT điền | Theo trang giá SePay | _điền_ |
| VNPay sandbox | thanh toán thử của tài khoản demo | Sandbox | Miễn phí | 0đ |

Khi lập bảng (2026-10-30) chưa đọc được hóa đơn nào. Số liệu dùng thật trong 30 ngày: xem `/admin` hoặc
`GET /api/analytics/summary?scope=global&days=30` sau khi deploy.

## 8. Rủi ro khi demo và cách xử lý

Các lệnh chạy trên VPS, trong `~/WrapFit`, với `COMPOSE` đặt như ở §2.3.

| Rủi ro | Dấu hiệu | Cách xử lý |
|---|---|---|
| Mạng sân khấu yếu / mất | Trang tải chậm, xoay vòng | Dùng 4G điện thoại phát; mở sẵn các tab (studio, dashboard, giỏ in) trước khi lên; VietQR dựng tại backend nên không cần dịch vụ ngoài |
| Vercel hoặc rewrite `/api` lỗi | `/api/health` trên Vercel trả 404 / 502 | Chuyển sang `https://<APP_DOMAIN>` (VPS phục vụ cả frontend), cùng tài khoản và dữ liệu |
| Backend VPS chết | Mọi trang báo "Máy chủ…" | `$COMPOSE ps`, `$COMPOSE logs backend`; khởi động lại `$COMPOSE up -d`. Dự phòng cuối: video quay sẵn kịch bản §6.1 |
| Worker chết, file in không ra | Hộp xuất file đứng ở "Đang dựng file" quá 30 s | `/api/health` báo `worker` khác `up`: `$COMPOSE restart worker`, rồi xuất lại. Đơn in đã thanh toán vẫn mở file, không trừ gì thêm |
| Sandbox VNPay lỗi lúc demo | Cổng VNPay không mở / không quay về | Dự phòng bằng nút giả lập: đặt `PAYMENT_SIMULATION=true`, để trống cả ba `VIETQR_*` (nếu đang có tài khoản thật thì API không khởi động), `$COMPOSE up -d backend`. Tài khoản demo có nút "Giả lập đã thanh toán". Xong buổi demo đặt lại như cũ (§6.3, việc 4) |
| Bật giả lập nhưng không thấy nút | `CheckoutDialog` không có nút "Giả lập đã thanh toán" | Kiểm tài khoản: tài khoản demo luôn có nút khi `PAYMENT_SIMULATION=true`; tài khoản thường chỉ có khi `VIETQR_*` để trống. Kiểm `.env` đã nạp: `$COMPOSE up -d backend` sau khi sửa |
| Webhook SePay không tới | Chuyển khoản xong thanh toán vẫn `PENDING` | Xem *Tích hợp Webhooks → Nhật ký* trên SePay (401 = sai `SEPAY_WEBHOOK_API_KEY`); giao dịch tới nhưng không khớp nằm ở `/admin/bank-transactions` để gán tay |
| Tên xưởng "Minh Tâm Prolab" của kịch bản cũ không có trong danh sách xưởng | Giỏ in chỉ có 4 xưởng mẫu (Sài Gòn Xanh, Hà Thành, Đà Nẵng, Cần Thơ) | Chọn "Để WrapFit chọn xưởng phù hợp" hoặc một xưởng mẫu; muốn đúng tên cần thêm xưởng vào `be/src/print-shops/print-shops.service.ts` (danh sách tĩnh) |
| Hết ngân sách AI hoặc chưa có `ANTHROPIC_API_KEY` | Hoa văn "AI" là hoa văn thuật toán | Không chặn demo; nói rõ cầu chì chi phí là tính năng |
| Throttle (100 request / phút / IP, 10 lần đăng nhập) khi cả hội đồng dùng chung Wi-Fi | 429 | Hội đồng thử trên 4G riêng; demo chính dùng một máy |
| Đăng nhập Google trên bản Vercel | Đăng nhập xong vẫn ở trạng thái khách | Dùng email + mật khẩu (mục 5) |
| Quét VietQR bằng app ngân hàng báo lỗi | App không nhận mã | Chưa kiểm bằng app thật (lượt B, §6.2). Demo chính dùng tài khoản demo và VNPay sandbox, không cần quét VietQR |
| Phiên hết hạn / tài khoản bị khóa giữa buổi | Trang dự án hiện "Không gian làm việc khách" với dự án mẫu, không về trang đăng nhập | Bấm "Đăng nhập tài khoản" trên dải thông báo, đăng nhập lại; đừng tạo dự án ở chế độ khách (không lưu) |
| Lộ mật khẩu demo trên màn hình chiếu | — | Đăng nhập trước khi chiếu; mật khẩu chỉ trong `.env` VPS, không vào slide |

## 9. Ảnh bàn giao cho slide

Ảnh chụp ở 375 × 812 (`M`) và 1440 × 900 (`Xp`), nằm trong `fe/.page-shots/` (git bỏ qua thư mục này: chép sang thư mục
slide khi cần). Các ảnh cũ dưới đây chụp ngày 2026-10-30, trước khi studio đổi sang 6 bước và trước khi bỏ luồng mua lượt
xuất, nên đều phải chụp lại. Ảnh `e2e/*` chụp bằng kịch bản FE `fe/scripts/e2e-scenario.mjs`, đã viết lại theo luồng đặt
in mẫu (commit c622f67) và chạy đạt ở cả `M` lẫn `Xp` trên máy local ngày 2026-11-19. Ảnh `e2e/*` hiện có chụp lại ngày
2026-11-20 trên checkout chính (kèm `report.json`, 36 mục đều đạt); ảnh cũ trước ngày đó nằm trong
`e2e/_old-before-2026-11-20/`. Thư mục `fe/.page-shots/` chỉ có trên máy đã chạy: người làm slide lấy ảnh từ máy đó,
hoặc tự chạy lại kịch bản theo điều kiện dưới bảng. Ảnh `s8-*` chụp bằng
`npm --workspace=fe run shots`, chưa chụp lại.

| Nội dung | Ảnh cũ (bỏ) | Vì sao chụp lại | Ảnh mới | Trạng thái |
|---|---|---|---|---|
| Dashboard "Số liệu thiết kế" (tài khoản demo) | `s8-dashboard-stats-demo_wrapfit_vn-{M,Xp}-0.png`, `e2e/{M,Xp}-18-dashboard-stats.png` | Số bước của kịch bản FE đổi | `e2e/{M,Xp}-18-dashboard-stats.png` | Đã chụp bằng kịch bản FE (local, 2026-11-20). Ảnh `s8-*`: chờ kiểm thực tế (dev FE) |
| Studio 3D có nhãn mặt, hũ nến 80 × 80 × 95 có logo | `s8-studio-3d-labels-demo_wrapfit_vn-{M,Xp}-0.png` | Giao diện studio cũ, trước khi đổi sang 6 bước | — | Chờ kiểm thực tế (dev FE): kịch bản FE không chụp cảnh này, chụp bằng `shots` |
| Thẻ file in ở bước Đặt in, trước khi thanh toán: nút "Thanh toán" | `e2e/{M,Xp}-07-*` | Ảnh cũ là luồng file miễn phí trước khi thanh toán | `e2e/{M,Xp}-07-export-blocked.png`, `e2e/{M,Xp}-07-fitcheck-fixed.png`, `e2e/{M,Xp}-07-export-locked.png` | Đã chụp bằng kịch bản FE (local, 2026-11-20) |
| Giỏ in mẫu, thanh toán 49.000đ, đơn `PAID` | `e2e/{M,Xp}-17-cart.png`, `e2e/{M,Xp}-17-checkout-vietqr.png`, `e2e/{M,Xp}-17-checkout-paid.png`, `e2e/{M,Xp}-17-orders-paid.png` | Tài khoản demo giờ trả qua VNPay sandbox, không qua VietQR | `e2e/{M,Xp}-16-cart.png`, `e2e/{M,Xp}-16-checkout.png`, `e2e/{M,Xp}-16-checkout-paid.png` | Đã chụp bằng kịch bản FE (local, 2026-11-20). Máy local chưa cấu hình VNPay, nên ảnh thanh toán là nút "Giả lập đã thanh toán" |
| Thẻ file in sau khi thanh toán: "Xuất file in ngay", file tải về | `e2e/{M,Xp}-16-*` | Ảnh cũ là luồng mua lượt xuất | `e2e/{M,Xp}-16-export-svg.png`, `e2e/{M,Xp}-16-export-pdf_cmyk.png`, `e2e/{M,Xp}-16-export-dxf.png`; phiên bản mới bị khóa lại: `e2e/{M,Xp}-17-new-version-locked.png` | Đã chụp bằng kịch bản FE (local, 2026-11-20) |
| `CheckoutDialog` gói Pro từ `/pricing` | `s8-checkout-vietqr-*` | Ảnh cũ là gói lượt xuất đã ngừng bán | — | Chờ kiểm thực tế (dev FE): kịch bản FE không mở `/pricing`, chụp bằng `shots` |

Chụp lại trên bản deploy: kịch bản FE cần Mailpit (chỉ có ở local) cho các bước tạo tài khoản, nên trên production chạy
bằng tài khoản có sẵn: `node fe/scripts/e2e-scenario.mjs --base-url=https://wrap-fit.vercel.app --user=<email>
--password=<mật khẩu> --steps=…`. Chưa thử trên production, nên chưa có danh sách bước chạy được ở đó. Ảnh từng trang:
`npm --workspace=fe run shots -- --routes=<file>` với `roles: ["demo@wrapfit.vn"]` và `SHOT_PASSWORD` trong môi trường
(không ghi vào file).

Điều kiện để chạy đủ kịch bản FE trên máy local (mặc định `--steps=1-14,16-18`, cỡ `M` và `Xp`, khoảng 15 phút mỗi cỡ):

- Docker chạy Postgres, Redis, SeaweedFS và Mailpit.
- `be/.env` có `PAYMENT_SIMULATION=true`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` và `SEED_DEMO_PASSWORD`. Bước 16 dùng tài khoản admin để bật cờ demo cho tài khoản thử.
- API và worker chạy bằng `nest start`, không dùng `--watch`: một tác vụ bảo trì chạy mỗi giờ chạm vào file được theo dõi, làm API khởi động lại giữa lượt chạy.
- FE dev chạy ở cổng 3000 với `BACKEND_INTERNAL_URL=http://localhost:8080`, để CORS giữ origin mặc định.
- Tài khoản thử đã có đơn trả tiền nên khi dọn sẽ được ẩn danh hóa (`ANONYMIZED`), không bị xóa. Mỗi lượt chạy đủ để lại 2 đơn trong CSDL local.

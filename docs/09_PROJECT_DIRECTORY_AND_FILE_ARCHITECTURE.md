# 📁 ĐẶC TẢ KIẾN TRÚC HỆ THỐNG THƯ MỤC & TỆP TIN CHUẨN CÔNG NGHIỆP (PROJECT DIRECTORY & FILE SPECIFICATION)

> **Dự án**: WrapFit Platform (Nền tảng Thiết kế & Đóng gói Bao bì Quà tặng Thông minh)  
> **Khóa học**: EXE101 — Trải nghiệm Khởi nghiệp Đổi mới Sáng tạo (FPT University)  
> **Mô hình kiến trúc**: **Modular Monorepo — npm workspaces (Next.js 15 App Router + Pure Domain Core `@wrapfit/shared` + NestJS 11 API & Worker)**  
> **Quy chuẩn thiết kế**: Clean Architecture, Domain-Driven Design (DDD) & Separation of Concerns (SoC)  
> **Đối chiếu lần cuối**: 19/11/2026, với `develop` tại fb720a9 (danh sách file lấy từ `git ls-files`)

---

## 1. TỔNG QUAN CẤU TRÚC MONOREPO CẤP CAO (HIGH-LEVEL OVERVIEW)

Hệ thống được tổ chức thành 3 khu vực mã nguồn độc lập (Decoupled Workspaces) dùng chung một hợp đồng dữ liệu chuẩn:

```
WrapFit/
├── fe/               # TẦNG 1: Frontend Client, WebGL 3D Studio & 2D Canvas Editor (Phụ trách: IT 1)
├── shared/           # TẦNG 2: Động cơ Toán CAD Dieline, FitCheck™, Prepress & Billing dùng chung (Phụ trách: IT 2)
├── be/               # TẦNG 3: Backend API, Prisma ORM, Cloud Storage, thanh toán & Workers (Phụ trách: IT 3)
├── docs/             # Tài liệu kiến trúc, đặc tả, kế hoạch & runbook
├── docker/           # Cấu hình Caddy (production) và SeaweedFS (dev)
├── scripts/          # Script dùng chung cho cả repo
└── .github/          # CI/CD Workflows
```

---

## 2. BẢN ĐỒ CÂY THƯ MỤC CHI TIẾT (COMPLETE DIRECTORY TREE)

Cây dưới đây được dựng lại từ danh sách file thực ngày 19/11/2026. Thư mục có nhiều file chỉ ghi các thư mục con và file chính. Chi tiết từng workspace: [`fe/README.md`](../fe/README.md), [`be/README.md`](../be/README.md), [`shared/README.md`](../shared/README.md).

```
WrapFit/
├── .agents/
│   └── skills/                             # Skill riêng của dự án (fitcheck-validator, packaging-threejs-fold, wrapfit-design-system...). Phần còn lại của .agents/ bị git bỏ qua
├── .github/
│   └── workflows/
│       ├── ci.yml                          # Build shared, kiểm token thiết kế, lint + build + unit test backend, e2e backend
│       └── deploy.yml                      # Sau khi CI trên main pass: SSH vào VPS, build lại image và chạy
├── docker/
│   ├── caddy/Caddyfile                     # Reverse proxy + HTTPS (docker-compose.prod.yml)
│   └── seaweedfs/s3.json                   # S3 giả lập cho môi trường dev (docker-compose.yml)
├── docs/
│   ├── 00_PROJECT_OVERVIEW.md              # Giới thiệu bài toán, tầm nhìn & giá trị cốt lõi
│   ├── 01_REQUIREMENTS.md                  # Yêu cầu chức năng (FR) & phi chức năng (NFR)
│   ├── 02_DATABASE_DESIGN.md               # Thiết kế CSDL PostgreSQL
│   ├── 03_API_DESIGN.md                    # Danh sách endpoint REST
│   ├── 04_PROGRESS.md                      # Nhật ký tiến độ
│   ├── 05_PACKAGING_GUIDELINES_AND_SUPPORT.md # Quy chuẩn bao bì & hỗ trợ người dùng
│   ├── 06_FE_INTEGRATION_GUIDE.md          # Cách FE dùng API: luồng, mã lỗi, kiểu dữ liệu
│   ├── 07_SYSTEM_BLUEPRINT_AND_TASK_BREAKDOWN.md # Use case & WBS
│   ├── 08_PACDORA_SYSTEM_CLASS_DIAGRAM_SPECIFICATION.md # Class diagram
│   ├── 09_PROJECT_DIRECTORY_AND_FILE_ARCHITECTURE.md    # Tài liệu này
│   ├── 10_DB_HARDENING_DESIGN.md           # Quy ước ràng buộc & bảo vệ CSDL
│   └── 11_STITCH_PARITY_AUDIT.md           # Đồng bộ màn hình Stitch vào FE
│
├── fe/                                     # FRONTEND (Next.js 15 App Router + Three.js), theo mẫu react-structure
│   ├── .agents/                            # Skill riêng cho FE (gsap, img2threejs, impeccable, scroll-world...)
│   ├── public/
│   │   ├── branding/                       # Logo, ảnh hero, ảnh minh họa 6 bước Studio
│   │   ├── mascots/  photos/  team/        # Mascot Gói, ảnh minh họa, ảnh nhóm
│   │   ├── stitch/{img,fonts}/             # Ảnh và font tự host của màn hình Stitch (sinh bởi stitch:sync)
│   │   └── favicon.ico  favicon.svg  apple-touch-icon.png
│   ├── scripts/
│   │   ├── stitch/                         # npm run stitch:sync / stitch:parity
│   │   ├── lib/                            # Mở Chrome và phiên đăng nhập dùng chung cho các script dưới
│   │   ├── e2e-scenario.mjs                # Kịch bản E2E chạy trên trình duyệt thật
│   │   ├── page-shots.mjs                  # npm run shots: chụp màn hình theo page-shots.routes.json
│   │   ├── check-design-tokens.mjs  export-design-tokens.mjs  # npm run tokens:check / tokens:export
│   │   └── a11y-audit.mjs  ui-fixtures.mjs  process-box-mascot.mjs
│   ├── stitch/                             # Nguồn HTML Stitch + assets.json, overrides.json, screens.json
│   ├── src/
│   │   ├── app/                            # CHỈ routing: page.tsx mỏng, layout.tsx, metadata. Nhóm (workspace)/ cho các trang cần đăng nhập
│   │   ├── views/                          # UI từng màn hình, cùng cây thư mục với app/ (admin/, editor/, checkout/, design-system/...)
│   │   ├── features/                       # Theo tính năng: studio/, admin/, auth/, dashboard/, demo/, intro/, notifications/,
│   │   │                                   #   orders/, payments/, pricing/, profile/, settings/, showcase/, site/, stitch/, templates/
│   │   ├── components/                     # Dùng chung: common/ (GoiMascot...), layout/, modals/, ui/, workspace/, checkout/, library/...
│   │   ├── api/                            # Hàm gọi endpoint, mỗi module backend một thư mục (projects/, exports/, payments/, orders/...)
│   │   ├── services/                       # HTTP client (api/), realtime.ts (Socket.IO), audio/, analytics/, storage/, mock-api/
│   │   ├── store/                          # State toàn cục: slices/, actions/, reducers/, selectors/
│   │   ├── assets/                         # styles/ (tokens.ts, globals.css, stitch/), fonts/ (gồm font nhúng khi in), icons/, images/
│   │   └── hooks/  layouts/  utils/  types/  config/  constants/  helpers/
│   ├── design-tokens.json                  # Token xuất ra từ tokens.ts (npm run tokens:export)
│   ├── next.config.mjs  tailwind.config.ts  postcss.config.js  tsconfig.json
│   ├── .env.example                        # NEXT_PUBLIC_API_URL, NEXT_PUBLIC_SITE_URL, BACKEND_INTERNAL_URL...
│   ├── Dockerfile
│   └── package.json
│
├── shared/                                 # PURE DOMAIN CORE (không phụ thuộc React, DOM hay CSDL)
│   ├── scripts/                            # render-dielines.mjs, build-library-icons.mjs
│   ├── src/
│   │   ├── index.ts                        # Barrel file
│   │   ├── core/contracts.ts               # Interface, value object, domain event & enum (bản phác thảo, xem tài liệu 08)
│   │   ├── types/                          # dieline.ts, project.ts, fitcheck.ts
│   │   ├── parametric/                     # Công thức dieline: tuck-top, sleeve-drawer, lid-base, pillow, mailer, gable, cup-carrier,
│   │   │                                   #   insert, sticker-label... (kèm bản cũ *.v1.ts / *.v2.ts) + registry.ts, fold.ts, paper.ts
│   │   ├── fitcheck/                       # validator.ts (lề cắt, lề gấp, bleed, DPI), reading.ts
│   │   ├── print/                          # prepress.ts (thông số in), placement, imagery, fonts, color, barcode, finishes...
│   │   ├── canvas/                         # Phần tử canvas, sắp xếp, phần in mặt trong
│   │   ├── library/                        # Thư viện hình, chữ, nhãn sản phẩm, mẫu thiết kế
│   │   ├── billing/                        # Gói, giá, quyền lợi, xu, điều khoản thanh toán, mẫu ảnh AI
│   │   └── pricing/  analytics/  media/  text/
│   ├── tsconfig.json
│   └── package.json                        # Package name: @wrapfit/shared
│
├── be/                                     # BACKEND API & WORKER (NestJS 11), theo skeleton nestjs-project-structure
│   ├── prisma/
│   │   ├── schema.prisma                   # Lược đồ thực thể (32 bảng)
│   │   ├── migrations/                     # Lịch sử thay đổi cấu trúc bảng
│   │   ├── seed.ts                         # Seed chính: cấu trúc hộp, mẫu thiết kế, tài khoản demo, tài khoản Admin
│   │   ├── seed-data.ts                    # 11 cấu trúc hộp trong DB + mẫu thiết kế chọn sẵn
│   │   ├── seed-demo.ts                    # Tài khoản demo CP4 (khi có SEED_DEMO_PASSWORD)
│   │   ├── scripts/                        # upgrade-formulas, backfill-product-events, convert-export-credits (npm run db:*)
│   │   └── assets/                         # Logo mẫu cho tài khoản demo
│   ├── src/
│   │   ├── app.ts                          # Khởi chạy API HTTP (cổng mặc định 8080, prefix /api)
│   │   ├── worker.ts                       # Process BullMQ riêng: ba hàng đợi "export", "mail", "ai-image"
│   │   ├── app.module.ts                   # Ghép module + guard / filter / interceptor toàn cục
│   │   ├── app.middleware.ts               # Request id, helmet, CORS, ValidationPipe, WebSocket adapter
│   │   ├── swagger.ts  repl.ts  mail-test.ts  storage-check.ts
│   │   ├── config/                         # env.validation.ts + envs/ (default, development, production, test) + configuration.ts
│   │   ├── common/                         # @Global CommonModule: ConfigService, decorators, guards, filters, events, dto
│   │   ├── shared/                         # Nest module hạ tầng: prisma/ (PrismaService), queue/ (BullMQ), redis/
│   │   ├── auth/                           # Đăng ký, đăng nhập, refresh, khôi phục tài khoản, Google OAuth, JwtAuthGuard
│   │   ├── base/                           # GET /api/health
│   │   ├── projects/                       # 4 tầng: presentation / application / domain / infrastructure (+ snapshot, thùng rác)
│   │   ├── export/                         # Tạo job xuất file + ExportProcessor (worker) + rendering/ (dựng PDF in)
│   │   ├── billing/                        # Gói, quyền lợi, ví xu, mã lỗi thanh toán
│   │   ├── payments/                       # Tạo thanh toán, VietQR, webhook SePay, VNPay sandbox, đối soát giao dịch ngân hàng (admin/)
│   │   ├── orders/                         # Đơn in mẫu, trạng thái đơn
│   │   ├── print-shops/  reviews/          # Xưởng in; duyệt mẫu theo token
│   │   ├── ai/                             # Hoa văn AI (pattern/) và job ảnh AI (image/, chạy ở worker)
│   │   ├── library/                        # Thư viện tài sản, ảnh stock (Pexels)
│   │   ├── notifications/  analytics/      # Hộp thông báo; số liệu sản phẩm và báo cáo xu
│   │   ├── storage/                        # Pre-signed upload S3 / R2, hạn mức, dọn file
│   │   ├── mail/                           # Đưa email vào hàng đợi + gửi SMTP (worker)
│   │   └── users/  collections/  templates/  public-showcase/  unboxing/  events/
│   ├── test/e2e/                           # E2E test (Jest + Supertest), helpers/ dùng chung
│   ├── .env.example                        # Mẫu biến môi trường Backend
│   ├── Dockerfile                          # Một image cho cả API (dist/app.js) và worker (dist/worker.js)
│   ├── deploy.sh  docker-entrypoint.sh
│   ├── tsconfig.json  tsconfig.build.json  tsconfig.worker.json
│   └── package.json
│
├── scripts/prisma-generate-if-changed.mjs  # Chỉ chạy prisma generate khi schema đổi (dùng trong npm run dev:setup)
├── docker-compose.yml                      # Môi trường dev: PostgreSQL, Redis, SeaweedFS, Mailpit, API, worker, FE
├── docker-compose.prod.yml                 # Production: thêm Caddy, dùng Cloudflare R2
├── .env.example                            # Mẫu biến môi trường cho docker compose
├── AGENTS.md  CLAUDE.md                    # Quy tắc cho AI agent
└── package.json                            # npm workspaces: fe, be, shared
```

**Các đường dẫn cũ không còn trong repo:**

- `shared/src/exporter/pdf-export.ts` **đã bỏ**. Thông số in (lề cắt 5 mm, lề gấp 3 mm, bleed 2 mm, `BleedBox` 3 mm, ngưỡng DPI) nằm ở [`shared/src/print/prepress.ts`](../shared/src/print/prepress.ts). Phần dựng file PDF in chạy ở backend, trong [`be/src/export/rendering/`](../be/src/export/rendering/).
- `be/src/shipping/` là **đề xuất**, chưa có thư mục. Xem mục 4.

---

## 3. PHÂN VÙNG DỮ LIỆU & QUY TẮC PHỤ THUỘC (IMPORT BOUNDARIES)

Để đảm bảo kiến trúc sạch, tuyệt đối tuân thủ quy tắc phụ thuộc một chiều (Strict Dependency Rule):

```
       ┌────────────────────────┐
       │   shared/ (Domain)     │  <── Không được import bất cứ thứ gì từ fe/ hoặc be/
       └───────────▲────────────┘
                   │
         ┌─────────┴─────────┐
         │                   │
┌────────┴────────┐ ┌────────┴────────┐
│   fe/ (Client)  │ │   be/ (Server)  │  <── fe/ và be/ KHÔNG ĐƯỢC import trực tiếp chéo nhau!
└─────────────────┘ └─────────────────┘      Giao tiếp duy nhất thông qua REST API & Contracts.
```

1. **`shared/` (Core Math & Contracts)**:
   - Là mã nguồn thuần TypeScript (Pure TypeScript), không phụ thuộc vào React, Next.js, DOM hay CSDL.
   - Chạy được ở cả Client-side (Trình duyệt) lẫn Server-side (Node.js).
2. **`fe/` (Frontend)**:
   - Import types, công thức toán và quy tắc FitCheck từ `@wrapfit/shared`.
   - Giao tiếp với `be/` qua HTTP API Client (`fe/src/api/`, trên HTTP client `fe/src/services/api/`).
3. **`be/` (Backend)**:
   - Import types, công thức dieline, FitCheck, thông số in và bảng giá từ `@wrapfit/shared`.
   - Phụ thuộc vào Prisma ORM, CSDL PostgreSQL, Redis (BullMQ) và Cloud S3 / R2.

### 3.1. Ranh giới bên trong `be/src/`

Backend theo skeleton [nestjs-project-structure](https://github.com/CatsMiaow/nestjs-project-structure). Phụ thuộc cũng đi một chiều:

```
config/ + common/  ──▶  shared/prisma, shared/queue, shared/redis  ──▶  module nghiệp vụ  ──▶  app.module.ts / worker.ts
(tầng nền: env,           (Nest module hạ tầng)                        (auth, users, projects,
 CommonModule @Global)                                                  export, payments...)
```

(mũi tên = "được import bởi"; `config/` và `common/` dùng lẫn nhau: `ConfigService` lấy kiểu `Config` từ `config/`, logger trong `config/` lấy request id từ `common/context`)

1. **`config/`, `common/`, `shared/`** là hạ tầng: không import module nghiệp vụ. Thứ nhiều module cùng cần (tên cookie, hàm băm token, decorator, DTO phân trang, khóa advisory của CSDL) đặt ở `common/`.
2. **Module nghiệp vụ** (`src/<tên>/`) có `index.ts` (barrel). Module khác import qua thư mục: `from '../projects'`, `from '../common'`, `from '../shared/prisma'` — không trỏ vào file bên trong module khác. Trong cùng module import thẳng file.
3. **Không vòng import** giữa các module: ESLint `import/no-cycle` chặn trong CI. Cần phụ thuộc ngược thì dùng Port + injection token (tài liệu 08, Mục 1.2 & 1.4) hoặc đưa phần dùng chung xuống `common/`.
4. **Chỉ `src/config/` đọc `process.env`**; phần còn lại đọc cấu hình bằng `ConfigService` của `common/`: `config.get('storage.bucket')`. Riêng các file seed trong `be/prisma/` đọc `process.env` trực tiếp vì chạy ngoài Nest.
5. **Hai process, một mã nguồn**: `app.module.ts` (API) không import các `*WorkerModule`; `worker.ts` chỉ import hạ tầng (`PrismaModule`, `RedisModule`, `StorageModule`, kết nối queue) và `ExportWorkerModule`, `MailWorkerModule`, `AiImageWorkerModule`, cùng phần lõi của billing (hoàn xu khi job AI lỗi) và notifications. `@Cron` chỉ đăng ký trong API.

---

## 4. CHI TIẾT TÍCH HỢP DỊCH VỤ BÊN THỨ BA (3RD-PARTY INTEGRATIONS)

Tên biến môi trường đã đối chiếu với [`be/src/config/env.validation.ts`](../be/src/config/env.validation.ts), [`be/.env.example`](../be/.env.example) và [`.env.example`](../.env.example) ngày 19/11/2026. Cột trạng thái dùng ba mức: có mã trên `develop`; đã kiểm bằng test hoặc E2E (ghi ngày); chờ kiểm thực tế (ghi vai trò người kiểm).

### 4.1. Dịch vụ đang dùng

| Dịch Vụ Bên Thứ 3 | Mục Đích Sử Dụng | Vị Trí Triển Khai Trong Mã Nguồn | Biến Môi Trường Cần Thiết | Trạng thái |
| :--- | :--- | :--- | :--- | :--- |
| **AWS S3 / Cloudflare R2** (dev dùng SeaweedFS) | Lưu logo người dùng tải lên, ảnh, file in xuất ra (bucket riêng tư) và bản sao lưu | `be/src/storage/storage.service.ts` | `STORAGE_ENDPOINT`, `STORAGE_REGION`, `STORAGE_BUCKET`, `STORAGE_PRIVATE_BUCKET`, `STORAGE_BACKUP_BUCKET`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`, `STORAGE_PUBLIC_URL`, `STORAGE_PUBLIC_ENDPOINT`, `STORAGE_FORCE_PATH_STYLE` | Có mã trên `develop`. Đã kiểm bằng E2E với SeaweedFS (19/11/2026). R2 production: chờ kiểm thực tế (người vận hành VPS) |
| **PostgreSQL** | Cơ sở dữ liệu chính (32 bảng) | `be/prisma/schema.prisma` | `DATABASE_URL` | Có mã trên `develop`. Đã kiểm bằng E2E (19/11/2026) |
| **Redis & BullMQ** | Ba hàng đợi `export`, `mail`, `ai-image`, rate limiting, đẩy thông báo từ worker sang API | `be/src/shared/queue/`, `be/src/shared/redis/`, `be/src/export/`, `be/src/mail/`, `be/src/ai/image/`, `be/src/common/guards/http-throttler.guard.ts` | `REDIS_URL`, `EXPORT_CONCURRENCY`, `AI_IMAGE_CONCURRENCY`, `THROTTLE_LIMIT`, `THROTTLE_TTL_SECONDS` | Có mã trên `develop`. Đã kiểm bằng E2E (19/11/2026) |
| **VietQR + SePay** | Tài khoản thường thanh toán chuyển khoản qua mã QR; SePay gọi webhook khi tiền về | `be/src/payments/vietqr.ts`, `be/src/payments/sepay/` | `VIETQR_BANK_BIN`, `VIETQR_ACCOUNT_NO`, `VIETQR_ACCOUNT_NAME`, `SEPAY_WEBHOOK_API_KEY` | Có mã trên `develop`. Đã kiểm webhook bằng E2E (19/11/2026). Tiền thật: chờ kiểm thực tế (người giữ tài khoản ngân hàng và SePay) |
| **VNPay sandbox** | Cổng thanh toán của tài khoản demo (`users.is_demo`) | `be/src/payments/vnpay/` | `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_PAY_URL`, `VNPAY_RETURN_URL` | Có mã trên `develop`. Đã kiểm bằng E2E (19/11/2026). Sandbox thật: chờ kiểm thực tế (người giữ tài khoản VNPay sandbox) |
| **Giả lập thanh toán** | Chỉ mở khi máy chủ bật cờ. Tài khoản demo luôn được giả lập. Tài khoản thường chỉ được giả lập khi chưa cấu hình `VIETQR_*`, nếu không → `403 SIMULATION_DEMO_ONLY` | `be/src/payments/payments.service.ts`, `be/src/payments/sepay/mock-transfer.service.ts` | `PAYMENT_SIMULATION` | Có mã trên `develop` |
| **SMTP (nodemailer)**, dev dùng Mailpit | Gửi email giao dịch (xác thực, quên mật khẩu, khôi phục tài khoản) | `be/src/mail/smtp-mailer.ts` (gửi ở worker) | `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | Có mã trên `develop`. Nhà cung cấp SMTP production: chờ kiểm thực tế (người vận hành VPS) |
| **Google OAuth 2.0** | Đăng nhập nhanh bằng tài khoản Google | `be/src/auth/strategies/google.strategy.ts` | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` | Có mã trên `develop` |
| **Anthropic Claude** | Sinh hoa văn bao bì theo chủ đề. Khi AI tắt hoặc hết ngân sách thì dùng hoa văn thuật toán | `be/src/ai/pattern/claude-pattern.generator.ts`, `be/src/ai/pattern/procedural-pattern.generator.ts` | `ANTHROPIC_API_KEY`, `AI_MODEL`, `AI_MODEL_FAST`, `AI_MODEL_PREMIUM`, `AI_MONTHLY_BUDGET_USD`, `AI_TIMEOUT_MS`, `USD_VND_RATE` | Có mã trên `develop`. E2E chạy không có khóa nên chỉ kiểm nhánh hoa văn thuật toán (19/11/2026). Gọi Claude thật: chờ kiểm thực tế (người giữ khóa Anthropic) |
| **fal.ai** | Job ảnh AI (Xu Wrap), trừ xu và hoàn xu khi lỗi | `be/src/ai/image/fal-image.provider.ts` | `FAL_KEY`, `AI_IMAGE_PROVIDER`, `AI_IMAGE_MODELS`, `AI_IMAGE_TIMEOUT_MS` | Có mã trên `develop`. Đã kiểm bằng E2E với provider giả (19/11/2026). Chi phí thật: chờ kiểm thực tế (người giữ tài khoản fal) |
| **Pexels** | Ảnh stock trong thư viện tài sản | `be/src/library/stock-photos.service.ts` | `PEXELS_API_KEY` | Có mã trên `develop` |

### 4.2. Đề xuất, chưa có mã

| Dịch Vụ Bên Thứ 3 | Mục Đích Dự Kiến | Ghi chú |
| :--- | :--- | :--- |
| **GHTK / GHN API** | Tính phí ship và đẩy đơn giao vận | **Đề xuất.** Thư mục `be/src/shipping/` chưa tồn tại, chưa có biến môi trường |
| **Stripe / MoMo** | Cổng thanh toán quốc tế và ví điện tử | **Đề xuất.** Cổng đang dùng là VietQR/SePay và VNPay sandbox (mục 4.1) |
| **Cloudflare Turnstile** | CAPTCHA cho form đăng ký và quên mật khẩu | **Đề xuất.** Chưa có mã và chưa có biến môi trường. Hiện chống spam bằng rate limiting và khóa đăng nhập theo số lần sai |

---

## 5. QUY ƯỚC ĐẶT TÊN TỆP TIN CHUẨN (NAMING CONVENTIONS)

- **Components React**: Dùng `PascalCase.tsx` (ví dụ: `StudioStepper.tsx`, `MainLayout.tsx`).
- **Hooks & Utilities**: Dùng `camelCase.ts` (ví dụ: `useDebouncedValue.ts`, `textLayout.ts`).
- **Services, Controllers & Rules**: Dùng `kebab-case.suffix.ts` (ví dụ: `auth.controller.ts`, `storage.rules.ts`, `storage.service.ts`).
- **Backend NestJS (`be/src/`)**: thư mục module dạng `kebab-case` (`public-showcase/`, `print-shops/`); file theo loại `<tên>.module.ts`, `.controller.ts`, `.service.ts`, `.guard.ts`, `.strategy.ts`, `.processor.ts`, `.task.ts` (`@Cron`), `.dto.ts` (trong `dto/`, plugin Swagger đọc hậu tố này), `.constants.ts`, `.port.ts` (Port + injection token). Mỗi module và mỗi thư mục con của `common/` có `index.ts`. Unit test `<file>.spec.ts` đặt cạnh file; e2e `be/test/e2e/<luồng>.e2e-spec.ts`.
- **Prisma Models**: Dùng `PascalCase` (ví dụ: `PackagingProject`, `BoxTemplate`), tên bảng CSDL dùng `snake_case` số nhiều (`@@map("packaging_projects")`).
- **Tên biến & Hàm**: Dùng `camelCase` (ví dụ: `calculateDieline`, `isReadyForProduction`).
- **Hằng số & Enums**: Dùng `UPPER_SNAKE_CASE` (ví dụ: `BOX_STRUCTURE_TYPES`, `MAKER`, `PRO_ARTISAN`).

---

> 🎯 **Ghi chú**: Cây thư mục trên phân tách rõ trách nhiệm của 3 thành viên IT. Khi thêm module mới ở `be/src/` hoặc thư mục mới ở `fe/src/` và `shared/src/`, cập nhật mục 2. Dịch vụ ở mục 4.2 chỉ chuyển sang mục 4.1 khi đã có mã.

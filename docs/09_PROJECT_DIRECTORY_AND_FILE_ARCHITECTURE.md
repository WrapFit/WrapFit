# 📁 ĐẶC TẢ KIẾN TRÚC HỆ THỐNG THƯ MỤC & TỆP TIN CHUẨN CÔNG NGHIỆP (PROJECT DIRECTORY & FILE SPECIFICATION)

> **Dự án**: WrapFit Platform (Nền tảng Thiết kế & Đóng gói Bao bì Quà tặng Thông minh)  
> **Khóa học**: EXE101 — Trải nghiệm Khởi nghiệp Đổi mới Sáng tạo (FPT University)  
> **Mô hình kiến trúc**: **Modular Monorepo — npm workspaces (Next.js 14 App Router + Pure Domain Core `@wrapfit/shared` + NestJS 11 API & Worker)**  
> **Quy chuẩn thiết kế**: Clean Architecture, Domain-Driven Design (DDD) & Separation of Concerns (SoC)

---

## 1. TỔNG QUAN CẤU TRÚC MONOREPO CẤP CAO (HIGH-LEVEL OVERVIEW)

Hệ thống được tổ chức thành 3 khu vực mã nguồn độc lập (Decoupled Workspaces) dùng chung một hợp đồng dữ liệu chuẩn:

```
wrapfit-platform/
├── fe/               # TẦNG 1: Frontend Client, WebGL 3D Studio & 2D Canvas Editor (Phụ trách: IT 1)
├── shared/           # TẦNG 2: Động cơ Toán CAD Dieline, FitCheck™ & OOP Contracts (Phụ trách: IT 2)
├── be/               # TẦNG 3: Backend API, Prisma ORM, Cloud Storage & Workers (Phụ trách: IT 3)
├── docs/             # Tài liệu kiến trúc, đặc tả Class Diagram, WBS & Báo cáo CP1-CP4
└── .github/          # CI/CD Workflows, PR Templates & Automation Scripts
```

---

## 2. BẢN ĐỒ CÂY THƯ MỤC CHI TIẾT (COMPLETE DIRECTORY TREE)

Cây dưới đây khớp với repo hiện tại. Chi tiết từng workspace: [`fe/README.md`](../fe/README.md), [`be/README.md`](../be/README.md), [`shared/README.md`](../shared/README.md).

```
WrapFit/
├── .agents/
│   └── skills/                             # Skill riêng của dự án (fitcheck, fold, design system...). Phần còn lại của .agents/ bị git bỏ qua
├── .github/
│   └── workflows/
│       ├── ci.yml                          # Build shared, lint + build + unit test backend, e2e backend
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
├── fe/                                     # FRONTEND (Next.js 14 App Router + Three.js), theo mẫu react-structure
│   ├── public/
│   │   ├── branding/                       # wrapfit-logo.png, mascot-stickers.jpg
│   │   └── stitch/{img,fonts}/             # Ảnh và font tự host của màn hình Stitch (sinh bởi stitch:sync)
│   ├── scripts/stitch/                     # npm run stitch:sync / stitch:parity
│   ├── stitch/                             # Nguồn HTML Stitch + assets.json, overrides.json, screens.json
│   ├── src/
│   │   ├── app/                            # CHỈ routing: page.tsx mỏng, layout.tsx, metadata
│   │   ├── views/                          # UI từng màn hình, cùng cây thư mục với app/
│   │   ├── features/                       # Theo tính năng: studio/, intro/, stitch/, auth/, dashboard/, profile/, settings/
│   │   ├── components/                     # Dùng chung: common/ (GoiMascot...), layout/, modals/, charts/, forms/
│   │   ├── api/                            # Hàm gọi endpoint, mỗi module backend một thư mục
│   │   ├── services/                       # HTTP client (api/), audio/, analytics/, storage/
│   │   ├── store/                          # State toàn cục: slices/, actions/, reducers/, selectors/
│   │   ├── hooks/  layouts/  assets/  utils/  types/  config/  constants/  helpers/
│   ├── next.config.mjs  tailwind.config.ts  postcss.config.js  tsconfig.json
│   ├── Dockerfile
│   └── package.json
│
├── shared/                                 # PURE DOMAIN CORE (không phụ thuộc React, DOM hay CSDL)
│   ├── src/
│   │   ├── index.ts                        # Barrel file
│   │   ├── core/contracts.ts               # Interface, value object, domain event & enum
│   │   ├── types/                          # dieline.ts, project.ts, fitcheck.ts
│   │   ├── parametric/                     # tuck-top.ts, sleeve-drawer.ts, lid-base.ts, pillow.ts + registry.ts
│   │   ├── fitcheck/validator.ts           # Kiểm tra safe margin, bleed, glue clearance, DPI
│   │   └── exporter/pdf-export.ts          # Dựng dữ liệu PDF in ấn nhiều lớp
│   ├── tsconfig.json
│   └── package.json                        # Package name: @wrapfit/shared
│
├── be/                                     # BACKEND API & WORKER (NestJS), theo skeleton nestjs-project-structure
│   ├── prisma/
│   │   ├── schema.prisma                   # Lược đồ thực thể
│   │   ├── migrations/                     # Lịch sử thay đổi cấu trúc bảng
│   │   └── seed.ts                         # Dữ liệu mẫu (4 mẫu hộp chuẩn, tài khoản Admin)
│   ├── src/
│   │   ├── app.ts                          # Khởi chạy API HTTP (cổng 8080, prefix /api)
│   │   ├── worker.ts                       # Process BullMQ riêng: xuất file in, gửi email
│   │   ├── app.module.ts                   # Ghép module + guard / filter / interceptor toàn cục
│   │   ├── app.middleware.ts               # Request id, helmet, CORS, ValidationPipe, WebSocket adapter
│   │   ├── swagger.ts  repl.ts  mail-test.ts
│   │   ├── config/                         # env.validation.ts + envs/ (default, production...) + configuration.ts
│   │   ├── common/                         # @Global CommonModule: ConfigService, decorators, guards, filters, dto
│   │   ├── shared/                         # Nest module hạ tầng: prisma/ (PrismaService), queue/ (BullMQ)
│   │   ├── auth/                           # Đăng ký, đăng nhập, refresh, Google OAuth, JwtAuthGuard
│   │   ├── base/                           # GET /api/health
│   │   ├── users/  collections/  templates/  public-showcase/  unboxing/  ai/  events/
│   │   ├── projects/                       # 4 tầng: presentation / application / domain / infrastructure
│   │   ├── storage/                        # Pre-signed upload S3 / R2, hạn mức, dọn file
│   │   ├── export/                         # Hàng đợi xuất file + ExportProcessor (worker) + rendering/
│   │   └── mail/                           # Đưa email vào hàng đợi + gửi SMTP (worker)
│   ├── test/e2e/                           # E2E test (Jest + Supertest)
│   ├── .env.example                        # Mẫu biến môi trường Backend
│   ├── Dockerfile                          # Một image cho cả API (dist/app.js) và worker (dist/worker.js)
│   ├── tsconfig.json
│   └── package.json
│
├── docker-compose.yml                      # Môi trường dev: PostgreSQL, Redis, SeaweedFS, Mailpit, API, worker, FE
├── docker-compose.prod.yml                 # Production: thêm Caddy, dùng Cloudflare R2
├── .env.example                            # Mẫu biến môi trường cho docker compose
├── AGENTS.md                               # Quy tắc cho AI agent
└── package.json                            # npm workspaces: fe, be, shared
```

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
   - Import types, công thức dieline và FitCheck từ `@wrapfit/shared` (DTO `implements` các interface của shared).
   - Phụ thuộc vào Prisma ORM, CSDL PostgreSQL, Redis (BullMQ) và Cloud S3 / R2.

### 3.1. Ranh giới bên trong `be/src/`

Backend theo skeleton [nestjs-project-structure](https://github.com/CatsMiaow/nestjs-project-structure). Phụ thuộc cũng đi một chiều:

```
config/ + common/  ──▶  shared/prisma, shared/queue  ──▶  module nghiệp vụ  ──▶  app.module.ts / worker.ts
(tầng nền: env,           (Nest module hạ tầng)           (auth, users, projects,
 CommonModule @Global)                                     export...)
```

(mũi tên = "được import bởi"; `config/` và `common/` dùng lẫn nhau: `ConfigService` lấy kiểu `Config` từ `config/`, logger trong `config/` lấy request id từ `common/context`)

1. **`config/`, `common/`, `shared/`** là hạ tầng: không import module nghiệp vụ. Thứ nhiều module cùng cần (tên cookie, hàm băm token, decorator, DTO phân trang) đặt ở `common/`.
2. **Module nghiệp vụ** (`src/<tên>/`) có `index.ts` (barrel). Module khác import qua thư mục: `from '../projects'`, `from '../common'`, `from '../shared/prisma'` — không trỏ vào file bên trong module khác. Trong cùng module import thẳng file.
3. **Không vòng import** giữa các module: ESLint `import/no-cycle` chặn trong CI. Cần phụ thuộc ngược thì dùng Port + injection token (tài liệu 08, Mục 1.2 & 1.4) hoặc đưa phần dùng chung xuống `common/`.
4. **Chỉ `src/config/` đọc `process.env`**; phần còn lại đọc cấu hình bằng `ConfigService` của `common/`: `config.get('storage.bucket')`.
5. **Hai process, một mã nguồn**: `app.module.ts` (API) không import các `*WorkerModule`; `worker.ts` chỉ import hạ tầng (`PrismaModule`, `StorageModule`, kết nối queue) và các `*WorkerModule`. `@Cron` chỉ đăng ký trong API.

---

## 4. CHI TIẾT TÍCH HỢP DỊCH VỤ BÊN THỨ BA (3RD-PARTY INTEGRATIONS)

| Dịch Vụ Bên Thứ 3 | Mục Đích Sử Dụng | Vị Trí Triển Khai Trong Mã Nguồn | Biến Môi Trường Cần Thiết |
| :--- | :--- | :--- | :--- |
| **AWS S3 / Cloudflare R2** | Lưu trữ ảnh logo người dùng tải lên, ảnh mockup 4K và file PDF xuất in | `be/src/storage/storage.service.ts` | `STORAGE_BUCKET`, `STORAGE_REGION`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY` |
| **PostgreSQL** | Cơ sở dữ liệu chính lưu thông tin User, Project, Template, Order | `be/prisma/schema.prisma` | `DATABASE_URL="postgresql://user:pass@host:5432/wrapfit"` |
| **Redis & BullMQ** | Hàng đợi tác vụ ngầm xuất PDF/Mockup và Rate Limiting chống spam | `be/src/shared/queue/`, `be/src/export/`, `be/src/mail/`, `be/src/common/guards/http-throttler.guard.ts` | `REDIS_URL="redis://localhost:6379"` |
| **VNPay / Stripe / MoMo** | Cổng thanh toán gói Pro và đơn hàng in ấn quà tặng | `be/src/payments/` (chưa có) | `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `STRIPE_SECRET_KEY` |
| **GHTK / GHN API** | Tính phí ship tự động và đẩy đơn giao vận | `be/src/shipping/` (chưa có) | `GHTK_API_TOKEN`, `GHN_SHOP_ID` |
| **Resend / SendGrid** | Gửi email giao dịch (Xác thực, Quên mật khẩu, Báo đơn hàng) | `be/src/mail/` (SMTP qua worker) | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` |
| **Google OAuth 2.0** | Đăng nhập nhanh 1 cú nhấp chuột cho người dùng | `be/src/auth/strategies/google.strategy.ts` | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` |
| **Gemini / Stability AI** | Sinh hoa văn bao bì tự động theo chủ đề dịp tặng quà | `be/src/ai/` (Claude, dự phòng bằng thuật toán) | `ANTHROPIC_API_KEY`, `AI_MODEL_FAST`, `AI_MODEL_PREMIUM`, `AI_MONTHLY_BUDGET_USD` |
| **Cloudflare Turnstile** | CAPTCHA bảo vệ form đăng ký, quên mật khẩu chống bot | `fe/src/components/auth/`, `be/src/common/guards/` (chưa có) | `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` |

---

## 5. QUY ƯỚC ĐẶT TÊN TỆP TIN CHUẨN (NAMING CONVENTIONS)

- **Components React**: Dùng `PascalCase.tsx` (ví dụ: `PackagingStage.tsx`, `DielineCanvas2D.tsx`).
- **Hooks & Utilities**: Dùng `camelCase.ts` (ví dụ: `useDielineGeometry.ts`, `hapticAudio.ts`).
- **Services, Controllers & Rules**: Dùng `kebab-case.suffix.ts` (ví dụ: `auth.controller.ts`, `safe-margin.rule.ts`, `storage.service.ts`).
- **Backend NestJS (`be/src/`)**: thư mục module dạng `kebab-case` (`public-showcase/`); file theo loại `<tên>.module.ts`, `.controller.ts`, `.service.ts`, `.guard.ts`, `.strategy.ts`, `.processor.ts`, `.task.ts` (`@Cron`), `.dto.ts` (trong `dto/`, plugin Swagger đọc hậu tố này), `.constants.ts`, `.port.ts` (Port + injection token). Mỗi module và mỗi thư mục con của `common/` có `index.ts`. Unit test `<file>.spec.ts` đặt cạnh file; e2e `be/test/e2e/<luồng>.e2e-spec.ts`.
- **Prisma Models**: Dùng `PascalCase` (ví dụ: `PackagingProject`, `BoxTemplate`), tên bảng CSDL dùng `snake_case` số nhiều (`@@map("packaging_projects")`).
- **Tên biến & Hàm**: Dùng `camelCase` (ví dụ: `calculateDieline`, `isReadyForProduction`).
- **Hằng số & Enums**: Dùng `UPPER_SNAKE_CASE` (ví dụ: `BOX_STRUCTURE_TYPES`, `MAKER`, `PRO_ARTISAN`).

---

> 🎯 **Kết luận nghiệm thu**: Cấu trúc thư mục trên đây đã được thiết kế chuẩn mực hóa tối đa, phân tách rõ ràng trách nhiệm cho 3 thành viên IT, đảm bảo $100\%$ tính mở rộng khi dự án phát triển từ MVP Checkpoint 2 lên quy mô nền tảng thương mại triệu người dùng phong cách Pacdora.com!

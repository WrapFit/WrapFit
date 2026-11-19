# 🏛️ ĐẶC TẢ HỆ THỐNG CLASS DIAGRAM CHUẨN KIẾN TRÚC TOÀN DIỆN (PACDORA-GRADE ARCHITECTURE)

> **Dự án**: WrapFit Platform (Nền tảng Thiết kế & Đóng gói Bao bì Quà tặng Thông minh)  
> **Tham chiếu công nghiệp**: [Pacdora.com](https://www.pacdora.com/) — Nền tảng CAD & 3D Packaging Design số 1 thế giới  
> **Khóa học**: EXE101 — Trải nghiệm Khởi nghiệp Đổi mới Sáng tạo (FPT University)  
> **Kiến trúc chủ đạo**: **Clean Architecture kết hợp Domain-Driven Design (DDD)** & **GoF Design Patterns**  
> **Nền tảng Backend**: **NestJS 11** (TypeScript) + Prisma ORM + PostgreSQL — Frontend: Next.js 15 (xem tài liệu 07, Mục 1)  
> **Phiên bản tài liệu**: v7.1 (Hiện thực hóa kiến trúc trên NestJS: Module, Dependency Injection, Guards, BullMQ)  
> *v7.0: Master Enterprise Packaging & Full-Lifecycle Commercial Web Specification*  
> **v7.2 (19/11/2026)**: Gắn trạng thái và liên kết mã, đối chiếu với `develop` tại fb720a9. Không vẽ lại sơ đồ.

> **Cách đọc trạng thái.** Tài liệu này vừa mô tả phần đã chạy vừa giữ thiết kế tương lai. Mỗi phần ghi một trong ba mức:
> - **Có mã trên `develop`**: thành phần có trong `be/src/`, `fe/src/` hoặc `shared/src/`, kèm đường dẫn.
> - **Một phần**: có module, nhưng chỉ một phần của sơ đồ được làm, hoặc làm theo cách khác sơ đồ.
> - **Đề xuất**: chưa có mã. Sơ đồ giữ lại làm hướng thiết kế, không mô tả hệ thống hiện tại.
>
> Bảng tổng hợp ở [Mục 7](#7-ánh-xạ-26-gói-phân-hệ-sang-nestjs-modules). Các interface trong [`shared/src/core/contracts.ts`](../shared/src/core/contracts.ts) chỉ là **bản phác thảo**: file tự ghi là không thuộc API của package, không được export và không có mã nào import. Kiểu dữ liệu đang dùng nằm ở [`shared/src/types/`](../shared/src/types/), hình học hộp ở [`shared/src/parametric/`](../shared/src/parametric/), kiểm tra in ở [`shared/src/fitcheck/`](../shared/src/fitcheck/).

---

## MỤC LỤC TÀI LIỆU
1. [Tổng Quan Kiến Trúc 4 Tầng (Clean Architecture Overview)](#1-tổng-quan-kiến-trúc-4-tầng-clean-architecture-overview)
   - 1.1. Ánh xạ Clean Architecture sang NestJS
   - 1.2. Dependency Inversion với NestJS DI (Injection Token)
   - 1.3. Mức độ áp dụng theo từng Module (Pragmatic Clean Architecture)
   - 1.4. Ghép các module trong `be/src/` (phụ thuộc, barrel, API & worker)
2. [Sơ Đồ Lớp Kiến Trúc Tổng Thể (Master System Class Diagram)](#2-sơ-đồ-lớp-kiến-trúc-tổng-thể-master-system-class-diagram)
3. [Chi Tiết 26 Gói Phân Hệ Chuyên Sâu (Deep Domain Class Diagrams)](#3-chi-tiết-26-gói-phân-hệ-chuyên-sâu-deep-domain-class-diagrams)
   - 3.1. [Gói 1: Quản Trị Vòng Đời Dự Án & Aggregate Root (Domain Core & Lifecycle)](#31-gói-1-quản-trị-vòng-đời-dự-án--aggregate-root)
   - 3.2. [Gói 2: Động Cơ Toán Hình Học Tham Số CAD (Parametric Dieline Engine)](#32-gói-2-động-cơ-toán-hình-học-tham-số-cad)
   - 3.3. [Gói 3: Phòng Thu Vector 2D & Hệ Thống Phần Tử (2D Vector Canvas & Elements)](#33-gói-3-phòng-thu-vector-2d--hệ-thống-phần-tử)
   - 3.4. [Gói 4: Động Cơ WebGL 3D & Mô Phỏng Gập Động Học (3D Folding Kinematics & Materials)](#34-gói-4-động-cơ-webgl-3d--mô-phỏng-gập-động-học)
   - 3.5. [Gói 5: Động Cơ Thẩm Định Vật Lý & Tiền Kiểm In Ấn FitCheck™ (Preflight & Physics Engine)](#35-gói-5-động-cơ-thẩm-định-vật-lý--tiền-kiểm-in-ấn-fitcheck)
   - 3.6. [Gói 6: Đường Ống Xuất Bản Công Nghiệp & Render Đám Mây (Prepress Export & Cloud Rendering)](#36-gói-6-đường-ống-xuất-bản-công-nghiệp--render-đám-mây)
   - 3.7. [Gói 7: Trưng Bày Công Khai, Nhúng 3D & Trải Nghiệm Mở Hộp (Public Showcase & Viral Unboxing)](#37-gói-7-trưng-bày-công-khai-nhúng-3d--trải-nghiệm-mở-hộp)
   - 3.8. [Gói 8: Xác Thực, Đăng Ký & Phân Quyền IAM (Authentication, Identity & RBAC)](#38-gói-8-xác-thực-đăng-ký--phân-quyền-iam)
   - 3.9. [Gói 9: Danh Sách Yêu Thích & Quản Lý Bộ Sưu Tập (Wishlist & Custom Collections)](#39-gói-9-danh-sách-yêu-thích--quản-lý-bộ-sưu-tập)
   - 3.10. [Gói 10: Quản Lý Lưu Trữ, Thùng Rác 30 Ngày & Hạn Mức Quota S3 (Project Storage & Archival)](#310-gói-10-quản-lý-lưu-trữ-thùng-rác-30-ngày--hạn-mức-quota-s3)
   - 3.11. [Gói 11: Quản Trị Nền Tảng Toàn Diện & Nhật Ký Audit Log (Admin Platform Governance)](#311-gói-11-quản-trị-nền-tảng-toàn-diện--nhật-ký-audit-log)
   - 3.12. [Gói 12: Quản Trị Bảo Mật Tài Khoản & Vòng Đời Mật Khẩu (Password & Account Security)](#312-gói-12-quản-trị-bảo-mật-tài-khoản--vòng-đời-mật-khẩu)
   - 3.13. [Gói 13: Cổng Thanh Toán & Quản Lý Thuê Bao (Payment Gateway, Invoices & Subscriptions)](#313-gói-13-cổng-thanh-toán--quản-lý-thuê-bao)
   - 3.14. [Gói 14: Giỏ Hàng, Đặt Hàng & Vận Chuyển In Ấn (Cart, Checkout & Order Fulfillment)](#314-gói-14-giỏ-hàng-đặt-hàng--vận-chuyển-in-ấn)
   - 3.15. [Gói 15: Hệ Thống Thông Báo Đa Kênh (Multi-Channel Notification System)](#315-gói-15-hệ-thống-thông-báo-đa-kênh)
   - 3.16. [Gói 16: Hỗ Trợ Khách Hàng, Ticket & Đánh Giá (Support Ticketing & Customer Feedback)](#316-gói-16-hỗ-trợ-khách-hàng-ticket--đánh-giá)
   - 3.17. [Gói 17: Động Cơ Tìm Kiếm, Lọc Đa Tiêu Chí & Phân Trang (Search, Filter, Sort & Pagination)](#317-gói-17-động-cơ-tìm-kiếm-lọc-đa-tiêu-chí--phân-trang)
   - 3.18. [Gói 18: Mã Giảm Giá, Khuyến Mãi & Tiếp Thị Liên Kết (Coupons & Referral Affiliate)](#318-gói-18-mã-giảm-giá-khuyến-mãi--tiếp-thị-liên-kết)
   - 3.19. [Gói 19: Bảo Mật Nâng Cao, 2FA TOTP & Quản Lý Phiên Thiết Bị (Advanced Security & Sessions)](#319-gói-19-bảo-mật-nâng-cao-2fa-totp--quản-lý-phiên-thiết-bị)
   - 3.20. [Gói 20: Hệ Thống Đánh Giá Sản Phẩm, Blog CMS & SEO (Reviews, Blog & SEO Engine)](#320-gói-20-hệ-thống-đánh-giá-sản-phẩm-blog-cms--seo)
   - 3.21. [Gói 21: Kiểm Soát Lưu Lượng, Rate Limiting & Pháp Lý GDPR (Security Controls & GDPR)](#321-gói-21-kiểm-soát-lưu-lượng-rate-limiting--pháp-lý-gdpr)
   - 3.22. [Gói 22: Sổ Địa Chỉ & Vận Chuyển Đa Điểm (Address Book & Multi-Shipping Management)](#322-gói-22-sổ-địa-chỉ--vận-chuyển-đa-điểm)
   - 3.23. [Gói 23: Vòng Đời Đổi Trả, Hủy Đơn & Mua Lại (Order Cancellation, Refunds & Re-Order)](#323-gói-23-vòng-đời-đổi-trả-hủy-đơn--mua-lại)
   - 3.24. [Gói 24: Bản Tin Newsletter, Form Liên Hệ & Khách Vãng Lai (Newsletter & Guest Contact)](#324-gói-24-bản-tin-newsletter-form-liên-hệ--khách-vãng-lai)
   - 3.25. [Gói 25: Cộng Tác Thiết Kế & Phân Quyền Nhóm (Project Team Collaboration & Sharing)](#325-gói-25-cộng-tác-thiết-kế--phân-quyền-nhóm)
   - 3.26. [Gói 26: Quản Trị Banner Slider, Trang Tĩnh & Cấu Hình Web (CMS Banners & Web Config)](#326-gói-26-quản-trị-banner-slider-trang-tĩnh--cấu-hình-web)
4. [Đặc Tả 28 Luồng Nghiệp Vụ Xuyên Suốt Vòng Đời (End-to-End System & Sequence Flows)](#4-đặc-tả-28-luồng-nghiệp-vụ-xuyên-suốt-vòng-đời)
5. [Bảng Tra Cứu Các Design Patterns Áp Dụng (Design Patterns Catalog)](#5-bảng-tra-cứu-các-design-patterns-áp-dụng)
6. [Ma Trận Tuân Thủ Nguyên Tắc SOLID (SOLID Principles Compliance)](#6-ma-trận-tuân-thủ-nguyên-tắc-solid)
7. [Ánh Xạ 26 Gói Phân Hệ Sang NestJS Modules (NestJS Module Map)](#7-ánh-xạ-26-gói-phân-hệ-sang-nestjs-modules)

---

## 1. TỔNG QUAN KIẾN TRÚC 4 TẦNG (CLEAN ARCHITECTURE OVERVIEW)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ CLIENT LAYER — fe/ (Next.js 15, ngoài phạm vi NestJS)                       │
│    • 2D Vector Canvas (Fabric.js / Paper.js wrapper)                        │
│    • 3D WebGL Folding Stage (Three.js / React Three Fiber)                  │
│    • Public 3D Viewer, iFrame Widget, Cart Drawer, Checkout, Address Book   │
│    • Support Desk, Blog CMS, Hero Slider, Team Member Modal & Admin Hub UI  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTPS REST /api/* (JSON + HttpOnly Cookie JWT)
┌──────────────────────────────────────▼──────────────────────────────────────┐
│ 1. PRESENTATION LAYER — NestJS (src/*/presentation)                         │
│    • @Controller: ProjectsController, AuthController, ECommerceController   │
│    • Request DTO + ValidationPipe (class-validator), Swagger decorators     │
│    • Guards: JwtAuthGuard, RolesGuard, SubscriptionTierGuard, ProjectAccess │
│    • Interceptors (Audit Log, Response Transform), Exception Filters        │
│    • Entry points khác: @Processor (BullMQ), @Cron, @OnEvent listeners      │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Calls Application Use Cases
┌──────────────────────────────────────▼──────────────────────────────────────┐
│ 2. APPLICATION SERVICES LAYER — @Injectable() (src/*/application)           │
│    • ProjectApplicationService, IdentityApplicationService, SecurityService │
│    • PreflightAuditApplicationService, ExportApplicationService             │
│    • SubscriptionBillingService, OrderFulfillmentService, NotificationSvc   │
│    • AddressBookService, OrderRefundService, CollaborationService           │
│    • NewsletterService, ContactInquiryService, BannerManagerService         │
│    • Ports (interface + injection token): IOrderRepository, IPaymentGateway │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Coordinates Core Entities
┌──────────────────────────────────────▼──────────────────────────────────────┐
│ 3. DOMAIN CORE LAYER — TypeScript thuần (src/*/domain)                      │
│    • KHÔNG import @nestjs/*, @prisma/client hay SDK bên thứ ba              │
│    • Aggregates: PackagingProject, User, Collection, Order, SupportTicket   │
│    • Entities: Address, RefundRequest, NewsletterSubscriber, Banner, Member │
│    • Value Objects: Dimensions, MaterialSpec, ShippingAddress, BrandKit...  │
│    • Core Engines (@wrapfit/shared): ParametricCAD, Preflight, Exporter     │
│    • Domain Events: ProjectCreated, OrderPlaced, PaymentSucceeded...        │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Implements Interfaces / Inversion (NestJS DI)
┌──────────────────────────────────────▼──────────────────────────────────────┐
│ 4. INFRASTRUCTURE LAYER — NestJS Providers (src/*/infrastructure)           │
│    • Database: PostgreSQL via Prisma (PrismaService + PrismaRepositories)   │
│    • Cloud Storage: AWS S3 / Cloudflare R2 Adapter (S3StorageAdapter)       │
│    • Payment Gateways: Stripe Adapter, VNPay Adapter, MoMo Adapter          │
│    • Couriers: GHTK API Adapter, GHN API Adapter                            │
│    • Email & Push: Resend / SendGrid Email Adapter, WebPush Adapter         │
│    • Asynchronous Queue: @nestjs/bullmq + Redis (export, render, mail)      │
│    • Đăng ký: { provide: PAYMENT_GATEWAY, useClass: StripeAdapter }         │
└─────────────────────────────────────────────────────────────────────────────┘
```

> **Trạng thái sơ đồ 4 tầng: một phần.** Sơ đồ là mục tiêu thiết kế. Đã có mã: `ProjectsController` và 4 tầng của [`be/src/projects/`](../be/src/projects/), `AuthController`, `JwtAuthGuard`, `RolesGuard`, `ProjectOwnerGuard`, `@Processor` / `@Cron` / `@OnEvent`, S3/R2 qua [`StorageService`](../be/src/storage/storage.service.ts), BullMQ với ba hàng đợi `export`, `mail`, `ai-image`, cổng VNPay sandbox ([`be/src/payments/vnpay/`](../be/src/payments/vnpay/)) và VietQR + SePay ([`be/src/payments/`](../be/src/payments/)). **Đề xuất**: `ECommerceController`, `SubscriptionTierGuard`, `ProjectAccess`, interceptor Audit Log, các service Address Book / Refund / Collaboration / Newsletter / Contact / Banner, Stripe và MoMo adapter, GHTK/GHN adapter, Resend/SendGrid/WebPush adapter (email hiện gửi qua SMTP, [`smtp-mailer.ts`](../be/src/mail/smtp-mailer.ts)). Phần dựng file in không nằm ở `@wrapfit/shared` mà ở [`be/src/export/rendering/`](../be/src/export/rendering/).

### 1.1. Ánh xạ Clean Architecture sang NestJS

| Tầng | Thành phần NestJS | Thư mục | Quy tắc phụ thuộc |
| :--- | :--- | :--- | :--- |
| **Presentation** | `@Controller`, Request/Response DTO (`class-validator`, `@nestjs/swagger`), Guard, Pipe, Interceptor, Exception Filter, `@Processor` (BullMQ), `@Cron`, `@OnEvent` | `src/<tên>/presentation/` | Chỉ gọi Application Service. Không gọi Prisma, không chứa logic nghiệp vụ. |
| **Application** | Class `@Injectable()` (Use Case / Application Service), Port interface + injection token | `src/<tên>/application/` | Phụ thuộc Domain và các Port. Không biết đến Prisma, Stripe, S3... |
| **Domain Core** | Class TypeScript thuần: Aggregate, Entity, Value Object, Domain Event, Domain Policy; thuật toán từ `@wrapfit/shared` | `src/<tên>/domain/` | **Không** import `@nestjs/*`, `@prisma/client`, SDK bên thứ ba → test được bằng Jest thuần, không cần khởi động Nest. |
| **Infrastructure** | `PrismaXxxRepository`, `StripePaymentGatewayAdapter`, `S3StorageAdapter`... đăng ký bằng custom provider | `src/<tên>/infrastructure/` | Implement các Port. Là nơi duy nhất được dùng `PrismaService` và SDK bên ngoài. |

Thực tế trong code: [`be/src/projects/`](../be/src/projects/) là module đủ 4 tầng. Cấu trúc một module đầy đủ (ví dụ `address-book`, **đề xuất**, chưa triển khai):

```
be/src/address-book/
├── index.ts                              # export * from './address-book.module' (+ những gì module khác dùng)
├── address-book.module.ts
├── presentation/
│   ├── address-book.controller.ts        # @Controller('users/me/addresses')
│   └── dto/                              # CreateAddressDto, UpdateAddressDto, AddressResponseDto
├── application/
│   ├── address-book.service.ts           # AddressBookService (@Injectable)
│   └── ports/address.repository.port.ts  # IAddressRepository + ADDRESS_REPOSITORY token
├── domain/
│   └── user-address.entity.ts            # UserAddressEntity (TS thuần)
└── infrastructure/
    └── prisma-address.repository.ts      # PrismaAddressRepository implements IAddressRepository
```

### 1.2. Dependency Inversion với NestJS DI (Injection Token)

Interface của TypeScript **bị xóa khi biên dịch**, nên NestJS không thể inject theo interface. Mọi Port phải đi kèm một **injection token** (`Symbol`) hoặc được khai báo dưới dạng `abstract class`:

```typescript
// application/ports/address.repository.port.ts
export const ADDRESS_REPOSITORY = Symbol('ADDRESS_REPOSITORY');

export interface IAddressRepository {
  listByUser(userId: string): Promise<UserAddressEntity[]>;
  create(address: UserAddressEntity): Promise<UserAddressEntity>;
  unmarkPreviousDefault(userId: string): Promise<void>;
}

// application/address-book.service.ts
@Injectable()
export class AddressBookService {
  constructor(
    @Inject(ADDRESS_REPOSITORY) private readonly addressRepo: IAddressRepository,
  ) {}

  @Transactional() // @nestjs-cls/transactional: 2 lệnh ghi dưới đây nằm trong cùng 1 transaction Prisma
  async addAddress(userId: string, dto: CreateAddressDto): Promise<UserAddressEntity> {
    if (dto.isDefault) await this.addressRepo.unmarkPreviousDefault(userId);
    return this.addressRepo.create(UserAddressEntity.create(userId, dto));
  }
}

// address-book.module.ts
@Module({
  controllers: [AddressBookController],
  providers: [
    AddressBookService,
    { provide: ADDRESS_REPOSITORY, useClass: PrismaAddressRepository }, // Đổi hạ tầng chỉ cần sửa dòng này
  ],
  exports: [AddressBookService],
})
export class AddressBookModule {}
```

- **Transaction xuyên repository**: dùng `@nestjs-cls/transactional` + `@nestjs-cls/transactional-adapter-prisma` để Application Service khai báo `@Transactional()` mà không phải truyền `Prisma.TransactionClient` qua từng hàm.
- **Strategy theo cấu hình**: chọn adapter lúc khởi động bằng `useFactory`, ví dụ `{ provide: PAYMENT_GATEWAY, useFactory: (config: ConfigService, stripe, vnpay) => config.get('payment.provider') === 'vnpay' ? vnpay : stripe, inject: [ConfigService, StripePaymentGatewayAdapter, VnpayPaymentGatewayAdapter] }` — `ConfigService` có kiểu của `be/src/common`, khóa `payment.provider` khai báo trong `config/envs/default.ts` (tài liệu 07, Mục 1.5). Đang dùng cách này: `AI_PATTERN_GENERATOR` trong `ai.module.ts` chọn Claude hay bộ sinh thuật toán theo `ai.anthropicApiKey`.
- **Port gắn vào provider sẵn có**: `{ provide: PROJECT_FILES, useExisting: StorageService }` trong `projects.module.ts` — `StorageService` (module `storage`) implement port của `projects`; `ProjectsService` (tầng application) xóa / đếm file qua port `IProjectFiles`, không gọi thẳng `StorageService` (Mục 1.4).
- **Unit test**: thay Port bằng mock qua `Test.createTestingModule({ providers: [AddressBookService, { provide: ADDRESS_REPOSITORY, useValue: mockRepo }] })`.

### 1.3. Mức độ áp dụng theo từng Module (Pragmatic Clean Architecture)

Để phù hợp quy mô nhóm 3 IT trong EXE101, **không bắt buộc mọi module phải đủ 4 tầng**. Cách tổ chức thư mục trong một module theo nguyên tắc của skeleton *nestjs-project-structure*: thêm thư mục theo quy mô (tài liệu 07, Mục 1.3 – 1.4).

| Loại module | Hiện có trong `be/src/` | Cấu trúc áp dụng |
| :--- | :--- | :--- |
| **Nghiệp vụ phức tạp** (có trạng thái, quy tắc, cổng ra hạ tầng) | `projects` (State Pattern, thùng rác 30 ngày, port `PROJECT_REPOSITORY`, `SNAPSHOT_REPOSITORY`, `PROJECT_FILES`, `PROJECT_EVENTS`). Collaboration: đề xuất | Đủ 4 tầng: `presentation / application / domain / infrastructure` + Port & Token |
| **Nhiều thành phần, ít quy tắc** | `auth` (`guards/`, `strategies/`), `export` (`rendering/`), `ai` (`pattern/`, `image/`), `payments` (`sepay/`, `vnpay/`, `admin/`). `billing`, `orders`, `notifications`, `analytics`, `library` hiện phẳng dù có quy tắc nghiệp vụ | Phẳng + thư mục con theo vai trò. Tách 4 tầng khi phát sinh quy tắc nghiệp vụ |
| **CRUD đơn giản** | `collections`, `templates`, `users`, `unboxing`, `public-showcase`, `print-shops`, `reviews`. Newsletter, Contact, Banner, WebConfig: đề xuất | Gọn 3 lớp: `Controller → Service → PrismaService`, vẫn có DTO và Guard đầy đủ |
| **Hạ tầng / kỹ thuật** | `common/` (CommonModule `@Global`), `shared/prisma`, `shared/queue`, `storage` (`@Global`), `mail`, `events`, `base` | Không chứa quy tắc nghiệp vụ. `common/` và `shared/` không import module nghiệp vụ |

Khi một module CRUD phát sinh nghiệp vụ phức tạp hơn, tách dần ra Port/Repository mà không ảnh hưởng tới Controller.

### 1.4. Ghép các module trong `be/src/` (phụ thuộc, barrel, API & worker)

Phụ thuộc giữa các module nghiệp vụ hiện tại (mũi tên = "import"; mọi module đều dùng `common/` và `shared/prisma`, không vẽ lại):

```mermaid
graph LR
    auth[auth] --> users[users]
    auth --> mail[mail]
    users --> storage[storage]
    projects[projects] --> storage
    exportMod[export] --> projects
    exportMod --> storage
    showcase[public-showcase] --> projects
    showcase --> storage
    showcase --> users
    templates[templates] --> projects
    templates --> storage
    templates --> users
    unboxing[unboxing] --> projects
    unboxing --> storage
    unboxing --> users
    base[base] --> exportMod
    storage -.->|import type: port PROJECT_FILES| projects
```

> **Trạng thái: có mã trên `develop`, sơ đồ chưa đủ.** Sơ đồ vẽ khi `be/src/` có 11 module nghiệp vụ. Từ đó có thêm `billing`, `payments`, `orders`, `print-shops`, `reviews`, `library`, `notifications`, `analytics` và `shared/redis`; các phụ thuộc của chúng chưa có trên sơ đồ. Nguồn đúng là các `import` trong mã, ESLint `import/no-cycle` kiểm trong CI.

- **Không vòng import**: mỗi module export qua `index.ts` (barrel) và module khác import qua thư mục (`from '../projects'`). ESLint `import/no-cycle` báo lỗi nếu có vòng; `import type` bị xóa khi biên dịch nên không tính.
- **Khi module A cần thứ của module B mà B lại phụ thuộc A**, chọn một trong hai cách đang dùng trong code:
  1. *Đảo phụ thuộc bằng Port* (Mục 1.2): `projects` khai báo port `PROJECT_FILES` (`projects/application/ports/project-files.port.ts`), `StorageService` implement nó và `ProjectsModule` gắn bằng `{ provide: PROJECT_FILES, useExisting: StorageService }` — `storage` chỉ `import type` từ `projects`.
  2. *Đưa phần dùng chung xuống `common/`*: tên cookie `ACCESS_COOKIE` (11 controller cần) ở `common/constants/`, hàm băm token email (cả `auth` lẫn `mail` cần) ở `common/utils/auth-token.crypto.ts`.
- **API & worker**: module có phần chạy nền khai báo 2 class trong cùng file `*.module.ts` — `ExportModule` (controller + đẩy job, import vào `app.module.ts`) và `ExportWorkerModule` (`ExportProcessor`, import vào `worker.ts`); tương tự `MailModule` / `MailWorkerModule` và `AiImageWorkerModule` ([`be/src/worker.ts`](../be/src/worker.ts)). Các `@Processor` (BullMQ) chỉ tồn tại trong process worker, các `@Cron` chỉ trong process API.

---

## 2. SƠ ĐỒ LỚP KIẾN TRÚC TỔNG THỂ (MASTER SYSTEM CLASS DIAGRAM)

Sơ đồ dưới đây thể hiện cách các lớp được hiện thực trong NestJS: Controller (`<<Controller>>`) chỉ phụ thuộc Application Service; Application Service chỉ phụ thuộc **Port** (`<<interface>>`); Adapter ở tầng Infrastructure **hiện thực** Port và được NestJS DI gắn vào lúc chạy.

> **Trạng thái: đề xuất.** Trong sơ đồ này chỉ `ProjectsController` có trong mã ([`projects.controller.ts`](../be/src/projects/presentation/projects.controller.ts)). Các aggregate, port và adapter khác (`PackagingProjectAggregate`, `UserAggregate`, `OrderAggregate`, `IOrderRepository`, `IShippingProvider`, `StripePaymentGatewayAdapter`, `VnpayPaymentGatewayAdapter`, `GhtkShippingAdapter`, `ResendEmailNotificationAdapter`...) là thiết kế, chưa có class tương ứng. Một số tên chỉ có trong bản phác thảo `contracts.ts`. Mã thanh toán thật: [`payments.service.ts`](../be/src/payments/payments.service.ts), [`vnpay.gateway.ts`](../be/src/payments/vnpay/vnpay.gateway.ts), [`sepay-webhook.service.ts`](../be/src/payments/sepay/sepay-webhook.service.ts). Mã đơn in thật: [`orders.service.ts`](../be/src/orders/orders.service.ts).

> `EditorStudioController` của v7.0 là controller phía giao diện (khởi tạo Studio, xử lý kéo thanh kích thước) nên thuộc `fe/`. Phía Backend được thay bằng `ProjectsController` (REST API).

```mermaid
classDiagram
    %% TẦNG PRESENTATION (NestJS Controllers)
    namespace Presentation {
        class ProjectsController {
            <<Controller>>
            -ProjectApplicationService projectService
            -PreflightAuditApplicationService auditService
            -ExportApplicationService exportService
            +create(user, dto: CreateProjectDto) Promise~ProjectResponseDto~
            +updateDimensions(id, dto: UpdateDimensionsDto) Promise~ProjectResponseDto~
            +requestExport(id, dto: CreateExportDto) Promise~ExportJobDto~
        }

        class AuthSecurityController {
            <<Controller>>
            -IdentityApplicationService identityService
            -SecurityApplicationService securityService
            +register(dto: RegisterDto) AuthResponseDTO
            +loginLocal(dto: LoginDto) AuthResponseDTO
            +googleCallback(req) void
            +verify2FA(dto: Verify2FADto) AuthResponseDTO
        }

        class ECommerceController {
            <<Controller>>
            -OrderFulfillmentService orderService
            -AddressBookService addressService
            -OrderRefundService refundService
            +checkout(user, dto: CheckoutDto) OrderReceiptDTO
            +manageAddresses() void
            +requestRefund(orderId, dto: RefundRequestDto) void
        }

        class MarketingCmsController {
            <<Controller>>
            -NewsletterService newsletterService
            -ContactInquiryService contactService
            -BannerManagerService bannerService
            +subscribeNewsletter(dto) void
            +submitInquiry(dto) void
        }

        class AdminPlatformController {
            <<Controller>>
            -AdminGovernanceApplicationService adminService
            +getOverview() AdminDashboardDTO
            +curateTemplate(id) void
        }
    }

    %% TẦNG APPLICATION (@Injectable services + Ports)
    namespace Application {
        class OrderFulfillmentService {
            <<Injectable>>
            -IOrderRepository orderRepo
            -IShippingProvider shippingProvider
            -IPaymentGateway paymentGateway
            +createOrderFromCart() Promise~OrderAggregate~
        }

        class AddressBookService {
            <<Injectable>>
            -IAddressRepository addressRepo
            +addAddress() Promise~UserAddressEntity~
        }

        class OrderRefundService {
            <<Injectable>>
            -IRefundRepository refundRepo
            +submitRefundRequest() Promise~RefundRequestEntity~
        }

        class ProjectCollaborationService {
            <<Injectable>>
            -ICollaborationRepository memberRepo
            +inviteMember() Promise~void~
        }

        class IOrderRepository {
            <<interface>>
            +findById(orderId) Promise~OrderAggregate~
            +save(order: OrderAggregate) Promise~void~
        }

        class IPaymentGateway {
            <<interface>>
            +createCheckoutSession() Promise~PaymentInitiateResult~
            +refundTransaction(transactionId, amount) Promise~void~
        }

        class IShippingProvider {
            <<interface>>
            +calculateShippingFee() Promise~number~
        }

        class IEmailSender {
            <<interface>>
            +sendEmail() Promise~void~
        }
    }

    %% TẦNG DOMAIN CORE (TypeScript thuần)
    namespace DomainCore {
        class PackagingProjectAggregate {
            -string id
            -BoxDimensions dimensions
            -MaterialSpec material
        }

        class UserAggregate {
            -string id
            -string email
            -UserRole role
        }

        class OrderAggregate {
            -string orderId
            -OrderStatus status
            -List~OrderItem~ items
        }

        class UserAddressEntity {
            +string addressId
            +string recipientName
            +string addressLine
            +boolean isDefault
        }

        class RefundRequestEntity {
            +string refundId
            +RefundStatus status
            +number refundAmountVnd
        }
    }

    %% TẦNG INFRASTRUCTURE (NestJS Providers)
    namespace Infrastructure {
        class PrismaOrderRepository { +save(order) Promise~void~ }
        class StripePaymentGatewayAdapter { +createCheckoutSession() Promise~PaymentInitiateResult~ }
        class VnpayPaymentGatewayAdapter { +createCheckoutSession() Promise~PaymentInitiateResult~ }
        class GhtkShippingAdapter { +calculateShippingFee() Promise~number~ }
        class ResendEmailNotificationAdapter { +sendEmail() Promise~void~ }
    }

    %% LIÊN KẾT
    ProjectsController ..> ProjectCollaborationService
    ECommerceController ..> OrderFulfillmentService
    ECommerceController ..> AddressBookService
    ECommerceController ..> OrderRefundService
    OrderFulfillmentService --> OrderAggregate
    OrderFulfillmentService --> IOrderRepository
    OrderFulfillmentService --> IPaymentGateway
    OrderFulfillmentService --> IShippingProvider
    AddressBookService --> UserAddressEntity
    OrderRefundService --> RefundRequestEntity
    PrismaOrderRepository ..|> IOrderRepository
    StripePaymentGatewayAdapter ..|> IPaymentGateway
    VnpayPaymentGatewayAdapter ..|> IPaymentGateway
    GhtkShippingAdapter ..|> IShippingProvider
    ResendEmailNotificationAdapter ..|> IEmailSender
```

---

## 3. CHI TIẾT 26 GÓI PHÂN HỆ CHUYÊN SÂU (DEEP DOMAIN CLASS DIAGRAMS)

*(Các Gói 1 đến 21 đã được trình bày chi tiết. Dưới đây là các Gói 22 đến 26 hoàn thiện toàn bộ các luồng web thông thường còn lại).*

> **Trạng thái: đề xuất.** Gói 22–26 chưa có mã. Sơ đồ lớp dưới đây là thiết kế cho sau MVP. Trạng thái của cả 26 gói xem [Mục 7](#7-ánh-xạ-26-gói-phân-hệ-sang-nestjs-modules).

### 3.22. Gói 22: Sổ Địa Chỉ & Vận Chuyển Đa Điểm (Address Book & Multi-Shipping)
Quản trị sổ địa chỉ giao hàng cá nhân của người dùng, hỗ trợ nhiều địa chỉ (nhà riêng, công ty, xưởng quà), tự động đề xuất địa chỉ mặc định khi thanh toán.

```mermaid
classDiagram
    class AddressBookService {
        -IAddressRepository addressRepo
        +listAddresses(userId: string) Promise~List~UserAddressEntity~~
        +addAddress(userId: string, address: CreateAddressDTO) Promise~UserAddressEntity~
        +updateAddress(addressId: string, userId: string, updates: PartialAddressDTO) Promise~void~
        +deleteAddress(addressId: string, userId: string) Promise~void~
        +setDefaultAddress(addressId: string, userId: string) Promise~void~
    }

    class UserAddressEntity {
        +string addressId
        +string userId
        +string recipientName
        +string phoneNumber
        +string addressLine
        +string ward
        +string district
        +string provinceCity
        +string postalCode
        +boolean isDefault
        +DateTime createdAt
        +getFullAddressString() string
    }

    AddressBookService --> UserAddressEntity
```

---

### 3.23. Gói 23: Vòng Đời Đổi Trả, Hủy Đơn & Mua Lại (Order Cancellation, Refunds & Re-Order)
Quản trị toàn vẹn chu trình sau mua hàng: Khách tự hủy đơn hàng trước khi xưởng in thực hiện bế khuôn, gửi yêu cầu bồi hoàn/đổi trả kèm ảnh lỗi in ấn và tính năng 1-Click mua lại đơn cũ.

```mermaid
classDiagram
    class OrderCancellationService {
        -IOrderRepository orderRepo
        -INotificationDispatcher notifications
        +cancelPendingOrder(orderId: string, userId: string, reason: string) Promise~void~
    }

    class OrderRefundService {
        -IRefundRepository refundRepo
        -IOrderRepository orderRepo
        -IPaymentGateway paymentGateway
        +submitRefundRequest(orderId: string, userId: string, reason: string, proofImages: List~string~) Promise~RefundRequestEntity~
        +processRefund(refundId: string, approved: boolean, adminId: string, note: string) Promise~void~
    }

    class ReorderService {
        -IOrderRepository orderRepo
        +cloneOrderToCart(orderId: string, userId: string, cart: IShoppingCart) Promise~void~
    }

    class RefundRequestEntity {
        +string refundId
        +string orderId
        +string userId
        +string reason
        +List~string~ proofImages
        +number refundAmountVnd
        +RefundStatus status
        +string adminNote
        +DateTime requestedAt
        +DateTime processedAt
    }

    class RefundStatus {
        <<enumeration>>
        PENDING
        APPROVED
        REJECTED
        REFUNDED
    }

    OrderRefundService --> RefundRequestEntity
    RefundRequestEntity *-- RefundStatus
```

---

### 3.24. Gói 24: Bản Tin Newsletter, Form Liên Hệ & Khách Vãng Lai (Newsletter & Guest Contact)
Thu thập tệp khách hàng tiềm năng qua ô đăng ký nhận tin (Newsletter Subscribe) ở Footer và tiếp nhận giải đáp thắc mắc từ Form Liên hệ (Contact Us) mà không bắt buộc đăng nhập.

```mermaid
classDiagram
    class NewsletterService {
        -INewsletterRepository subscriberRepo
        -IEmailSender emailSender
        +subscribe(email: string, source: string) Promise~void~
        +unsubscribe(email: string) Promise~void~
        +listSubscribers() Promise~List~NewsletterSubscriberEntity~~
    }

    class NewsletterSubscriberEntity {
        +string email
        +DateTime subscribedAt
        +boolean isActive
        +string source
    }

    class ContactInquiryService {
        -IContactInquiryRepository inquiryRepo
        -IEmailSender emailSender
        +submitInquiry(inquiry: CreateInquiryDTO) Promise~void~
        +listInquiries(unrepliedOnly: boolean) Promise~List~ContactInquiryEntity~~
        +markAsReplied(inquiryId: string, note: string) Promise~void~
    }

    class ContactInquiryEntity {
        +string inquiryId
        +string senderName
        +string senderEmail
        +string phoneNumber
        +string subject
        +string message
        +boolean isReplied
        +string replyNote
        +DateTime receivedAt
    }

    NewsletterService --> NewsletterSubscriberEntity
    ContactInquiryService --> ContactInquiryEntity
```

---

### 3.25. Gói 25: Cộng Tác Thiết Kế & Phân Quyền Nhóm (Project Team Collaboration & Sharing)
Cho phép chủ shop hoặc nhà thiết kế mời thành viên trong nhóm (đồng nghiệp, thợ in, khách hàng) cùng xem, nhận xét hoặc trực tiếp chỉnh sửa hộp quà theo các cấp quyền `VIEWER`, `EDITOR`, `ADMIN`.

```mermaid
classDiagram
    class ProjectCollaborationService {
        -IProjectMemberRepository memberRepo
        -IPackagingProjectRepository projectRepo
        -IEmailSender emailSender
        +inviteMember(projectId: string, inviterUserId: string, targetEmail: string, role: ProjectMemberRole) Promise~void~
        +acceptInvitation(projectId: string, userId: string) Promise~void~
        +removeMember(projectId: string, targetUserId: string, ownerUserId: string) Promise~void~
        +listProjectMembers(projectId: string) Promise~List~ProjectMemberEntity~~
    }

    class ProjectMemberEntity {
        +string membershipId
        +string projectId
        +string userId
        +string userEmail
        +ProjectMemberRole role
        +DateTime invitedAt
        +DateTime acceptedAt
    }

    class ProjectMemberRole {
        <<enumeration>>
        VIEWER
        EDITOR
        ADMIN
    }

    ProjectCollaborationService --> ProjectMemberEntity
    ProjectMemberEntity *-- ProjectMemberRole
```

---

### 3.26. Gói 26: Quản Trị Banner Slider, Trang Tĩnh & Cấu Hình Web (CMS Banners & Web Config)
Hệ thống CMS quản lý Banner quảng cáo trang chủ (Hero Slider), cấu hình đường dây nóng Hotline, thông tin văn phòng, liên kết mạng xã hội và chuyển đổi tiền tệ / chế độ bảo trì toàn hệ thống.

```mermaid
classDiagram
    class BannerManagerService {
        -IBannerRepository bannerRepo
        +listActiveBanners() Promise~List~HeroBannerEntity~~
        +createBanner(banner: CreateBannerDTO) Promise~HeroBannerEntity~
        +updateBanner(bannerId: string, updates: UpdateBannerDTO) Promise~void~
        +deleteBanner(bannerId: string) Promise~void~
    }

    class HeroBannerEntity {
        +string bannerId
        +string title
        +string subtitle
        +string imageUrl
        +string ctaText
        +string ctaLink
        +int displayOrder
        +boolean isActive
    }

    class WebConfigService {
        -IWebConfigRepository configRepo
        +getConfig() Promise~WebConfigurationEntity~
        +updateConfig(updates: UpdateConfigDTO, adminId: string) Promise~void~
    }

    class WebConfigurationEntity {
        +string siteName
        +string hotline
        +string supportEmail
        +string officeAddress
        +Record~string, string~ socialLinks
        +boolean isMaintenanceMode
        +string defaultCurrency
        +List~string~ supportedLocales
    }

    BannerManagerService --> HeroBannerEntity
    WebConfigService --> WebConfigurationEntity
```

---

## 4. ĐẶC TẢ 28 LUỒNG NGHIỆP VỤ XUYÊN SUỐT VÒNG ĐỜI (END-TO-END SYSTEM & SEQUENCE FLOWS)

*(Các Luồng 1 đến 23 đã được trình bày chi tiết tại các phần trước: Dieline CAD, 2D Canvas, 3D Folding, FitCheck Preflight, Snapshot, Public Showcase, PDF CMYK 300 DPI, Cloud Mockup, Unboxing QR, Login/OAuth, Wishlist/Collections, Archival/Trash 30 days, Admin Governance, Forgot Password, Subscription Billing, Shopping Cart Checkout, Notifications, Support Ticket, 2FA TOTP, Coupon/Referral, Faceted Search, Device Sessions/GDPR).*

---

> **Trạng thái: đề xuất.** Luồng 24–28 dựa trên Gói 22–26, chưa có mã.

> **Quy ước chung cho các luồng (NestJS)**: Mọi request từ giao diện đi vào **Controller** → qua **Guard** (`JwtAuthGuard`, `RolesGuard`...) → **ValidationPipe** kiểm tra DTO → gọi **Application Service**. Email/thông báo luôn được đẩy vào hàng đợi BullMQ `mail` để không làm chậm phản hồi HTTP.

### Luồng 24: Quản Lý Sổ Địa Chỉ Giao Hàng Đa Điểm (Address Book Flow)

```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng
    participant UI as Cài Đặt Sổ Địa Chỉ (/settings/addresses)
    participant Ctrl as AddressBookController
    participant AddrSvc as AddressBookService
    participant AddrRepo as PrismaAddressRepository
    participant DB as PostgreSQL DB

    User->>UI: Bấm [Thêm Địa Chỉ Mới] (Họ tên: Lan Hương, SĐT, Hà Nội) -> Tích chọn [Đặt làm mặc định]
    UI->>Ctrl: POST /api/users/me/addresses { recipientName, phoneNumber, addressLine, ward, district, provinceCity, isDefault: true }
    Ctrl->>Ctrl: JwtAuthGuard lấy userId từ cookie, ValidationPipe kiểm tra CreateAddressDto
    Ctrl->>AddrSvc: addAddress(userId, dto)
    Note over AddrSvc,DB: @Transactional() - 2 lệnh ghi dưới đây nằm trong cùng 1 transaction
    AddrSvc->>AddrRepo: unmarkPreviousDefault(userId)
    AddrRepo->>DB: UPDATE user_addresses SET is_default = false WHERE user_id = userId
    AddrSvc->>AddrRepo: create(UserAddressEntity)
    AddrRepo->>DB: INSERT INTO user_addresses
    AddrSvc-->>Ctrl: UserAddressEntity
    Ctrl-->>UI: 201 Created + AddressResponseDto (huy hiệu "Mặc định")
    UI-->>User: Khi vào trang Checkout Giỏ Hàng, địa chỉ này tự động được chọn sẵn
```

---

### Luồng 25: Hủy Đơn Hàng & Yêu Cầu Hoàn Tiền Tự Động (Cancel & Refund Flow)

```mermaid
sequenceDiagram
    autonumber
    actor Maker as Khách Hàng Đặt In
    actor Admin as Nhân Viên WrapFit
    participant OrderUI as Lịch Sử Đơn Hàng (/orders)
    participant OrdersCtrl as OrdersController
    participant AdminCtrl as AdminRefundsController
    participant CancelSvc as OrderCancellationService
    participant RefundSvc as OrderRefundService
    participant Gateway as IPaymentGateway (Stripe / VNPay Adapter)
    participant DB as PostgreSQL DB

    alt Khách tự hủy đơn hàng trước khi in (Status: PENDING_PAYMENT / PAID)
        Maker->>OrderUI: Bấm [Hủy Đơn Hàng] -> Chọn lý do: "Đổi kích thước hộp khác"
        OrderUI->>OrdersCtrl: POST /api/orders/:id/cancel { reason }
        OrdersCtrl->>CancelSvc: cancelPendingOrder(orderId, userId, reason)
        CancelSvc->>CancelSvc: OrderAggregate.cancel() kiểm tra trạng thái hợp lệ (State Pattern)
        CancelSvc->>DB: UPDATE orders SET status = 'CANCELLED'
        CancelSvc-->>OrdersCtrl: Phát sự kiện order.cancelled
        OrdersCtrl-->>OrderUI: 200 OK - Đơn hàng đã hủy thành công
    end

    alt Yêu cầu hoàn tiền khi thành phẩm in bị lỗi (Return & Refund)
        Maker->>OrderUI: Bấm [Yêu Cầu Hoàn Tiền / Đổi Trả] -> Tải ảnh hộp in bị rách nếp cấn (pre-signed upload lên R2)
        OrderUI->>OrdersCtrl: POST /api/orders/:id/refunds { reason, proofImageKeys }
        OrdersCtrl->>RefundSvc: submitRefundRequest(orderId, userId, reason, proofImages)
        RefundSvc->>DB: INSERT INTO refund_requests (status: 'PENDING')
        RefundSvc-->>OrderUI: 201 Created - Yêu cầu hoàn tiền RF-209 đã gửi, chờ thẩm định

        Admin->>AdminCtrl: PATCH /api/admin/refunds/:id { approved: true, note } (RolesGuard: ADMIN)
        AdminCtrl->>RefundSvc: processRefund(refundId, true, adminId, note)
        RefundSvc->>Gateway: refundTransaction(transactionId, amount)
        Gateway-->>RefundSvc: Hoàn tiền thành công về thẻ/ví người dùng
        RefundSvc->>DB: UPDATE refund_requests SET status = 'REFUNDED'
        RefundSvc-->>AdminCtrl: Phát sự kiện refund.completed (gửi email cho khách qua hàng đợi mail)
    end
```

---

### Luồng 26: Khách Vãng Lai Đăng Ký Newsletter & Gửi Form Liên Hệ (Guest Engagement Flow)

```mermaid
sequenceDiagram
    autonumber
    actor Guest as Khách Vãng Lai (Chưa đăng nhập)
    participant WebUI as Trang Chủ / Footer
    participant Ctrl as MarketingCmsController (@Public + Throttler)
    participant NewsSvc as NewsletterService
    participant ContactSvc as ContactInquiryService
    participant MailQ as Hàng đợi BullMQ "mail"
    participant DB as PostgreSQL DB

    alt Đăng ký nhận cẩm nang đóng gói quà ở Footer
        Guest->>WebUI: Nhập email "guest@craftshop.vn" tại chân trang -> Bấm [Đăng Ký]
        WebUI->>Ctrl: POST /api/newsletter/subscribe { email, source: "FOOTER" }
        Ctrl->>NewsSvc: subscribe("guest@craftshop.vn", "FOOTER")
        NewsSvc->>DB: UPSERT newsletter_subscribers (không lỗi nếu email đã tồn tại)
        NewsSvc->>MailQ: add("welcome-gift-guide", { email })
        Ctrl-->>WebUI: 201 - Cảm ơn bạn! Ebook hướng dẫn bế hộp quà đang được gửi tới hộp thư của bạn.
        MailQ->>MailQ: MailProcessor gửi email qua IEmailSender (Resend Adapter)
    end

    alt Gửi form liên hệ tại trang Contact Us (/contact)
        Guest->>WebUI: Điền Form: Họ tên, Email, Nội dung: "Cần tư vấn hộp quà Tết số lượng 5.000 hộp"
        WebUI->>Ctrl: POST /api/contact { name, email, subject, message }
        Ctrl->>ContactSvc: submitInquiry(dto)
        ContactSvc->>DB: INSERT INTO contact_inquiries (status: 'NEW')
        ContactSvc->>MailQ: add("notify-admin-inquiry", { inquiryId })
        Ctrl-->>WebUI: 201 - Yêu cầu của bạn đã được tiếp nhận. Đội ngũ WrapFit sẽ phản hồi trong vòng 2 giờ!
    end
```

---

### Luồng 27: Mời Thành Viên Cùng Cộng Tác Chỉnh Sửa Hộp Quà (Team Collaboration Flow)

```mermaid
sequenceDiagram
    autonumber
    actor Owner as Chủ Sở Hữu Thiết Kế (Owner)
    participant StudioUI as Phòng Thu Editor
    participant Ctrl as CollaborationController
    participant CollabSvc as ProjectCollaborationService
    participant MailQ as Hàng đợi BullMQ "mail"
    actor CollabMember as Đồng Nghiệp / Xưởng In (Invitee)
    participant DB as PostgreSQL DB

    Owner->>StudioUI: Bấm [Chia Sẻ / Cộng Tác] -> Nhập email: "designer@studio.com", chọn quyền: "EDITOR"
    StudioUI->>Ctrl: POST /api/projects/:id/members { email, role: "EDITOR" }
    Ctrl->>Ctrl: ProjectAccessGuard - chỉ Owner hoặc thành viên ADMIN mới được mời
    Ctrl->>CollabSvc: inviteMember(projectId, ownerId, "designer@studio.com", "EDITOR")
    CollabSvc->>DB: INSERT INTO project_members (role: 'EDITOR', inviteTokenHash, acceptedAt: null)
    CollabSvc->>MailQ: add("collaboration-invite", { email, inviteLink })
    Ctrl-->>StudioUI: 201 - Đã gửi lời mời cộng tác thành công!

    CollabMember->>Ctrl: Bấm link trong email -> POST /api/invitations/:token/accept (đã đăng nhập)
    Ctrl->>CollabSvc: acceptInvitation(token, inviteeUserId)
    CollabSvc->>DB: UPDATE project_members SET user_id = inviteeUserId, accepted_at = now()
    Ctrl-->>CollabMember: Mở ngay phòng thu 2D/3D Editor với quyền chỉnh sửa trên cùng một bản vẽ!
```

> Sau khi có tính năng cộng tác, `ProjectOwnerGuard` (tài liệu 07) được mở rộng thành `ProjectAccessGuard` với decorator `@ProjectRole('EDITOR')`: VIEWER chỉ được `GET`, EDITOR được sửa `canvasState`, chỉ Owner/ADMIN được đổi quyền riêng tư, xóa dự án hoặc mời thành viên.

---

### Luồng 28: Admin Quản Trị Banner Trang Chủ & Cấu Hình Website (CMS & Web Config Flow)

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Quản Trị Viên (Admin)
    participant AdminUI as Bảng Điều Khiển Admin (/admin/cms)
    participant Ctrl as CmsController
    participant BannerSvc as BannerManagerService
    participant ConfigSvc as WebConfigService
    participant Cache as Cache (cache-manager / Redis)
    participant PublicHome as Trang Chủ Người Dùng (Home Page)
    participant DB as PostgreSQL DB

    Admin->>AdminUI: Vào mục Quản lý Banner -> Tải lên ảnh Banner "Chiến Dịch Quà Tặng Noel 2026"
    AdminUI->>Ctrl: POST /api/admin/cms/banners (RolesGuard: ADMIN, AuditLogInterceptor ghi nhật ký)
    Ctrl->>BannerSvc: createBanner({ title, imageUrl, ctaLink: '/templates?tag=noel', order: 1 })
    BannerSvc->>DB: INSERT INTO hero_banners
    BannerSvc->>Cache: Xóa cache "banners:active"
    Ctrl-->>AdminUI: 201 - Banner mới đã được kích hoạt thành công

    Admin->>AdminUI: Cập nhật Hotline hỗ trợ mới: "1900 8899"
    AdminUI->>Ctrl: PATCH /api/admin/cms/config { hotline: '1900 8899' }
    Ctrl->>ConfigSvc: updateConfig({ hotline: '1900 8899' }, adminId)
    ConfigSvc->>DB: UPDATE web_configurations SET hotline = '1900 8899'
    ConfigSvc->>Cache: Xóa cache "web-config"
    Ctrl-->>AdminUI: 200 - Cấu hình lưu thành công!

    PublicHome->>Ctrl: GET /api/cms/banners (@Public)
    Ctrl->>BannerSvc: listActiveBanners()
    BannerSvc->>Cache: Đọc "banners:active" (cache miss)
    BannerSvc->>DB: SELECT * FROM hero_banners WHERE is_active = true ORDER BY display_order ASC
    BannerSvc->>Cache: Lưu "banners:active" (TTL 10 phút)
    Ctrl-->>PublicHome: Hero Slider trang chủ lập tức hiển thị Banner Noel mới và hotline 1900 8899!
```

---

## 5. BẢNG TRA CỨU CÁC DESIGN PATTERNS ÁP DỤNG

| Nhóm Pattern | Tên Design Pattern | Vị trí áp dụng trong hệ thống | Hiện thực trong NestJS / Codebase | Lợi ích kiến trúc mang lại |
| :--- | :--- | :--- | :--- | :--- |
| **Structural** | **Facade Pattern** | `AdminDashboardFacade`, `AuthServiceFacade` | Service `@Injectable()` gom nhiều service con, Controller chỉ gọi Facade | Cung cấp giao diện đơn giản hóa cho các phân hệ phức tạp bên dưới. |
| **Structural** | **Proxy / Guard Pattern** | `JwtAuthGuard`, `RolesGuard` (thay cho `AdminRoleGuard`), `SubscriptionTierGuard`, `ProjectAccessGuard` | Class implements `CanActivate`, kết hợp decorator `@Roles()`, `@RequireTier()`, `@ProjectRole()` và `Reflector` | Bảo vệ các route API nhạy cảm theo mô hình RBAC. |
| **Structural** | **Decorator / Interceptor** | `AuditLogInterceptor`, `TransformResponseInterceptor`, `LoggingInterceptor` | Class implements `NestInterceptor`, gắn bằng `@UseInterceptors()` hoặc toàn cục | Bổ sung hành vi xuyên suốt (ghi nhật ký admin, chuẩn hóa response) mà không sửa Controller. |
| **Structural** | **Adapter Pattern** | `StripePaymentGateway`, `GhtkShippingAdapter`, `ResendEmailAdapter` | Custom provider `{ provide: PAYMENT_GATEWAY, useClass: StripePaymentGatewayAdapter }` | Chuẩn hóa giao tiếp với các dịch vụ bên thứ ba (Thanh toán, Giao hàng, Email). |
| **Behavioral** | **Strategy Pattern** | `IPaymentGateway` (Stripe, VNPay, MoMo), `IAuthProvider` | Payment: provider `useFactory` chọn adapter theo cấu hình/request. Auth: chính là Passport Strategy (`GoogleStrategy`, `JwtStrategy`, `LocalStrategy`) | Linh hoạt hoán đổi các cổng thanh toán và phương thức đăng nhập lúc runtime. |
| **Behavioral** | **Policy Pattern** | `TrashLifecyclePolicy`, `VolumeDiscountPolicy` | Class TS thuần trong `domain/`, được `TrashPurgeTask` (`@Cron`) và service sử dụng | Đóng gói các quy tắc kinh doanh (Chiết khấu số lượng, Vòng đời thùng rác 30 ngày). |
| **Behavioral** | **Observer / Channel Pattern** | `NotificationDispatcher` & `INotificationChannel` | `@nestjs/event-emitter`: `eventEmitter.emit('order.placed', payload)` → listener `@OnEvent('order.placed')` trong `NotificationsModule` | Phân phối thông báo đồng thời qua nhiều kênh (In-app, Email, WebPush) mà không phụ thuộc lẫn nhau. |
| **Behavioral** | **Producer–Consumer (Queue)** | Xuất file in, render mockup, gửi email | `@nestjs/bullmq`: `@InjectQueue('export')` + `queue.add()` / `@Processor('export')` chạy trong process `worker` | Tác vụ nặng không chặn request HTTP, có retry & theo dõi trạng thái job. |
| **Creational** | **Factory Method & Abstract Factory** | `BoxGeneratorFactory`, `PrepressExporterFactory` | `BoxGeneratorFactory` nằm trong `@wrapfit/shared/parametric`; `PrepressExporterFactory` là provider trong `ExportModule` | Mở rộng kiểu hộp hoặc định dạng xuất file mà không sửa code cũ. |
| **Creational** | **Builder Pattern** | `PdfCmykExporter`, `DxfCncExporter` | Class TS thuần trong `@wrapfit/shared/exporter`, được `ExportProcessor` gọi | Xây dựng tài liệu xuất bản đa lớp phức tạp (Cut, Crease, Spot UV). |
| **Behavioral** | **State Pattern** | `PackagingProjectAggregate` & `ProjectState` | Trong `projects/domain/` (TS thuần); service gọi `project.archive()`, `project.moveToTrash()` thay vì gán `status` trực tiếp | Quản lý chuyển đổi trạng thái dự án an toàn, nhất quán. |
| **Behavioral** | **Command Pattern** | `CommandManager`, `ICommand`, `IFixAction` | Undo/Redo chạy phía `fe/`; phía BE có thể dùng `@nestjs/cqrs` (`CommandBus`) nếu nghiệp vụ phức tạp lên | Cung cấp khả năng Hoàn tác (Undo/Redo) và Tự động sửa lỗi FitCheck. |
| **Structural** | **Composite Pattern** | `CanvasElement` (Text, Logo, Barcode, Pattern) | Kiểu dữ liệu trong `@wrapfit/shared/types`, thao tác ở `fe/`; BE chỉ validate & lưu `canvasState` | Xử lý nhóm và thao tác đồng bộ các đối tượng đồ họa. |
| **Enterprise** | **Aggregate Root (DDD)** | `PackagingProject`, `User`, `Order`, `SupportTicket`, `Collection` | Mỗi Aggregate có đúng 1 Repository Port + 1 `PrismaXxxRepository`; chỉ ghi dữ liệu qua Aggregate Root | Đảm bảo tính toàn vẹn dữ liệu cho từng ranh giới ngữ cảnh (Bounded Context). |
| **Enterprise** | **Dependency Injection / IoC** | Toàn bộ Backend | NestJS IoC Container: `@Module({ providers })`, `@Inject(TOKEN)` | Lắp ghép các tầng lỏng lẻo, dễ mock khi test. |

---

## 6. MA TRẬN TUÂN THỦ NGUYÊN TẮC SOLID

- **S (Single Responsibility Principle)**:
  - `AddressBookService` chỉ quản lý danh sách địa chỉ, không can thiệp vào logic tính tiền hay giao hàng.
  - `OrderRefundService` chỉ quản lý chu trình yêu cầu hoàn tiền, việc chuyển tiền thực tế do `IPaymentGateway` thực hiện.
  - Trong NestJS: Controller chỉ nhận request/trả response, xác thực do Guard, kiểm tra dữ liệu do Pipe, nghiệp vụ do Service.
- **O (Open/Closed Principle)**:
  - Thêm phương thức thanh toán mới hoặc đơn vị giao hàng mới: Chỉ cần cài đặt Adapter mới và đăng ký provider, không cần chỉnh sửa service cũ.
  - Thêm kênh thông báo mới: Chỉ cần viết class kế thừa `INotificationChannel` hoặc thêm một listener `@OnEvent`.
- **L (Liskov Substitution Principle)**:
  - Tất cả các cổng thanh toán (`Stripe`, `VNPay`, `MoMo`) đều có thể thay thế cho nhau một cách trong suốt đối với `SubscriptionBillingManager`.
- **I (Interface Segregation Principle)**:
  - Tách bạch giao diện: `IAddressBookService` hoàn toàn độc lập với `IOrderFulfillmentService`, `INewsletterService` không bị phụ thuộc vào `IAuthService`.
  - Mỗi NestJS Module chỉ `exports` đúng những provider mà module khác cần.
- **D (Dependency Inversion Principle)**:
  - Toàn bộ tầng Domain Core và Application Services chỉ phụ thuộc vào các Abstraction Ports, hạ tầng CSDL PostgreSQL hay S3 Storage chỉ là các chi tiết triển khai ở tầng Infrastructure.
  - Hiện thực bằng NestJS DI: Port = interface + injection token (`Symbol`), Adapter được gắn qua `{ provide: TOKEN, useClass: Impl }` (xem Mục 1.2).

---

## 7. ÁNH XẠ 26 GÓI PHÂN HỆ SANG NESTJS MODULES

Cột **Ưu tiên** khớp với Milestone trong tài liệu 07 (WBS). Cột **Trạng thái** đối chiếu với `develop` ngày 19/11/2026: **Có mã** (thành phần chính của gói đã có), **Một phần** (có module nhưng thiếu phần lớn sơ đồ, hoặc làm khác sơ đồ), **Đề xuất** (chưa có mã). Cột **Mã hiện có** dẫn tới module thật; route ghi không có tiền tố `/api`.

| Gói | Phân hệ | Trạng thái | Mã hiện có | Route chính (`/api/...`) | Ghi chú kỹ thuật | Ưu tiên |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | Vòng đời Dự án & Aggregate Root | Có mã | [`be/src/projects/`](../be/src/projects/) | `/projects`, `/projects/:id/snapshots` | State Pattern trong `domain/`, `ProjectOwnerGuard` | CP3 |
| 2 | Động cơ Toán Hình Học CAD | Có mã | [`shared/src/parametric/`](../shared/src/parametric/) *(thư viện, không phải module)* | — | `projects` gọi để validate kích thước / tái tính dieline khi đổi kích thước | CP2 |
| 3 | Phòng thu Vector 2D | Có mã | [`fe/src/features/studio/`](../fe/src/features/studio/), [`shared/src/canvas/`](../shared/src/canvas/) | — | BE chỉ validate & lưu `canvasState` (JSON) theo schema trong `@wrapfit/shared` | CP3 |
| 4 | WebGL 3D & Gập Động Học | Có mã | [`fe/src/features/studio/components/three/`](../fe/src/features/studio/components/three/), [`shared/src/parametric/fold.ts`](../shared/src/parametric/fold.ts) | — | Không có thành phần Backend | CP3 |
| 5 | FitCheck™ Preflight | Có mã | [`shared/src/fitcheck/`](../shared/src/fitcheck/), [`project-fitcheck.ts`](../be/src/projects/domain/project-fitcheck.ts) | *(chạy nội bộ khi xuất file / đăng Template)* | Chạy lại FitCheck phía server, không tin điểm do client gửi lên; lưu kết quả vào `fitcheckState` | CP3 |
| 6 | Xuất bản Công nghiệp & Render Đám mây | Có mã | [`be/src/export/`](../be/src/export/) | `/projects/:id/exports`, `/exports/:jobId` | `@Processor('export')` (BullMQ) trong process `worker`. Xuất file cần quyền theo phiên bản thiết kế (tài liệu 03) | CP4 |
| 7 | Public Showcase & Unboxing | Có mã | [`be/src/public-showcase/`](../be/src/public-showcase/), [`be/src/unboxing/`](../be/src/unboxing/) | `/public/projects/:slug`, `/projects/:id/unboxing`, `/public/unboxing/:slug` | `@Public()`, `@nestjs/throttler` cho like/fork, sinh QR bằng `qrcode`. iFrame nhúng: đề xuất | CP4 |
| 8 | Xác thực & RBAC | Có mã | [`be/src/auth/`](../be/src/auth/), [`be/src/users/`](../be/src/users/) | `/auth/*`, `/users/me` | Passport Google + JWT cookie; `JwtAuthGuard` (`auth/guards/`, toàn cục), `RolesGuard` (`common/guards/`) | CP2 |
| 9 | Wishlist & Collections | Có mã | [`be/src/collections/`](../be/src/collections/) (+ like trong `public-showcase`) | `/collections`, `/public/projects/:slug/like` | CRUD gọn 3 lớp | CP3 |
| 10 | Lưu trữ, Thùng rác 30 ngày & Quota S3 | Có mã | [`be/src/storage/`](../be/src/storage/), [`trash-purge.task.ts`](../be/src/projects/presentation/trash-purge.task.ts) | `/storage/presigned-upload`, `/storage/usage` | `@Cron` 02:00 hằng ngày, bỏ qua dự án đang nằm trong đơn còn hiệu lực; kiểm tra quota theo `subscriptionTier` trước khi cấp pre-signed URL | CP3 |
| 11 | Quản trị Nền tảng & Audit Log | Một phần | Route admin rải trong [`users`](../be/src/users/users.controller.ts), [`billing`](../be/src/billing/billing.controller.ts), [`analytics`](../be/src/analytics/admin-analytics.controller.ts), [`payments/admin`](../be/src/payments/admin/); giao diện [`fe/src/views/admin/`](../fe/src/views/admin/) | `/users`, `/admin/users/*`, `/admin/analytics/*`, `/admin/bank-transactions` | `@Roles(Role.ADMIN)` từng route. Chưa có module `admin` riêng và chưa có `AuditLogInterceptor` (đề xuất) | Sau MVP |
| 12 | Bảo mật Tài khoản & Mật khẩu | Có mã | [`be/src/auth/`](../be/src/auth/), [`be/src/mail/`](../be/src/mail/) | `/auth/verify-email`, `/auth/password/forgot`, `/auth/password/reset`, `/auth/logout-all` | Token xác minh / đặt lại mật khẩu lưu dạng băm (đặt lại: hết hạn 30 phút), email đi qua hàng đợi `mail` do worker gửi | CP3 |
| 13 | Thanh toán & Thuê bao | Một phần | [`be/src/payments/`](../be/src/payments/), [`be/src/billing/`](../be/src/billing/) | `/payments`, `/payments/vnpay/ipn`, `/payments/vnpay/return`, `/webhooks/sepay`, `/billing/*` | Làm khác sơ đồ: VietQR + webhook SePay cho tài khoản thường, VNPay sandbox cho tài khoản demo, ví xu và gói. Webhook xác minh chữ ký và idempotent. Stripe, MoMo: đề xuất | CP4 |
| 14 | Giỏ hàng, Đặt hàng & Vận chuyển | Một phần | [`be/src/orders/`](../be/src/orders/), [`be/src/print-shops/`](../be/src/print-shops/); giỏ hàng ở `fe/` ([`fe/src/views/cart/`](../fe/src/views/cart/)) | `/orders/sample`, `/orders/sample/bundle`, `/orders/my-orders`, `/orders/:id/status`, `/print-shops` | Đơn in mẫu có mã. Module `cart` phía backend và `shipping` (`IShippingProvider`, GHTK/GHN Adapter): đề xuất | Sau MVP |
| 15 | Thông báo Đa kênh | Một phần | [`be/src/notifications/`](../be/src/notifications/), [`be/src/events/`](../be/src/events/) | `/notifications` | Thông báo trong app: lắng nghe `project.forked`, `export.completed` bằng `@OnEvent`, lưu và đẩy realtime qua `EventsGateway`. Kênh email cho thông báo và WebPush: đề xuất | CP4 (in-app cơ bản) |
| 16 | Hỗ trợ Khách hàng & Ticket | Đề xuất | — (trang tĩnh [`fe/src/views/support/`](../fe/src/views/support/)) | `/support/tickets` | Đính kèm ảnh qua pre-signed upload | Sau MVP |
| 17 | Tìm kiếm, Lọc & Phân trang | Có mã | [`be/src/common/dto/`](../be/src/common/dto/), [`page-cursor.util.ts`](../be/src/common/utils/page-cursor.util.ts) | *(dùng chung)* | Phân trang và lọc có mã. PostgreSQL full-text search / `pg_trgm`: đề xuất | CP3 |
| 18 | Mã giảm giá & Tiếp thị liên kết | Đề xuất | Chỉ có cột `users.referral_code`, `orders.discount_vnd` (luôn 0) | `/coupons/validate`, `/referrals` | Mã ưu đãi đã bỏ khỏi luồng đặt đơn | Sau MVP |
| 19 | 2FA TOTP & Phiên thiết bị | Đề xuất | — (chỉ có `POST /auth/logout-all`) | `/auth/2fa/*`, `/users/me/sessions` | `otplib`; danh sách phiên lấy từ bảng `refresh_tokens` | Sau MVP |
| 20 | Đánh giá, Blog CMS & SEO | Đề xuất | — | `/reviews`, `/blog/posts` | Module [`be/src/reviews/`](../be/src/reviews/) hiện có là **duyệt mẫu theo token**, không phải đánh giá sản phẩm. Blog đã xoá khỏi FE | Sau MVP |
| 21 | Rate Limiting & GDPR | Một phần | [`http-throttler.guard.ts`](../be/src/common/guards/http-throttler.guard.ts), [`user-removal.ts`](../be/src/users/user-removal.ts), [`invoice-retention.ts`](../be/src/users/invoice-retention.ts) | `DELETE /users/:id` (admin) | Rate limit có mã. Xóa tài khoản do admin làm: xóa hẳn, hoặc ẩn danh hóa khi có lịch sử tài chính. Tự xuất dữ liệu (`/users/me/export-data`) và tự xóa tài khoản: đề xuất | CP2 (rate limit) / Sau MVP (GDPR) |
| 22 | Sổ Địa chỉ | Đề xuất | — | `/users/me/addresses` | Ví dụ mẫu 4 tầng tại Mục 1.1 – 1.2 | Sau MVP |
| 23 | Hủy đơn, Hoàn tiền & Mua lại | Đề xuất | — (đổi trạng thái đơn, kể cả hủy, qua `PATCH /orders/:id/status`) | `/orders/:id/cancel`, `/orders/:id/refunds`, `/orders/:id/reorder`, `/admin/refunds/:id` | Gọi `IPaymentGateway.refundTransaction` | Sau MVP |
| 24 | Newsletter & Liên hệ | Đề xuất | — (form liên hệ chỉ ở `fe/`) | `/newsletter/subscribe`, `/contact` | `@Public()` + Throttler chặt (chống spam), email qua hàng đợi `mail` | Sau MVP |
| 25 | Cộng tác Thiết kế & Phân quyền Nhóm | Đề xuất | — | `/projects/:id/members`, `/invitations/:token/accept` | Nâng `ProjectOwnerGuard` thành `ProjectAccessGuard` (VIEWER / EDITOR / ADMIN) | Sau MVP |
| 26 | Banner Slider & Cấu hình Web | Đề xuất | — | `/cms/banners`, `/cms/config`, `/admin/cms/*` | `@nestjs/cache-manager`, xóa cache khi Admin cập nhật | Sau MVP |

Ngoài 26 gói trên, `be/src/` còn các module có mã: [`templates`](../be/src/templates/) (Thư viện mẫu, IT3-07), [`ai`](../be/src/ai/) (hoa văn AI và job ảnh AI), [`library`](../be/src/library/) (thư viện tài sản, ảnh stock), [`analytics`](../be/src/analytics/) (số liệu sản phẩm, báo cáo xu), [`reviews`](../be/src/reviews/) (duyệt mẫu theo token), [`mail`](../be/src/mail/) (hàng đợi email), [`events`](../be/src/events/) (WebSocket), [`base`](../be/src/base/) (`GET /api/health`), cùng hạ tầng `config/`, `common/`, `shared/prisma`, `shared/queue`, `shared/redis`. Module mới cho một gói tạo tại `be/src/<tên-module>/` kèm `index.ts` (tài liệu 07, Mục 1.4).

---

> 🎯 **Kết luận v7.2**: Tài liệu bao quát **26 gói phân hệ** và **28 luồng nghiệp vụ**. Đến 19/11/2026, 12 gói có mã (1–10, 12, 17), 5 gói làm một phần (11, 13, 14, 15, 21) và 9 gói còn là đề xuất (16, 18–20, 22–26) theo bảng Mục 7. Phần đã có mã chạy trên NestJS: mỗi gói ánh xạ thành một hoặc vài module, `projects` theo Clean Architecture với injection token, bảo mật bằng Guards, và tác vụ nặng (xuất file in, gửi email, ảnh AI) chạy bất đồng bộ qua BullMQ. Sơ đồ của các gói đề xuất là hướng thiết kế cho sau MVP, không mô tả hệ thống hiện tại.

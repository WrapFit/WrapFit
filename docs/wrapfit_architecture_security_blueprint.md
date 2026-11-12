# WRAPFIT PLATFORM — BẢN PHÂN TÍCH KIẾN TRÚC & GIẢI PHÁP AN TOÀN DỮ LIỆU
> **Dự án**: WrapFit Platform (Packaging Personalization & Intelligence Platform)  
> **Tài liệu tham khảo**: Mã nguồn `minhduyhodev/NasaFilm` & Báo cáo phản biện 3 lỗ hổng hệ thống.

---

## 1. ĐỐI CHIẾU & HỌC HỎI TỪ MÃ NGUỒN `NasaFilm`

Dự án **NasaFilm** (hệ thống rạp chiếu phim trực tuyến) giải quyết tốt bài toán phân cấp dịch vụ và luồng thanh toán / lưu trữ đa tầng. Khi đối chiếu với đặc thù của **WrapFit**, ta rút ra các bài học kiến trúc quan trọng:

| Hạng mục | Triển khai ở NasaFilm | Khác biệt & Ứng dụng chuẩn cho WrapFit |
| :--- | :--- | :--- |
| **Authentication & Tokens** | JWT Access (15m) + Refresh (7d) trong DB, Google OAuth. | WrapFit đã có `session_version` và `Refresh_tokens` xoay vòng trong DB. Cần giữ cookie `httpOnly + Secure + SameSite=Lax`. |
| **Lưu trữ nhị phân (Storage)** | **Hybrid**: Cloudinary (Poster/Avatar) + AWS S3 (Media/Video VOD có Presigned URL TTL 900s). | **Cực kỳ phù hợp!** Cloudinary chỉ dành cho ảnh public (Avatar, Logo, Texture). S3/Cloudflare R2 dành cho file in (PDF CMYK 300 DPI, DXF cắt bế) và DB Backup vì Cloudinary chặn tải PDF và giới hạn file raw 10MB ở gói Free. |
| **Cổng thanh toán** | **Hybrid 2 cổng**: Stripe (Quốc tế) + VietQR MB Bank (Nội địa). | WrapFit cần mô hình tương tự: **VietQR (qua PayOS / SeAPay)** cho Maker/Artisan Việt Nam đặt in mẫu hộp, và **Stripe** cho khách mua gói trả phí hoặc xuất file vector. |
| **Xử lý bất đồng bộ** | API đồng bộ + Cron job kiểm tra. | WrapFit dùng **Redis + BullMQ** cho worker render file in nặng (`export_jobs`). Cần cấu hình Redis AOF để không mất job. |

---

## 2. DANH MỤC API KEYS & BIẾN MÔI TRƯỜNG (.ENV) CHUẨN PRODUCTION

Để đảm bảo hệ thống vận hành trơn tru và không bị lỗ hổng bảo mật, toàn bộ biến môi trường phải được gom nhóm và kiểm soát chặt chẽ:

```bash
# ==============================================================================
# 1. CORE SERVER & DATABASE (POSTGRESQL & REDIS)
# ==============================================================================
NODE_ENV=production
PORT=3001
APP_FRONTEND_URL=https://wrapfit.vn
DATABASE_URL="postgresql://wrapfit_user:StrongPassword123@postgres-db:5432/wrapfit_prod?schema=public&sslmode=prefer"
REDIS_URL="redis://:RedisPassword123@redis-cache:6379"

# ==============================================================================
# 2. CRYPTOGRAPHY, AUTHENTICATION & SESSION KEYS (TUYỆT ĐỐI KHÔNG LỘ)
# ==============================================================================
# Sinh bằng: openssl rand -base64 64
JWT_ACCESS_SECRET="c2VjcmV0LWtleS1hY2Nlc3Mtd3JhcGZpdC0yMDI2..."
JWT_REFRESH_SECRET="c2VjcmV0LWtleS1yZWZyZXNoLXdyYXBmaXQtMjAyNi..."
JWT_ACCESS_EXPIRATION="15m"
JWT_REFRESH_EXPIRATION="7d"

# Khóa đối xứng 256-bit để mã hóa SĐT, Địa chỉ người nhận trong DB (AES-256-GCM)
# Sinh bằng: openssl rand -hex 32
PII_ENCRYPTION_KEY="a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0"
COOKIE_SECRET="super-secret-cookie-signing-salt"

# Google OAuth
GOOGLE_CLIENT_ID="xxxx-xxxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-xxxx"
GOOGLE_CALLBACK_URL="https://wrapfit.vn/api/auth/google/callback"

# ==============================================================================
# 3. STORAGE HYBRID: CLOUDINARY (PUBLIC) & S3-COMPATIBLE (PRIVATE FILES & BACKUP)
# ==============================================================================
# Cloudinary (Ảnh public, logo, texture, tối ưu f_auto/q_auto)
CLOUDINARY_CLOUD_NAME="wrapfit-cloud"
CLOUDINARY_API_KEY="123456789012345"
CLOUDINARY_API_SECRET="abcdefghijklmnopqrstuvwxyz12"

# Cloudflare R2 / AWS S3 (File in vector riêng tư, link tải 15 phút, DB Backups)
S3_ENDPOINT="https://<account-id>.r2.cloudflarestorage.com"
S3_REGION="auto"
S3_ACCESS_KEY_ID="r2_access_key_wrapfit"
S3_SECRET_ACCESS_KEY="r2_secret_key_wrapfit"
S3_BUCKET_PRIVATE="wrapfit-private-assets"
S3_BUCKET_BACKUPS="wrapfit-encrypted-backups"
S3_PRESIGNED_TTL=900 # 15 phút

# ==============================================================================
# 4. PAYMENT GATEWAYS (VIETQR NỘI ĐỊA & STRIPE QUỐC TẾ)
# ==============================================================================
# VietQR Webhook & Tự động đối soát (Khuyên dùng PayOS - Miễn phí API VietQR chuẩn)
PAYOS_CLIENT_ID="xxxx-xxxx-xxxx"
PAYOS_API_KEY="xxxx-xxxx-xxxx"
PAYOS_CHECKSUM_KEY="xxxx-xxxx-xxxx"

# Stripe (Thẻ quốc tế)
STRIPE_PUBLISHABLE_KEY="pk_live_xxxx"
STRIPE_SECRET_KEY="sk_live_xxxx"
STRIPE_WEBHOOK_SECRET="whsec_xxxx"

# ==============================================================================
# 5. AI ENGINE & PATTERN GENERATION
# ==============================================================================
ANTHROPIC_API_KEY="sk-ant-api03-xxxx"     # Sinh hoa văn bao bì & hỗ trợ CAD
GROQ_API_KEY="gsk_xxxx"                  # Llama 3.1 fallback / xử lý text siêu tốc

# ==============================================================================
# 6. TRANSACTIONAL EMAIL & OBSERVABILITY
# ==============================================================================
# Resend API (hoặc SMTP)
RESEND_API_KEY="re_xxxx"
MAIL_FROM="WrapFit Platform <support@wrapfit.vn>"

# Sentry & Log centralization (Phát hiện lỗi sập server tức thì)
SENTRY_DSN="https://xxxx@o12345.ingest.sentry.io/67890"
LOGTAIL_SOURCE_TOKEN="xxxx"               # Thu thập audit logs & stdout ra cloud
```

---

## 3. LỰA CHỌN 3RD-PARTY SERVICES PHÙ HỢP NHẤT

```mermaid
flowchart TD
    Client["Client (Browser / Mobile)"] -->|Tải ảnh UI, Avatar| Cloudinary["Cloudinary (Public CDN)"]
    Client -->|Yêu cầu xuất PDF/DXF| API["NestJS Backend"]
    API -->|Đẩy tác vụ xuất in| BullMQ["Redis BullMQ"]
    BullMQ -->|Worker render file vector| R2["Cloudflare R2 (Private Bucket)"]
    API -->|Ký Pre-signed URL 15m| Client
    Client -->|Tải file an toàn qua Presigned URL| R2
    Client -->|Thanh toán đơn in mẫu| PayOS["PayOS (VietQR) / Stripe"]
    PayOS -->|Webhook Signature Verified| API
    API -->|Lưu đơn vào Postgres| DB[(PostgreSQL)]
    DB -.->|Cron pg_dump + Mã hoá age| BackupBucket["Cloudflare R2 (Backups)"]
```

1. **Cổng thanh toán (Payment Gateway)**:
   - **Nội địa**: Dùng **PayOS (VietQR)**. Không mất phí duy trì, tạo mã VietQR động theo đơn, tự động gọi Webhook về server khi tiền vào tài khoản. Khách không cần thẻ tín dụng, chỉ cần quét app ngân hàng.
   - **Quốc tế**: Dùng **Stripe Checkout**. Hỗ trợ Apple Pay, Google Pay, thẻ quốc tế khi bán bản quyền thiết kế ra nước ngoài.
   - **An toàn giao dịch**: Bắt buộc xác thực chữ ký Webhook (`whsec` / checksum) và áp dụng cơ chế **Idempotency Key** để nếu cổng thanh toán bắn lại webhook 2 lần thì không bị trừ tiền hay nhân đôi đơn.

2. **Lưu trữ (Storage Strategy)**:
   - **Mô hình Hybrid**:
     - *Cloudinary*: Lưu `AVATAR`, `LOGO`, `IMAGE` (hoa văn canvas). Tận dụng tính năng resize tự động, chuyển đổi định dạng WebP/AVIF giúp canvas tải mượt.
     - *Cloudflare R2*: Lưu `EXPORT` (file PDF CMYK, SVG, DXF) và file `Database Backup`. Cloudflare R2 tương thích S3, **hoàn toàn miễn phí Egress fee (băng thông tải về)** và dung lượng rẻ hơn AWS S3 3 lần.

3. **Email xác thực & Thông báo đơn**:
   - Sử dụng **Resend** (3,000 email/tháng miễn phí) thay vì Gmail SMTP cá nhân (Gmail dễ bị chặn IP khi gửi nhiều hoặc đổi IP máy chủ).

4. **Giám sát & Sentry**:
   - Tích hợp **Sentry**: Mọi lỗi unhandled rejection hoặc crash worker sẽ tự động báo về Telegram/Email kèm Stacktrace và Request Context.

---

## 4. CHIẾN LƯỢC PHÂN LOẠI & LƯU TRỮ DỮ LIỆU (KHÔNG LƯU HẾT VÀO DB)

| Nơi Lưu Trữ | Dạng Dữ Liệu | Cơ Chế Bảo Mật & Tối Ưu |
| :--- | :--- | :--- |
| **PostgreSQL** | Dữ liệu quan hệ cốt lõi: Tài khoản (`users`), Dự án (`packaging_projects`), Đơn in mẫu (`orders`), Danh mục file (`stored_files`), Audit Log (`audit_events`). | - Chỉ lưu key của file, không lưu file nhị phân.<br>- `canvas_state` lưu dạng JSONB (Postgres tự động nén TOAST).<br>- Giới hạn tối đa 50 mốc snapshot thủ công + 20 mốc tự động. |
| **Cloudinary (Public CDN)** | File ảnh giao diện: Avatar, Logo cửa hàng, Texture AI, Thumbnail dự án. | - Đặt quyền `public`.<br>- Tối ưu dung lượng qua `f_auto,q_auto`.<br>- Dọn dẹp tự động khi người dùng xóa file. |
| **Cloudflare R2 (Private S3)** | File nhạy cảm & Bản quyền: File xuất in (PDF CMYK 300 DPI, DXF, SVG cắt), Bản backup database. | - Bucket ở chế độ **Private 100%**.<br>- Người dùng chỉ tải qua **Pre-signed URL** hết hạn sau 15 phút (`TTL=900`).<br>- Chặn mọi truy cập trực tiếp. |
| **Redis** | Hàng đợi tác vụ BullMQ (Xuất in, gửi email, hoàn tất thanh toán), Bộ đếm brute-force login. | - Bật chế độ `appendonly yes` (AOF) và `noeviction` để khi khởi động lại Redis không bị mất hàng đợi đang chờ xử lý. |
| **Trình duyệt (Client)** | Session Token (Cookie `httpOnly`), Cài đặt giao diện (Theme, Layout, Tour guide). | - **Tuyệt đối không lưu Access/Refresh Token trong LocalStorage** (chống lỗ hổng XSS).<br>- Không lưu PII (SĐT, Địa chỉ, Thẻ) trong LocalStorage. |

---

## 5. GIẢI QUYẾT TRIỆT ĐỂ 3 NHÓM RỦI RO LỚN

### 1. RỦI RO MẤT DỮ LIỆU & SẬP SERVER PHẢI ĐỀN BÙ KHÁCH HÀNG

#### A. Khai tử ngay biến RAM `SAMPLE_ORDERS`
- **Nguyên nhân**: `orders.service.ts:37` đang dùng `const SAMPLE_ORDERS = new Map<string, SamplePrintOrder>();`. Khi máy chủ restart hoặc deploy phiên bản mới, toàn bộ đơn hàng trong RAM biến mất. Khách đã thanh toán tiền in mẫu mà mất đơn sẽ dẫn đến khiếu nại và đền bù!
- **Giải pháp xử lý ngay**:
  1. Thêm model `Order` vào `prisma/schema.prisma`:
  ```prisma
  enum OrderStatus {
    PENDING_PAYMENT
    PAID
    IN_PRODUCTION
    SHIPPED
    DELIVERED
    CANCELLED
  }

  model Order {
    id              String      @id @default(uuid(7)) @db.Uuid
    orderCode       String      @unique @map("order_code")
    userId          String      @map("user_id") @db.Uuid
    projectId       String      @map("project_id") @db.Uuid
    printShopId     String      @map("print_shop_id")
    quantity        Int         @default(1)
    recipientName   String      @map("recipient_name")
    phoneEncrypted  String      @map("phone_encrypted")    // AES-256-GCM
    addressEncrypted String     @map("address_encrypted")  // AES-256-GCM
    totalVnd        Int         @map("total_vnd")
    status          OrderStatus @default(PENDING_PAYMENT)
    paymentRef      String?     @map("payment_ref")
    createdAt       DateTime    @default(now()) @map("created_at") @db.Timestamptz(3)
    updatedAt       DateTime    @updatedAt @map("updated_at") @db.Timestamptz(3)

    user    User             @relation(fields: [userId], references: [id], onDelete: Cascade)
    project PackagingProject @relation(fields: [projectId], references: [id], onDelete: Cascade)

    @@index([userId, status])
    @@map("orders")
  }
  ```
  2. Toàn bộ `PARTNERS` trong `print-shops.service.ts` đưa vào bảng `print_shops` trong DB để quản lý động, không hardcode.

#### B. Quy trình Sao lưu Tự động (Backup Strategy 3-2-1)
- **Sao lưu Cơ sở dữ liệu (PostgreSQL)**:
  - Nếu dùng Cloud Managed DB (Neon / Supabase): Bật tính năng **Point-in-Time Restore (PITR)** (cho phép quay ngược trạng thái database về bất kỳ giây nào trong 7 ngày qua).
  - Nếu tự host trên VPS Docker: Thiết lập cronjob hàng đêm lúc 02:00:
    ```bash
    # Dump database -> Nén -> Mã hóa bằng age -> Upload sang Cloudflare R2
    pg_dump -Fc -U postgres wrapfit_prod | age -r age1wrapfitkey... | aws s3 cp - s3://wrapfit-encrypted-backups/db-$(date +%F).dump.age --endpoint-url https://<id>.r2.cloudflarestorage.com
    ```
  - **Diễn tập khôi phục (Drill Restore)**: Mỗi tháng một lần, kích hoạt script restore thử nghiệm file dump vào một database staging để đảm bảo file backup không bị hỏng.

#### C. Sao lưu File Thiết kế của Khách hàng
- Không backup toàn bộ! Chỉ cần backup thư mục `users/<userId>/` chứa `LOGO`, `IMAGE` gốc của khách hàng.
- Các file `EXPORT` (PDF, DXF) và `THUMBNAIL` không cần tốn tiền backup vì worker có thể render lại 100% dựa vào dữ liệu tọa độ `canvas_state` trong DB.

---

### 2. RỦI RO LỖI HỆ THỐNG, CRASH CODE & TRANH CHẤP THANH TOÁN

1. **Cơ chế Tự hàn gắn Đơn hàng dở dang (Order Reconcile Task)**:
   - Nếu khách chuyển tiền thành công nhưng webhook từ ngân hàng bị nghẽn mạng:
   - Xây dựng NestJS Cron Task chạy 5 phút/lần (`OrderReconcileTask`): Tự động tìm các đơn hàng ở trạng thái `PENDING_PAYMENT` trên 10 phút và gọi API sang PayOS/Stripe để đối soát trạng thái giao dịch. Nếu cổng báo đã nhận tiền, tự động cập nhật đơn sang `PAID` và gửi email thông báo cho khách.
2. **Ngăn chặn Double-Spending (Thanh toán trùng)**:
   - Dùng Transaction trong Prisma khi cập nhật trạng thái đơn hàng:
   ```typescript
   await this.prisma.$transaction(async (tx) => {
     const order = await tx.order.findUnique({ where: { orderCode } });
     if (order.status === OrderStatus.PAID) return; // Đã xử lý rồi, bỏ qua
     await tx.order.update({
       where: { orderCode },
       data: { status: OrderStatus.PAID, paymentRef: transactionId },
     });
   });
   ```

---

### 3. RỦI RO BẢO MẬT & XÂY DỰNG NIỀM TIN CHO NGƯỜI DÙNG (COMPLIANCE)

Khách hàng thiết kế bao bì là các xưởng sản xuất, chủ shop handmade, thương hiệu mỹ phẩm/trang sức. Họ rất sợ:
- Mẫu thiết kế độc quyền bị lộ ra ngoài trước ngày ra mắt.
- Đội ngũ Admin hoặc lập trình viên lén xem và sao chép tác phẩm.
- Lộ số điện thoại và địa chỉ khách nhận quà.

#### Giải pháp Triệt để:

1. **Bảo mật File Thiết kế (Private Assets)**:
   - Mọi dự án có `visibility: PRIVATE` thì file xuất in PDF và ảnh tải lên canvas đều phải lưu ở đường dẫn riêng và chỉ cấp quyền xem qua **Pre-signed URL 15 phút**.
   - Kiểm tra chặt quyền sở hữu: Endpoint tạo Pre-signed URL kiểm tra `project.userId === currentUser.id`. Người lạ có biết URL cũng không xem được sau 15 phút.

2. **Mã hóa Dữ liệu Nhạy cảm (PII Encryption)**:
   - Số điện thoại và địa chỉ nhận hàng của khách được mã hóa ở tầng ứng dụng bằng thuật toán **AES-256-GCM** với khóa bí mật `PII_ENCRYPTION_KEY` lưu trong `.env`.
   - Ngay cả khi hacker dump được database Postgres, toàn bộ cột `phone_encrypted` và `address_encrypted` chỉ là chuỗi hex vô nghĩa.
   - Chính sách xóa PII: Tự động xóa (hoặc ẩn) số điện thoại/địa chỉ sau 30 ngày kể từ khi đơn in mẫu giao thành công.

3. **Hệ thống Nhật ký Kiểm toán (Admin Audit Trail)**:
   - Tạo bảng `audit_events` ghi lại toàn bộ hành động nhạy cảm:
     - `ADMIN_VIEW_USER_PROJECT` (Mỗi khi admin mở xem dự án của một user khác -> Bắt buộc ghi log lý do và thời gian).
     - `USER_EXPORT_VECTOR` (Xuất file in).
     - `ORDER_REFUND` (Hoàn tiền đơn hàng).
   - Minh bạch hóa với người dùng: Cam kết trong Điều khoản dịch vụ rằng nhân viên chỉ mở dự án khi có yêu cầu hỗ trợ kỹ thuật từ khách hàng và mọi lượt truy cập đều được ghi log bất biến.

4. **Trang Minh Bạch "Dữ liệu của tôi" (Tuân thủ Nghị định 13/2023/NĐ-CP & Luật BV Dữ liệu cá nhân 2025)**:
   - Cung cấp cho người dùng 3 quyền hạn trực quan trong Dashboard:
     1. **Xuất toàn bộ dữ liệu (Export My Data)**: Tải về file ZIP chứa toàn bộ thông tin tài khoản, danh sách dự án (JSON) và toàn bộ file ảnh gốc đã tải lên.
     2. **Quản lý phiên đăng nhập**: Xem IP, thiết bị, trình duyệt đang đăng nhập (dữ liệu từ `refresh_tokens`) và nút "Đăng xuất khỏi tất cả thiết bị".
     3. **Quyền được lãng quên (Xóa tài khoản)**: Áp dụng cơ chế **Soft-Delete 7 ngày** (tránh trường hợp bị hack xóa nhầm), sau 7 ngày hệ thống cron tự động xóa sạch dữ liệu cá nhân, file trên bucket và các token.

# 21. Cổng thanh toán thật: SePay, VNPay sandbox và trang Ví xu

> Ngày lập: 2026-11-10 · Nhánh gốc: `develop` (678fc81) · Nhánh làm: `feat/payment-gateways` · Trạng thái: **S1–S7 xong, chưa commit** (2026-11-11; nhật ký §9, việc còn lại của chủ dự án §10)
> Mọi đường dẫn API có tiền tố `/api` (global prefix); các đường dẫn trong file đã sửa theo mã thực tế.
> Nguồn tham khảo: dự án NasaFilm (`NasaFilm/`, Java Spring Boot + React). Không chép file, chỉ port logic sang NestJS và giao diện sang design system WrapFit.

## 1. Bối cảnh

WrapFit đã có thanh toán VietQR (docs/17 S5): `POST /payments` tạo thanh toán `PENDING` có mã `WF` + 6 ký tự, hạn 15 phút, QR EMVCo sinh tại chỗ (`be/src/payments/vietqr.ts`). Thanh toán chỉ chuyển `PAID` qua nút "Giả lập đã thanh toán" (`PAYMENT_SIMULATION`). Webhook ngân hàng bị hoãn ở docs/17 M1.

NasaFilm có bốn phần đáng lấy:

| Phần NasaFilm | File gốc | Lấy gì |
|---|---|---|
| Webhook SePay | `payment/controller/VietQRWebhookController.java`, `service/VietQRService.java`, `entity/VietQRWebhookTransaction.java` | Nhận tiền vào tài khoản, chống trùng theo mã giao dịch, tách mã chuyển khoản từ nội dung, kiểm token hằng thời gian |
| Khớp giao dịch | `repository/VietQRWebhookTransactionRepository.java` (`findMatchingUnusedTransaction`, `markUsed`) | Khớp mã + số tiền, đánh dấu đã dùng nguyên tử |
| Trang ví | `movie-theater-fe/src/features/home/pages/WalletPage.jsx` | Bố cục: thẻ phương thức nạp, khối số dư, bảng lịch sử có tab lọc + lọc ngày |
| Checkout QR | `features/payment/VietQRPage.jsx`, `WalletVietQRModal.jsx`, `PaymentSuccess.jsx` | Bố cục: QR, thông tin chuyển khoản có nút chép, đồng hồ, tự nhận tiền, màn thành công |

Không lấy: Stripe, ví tiền VND (WrapFit đã có Xu Wrap), QR qua `img.vietqr.io` (WrapFit sinh QR tại chỗ, tốt hơn).

Khác biệt cần sửa khi port: NasaFilm lưu webhook rồi chờ FE hỏi mới khớp ("UNUSED" → "USED"). WrapFit sẽ khớp **ngay trong webhook**, vì thanh toán đã có sẵn ở `payments` với mã và số tiền. FE vẫn hỏi `GET /payments/:id` mỗi 3 giây như hiện nay.

## 2. Quyết định (sau 2 vòng hỏi đáp, 2026-11-10)

| # | Quyết định |
|---|---|
| D1 | Port 3 mảng: webhook SePay, trang Ví xu, giao diện checkout. Không làm Stripe. |
| D2 | Tài khoản thật trả tiền thật qua **SePay** (VietQR chuyển khoản, webhook xác nhận). Tài khoản demo trả qua **VNPay sandbox** (chuyển hướng sang cổng VNPay, IPN xác nhận). |
| D3 | Phân biệt bằng cờ mới `users.is_demo`. `seed-demo.ts` bật cờ cho tài khoản demo CP4. Admin có thể bật/tắt cờ. |
| D4 | Tiền về không khớp (thiếu, thừa, quá hạn, không có mã, thanh toán đã trả) được lưu `UNMATCHED`. Admin đối soát tay trên trang mới. Chỉ khớp tự động khi đủ đúng số tiền và còn hạn. |
| D5 | Giữ nguyên nút "Giả lập đã thanh toán" và `PAYMENT_SIMULATION` (dự phòng khi sandbox lỗi lúc demo). |
| D6 | Giao diện: bố cục NasaFilm, style WrapFit (`@/components/ui`, token cam FPT, docs/15). Trang mới `/dashboard/wallet`. |
| D7 | Chưa có thông tin VNPay sandbox: code theo tài liệu VNPay 2.1.0, kiểm bằng secret giả. Chủ dự án tự đăng ký và tự điền `.env`. |

## 3. Thiết kế backend

### 3.1 Schema (một migration `2026111000xx_payment_gateways`)

- `users.is_demo boolean NOT NULL DEFAULT false`.
- `enum PaymentProvider { VIETQR VNPAY }`; `payments.provider PaymentProvider NOT NULL DEFAULT 'VIETQR'`. Chọn lúc tạo: `user.isDemo ? VNPAY : VIETQR`.
- `enum PaymentConfirmation { SEPAY_WEBHOOK VNPAY_IPN VNPAY_RETURN SIMULATION ADMIN }`; `payments.confirmed_via PaymentConfirmation NULL`; `payments.provider_txn_id text NULL` (id giao dịch SePay hoặc `vnp_TransactionNo`).
- Bảng `bank_transactions` (nhật ký mọi tiền vào từ SePay):
  `id uuid`, `external_id text UNIQUE` (trường `id` của SePay, khóa chống trùng), `gateway text`, `account_no text`, `amount_vnd int`, `content text`, `bank_reference text` (`referenceCode`), `extracted_reference text NULL`, `transaction_at timestamptz`, `status enum BankTxStatus { MATCHED UNMATCHED RESOLVED IGNORED }`, `unmatched_reason enum { NO_REFERENCE NOT_FOUND AMOUNT_MISMATCH EXPIRED ALREADY_PAID } NULL`, `payment_id uuid NULL FK payments`, `resolved_by uuid NULL FK users`, `resolved_note text NULL`, `raw jsonb`, `created_at`. Index `(status, created_at)`.

### 3.2 Gom đường xác nhận

Tách phần thân của `simulateConfirm` thành một hàm dùng chung:

```ts
confirmPaid(tx, paymentId, { via: PaymentConfirmation; providerTxnId?: string; allowExpired?: boolean }): Promise<Payment>
```

Hàm khóa dòng `payments FOR UPDATE`, trả về luôn nếu đã `PAID`, ném `PAYMENT_EXPIRED` nếu quá hạn (trừ `allowExpired` cho admin), rồi `fulfil` + `PlanService.sync`. Giả lập, SePay, VNPay và admin đều gọi hàm này. Nhờ khóa dòng, webhook và nút giả lập đến cùng lúc vẫn chỉ cấp một lần.

### 3.3 Webhook SePay — `POST /api/webhooks/sepay` (S2)

- `@Public()`, không cookie. Xác thực header `Authorization: Apikey <SEPAY_WEBHOOK_API_KEY>` bằng `crypto.timingSafeEqual` (port `tokenMatches` của NasaFilm, chấp nhận cả `Bearer`). Thiếu key trong env thì từ chối mọi webhook và log lỗi lúc khởi động (như `warnIfWebhookTokenMissing`).
- Bỏ qua `transferType !== 'in'`.
- Chống trùng: `INSERT ... ON CONFLICT (external_id) DO NOTHING`; trùng thì trả 200 luôn.
- Tách mã: regex `/WF[A-HJ-NP-Z2-9]{6}/i` trên `content` (ngân hàng có thể chèn tiền tố, xóa dấu cách). Dùng thêm trường `code` của SePay nếu cấu hình nhận diện mã trên SePay.
- Khớp trong một transaction: tìm `payments` theo `reference`, provider `VIETQR`. Có, `PENDING`, còn hạn, `amount_vnd` bằng đúng: gọi `confirmPaid(via: SEPAY_WEBHOOK)`, ghi `MATCHED`. Còn lại ghi `UNMATCHED` với lý do tương ứng.
- Luôn trả `200 {"success": true}` khi đã lưu (SePay gửi lại nếu không nhận 2xx). Chỉ trả 401 khi sai key.
- Kiểm `OriginGuard`: request server-to-server không có `Origin` lẫn `Sec-Fetch-Site`. Nếu guard chặn, thêm ngoại lệ cho đúng route này.
- Throttle riêng (ví dụ 120/phút), giới hạn body 64 KB.

Cần xác nhận lúc làm: tên trường payload SePay hiện tại (`accountNumber` hay `accountNo`; NasaFilm dùng `accountNo`). Đọc tài liệu SePay trước khi viết DTO.

### 3.4 VNPay sandbox (S3)

Module con `be/src/payments/vnpay/`:

- `vnpay.ts` (hàm thuần, có unit test): dựng URL thanh toán phiên bản 2.1.0. Tham số `vnp_Version=2.1.0`, `vnp_Command=pay`, `vnp_TmnCode`, `vnp_Amount = amountVnd * 100`, `vnp_CurrCode=VND`, `vnp_TxnRef = reference`, `vnp_OrderInfo`, `vnp_OrderType=other`, `vnp_Locale=vn`, `vnp_ReturnUrl`, `vnp_IpAddr`, `vnp_CreateDate` và `vnp_ExpireDate` (giờ GMT+7, `yyyyMMddHHmmss`, hết hạn trùng `expiresAt`). Sắp khóa theo bảng chữ cái, mã hóa URL (dấu cách thành `+`), ký HMAC-SHA512 bằng `VNPAY_HASH_SECRET` vào `vnp_SecureHash`. Hàm `verify(query)` bỏ `vnp_SecureHash`/`vnp_SecureHashType`, ký lại, so hằng thời gian.
- `POST /api/payments` với user demo trả `vnpay: { payUrl }` thay vì `vietqr` (`vietqr: null`).
- `GET /api/payments/vnpay/ipn` (`@Public`, VNPay gọi bằng GET): sai chữ ký → `97`; không có thanh toán → `01`; sai số tiền → `04`; đã `PAID` → `02`; `vnp_ResponseCode == '00'` và `vnp_TransactionStatus == '00'` → `confirmPaid(via: VNPAY_IPN, providerTxnId: vnp_TransactionNo)` rồi `00`. Lỗi khác → `99`. Đây là ngoại lệ có chủ đích của quy ước "GET không đổi trạng thái"; ghi rõ trong comment.
- `GET /api/payments/vnpay/return` (có cookie, FE gọi từ trang trả về): kiểm chữ ký, trả trạng thái thanh toán. Vì IPN không tới được máy local, khi chữ ký đúng và mã `00` thì route này cũng gọi `confirmPaid(via: VNPAY_RETURN)`. `confirmPaid` không cấp hai lần, nên IPN đến sau chỉ nhận `02`.
- Env: `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_PAY_URL` (mặc định `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html`), `VNPAY_RETURN_URL` (mặc định `${FRONTEND_URL}/payments/vnpay-return`). Thiếu biến: user demo tạo thanh toán bị 503 `VNPAY_NOT_CONFIGURED` kèm hướng dẫn, trừ khi `PAYMENT_SIMULATION=true` (E1, §9.2). Nút giả lập vẫn dùng được (D5).

### 3.5 Đối soát cho admin (S4)

- `GET /api/admin/bank-transactions?status=UNMATCHED&before=` (phân trang theo con trỏ như `xu/history`).
- `POST /api/admin/bank-transactions/:id/resolve` với hai hành động:
  - `assign { paymentReference, note? }` (nhập mã `WF…`, không phải `paymentId`, E8): chỉ khi số tiền về ≥ số tiền thanh toán. Gọi `confirmPaid(via: ADMIN, allowExpired: true)` rồi ghi `RESOLVED`, người xử lý, ghi chú.
  - `ignore { note }`: đã hoàn tiền tay hoặc tiền không liên quan. Ghi `IGNORED`.
- `PATCH /api/users/:id { isDemo }` (route sẵn có, `AdminUpdateUserDto` thêm `isDemo`) để bật/tắt cờ demo.

## 4. Thiết kế frontend

### 4.1 Checkout (S5) — `fe/src/features/payments/CheckoutDialog.tsx`

- `provider === 'VIETQR'`: giữ bố cục hiện tại và bổ sung theo NasaFilm VietQRPage. Thêm 3 bước hướng dẫn (mở app ngân hàng, quét QR, giữ nguyên nội dung `WF…`). Thêm trạng thái "Đang chờ ngân hàng báo về…" (Gói `delivery`). Thêm màn thành công riêng (Gói `celebration`) theo `PaymentSuccess.jsx`.
- `provider === 'VNPAY'`: thẻ "Thanh toán qua VNPay (sandbox)", nút "Mở cổng VNPay" (`window.location.assign(payUrl)`), ghi chú thẻ test sandbox. Lưu `paymentId` và đường quay lại vào `sessionStorage` trước khi rời trang.
- Trang mới `fe/src/app/payments/vnpay-return/page.tsx`: đọc query, gọi `GET /api/payments/vnpay/return`, hiện thành công hoặc thất bại, nút quay lại trang trước (Studio, giỏ in, ví).
- Nút "Giả lập đã thanh toán" giữ nguyên điều kiện hiện có (D5).

### 4.2 Trang Ví xu (S6) — `/dashboard/wallet`

Bố cục theo NasaFilm `WalletPage.jsx`, dựng bằng `@/components/ui`:

- Cột chính: "Nạp xu". Có thẻ phương thức (VietQR chuyển khoản, hoặc VNPay sandbox với tài khoản demo; chỉ hiện phương thức áp dụng cho user). Các gói `XU_500 / XU_1050 / XU_2200` dạng chip chọn nhanh. Nút nạp mở `CheckoutDialog`. WrapFit giữ gói cố định, không cho nhập số tiền tự do như NasaFilm.
- Cột phụ: số dư xu, số xu sắp hết hạn, gói đang dùng (Free/Pro, ngày hết Pro, lượt xuất còn lại), nút làm mới.
- Dưới: "Lịch sử giao dịch". Tab lọc Tất cả / Nạp / Chi tiêu / Điều chỉnh, lọc theo ngày, `DataTable`, phân trang con trỏ. Backend: thêm `type` và `from`/`to` vào `XuHistoryQueryDto`.
- Chuyển nội dung `XuWalletPanel` sang trang này. `/dashboard/billing` giữ gói cước + hóa đơn, thêm liên kết "Mở ví xu". `XuBalancePill` trỏ tới `/dashboard/wallet`. Thêm mục ví vào menu dashboard.
- Bảng hóa đơn ở billing đổi cột "Cách trả" từ chữ cố định "VietQR" sang `payment.provider`.

### 4.3 Trang admin đối soát (S4)

`fe/src/views/admin/bank-transactions/`: bảng giao dịch `UNMATCHED` (thời gian, số tiền, nội dung, mã tách được, lý do). Hai hành động: gán cho thanh toán (ô nhập mã `WF…`, xem trước thanh toán), hoặc bỏ qua kèm ghi chú.

## 5. Các bước (mỗi bước một commit, chạy tuần tự vì S2–S4 cùng sửa `payments.service.ts`)

| Bước | Nội dung | Xong khi |
|---|---|---|
| S1 | Migration §3.1, `confirmPaid` §3.2, `seed-demo` bật `is_demo`, `PaymentView` thêm `provider`/`confirmedVia` | Unit cũ xanh, e2e `payments` xanh, giả lập vẫn chạy |
| S2 | Webhook SePay §3.3, env `SEPAY_WEBHOOK_API_KEY` vào `env.validation.ts` + `envs/default.ts` | Unit: tách mã, so key, ma trận 5 lý do UNMATCHED. E2e: webhook đúng → `PAID` + cấp xu; gửi lại → không cấp thêm; sai key → 401; webhook và giả lập song song → cấp 1 lần |
| S3 | VNPay §3.4 | Unit: ký/kiểm với vector cố định, `amount * 100`, giờ GMT+7. E2e: user demo nhận `payUrl`; IPN ký bằng secret test → `PAID`; IPN lặp → `02`; sai chữ ký → `97` |
| S4 | Đối soát admin §3.5 + §4.3 | E2e: tiền thiếu → `UNMATCHED`; admin gán thanh toán quá hạn → `PAID`, `RESOLVED` |
| S5 | Checkout §4.1 + trang `vnpay-return` | `tsc` sạch; `page-shots` 375/1440 cho cả hai nhánh checkout |
| S6 | Trang Ví §4.2 | `tsc`, `tokens:check`, `page-shots` `/dashboard/wallet` 375/1440 |
| S7 | Cập nhật docs/03 (API), docs/18 (env + cấu hình webhook SePay, IPN VNPay), docs/04, compose truyền biến mới | Toàn bộ unit + e2e xanh; chủ dự án thử VNPay sandbox thật và một lần chuyển khoản SePay thật nhỏ (còn lại cho chủ dự án, §10) |

S6 chỉ chạm FE ví và `XuHistoryQueryDto`, nên có thể chạy song song với S2–S4 ở phiên riêng nếu muốn.

## 6. Bảo mật

- Không commit secret. `SEPAY_WEBHOOK_API_KEY`, `VNPAY_HASH_SECRET` chỉ nằm trong `.env` / VPS.
- So token và chữ ký bằng `timingSafeEqual`. Không log header `Authorization` hay `vnp_SecureHash`.
- Số tiền luôn lấy từ `payments.amount_vnd` phía server, không tin số tiền từ FE hay từ `vnp_Amount` khi chưa so.
- Tài khoản demo không bao giờ đi đường SePay tiền thật. Tài khoản thật không bao giờ được VNPay sandbox cấp quyền lợi: IPN chỉ khớp thanh toán có `provider = VNPAY`.

## 7. Việc chủ dự án tự làm (từng bước: docs/18 §3.4–3.5)

1. Đăng ký VNPay sandbox (sandbox.vnpayment.vn), lấy `vnp_TmnCode` và `vnp_HashSecret`, khai IPN URL `https://<api>/api/payments/vnpay/ipn`.
2. Tạo tài khoản SePay, liên kết tài khoản ngân hàng nhận tiền, đặt `VIETQR_BANK_BIN/ACCOUNT_NO/ACCOUNT_NAME` trùng tài khoản đó. Tạo webhook `https://<api>/api/webhooks/sepay`, kiểu xác thực API Key, chép key vào `SEPAY_WEBHOOK_API_KEY`.
3. Điền các biến trên vào `.env` local và VPS (không dán vào chat).

## 8. Câu hỏi còn mở (đang dùng mặc định)

| # | Câu hỏi | Mặc định |
|---|---|---|
| Q1 | NasaFilm là dự án của bạn hoặc nhóm, được phép tái sử dụng? | Có. Chỉ port logic, không chép nguyên văn |
| Q2 | Ví có cho nạp số tiền tự do như NasaFilm? | Không, giữ 3 gói xu cố định (docs/19) |
| Q3 | Có làm hủy thanh toán (`CANCELLED`) khi khách đóng checkout? | Không trong đợt này |
| Q4 | Có cron chuyển `PENDING` quá hạn sang `EXPIRED`? | Không. Webhook kiểm `expiresAt` trực tiếp, đủ dùng |

## 9. Nhật ký bàn giao

Nhánh `feat/payment-gateways`, tách từ `develop` (678fc81). Mỗi bước chạy một phiên riêng trên cùng thư mục làm việc, **chưa commit** (chủ dự án commit sau S7). Cột "Chưa kiểm" là điều test tự động không chứng minh được.

### 9.1. Từng bước

| Bước | Ngày | Đã xong | Test | Chưa kiểm |
|---|---|---|---|---|
| S1 | 2026-11-10 | Migration `20261110000100_payment_gateways` (`users.is_demo`, enum `PaymentProvider` / `PaymentConfirmation` / `BankTxStatus` / `BankTxUnmatchedReason`, `payments.provider` / `confirmed_via` / `provider_txn_id`, bảng `bank_transactions` với CHECK `amount_vnd > 0`); `PaymentsService.confirmPaid(tx, id, { via, providerTxnId?, allowExpired? })` dùng chung, `simulateConfirm` gọi qua nó; `create()` chọn `provider` theo `isDemo`; `PaymentView` thêm `provider`, `confirmedVia`; `seed-demo.ts` bật `is_demo` (kể cả tài khoản có sẵn) | Unit `payments.service.spec` và e2e `payments` xanh, giả lập vẫn chạy | Cờ `is_demo` trên dữ liệu production có sẵn (mặc định `false`, chỉ seed demo bật) |
| S2 | 2026-11-10 | `be/src/payments/sepay/`: `POST /api/webhooks/sepay` (khóa `Authorization: Apikey`, `timingSafeEqual`, 120/phút, body > 64 KB → `413`); parse payload SePay (`accountNumber`, `referenceCode`, `transferType`…), tách mã `WF…`, chèn `bank_transactions` chống trùng theo `id`, khớp trong transaction có khóa dòng thanh toán, 5 lý do `UNMATCHED`; env `SEPAY_WEBHOOK_API_KEY`; `OriginGuard` không phải sửa (không `Origin` thì qua) | Unit 26 (`sepay-webhook.spec` 16, `sepay-webhook.service.spec` 10: tách mã, so key, ma trận lý do); e2e `sepay-webhook` 16: webhook đúng → `PAID` + cấp xu, gửi lại không cấp thêm, sai key `401`, webhook và nút giả lập song song cấp một lần | Cuộc gọi từ SePay thật (payload dựng theo tài liệu SePay, đối chiếu 2026-11-10) |
| S3 | 2026-11-10 | `be/src/payments/vnpay/`: `vnpay.ts` (dựng URL 2.1.0, HMAC-SHA512, `verifyQuery`, giờ GMT+7), `VnpayGateway`, `GET /api/payments/vnpay/ipn` (luôn HTTP 200, `RspCode` `00` / `01` / `02` / `04` / `97` / `99`), `GET /api/payments/vnpay/return`; `POST /payments` trả `vnpay.payUrl` cho tài khoản demo; env `VNPAY_*` | Unit 14 (`vnpay.spec`: ký / kiểm vector cố định, `amount × 100`, GMT+7); e2e `vnpay` 14: `payUrl`, IPN ký bằng secret test → `PAID`, IPN lặp `02`, sai chữ ký `97`, sai số tiền `04`, `return` | Cổng VNPay sandbox thật (chưa có `TMN_CODE` / `HASH_SECRET`): VNPay có chấp nhận URL đã ký không, IPN từ máy chủ VNPay có tới được VPS không |
| S4 | 2026-11-10 | `be/src/payments/admin/`: `GET /api/admin/bank-transactions`, `GET …/payment-preview/:reference`, `POST …/:id/resolve` (`assign` / `ignore`); trang `/admin/bank-transactions` (bảng, hai hộp thoại, mục menu admin); `DemoFlagToggle` trong chi tiết tài khoản; `userSelect` có `isDemo` | Unit 7 (`bank-transactions.service.spec`); e2e `admin-bank-transactions` 12: tiền thiếu → `UNMATCHED`, admin gán thanh toán quá hạn → `PAID` + `RESOLVED`, `AMOUNT_TOO_LOW`, `ignore` | Thao tác thật của admin trên tiền về từ ngân hàng |
| S5 | 2026-11-10 | `CheckoutDialog` rẽ theo `payment.provider` (VietQR: 3 bước hướng dẫn, "đang chờ ngân hàng", màn thành công; VNPay: thẻ + "Mở cổng VNPay"); `vnpaySession.ts` (sessionStorage, `safeReturnTo`); trang `/payments/vnpay-return`; `GET /billing/me` thêm `isDemo`; `ApiErrorCode` thêm `VNPAY_NOT_CONFIGURED`; hóa đơn billing "Cách trả" theo tài khoản; `page-shots` thêm vai `demo` và nhóm G8 | `tsc` sạch; `billing.service.spec` 1; page-shots 375 / 1440 cho hai nhánh checkout và 3 trạng thái trang trả về (query ký HMAC trong file routes tạm) | Chuyển hướng thật sang cổng VNPay sandbox; quét QR bằng app ngân hàng trên điện thoại thật |
| S6 | 2026-11-10 | `/dashboard/wallet` (`views/dashboard/wallet/`: nạp xu, số dư, các đợt xu, lịch sử có tab Tất cả / Nạp / Chi tiêu / Điều chỉnh + lọc ngày, phân trang con trỏ); `XuHistoryQueryDto` thêm `type`, `from`, `to`; `XuWalletPanel` gỡ khỏi billing (billing có liên kết "Mở ví xu"); `XuBalancePill` và menu workspace trỏ tới ví | Unit `xu-wallet.service.spec` (lọc `type` / `from` / `to`); `tsc`, `tokens:check`, page-shots `/dashboard/wallet` 375 / 1440 | Gọi API lọc với stack chạy mã mới: làm ở S7 (9.3) |
| S7 | 2026-11-11 | Kiểm toàn bộ (9.3); docs/03, 04, 18, 21; `docker-compose.yml` và `.env.example` truyền `SEPAY_WEBHOOK_API_KEY`, `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_PAY_URL`, `VNPAY_RETURN_URL` như `PAYMENT_SIMULATION` | Xem 9.3 | Các việc chạm dịch vụ ngoài (§10) |

### 9.2. Quyết định thêm trong lúc làm

| # | Quyết định | Phiên |
|---|---|---|
| E1 | VNPay chưa cấu hình mà `PAYMENT_SIMULATION=true`: tài khoản demo vẫn tạo được thanh toán, `vnpay: null` (chỉ còn nút giả lập). Chỉ khi `PAYMENT_SIMULATION=false` mới `503 VNPAY_NOT_CONFIGURED`. Lệch so với §3.4 gốc, để demo không chết khi chưa có credential sandbox | S3 |
| E2 | Bộ lọc lỗi toàn cục giữ trường `code` của thân lỗi cho `503` (trước đây bỏ với mọi 5xx, nên `AI_IMAGE_UNAVAILABLE` cũng chưa bao giờ tới FE) | S3 |
| E3 | `GET /api/billing/me` có `isDemo`; FE chọn phương thức nạp theo đó. Payload người dùng (`/auth/me`, `/users/*`) cũng có `isDemo` qua `userSelect` | S4, S5 |
| E4 | Hóa đơn ở billing: đơn hàng không mang `provider`, nên cột "Cách trả" theo tài khoản (`isDemo` → "VNPay (sandbox)", còn lại "VietQR") | S5 |
| E5 | Tiền ra (`transferType` khác `in`) hoặc số tiền ≤ 0: trả `200`, không lưu. Trạng thái `IGNORED` chỉ do admin đặt | S2 |
| E6 | Body webhook SePay kiểu `unknown`, không qua DTO, vì `ValidationPipe` toàn cục có `forbidNonWhitelisted` mà SePay có thể thêm trường; thân hỏng nhưng đúng key → `400` | S2 |
| E7 | `confirmPaid` không tự kiểm `provider`: SePay lọc `VIETQR`, IPN lọc `VNPAY` trước khi gọi. Với `allowExpired`, cả `PENDING` quá hạn lẫn `EXPIRED` được nhận, `CANCELLED` thì không | S1–S3 |
| E8 | Gán tay (`assign`) nhận mã `WF…` thay vì `paymentId`, thêm route xem trước `payment-preview/:reference`; dòng `RESOLVED` / `IGNORED` giữ nguyên `unmatched_reason`; cờ demo đổi qua `PATCH /api/users/:id` có sẵn, không tạo route admin mới | S4 |
| E9 | `return` đúng chữ ký nhưng thanh toán đã quá hạn bên WrapFit: không cấp gì, FE báo thất bại, log cảnh báo để admin xử lý | S3 |

### 9.3. Kiểm toàn bộ (S7, 2026-11-11, DB `wrapfit_pg_s7`, Redis db 9)

- Unit `be`: **774 test, 55 suite xanh**. E2E `be`: **241 test, 20 suite xanh** (`--runInBand` cả 20 suite, không chỉ payments). `tsc --noEmit` sạch cho `be` và `fe`. `npm --workspace=be run lint` sạch. `tokens:check` đạt (0 vi phạm). `npm --workspace=fe run build` qua, có `/dashboard/wallet`, `/payments/vnpay-return`, `/admin/bank-transactions`.
- Không phát hiện lỗi hồi quy từ S1–S6; S7 không sửa mã nào ngoài docs và cấu hình triển khai.
- Chạy sống backend (bản build `dist/`, `PAYMENT_SIMULATION=true`, tài khoản demo từ seed): `GET /api/billing/me` có `isDemo: true`; `POST /api/payments` → `provider: VNPAY`, `vnpay: null` (chưa có credential, E1); `simulate-confirm` → `PAID`, `confirmedVia: SIMULATION`. `GET /api/billing/xu/history`: `type=grant` chỉ ra lô nạp và định mức, `type=adjust` ra lô admin, `type=spend` rỗng khi chưa tiêu, `from` / `to` giữ cả hai đầu và kết hợp được với `type` và `limit` (có `nextBefore`), `type=foo` → `400`. `/dashboard/wallet` mở được, hiện nhánh VNPay sandbox của tài khoản demo, số dư, các đợt xu, lịch sử; bấm tab "Nạp" gọi `…/history?limit=10&type=grant` → 200; console chỉ có hai `401` trước khi đăng nhập.
- Không kiểm sống: `type=spend` có dữ liệu (stack local không có `ANTHROPIC_API_KEY` / `FAL_KEY` nên không phát sinh khoản chi) chỉ được unit / e2e che.

## 10. Việc còn lại của chủ dự án

1. **Một lần chuyển khoản SePay thật, số tiền nhỏ**: tạo webhook theo docs/18 §3.4, tạo thanh toán `PENDING` bằng tài khoản thường, chuyển đúng số tiền và nội dung `WF…`. Kiểm `PAID` tới trong vài giây và dòng `MATCHED` ở `/admin/bank-transactions`. Thử thêm một khoản thiếu tiền để thấy `UNMATCHED` rồi gán tay. Sửa parser nếu SePay đổi tên trường payload.
2. **Credential VNPay sandbox**: đăng ký, điền `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_RETURN_URL` (docs/18 §3.5), khai IPN URL, thử một vòng thẻ test bằng tài khoản demo. Kiểm VNPay chấp nhận chữ ký của URL và IPN tới được VPS.
3. **Quét QR bằng app ngân hàng trên điện thoại thật** trong `CheckoutDialog` (đọc đúng ngân hàng, số tiền, nội dung `WF…`): bước 10 bảng §6 của docs/18.
4. Điền `SEPAY_WEBHOOK_API_KEY` và `VNPAY_*` vào `.env` của VPS (không dán vào chat); đặt `PAYMENT_SIMULATION=false` khi bán thật.

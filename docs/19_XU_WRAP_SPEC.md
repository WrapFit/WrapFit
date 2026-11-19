# 19. Xu Wrap: đồng xu chung cho mọi tác vụ AI

> Trạng thái (đối chiếu 2026-11-19):
> - Sổ cái xu, ảnh AI, hoa văn AI trả bằng xu, ví và báo cáo: **có mã trên `develop`**; **đã kiểm bằng E2E** ngày 2026-11-19 (`billing`, `ai-images`, `ai`, `xu-report`, `payments`).
> - Nạp số xu tùy chọn (`XU_CUSTOM`): có mã trên `develop` (migration `20261112000100_xu_custom_topup`); chưa có ca unit hay E2E riêng cho số xu tùy chọn.
> - Giá vốn thật của từng model fal: **chờ kiểm thực tế** (chủ dự án đồng ý tốn một lượt gọi mỗi model, rồi đối chiếu trang Usage của fal). Xem §3.
>
> Kế hoạch được duyệt ngày 2026-10-31 sau 3 vòng hỏi đáp với chủ dự án. Hợp đồng API: [03 · Xu Wrap và ảnh AI](03_API_DESIGN.md#xu-wrap-và-ảnh-ai). Luồng giao diện: [06 · mục 11](06_FE_INTEGRATION_GUIDE.md#11-ai-xu-wrap-ảnh-ai-và-hoa-văn). Quyền xuất file in: [03 · Xuất file in](03_API_DESIGN.md#xuất-file-in).

## 1. Bối cảnh

Trước đây AI của WrapFit chỉ sinh hoa văn SVG bằng Claude và bị giới hạn theo **số lượt mỗi ngày** (`DAILY_AI_LIMIT`). Xu Wrap thay "lượt AI" bằng một đơn vị duy nhất, giống credit của Meshy hay Tripo. Khách chỉ cần biết mình còn bao nhiêu xu và số xu đó làm được gì. Mỗi xu có giá niêm yết cố định, nên báo cáo tài chính đơn giản. Đồng thời WrapFit có thêm tạo ảnh AI (text-to-image) để dán lên mặt hộp, với nhiều model giá khác nhau.

## 2. Quyết định

| # | Quyết định |
| :- | :- |
| D1 | **1 xu = 100đ** (giá niêm yết, gồm VAT): `XU_VALUE_VND`. |
| D2 | Xu gói tháng **dồn tối đa 1 kỳ**: lô allowance kỳ N hết hạn cuối kỳ N+1 (`xuAllowancePeriod`). Cấp lười, không cron. |
| D3 | **Trừ xu khi tạo job.** Hoàn khi lỗi phía hệ thống: provider lỗi hoặc timeout ở lần thử cuối, provider chặn ảnh, hàng đợi sập, worker chết. **Không hoàn khi khách không ưng ảnh.** Kiểm duyệt prompt chạy trước khi trừ xu. |
| D4 | Bán xu lẻ: `XU_500` 50.000đ, `XU_1050` 100.000đ, `XU_2200` 200.000đ, hạn 12 tháng. Hai gói lớn có thưởng (1.050 và 2.200 xu thay vì 1.000 và 2.000). |
| D5 | Ba khái niệm tách riêng, không quy đổi qua lại khi dùng (cập nhật 2026-11-16, khi ngừng bán gói lượt xuất):<br>1. **Xu Wrap** chỉ dùng cho **tác vụ AI**: ảnh, hoa văn AI, phóng to, xóa nền, vector hóa. Xu **không** mở file in.<br>2. **Quyền mở file in từ đơn in**: một đơn in mẫu đã trả tiền, chưa hủy, có dòng hàng giữ đúng phiên bản thiết kế, mở mọi định dạng file in của phiên bản đó. Đây là đường duy nhất để có quyền mới. Pro cũng không tự mở file in.<br>3. **Quyền mở khóa cũ còn hạn**: lượt xuất mua trước khi ngừng bán đã mở khóa một phiên bản (`export_unlocks`) vẫn dùng được tới khi hết hạn. Không tạo thêm quyền loại này. Số lượt xuất còn dư được đổi một lần sang xu theo số tiền đã trả (script `db:convert-export-credits`), và gói lượt xuất mới bị từ chối (`400 EXPORT_PACK_DISCONTINUED`). |
| D6 | Mỗi lô ghi `value_vnd`, tức số tiền thật của cả lô. Lô mua: số tiền đã trả. Lô gói, tặng, admin: 0đ (CHECK `chk_credit_lots_value_source`). |
| D7 | Provider: **fal.ai** là cổng duy nhất, bọc sau `ImageProvider`. |
| D8 | Hạn mức mỗi kỳ: Free 50, Lượt xuất 100, Pro 1.000, Business 3.500 (`XU_ALLOWANCE`). |
| D9 | "Ảnh AI của tôi": ảnh chưa dùng giữ 30 ngày (`AI_IMAGE_KEEP_DAYS`). Ảnh đã đặt lên thiết kế giữ như ảnh upload. Tính vào dung lượng gói. |
| D10 | Model: FLUX.2 klein 4B, GPT Image 2 (low, medium; high tắt), Seedream 4.5, Nano Banana 2, Nano Banana Pro, Recraft V3 Vector. |
| D11 | **Nạp số xu tùy chọn** (`XU_CUSTOM`, thêm 2026-11-12): tối thiểu **100** xu, tối đa **50.000** xu mỗi lần, **bội số của 10**, giá **niêm yết** (`xu × 100đ`), **không thưởng**. Thưởng chỉ có ở gói cố định, nên gói cố định luôn lợi hơn với cùng số tiền. Hạn 12 tháng như xu nạp khác (`XU_CUSTOM` trong [`shared/src/billing/xu.ts`](../shared/src/billing/xu.ts)). |

Mặc định do kỹ thuật chọn:
- Không khóa model theo gói.
- Mỗi request tạo từ 1 đến 4 ảnh, giá tính theo ảnh.
- Ảnh mặc định không có chữ. Bật "cho phép chữ" chỉ với model có `supportsText`.

### 2.1. Quy tắc cấp, trừ và hoàn xu

**Cấp xu theo kỳ (allowance).**
- Mỗi gói nhận `XU_ALLOWANCE` xu mỗi kỳ: Free 50, Lượt xuất 100, Pro 1.000, Business 3.500.
- **Kỳ**: Free và Lượt xuất (và gói trả phí được cấp tay, không có thuê bao) theo **tháng dương lịch, giờ Việt Nam**. Pro và Business có thuê bao còn hiệu lực: **kỳ 30 ngày tính từ ngày bắt đầu thuê bao**, nên gia hạn giữ nhịp cũ.
- **Cấp lười, không cron**: backend cấp lô của kỳ khi khách đọc ví (`GET /billing/me`, `GET /ai/usage`) hoặc tiêu xu lần đầu trong kỳ. Mỗi kỳ cấp đúng một lần (unique `(user_id, kind, source, period_key)`), kể cả khi nhiều request đến cùng lúc. `resetsAt` là lúc kỳ sau bắt đầu.
- Đổi gói giữa tháng thì nhận allowance của gói mới (gói là một phần của `period_key` theo tháng).
- **Dồn kỳ**: xu gói chưa dùng còn dùng được đúng một kỳ nữa rồi hết hạn. Vì vậy số dư từ gói có thể lên tới 2 lần hạn mức.

**Xu nạp** (`XU_500`, `XU_1050`, `XU_2200`, `XU_CUSTOM`): cấp một lô `PURCHASE` hạn 12 tháng khi thanh toán xác nhận, `value_vnd` = số tiền đã trả. Xu admin cấp tay là lô `ADMIN`, `value_vnd = 0`.

**Giá.**
- Giá xu của từng model và công cụ chỉ nằm ở `shared` (`AI_IMAGE_MODELS`, `XU_TOOL_COST`, `XU_PATTERN_COST`, `XU_PACKS`, `XU_CUSTOM`, `XU_ALLOWANCE`) và được trả qua `GET /ai/models`, `GET /ai/usage`. FE không chép giá vào code: đổi giá ở `shared` là đủ.
- Xu một lần tạo ảnh = `model.xu × numImages`. Công cụ ảnh: phóng to 20, xóa nền 5, vector hóa 10. Hoa văn: thuật toán 0, `fast` 1, `premium` 65.
- Mọi giá phải giữ biên tối thiểu 2,5 lần chi phí ước tính (§3).

**Trừ xu.**
- Xu bị trừ **trong cùng transaction** tạo job (ảnh, công cụ) hoặc trước khi gọi Claude (hoa văn). Không đủ xu → `402 INSUFFICIENT_CREDITS { kind: "XU", balance, cost }`, không tạo job, không trừ gì.
- Lô **sắp hết hạn bị trừ trước**; một lần trừ có thể lấy từ nhiều lô, các dòng `credit_debits` chung `operation_id` và hiện thành **một dòng** trong lịch sử.
- Kiểm duyệt mô tả chạy **trước** khi trừ: mô tả bị chặn → `422 PROMPT_REJECTED`, chưa trừ xu.
- Gửi lại cùng `clientRequestId` trả lại job cũ, **không trừ lần hai**, kể cả khi hai request đến cùng lúc (unique `(user_id, client_request_id)`).

**Hoàn xu.**
- Hoàn **đủ, tự động, đúng một lần** (`credit_debits.refunded_at`) khi lỗi phía hệ thống: provider lỗi hoặc timeout ở lần thử cuối, provider từ chối vẽ nội dung, hàng đợi từ chối job, worker chết hoặc job treo quá 10 phút (`AiImageReconcileTask`). Job thành `FAILED`, `error` ghi "Xu đã được hoàn lại".
- Hoa văn AI: Claude lỗi thì hoàn ngay và trả hoa văn thuật toán (`usage.charged: 0`). Tiến trình chết giữa lúc trừ và gọi Claude thì tác vụ dọn hoàn lại lần trừ không có kết quả sau 10 phút.
- **Không hoàn** khi khách không ưng ảnh.
- Lần trừ đã hoàn vẫn ở lịch sử, có `refundedAt` khác `null` (FE gạch ngang). Sau khi job lỗi, FE gọi lại `GET /billing/me` để lấy số dư mới.

## 3. Bảng giá

Nguồn sự thật: `shared/src/billing/ai-image-models.ts` và `shared/src/billing/xu.ts`. Test buộc mọi giá có `xu × 100 ≥ 2,5 × chi phí × 26.000` (`be/src/billing/xu.spec.ts`, `be/src/ai/image/fal-models.spec.ts`).

Mọi chi phí dưới đây là **ước tính ngày 2026-10-31** theo bảng giá niêm yết của fal (qua fal MCP `get_pricing`, chưa gọi model nào). **Giá vốn fal thật: chờ đo** (chờ kiểm thực tế, người kiểm: chủ dự án, bằng một lượt gọi mỗi model rồi đối chiếu trang Usage của fal).

| Key | Endpoint fal | Chi phí ước tính (2026-10-31) | Xu |
| :- | :- | -: | -: |
| `flux2-klein` | `fal-ai/flux-2/klein/4b` (2 MP, $0.005/MP) | $0.014 | 10 |
| `gpt-image-2-low` | `openai/gpt-image-2`, quality low, ~1 MP | ~$0.01 | 10 |
| `seedream-4.5` | `fal-ai/bytedance/seedream/v4.5/text-to-image` (~4.2 MP) | $0.04 | 30 |
| `gpt-image-2-medium` | `openai/gpt-image-2`, quality medium, ~1 MP | ~$0.055 | 40 |
| `nano-banana-2` | `fal-ai/nano-banana-2`, 1K | $0.08 | 60 |
| `recraft-v3-vector` | `fal-ai/recraft/v3/text-to-image`, style `vector_illustration` | $0.08 | 60 |
| `nano-banana-pro` | `fal-ai/nano-banana-pro`, 2K | $0.15 | 120 |
| `gpt-image-2-high` | `openai/gpt-image-2`, quality high (**tắt**) | $0.21–0.41 | 300 |

| Công cụ / hoa văn | Endpoint | Chi phí ước tính (2026-10-31) | Xu |
| :- | :- | -: | -: |
| Upscale (≤ 16 MP, cạnh ≤ 4096) | `fal-ai/seedvr/upscale/image` | $0.016 (16 MP) | 20 |
| Xóa nền | `fal-ai/birefnet/v2` | ~$0.005 | 5 |
| Vector hóa | `fal-ai/recraft/vectorize` | $0.01 | 10 |
| Hoa văn `procedural` / `fast` / `premium` | Claude Haiku / Opus | 0 / theo token / ~2.500đ mỗi lượt | 0 / 1 / **65** |

| Gói nạp | Xu | Giá |
| :- | -: | -: |
| `XU_500` | 500 | 50.000đ |
| `XU_1050` | 1.050 | 100.000đ |
| `XU_2200` | 2.200 | 200.000đ |
| `XU_CUSTOM` | 100–50.000, bội số của 10 | `xu × 100đ`, không thưởng |

Hoa văn premium tăng từ 25 (docs/16 §4.1) lên 65 xu để giữ biên 2,5 lần ở trường hợp xấu nhất (~2.500đ mỗi lượt Opus, ước tính 2026-10-31).

Bật model có giá chưa chốt bằng biến `AI_IMAGE_MODELS` (danh sách khóa), không cần sửa code.

Đối chiếu ngày 2026-10-31 qua fal MCP (`get_pricing`, `get_model_schema`, tài khoản fal của chủ dự án, chưa gọi model nào):
- Endpoint và tham số trong `be/src/ai/image/fal-models.ts` đều có trong schema hiện hành (`image_size`, `quality`, `num_images`, `resolution`, `aspect_ratio`, `style`, `upscale_mode`/`upscale_factor`, `refine_foreground`). Kích thước Seedream 4.5 (~4,2 MP) nằm trong khoảng cho phép (≥ 2560×1440 điểm ảnh); GPT Image 2 ~1 MP nằm trong 655.360–8.294.400 điểm ảnh, cạnh bội 16.
- Giá niêm yết khớp bảng trên: FLUX.2 klein $0.005/MP (ảnh ~2 MP = $0.01, giữ $0.014 để dư khi fal làm tròn MP), Seedream 4.5 $0.04/ảnh, Nano Banana 2 $0.08/ảnh, Nano Banana Pro $0.15/ảnh, SeedVR $0.001/MP (16 MP = $0.016), BiRefNet $0.000575/giây GPU (~9 giây = $0.005), Recraft vectorize $0.01/ảnh.
- Recraft V3: API giá trả $0.04/ảnh; trang model của fal ghi style vector tính gấp đôi, nên giữ $0.08.
- GPT Image 2: API giá của fal trả "1 USD / units", nghĩa là fal tính đúng chi phí token của OpenAI. OpenAI tính $30 cho 1 triệu token ảnh đầu ra. Ảnh 1024×1024 theo ví dụ của OpenAI (qua các trang tổng hợp, chưa đối chiếu trang giá gốc): low ~$0.006, medium ~$0.053, high ~$0.211. Ảnh 3:2 và 2:3 rẻ hơn ảnh vuông. Token prompt chỉ thêm vài phần trăm. Vì vậy `estCostUsd` low giữ $0.01, medium nâng $0.05 lên $0.055 (biên 2,8 lần), high giữ $0.41 cho tới khi bật.
- Sau lần gọi thật đầu tiên trên production, đối chiếu `est_cost_usd` của `ai_image_jobs` với chi phí từng request trong trang Usage của fal (MCP `search_request_history` chỉ trả thời gian và kết quả, không trả tiền).

## 4. Thiết kế đã làm

### 4.1 Sổ cái (S1)
- Xu là lô `credit_lots` với `kind = XU`. Cùng cơ chế khóa dòng và trừ lô sắp hết hạn trước như lượt xuất. `CreditsService` nhận `kind`.
- `XuWalletService` (`be/src/billing/xu-wallet.service.ts`): `ensureAllowance` (unique `(user_id, kind, source, period_key)`), `spend`, `refund`, `wallet`, `history`.
- `period_key`: `<tier>:<yyyy-mm>` theo tháng giờ Việt Nam, hoặc `sub:<subscriptionId>:<n>` theo kỳ 30 ngày của gói trả phí.
- API: `GET /billing/me` trả `xu`. `GET /billing/xu/history?before&limit`. Admin `POST /admin/users/:id/credits` nhận `kind: 'XU'` (tối đa 100.000).
- Thanh toán: `PaymentPurpose` thêm `XU_*`. `fulfil` cấp lô XU với `valueVnd = amountVnd`. `PaymentView.xu`.
- Lỗi 402: `{ code: 'INSUFFICIENT_CREDITS', kind: 'XU' | 'EXPORT', balance, cost }`.
- Migration: `20261031000100_xu_enums` (giá trị enum, tách riêng vì PostgreSQL), `20261031000200_xu_wallet`.

### 4.2 Engine ảnh (S2), `be/src/ai/image/`
- `POST /api/ai/images` `{ prompt, modelKey, aspectRatio, numImages?, allowText?, clientRequestId? }` trả 202 `{ job, balance }`. Thứ tự xử lý:
  1. Kiểm model, tỉ lệ khung, số ảnh, chữ.
  2. Nếu `clientRequestId` đã có job thì trả lại job đó.
  3. Kiểm tính năng bật, cầu chì ngân sách (503 `AI_IMAGE_UNAVAILABLE`), tối đa 3 job đang chạy (429 `AI_IMAGE_BUSY`), bộ nhớ đầy (403 `STORAGE_QUOTA_EXCEEDED`).
  4. `PromptRewriter`: Claude Haiku dịch prompt và đóng khung "artwork phẳng cho mặt hộp". Prompt bị từ chối trả 422 `PROMPT_REJECTED`. Không có key thì gửi prompt như khách gõ.
  5. Một transaction: tạo `ai_image_jobs` và trừ xu.
  6. Đưa vào hàng đợi `ai-image`. Lỗi thì hoàn xu và trả 503.
- `GET /api/ai/images/jobs/:id` (FE poll 2s), `GET /api/ai/images` (thư viện), `POST /api/ai/images/:outputId/{upscale|remove-bg|vectorize}`, `GET /api/ai/models`.
- Worker (`AiImageProcessor`, thử 2 lần): gọi provider, tải ảnh (chỉ host `*.fal.media|fal.ai|fal.run`), lọc SVG (`svg-sanitizer.ts`, allowlist trên svgo), lưu `users/<id>/image/<uuid>.<ext>` purpose IMAGE, ghi `ai_image_outputs.keep_until`.
- Lỗi phía hệ thống: `AiImageRefunds.fail` set FAILED và hoàn xu trong một transaction. Provider chặn nội dung thì không thử lại, `error_log` có tiền tố `[blocked] `. `AiImageReconcileTask` dọn job treo mỗi 5 phút.
- `AiCostGuard` cộng `est_cost_usd` của job ảnh vào cầu chì tháng.
- `dropUnusedUploads` bỏ qua ảnh AI còn `keep_until`. File SVG/PDF do backend sinh được phục vụ dạng attachment.
- Env: `AI_IMAGE_PROVIDER` (`fal` | `fake`; `fake` bị cấm ở production), `FAL_KEY`, `AI_IMAGE_MODELS`, `AI_IMAGE_TIMEOUT_MS`, `AI_IMAGE_CONCURRENCY`, `USD_VND_RATE`.
- Provider giả: prompt chứa `#fail` thì lỗi (thử hoàn xu), chứa `#blocked` thì bị chặn.

### 4.3 Hoa văn AI trả bằng xu (S3)
- `AiPatternService.generate`: AI tắt hoặc cầu chì tháng đã chạm → hoa văn thuật toán, không trừ xu (`usage: null`). Ngược lại một transaction `XuWalletService.spend` (reason `AI_PATTERN`, `XU_PATTERN_COST[quality]`) trước khi gọi Claude; thiếu xu → 402. Claude lỗi → `refund` rồi hoa văn thuật toán (`usage.charged: 0`). Thành công → `ai_generations` ghi `credits`, `debit_operation_id`.
- `quality: 'premium'` mở cho mọi gói (65 xu); bỏ `DAILY_AI_LIMIT` và `403 PLAN_FEATURE_REQUIRED`.
- `GET /ai/usage`: `{ aiEnabled, budgetReached, patternCost, xu: { balance, allowance } }`.
- Migration `20261031000400_ai_pattern_xu`.

### 4.4 Studio (S4)
- Công cụ "Ảnh AI" (phím I) mở tab "Ảnh AI" của bảng thuộc tính (`fe/src/features/studio/components/ai-image/AiImagePanel.tsx`).
- "Dùng cho <mặt>" (`handlePlaceAiImage` trong `StudioWorkspace.tsx`): ảnh lớn nhất vừa vùng an toàn của mặt (lề an toàn + 0,5 mm), giữ tỉ lệ, kiểu `image` (SVG: `logo`), `dpi` = rộng px / rộng mm × 25,4. Dưới 200 DPI: gợi ý Phóng to (FitCheck cảnh báo dưới 300, chặn dưới 150).
- `fe/src/api/ai` không còn nuốt lỗi; `errorMessage` hiện câu "Cần N xu, bạn còn M xu" cho 402 kind XU và lời của server cho `PROMPT_REJECTED`, `AI_IMAGE_BUSY`, `AI_IMAGE_UNAVAILABLE`.

### 4.5 Ví, giá, báo cáo (S5)
- Ví xu: lúc đầu nằm ở trang Thanh toán (`XuWalletPanel`), nay là trang riêng `/dashboard/wallet` (`fe/src/views/dashboard/wallet/`): số dư, xu sắp hết hạn, nạp gói cố định hoặc số xu tùy chọn qua `CheckoutDialog`, lịch sử lọc theo loại và ngày.
- `/pricing`: `XuWrapSection` (xu mỗi gói, "1.000 xu làm được gì", gói nạp). `PLANS[tier].xuPerPeriod` thay `aiPatternsPerDay`.
- `GET /api/admin/analytics/xu?month=yyyy-mm` (`be/src/analytics/xu-report.service.ts`), trang `/admin/xu`:
  - Doanh thu ghi nhận = Σ quantity × `value_vnd` / quantity của lô, chỉ debit chưa hoàn, tạo trong tháng.
  - Xu hết hạn trong tháng = `remaining` của lô có `expires_at` trong tháng (lô hết hạn không tiêu được nữa).
  - Xu bán chưa tiêu = lô PURCHASE còn hạn **tại thời điểm xem** (không tính lùi về cuối tháng).
  - Chi phí model = `est_cost_usd` của job ảnh COMPLETED + token hoa văn × bảng giá Claude, nhân `USD_VND_RATE`. Chưa tính chi phí mô tả bị từ chối và job lỗi mà fal vẫn tính tiền.

## 5. Kiểm thử hiện có

- Unit:
  - `be/src/billing/{credits.service,xu-wallet.service,xu}.spec.ts`, `be/src/payments/payments.service.spec.ts`.
  - `be/src/ai/image/{ai-image.service,ai-image.processor,fal-models,svg-sanitizer}.spec.ts`, `be/src/ai/ai-cost.guard.spec.ts`.
- E2E (Postgres, Redis, SeaweedFS):
  - `test/e2e/billing.e2e-spec.ts`: cấp allowance đồng thời đúng một lần, XU tách khỏi EXPORT.
  - `test/e2e/ai-images.e2e-spec.ts`: 7 tình huống, gồm hoàn xu và chống bấm đôi.
  - `test/e2e/ai.e2e-spec.ts`: ví xu trong `/ai/usage`, premium mở cho mọi gói, AI tắt không trừ xu.
  - `test/e2e/xu-report.e2e-spec.ts`: báo cáo xu của một tháng riêng (02/2001), chỉ admin.
- Unit S3: `be/src/ai/ai-pattern.service.spec.ts` (trừ trước khi gọi, hoàn khi lỗi, 402, cầu chì).
- FE: kiểm trên trình duyệt với `AI_IMAGE_PROVIDER=fake` và `npm --workspace=fe run shots` (M, X+): studio, billing, pricing, `/admin/xu`.
- Chạy: `npx jest --config ./test/jest-e2e.json --runInBand test/e2e/ai-images.e2e-spec.ts` trong `be/`. Đừng chạy song song với một worker dev khác (nó giành job).

## 6. Các phiên (đã xong)

| Phiên | Việc | Phụ thuộc |
| :- | :- | :- |
| **S3** | Hoa văn AI sang xu. `ai-pattern.service.ts`: bỏ `DAILY_AI_LIMIT` và cổng 403 premium. Trừ `XU_PATTERN_COST` qua `XuWalletService.spend` (reason `AI_PATTERN`) trong luồng docs/16 §4.3. Lỗi thì refund và trả hoa văn thuật toán. Migration thêm `ai_generations.credits`, `debit_operation_id`. `GET /ai/usage` trả ví xu. FE: sửa `fe/src/api/ai/index.ts` để không nuốt lỗi (402, 422, 429 phải hiện ra). `AiPatternPanel` hiện giá xu thay "Còn N/M lượt". Bỏ `aiPatternsPerDay` ở `fe/src/features/pricing/plans.ts`. | S1 |
| **S4** | FE studio. Công cụ "Ảnh AI" trong `StudioToolDock.tsx` và panel `fe/src/features/studio/components/ai-image/AiImagePanel.tsx`: prompt, thẻ model (giá xu từ `GET /ai/models`), tỉ lệ khung theo mặt hộp đang chọn (`nearestAspectRatio`), 1–4 ảnh, công tắc chữ, nút "Tạo · N xu", poll 2s, lưới kết quả với "Dùng cho <mặt>" (đi lại đường `handleImageUpload` trong `StudioWorkspace.tsx` để có DPI cho FitCheck; DPI < 200 thì gợi ý Upscale), thư viện "Ảnh AI của tôi", các nút công cụ. Chip số dư xu. Mascot Gói: `delivery` khi chờ, `celebration` khi xong, `measuring` khi DPI thiếu. Gửi `clientRequestId` mỗi lần bấm. | S2 |
| **S5** | FE ví, giá, báo cáo. Billing `fe/src/views/dashboard/billing/index.tsx`: phần "Ví xu" (lô, hạn, lịch sử `GET /billing/xu/history`, nút nạp `XU_*` qua `CheckoutDialog`). Trang giá `fe/src/components/pricing/`: xu mỗi gói, bảng "1.000 xu làm được gì". BE: `GET /api/admin/analytics/xu?month=` (xu phát theo nguồn, đã tiêu, doanh thu ghi nhận = Σ quantity × value_vnd / lot.quantity, hết hạn, số dư nợ của lô PURCHASE, chi phí provider theo model × `USD_VND_RATE`, biên gộp), thêm bảng vào dashboard analytics S7. | S1 |
| **S6** | Tài liệu: docs/16 §4 trỏ sang docs/19, cập nhật `docs/03` (API), `be/README.md` (module `ai/image`, env), `docs/18` (biến môi trường deploy: `FAL_KEY`). Đo chi phí thật từng model (fal MCP hoặc `FAL_KEY`), ghi vào §3, chỉnh `estCostUsd` và giá nếu biên < 2,5. | S2–S5 |

Sau mỗi phiên: typecheck (`npx tsc --noEmit -p be/tsconfig.json`, FE theo `fe`), test liên quan, commit lên `feat/xu-wrap` (không push), thêm một dòng vào §7.

## 7. Nhật ký

| Ngày | Phiên | Commit | Ghi chú |
| :- | :- | :- | :- |
| 2026-10-31 | S1 | 6b50810 | Sổ cái xu, gói xu, allowance dồn 1 kỳ. 50 unit + 8 e2e billing pass. |
| 2026-10-31 | S2 | a22eab8 | Engine ảnh fal, provider giả, hàng đợi, hoàn xu, lọc SVG. Unit pass, 7 e2e ai-images pass, e2e billing/payments/storage/unused-files/ai pass. Chưa chạy e2e export vì worker dev khác đang chạy. Chưa gọi fal thật. |
| 2026-10-31 | S3 | e124be7 | Hoa văn AI trả bằng xu: trừ trước khi gọi Claude, hoàn khi lỗi rồi trả hoa văn thuật toán, premium mở cho mọi gói (65 xu). Migration `20261031000400_ai_pattern_xu` (`credits`, `debit_operation_id`). `GET /ai/usage` trả `patternCost` và ví xu. FE: API không nuốt lỗi, thông báo 402 xu, panel hoa văn chọn chất lượng và hiện giá, bỏ `aiPatternsPerDay` (thay `xuPerPeriod`) ở giá, checkout, billing, thông báo, dashboard. 7 unit + 6 e2e ai pass, tsc BE/FE pass. Giao diện kiểm cùng S4. |
| 2026-10-31 | S4 | 76bc102 | Studio: công cụ "Ảnh AI" (phím I) và tab "Ảnh AI" trong bảng thuộc tính. `AiImagePanel`: mô tả, chọn model kèm giá xu (`GET /ai/models`), tỉ lệ theo mặt đang chọn, 1–4 ảnh, công tắc chữ, nút "Tạo · N xu", poll 2 s, lưới kết quả, "Dùng cho <mặt>" (đặt trong vùng an toàn 3 mm, DPI theo cỡ in; dưới 200 DPI gợi ý Phóng to), menu công cụ (phóng to, xóa nền, vector hóa), "Ảnh AI của tôi", chip số dư, mascot `delivery`/`celebration`/`measuring`, `clientRequestId` mỗi lần bấm. Kiểm trên trình duyệt với `AI_IMAGE_PROVIDER=fake`: tạo 10 xu, đặt ảnh lưu được lên server (387 DPI), phóng to 20 xu, `#fail` hoàn xu, thiếu xu khóa nút; panel hoa văn S3 hiện "AI đang tắt". page-shots M và X+ cho studio, billing, dashboard; tab bảng thuộc tính đổi sang flex để 5 tab không tràn ở 375 px. tsc FE pass. |
| 2026-10-31 | S5 | ff0a51d, 117d80d | BE: `GET /api/admin/analytics/xu?month=` (`XuReportService` trong module analytics): xu phát theo nguồn, đã tiêu theo tác vụ, đã hoàn, doanh thu ghi nhận theo `value_vnd` của lô, xu hết hạn, xu bán chưa tiêu (doanh thu chưa thực hiện, tính đến hôm nay), chi phí model (job ảnh COMPLETED theo `est_cost_usd`, hoa văn theo token) × `USD_VND_RATE`, biên gộp. FE: phần "Ví xu Wrap" ở trang Thanh toán (số dư, nạp `XU_*` qua `CheckoutDialog`, các lô, lịch sử có "Xem thêm", xu đã hoàn gạch ngang), khối "Xu Wrap cho mọi tác vụ AI" ở `/pricing` (bảng "1.000 xu làm được gì", 3 gói nạp), trang admin `/admin/xu` (menu "Xu Wrap"). 2 e2e `xu-report` mới + e2e billing/payments/analytics pass, 171 unit pass, tsc BE/FE pass. page-shots M, X+ cho billing, pricing, admin xu. Chưa bấm "đã trả" trong dialog nạp xu vì server dev không bật `PAYMENT_SIMULATION` (luồng cộng xu đã có e2e payments từ S1). |
| 2026-10-31 | S6 | (commit này) | Tài liệu: docs/16 §4 trỏ sang docs/19, docs/03 (endpoint xu, ảnh AI, báo cáo), `be/README.md` (module `ai/image`, 6 biến môi trường), docs/18 (biến deploy, fal.ai trong bảng chi phí, 4 migration). Sửa `docker-compose.yml`: truyền `FAL_KEY`, `AI_IMAGE_*`, `USD_VND_RATE` vào `backend` và `worker` (thiếu từ S2, ảnh AI sẽ tắt khi deploy). Đối chiếu giá và schema fal qua MCP (§3): khớp, không đổi giá. **Chưa đo chi phí thật** bằng lượt gọi fal (tốn tiền, cần chủ dự án đồng ý); GPT Image 2 low/medium vẫn là ước tính. |

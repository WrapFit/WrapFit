# 19. Xu Wrap: đồng xu chung cho mọi tác vụ AI

> Trạng thái: S1, S2 xong trên nhánh `feat/xu-wrap` (chưa push). S3–S6 còn lại, xem §6 và nhật ký §7.
> Kế hoạch được duyệt ngày 2026-10-31 sau 3 vòng hỏi đáp với chủ dự án.

## 1. Bối cảnh

Trước đây AI của WrapFit chỉ sinh hoa văn SVG bằng Claude và bị giới hạn theo **số lượt mỗi ngày** (`DAILY_AI_LIMIT`). Xu Wrap thay "lượt AI" bằng một đơn vị duy nhất, giống credit của Meshy hay Tripo. Khách chỉ cần biết mình còn bao nhiêu xu và số xu đó làm được gì. Mỗi xu có giá niêm yết cố định, nên báo cáo tài chính đơn giản. Đồng thời WrapFit có thêm tạo ảnh AI (text-to-image) để dán lên mặt hộp, với nhiều model giá khác nhau.

## 2. Quyết định

| # | Quyết định |
| :- | :- |
| D1 | **1 xu = 100đ** (giá niêm yết, gồm VAT): `XU_VALUE_VND`. |
| D2 | Xu gói tháng **dồn tối đa 1 kỳ**: lô allowance kỳ N hết hạn cuối kỳ N+1 (`xuAllowancePeriod`). Cấp lười, không cron. |
| D3 | **Trừ xu khi tạo job.** Hoàn khi lỗi phía hệ thống: provider lỗi hoặc timeout ở lần thử cuối, provider chặn ảnh, hàng đợi sập, worker chết. **Không hoàn khi khách không ưng ảnh.** Kiểm duyệt prompt chạy trước khi trừ xu. |
| D4 | Bán xu lẻ: `XU_500` 50.000đ, `XU_1050` 100.000đ, `XU_2200` 200.000đ, hạn 12 tháng. |
| D5 | Xu dùng cho **mọi tác vụ AI**: ảnh, hoa văn AI, upscale, xóa nền, vector hóa. **Lượt xuất file giữ nguyên** (lô `EXPORT`, gói "Lượt xuất"). |
| D6 | Mỗi lô ghi `value_vnd`, tức số tiền thật của cả lô. Lô mua: số tiền đã trả. Lô gói, tặng, admin: 0đ (CHECK `chk_credit_lots_value_source`). |
| D7 | Provider: **fal.ai** là cổng duy nhất, bọc sau `ImageProvider`. |
| D8 | Hạn mức mỗi kỳ: Free 50, Lượt xuất 100, Pro 1.000, Business 3.500 (`XU_ALLOWANCE`). |
| D9 | "Ảnh AI của tôi": ảnh chưa dùng giữ 30 ngày (`AI_IMAGE_KEEP_DAYS`). Ảnh đã đặt lên thiết kế giữ như ảnh upload. Tính vào dung lượng gói. |
| D10 | Model: FLUX.2 klein 4B, GPT Image 2 (low, medium; high tắt), Seedream 4.5, Nano Banana 2, Nano Banana Pro, Recraft V3 Vector. |

Mặc định do kỹ thuật chọn:
- Không khóa model theo gói.
- Mỗi request tạo từ 1 đến 4 ảnh, giá tính theo ảnh.
- Ảnh mặc định không có chữ. Bật "cho phép chữ" chỉ với model có `supportsText`.

## 3. Bảng giá

Nguồn sự thật: `shared/src/billing/ai-image-models.ts` và `shared/src/billing/xu.ts`. Test buộc mọi giá có `xu × 100 ≥ 2,5 × chi phí × 26.000` (`be/src/billing/xu.spec.ts`, `be/src/ai/image/fal-models.spec.ts`).

| Key | Endpoint fal | Chi phí ước tính | Xu |
| :- | :- | -: | -: |
| `flux2-klein` | `fal-ai/flux-2/klein/4b` (2 MP, $0.005/MP) | $0.014 | 10 |
| `gpt-image-2-low` | `openai/gpt-image-2`, quality low, ~1 MP | ~$0.01 | 10 |
| `seedream-4.5` | `fal-ai/bytedance/seedream/v4.5/text-to-image` (~4.2 MP) | $0.04 | 30 |
| `gpt-image-2-medium` | `openai/gpt-image-2`, quality medium | ~$0.05 (**chưa đo**) | 40 |
| `nano-banana-2` | `fal-ai/nano-banana-2`, 1K | $0.08 | 60 |
| `recraft-v3-vector` | `fal-ai/recraft/v3/text-to-image`, style `vector_illustration` | $0.08 | 60 |
| `nano-banana-pro` | `fal-ai/nano-banana-pro`, 2K | $0.15 | 120 |
| `gpt-image-2-high` | `openai/gpt-image-2`, quality high (**tắt**) | $0.21–0.41 | 300 |

| Công cụ / hoa văn | Endpoint | Xu |
| :- | :- | -: |
| Upscale (≤ 16 MP, cạnh ≤ 4096) | `fal-ai/seedvr/upscale/image` | 20 |
| Xóa nền | `fal-ai/birefnet/v2` | 5 |
| Vector hóa | `fal-ai/recraft/vectorize` | 10 |
| Hoa văn `procedural` / `fast` / `premium` | Claude Haiku / Opus | 0 / 1 / **65** |

Hoa văn premium tăng từ 25 (docs/16 §4.1) lên 65 xu để giữ biên 2,5 lần ở trường hợp xấu nhất (~2.500đ mỗi lượt Opus).

Bật model có giá chưa chốt bằng biến `AI_IMAGE_MODELS` (danh sách khóa), không cần sửa code.

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

## 5. Kiểm thử hiện có

- Unit:
  - `be/src/billing/{credits.service,xu-wallet.service,xu}.spec.ts`, `be/src/payments/payments.service.spec.ts`.
  - `be/src/ai/image/{ai-image.service,ai-image.processor,fal-models,svg-sanitizer}.spec.ts`, `be/src/ai/ai-cost.guard.spec.ts`.
- E2E (Postgres, Redis, SeaweedFS):
  - `test/e2e/billing.e2e-spec.ts`: cấp allowance đồng thời đúng một lần, XU tách khỏi EXPORT.
  - `test/e2e/ai-images.e2e-spec.ts`: 7 tình huống, gồm hoàn xu và chống bấm đôi.
- Chạy: `npx jest --config ./test/jest-e2e.json --runInBand test/e2e/ai-images.e2e-spec.ts` trong `be/`. Đừng chạy song song với một worker dev khác (nó giành job).

## 6. Các phiên còn lại

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

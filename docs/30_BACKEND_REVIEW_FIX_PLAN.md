# 30. Kế hoạch sửa 7 lỗi của review backend

> Ngày lập: 2026-11-18 · Nhánh gốc: `develop` (de2328d, đã commit phần docs/28) · Nhánh làm: `fix/be-review-29` · Trạng thái: **xong** S0–S5 ngày 2026-11-18, vòng review 2–4 ngày 2026-11-18/19, Q1 và Q2 theo mặc định; chưa push, chưa merge
> Phạm vi: `be/`. Frontend chỉ đụng ở chỗ một session ghi rõ.
> Nguồn: [docs/29](29_BACKEND_CODE_REVIEW.md). Số mục giữ nguyên theo docs/29 để dễ tra.

## 1. Hiện trạng

Ngày 2026-11-18 đã đối chiếu docs/29 với code: **cả 7 mục đều có thật**. Khi đối chiếu, có thêm bốn chi tiết mà các session dưới phải tính đến:

- **Mục 1.** Ngoài worker, chính API cũng lệch phiên bản: FitCheck đọc dự án mà không khóa, sau đó `grant()` mới `SELECT ... FOR UPDATE` và đọc `version`. Vì vậy FitCheck và quyền xuất có thể thuộc hai phiên bản khác nhau.
- **Mục 3.** Chỉ mất kỳ khi khách đang có Pro. Nếu chưa có Pro, index `subscriptions_user_id_active_key` làm transaction thứ hai lỗi và payment đó vẫn `PENDING`. Không mất tiền, nhưng khách phải chờ webhook gửi lại. Thanh toán `PRO_MONTH` không dùng lại payment `PENDING` đang có như `SAMPLE_ORDER`, nên khách tạo được hai payment cùng lúc.
- **Mục 4.** Thứ tự "xóa DB rồi mới xóa object" đã đúng ở cả hai luồng. Thứ còn thiếu là điều kiện chặn xóa.
- **Mục 6.** File ghi lại cùng key và dùng `storedFile.upsert`, nên file bị ghi đè chứ không chiếm gấp đôi quota. Thiệt hại thật là snapshot tự động, `EXPORT_COMPLETED` và thông báo "file đã sẵn sàng" bị tạo hai lần.

Working tree của `develop` đang có phần docs/28 chưa commit. Phần này đụng `payments.service.ts` và `user-removal.ts`, cũng là hai file plan này dùng (xem Q1).

Mốc test gần nhất ghi nhận trên working tree đó: unit 1166/1166 (77 bộ). S0 chạy lại để chốt mốc.

Lưu ý môi trường:

- Sau khi đổi nhánh, chạy lại `db:generate` và build `shared`, nếu không test không biên dịch.
- E2E cần Docker Desktop đang chạy (Postgres ở `localhost:55432`, Redis, SeaweedFS).
- Dừng worker trước khi chạy e2e `export`, vì worker sẽ lấy mất job của test.

```bash
npm --workspace=be run db:generate
```

```bash
npm --workspace=shared run build
```

## 2. Danh sách việc

Mức: **P1** = sửa trước khi nhận đơn in hoặc thanh toán thật, **P2** = sai lệch khi có autosave, retry hoặc phân trang.

| # | Mức | Việc | Vị trí | Session |
|---|---|---|---|---|
| 1 | P1 | Job xuất chỉ giữ `exportJobId`. Worker đọc canvas và kích thước **hiện tại**, nên file in có thể là bản B, trong khi FitCheck và quyền xuất đã kiểm cho bản A | `be/src/export/export.service.ts` (`request`, `grant`), `be/src/export/export.processor.ts` (`render`) | S2 |
| 2 | P1 | `syncProjectFileRefs` chỉ lấy `content` của `logo`/`image`/`pattern`, bỏ qua `elements[].style.fontUrl` và `customFonts[].url`. Sau 24 giờ, `dropUnusedUploads` xóa phông đang dùng | `be/src/projects/infrastructure/project-file-refs.ts`, `be/src/storage/storage.service.ts` (`dropUnusedUploads`) | S1 |
| 3 | P1 | Hai payment Pro được xác nhận cùng lúc: mỗi transaction chỉ khóa payment của nó, cả hai đọc cùng `currentPeriodEnd` và cùng ghi `E + 30 ngày` | `be/src/payments/payments.service.ts` (`fulfil`, nhánh `periodDays`) | S3 |
| 4 | P1 | Xóa vĩnh viễn (thủ công hoặc dọn thùng rác sau 30 ngày) không kiểm đơn. Đơn `IN_PRODUCTION` còn dòng hàng nhưng `project_id` thành `NULL`; canvas, snapshot và file xuất bị xóa theo cascade | `be/src/projects/application/projects.service.ts` (`remove`, `purgeExpiredTrash`), `be/src/projects/infrastructure/prisma-project.repository.ts` (`delete`, `findTrashedBefore`, `deleteTrashed`) | S4 |
| 5 | P2 | Khôi phục snapshot lấy bản sao lưu từ dữ liệu đọc **trước** khi khóa dòng. Một lần autosave chen vào giữa bị ghi đè và cũng không có trong bản sao lưu | `be/src/projects/application/snapshots.service.ts` (`restore`), `be/src/projects/infrastructure/prisma-snapshot.repository.ts` (`restore`) | S5 |
| 6 | P2 | Worker đặt job về `PROCESSING` theo id dù job đã `COMPLETED`. Job được giao lại thì render lại, tạo thêm snapshot, sự kiện và thông báo | `be/src/export/export.processor.ts` (`render`) | S2 |
| 7 | P2 | Gallery ảnh AI dùng cursor chỉ có `createdAt`. Ảnh của một job lưu bằng `createMany` cùng mốc thời gian, nên ảnh ở ranh giới giữa hai trang bị bỏ sót | `be/src/ai/image/ai-image.service.ts` (`gallery`), `be/src/ai/image/dto/ai-image-tool.dto.ts` | S5 |

## 3. Quyết định cần chốt trước

Chủ dự án trả lời ngày 2026-11-18: Q1 và Q2 làm theo mặc định.

| Q | Câu hỏi | Mặc định nếu không trả lời | Chặn |
|---|---|---|---|
| Q1 | Phần docs/28 đang dở trên `develop` (chưa commit, đụng `payments.service.ts`, `user-removal.ts`): xử lý thế nào trước khi cắt nhánh? | Commit riêng phần đó lên `develop`, rồi cắt `fix/be-review-29` từ commit mới | S0 |
| Q2 | Đơn ở trạng thái nào thì chặn xóa vĩnh viễn dự án? | `PENDING_PAYMENT`, `PAID`, `IN_PRODUCTION`. Nếu bỏ `PENDING_PAYMENT`, khách vẫn trả tiền được cho đơn có dự án đã xóa (`markPaid` không kiểm dự án). Phương án khác: mọi đơn chưa hủy, giống quy tắc ẩn danh hóa; khi đó khách không bao giờ xóa được thiết kế đã từng đặt in | S4 |

## 4. Các session

Làm **tuần tự** S0 → S5:

- S1 và S2 cùng sửa câu SQL trong `project-file-refs.ts`.
- S4 và S5 cùng đụng tầng `projects/infrastructure`.
- Mỗi session chạy `graphify update .`, nên mọi nhánh song song đều xung đột ở `graphify-out/graph.json`.

Thứ tự ưu tiên: mục P1 làm trước, rồi mới đến hai mục P2 nhỏ.

Mỗi session kết thúc bằng ba lệnh dưới:

```bash
npm --workspace=be run lint
```

```bash
npm --workspace=be test
```

```bash
graphify update .
```

Session có ghi "e2e" thì chạy thêm lệnh dưới:

```bash
npm --workspace=be run test:e2e
```

Session có migration thì chạy `npm --workspace=be run db:deploy` trên DB local trước khi chạy e2e.

### S0. Chuẩn bị · theo Q1

- Xử lý phần docs/28 theo Q1, rồi cắt nhánh `fix/be-review-29`.
- Chạy `db:generate` và build `shared`.
- Chạy lint, unit và e2e một lần để có mốc.
- **Xong khi:** mốc lint, unit và e2e đã ghi vào §6.

### S1. Phông chữ trong `project_file_refs` (mục 2) · migration · e2e

Làm mục này trước vì nó làm mất dữ liệu thật và ít việc nhất.

**Cách làm**

- Viết lại SQL của `syncProjectFileRefs`:
  - CTE `canvases` gom `canvas_state` của dự án và của mọi snapshot.
  - Lấy key từ ba nguồn: `content` của phần tử `logo`/`image`/`pattern`, `e -> 'style' ->> 'fontUrl'` (mọi loại phần tử), và `url` của từng phần tử trong `customFonts`.
  - Giữ điều kiện `jsonb_typeof(...) = 'array'` cho cả `elements` lẫn `customFonts`.
- Ghi chú ở cả hai đầu: câu SQL và `fileReferences()` trong `be/src/storage/asset-keys.ts` phải liệt kê cùng các nguồn file.
- Migration `20261118000100_font_file_refs` chỉ chứa dữ liệu:
  - `INSERT INTO project_file_refs ... ON CONFLICT DO NOTHING` cho phông của mọi dự án và mọi snapshot.
  - Migration chạy trong `db:deploy` trước khi API và worker mới khởi động, nên tác vụ dọn file không có lúc nào thấy phông "không ai dùng".
- Đếm trên DB local số canvas có key phông mà không còn dòng `stored_files` (phông đã mất). Ghi con số vào §6. Không khôi phục được; site chưa có dữ liệu production.

**Test**

- E2E (`unused-files.e2e-spec.ts`), bốn phông:
  - một phông chỉ có ở `style.fontUrl` của canvas,
  - một phông chỉ có trong `customFonts`,
  - một phông chỉ còn trong snapshot,
  - một phông đối chứng chưa từng dùng.
  - Lùi `created_at` của cả bốn quá 24 giờ, rồi chạy `dropUnusedUploads`. Ba phông đầu phải còn tải được; phông đối chứng phải bị dọn.
- E2E chống lệch giữa hai nơi: lưu một canvas có đủ mọi loại tham chiếu. Tập key trong `project_file_refs` phải bằng `storedCanvasKeys(canvas)`.
- E2E cho backfill:
  - Xóa refs phông của một dự án mẫu.
  - Chạy SQL của migration bằng `$executeRawUnsafe`.
  - Refs phải quay lại.

**Xong khi:** ba test trên đạt, và con số phông đã mất đã ghi vào §6.

### S2. Export theo một phiên bản cố định, giao lại không ghi hai lần (mục 1, 6) · migration · e2e

**Mục 1: chốt bản thiết kế của job**

- Migration `20261118000200_export_job_design` thêm hai cột vào `export_jobs`:
  - `project_version int NULL`,
  - `design jsonb NULL`, gồm `{ title, templateId, formulaVersion, dimensions, canvasState }`. Canvas ở dạng lưu trữ, tức chứa key chứ không chứa URL.
  - Hai cột cho phép `NULL` để giữ các dòng cũ.
- Lưu ngay trên `export_jobs`, không tạo `ProjectSnapshot` lúc request, vì hai lý do:
  - `pruneAutomaticSnapshots` có thể xóa snapshot đó khi job còn đang chờ.
  - Job lỗi sẽ để lại snapshot rác.
- `ExportService.request` chạy trong **một** transaction:
  1. `SELECT status, version, template_id, formula_version, dimensions, canvas_state, title FROM packaging_projects WHERE id = $1 FOR UPDATE`.
  2. Dự án `DELETED` thì trả `409` như hiện nay.
  3. Chạy FitCheck trên chính dòng vừa khóa và lưu `fitcheckState`.
  4. Nếu FitCheck không đạt, **return** khỏi transaction, không throw, để `fitcheckState` vẫn được lưu. Ghi sự kiện `EXPORT_BLOCKED_FITCHECK` và trả `422` ở ngoài transaction.
  5. `grant()` nhận `version` của dòng đã khóa và không tự `SELECT` lại nữa.
  6. Tạo job có `design` và `projectVersion`, rồi gọi `syncProjectFileRefs`.
- Worker render từ `job.design` (qua `toClientCanvas(design.canvasState)`), cho mọi lần render và mọi lần retry.
  - Chỉ khi `design` là `NULL` (job tạo trước migration) worker mới đọc dự án như cũ, và ghi log cảnh báo.
  - Snapshot tự động lúc hoàn tất cũng lấy từ `design`, không lấy từ dự án hiện tại.
- `syncProjectFileRefs` tính thêm `design -> 'canvasState'` của các job `PENDING`/`PROCESSING` của dự án.
  - Lý do: một ảnh cũ hơn 24 giờ bị bỏ khỏi bản B có thể bị dọn ngay ở lượt dọn kế tiếp. Job của bản A khi đó sẽ lỗi "thiếu file".
  - Transaction hoàn tất đã sync lại qua `pruneAutomaticSnapshots`.
  - Nhánh job lỗi không cần sync: refs thừa được bỏ ở lần sync sau, việc này chỉ làm chậm giải phóng quota.

**Mục 6: hai bước chuyển trạng thái có điều kiện**

- Bước bắt đầu đổi thành `updateMany({ where: { id, status: UNFINISHED_EXPORT }, data: { status: 'PROCESSING', errorLog: null } })`. Nếu `count = 0`, đọc lại trạng thái:
  - `COMPLETED`: trả `{ storageKey }`, không render lại.
  - `FAILED` (đã bị `ExportReconcileTask` đánh dấu): ghi log cảnh báo và trả về, không render.
- Transaction hoàn tất đổi thành `updateMany({ where: { id, status: 'PROCESSING' }, data: { status: 'COMPLETED', ... } })`.
  - Nếu `count = 0`: không tạo `productEvent`, không tạo snapshot, không emit `EXPORT_COMPLETED`.
  - Cách này cũng xử lý ca hai worker cùng chạy một job: render nặng chặn event loop quá thời hạn khóa, BullMQ coi job là stalled và giao cho worker khác. Worker nào hoàn tất trước thì thắng.
- Sửa comment "a retried job never counts twice". Comment đó chỉ đúng với retry xảy ra trước commit.

**Test**

- E2E mục 1:
  1. Hai bản A và B có kích thước khác nhau. Tạo job cho A khi worker chưa chạy.
  2. `PATCH` lên bản B, rồi mới cho worker chạy.
  3. Kích thước trong file DXF phải là của A, `export_jobs.project_version` phải là version của A, và snapshot tự động phải mang canvas A.
- E2E file của bản cũ:
  - Một ảnh cũ hơn 24 giờ chỉ có trong A, bị bỏ ở B.
  - Chạy `dropUnusedUploads` giữa lúc request và lúc worker chạy.
  - Export vẫn phải thành công.
- Unit (`export.service.spec.ts`): `request` đọc thiết kế đúng một lần, trong transaction có `FOR UPDATE`. FitCheck, `grant` và `exportJob.create` cùng dùng một `version`.
- Unit (`export.processor.spec.ts`):
  - Gọi `process` hai lần cho cùng một job, lần sau khi lần đầu đã commit. `putGeneratedFile`, `productEvent.create`, `projectSnapshot.create` và `emit` mỗi hàm chỉ được gọi một lần.
  - Ca hai lần chạy đan xen: lần chạy thua có `updateMany` hoàn tất trả `count = 0`, nên không ghi thêm dòng nào.

**Xong khi:** các test trên đạt, và e2e `export` cũ vẫn đạt.

### S3. Gia hạn Pro khi hai thanh toán đến cùng lúc (mục 3) · e2e

**Cách làm**

- Ở nhánh `periodDays` của `fulfil`, trước `plans.sync`, gọi `SELECT pg_advisory_xact_lock(4802, hashtext(userId))`. Từ đó, việc đọc và cập nhật subscription của cùng một khách chạy tuần tự.
- Giữ nguyên khóa từng payment trong `confirmPaid`, vì nó xử lý webhook gửi lại.
- Không khóa dòng `users`:
  - `UsersService.remove` giữ `FOR NO KEY UPDATE` trên dòng user trong lúc chờ khóa payment (xem comment ở `be/src/users/users.service.ts`).
  - `confirmPaid` đang giữ khóa payment mà xin thêm `FOR UPDATE` trên user thì sẽ deadlock với luồng đó.
  - Advisory lock chỉ tranh chấp với chính nó, nên không gặp vấn đề này.
- Gom hai namespace advisory lock vào `be/src/common/db/advisory-locks.ts`:
  - `4801` của quota storage (`reserveUpload`, đang ghi số trực tiếp),
  - `4802` của subscription.

**Test**

- E2E trên PostgreSQL, ca đang có Pro:
  - Khách có Pro hết hạn ngày `E` và hai payment `PRO_MONTH` khác nhau đang `PENDING`.
  - Xác nhận cả hai cùng lúc (`Promise.all` trên endpoint xác nhận giả lập).
  - Kết quả: cả hai payment `PAID`, chỉ một subscription `ACTIVE`, `currentPeriodEnd = E + 60 ngày`.
- E2E, ca chưa có Pro: cả hai payment `PAID` (hiện nay payment thứ hai lỗi ở `subscriptions_user_id_active_key`), và `currentPeriodEnd = now + 60 ngày`.
- Unit (`payments.service.spec.ts`): lệnh lấy khóa chạy trước `subscription.findFirst`.

**Xong khi:** hai e2e trên đạt, và test gia hạn tuần tự hiện có vẫn đạt.

### S4. Chặn xóa dự án của đơn còn cần thiết kế (mục 4) · theo Q2 · e2e

**Cách làm**

- Thêm `ORDER_STATUSES_HOLDING_DESIGN` vào `be/src/orders/order-status.ts`, theo danh sách của Q2. Kèm một helper `Prisma.sql` cho điều kiện `NOT EXISTS (SELECT 1 FROM order_items i JOIN orders o ON o.id = i.order_id WHERE i.project_id = p.id AND o.status IN (...))`.
- `PrismaProjectRepository.delete` đổi sang SQL thuần:
  - `DELETE FROM packaging_projects p WHERE p.id = $1 AND <NOT EXISTS> RETURNING id`.
  - Trả về `boolean`.
- `ProjectsService.remove`:
  - Kiểm đơn **trước** `detachSharedFiles` để trả `409` sớm.
  - Nếu `delete` trả `false` (một đơn vừa được tạo trong lúc đó), trả cùng lỗi `409`.
  - Lỗi: `409 { code: 'PROJECT_IN_ACTIVE_ORDER', message }`, trong `message` có mã đơn.
  - Trong mọi trường hợp không xóa object nào.
- Thêm cùng điều kiện `NOT EXISTS` vào `deleteTrashed` **và** `findTrashedBefore`.
  - Nếu thiếu ở `findTrashedBefore`, 500 dự án bị chặn (`PURGE_BATCH`) sẽ lấp đầy mọi lượt quét, và tác vụ dọn thùng rác dừng hẳn.
- Vẫn cho đưa dự án vào thùng rác, vì thao tác này hoàn tác được.
  - Dự án bị chặn nằm trong thùng rác quá 30 ngày cho tới khi đơn rời các trạng thái trên.
  - Lượt dọn kế tiếp sau đó mới xóa nó.
- Không đổi quy tắc giữ thiết kế khi ẩn danh hóa (`user-removal.ts`, mọi đơn chưa hủy). Hai quy tắc phục vụ hai mục đích khác nhau.
- FE: kiểm tra nút "Xóa vĩnh viễn" trong thùng rác hiện đúng `message` của lỗi `409`, không hiện lỗi chung chung. Đây là chỗ duy nhất đụng FE.

**Test**

- E2E với đơn `IN_PRODUCTION`:
  - Đưa dự án vào thùng rác, rồi `DELETE`: phải trả `409 PROJECT_IN_ACTIVE_ORDER`.
  - `order_items.project_id` vẫn trỏ đến dự án, file xuất vẫn tải được.
  - Chạy `purgeExpiredTrash(now + 31 ngày)`: dự án không bị xóa.
  - Chuyển đơn sang `SHIPPED` rồi chạy lại: dự án bị xóa.
- Lặp lại ca trên với mọi trạng thái trong danh sách Q2.
- Unit hoặc e2e: `findTrashedBefore` không trả dự án đang bị đơn giữ.

**Xong khi:** các test trên đạt, và test thùng rác cùng test ẩn danh hóa hiện có vẫn đạt.

### S5. Khôi phục snapshot và gallery ảnh AI (mục 5, 7) · e2e

**Mục 5**

- `PrismaSnapshotRepository.restore`:
  - Câu `SELECT ... FOR UPDATE` đang tính `same` thì lấy thêm `canvas_state`, `dimensions`, `formula_version`, `thumbnail_key`.
  - Bản sao lưu dựng từ chính các giá trị đó (đã ở dạng lưu trữ).
- Port đổi thành `restore(projectId, snapshot, backupName, fitCheck)`. Service không truyền nội dung canvas nữa.
- API không đổi, FE không đổi.
- Chọn cách này thay vì kiểm phiên bản dự kiến và trả `409`, vì hai lý do:
  - Không phải sửa FE.
  - Khôi phục là thao tác cố ý ghi đè; điều cần giữ là bản sao lưu chứa đúng nội dung vừa bị ghi đè.

**Mục 7**

- Trong `AiGalleryQueryDto`, `before` đổi thành `string` với `@IsPageCursor()`. Cursor dạng ngày trần vẫn được nhận như trước.
- `gallery` dùng helper chung `be/src/common/utils/page-cursor.util.ts`:
  - `where: { job: { userId }, ...olderThan(before) }`,
  - `orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]`,
  - `nextBefore: encodePageCursor(last)`.
- FE: `AiImagePanel` chỉ đọc trang đầu và kiểu `nextBefore` vẫn là `string`, nên FE không đổi.

**Test**

- E2E mục 5:
  1. Spy `findContent` để chạy một `PATCH` (giả lập autosave) trước khi trả kết quả.
  2. Gọi khôi phục.
  3. Bản sao lưu phải chứa đúng canvas vừa autosave, và dự án phải mang canvas của snapshot.
- E2E mục 7 (`ai-images.e2e-spec.ts`):
  - Hai ảnh cùng `createdAt`, gọi với `limit=1`.
  - Trang 1 và trang 2 phải trả hai ID khác nhau.
  - Trang 3 phải rỗng.

**Xong khi:** hai e2e trên đạt.

## 5. Trước khi deploy

- Deploy theo thứ tự: dừng API và worker cũ → `db:deploy` (hai migration của S1, S2) → khởi động bản mới. Nếu bản cũ còn chạy sau khi backfill xong, mỗi lần lưu canvas sẽ xóa lại refs phông.
- Job xuất tạo trước migration có `design = NULL` và vẫn render theo cách cũ. Khi không còn job nào như vậy, có thể bỏ nhánh dự phòng này.

## 6. Nhật ký

| Ngày | Session | Commit | Kết quả |
|---|---|---|---|
| 2026-11-18 | S0 | de2328d (trên `develop`), c691563 | Q1: phần docs/28 commit riêng lên `develop` (de2328d), rồi cắt `fix/be-review-29`; docs/29 và docs/30 ở c691563. Mốc: lint đạt, unit 1166/1166 (77 bộ), e2e 294/294 (24 bộ). |
| 2026-11-18 | S1 | 999823f | SQL gom canvas của dự án và snapshot, lấy key từ `content`, `style.fontUrl`, `customFonts[].url`. Migration `20261118000100_font_file_refs`. 3 e2e mới trong `unused-files` (fail trên SQL cũ). DB local: **0** canvas trỏ tới phông đã mất (chưa canvas nào dùng phông tải lên). e2e cả bộ 296/297: `analytics` quá 5 s một lần, chạy lại riêng thì đạt. |
| 2026-11-18 | S2 | 76eae02 | `request` đọc dự án một lần bằng `FOR UPDATE`; job lưu `project_version` và `design` (migration `20261118000200_export_job_design`). Worker render từ `design`, snapshot tự động cũng lấy từ `design`. Refs tính thêm `design` của job `PENDING`/`PROCESSING`. Hai bước đổi trạng thái có điều kiện. 2 e2e mới (tạm dừng hàng đợi BullMQ để sửa bản B giữa lúc request và lúc render), 5 unit mới. Unit 1171/1171, e2e 299/299. |
| 2026-11-18 | S3 | 58f02f7 | Khóa `pg_advisory_xact_lock(4802, hashtext(userId))` ở nhánh Pro của `fulfil`; namespace khóa gom vào `be/src/common/db/advisory-locks.ts`. 2 e2e mới: làm chậm `PlanService.sync` 150 ms để hai lần xác nhận chắc chắn đan xen; bỏ khóa thì cả hai e2e fail (E + 30 thay vì E + 60, và lỗi index). Unit 1172/1172, e2e 301/301. |
| 2026-11-18 | S4 | 46bc654 | Q2 mặc định. `DELETE` trả `409 PROJECT_IN_ACTIVE_ORDER` kèm mã đơn; `findTrashedBefore` và `deleteTrashed` bỏ qua dự án bị đơn giữ. FE: thêm mã vào nhóm hiện nguyên câu của server; đã xem trên trình duyệt (toast hiện câu kèm mã đơn). Khác plan: e2e lùi `deleted_at` 31 ngày rồi gọi `purgeExpiredTrash()` thay vì gọi với `now + 31 ngày`, để không xóa thùng rác thật của DB local. Test `export` "deletes the exported files" phải chuyển đơn sang `SHIPPED` trước khi xóa. Unit 1174/1174, e2e 304/304. |
| 2026-11-18 | S5 | e2133ce | Bản sao lưu của khôi phục dựng từ dòng đã khóa; port nhận `backupName`. Gallery ảnh AI dùng cursor `(createdAt, id)`, cursor ngày trần vẫn nhận. 2 e2e mới, fail trên code cũ. Unit 1174/1174 (một lần `oauth-state.store.spec` fail rồi đạt khi chạy lại, không liên quan), e2e 306/306. |
| 2026-11-18 | Review vòng 2 | 5bd336d, 3c7c67e | Code review sau S5 tìm thêm 4 lỗi, cả 4 đều đúng. (1) **P1**: `DELETE` gộp điều kiện đơn vào chính câu lệnh; khi chờ khóa, nó vẫn đọc dữ liệu cũ, nên xóa dự án của đơn vừa commit và xóa cả dự án vừa khôi phục. Sửa: khóa dòng bằng `FOR UPDATE` rồi mới đọc trạng thái và đơn; dọn thùng rác dùng `FOR UPDATE SKIP LOCKED`. (2) Hàng đợi quá 3 s: không còn đổi job sang `FAILED`, trả `202` và để `ExportReconcileTask` xử lý sau 10 phút; chỉ lỗi từ chối thật mới đổi `PENDING` sang `FAILED`. (3) Thông báo "file đã sẵn sàng" ghi trong transaction hoàn tất job; sự kiện sau commit chỉ đẩy tín hiệu. (4) Mọi đường sang `FAILED` đi qua `failExport()`, tính lại `project_file_refs` trong cùng transaction. Test viết trước, fail trên code cũ: checkout và xóa xen kẽ theo cả hai thứ tự khóa, khôi phục giữa lúc xóa chờ, dọn thùng rác giữa lúc đặt đơn, Redis nhận job nhưng worker chạy sau mốc timeout (cùng `jobId`, một file, một thông báo), job mất khỏi hàng đợi nhả ảnh. Ca "xóa khóa trước" vốn đã đúng, giữ làm test hồi quy. Unit 1177/1177, e2e 312/312. |
| 2026-11-19 | Review vòng 3 | e7ebed7, 0767368 | Thêm 4 lỗi, cả 4 đều đúng. (1) Chỉ lỗi ioredis báo trước khi gửi (`Stream isn't writeable and enableOfflineQueue options is false`) mới làm job `FAILED` và trả 503. `Connection is closed.` và `MaxRetriesPerRequestError` có thể đến sau khi Redis đã nhận job, nên trả `202`, job vẫn `PENDING`. (2) `syncProjectFileRefs` khóa dòng dự án (`FOR NO KEY UPDATE`) trước khi tính, nên hai lần tính refs của một dự án chạy lần lượt. Mọi đường đổi dữ liệu dự án rồi tính refs đều khóa dòng dự án trước (`failExport`, hoàn tất export, tạo và xóa snapshot). (3) Dọn thùng rác chỉ chuyển file dùng chung cho đúng tập dự án sẽ xóa, nên bản remix bị bỏ qua vẫn nhận được file; trước đây cả lô rollback vì lỗi `23503`. (4) Chuyển file dùng chung và lấy danh sách key nằm trong transaction xóa, sau khi khóa; object S3 xóa sau commit. Test viết trước và fail trên code cũ. Unit 1178/1178, e2e 316/316. |
| 2026-11-19 | Review vòng 4 | 520c5e7 | Thêm 2 lỗi, cả 2 đều đúng. (1) `putGeneratedFile` ghi object lên S3 trước rồi mới ghi `stored_files`. Nếu dự án (hoặc user) bị xóa giữa hai bước, lỗi `P2003` làm object không còn ai liệt kê để dọn. Giờ object bị xóa ngay; lần xóa nào lỗi thì ghi vào `orphaned_objects` để thử lại. Lỗi khác giữ nguyên object, vì có thể đã có dòng trỏ tới nó. (2) Xóa vĩnh viễn và dọn thùng rác chuyển file cho dự án nhận mà không khóa dự án đó. Nếu dự án nhận bị xóa cùng lúc, lỗi `stored_files_project_id_fkey` (hoặc deadlock `40P01`) làm cả transaction rollback. Giờ chạy lại tối đa 3 lần, mỗi lần bằng transaction mới, đọc lại tập dự án và nơi nhận file. Test viết trước và fail trên code cũ. Unit 1180/1180, e2e 318/318. |

Chưa làm: chạy `next lint` của FE (lệnh hỏi cấu hình ESLint, chưa từng cấu hình); FE chỉ kiểm bằng `tsc`.

# 🖥️ @wrapfit/frontend — 2D & 3D Packaging Design Studio

> **Phụ trách chính**: 👤 **IT 1** (Frontend Lead & 2D/3D Packaging Studio)  
> **Tech Stack**: Next.js 14 (App Router), React Three Fiber / Three.js, GSAP 3, Tailwind CSS, Lucide Icons.

---

## Cấu trúc thư mục `fe/`:

Theo mẫu [Windaroundd/react-structure](https://github.com/Windaroundd/react-structure), chỉnh cho Next.js App Router:
`src/pages/` của mẫu đổi thành `src/views/` (Next.js dành tên `pages/` cho Pages Router), còn `src/app/` chỉ giữ routing.

```text
fe/
├── src/
│   ├── app/                    # Next.js App Router: CHỈ routing — page.tsx mỏng, metadata, layout.tsx
│   ├── views/                  # (≈ pages/ của mẫu) UI từng màn hình, cùng cây thư mục với route
│   │   ├── home/               #   /               Landing page
│   │   ├── editor/studio/      #   /editor/[id]    Studio 2D + 3D
│   │   ├── unbox/              #   /unbox/[slug]   Trang mở hộp 3D QR
│   │   └── …                   #   admin/, auth/, checkout/, dashboard/… (đa số sinh từ Stitch)
│   ├── api/                    # Hàm gọi endpoint, mỗi module backend một thư mục
│   │   ├── projects/ ai/ exports/ storage/ unboxing/
│   │   ├── auth/ users/ common/
│   │   └── index.ts            #   `apiClient` gom mọi endpoint
│   ├── assets/
│   │   ├── fonts/              # next/font (Playfair, Plus Jakarta Sans, JetBrains Mono)
│   │   ├── styles/             # globals.css + stitch/ (CSS sinh từ Stitch)
│   │   ├── icons/ images/
│   ├── components/             # Component dùng chung, không thuộc tính năng nào
│   │   ├── common/             #   GoiMascot, Button
│   │   ├── layout/             #   BottomNavBar
│   │   ├── modals/             #   MobileBottomSheet
│   │   ├── charts/ forms/
│   ├── config/                 # Biến môi trường (API_BASE_URL)
│   ├── constants/
│   ├── features/               # Code theo tính năng
│   │   ├── studio/             #   components/{canvas,three,fitcheck,copilot}, utils/
│   │   ├── intro/              #   BlueprintIntro
│   │   ├── stitch/             #   runtime + behaviors của màn hình Stitch
│   │   └── auth/ dashboard/ profile/ settings/
│   ├── helpers/
│   ├── hooks/                  # data/ dom/ shared/ ui/
│   ├── layouts/                # main/ (MainLayout dùng trong app/layout.tsx), admin/, auth/
│   ├── services/               # api/ (HTTP client, ApiError), audio/ (tactileAudio), analytics/, storage/
│   ├── store/                  # actions/ reducers/ selectors/ slices/
│   ├── types/                  # api/ (DTO của backend), components/, store/
│   └── utils/                  # animation/ text-layout/ formatting/ helpers/ validation/
├── stitch/                     # Nguồn HTML Stitch (xem docs/11_STITCH_PARITY_AUDIT.md)
├── scripts/stitch/             # Generator `npm run stitch:sync`
├── package.json
└── tailwind.config.ts
```

Quy tắc:
- Route mới: tạo UI trong `src/views/<route>/index.tsx`, rồi `src/app/<route>/page.tsx` chỉ re-export (`export { default } from '@/views/<route>'`).
- Component chỉ một tính năng dùng thì đặt trong `src/features/<tính năng>/components/`; dùng ở nhiều nơi thì đặt trong `src/components/`.
- Thư mục chỉ có `index.ts` rỗng là khung chờ code, giữ theo mẫu.

## Chạy cùng backend

Trình duyệt chỉ gọi `/api` trên cùng địa chỉ với trang (cookie phiên là first-party); `next.config.mjs` chuyển `/api/*`
sang `BACKEND_INTERNAL_URL` (mặc định `http://localhost:8080`). Biến môi trường: [`.env.example`](.env.example).

Từ thư mục gốc repo:

```bash
docker compose up -d postgres redis seaweedfs storage-init mailpit
npm install
npm run build:shared                          # backend đọc shared/dist
npm --workspace=be run db:migrate && npm --workspace=be run db:seed
npm run dev:be                                # API http://localhost:8080/api, Swagger /api/docs
npm --workspace=be run dev:worker             # gửi email, xuất file in
npm run dev:fe                                # http://localhost:3000
```

- Email (xác nhận, quên mật khẩu) nằm ở Mailpit `http://localhost:8025`; cần worker thì email mới đi.
- Tài khoản admin seed: `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` trong `be/.env`.
- Mọi request qua proxy Next nên backend thấy cùng một IP: chạy thử liên tục có thể gặp `429` (100 request / phút / IP,
  docs/12 R7). Trang báo "Bạn thao tác quá nhanh", đợi một phút là được.
- Đang chạy `npm run dev:be` (`nest start --watch`) thì đừng chạy `npm --workspace=be run build`: lệnh build xoá
  `be/dist` dưới tiến trình đang chạy và API dừng.
- Chỉ xem giao diện, không cần backend: `/editor/demo` chạy offline; các trang khác hiện lỗi kèm mã `requestId`.

## Kiểm thử trên trình duyệt

Các script dưới đây chạy Chrome headless (cần FE, BE, worker, Mailpit đang chạy), ảnh và `report.json` ghi vào
`fe/.page-shots/` (không commit):

| Lệnh | Việc |
|---|---|
| `node fe/scripts/ui-fixtures.mjs` (`--clean` để xoá) | Dữ liệu thử cho `shots --routes` |
| `npm --workspace=fe run shots -- /dashboard --sizes=M,X+ --login=<email>` | Chụp trang ở đủ độ phân giải, kiểm tràn ngang, ảnh lỗi, request lỗi… (docs/13) |
| `npm --workspace=fe run shots -- --routes --group=G7 --table` | Quét danh sách route của `scripts/page-shots.routes.json` |
| `node fe/scripts/e2e-scenario.mjs` | Kịch bản end-to-end docs/12 §7 (bước 1–14) ở 375 px và 1440 px, mỗi kích thước một tài khoản mới (xoá khi xong) |
| `node fe/scripts/e2e-scenario.mjs --steps=15 --backend-down` | Bước 15, khi backend đã tắt |
| `npm --workspace=fe run stitch:parity` | So pixel các màn Stitch `converted` với bản gốc (mốc ở docs/13 §2.3) |

`next build` khi `next dev` đang chạy (cùng ghi `.next`): build trong một bản sao tạm của `fe/` (xem docs/12 §9.3, S9).

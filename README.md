# 🎁 WrapFit Platform — Make Every Present, Present.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Framework: Next.js](https://img.shields.io/badge/Framework-Next.js%2014-black?logo=next.js)](https://nextjs.org/)
[![3D Engine: Three.js](https://img.shields.io/badge/3D%20Engine-Three.js-blue?logo=three.js)](https://threejs.org/)
[![Animation: GSAP](https://img.shields.io/badge/Motion-GSAP%203-88CE02?logo=greensock)](https://greensock.com/)
[![Project: EXE101](https://img.shields.io/badge/Academic-EXE101%20FPT%20University-orange)](https://fpt.edu.vn/)

> **WrapFit** là nền tảng đóng gói quà tặng thông minh & cá nhân hóa (*Packaging Personalization & Intelligence Platform*). Chúng tôi giải quyết bài toán bao bì sản xuất số lượng ít (micro-batch) bằng cách biến quy trình thiết kế thành luồng làm việc tham số hóa chuẩn xác, hỗ trợ mô phỏng gập 3D tương tác và xuất file vector sẵn sàng in ấn/cắt bế thực tế.

---

## 📌 Bối cảnh & Nỗi đau thị trường (The Problem)

- **MOQ & Chi phí khuôn bế quá cao**: Các shop quà tặng handmade và cá nhân muốn đặt hộp riêng thường bị xưởng in từ chối do số lượng tối thiểu (thường từ 500 - 1.000 hộp) hoặc chi phí làm khuôn dao bế riêng dao động từ 1.500.000đ - 2.000.000đ (1,5 - 2 triệu đồng)/kích thước.
- **Công cụ thiết kế 2D "mù" về vật lý bao bì**: Các phần mềm như Canva hay Photoshop không hiểu đường cấn gấp (crease line), mép dán (glue flap) hay độ co giãn của vật liệu (GSM/caliper), dẫn đến việc file thiết kế đẹp trên màn hình nhưng khi in và bế ra thực tế bị rách, lệch khớp hoặc đứt chữ.

---

## ✨ Tính Năng Đột Phá (Core Moat)

### 1. 📐 Parametric Dieline Engine (Động cơ Tham số hóa Bản vẽ Bế)
- Thay vì sử dụng template cố định, hệ thống tự động tính toán tọa độ vector của toàn bộ các mặt hộp, tai nắp, mép dán theo hàm số toán học dựa trên kích thước thật:
  $$\text{Tọa độ nếp gấp} = f(\text{Dài } L, \text{Rộng } W, \text{Cao } H, \text{Độ dày giấy } t)$$

### 2. 🧊 3D Fold Simulation (Mô phỏng Gập hộp 3D bằng Three.js & GSAP)
- Chuyển đổi mượt mà giữa mặt phẳng 2D và không gian 3D.
- Diễn hoạt chuỗi hoạt ảnh gập nắp hộp tuần tự với độ đàn hồi vật lý chân thực.
- Xem trước trực quan góc nhìn $360^\circ$ khi đặt món quà vào bên trong.

### 3. 🛡️ FitCheck™ Engine (Kiểm duyệt Rủi ro In ấn & Gập)
- **Safe Margin Check**: Cảnh báo tức thì nếu logo/văn bản nằm cách đường cấn gấp $< 3\text{mm}$.
- **Bleed Validation**: Đảm bảo vùng tràn lề màu nền tối thiểu $2\text{mm}$ chống lộ viền trắng khi xén.
- **DPI Resolution Check**: Cảnh báo ảnh đầu vào có độ phân giải $< 200\text{ DPI}$.

### 4. 🖨️ Production-Ready Vector Export
- Xuất file chuẩn in ấn vector đa lớp (PDF, SVG, DXF) phân tách rõ ràng:
  - 🔴 **Nét cắt (Cut line)**
  - 🔵 **Nét cấn gấp (Crease / Score line)**
  - 🟢 **Vùng tràn lề (Bleed line)**
  - 🎨 **Lớp đồ họa CMYK 300 DPI**

---

## 📁 Cấu Trúc Mã Nguồn (Project Structure)

Dự án được tổ chức rõ ràng theo 3 module độc lập giúp 3 IT làm việc song song:

```text
WrapFit/
├── fe/                 # FRONTEND STUDIO (Next.js 14, Three.js, GSAP) — Phụ trách: IT 1
├── be/                 # BACKEND API (NestJS 11, Prisma, PostgreSQL) — Phụ trách: IT 3 (xem be/README.md)
├── shared/             # PACKAGING PHYSICS & TYPES (Parametric Math, FitCheck) — Phụ trách: IT 2
└── .agents/            # AI AGENT SKILLS & RUNBOOKS
```

---

## 🛠️ Công Nghệ Phát Triển (Tech Stack)

| Lớp kiến trúc | Công nghệ sử dụng | Mục đích |
| :--- | :--- | :--- |
| **Frontend** | Next.js (App Router), React, Tailwind CSS | Giao diện Web Editor & Landing Page |
| **2D Canvas** | Paper.js / Fabric.js / SVG.js | Trình biên tập kéo thả đồ họa vector 2D |
| **3D Rendering** | Three.js / React Three Fiber | Render khối hộp và texture thời gian thực |
| **Motion & UX** | GSAP (Timeline, ScrollTrigger, Flip) | Diễn hoạt gập nắp hộp & Landing Page |
| **Backend & Data**| NestJS 11, Prisma, PostgreSQL, Redis + BullMQ (process worker), S3 / Cloudflare R2 | REST API dự án, tài khoản, Cloud Storage; worker xuất file in & gửi email. Mã nguồn theo skeleton [nestjs-project-structure](https://github.com/CatsMiaow/nestjs-project-structure) (`be/README.md`; kiến trúc: `docs/07` Mục 1, `docs/08`) |
| **AI Integration** | Model Context Protocol (MCP), LLM APIs | Gợi ý Theme hoa văn & Hỗ trợ FitCheck |

---

## 🚀 Hướng Dẫn Cài Đặt & Khởi Chạy (Getting Started)

### Cách 1: Khởi chạy toàn bộ hệ thống bằng Docker (Khuyên dùng) 🐳
Chỉ với 1 lệnh duy nhất tại thư mục gốc, Docker sẽ tự động dựng và khởi chạy 3 dịch vụ: PostgreSQL 16, Backend API và Frontend Studio:

```bash
# Đứng tại thư mục gốc WrapFit
cp .env.example .env   # BẮT BUỘC điền JWT_ACCESS_SECRET và JWT_REFRESH_SECRET (>= 32 ký tự)
docker compose up --build
```

- **Frontend Studio**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:8080/api](http://localhost:8080/api)
- **API Docs (Swagger)**: [http://localhost:8080/api/docs](http://localhost:8080/api/docs)
- **API Health Check**: [http://localhost:8080/api/health](http://localhost:8080/api/health)
- **PostgreSQL**: `localhost:5432` (user: `postgres`, password: `password`, db: `wrapfit`)

*(Để dừng toàn bộ containers, nhấn `Ctrl + C` hoặc chạy `docker compose down`)*.

---

### Cách 2: Khởi chạy thủ công qua Node.js (Local Development)

### Yêu cầu tiên quyết:
- **Node.js**: Phiên bản `>= 20.x`
- **npm** (v10+)

```bash
# 1. Clone repository
git clone https://github.com/ptuoof/WrapFit.git
cd WrapFit

# 2. Cài đặt các gói phụ thuộc
npm install

# 3. Chạy PostgreSQL + lưu trữ file (SeaweedFS) và chuẩn bị database cho backend
docker compose up -d postgres seaweedfs storage-init
cp be/.env.example be/.env          # đổi JWT_ACCESS_SECRET / JWT_REFRESH_SECRET
npm --workspace=be run db:generate
npm --workspace=be run db:migrate
npm --workspace=be run db:seed

# 4. Biên dịch shared library & chạy đồng thời FE + BE
npm run build:shared
npm run dev:be & npm run dev:fe
```

Chi tiết backend (API, auth, test, thêm module): xem [`be/README.md`](be/README.md).

---

## 👥 Đội Ngũ Phát Triển (Project Team — EXE101 FA26)

- **Quy mô đội ngũ**: 6 thành viên (3 IT, 2 Kinh Tế, 1 Marketing)
- **Môn học**: EXE101 - Khởi nghiệp đổi mới sáng tạo (FPT University)
- **Slogan**: *"Make Every Present, Present."*

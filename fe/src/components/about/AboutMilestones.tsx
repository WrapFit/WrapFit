"use client";

import { Calendar, CheckCircle2, Flag, Layers, Rocket, Sparkles, TrendingUp, Users } from "lucide-react";
import React from "react";
import { Container, Reveal } from "@/components/landing";

interface Milestone {
  time: string;
  quarter: string;
  title: string;
  badge: string;
  description: string;
  achievements: string[];
  icon: typeof Rocket;
  highlight?: boolean;
}

const MILESTONES: Milestone[] = [
  {
    time: "Tháng 03/2026",
    quarter: "Q1 2026",
    title: "Khởi động dự án WrapFit tại Đại học FPT",
    badge: "Genesis",
    description:
      "Dự án được ươm mầm trong khuôn khổ bộ môn Khởi nghiệp EXE101 tại Đại học FPT, xuất phát từ thực tế phỏng vấn hơn 50 chủ shop thủ công và phát hiện rào cản tiền khuôn bế 2.000.000 VNĐ.",
    achievements: [
      "Thành lập đội ngũ sáng lập 6 thành viên đa ngành",
      "Xác thực nhu cầu bao bì từ 50+ xưởng nến thơm & thủ công",
      "Định hình triết lý: 'Make Every Present, Present'",
    ],
    icon: Flag,
  },
  {
    time: "Tháng 05/2026",
    quarter: "Q2 2026",
    title: "Ra mắt Engine CAD Parametric Dieline thế hệ 1",
    badge: "CAD Engine",
    description:
      "Phát triển thành công thuật toán toán học suy biến tọa độ bản vẽ 2D từ 4 thông số vật lý (L, W, H, t). Hỗ trợ chuẩn mực 4 kết cấu hộp tiêu chuẩn bán chạy nhất.",
    achievements: [
      "Hộp nắp gài đáy khóa (Tuck Top Box)",
      "Hộp bao diêm kéo rút (Sleeve & Drawer Box)",
      "Hộp âm dương cao cấp (Lid & Base Box)",
      "Hộp gối phụ kiện (Pillow Box)",
    ],
    icon: Layers,
  },
  {
    time: "Tháng 07/2026",
    quarter: "Q3 2026",
    title: "Tích hợp 3D WebGL Origami & Hệ thống FitCheck™",
    badge: "3D & Quality",
    description:
      "Người dùng có thể gập mở hộp ảo 3D 360 độ ngay trên trình duyệt với cơ chế haptic audio xúc giác. Đồng thời, công cụ FitCheck™ tự động rà soát sai sót in ấn trước khi xuất xưởng.",
    achievements: [
      "Mô phỏng gập mở 3D chân thực thời gian thực",
      "FitCheck™ cảnh báo vùng an toàn 3mm & bleed tràn lề 2mm",
      "Khai sinh Bé Gói (AI Copilot thông minh)",
    ],
    icon: Sparkles,
  },
  {
    time: "Tháng 09/2026",
    quarter: "Q3 2026",
    title: "Ký kết đối tác xưởng cắt phẳng kỹ thuật số (Zero MOQ)",
    badge: "Supply Chain",
    description:
      "Hợp tác chiến lược với 3 xưởng in sở hữu máy cắt phẳng kỹ thuật số tại Hà Nội & TP.HCM, biến cam kết 'Không cần khuôn bế — Đặt in từ 20 hộp' thành hiện thực.",
    achievements: [
      "Xuất file PDF CMYK 300 DPI phân tách lớp dao bế",
      "Quy trình kiểm soát chất lượng màu và độ chuẩn cấn nếp",
      "Rút ngắn thời gian nhận hàng xuống còn 48 - 72 giờ",
    ],
    icon: CheckCircle2,
  },
  {
    time: "Tháng 10/2026",
    quarter: "Q4 2026",
    title: "Vượt mốc 427+ Waitlist & Mở rộng 3D QR Unboxing",
    badge: "Traction",
    description:
      "Cộng đồng nhà sáng tạo đón nhận nồng nhiệt với 427+ lượt đăng ký Waitlist sớm. Bổ sung tính năng QR thông minh trên nắp hộp để người nhận mở hộp 3D ảo và nghe lời chúc âm thanh.",
    achievements: [
      "Hơn 427+ boutique & nghệ nhân tham gia hàng chờ",
      "Trải nghiệm 3D Virtual Unboxing qua mã QR độc bản",
      "Chuẩn bị phát hành phiên bản Public Beta trên toàn quốc",
    ],
    icon: TrendingUp,
    highlight: true,
  },
];

const TRACTION_STATS = [
  { value: "427+", label: "Nhà sáng tạo trong Waitlist", sub: "Boutique & nghệ nhân toàn quốc" },
  { value: "Zero MOQ", label: "Sản xuất từ 20 chiếc", sub: "Không mất 2 triệu tiền khuôn bế" },
  { value: "100%", label: "Khả thi sản xuất", sub: "FitCheck™ rà soát tự động" },
  { value: "300 DPI", label: "Vector CMYK chuẩn in", sub: "Tách lớp CutContour & Crease" },
];

export function AboutMilestones() {
  return (
    <section className="bg-white py-14 lg:py-24 border-t border-line/70">
      <Container>
        {/* Header */}
        <div className="mx-auto max-w-4xl text-center mb-14">
          <span className="text-xs font-bold uppercase tracking-wider text-fpt-orange-ink">
            Dấu ấn tăng trưởng (Milestones & Traction)
          </span>
          <h2 className="font-landing-heading text-2xl sm:text-4xl lg:text-5xl font-bold text-fg mt-2">
            Hành Trình Hiện Thực Hóa Từng Chiếc Hộp
          </h2>
          <p className="mt-3 text-sm sm:text-base text-fg-muted max-w-2xl mx-auto leading-relaxed">
            Từ ý tưởng trên giảng đường Đại học FPT đến nền tảng thiết kế bao bì thông minh được đón nhận bởi hàng trăm người sáng tạo độc lập.
          </p>
        </div>

        {/* Traction Stats Banner */}
        <div className="mx-auto max-w-5xl grid grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          {TRACTION_STATS.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-line/90 bg-surface-sunken/70 p-5 text-center shadow-soft-4 transition-all hover:bg-white hover:shadow-soft-12"
            >
              <span className="block font-mono text-2xl sm:text-3xl font-bold text-fg text-fpt-blue">
                {stat.value}
              </span>
              <span className="mt-1 block text-xs sm:text-sm font-bold text-fg">
                {stat.label}
              </span>
              <span className="text-caption text-fg-muted block mt-0.5">
                {stat.sub}
              </span>
            </div>
          ))}
        </div>

        {/* Timeline */}
        <div className="mx-auto max-w-4xl relative">
          {/* Vertical Center Line for desktop */}
          <div className="hidden md:block absolute left-1/2 top-4 bottom-4 -translate-x-1/2 w-0.5 bg-line/60" />

          <div className="space-y-8 sm:space-y-12">
            {MILESTONES.map((m, index) => {
              const isEven = index % 2 === 0;
              const Icon = m.icon;

              return (
                <div
                  key={m.title}
                  className={`relative flex flex-col md:flex-row items-center gap-6 ${
                    isEven ? "md:flex-row-reverse" : ""
                  }`}
                >
                  {/* Center Node Icon */}
                  <div className="hidden md:flex absolute left-1/2 top-6 -translate-x-1/2 size-10 items-center justify-center rounded-full bg-white border-2 border-fpt-orange shadow-soft-8 z-10 text-fpt-orange-ink">
                    <Icon className="size-4" />
                  </div>

                  {/* Content Card */}
                  <div className="w-full md:w-[calc(50%-2rem)]">
                    <div
                      className={`rounded-3xl border p-6 sm:p-7 shadow-soft-8 transition-all hover:shadow-soft-16 ${
                        m.highlight
                          ? "border-fpt-orange bg-gradient-to-br from-fpt-orange-light/40 via-white to-warning-bg/30 ring-1 ring-fpt-orange/30"
                          : "border-line/90 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-fpt-orange-ink">
                            {m.time}
                          </span>
                          <span className="text-white/75">•</span>
                          <span className="text-xs font-medium text-fg-muted">
                            {m.quarter}
                          </span>
                        </div>
                        <span className="rounded-full bg-surface-sunken px-2.5 py-0.5 text-caption font-bold text-fg-muted uppercase">
                          {m.badge}
                        </span>
                      </div>

                      <h3 className="font-landing-heading text-lg sm:text-xl font-bold text-fg mb-2">
                        {m.title}
                      </h3>

                      <p className="text-xs sm:text-sm text-fg-muted leading-relaxed mb-4">
                        {m.description}
                      </p>

                      <div className="space-y-1.5 pt-3 border-t border-line/60">
                        {m.achievements.map((item) => (
                          <div key={item} className="flex items-start gap-2 text-xs text-fg-muted">
                            <CheckCircle2 className="size-3.5 text-success-fg shrink-0 mt-0.5" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Spacer for other half */}
                  <div className="hidden md:block w-[calc(50%-2rem)]" />
                </div>
              );
            })}
          </div>
        </div>
      </Container>
    </section>
  );
}

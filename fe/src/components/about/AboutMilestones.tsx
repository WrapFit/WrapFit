"use client";

import { CheckCircle2, Flag, Layers, Rocket, Sparkles, TrendingUp } from "lucide-react";
import React from "react";
import { Container } from "@/components/landing";

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
    quarter: "Quý 1/2026",
    title: "Khởi động tại Đại học FPT",
    badge: "Khởi đầu",
    description: "Phỏng vấn hơn 50 chủ shop thủ công về khó khăn khi làm hộp.",
    achievements: ["Lập nhóm 6 thành viên", "Xác định khẩu hiệu 'Make Every Present,  Present'"],
    icon: Flag,
  },
  {
    time: "Tháng 05/2026",
    quarter: "Quý 2/2026",
    title: "Ra mắt bộ dựng khuôn bế",
    badge: "Khuôn bế",
    description: "Khuôn 2D tự sinh từ dài, rộng, cao và độ dày giấy.",
    achievements: ["Hộp nắp gài,  bao diêm,  âm dương", "Hộp gối"],
    icon: Layers,
  },
  {
    time: "Tháng 07/2026",
    quarter: "Quý 3/2026",
    title: "Xem 3D và FitCheck™",
    badge: "3D & kiểm tra",
    description: "Gập mở hộp 3D trên trình duyệt, soát lỗi in tự động.",
    achievements: ["Gập mở 3D thời gian thực", "Ra mắt trợ lý Gói"],
    icon: Sparkles,
  },
  {
    time: "Tháng 09/2026",
    quarter: "Quý 3/2026",
    title: "Kết nối xưởng cắt kỹ thuật số",
    badge: "Sản xuất",
    description: "In từ 20 hộp, không cần khuôn dao.",
    achievements: ["Xuất PDF CMYK 300 DPI tách lớp", "Nhận hàng sau 48–72 giờ"],
    icon: CheckCircle2,
  },
  {
    time: "Tháng 10/2026",
    quarter: "Quý 4/2026",
    title: "Hơn 427 người đăng ký sớm",
    badge: "Tăng trưởng",
    description: "Thêm mã QR trên nắp để người nhận mở hộp 3D.",
    achievements: ["Mở quà 3D qua mã QR", "Chuẩn bị bản thử nghiệm công khai"],
    icon: TrendingUp,
    highlight: true,
  },
];

const TRACTION_STATS = [
  { value: "427+", label: "Đăng ký sớm", sub: "Shop và nghệ nhân" },
  { value: "20 hộp", label: "In tối thiểu", sub: "Không cần khuôn dao" },
  { value: "100%", label: "In được", sub: "Nhờ FitCheck™" },
  { value: "300 DPI", label: "File in CMYK", sub: "Tách lớp sẵn" },
];

export function AboutMilestones() {
  return (
    <section className="bg-white py-14 lg:py-24 border-t border-line/70">
      <Container>
        {/* Header */}
        <div className="mx-auto max-w-4xl text-center mb-14">
          <span className="text-xs font-bold uppercase tracking-wider text-fpt-orange-ink">
            Chặng đường
          </span>
          <h2 className="font-landing-heading text-2xl sm:text-4xl lg:text-5xl font-bold text-fg mt-2">
            Hành trình của WrapFit
          </h2>
          <p className="mt-3 text-sm sm:text-base text-fg-muted max-w-2xl mx-auto leading-relaxed">
            Từ giảng đường Đại học FPT đến tay người làm quà.
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
                            <CheckCircle2 className="size-3.5 text-fpt-orange shrink-0 mt-0.5" />
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

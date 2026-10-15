"use client";

import { CheckCircle2, Heart, Layers, Leaf, Ruler, ShieldCheck, Sparkles } from "lucide-react";
import React from "react";
import { Container, Reveal } from "@/components/landing";
import { cn } from "@/utils/helpers";

const CORE_VALUES = [
  {
    icon: Ruler,
    title: "Chính xác tuyệt đối (CAD Precision 1:1)",
    description:
      "Mọi panel, nắp gài, tai khóa và khe cấn đều được tự động tính toán dựa trên kích thước thật của món quà và độ dày giấy thực tế (250–350 GSM). Tuyệt đối không dùng bản vẽ mockup tĩnh.",
    tag: "Chuẩn milimét",
    color: "bg-info-bg text-info-fg border-info/60",
  },
  {
    icon: ShieldCheck,
    title: "100% Khả thi sản xuất (FitCheck™)",
    description:
      "Tự động rà soát vùng an toàn (≥3mm), tràn lề (bleed ≥2mm), độ phân giải ảnh (≥200 DPI) và bảo đảm chữ/logo không đè lên nếp gấp hay tai dán keo. File xuất ra xưởng in nhận là in được ngay.",
    tag: "Kiểm định tự động",
    color: "bg-fpt-orange-light text-fpt-orange-ink border-fpt-orange/60",
  },
  {
    icon: Leaf,
    title: "Bền vững & Zero MOQ (Không lãng phí)",
    description:
      "Hộp vừa khít là hộp bền vững nhất: không thừa giấy, không cần nhồi xốp hay rơm lót. Nhờ kết nối với bàn cắt kỹ thuật số phẳng, chúng tôi xóa bỏ rào cản tiền khuôn, nhận sản xuất từ 20 hộp.",
    tag: "Bảo vệ môi trường",
    color: "bg-success-bg text-success-fg border-success/60",
  },
  {
    icon: Heart,
    title: "Nâng niu cảm xúc người nhận (3D QR)",
    description:
      "Bao bì không chỉ là chiếc vỏ bảo vệ mà là nơi thăng hoa tình cảm. Người nhận quà quét mã QR in trên nắp hộp để mở chiếc hộp 3D ảo và đọc lời chúc cá nhân hóa đầy xúc động.",
    tag: "Chạm tới cảm xúc",
    color: "bg-danger-bg text-danger-fg border-danger/60",
  },
];

export function AboutMissionValues() {
  return (
    <section className="bg-landing-canvas py-14 lg:py-24 border-t border-line/70">
      <Container>
        {/* Mission Banner */}
        <div className="relative overflow-hidden rounded-card sm:rounded-card-lg bg-landing-green-night px-6 py-14 sm:px-12 sm:py-20 text-center shadow-soft-16 text-white mb-16">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 size-60 rounded-full bg-success/10 blur-3xl pointer-events-none" />
          <div className="mx-auto max-w-3xl flex flex-col items-center">
            <span className="text-xs font-mono font-bold tracking-widest uppercase text-landing-lime mb-3">
              Tuyên ngôn sứ mệnh
            </span>

            <h2 className="font-landing-heading text-3xl sm:text-5xl font-bold tracking-tight">
              &ldquo;Make Every Present, Present.&rdquo;
            </h2>

            <p className="mt-4 text-base sm:text-lg text-landing-lime-mist leading-relaxed max-w-2xl">
              Sứ mệnh của WrapFit là dân chủ hóa ngành thiết kế và sản xuất bao bì cá nhân hóa tại Việt Nam. Chúng tôi tin rằng bất kỳ người sáng tạo nào, dù kinh doanh quy mô nhỏ nhất, cũng xứng đáng sở hữu những chiếc hộp đóng gói tinh tế và chuyên nghiệp như những thương hiệu hàng đầu.
            </p>
          </div>
        </div>

        {/* Core Values Section */}
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-fpt-orange-ink">
              Triết lý hoạt động
            </span>
            <h3 className="font-landing-heading text-2xl sm:text-4xl font-bold text-fg mt-1">
              4 Giá Trị Cốt Lõi Định Hình WrapFit
            </h3>
            <p className="mt-2 text-sm sm:text-base text-fg-muted max-w-xl mx-auto">
              Mọi tính năng, quyết định kỹ thuật và quan hệ hợp tác xưởng in của WrapFit đều được dẫn dắt bởi 4 nguyên tắc bất biến:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 lg:gap-6">
            {CORE_VALUES.map((val) => {
              const Icon = val.icon;
              return (
                <div
                  key={val.title}
                  className="rounded-3xl border border-line/90 bg-white p-6 sm:p-7 shadow-soft-8 transition-all hover:shadow-soft-16 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex size-11 items-center justify-center rounded-2xl bg-surface-sunken text-fg">
                        <Icon className="size-5" />
                      </div>
                      <span className={cn("rounded-full px-2.5 py-0.5 text-caption font-semibold border", val.color)}>
                        {val.tag}
                      </span>
                    </div>

                    <h4 className="font-landing-heading text-lg sm:text-xl font-bold text-fg mb-2">
                      {val.title}
                    </h4>

                    <p className="text-xs sm:text-sm text-fg-muted leading-relaxed">
                      {val.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Container>
    </section>
  );
}

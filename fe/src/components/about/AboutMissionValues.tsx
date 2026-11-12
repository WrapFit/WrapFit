"use client";

import { Heart, Leaf, Ruler, ShieldCheck } from "lucide-react";
import React from "react";
import { Container } from "@/components/landing";

const CORE_VALUES = [
  {
    icon: Ruler,
    title: "Chính xác từng milimét",
    description: "Khuôn bế tính từ kích thước thật của món quà và độ dày giấy.",
  },
  {
    icon: ShieldCheck,
    title: "In được ngay",
    description: "FitCheck™ soát lỗi trước khi in, xưởng nhận file là chạy máy.",
  },
  {
    icon: Leaf,
    title: "Không lãng phí",
    description: "Hộp vừa khít, không nhồi lót, in từ 20 hộp.",
  },
  {
    icon: Heart,
    title: "Chạm tới cảm xúc",
    description: "Người nhận quét QR để mở hộp 3D và đọc lời chúc.",
  },
];

export function AboutMissionValues() {
  return (
    <section className="bg-landing-canvas py-14 lg:py-24 border-t border-line/70">
      <Container>
        {/* Core Values Section */}
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-fpt-orange-ink">
              Triết lý hoạt động
            </span>
            <h3 className="font-landing-heading text-2xl sm:text-4xl font-bold text-fg mt-1">
              Giá trị cốt lõi
            </h3>
            <p className="mt-2 text-sm sm:text-base text-fg-muted max-w-xl mx-auto">
              Bốn điều dẫn lối mọi tính năng của WrapFit.
            </p>
          </div>

          {/* One block split by hairlines instead of four floating cards. */}
          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-3xl bg-line/70 ring-1 ring-line/70 sm:grid-cols-2">
            {CORE_VALUES.map((val) => {
              const Icon = val.icon;
              return (
                <div
                  key={val.title}
                  className="group flex flex-col justify-between bg-white p-6 transition-colors hover:bg-surface-sunken/50 sm:p-7"
                >
                  <div>
                    <div className="mb-4">
                      <div className="flex size-11 items-center justify-center rounded-2xl bg-surface-sunken text-fg-muted transition-colors group-hover:bg-fpt-orange-light group-hover:text-fpt-orange-ink">
                        <Icon className="size-5" />
                      </div>
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

"use client";

import { ArrowRight, Box, Check, MessageSquare, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import React from "react";
import { Container } from "@/components/landing";
import { GoiMascot } from "@/components/common/GoiMascot";

export function AboutCta() {
  return (
    <section className="bg-gradient-to-b from-landing-canvas to-white py-16 lg:py-28">
      <Container>
        <div className="relative overflow-hidden rounded-[2.5rem] bg-stone-900 px-6 py-14 sm:px-12 sm:py-20 text-white shadow-soft-24">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-1/4 -mt-16 size-80 rounded-full bg-[#F26522]/15 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 -mb-16 size-80 rounded-full bg-[#005CA9]/20 blur-3xl pointer-events-none" />

          <div className="relative z-10 mx-auto max-w-4xl text-center flex flex-col items-center">
            {/* Mascot Copilot Greeting */}
            <div className="mb-6 flex flex-col sm:flex-row items-center gap-3 rounded-full bg-white/10 backdrop-blur-md px-5 py-2 border border-white/15">
              <div className="size-8 flex items-center justify-center">
                <GoiMascot pose="waving" size={32} />
              </div>
              <span className="text-xs sm:text-sm font-medium text-stone-200 text-center">
                Bé Gói: &ldquo;Bạn đã sẵn sàng tạo chiếc hộp độc bản cho món quà của mình chưa?&rdquo;
              </span>
            </div>

            <h2 className="font-landing-heading text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight">
              Bắt Đầu Tạo Chiếc Hộp <br className="hidden sm:inline" />
              <span className="text-[#F26522]">Vừa Khít Món Quà</span> Của Bạn
            </h2>

            <p className="mt-4 text-base sm:text-xl text-stone-300 max-w-2xl leading-relaxed">
              Trải nghiệm thiết kế 3D trực quan, kiểm tra dung sai với FitCheck™ và đặt in từ 20 chiếc hộp không tốn tiền khuôn bế ngay hôm nay.
            </p>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
              {/* Primary CTA */}
              <Link
                href="/editor/new"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-2xl bg-[#F26522] px-8 py-4 text-base font-bold text-white shadow-soft-16 hover:bg-[#d85516] transition-all hover:scale-105"
              >
                <Box className="size-5" />
                Vào Studio Thiết Kế 3D
                <ArrowRight className="size-4" />
              </Link>

              {/* Secondary CTA: Waitlist */}
              <Link
                href="/waitlist"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-2xl bg-white/10 backdrop-blur-md px-7 py-4 text-base font-semibold text-white border border-white/20 hover:bg-white/20 transition-all"
              >
                <Users className="size-5 text-emerald-400" />
                Gia Nhập Waitlist (427+ chờ)
              </Link>

              {/* Tertiary CTA: Contact */}
              <Link
                href="/contact"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-transparent px-5 py-4 text-sm font-medium text-stone-300 hover:text-white transition-colors"
              >
                <MessageSquare className="size-4" />
                Liên hệ đội ngũ
              </Link>
            </div>

            {/* Reassurances */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-stone-400">
              <span className="inline-flex items-center gap-1.5">
                <Check className="size-4 text-emerald-400" />
                Hoàn toàn miễn phí thiết kế
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="size-4 text-emerald-400" />
                Không cần cài đặt phần mềm
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="size-4 text-emerald-400" />
                Sản xuất tối thiểu từ 20 hộp
              </span>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

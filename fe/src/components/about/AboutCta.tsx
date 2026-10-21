"use client";

import { ArrowRight, Box, Check, MessageSquare } from "lucide-react";
import Link from "next/link";
import React from "react";
import { Container } from "@/components/landing";
import { GoiMascot } from "@/components/common/GoiMascot";
import { buttonClass } from "@/components/ui";

export function AboutCta() {
  return (
    <section className="bg-gradient-to-b from-landing-canvas to-white py-16 lg:py-28">
      <Container>
        <div className="relative overflow-hidden rounded-card sm:rounded-card-lg bg-fg px-6 py-14 sm:px-12 sm:py-20 text-white shadow-soft-24">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-1/4 -mt-16 size-80 rounded-full bg-fpt-orange/15 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 -mb-16 size-80 rounded-full bg-fpt-blue/20 blur-3xl pointer-events-none" />

          <div className="relative z-10 mx-auto max-w-4xl text-center flex flex-col items-center">
            {/* Mascot Copilot Greeting */}
            <div className="mb-6 flex flex-col sm:flex-row items-center gap-3 rounded-full bg-white/10 backdrop-blur-md px-5 py-2 border border-white/15">
              <div className="size-10 flex items-center justify-center">
                <GoiMascot pose="waving" size={40} showPhotoBadge={false} showBubbleOnBoop={false} />
              </div>
              <span className="text-xs sm:text-sm font-medium text-white/85 text-center">
                Gói: &ldquo;Mình cùng làm hộp cho món quà nhé?&rdquo;
              </span>
            </div>

            <h2 className="font-landing-heading text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight">
              Tạo chiếc hộp <br className="hidden sm:inline" />
              <span className="text-fpt-orange">vừa khít món quà</span>
            </h2>

            <p className="mt-4 text-base sm:text-xl text-white/75 max-w-2xl leading-relaxed">
              Thiết kế miễn phí, xem 3D, in từ 20 hộp.
            </p>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
              {/* Primary CTA */}
              <Link
                href="/editor/new"
                className={buttonClass({ variant: "brand", size: "xl", className: "w-full px-8 sm:w-auto" })}
              >
                <Box className="size-5" />
                Vào Studio
                <ArrowRight className="size-4" />
              </Link>

              {/* Tertiary CTA: Contact */}
              <Link
                href="/contact"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-transparent px-5 py-4 text-sm font-medium text-white/75 hover:text-white transition-colors"
              >
                <MessageSquare className="size-4" />
                Liên hệ đội ngũ
              </Link>
            </div>

            {/* Reassurances */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-caption text-white/75">
              <span className="inline-flex items-center gap-1.5">
                <Check className="size-4 text-fpt-orange" />
                Thiết kế miễn phí
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="size-4 text-fpt-orange" />
                Không cần cài đặt
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="size-4 text-fpt-orange" />
                In từ 20 hộp
              </span>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

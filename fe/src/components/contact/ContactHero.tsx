"use client";

import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Headphones,
  PhoneCall,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import React from "react";
import { Container, Eyebrow, Reveal } from "@/components/landing";
import { ROUTES } from "@/constants";
import { cn } from "@/utils/helpers";

interface ContactChannel {
  icon: React.ElementType;
  title: string;
  description: string;
  actionText: string;
  href: string;
  badge?: string;
  isExternal?: boolean;
}

const CONTACT_CHANNELS: ContactChannel[] = [
  {
    icon: BookOpen,
    title: "Tài liệu & Hướng dẫn",
    description: "Hàng trăm bài viết hướng dẫn đo kích thước món quà theo mm, luật FitCheck™ và xuất file in CAD.",
    actionText: "Xem tài liệu",
    href: "/support",
  },
  {
    icon: Headphones,
    title: "Hỗ trợ kỹ thuật 24/7",
    description: "Kỹ thuật viên khuôn bế và in ấn trực tuyến giải đáp mọi thắc mắc về file PDF tách lớp, sai lệch nếp gấp.",
    actionText: "Nhắn tin hỗ trợ",
    href: "#contact-form",
    badge: "Phản hồi < 15p",
  },
  {
    icon: PhoneCall,
    title: "Tư vấn xưởng & Đặt hàng",
    description: "Thứ 2 – Thứ 7 (08:30 – 18:00). Dành cho xưởng in gia công, đơn hàng số lượng lớn và báo giá đối tác.",
    actionText: "Đặt lịch tư vấn",
    href: "tel:0901234567",
  },
];

const TRUSTED_PARTNERS = [
  { name: "Tiệm Nến Mộc Nhiên", role: "Handmade Scent" },
  { name: "Gốm Bát Tràng", role: "Craft Ceramic" },
  { name: "Bạc An Nhiên", role: "Silver Jewelry" },
  { name: "Trà Shan Tuyết Hà Giang", role: "Organic Tea" },
  { name: "Xà Bông Sapa Herb", role: "Natural Skincare" },
  { name: "ECMA / FEFCO Standard", role: "Packaging Standard" },
];

export function ContactHero() {
  return (
    <section className="bg-gradient-to-b from-white via-landing-canvas to-landing-canvas pt-28 sm:pt-36 pb-14 lg:pb-20">
      <Container>
        {/* Top Header & 3-Channel Grid (matching reference layout) */}
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-12">
          {/* Left Column: Eyebrow, Big Headline, Subtitle */}
          <div className="lg:col-span-4 flex flex-col justify-center">
            <Reveal variant="text">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-info-bg px-3 py-1 text-xs font-semibold text-info-fg mb-3 border border-info/60">
                <Sparkles className="size-3 text-info-fg" />
                Liên hệ WrapFit
              </span>

              <h1 className="font-landing-heading text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight tracking-tight text-landing-ink">
                Chúng tôi có thể giúp gì cho bạn?
              </h1>

              <p className="mt-3 text-sm sm:text-base leading-relaxed text-landing-muted lg:mt-4">
                Chọn kênh liên hệ phù hợp nhất để đội ngũ kỹ thuật bao bì và chuyên viên tư vấn hỗ trợ bạn tức thì.
              </p>
            </Reveal>
          </div>

          {/* Right Column: 3 Contact Cards in a row */}
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-5">
            {CONTACT_CHANNELS.map((channel, index) => {
              const Icon = channel.icon;
              return (
                <div
                  key={channel.title}
                  className="group relative flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-line/90 bg-white p-5 sm:p-6 shadow-soft-8 transition-all duration-300 hover:-translate-y-1 hover:border-line hover:shadow-soft-16"
                >
                  <div>
                    {/* Squircle Icon */}
                    <div className="flex size-11 items-center justify-center rounded-xl bg-surface-sunken text-fg-muted transition-colors group-hover:bg-fpt-orange-light group-hover:text-fpt-orange-ink mb-4">
                      <Icon className="size-5" />
                    </div>

                    {channel.badge && (
                      <span className="absolute top-5 right-5 rounded-full bg-success-bg px-2 py-0.5 text-caption font-semibold text-success-fg border border-success/60">
                        {channel.badge}
                      </span>
                    )}

                    <h3 className="font-landing-heading text-base sm:text-lg font-bold text-landing-ink mb-1.5">
                      {channel.title}
                    </h3>

                    <p className="text-xs sm:text-sm text-landing-muted leading-relaxed mb-6">
                      {channel.description}
                    </p>
                  </div>

                  <Link
                    href={channel.href}
                    className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-fpt-orange-ink transition-colors group-hover:text-fg hover:underline"
                  >
                    <span>{channel.actionText}</span>
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Social Proof: Trusted by 100+ companies */}
        <div className="mt-14 sm:mt-20 pt-8 sm:pt-10 border-t border-line/70 text-center">
          <p className="text-xs sm:text-sm font-semibold text-fg-muted uppercase tracking-wider mb-6">
            Được tin chọn bởi 100+ xưởng in và thương hiệu quà tặng thủ công
          </p>

          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 opacity-75 grayscale hover:grayscale-0 transition-all duration-300">
            {TRUSTED_PARTNERS.map((partner) => (
              <div key={partner.name} className="flex flex-col items-center">
                <span className="font-landing-heading text-sm sm:text-base font-bold text-fg-muted">
                  {partner.name}
                </span>
                <span className="text-cad-spec-micro font-mono text-fg-muted">
                  {partner.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}

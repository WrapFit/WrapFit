"use client";

import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Headphones,
  PhoneCall,
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
    title: "Tài liệu hướng dẫn",
    description: "Cách đo món quà, FitCheck™ và xuất file in.",
    actionText: "Xem tài liệu",
    href: "/support",
  },
  {
    icon: Headphones,
    title: "Hỗ trợ kỹ thuật",
    description: "Giải đáp về file in và khuôn bế.",
    actionText: "Nhắn tin hỗ trợ",
    href: "#contact-form",
  },
  {
    icon: PhoneCall,
    title: "Xưởng in và đặt hàng",
    description: "Đơn số lượng lớn và báo giá cho xưởng in.",
    actionText: "Gửi yêu cầu",
    href: "#contact-form",
  },
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

              <h1 className="font-landing-heading text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight tracking-tight text-landing-ink">
                Chúng tôi có thể giúp gì cho bạn?
              </h1>

              <p className="mt-3 text-sm sm:text-base leading-relaxed text-landing-muted lg:mt-4">
                Chọn kênh phù hợp, đội ngũ WrapFit sẽ hỗ trợ bạn.
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
                      <span className="absolute top-5 right-5 rounded-full bg-fpt-orange-light px-2 py-0.5 text-caption font-semibold text-fpt-orange-ink border border-fpt-orange/40">
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
      </Container>
    </section>
  );
}

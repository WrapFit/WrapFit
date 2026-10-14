"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import { Container, Reveal } from "@/components/landing";
import { EmeraldPolyhedron, GoldCylinder, PurpleSlantedDisc } from "./GeometricShapes";

export type CurrencyMode = "USD" | "VND";

interface PricingPlan {
  id: string;
  name: string;
  subtitle: string;
  priceUsd: number;
  priceVnd: number;
  periodUsd: string;
  periodVnd: string;
  bgClass: string;
  borderClass: string;
  shape: React.ComponentType<{ className?: string }>;
  features: string[];
  featuresVn: string[];
  ctaText: string;
  ctaTextVn: string;
  popular?: boolean;
}

const PLANS_DATA: PricingPlan[] = [
  {
    id: "basic",
    name: "Basic",
    subtitle: "Simple and effective",
    priceUsd: 5,
    priceVnd: 19000,
    periodUsd: "/mth",
    periodVnd: "/lần xuất",
    bgClass: "bg-[#F3F5FE]",
    borderClass: "border-[#E3E7FA]",
    shape: PurpleSlantedDisc,
    features: [
      "Access to basic features",
      "Basic reporting and analytics",
      "Up to 10 individual users",
      "20GB individual data each user",
      "Basic email support",
    ],
    featuresVn: [
      "Truy cập đầy đủ Studio CAD & mô phỏng 3D Origami",
      "Rà soát lỗi cơ bản với FitCheck™ tự động",
      "Xuất file vector chuẩn in (PDF CMYK / PDF A4 có dấu xén)",
      "500MB lưu trữ mẫu hộp cá nhân trên đám mây",
      "Hỗ trợ kỹ thuật xuất xưởng qua Bé Gói & Zalo",
    ],
    ctaText: "Get started",
    ctaTextVn: "Bắt đầu ngay",
  },
  {
    id: "premium",
    name: "Premium",
    subtitle: "Advanced and comprehensive",
    priceUsd: 20,
    priceVnd: 99000,
    periodUsd: "/mth",
    periodVnd: "/tháng",
    bgClass: "bg-[#FFF9EB]",
    borderClass: "border-[#FCEECB]",
    shape: GoldCylinder,
    features: [
      "Access to basic and premium features",
      "Advanced reporting and analytics",
      "Up to 100 individual users",
      "100GB individual data each user",
      "Basic chat and email support",
    ],
    featuresVn: [
      "Không giới hạn lượt xuất file vector CMYK chất lượng cao",
      "FitCheck™ chuyên sâu: bắt lỗi tràn lề bleed & nếp gập",
      "Tích hợp Brand Kit: logo, màu sắc & họa tiết độc quyền",
      "1GB lưu trữ đám mây & 50 lượt sinh hoa văn AI/ngày",
      "Ưu tiên kết nối xưởng cắt phẳng số & đặt in mẫu thử",
    ],
    ctaText: "Get started",
    ctaTextVn: "Chọn gói Pro",
    popular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    subtitle: "Unlimited and complete",
    priceUsd: 99,
    priceVnd: 299000,
    periodUsd: "/mth",
    periodVnd: "/tháng",
    bgClass: "bg-[#EEF8F2]",
    borderClass: "border-[#D7F0E2]",
    shape: EmeraldPolyhedron,
    features: [
      "Access to basic features",
      "Customised reporting and analytics",
      "Up to 1,000 individual users",
      "1TB individual data each user",
      "Personal chat and email support",
    ],
    featuresVn: [
      "Toàn bộ tính năng cao cấp & tích hợp API xưởng in",
      "Kiểm toán hàng loạt file khuôn cho đối tác gia công",
      "Quản lý đa thành viên nhóm thiết kế & xưởng in",
      "10GB lưu trữ dự án không giới hạn & 300 lượt AI/ngày",
      "Tư vấn 1-1 chuyên gia kỹ thuật bao bì & SLA cam kết",
    ],
    ctaText: "Get started",
    ctaTextVn: "Liên hệ Enterprise",
  },
];

export function VisualSparkPricingCards() {
  const [currency, setCurrency] = useState<CurrencyMode>("USD");

  return (
    <section className="bg-white pt-24 sm:pt-32 pb-12 lg:pb-16">
      <Container>
        {/* Header matching VisualSpark Sample */}
        <div className="mx-auto max-w-3xl text-center mb-10 sm:mb-12">
          <Reveal variant="text" className="flex flex-col items-center">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-stone-600 mb-3">
              PRICING
            </span>

            <h1 className="font-landing-heading text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#111827]">
              Plans that fit your scale
            </h1>

            <p className="mt-3 text-base sm:text-lg text-stone-600">
              Upgrade or downgrade anytime, money-back guarantee
            </p>

            {/* Currency switch pill */}
            <div className="mt-6 inline-flex items-center rounded-full bg-stone-100 p-1 border border-stone-200">
              <button
                type="button"
                onClick={() => setCurrency("USD")}
                className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                  currency === "USD"
                    ? "bg-white text-stone-900 shadow-soft-4"
                    : "text-stone-700 hover:text-stone-900"
                }`}
              >
                USD ($5 – $99)
              </button>
              <button
                type="button"
                onClick={() => setCurrency("VND")}
                className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                  currency === "VND"
                    ? "bg-[#F26522] text-white shadow-soft-4"
                    : "text-stone-700 hover:text-stone-900"
                }`}
              >
                VNĐ (19k – 99k WrapFit)
              </button>
            </div>
          </Reveal>
        </div>

        {/* 3 Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto items-stretch">
          {PLANS_DATA.map((plan) => {
            const ShapeComponent = plan.shape;
            const isVnd = currency === "VND";

            const formattedPrice = isVnd
              ? plan.id === "basic"
                ? "19.000đ"
                : `${(plan.priceVnd / 1000).toLocaleString("vi-VN")}.000đ`
              : `$${plan.priceUsd}`;

            const period = isVnd ? plan.periodVnd : plan.periodUsd;
            const features = isVnd ? plan.featuresVn : plan.features;
            const cta = isVnd ? plan.ctaTextVn : plan.ctaText;

            return (
              <Reveal key={plan.id} className="h-full">
                <div
                  className={`flex h-full flex-col justify-between rounded-[2rem] sm:rounded-[2.25rem] p-7 sm:p-9 border shadow-[0_4px_24px_rgba(0,0,0,0.03)] transition-all hover:shadow-[0_12px_36px_rgba(0,0,0,0.08)] hover:-translate-y-1 ${plan.bgClass} ${plan.borderClass}`}
                >
                  <div>
                    {/* 3D Geometric Shape at Top */}
                    <div className="flex justify-center mb-6 pt-2">
                      <ShapeComponent className="size-24 sm:size-28" />
                    </div>

                    {/* Plan Title & Subtitle */}
                    <div className="text-center mb-6">
                      <h3 className="font-landing-heading text-2xl font-bold text-stone-900">
                        {plan.name}
                      </h3>
                      <p className="text-xs sm:text-sm text-stone-600 mt-1">
                        {plan.subtitle}
                      </p>
                    </div>

                    {/* Price Header */}
                    <div className="flex items-baseline justify-center gap-1 mb-8">
                      <span className="font-landing-heading text-4xl sm:text-5xl font-extrabold text-stone-900 tracking-tight">
                        {formattedPrice}
                      </span>
                      <span className="text-xs sm:text-sm font-semibold text-stone-600">
                        {period}
                      </span>
                    </div>

                    {/* Features List with Rounded Grey Checkmark */}
                    <ul className="space-y-3.5 mb-8">
                      {features.map((feat) => (
                        <li key={feat} className="flex items-start gap-3 text-xs sm:text-sm text-stone-600">
                          <span className="size-4 sm:size-4.5 rounded-full bg-[#8E96A4] text-white flex items-center justify-center shrink-0 mt-0.5">
                            <Check className="size-2.5 sm:size-3 stroke-[3]" />
                          </span>
                          <span className="leading-tight">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Dark Bottom Button */}
                  <div className="pt-2">
                    <Link
                      href={plan.id === "basic" ? "/editor/new" : "/checkout"}
                      className="inline-flex w-full items-center justify-center rounded-xl bg-[#131722] py-3.5 px-4 text-xs sm:text-sm font-semibold text-white shadow-soft-8 transition-colors hover:bg-stone-800"
                    >
                      {cta}
                    </Link>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}

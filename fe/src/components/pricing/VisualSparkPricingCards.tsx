"use client";

import { Check, ShieldCheck } from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import { Container, Reveal } from "@/components/landing";
import { PLANS, formatQuota, formatVnd } from "@/features/pricing";
import type { SubscriptionTier } from "@/types/api";
import { EmeraldPolyhedron, GoldCylinder, PurpleSlantedDisc } from "./GeometricShapes";
import { buttonClass } from "@/components/ui";

export type BillingCycle = "monthly" | "yearly";

interface PricingPlan {
  tier: SubscriptionTier;
  subtitle: string;
  bgClass: string;
  borderClass: string;
  shape: React.ComponentType<{ className?: string }>;
  features: string[];
  cta: string;
  href: string;
  popular?: boolean;
}

// The three paid plans of features/pricing (the quotas the API enforces); the free plan is the way in above them.
const PLANS_DATA: PricingPlan[] = [
  {
    tier: "PAY_PER_EXPORT",
    subtitle: "Trả khi cần, không phí tháng",
    bgClass: "bg-info-bg/60",
    borderClass: "border-info/15",
    shape: PurpleSlantedDisc,
    features: [
      "Studio CAD đầy đủ & hộp gấp 3D",
      "FitCheck™ trước mỗi lần xuất",
      "File in PDF CMYK · SVG · DXF · PDF A4/A3",
      `${formatQuota(PLANS.PAY_PER_EXPORT.storageBytes)} lưu trữ · ${PLANS.PAY_PER_EXPORT.aiPatternsPerDay} hoa văn AI/ngày`,
      "Mã QR mở hộp 3D",
    ],
    cta: "Mua lượt xuất",
    href: "/checkout/step-1?plan=PAY_PER_EXPORT",
  },
  {
    tier: "STARTER",
    subtitle: "Cho maker và shop handmade",
    bgClass: "bg-warning-bg/50",
    borderClass: "border-warning/20",
    shape: GoldCylinder,
    features: [
      "Xuất file in không giới hạn",
      "Brand Kit: logo, màu, phông chữ",
      `${formatQuota(PLANS.STARTER.storageBytes)} lưu trữ · ${PLANS.STARTER.aiPatternsPerDay} hoa văn AI/ngày`,
      "Ưu tiên đặt in hộp mẫu qua xưởng đối tác",
      "Mọi tính năng của gói Từng lần xuất",
    ],
    cta: "Chọn Gói Tháng",
    href: "/checkout/step-1?plan=STARTER",
    popular: true,
  },
  {
    tier: "PRO_BUSINESS",
    subtitle: "Cho thương hiệu và xưởng in",
    bgClass: "bg-success-bg/70",
    borderClass: "border-success/15",
    shape: EmeraldPolyhedron,
    features: [
      `${formatQuota(PLANS.PRO_BUSINESS.storageBytes)} lưu trữ · ${PLANS.PRO_BUSINESS.aiPatternsPerDay} hoa văn AI/ngày`,
      "Nhiều thành viên trong một không gian làm việc",
      "Kiểm tra hàng loạt file khuôn cho đối tác gia công",
      "Tư vấn 1-1 với chuyên gia bao bì",
      "Mọi tính năng của Gói Tháng",
    ],
    cta: "Chọn Doanh nghiệp",
    href: "/checkout/step-1?plan=PRO_BUSINESS",
  },
];

const PAYMENTS = ["VietQR", "Chuyển khoản", "MoMo", "Thẻ ATM nội địa"];

const CYCLES: [BillingCycle, string][] = [
  ["monthly", "Theo tháng"],
  ["yearly", "Theo năm · tiết kiệm 20%"],
];

/**
 * Top of /pricing, in the VisualSpark layout (3D-illustrated pastel cards): the paid plans of features/pricing with a
 * monthly / yearly switch, the free way in, the recommended plan, payment methods and the refund rule.
 */
export function VisualSparkPricingCards() {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");

  return (
    <section className="bg-white pt-24 sm:pt-32 pb-12 lg:pb-16">
      <Container>
        <div className="mx-auto max-w-3xl text-center mb-10 sm:mb-12">
          <Reveal variant="text" className="flex flex-col items-center">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-fg-muted mb-3">Bảng giá</span>

            <h1 className="font-landing-heading text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-fg">
              Gói vừa với quy mô của bạn
            </h1>

            <p className="mt-3 text-base sm:text-lg text-fg-muted">Đổi gói bất cứ lúc nào · hoàn tiền 100% trong 7 ngày nếu chưa xuất file in</p>

            <div role="group" aria-label="Chu kỳ thanh toán" className="mt-6 inline-flex items-center rounded-full bg-surface-sunken p-1 border border-line">
              {CYCLES.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={cycle === value}
                  onClick={() => setCycle(value)}
                  className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                    cycle === value ? "bg-fg text-fg-inverse shadow-soft-4" : "text-fg-muted hover:text-fg"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <p className="mt-5 text-sm text-fg-muted">
              Mới bắt đầu?{" "}
              <Link href="/auth/register" className="font-semibold text-fg underline underline-offset-4">
                Gói Free
              </Link>{" "}
              có đủ studio, FitCheck™ và hộp 3D, không cần thẻ thanh toán.
            </p>
          </Reveal>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto items-stretch">
          {PLANS_DATA.map((item) => {
            const ShapeComponent = item.shape;
            const plan = PLANS[item.tier];
            const perExport = Boolean(plan.isPerExport);
            const price = perExport ? (plan.price.perExport ?? plan.price.monthly) : cycle === "yearly" ? plan.price.yearlyPerMonth : plan.price.monthly;
            const period = perExport ? "/lần xuất" : "/tháng";
            const note = perExport
              ? "Không phí duy trì"
              : cycle === "yearly"
                ? `Thanh toán ${formatVnd(plan.price.yearlyPerMonth * 12)} mỗi năm`
                : `${formatVnd(plan.price.yearlyPerMonth)}/tháng khi trả theo năm`;

            return (
              <Reveal key={item.tier} className="h-full">
                <div
                  className={`relative flex h-full flex-col justify-between rounded-card sm:rounded-squircle-xl p-7 sm:p-9 border shadow-[0_4px_24px_rgba(0,0,0,0.03)] transition-all hover:shadow-[0_12px_36px_rgba(0,0,0,0.08)] hover:-translate-y-1 ${item.bgClass} ${
                    item.popular ? "border-fpt-orange ring-2 ring-action" : item.borderClass
                  }`}
                >
                  {item.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-fpt-orange px-3 py-1 text-label-sm text-white shadow-soft-4">Khuyên dùng</span>
                  )}
                  <div>
                    <div className="flex justify-center mb-6 pt-2">
                      <ShapeComponent className="size-24 sm:size-28" />
                    </div>

                    <div className="text-center mb-6">
                      <h3 className="font-landing-heading text-2xl font-bold text-fg">{plan.name}</h3>
                      <p className="text-xs sm:text-sm text-fg-muted mt-1">{item.subtitle}</p>
                    </div>

                    <div className="flex flex-col items-center mb-8">
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="font-landing-heading text-4xl sm:text-5xl font-extrabold text-fg tracking-tight">{formatVnd(price)}</span>
                        <span className="text-xs sm:text-sm font-semibold text-fg-muted">{period}</span>
                      </div>
                      <span className="mt-1 text-xs text-fg-muted">{note}</span>
                    </div>

                    <ul className="space-y-3.5 mb-8">
                      {item.features.map((feat) => (
                        <li key={feat} className="flex items-start gap-3 text-xs sm:text-sm text-fg-muted">
                          <span className="size-4 sm:size-4.5 rounded-full bg-line-strong text-white flex items-center justify-center shrink-0 mt-0.5">
                            <Check className="size-2.5 sm:size-3 stroke-[3]" />
                          </span>
                          <span className="leading-tight">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-2">
                    <Link
                      href={perExport ? item.href : `${item.href}&billing=${cycle}`}
                      className={buttonClass({ variant: item.popular ? "brand" : "dark", size: "lg", shape: "rounded", block: true, className: "text-label" })}
                    >
                      {item.cta}
                    </Link>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>

        <div className="mx-auto mt-10 flex max-w-4xl flex-col items-center gap-3 text-center text-xs text-fg-muted sm:flex-row sm:justify-center sm:gap-6">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="size-4 text-success-fg" aria-hidden /> Thanh toán mã hoá qua cổng của ngân hàng · WrapFit không lưu số thẻ
          </span>
          <span className="flex flex-wrap justify-center gap-1.5">
            {PAYMENTS.map((method) => (
              <span key={method} className="rounded-md border border-line bg-white px-2 py-0.5 font-semibold text-fg-muted">
                {method}
              </span>
            ))}
          </span>
        </div>
        <p className="mt-3 text-center text-xs text-fg-muted">
          Chi tiết hoàn tiền và huỷ gói tại{" "}
          <Link href="/legal/terms#thanh-toan" className="underline">
            Điều khoản sử dụng
          </Link>
          .
        </p>
      </Container>
    </section>
  );
}

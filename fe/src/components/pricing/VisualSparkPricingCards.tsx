"use client";

import { Check, ShieldCheck } from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import { Container, Reveal } from "@/components/landing";
import { PaymentLogos, type PaymentMethodId } from "@/components/layout/PaymentLogos";
import { Badge, Button, buttonClass } from "@/components/ui";
import { ROUTES } from "@/constants";
import { useAuth } from "@/features/auth";
import { CheckoutDialog, PurchaseSuccessDialog } from "@/features/payments";
import type { Payment } from "@/types/api";
import { PLANS, PLANS_ON_SALE, formatVnd, type SaleTier } from "@/features/pricing";
import type { SalePurpose } from "@/types/api";
import { cn } from "@/utils/helpers";
import { CONTACT_HREF, PLAN_CARDS, PRICING_HERO, checkoutHref } from "./content";
import { EmeraldPolyhedron, GoldCylinder, KraftBox } from "./GeometricShapes";

interface CardLook {
  bgClass: string;
  borderClass: string;
  shape: React.ComponentType<{ className?: string }>;
}

const LOOKS: Record<SaleTier, CardLook> = {
  FREE: { bgClass: "bg-surface-raised", borderClass: "border-line", shape: KraftBox },
  STARTER: { bgClass: "bg-warning-bg/50", borderClass: "border-warning/20", shape: GoldCylinder },
  PRO_BUSINESS: { bgClass: "bg-success-bg/70", borderClass: "border-success/15", shape: EmeraldPolyhedron },
};

const PAYMENTS: PaymentMethodId[] = ["vietqr", "bank", "momo", "napas"];

/**
 * Top of /pricing, in the VisualSpark layout (3D-illustrated pastel cards): the plans on sale of
 * @wrapfit/shared/billing (Miễn phí, Pro, Business on request; the export packs are no longer sold, docs/25 item 7),
 * payment methods and the refund rule. A signed-in visitor pays Pro right here with the VietQR checkout; a guest goes
 * through /checkout (sign-in).
 */
export function VisualSparkPricingCards() {
  const auth = useAuth();
  const currentTier = auth.user?.subscriptionTier ?? null;
  const [buying, setBuying] = useState<SalePurpose | null>(null);
  /** The payment just confirmed: shows the congratulations popup. */
  const [purchased, setPurchased] = useState<Payment | null>(null);
  const signedIn = auth.status === "authenticated";

  return (
    <section className="bg-white pt-24 sm:pt-32 pb-12 lg:pb-16">
      <Container>
        <div className="mx-auto max-w-3xl text-center mb-10 sm:mb-12">
          <Reveal variant="text" className="flex flex-col items-center">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-fg-muted mb-3">{PRICING_HERO.eyebrow}</span>
            <h1 className="font-landing-heading text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-fg">{PRICING_HERO.title}</h1>
            <p className="mt-3 text-base sm:text-lg text-fg-muted">{PRICING_HERO.lead}</p>
          </Reveal>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:gap-6 max-w-6xl mx-auto items-stretch">
          {PLANS_ON_SALE.map((tier) => (
            <Reveal key={tier} className="h-full">
              <PlanCard tier={tier} isCurrent={currentTier === tier} signedIn={signedIn} onBuy={setBuying} />
            </Reveal>
          ))}
        </div>

        <div className="mx-auto mt-10 flex max-w-4xl flex-col items-center gap-3 text-center text-xs text-fg-muted sm:flex-row sm:justify-center sm:gap-6">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="size-4 text-success-fg" aria-hidden /> Thanh toán qua VietQR và ngân hàng nội địa · WrapFit không lưu số thẻ
          </span>
          <PaymentLogos methods={PAYMENTS} className="flex flex-wrap justify-center gap-2" />
        </div>
        <p className="mt-3 text-center text-xs text-fg-muted">
          Giá theo VNĐ, đã gồm VAT. Chi tiết hoàn tiền tại{" "}
          <Link href="/legal/terms#thanh-toan" className="underline">
            Điều khoản sử dụng
          </Link>
          .
        </p>
      </Container>
      {buying && <CheckoutDialog purpose={buying} closeOnPaid onPaid={setPurchased} onClose={() => setBuying(null)} />}
      {purchased && <PurchaseSuccessDialog payment={purchased} onClose={() => setPurchased(null)} />}
    </section>
  );
}

function PlanCard({
  tier,
  isCurrent,
  signedIn,
  onBuy,
}: {
  tier: SaleTier;
  isCurrent: boolean;
  signedIn: boolean;
  /** Signed in: pay this plan with the VietQR checkout instead of going to /checkout. */
  onBuy(purpose: SalePurpose): void;
}) {
  const plan = PLANS[tier];
  const copy = PLAN_CARDS[tier];
  const look = LOOKS[tier];
  const Shape = look.shape;

  const price =
    tier === "FREE"
      ? { amount: formatVnd(0), unit: "" }
      : plan.contactOnly
        ? { amount: "Liên hệ", unit: "" }
        : { amount: formatVnd(plan.price.monthly), unit: "/tháng" };

  const action =
    tier === "FREE"
      ? { href: signedIn ? ROUTES.editorDemo : ROUTES.register, label: signedIn ? "Tạo hộp ngay" : copy.cta }
      : plan.contactOnly
        ? { href: CONTACT_HREF, label: copy.cta }
        : { href: checkoutHref(tier), label: copy.cta };
  const purpose: SalePurpose | null = signedIn && tier === "STARTER" ? "PRO_MONTH" : null;

  return (
    <article
      aria-labelledby={`plan-${tier}`}
      className={cn(
        "relative flex h-full flex-col rounded-card p-6 sm:p-7 border shadow-soft-4 transition-all hover:shadow-soft-16 hover:-translate-y-1",
        look.bgClass,
        copy.popular ? "border-fpt-orange ring-2 ring-action" : look.borderClass
      )}
    >
      {copy.popular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-fpt-orange px-3 py-1 text-label-sm text-white shadow-soft-4">Khuyên dùng</span>
      )}
      <div className="flex justify-center mb-4 pt-2">
        <Shape className="size-20 sm:size-24" />
      </div>

      <div className="text-center mb-5">
        <h2 id={`plan-${tier}`} className="font-landing-heading text-heading-sm font-bold text-fg">
          {plan.name}
        </h2>
        <p className="text-body-sm text-fg-muted mt-1">{copy.subtitle}</p>
        {isCurrent && (
          <Badge tone="warning" className="mt-2">
            Gói của bạn
          </Badge>
        )}
      </div>

      <div className="flex flex-col items-center mb-5">
        <div className="flex items-baseline justify-center gap-1">
          <span className="font-landing-heading text-4xl font-extrabold text-fg tracking-tight tabular-nums">{price.amount}</span>
          {price.unit && <span className="text-body-sm font-semibold text-fg-muted">{price.unit}</span>}
        </div>
        <span className="mt-1 text-caption text-fg-muted">{copy.note}</span>
      </div>

      <ul className="space-y-3 mb-6">
        {copy.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-body-sm text-fg-muted">
            <span className="size-4 rounded-full bg-line-strong text-white flex items-center justify-center shrink-0 mt-0.5" aria-hidden>
              <Check className="size-2.5 stroke-[3]" />
            </span>
            <span className="leading-snug">{feature}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-2">
        {isCurrent ? (
          <span className={buttonClass({ variant: "secondary", size: "lg", shape: "rounded", block: true, className: "pointer-events-none text-label text-fg-muted" })}>
            Gói đang dùng
          </span>
        ) : purpose ? (
          <Button variant={copy.popular ? "brand" : "dark"} size="lg" shape="rounded" block className="text-label" onClick={() => onBuy(purpose)}>
            {action.label}
          </Button>
        ) : (
          <Link
            href={action.href}
            className={buttonClass({ variant: copy.popular ? "brand" : "dark", size: "lg", shape: "rounded", block: true, className: "text-label" })}
          >
            {action.label}
          </Link>
        )}
      </div>
    </article>
  );
}

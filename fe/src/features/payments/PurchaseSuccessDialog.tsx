"use client";

import { ArrowRight, CheckCircle2, PartyPopper } from "lucide-react";
import React from "react";
import { createPortal } from "react-dom";
import { GoiMascot } from "@/components/common/GoiMascot";
import { Button, ButtonLink, ModalLayer } from "@/components/ui";
import { ROUTES } from "@/constants";
import { PRO_BENEFITS, formatVnd } from "@/features/pricing";
import type { Payment, PaymentPurpose } from "@/types/api";

const PACKAGE_NAMES: Record<PaymentPurpose, string> = {
  // Export packs are no longer sold (docs/25 item 7); an old one confirmed late is paid out in xu.
  EXPORT_1: "gói lượt xuất cũ (đổi sang xu)",
  EXPORT_5: "gói lượt xuất cũ (đổi sang xu)",
  EXPORT_15: "gói lượt xuất cũ (đổi sang xu)",
  PRO_MONTH: "gói Pro 30 ngày",
  SAMPLE_ORDER: "đơn in mẫu",
  XU_500: "gói 500 xu Wrap",
  XU_1050: "gói 1.050 xu Wrap",
  XU_2200: "gói 2.200 xu Wrap",
  XU_CUSTOM: "gói xu Wrap",
};

/** What the purchase unlocked, in three short lines. */
function benefitsOf(payment: Payment): string[] {
  if (payment.purpose === "PRO_MONTH") return [PRO_BENEFITS.storage, PRO_BENEFITS.xu, PRO_BENEFITS.rollover];
  if (payment.xu) return [`${payment.xu.toLocaleString("vi-VN")} xu đã vào ví`, "Dùng cho ảnh AI, hoa văn AI và công cụ ảnh", "Hạn dùng 12 tháng"];
  if (payment.purpose === "SAMPLE_ORDER") return ["Đơn in mẫu đã thanh toán", "Xưởng in gọi xác nhận trước khi in"];
  return ["Số tiền đã trả được đổi sang xu Wrap trong ví", "Dùng cho ảnh AI, hoa văn AI và công cụ ảnh", "Hạn dùng 12 tháng"];
}

interface PurchaseSuccessDialogProps {
  payment: Payment;
  onClose(): void;
}

/** Congratulations after a package is paid (pricing page): what was bought, what it unlocks, where to go next. */
export function PurchaseSuccessDialog({ payment, onClose }: PurchaseSuccessDialogProps) {
  const isXu = Boolean(payment.xu);
  return createPortal(
    <ModalLayer onClose={onClose} labelledBy="purchase-success-title">
      <div className="relative w-full max-w-md overflow-hidden rounded-sheet bg-surface-raised text-center shadow-popover">
        <div className="relative bg-gradient-to-b from-fpt-orange-light to-surface-raised px-6 pb-2 pt-8">
          <PartyPopper className="absolute left-6 top-6 size-6 text-fpt-orange" aria-hidden />
          <PartyPopper className="absolute right-6 top-6 size-6 -scale-x-100 text-fpt-blue" aria-hidden />
          <GoiMascot pose="celebration" size={128} interactive={false} className="mx-auto" />
        </div>
        <div className="px-6 pb-6">
          <p className="text-label-sm font-semibold uppercase tracking-wide text-accent">Thanh toán thành công</p>
          <h2 id="purchase-success-title" className="mt-1 font-landing-heading text-heading-sm font-bold text-fg">
            Chúc mừng! Bạn đã mua {PACKAGE_NAMES[payment.purpose]}
          </h2>
          <p className="mt-1 text-body-sm tabular-nums text-fg-muted">
            {formatVnd(payment.amountVnd)} · mã <span className="font-mono">{payment.reference}</span>
          </p>
          <ul className="mt-5 flex flex-col gap-2 rounded-panel bg-surface-sunken p-4 text-left text-body-sm text-fg">
            {benefitsOf(payment).map((line) => (
              <li key={line} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                {line}
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
            <ButtonLink href={ROUTES.editorDemo} variant="brand" className="flex-1" trailingIcon={<ArrowRight aria-hidden />}>
              {isXu ? "Dùng xu trong Studio" : "Bắt đầu thiết kế"}
            </ButtonLink>
            <Button variant="secondary" className="flex-1" onClick={onClose}>
              Để sau
            </Button>
          </div>
        </div>
      </div>
    </ModalLayer>,
    document.body,
  );
}

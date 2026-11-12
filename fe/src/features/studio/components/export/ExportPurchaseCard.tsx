"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, CreditCard, Download, Lock, LogIn, Save } from "lucide-react";
import { EXPORT_PACKS, PRO_MONTH, type PaymentPurpose } from "@wrapfit/shared";
import { getBillingSummary, getExportAccess } from "@/api";
import { buttonClass } from "@/components/ui";
import { ROUTES } from "@/constants";
import { CheckoutDialog } from "@/features/payments";
import { formatVnd } from "@/features/pricing";
import { queryKeys } from "@/hooks/data";
import { cn } from "@/utils/helpers";
import { CardTitle, StudioCard } from "../studioUi";

/** Packages that unlock the print file of a design, cheapest first. */
const PACKAGES: { purpose: PaymentPurpose; label: string; detail: string; priceVnd: number }[] = [
  { purpose: "EXPORT_1", label: "1 lượt xuất", detail: "Mở khóa file in của bản thiết kế này trong 7 ngày", priceVnd: EXPORT_PACKS.EXPORT_1.priceVnd },
  { purpose: "EXPORT_5", label: "5 lượt xuất", detail: "Cho 5 bản thiết kế, dùng trong 12 tháng", priceVnd: EXPORT_PACKS.EXPORT_5.priceVnd },
  { purpose: "EXPORT_15", label: "15 lượt xuất", detail: "Cho 15 bản thiết kế, dùng trong 12 tháng", priceVnd: EXPORT_PACKS.EXPORT_15.priceVnd },
  { purpose: "PRO_MONTH", label: `Pro ${PRO_MONTH.periodDays} ngày`, detail: "Xuất không giới hạn mọi bản thiết kế", priceVnd: PRO_MONTH.priceVnd },
];

/** The same key as the export dialog's access query, so one invalidation refreshes both. */
export const exportAccessKey = (projectId: string) => [...queryKeys.projects.exports(projectId), "access"] as const;

interface ExportPurchaseCardProps {
  /** Saved project; null in the offline demo (nothing can be bought or exported there). */
  projectId: string | null;
  /** FitCheck errors: nothing should be paid for or exported until they are fixed. */
  blocked: boolean;
  onExport(): void;
  /** Signed in (the demo studio of a signed-in user has no project yet but may own a package). */
  signedIn?: boolean;
  /** Saves the demo as a project (then the export opens on /editor/<id>). */
  onSaveProject?(): void;
  saving?: boolean;
}

/**
 * Step 6, the print file: it is sold, never given away. Until the customer owns a package that covers this design the
 * card offers the packages and a "Thanh toán" button; once paid (Pro, an unlock of this version, or credits left) the
 * same button becomes "Xuất file in". The server checks again on every export.
 */
export function ExportPurchaseCard({ projectId, blocked, onExport, signedIn = false, onSaveProject, saving = false }: ExportPurchaseCardProps) {
  const [choice, setChoice] = useState<PaymentPurpose>("EXPORT_1");
  const [paying, setPaying] = useState<PaymentPurpose | null>(null);
  const access = useQuery({
    queryKey: exportAccessKey(projectId ?? "demo"),
    queryFn: () => getExportAccess(projectId!),
    enabled: Boolean(projectId),
  });

  // No project yet (demo of a signed-in user): what the account owns, from the billing summary.
  const billing = useQuery({ queryKey: queryKeys.billing, queryFn: getBillingSummary, enabled: !projectId && signedIn, staleTime: 30_000 });
  const pro = billing.data ? billing.data.tier === "STARTER" || billing.data.tier === "PRO_BUSINESS" : false;
  const accountOwns = billing.data ? pro || billing.data.exportCredits.balance > 0 : false;
  const owned = projectId ? (access.data ? access.data.unlocked || access.data.balance > 0 : false) : accountOwns;
  const checking = projectId ? access.isPending : signedIn && billing.isPending;
  const selected = PACKAGES.find((p) => p.purpose === choice)!;
  const blockedTitle = blocked ? "Sửa các lỗi FitCheck trước khi thanh toán và xuất file" : undefined;

  return (
    <StudioCard data-tour="s6-export" className="p-5" aria-labelledby="export-card-title">
      <CardTitle id="export-card-title" action={owned ? <span className="text-caption font-semibold text-success-fg">Đã mua</span> : <Lock className="size-4 text-fg-muted" aria-hidden />}>
        File in
      </CardTitle>

      {!projectId && !signedIn ? (
        <>
          <p className="mt-2 text-body-sm text-fg-muted">
            Bản dùng thử không xuất được file in. Đăng nhập, lưu dự án rồi mua gói để tải gói file in (.ai · PDF CMYK · SVG · DXF).
          </p>
          <Link href={ROUTES.login} className={buttonClass({ variant: "brand", size: "lg", block: true, className: "mt-4" })}>
            <LogIn className="size-4" aria-hidden />
            Đăng nhập để mua gói
          </Link>
        </>
      ) : checking ? (
        <p className="mt-3 text-body-sm text-fg-muted" role="status">
          Đang kiểm tra gói của bạn…
        </p>
      ) : owned && !projectId ? (
        <>
          <p className="mt-2 flex items-start gap-2 text-body-sm text-fg-muted">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
            {pro ? "Gói Pro đang bật: xuất mọi định dạng không giới hạn." : `Bạn còn ${billing.data!.exportCredits.balance} lượt xuất.`} Lưu thiết kế thành dự án để xuất file in.
          </p>
          <button type="button" onClick={onSaveProject} disabled={blocked || saving || !onSaveProject} title={blockedTitle} className={buttonClass({ variant: "brand", size: "lg", block: true, className: "mt-4" })}>
            <Save className="size-4" aria-hidden />
            {saving ? "Đang lưu…" : "Lưu dự án & xuất file in"}
          </button>
        </>
      ) : owned ? (
        <>
          <p className="mt-2 flex items-start gap-2 text-body-sm text-fg-muted">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
            {access.data!.mode === "UNLIMITED"
              ? "Gói Pro đang bật: xuất mọi định dạng không giới hạn."
              : access.data!.unlocked
                ? "Bản thiết kế này đã được mở khóa: xuất lại mọi định dạng không tốn thêm lượt."
                : `Bạn còn ${access.data!.balance} lượt xuất. Lần xuất đầu dùng 1 lượt cho bản thiết kế này.`}
          </p>
          <button type="button" onClick={onExport} disabled={blocked} title={blockedTitle} className={buttonClass({ variant: "brand", size: "lg", block: true, className: "mt-4" })}>
            <Download className="size-4" aria-hidden />
            Xuất file in
          </button>
        </>
      ) : (
        <>
          <p className="mt-2 text-body-sm text-fg-muted">Chọn gói để mở khóa file in sạch, không watermark. Nút xuất file hiện ra ngay sau khi thanh toán.</p>
          <div role="radiogroup" aria-label="Gói xuất file" className="mt-3 flex flex-col gap-2">
            {PACKAGES.map((pack) => {
              const on = pack.purpose === choice;
              return (
                <button
                  key={pack.purpose}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setChoice(pack.purpose)}
                  className={cn(
                    "flex min-h-[52px] items-center justify-between gap-3 rounded-control border px-3.5 py-2 text-left outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-focus/50",
                    on ? "border-fpt-orange bg-fpt-orange-light" : "border-line hover:bg-surface-sunken",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block text-body-sm font-semibold text-fg">{pack.label}</span>
                    <span className="block text-caption text-fg-muted">{pack.detail}</span>
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums text-fg">{formatVnd(pack.priceVnd)}</span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setPaying(choice)}
            disabled={blocked}
            title={blockedTitle}
            className={buttonClass({ variant: "brand", size: "lg", block: true, className: "mt-4" })}
          >
            <CreditCard className="size-4" aria-hidden />
            Thanh toán · {formatVnd(selected.priceVnd)}
          </button>
          <p className="mt-2 text-caption text-fg-muted">Bạn sẽ đọc và đồng ý điều khoản thanh toán trước khi tạo mã chuyển khoản.</p>
        </>
      )}

      {paying && (
        <CheckoutDialog
          purpose={paying}
          doneLabel="Xong, xuất file in"
          onPaid={() => void (projectId ? access.refetch() : billing.refetch())}
          onClose={() => {
            setPaying(null);
            void (projectId ? access.refetch() : billing.refetch());
          }}
        />
      )}
    </StudioCard>
  );
}

"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, CreditCard, Download, Lock, LogIn, Save } from "lucide-react";
import { PAYMENT_TERMS_PATH, type BoxDimensions } from "@wrapfit/shared";
import { getExportAccess } from "@/api";
import { buttonClass } from "@/components/ui";
import { ROUTES } from "@/constants";
import { queryKeys } from "@/hooks/data";
import { cn } from "@/utils/helpers";
import { CardTitle, StudioCard } from "../studioUi";

/** The same key as the export dialog's access query, so one invalidation refreshes both. */
export const exportAccessKey = (projectId: string) => [...queryKeys.projects.exports(projectId), "access"] as const;

/** The print cart with this design added: where the print order (and with it the print file) is paid. */
export const cartWith = (projectId: string) => `/cart?add=${encodeURIComponent(projectId)}`;

interface ExportPurchaseCardProps {
  /** Saved project; null in the demo (nothing can be paid for or exported there). */
  projectId: string | null;
  /** FitCheck errors: nothing should be paid for or exported until they are fixed. */
  blocked: boolean;
  onExport(): void;
  /** Signed in (the demo studio of a signed-in user saves the design as a project first). */
  signedIn?: boolean;
  /** Saves the demo as a project (then the card offers the payment on /editor/<id>). */
  onSaveProject?(): void;
  saving?: boolean;
  /** Summary of box specification (structure, dimensions, material, finishes) */
  specSummary?: {
    structureName: string;
    dimensions: BoxDimensions;
    paperName: string;
    finishesText?: string;
  };
  className?: string;
}

/** Saving is free at any step; only the print file is sold, and the terms apply before any payment. */
function TermsNote() {
  return (
    <p className="mt-3 border-t border-line pt-3 text-caption text-fg-muted">
      Lưu dự án miễn phí ở mọi bước; chỉ file in cần thanh toán. Trước khi trả tiền, bạn đọc và đồng ý{" "}
      <Link href={PAYMENT_TERMS_PATH} target="_blank" rel="noopener" className="font-semibold text-accent underline underline-offset-2">
        điều khoản thanh toán
      </Link>{" "}
      và{" "}
      <Link href="/legal/terms#studio" target="_blank" rel="noopener" className="font-semibold text-accent underline underline-offset-2">
        điều khoản sử dụng
      </Link>
      .
    </p>
  );
}

/**
 * Step 6, the print file: it is sold through the print cart, never given away. Until a paid print order holds this
 * version of the design the card shows "Thanh toán", which adds the design to the cart; once the order is paid the
 * card shows "Xuất file in". The server checks again on every export (a new edit needs a new paid order).
 */
export function ExportPurchaseCard({
  projectId,
  blocked,
  onExport,
  signedIn = false,
  onSaveProject,
  saving = false,
  specSummary,
  className,
}: ExportPurchaseCardProps) {
  const access = useQuery({
    queryKey: exportAccessKey(projectId ?? "demo"),
    queryFn: () => getExportAccess(projectId!),
    enabled: Boolean(projectId),
    // Back from the cart after paying: the card unlocks without a reload.
    refetchOnWindowFocus: true,
  });
  const unlocked = Boolean(projectId && access.data?.unlocked);
  const blockedTitle = blocked ? "Sửa các lỗi FitCheck trước khi thanh toán và xuất file" : undefined;

  return (
    <StudioCard data-tour="s6-export" className={cn("p-5 flex flex-col justify-between", className)} aria-labelledby="export-card-title">
      <div>
        <CardTitle id="export-card-title" action={unlocked ? <span className="text-caption font-semibold text-success-fg">Đã thanh toán</span> : <Lock className="size-4 text-fg-muted" aria-hidden />}>
          File in
        </CardTitle>

        {specSummary && (
          <div className="mt-3 rounded-xl border border-line bg-surface-sunken/60 p-3 text-xs">
            <p className="font-bold text-sm text-fg">{specSummary.structureName}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-fg-muted">
              <span className="font-semibold text-fpt-orange-ink tabular-nums">
                {specSummary.dimensions.length} × {specSummary.dimensions.width} × {specSummary.dimensions.height} mm
              </span>
              <span className="text-slate-300">•</span>
              <span className="font-medium text-fg">{specSummary.paperName}</span>
            </div>
            {specSummary.finishesText && (
              <div className="mt-1.5 border-t border-line/60 pt-1.5 text-caption text-fg-muted">
                Gia công: <span className="font-medium text-fg">{specSummary.finishesText}</span>
              </div>
            )}
          </div>
        )}

        <div className="mt-3">
          {!projectId && !signedIn ? (
            <p className="text-body-sm text-fg-muted">
              Bản dùng thử không xuất được file in. Đăng nhập, lưu dự án rồi thanh toán đơn in để tải gói file in (.ai · PDF CMYK · SVG · DXF).
            </p>
          ) : !projectId ? (
            <p className="text-body-sm text-fg-muted">
              Lưu thiết kế thành dự án để thanh toán đơn in. Thanh toán xong, nút Xuất file in hiện ra ở đây.
            </p>
          ) : access.isPending ? (
            <p className="text-body-sm text-fg-muted" role="status">
              Đang kiểm tra thanh toán của bản thiết kế này…
            </p>
          ) : unlocked ? (
            <p className="flex items-start gap-2 text-body-sm text-fg-muted">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
              Đơn in của bản thiết kế này đã thanh toán: xuất mọi định dạng file in.
            </p>
          ) : (
            <p className="text-body-sm text-fg-muted">
              File in sạch, không watermark, mở sau khi bạn thanh toán đơn in của bản thiết kế này ở giỏ. Sửa thiết kế sau khi trả thì cần đơn mới.
            </p>
          )}
        </div>
      </div>

      <div className="mt-4">
        {!projectId && !signedIn ? (
          <Link href={ROUTES.login} className={buttonClass({ variant: "brand", size: "lg", block: true })}>
            <LogIn className="size-4" aria-hidden />
            Đăng nhập để thanh toán
          </Link>
        ) : !projectId ? (
          <button type="button" onClick={onSaveProject} disabled={saving || !onSaveProject} className={buttonClass({ variant: "brand", size: "lg", block: true })}>
            <Save className="size-4" aria-hidden />
            {saving ? "Đang lưu…" : "Lưu dự án để thanh toán"}
          </button>
        ) : unlocked ? (
          <button type="button" onClick={onExport} disabled={blocked} title={blockedTitle} className={buttonClass({ variant: "brand", size: "lg", block: true })}>
            <Download className="size-4" aria-hidden />
            Xuất file in
          </button>
        ) : blocked ? (
          <button type="button" disabled title={blockedTitle} className={buttonClass({ variant: "brand", size: "lg", block: true })}>
            <CreditCard className="size-4" aria-hidden />
            Thanh toán
          </button>
        ) : (
          <Link href={cartWith(projectId)} className={buttonClass({ variant: "brand", size: "lg", block: true })}>
            <CreditCard className="size-4" aria-hidden />
            Thanh toán
          </Link>
        )}

        <TermsNote />
      </div>
    </StudioCard>
  );
}

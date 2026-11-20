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
    <p className="mt-2.5 border-t border-line/60 pt-2 text-caption text-fg-muted leading-relaxed">
      Lưu miễn phí. Đọc{" "}
      <Link href={PAYMENT_TERMS_PATH} target="_blank" rel="noopener" className="font-semibold text-fpt-orange hover:underline">
        điều khoản thanh toán
      </Link>{" "}
      &{" "}
      <Link href="/legal/terms#studio" target="_blank" rel="noopener" className="font-semibold text-fpt-orange hover:underline">
        sử dụng
      </Link>.
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
    <StudioCard
      data-tour="s6-export"
      className={cn(
        "p-5 rounded-2xl border border-line/70 bg-surface-raised shadow-xs",
        className
      )}
      aria-labelledby="export-card-title"
    >
      <div className="flex flex-col gap-4">
        {/* Left side: Package info & Specs */}
        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-xl bg-orange-50 text-fpt-orange shrink-0">
              <Download className="size-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 id="export-card-title" className="text-sm font-bold text-fg uppercase tracking-wider">
                  Gói File Xuất Xưởng
                </h4>
                {unlocked ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-caption font-semibold text-emerald-700 whitespace-nowrap">
                    <CheckCircle2 className="size-3" />
                    Đã thanh toán
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-caption font-medium text-slate-600 whitespace-nowrap">
                    <Lock className="size-3" />
                    Cần đặt in
                  </span>
                )}
              </div>
              <p className="text-xs text-fg-muted mt-0.5">
                Vector PDF CMYK 300 DPI (lớp CutContour, Crease, Artwork) · DXF dao bế · SVG
              </p>
            </div>
          </div>

          {specSummary && (
            <div className="self-start inline-flex max-w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-line/60 bg-surface-sunken/40 px-3.5 py-1.5 text-xs">
              <span className="font-bold text-fg">{specSummary.structureName}</span>
              <span className="text-line-strong">•</span>
              <span className="font-semibold text-fpt-orange-ink tabular-nums">
                {specSummary.dimensions.length} × {specSummary.dimensions.width} × {specSummary.dimensions.height} mm
              </span>
              <span className="text-line-strong">•</span>
              <span className="text-fg-muted">{specSummary.paperName}</span>
              {specSummary.finishesText && (
                <>
                  <span className="text-line-strong">•</span>
                  <span className="text-fg-muted font-medium">Gia công: {specSummary.finishesText}</span>
                </>
              )}
            </div>
          )}

          <div className="text-xs text-fg-muted leading-relaxed">
            {!projectId && !signedIn ? (
              <p>Bản dùng thử chưa xuất được file in. Đăng nhập để lưu dự án và tải trọn bộ file chuẩn xưởng in.</p>
            ) : !projectId ? (
              <p>Lưu thiết kế thành dự án để thanh toán và xuất file in kỹ thuật cao.</p>
            ) : access.isPending ? (
              <p role="status">Đang kiểm tra thanh toán…</p>
            ) : unlocked ? (
              <p className="flex items-center gap-1.5 text-emerald-700 font-medium">
                <CheckCircle2 className="size-4 shrink-0 text-emerald-600" aria-hidden />
                Đã thanh toán: Sẵn sàng tải trọn bộ file in CMYK và dao bế.
              </p>
            ) : (
              <p>File in nét chuẩn 300 DPI, mở sau khi bạn thanh toán đơn in ở giỏ hàng.</p>
            )}
          </div>
        </div>

        {/* Right side: Action CTA Button & Terms Note */}
        <div className="shrink-0 flex flex-col items-stretch border-t border-line/60 pt-3">
          <div className="w-full">
            {!projectId && !signedIn ? (
              <Link href={`${ROUTES.login}?redirect=${encodeURIComponent(`${ROUTES.editorDemo}?step=6`)}`} className={buttonClass({ variant: "brand", size: "lg", block: true })}>
                <LogIn className="size-4" aria-hidden />
                Đăng nhập để thanh toán
              </Link>
            ) : !projectId ? (
              <button
                type="button"
                onClick={onSaveProject}
                disabled={saving || !onSaveProject}
                className={buttonClass({ variant: "brand", size: "lg", block: true })}
              >
                <Save className="size-4" aria-hidden />
                {saving ? "Đang lưu…" : "Lưu dự án để thanh toán"}
              </button>
            ) : unlocked ? (
              <button
                type="button"
                onClick={onExport}
                disabled={blocked}
                title={blockedTitle}
                className={buttonClass({ variant: "brand", size: "lg", block: true })}
              >
                <Download className="size-4" aria-hidden />
                Xuất file in ngay
              </button>
            ) : blocked ? (
              <button
                type="button"
                disabled
                title={blockedTitle}
                className={buttonClass({ variant: "brand", size: "lg", block: true })}
              >
                <CreditCard className="size-4" aria-hidden />
                Thanh toán
              </button>
            ) : (
              <Link href={cartWith(projectId)} className={buttonClass({ variant: "brand", size: "lg", block: true })}>
                <CreditCard className="size-4" aria-hidden />
                Thanh toán
              </Link>
            )}
          </div>

          <TermsNote />
        </div>
      </div>
    </StudioCard>
  );
}

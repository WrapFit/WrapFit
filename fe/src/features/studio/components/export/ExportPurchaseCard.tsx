"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, CreditCard, Download, Lock, LogIn, Save } from "lucide-react";
import { PAYMENT_TERMS_PATH } from "@wrapfit/shared";
import { getExportAccess } from "@/api";
import { buttonClass } from "@/components/ui";
import { ROUTES } from "@/constants";
import { queryKeys } from "@/hooks/data";
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
export function ExportPurchaseCard({ projectId, blocked, onExport, signedIn = false, onSaveProject, saving = false }: ExportPurchaseCardProps) {
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
    <StudioCard data-tour="s6-export" className="p-5" aria-labelledby="export-card-title">
      <CardTitle id="export-card-title" action={unlocked ? <span className="text-caption font-semibold text-success-fg">Đã thanh toán</span> : <Lock className="size-4 text-fg-muted" aria-hidden />}>
        File in
      </CardTitle>

      {!projectId && !signedIn ? (
        <>
          <p className="mt-2 text-body-sm text-fg-muted">
            Bản dùng thử không xuất được file in. Đăng nhập, lưu dự án rồi thanh toán đơn in để tải gói file in (.ai · PDF CMYK · SVG · DXF).
          </p>
          <Link href={ROUTES.login} className={buttonClass({ variant: "brand", size: "lg", block: true, className: "mt-4" })}>
            <LogIn className="size-4" aria-hidden />
            Đăng nhập để thanh toán
          </Link>
        </>
      ) : !projectId ? (
        <>
          <p className="mt-2 text-body-sm text-fg-muted">Lưu thiết kế thành dự án để thanh toán đơn in. Thanh toán xong, nút Xuất file in hiện ra ở đây.</p>
          <button type="button" onClick={onSaveProject} disabled={saving || !onSaveProject} className={buttonClass({ variant: "brand", size: "lg", block: true, className: "mt-4" })}>
            <Save className="size-4" aria-hidden />
            {saving ? "Đang lưu…" : "Lưu dự án để thanh toán"}
          </button>
        </>
      ) : access.isPending ? (
        <p className="mt-3 text-body-sm text-fg-muted" role="status">
          Đang kiểm tra thanh toán của bản thiết kế này…
        </p>
      ) : unlocked ? (
        <>
          <p className="mt-2 flex items-start gap-2 text-body-sm text-fg-muted">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
            Đơn in của bản thiết kế này đã thanh toán: xuất mọi định dạng file in.
          </p>
          <button type="button" onClick={onExport} disabled={blocked} title={blockedTitle} className={buttonClass({ variant: "brand", size: "lg", block: true, className: "mt-4" })}>
            <Download className="size-4" aria-hidden />
            Xuất file in
          </button>
        </>
      ) : (
        <>
          <p className="mt-2 text-body-sm text-fg-muted">
            File in sạch, không watermark, mở sau khi bạn thanh toán đơn in của bản thiết kế này ở giỏ. Sửa thiết kế sau khi trả thì cần đơn mới.
          </p>
          {blocked ? (
            <button type="button" disabled title={blockedTitle} className={buttonClass({ variant: "brand", size: "lg", block: true, className: "mt-4" })}>
              <CreditCard className="size-4" aria-hidden />
              Thanh toán
            </button>
          ) : (
            <Link href={cartWith(projectId)} className={buttonClass({ variant: "brand", size: "lg", block: true, className: "mt-4" })}>
              <CreditCard className="size-4" aria-hidden />
              Thanh toán
            </Link>
          )}
        </>
      )}

      <TermsNote />
    </StudioCard>
  );
}

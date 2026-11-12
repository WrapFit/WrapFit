"use client";

import { CheckCircle2, ShieldAlert } from "lucide-react";
import Link from "next/link";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { PAYMENT_TERMS_CLAUSES, PAYMENT_TERMS_PATH, PAYMENT_TERMS_VERSION } from "@wrapfit/shared";
import { Checkbox } from "@/components/ui";
import { formatVnd } from "@/features/pricing";
import { cn } from "@/utils/helpers";

/** A few pixels of slack: zoomed browsers rarely land exactly on the last pixel. */
const END_SLACK_PX = 12;

interface PaymentTermsGateProps {
  /** What is being bought, e.g. "Mua 1 lượt xuất". */
  itemLabel: string;
  /** Price when known before the payment exists (packs); null for a sample order (the server prices it). */
  amountVnd: number | null;
  accepted: boolean;
  onAcceptedChange(accepted: boolean): void;
}

/**
 * Step 0 of every checkout: the clauses about the risk of losing money (failed export, file not as expected, transfer
 * mistakes, refunds), shown in full. The "I agree" box unlocks only once the list has been scrolled to its end (a thin
 * bar shows how far), and the payment is created only after it is ticked (the server checks the terms version too).
 */
export function PaymentTermsGate({ itemLabel, amountVnd, accepted, onAcceptedChange }: PaymentTermsGateProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const readToEnd = progress >= 1;

  const check = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const room = el.scrollHeight - el.clientHeight;
    setProgress((prev) => Math.max(prev, room <= END_SLACK_PX ? 1 : Math.min(1, (el.scrollTop + END_SLACK_PX) / room)));
  }, []);
  // A tall screen may show the whole list without scrolling: then it has been read.
  useEffect(() => {
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [check]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3 border-b border-line pb-3">
        <span className="min-w-0 text-body-sm text-fg-muted">
          Bạn sắp thanh toán <strong className="font-semibold text-fg">{itemLabel}</strong>
        </span>
        {amountVnd !== null && <span className="shrink-0 font-landing-heading text-title font-bold tabular-nums text-fg">{formatVnd(amountVnd)}</span>}
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-body-sm font-medium text-fg">
          <ShieldAlert className="size-4 shrink-0 text-warning-fg" aria-hidden />
          Điều khoản về rủi ro mất tiền
        </p>
        <span className={cn("inline-flex items-center gap-1 text-caption font-semibold", readToEnd ? "text-success-fg" : "text-fg-muted")}>
          {readToEnd ? <CheckCircle2 className="size-3.5" aria-hidden /> : null}
          {readToEnd ? "Đã đọc hết" : `Đã đọc ${Math.round(progress * 100)}%`}
        </span>
      </div>

      <div className="overflow-hidden rounded-panel bg-surface-sunken">
        <div aria-hidden className="h-0.5 bg-line/60">
          <div className="h-full bg-action transition-[width] duration-150" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
        <div
          ref={listRef}
          onScroll={check}
          tabIndex={0}
          role="region"
          aria-label="Điều khoản thanh toán"
          className="max-h-[min(34vh,300px)] overflow-y-auto overscroll-contain px-4 py-3 outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-focus/40"
        >
          <ol className="flex flex-col divide-y divide-line/70">
            {PAYMENT_TERMS_CLAUSES.map((clause, index) => (
              <li key={clause.id} className="flex gap-3 py-2.5 first:pt-0.5">
                <span aria-hidden className="mt-px w-4 shrink-0 text-right text-caption font-semibold tabular-nums text-fg-muted">
                  {index + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-body-sm font-semibold text-fg">{clause.title}</span>
                  <span className="mt-0.5 block text-caption leading-5 text-fg-muted">{clause.body}</span>
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-2 border-t border-line/70 pt-2.5 text-caption text-fg-muted">
            Bản đầy đủ:{" "}
            <Link href={PAYMENT_TERMS_PATH} target="_blank" rel="noopener" className="font-semibold text-accent underline underline-offset-2">
              Chính sách thanh toán & hồ sơ pháp lý
            </Link>{" "}
            ·{" "}
            <Link href="/legal/terms" target="_blank" rel="noopener" className="font-semibold text-accent underline underline-offset-2">
              Điều khoản sử dụng
            </Link>{" "}
            · bản {PAYMENT_TERMS_VERSION.split("-").reverse().join("/")}
          </p>
        </div>
      </div>

      <div className={cn("rounded-panel px-3 py-1 transition-colors", accepted ? "bg-accent-bg" : readToEnd ? "bg-surface-sunken" : "bg-transparent")}>
        <Checkbox
          checked={accepted}
          disabled={!readToEnd}
          onChange={(e) => onAcceptedChange(e.currentTarget.checked)}
          label="Tôi đã đọc và đồng ý điều khoản thanh toán, gồm các rủi ro và chính sách hoàn tiền."
          description={readToEnd ? undefined : "Kéo xuống hết danh sách điều khoản để đồng ý."}
        />
      </div>
    </div>
  );
}

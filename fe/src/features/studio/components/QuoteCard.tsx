"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Clock, Copy, PackageCheck, Scissors } from "lucide-react";
import { FINISH_LABELS, quote, quoteSaving, type BoxDimensions, type DielinePiece, type QuoteFinish } from "@wrapfit/shared";
import { Button, buttonClass } from "@/components/ui";
import { useToast } from "@/components/common/Toast";
import { formatVnd } from "@/features/pricing";
import { paperStockOf } from "@/features/studio/utils/paperStocks";
import { cn } from "@/utils/helpers";
import { StudioCard, CardTitle } from "./studioUi";
import type { BoxMaterialTheme } from "./three/InteractiveFoldingBox3D";

const QUANTITIES = [1, 20, 50, 100, 300, 500];
const AXIS_LABELS = { length: "chiều dài", width: "chiều rộng", height: "chiều cao" } as const;

interface QuoteCardProps {
  structure: string;
  pieces: DielinePiece[];
  dimensions: BoxDimensions;
  formulaVersion?: number;
  material: BoxMaterialTheme;
  /** Finishes chosen in step 3 and those of the elements (foil, UV, embossing). */
  finishes: QuoteFinish[];
  /** The design prints on the inside of the sheet too (second printing pass). */
  insidePrint?: boolean;
  title: string;
  /** Saved project: the sample goes to the cart; the offline demo confirms it here. */
  projectId: string | null;
  /** Errors of FitCheck: nothing can be ordered. */
  blocked: boolean;
  quantity: number;
  onQuantityChange(quantity: number): void;
}

/** Step 6: estimated price by quantity, the cheaper size when there is one, and the sample order. */
export function QuoteCard({
  structure,
  pieces,
  dimensions,
  formulaVersion,
  material,
  finishes,
  insidePrint = false,
  title,
  projectId,
  blocked,
  quantity,
  onQuantityChange: setQuantity,
}: QuoteCardProps) {
  const toast = useToast();
  const [sampleRequested, setSampleRequested] = useState(false);
  const paper = paperStockOf(material).quotePaper;
  const result = useMemo(() => quote({ structure, pieces, quantity, paper, finishes, insidePrint }), [structure, pieces, quantity, paper, finishes, insidePrint]);
  const sample = useMemo(() => quote({ structure, pieces, quantity: 1, paper, finishes, insidePrint }), [structure, pieces, paper, finishes, insidePrint]);
  const saving = useMemo(
    () => (quantity >= 20 ? quoteSaving({ structure, dimensions, formulaVersion, quantity, paper, finishes, insidePrint }) : null),
    [structure, dimensions, formulaVersion, quantity, paper, finishes, insidePrint]
  );

  const summary = [
    `Báo giá ước tính WrapFit: ${title}`,
    `${dimensions.length} × ${dimensions.width} × ${dimensions.height} mm · ${paperStockOf(material).name}${finishes.length ? ` · ${finishes.map((f) => FINISH_LABELS[f]).join(", ")}` : ""}`,
    `${result.quantity} hộp · ${result.methodLabel}`,
    ...result.groups.flatMap((group) => [
      `${group.label}: ${formatVnd(group.vnd)}`,
      ...result.lines.filter((line) => line.group === group.group).map((line) => `  - ${line.label}: ${formatVnd(line.vnd)} (${line.detail})`),
    ]),
    `Tổng: ${formatVnd(result.total)} (${formatVnd(result.perBox)}/hộp) · sản xuất khoảng ${result.leadDays} ngày làm việc`,
    "Giá hộp hoàn thiện, chưa gồm VAT, vận chuyển và lưu kho (thỏa thuận với xưởng). Đơn giá giả định cho bản demo.",
  ].join("\n");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      toast.show({ tone: "success", title: "Đã chép báo giá", description: "Dán vào Zalo hoặc email gửi xưởng in." });
    } catch {
      toast.show({ tone: "error", title: "Chưa chép được", description: "Trình duyệt chặn bộ nhớ tạm." });
    }
  };

  return (
    <StudioCard data-tour="s6-quote" className="p-5 sm:p-6" aria-labelledby="quote-title">
      {/* Wide layout: quantity | price | actions, side by side from lg, stacked on phones. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_260px] lg:gap-0 lg:divide-x lg:divide-line">
        <div className="lg:pr-6">
          <CardTitle id="quote-title" action={<span className="text-caption text-fg-muted">Ước tính</span>}>
            Báo giá in
          </CardTitle>
          <p className="mt-1 text-caption text-fg-muted">Số lượng hộp</p>
          <div role="radiogroup" aria-label="Số lượng hộp" className="mt-2 flex flex-wrap gap-1.5">
            {QUANTITIES.map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={quantity === value}
                onClick={() => setQuantity(value)}
                className={cn(
                  "h-9 min-w-11 rounded-full px-3 text-sm tabular-nums outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-focus/40",
                  quantity === value ? "bg-fpt-orange-light font-semibold text-accent ring-1 ring-fpt-orange/30" : "bg-surface-raised font-medium text-fg ring-1 ring-line hover:ring-line-strong"
                )}
              >
                {value}
              </button>
            ))}
            <label className="flex h-9 items-center gap-1.5 rounded-full bg-surface-sunken px-3 text-label-sm text-fg-muted">
              <span>Khác</span>
              <input
                type="number"
                min={1}
                max={100000}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Math.min(100000, Number(e.target.value) || 1)))}
                className="w-16 bg-transparent text-fg tabular-nums outline-none"
                aria-label="Số lượng hộp khác"
              />
            </label>
          </div>
          {saving && (
            <p className="mt-3 rounded-control bg-success-bg px-3 py-2 text-body-sm text-success-fg">
              Bớt {saving.deltaMm} mm {AXIS_LABELS[saving.axis]} thì được {saving.perSheet} hộp mỗi tờ, còn {formatVnd(saving.perBox)}/hộp
              (rẻ hơn {Math.round(saving.saving * 100)}%) nếu món quà vẫn vừa.
            </p>
          )}
        </div>

        <div className="lg:px-6">
          <p className="font-landing-heading text-heading-md font-bold tabular-nums text-fg">
            {formatVnd(result.perBox)}
            <span className="text-body-sm font-semibold text-fg-muted"> /hộp</span>
          </p>
          <p className="text-body-sm tabular-nums text-fg-muted">
            Tổng <strong className="font-semibold text-fg">{formatVnd(result.total)}</strong> cho {result.quantity} hộp
          </p>
          <ul className="mt-3 flex flex-col gap-1.5 text-caption text-fg-muted">
            <li className="flex items-start gap-1.5">
              <Scissors className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {result.methodLabel} · {result.perSheet} hộp mỗi tờ B1
            </li>
            <li className="flex items-start gap-1.5">
              <Clock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              Sản xuất khoảng {result.leadDays} ngày làm việc
            </li>
          </ul>
          <p className="mt-3 text-caption leading-5 text-fg-muted">Giá hộp hoàn thiện tại xưởng đối tác, chưa gồm VAT và vận chuyển.</p>
          <a href="#quote-detail" className="mt-1 inline-flex min-h-8 items-center text-body-sm font-semibold text-accent underline-offset-2 hover:underline">
            Xem báo giá chi tiết
          </a>
        </div>

        <div className="flex flex-col justify-center gap-2 lg:pl-6">
          {sampleRequested ? (
            <p role="status" className="flex items-start gap-2 rounded-control bg-success-bg px-3 py-2.5 text-body-sm text-success-fg">
              <PackageCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
              Đã ghi nhận yêu cầu in mẫu 1 hộp ({formatVnd(sample.total)}). Đăng nhập và lưu dự án để đặt thật.
            </p>
          ) : projectId ? (
            <Link
              href={`/cart?add=${encodeURIComponent(projectId)}`}
              aria-disabled={blocked}
              className={buttonClass({ variant: "brand", size: "lg", block: true, className: cn(blocked && "pointer-events-none opacity-50") })}
            >
              <PackageCheck className="size-4" aria-hidden />
              In mẫu 1 hộp · {formatVnd(sample.total)}
            </Link>
          ) : (
            <Button variant="brand" size="lg" block disabled={blocked} onClick={() => setSampleRequested(true)} leadingIcon={<PackageCheck className="size-4" aria-hidden />}>
              In mẫu 1 hộp · {formatVnd(sample.total)}
            </Button>
          )}
          <Button variant="secondary" size="lg" block onClick={() => void copy()} leadingIcon={<Copy className="size-4" aria-hidden />}>
            Chép báo giá {result.quantity} hộp
          </Button>
        </div>
      </div>
    </StudioCard>
  );
}

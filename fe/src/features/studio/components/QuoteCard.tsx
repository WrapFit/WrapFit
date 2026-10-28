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
  /** Finishes chosen in step 3. */
  finishes: QuoteFinish[];
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
  title,
  projectId,
  blocked,
  quantity,
  onQuantityChange: setQuantity,
}: QuoteCardProps) {
  const toast = useToast();
  const [sampleRequested, setSampleRequested] = useState(false);
  const paper = paperStockOf(material).quotePaper;
  const result = useMemo(() => quote({ structure, pieces, quantity, paper, finishes }), [structure, pieces, quantity, paper, finishes]);
  const sample = useMemo(() => quote({ structure, pieces, quantity: 1, paper, finishes }), [structure, pieces, paper, finishes]);
  const saving = useMemo(
    () => (quantity >= 20 ? quoteSaving({ structure, dimensions, formulaVersion, quantity, paper, finishes }) : null),
    [structure, dimensions, formulaVersion, quantity, paper, finishes]
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
    <StudioCard data-tour="s6-quote" className="p-5" aria-labelledby="quote-title">
      <CardTitle id="quote-title" action={<span className="text-caption text-fg-muted">Ước tính</span>}>
        Báo giá in
      </CardTitle>

      <div role="radiogroup" aria-label="Số lượng hộp" className="mt-3 flex flex-wrap gap-1.5">
        {QUANTITIES.map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={quantity === value}
            onClick={() => setQuantity(value)}
            className={buttonClass({ variant: quantity === value ? "dark" : "secondary", size: "sm", className: "min-h-11 min-w-11 tabular-nums" })}
          >
            {value}
          </button>
        ))}
        <label className="flex min-h-11 items-center gap-1.5 rounded-full bg-surface-sunken px-3 text-label-sm text-fg-muted">
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

      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="font-landing-heading text-heading-md font-bold tabular-nums text-fg">
            {formatVnd(result.perBox)}
            <span className="text-body-sm font-semibold text-fg-muted"> /hộp</span>
          </p>
          <p className="text-body-sm tabular-nums text-fg-muted">
            Tổng {formatVnd(result.total)} cho {result.quantity} hộp
          </p>
        </div>
        <p className="text-right text-caption text-fg-muted">
          <Clock className="mr-1 inline size-3.5" aria-hidden />
          sản xuất khoảng {result.leadDays} ngày
        </p>
      </div>

      <p className="mt-2 flex items-start gap-1.5 text-caption text-fg-muted">
        <Scissors className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        {result.methodLabel} · {result.perSheet} hộp mỗi tờ B1
      </p>

      {saving && (
        <p className="mt-3 rounded-control bg-success-bg px-3 py-2 text-body-sm text-success-fg">
          Bớt {saving.deltaMm} mm {AXIS_LABELS[saving.axis]} thì được {saving.perSheet} hộp mỗi tờ, còn {formatVnd(saving.perBox)}/hộp
          (rẻ hơn {Math.round(saving.saving * 100)}%) nếu món quà vẫn vừa.
        </p>
      )}

      <p className="mt-3 text-caption leading-5 text-fg-muted">
        Giá hộp hoàn thiện tại xưởng đối tác, chưa gồm VAT. Vận chuyển và lưu kho bạn thỏa thuận trực tiếp với xưởng.
      </p>
      <a href="#quote-detail" className="mt-2 inline-flex min-h-9 items-center text-body-sm font-semibold text-accent underline-offset-2 hover:underline">
        Xem từng khoản và giá theo số lượng
      </a>

      <div className="mt-4 grid gap-2">
        {sampleRequested ? (
          <p role="status" className="flex items-start gap-2 rounded-control bg-success-bg px-3 py-2.5 text-body-sm text-success-fg">
            <PackageCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
            Đã ghi nhận yêu cầu in mẫu 1 hộp ({formatVnd(sample.total)}). Bản dùng thử chưa gửi đơn tới xưởng: đăng nhập và lưu dự án để đặt thật.
          </p>
        ) : projectId ? (
          <Link
            href={`/cart?add=${encodeURIComponent(projectId)}`}
            aria-disabled={blocked}
            className={buttonClass({ variant: "brand", size: "lg", block: true, className: cn(blocked && "pointer-events-none opacity-50") })}
          >
            <PackageCheck className="size-4" aria-hidden />
            Đặt in mẫu 1 hộp · {formatVnd(sample.total)}
          </Link>
        ) : (
          <Button variant="brand" size="lg" block disabled={blocked} onClick={() => setSampleRequested(true)} leadingIcon={<PackageCheck className="size-4" aria-hidden />}>
            Đặt in mẫu 1 hộp · {formatVnd(sample.total)}
          </Button>
        )}
        <Button variant="secondary" size="lg" block onClick={() => void copy()} leadingIcon={<Copy className="size-4" aria-hidden />}>
          Chép báo giá {result.quantity} hộp
        </Button>
      </div>
    </StudioCard>
  );
}

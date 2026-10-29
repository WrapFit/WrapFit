"use client";
/* ds-artwork: the three cost groups use a validated categorical palette (dataviz validator, light surface). */

import React, { useMemo } from "react";
import { Info, Layers, TrendingDown } from "lucide-react";
import {
  DIGITAL_MAX_QUANTITY,
  FINISH_LABELS,
  QUOTE_LADDER,
  QUOTE_PRICES,
  quote,
  quoteLadder,
  sheetYield,
  type DielinePiece,
  type QuoteFinish,
  type QuoteGroup,
} from "@wrapfit/shared";
import { formatVnd } from "@/features/pricing";
import { paperStockOf } from "@/features/studio/utils/paperStocks";
import { cn } from "@/utils/helpers";
import { CardTitle, StudioCard } from "./studioUi";
import type { BoxMaterialTheme } from "./three/InteractiveFoldingBox3D";

/** Fixed order: material (kraft brown), printing (FPT blue), converting and finishing (FPT orange). */
const GROUP_COLORS: Record<QuoteGroup, string> = {
  material: "#A8661C",
  print: "#005CA9",
  converting: "#F26522",
};
/** "6,8%" under 10%, "56%" above. */
const percent = (share: number) => `${(share * 100).toFixed(Math.abs(share) < 0.1 ? 1 : 0).replace(".", ",")}%`;

interface QuoteBreakdownProps {
  structure: string;
  pieces: DielinePiece[];
  material: BoxMaterialTheme;
  finishes: QuoteFinish[];
  quantity: number;
  onQuantityChange(quantity: number): void;
}

/**
 * Step 6, the estimate in full, up to the finished box: where the money goes (box material, printing, converting and
 * finishing), every line with how it is computed, and how the price per box falls with the quantity. Shipping and
 * storage are agreed between the customer and the shop, so they are left out.
 */
export function QuoteBreakdown({ structure, pieces, material, finishes, quantity, onQuantityChange }: QuoteBreakdownProps) {
  const stock = paperStockOf(material);
  const input = useMemo(() => ({ structure, pieces, paper: stock.quotePaper, finishes }), [structure, pieces, stock.quotePaper, finishes]);
  const result = useMemo(() => quote({ ...input, quantity }), [input, quantity]);
  const other = useMemo(
    () => quote({ ...input, quantity, method: result.method === "digital" ? "offset" : "digital" }),
    [input, quantity, result.method]
  );
  const ladder = useMemo(() => quoteLadder(input, [...QUOTE_LADDER, quantity]), [input, quantity]);
  const yields = useMemo(() => sheetYield(pieces), [pieces]);
  const maxPerBox = Math.max(...ladder.map((step) => step.perBox));
  const perBox = (vnd: number) => formatVnd(Math.round(vnd / result.quantity / 10) * 10);
  const cheaper = other.perBox < result.perBox ? other : null;
  // A larger order that costs no more in total (offset beats digital past the threshold).
  const moreForLess = ladder.filter((step) => step.quantity > result.quantity && step.total <= result.total).at(-1) ?? null;

  return (
    <StudioCard id="quote-detail" aria-labelledby="quote-detail-title" className="p-5 sm:p-6">
      <CardTitle id="quote-detail-title" action={<span className="text-caption text-fg-muted">Ước tính, chưa gồm VAT và vận chuyển</span>}>
        Báo giá chi tiết · <span className="tabular-nums">{result.quantity}</span> hộp
      </CardTitle>

      {/* What the price is computed from */}
      <dl className="mt-3 grid grid-cols-2 gap-2 text-body-sm sm:grid-cols-4">
        {[
          { term: "Chất liệu", value: stock.name, note: finishes.length ? finishes.map((f) => FINISH_LABELS[f]).join(", ") : "Không hoàn thiện thêm" },
          { term: "Khổ trải phẳng", value: yields.map((y) => `${y.width} × ${y.height} mm`).join(" + "), note: `${result.areaM2.toFixed(3).replace(".", ",")} m² giấy mỗi hộp` },
          { term: "Xếp trên tờ B1", value: `${result.perSheet} hộp mỗi tờ`, note: `${result.sheets} tờ, gồm ${result.wasteSheets} tờ hao hụt` },
          { term: "Cách in", value: result.method === "digital" ? "In kỹ thuật số" : "In offset", note: `Tự chọn cách rẻ hơn; in KTS tối đa ${DIGITAL_MAX_QUANTITY.toLocaleString("vi-VN")} hộp` },
        ].map((item) => (
          <div key={item.term} className="rounded-control bg-surface-sunken px-3 py-2">
            <dt className="text-caption text-fg-muted">{item.term}</dt>
            <dd className="font-semibold tabular-nums text-fg">{item.value}</dd>
            <dd className="text-caption tabular-nums text-fg-muted">{item.note}</dd>
          </div>
        ))}
      </dl>

      {/* Where the money goes */}
      <section aria-labelledby="quote-split-title" className="mt-6">
        <h3 id="quote-split-title" className="flex items-center gap-2 font-landing-heading text-title font-bold text-fg">
          <Layers className="size-4 text-fg-muted" aria-hidden />
          Tiền đi về đâu
        </h3>
        <div className="mt-3 flex h-4 gap-0.5" role="img" aria-label={result.groups.map((g) => `${g.label} ${percent(g.share)}`).join(", ")}>
          {result.groups
            .filter((g) => g.vnd > 0)
            .map((g) => (
              <span
                key={g.group}
                title={`${g.label}: ${formatVnd(g.vnd)} (${percent(g.share)})`}
                className="h-full rounded first:rounded-l-full last:rounded-r-full"
                style={{ width: `${g.share * 100}%`, backgroundColor: GROUP_COLORS[g.group] }}
              />
            ))}
        </div>
        <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {result.groups.map((g) => (
            <li key={g.group} className="rounded-control border border-line px-3 py-2">
              <span className="flex items-center gap-1.5 text-caption font-semibold text-fg">
                <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: GROUP_COLORS[g.group] }} />
                {g.label}
              </span>
              <span className="mt-1 block font-landing-heading text-title font-bold tabular-nums text-fg">{percent(g.share)}</span>
              <span className="block text-caption tabular-nums text-fg-muted">
                {formatVnd(g.vnd)} · {perBox(g.vnd)}/hộp
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Every line */}
      <section aria-labelledby="quote-lines-title" className="mt-6">
        <h3 id="quote-lines-title" className="font-landing-heading text-title font-bold text-fg">
          Chi tiết từng khoản
        </h3>
        <div className="mt-2 overflow-x-auto rounded-control border border-line">
          <table className="w-full min-w-[560px] text-left text-body-sm">
            <thead className="bg-surface-sunken text-caption text-fg-muted">
              <tr>
                <th scope="col" className="px-3 py-2 font-semibold">Khoản</th>
                <th scope="col" className="px-3 py-2 font-semibold">Cách tính</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Thành tiền</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Mỗi hộp</th>
              </tr>
            </thead>
            {result.groups.map((g) => {
              const lines = result.lines.filter((line) => line.group === g.group);
              if (!lines.length) return null;
              return (
                <tbody key={g.group} className="border-t border-line">
                  <tr className="bg-surface-raised">
                    <th scope="rowgroup" colSpan={2} className="px-3 pb-1 pt-2.5 text-left font-semibold text-fg">
                      <span className="inline-flex items-center gap-1.5">
                        <span aria-hidden className="size-2.5 rounded-full" style={{ backgroundColor: GROUP_COLORS[g.group] }} />
                        {g.label}
                      </span>
                    </th>
                    <td className="px-3 pb-1 pt-2.5 text-right font-semibold tabular-nums text-fg">{formatVnd(g.vnd)}</td>
                    <td className="px-3 pb-1 pt-2.5 text-right font-semibold tabular-nums text-fg">{perBox(g.vnd)}</td>
                  </tr>
                  {lines.map((line) => (
                    <tr key={line.id}>
                      <th scope="row" className="py-1.5 pl-7 pr-3 text-left font-normal text-fg">{line.label}</th>
                      <td className="px-3 py-1.5 tabular-nums text-fg-muted">{line.detail}</td>
                      <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums text-fg">{formatVnd(line.vnd)}</td>
                      <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums text-fg-muted">{perBox(line.vnd)}</td>
                    </tr>
                  ))}
                </tbody>
              );
            })}
            <tfoot className="border-t-2 border-fg/20 bg-surface-sunken font-semibold text-fg">
              <tr>
                <th scope="row" colSpan={2} className="px-3 py-2 text-left">Tổng {result.quantity} hộp hoàn thiện</th>
                <td className="px-3 py-2 text-right tabular-nums">{formatVnd(result.total)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatVnd(result.perBox)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="mt-2 flex items-start gap-2 text-caption leading-5 text-fg-muted">
          <Info className="mt-0.5 size-3.5 shrink-0 text-info" aria-hidden />
          <span>
            Báo giá dừng ở hộp đã hoàn thiện tại xưởng đối tác. <strong className="text-fg">Vận chuyển và lưu kho</strong> bạn thỏa thuận trực tiếp với xưởng, vì phụ thuộc
            địa chỉ, khối lượng và thời gian giao.
          </span>
        </p>
      </section>

      {/* By quantity */}
      <section aria-labelledby="quote-ladder-title" className="mt-6">
        <h3 id="quote-ladder-title" className="flex items-center gap-2 font-landing-heading text-title font-bold text-fg">
          <TrendingDown className="size-4 text-fg-muted" aria-hidden />
          Giá theo số lượng
        </h3>
        <p className="mt-1 text-body-sm text-fg-muted">
          Cùng thiết kế, cùng giấy. Bấm một số lượng để xem chi tiết.{" "}
          {cheaper ? (
            <>
              Ở {result.quantity} hộp, {cheaper.method === "offset" ? "in offset" : "in kỹ thuật số"} còn rẻ hơn: {formatVnd(cheaper.perBox)}/hộp.
            </>
          ) : (
            <>
              Ở {result.quantity} hộp, nếu {other.method === "offset" ? "in offset" : "in kỹ thuật số"} sẽ là {formatVnd(other.perBox)}/hộp, đắt hơn{" "}
              {percent(other.perBox / result.perBox - 1)}.
            </>
          )}
        </p>
        {moreForLess && (
          <p className="mt-2 flex items-start gap-2 rounded-control bg-success-bg px-3 py-2 text-body-sm text-success-fg">
            <TrendingDown className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              {moreForLess.quantity.toLocaleString("vi-VN")} hộp ({moreForLess.method === "offset" ? "in offset" : "in kỹ thuật số"}) tổng chỉ {formatVnd(moreForLess.total)}, không hơn{" "}
              {formatVnd(result.total)} của {result.quantity} hộp: mỗi hộp {formatVnd(moreForLess.perBox)}. Nếu bán hết được, in nhiều hơn lại tốn ít tiền hơn.
            </span>
          </p>
        )}
        <div className="mt-2 overflow-x-auto rounded-control border border-line">
          <table className="w-full min-w-[520px] text-left text-body-sm">
            <thead className="bg-surface-sunken text-caption text-fg-muted">
              <tr>
                <th scope="col" className="px-3 py-2 font-semibold">Số lượng</th>
                <th scope="col" className="px-3 py-2 font-semibold">Cách in</th>
                <th scope="col" className="px-3 py-2 font-semibold">Giá mỗi hộp</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Tổng tiền</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Rẻ hơn 1 hộp</th>
              </tr>
            </thead>
            <tbody>
              {ladder.map((step) => {
                const current = step.quantity === result.quantity;
                return (
                  <tr key={step.quantity} aria-current={current ? "true" : undefined} className={cn("border-t border-line", current && "bg-fpt-orange-light")}>
                    <th scope="row" className="px-3 py-1 text-left">
                      <button
                        type="button"
                        onClick={() => onQuantityChange(step.quantity)}
                        className={cn("min-h-9 rounded-control px-2 font-semibold tabular-nums underline-offset-2 hover:underline", current ? "text-accent" : "text-fg")}
                      >
                        {step.quantity.toLocaleString("vi-VN")} hộp
                      </button>
                    </th>
                    <td className="px-3 py-1 text-fg-muted">{step.method === "digital" ? "Kỹ thuật số" : "Offset"}</td>
                    <td className="px-3 py-1">
                      <span className="flex items-center gap-2">
                        <span aria-hidden className="h-2 w-24 shrink-0 overflow-hidden rounded-full bg-surface-sunken">
                          <span className="block h-full rounded-full bg-fpt-blue" style={{ width: `${(step.perBox / maxPerBox) * 100}%` }} />
                        </span>
                        <span className="font-semibold tabular-nums text-fg">{formatVnd(step.perBox)}</span>
                      </span>
                    </td>
                    <td className="px-3 py-1 text-right tabular-nums text-fg">{formatVnd(step.total)}</td>
                    <td className="px-3 py-1 text-right tabular-nums text-fg-muted">{step.quantity === 1 ? "—" : `−${percent(step.savingVsOne)}`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-caption leading-5 text-fg-muted">
          In kỹ thuật số không cần khuôn nên giá gần như đứng yên theo số lượng; in offset phải làm kẽm và khuôn ({formatVnd(QUOTE_PRICES.offsetSetup + QUOTE_PRICES.die)}) nhưng
          mỗi tờ rẻ hơn, nên in càng nhiều càng rẻ. Đơn giá giả định cho bản demo; giá chốt theo báo giá của xưởng in đối tác.
        </p>
      </section>
    </StudioCard>
  );
}

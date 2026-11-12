"use client";

import React, { useMemo } from "react";
import { Clock, FileText, Info, Layers, Printer, Ruler, Scissors } from "lucide-react";
import { DIGITAL_MAX_QUANTITY, FINISH_LABELS, quote, sheetYield, type DielinePiece, type QuoteFinish, type QuoteGroup } from "@wrapfit/shared";
import { formatVnd } from "@/features/pricing";
import { paperStockOf } from "@/features/studio/utils/paperStocks";
import { cn } from "@/utils/helpers";
import { CardTitle, StudioCard } from "./studioUi";
import type { BoxMaterialTheme } from "./three/InteractiveFoldingBox3D";

/** Small marker of each cost group: material (kraft brown), printing (FPT blue), converting and finishing (FPT orange). */
const GROUP_DOT: Record<QuoteGroup, string> = {
  material: "bg-kraft-raw",
  print: "bg-fpt-blue",
  converting: "bg-fpt-orange",
};

interface QuoteBreakdownProps {
  structure: string;
  pieces: DielinePiece[];
  material: BoxMaterialTheme;
  finishes: QuoteFinish[];
  quantity: number;
}

/**
 * Step 6, the estimate in full as an invoice: what the price is computed from on the left, every line grouped by
 * material, printing and converting on the right, with the total. Shipping and storage are agreed with the shop.
 */
export function QuoteBreakdown({ structure, pieces, material, finishes, quantity }: QuoteBreakdownProps) {
  const stock = paperStockOf(material);
  const result = useMemo(
    () => quote({ structure, pieces, paper: stock.quotePaper, finishes, quantity }),
    [structure, pieces, stock.quotePaper, finishes, quantity]
  );
  const yields = useMemo(() => sheetYield(pieces), [pieces]);
  const perBox = (vnd: number) => formatVnd(Math.round(vnd / result.quantity / 10) * 10);

  const specs = [
    { icon: FileText, term: "Chất liệu", value: stock.name, note: finishes.length ? finishes.map((f) => FINISH_LABELS[f]).join(", ") : "Không hoàn thiện thêm" },
    { icon: Ruler, term: "Khổ trải phẳng", value: yields.map((y) => `${y.width} × ${y.height} mm`).join(" + "), note: `${result.areaM2.toFixed(3).replace(".", ",")} m² giấy mỗi hộp` },
    { icon: Layers, term: "Xếp trên tờ B1", value: `${result.perSheet} hộp mỗi tờ`, note: `${result.sheets} tờ, gồm ${result.wasteSheets} tờ hao hụt` },
    {
      icon: Printer,
      term: "Cách in",
      value: result.method === "digital" ? "In kỹ thuật số" : "In offset",
      note: `Tự chọn cách rẻ hơn; in KTS tối đa ${DIGITAL_MAX_QUANTITY.toLocaleString("vi-VN")} hộp`,
    },
    { icon: Clock, term: "Thời gian sản xuất", value: `Khoảng ${result.leadDays} ngày làm việc`, note: "Tính từ khi duyệt file với xưởng" },
  ];

  return (
    <StudioCard id="quote-detail" aria-labelledby="quote-detail-title" className="overflow-hidden">
      {/* Header: what is quoted and the total */}
      <div className="flex flex-col gap-4 border-b border-line bg-surface-sunken/60 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
        <div>
          <CardTitle id="quote-detail-title">Báo giá chi tiết</CardTitle>
          <p className="mt-1 text-body-sm text-fg-muted">
            <span className="font-semibold tabular-nums text-fg">{result.quantity.toLocaleString("vi-VN")} hộp</span> hoàn thiện · {result.methodLabel} · ước tính, chưa gồm VAT
          </p>
        </div>
        <div className="sm:text-right">
          <p className="text-caption font-semibold uppercase tracking-wide text-fg-muted">Tổng cộng</p>
          <p className="font-landing-heading text-heading-md font-bold tabular-nums text-fg">{formatVnd(result.total)}</p>
          <p className="text-body-sm tabular-nums text-fg-muted">{formatVnd(result.perBox)} mỗi hộp</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* What the price is computed from */}
        <section aria-labelledby="quote-specs-title" className="border-b border-line p-5 sm:p-6 lg:border-b-0 lg:border-r">
          <h3 id="quote-specs-title" className="text-caption font-semibold uppercase tracking-wide text-fg-muted">
            Thông số tính giá
          </h3>
          <dl className="mt-3 flex flex-col gap-3.5">
            {specs.map(({ icon: Icon, term, value, note }) => (
              <div key={term} className="flex gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-control bg-surface-sunken text-fg-muted">
                  <Icon className="size-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <dt className="text-caption text-fg-muted">{term}</dt>
                  <dd className="text-body-sm font-semibold tabular-nums text-fg">{value}</dd>
                  <dd className="text-caption tabular-nums text-fg-muted">{note}</dd>
                </div>
              </div>
            ))}
          </dl>
        </section>

        {/* Every line, invoice style */}
        <section aria-labelledby="quote-lines-title" className="p-5 sm:p-6">
          <h3 id="quote-lines-title" className="text-caption font-semibold uppercase tracking-wide text-fg-muted">
            Chi tiết từng khoản
          </h3>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-body-sm">
              <thead className="text-caption text-fg-muted">
                <tr className="border-b border-line">
                  <th scope="col" className="py-2 pr-3 font-semibold">Khoản</th>
                  <th scope="col" className="px-3 py-2 font-semibold">Cách tính</th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">Mỗi hộp</th>
                  <th scope="col" className="py-2 pl-3 text-right font-semibold">Thành tiền</th>
                </tr>
              </thead>
              {result.groups.map((g) => {
                const lines = result.lines.filter((line) => line.group === g.group);
                if (!lines.length) return null;
                return (
                  <tbody key={g.group} className="border-b border-line">
                    <tr>
                      <th scope="rowgroup" colSpan={2} className="pb-1 pr-3 pt-3 text-left font-semibold text-fg">
                        <span className="inline-flex items-center gap-2">
                          <span aria-hidden className={cn("size-2.5 rounded-full", GROUP_DOT[g.group])} />
                          {g.label}
                        </span>
                      </th>
                      <td className="px-3 pb-1 pt-3 text-right tabular-nums text-fg-muted">{perBox(g.vnd)}</td>
                      <td className="pb-1 pl-3 pt-3 text-right font-semibold tabular-nums text-fg">{formatVnd(g.vnd)}</td>
                    </tr>
                    {lines.map((line) => (
                      <tr key={line.id} className="align-top">
                        <th scope="row" className="py-1.5 pl-[18px] pr-3 text-left font-normal text-fg">{line.label}</th>
                        <td className="px-3 py-1.5 text-caption leading-5 tabular-nums text-fg-muted">{line.detail}</td>
                        <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums text-fg-muted">{perBox(line.vnd)}</td>
                        <td className="whitespace-nowrap py-1.5 pl-3 text-right tabular-nums text-fg">{formatVnd(line.vnd)}</td>
                      </tr>
                    ))}
                    <tr aria-hidden>
                      <td colSpan={4} className="pb-2" />
                    </tr>
                  </tbody>
                );
              })}
              <tfoot className="text-fg">
                <tr>
                  <th scope="row" colSpan={2} className="pr-3 pt-3 text-left font-semibold">
                    Tổng {result.quantity.toLocaleString("vi-VN")} hộp hoàn thiện
                  </th>
                  <td className="px-3 pt-3 text-right font-semibold tabular-nums">{formatVnd(result.perBox)}</td>
                  <td className="pl-3 pt-3 text-right font-landing-heading text-title font-bold tabular-nums">{formatVnd(result.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <ul className="mt-5 flex flex-col gap-2 rounded-control bg-surface-sunken p-3.5 text-caption leading-5 text-fg-muted">
            <li className="flex items-start gap-2">
              <Info className="mt-0.5 size-3.5 shrink-0 text-info" aria-hidden />
              <span>
                Báo giá dừng ở hộp đã hoàn thiện tại xưởng đối tác. <strong className="text-fg">VAT, vận chuyển và lưu kho</strong> thỏa thuận trực tiếp với xưởng vì phụ thuộc
                địa chỉ, khối lượng và thời gian giao.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Scissors className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              <span>Đơn giá giả định cho bản demo; giá chốt theo báo giá của xưởng in đối tác.</span>
            </li>
          </ul>
        </section>
      </div>
    </StudioCard>
  );
}

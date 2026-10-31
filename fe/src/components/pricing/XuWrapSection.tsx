"use client";

import React from "react";
import { Coins } from "lucide-react";
import { AI_IMAGE_MODELS, XU_PACKS, XU_PATTERN_COST, XU_TOOL_COST, XU_VALUE_VND, type XuPackId } from "@wrapfit/shared";
import { Container, Reveal } from "@/components/landing";
import { ButtonLink, DataTable, type DataColumn } from "@/components/ui";
import { PLANS, PLAN_ORDER, formatVnd } from "@/features/pricing";

/** What 1.000 xu buy: the price of each AI task, and how many of it fit in 1.000 xu. */
const BUDGET = 1_000;

interface UseRow {
  task: string;
  detail: string;
  xu: number;
}

const ROWS: UseRow[] = [
  ...AI_IMAGE_MODELS.filter((model) => model.enabled).map((model) => ({ task: `Ảnh AI · ${model.label}`, detail: model.summary, xu: model.xu })),
  { task: "Hoa văn AI nhanh", detail: "Bảng màu và hoa văn lặp liền mạch", xu: XU_PATTERN_COST.fast },
  { task: "Hoa văn AI cao cấp", detail: "Model mạnh hơn, hoa văn chi tiết hơn", xu: XU_PATTERN_COST.premium },
  { task: "Phóng to ảnh cho in", detail: "Tới 16 MP, nét ở 300 DPI", xu: XU_TOOL_COST.upscale },
  { task: "Xóa nền", detail: "Tách chủ thể khỏi nền", xu: XU_TOOL_COST["remove-bg"] },
  { task: "Vector hóa", detail: "Chuyển ảnh sang SVG", xu: XU_TOOL_COST.vectorize },
];

const xu = (count: number) => `${count.toLocaleString("vi-VN")} xu`;

const COLUMNS: DataColumn<UseRow>[] = [
  {
    key: "task",
    label: "Tác vụ",
    primary: true,
    render: (row) => (
      <span className="block">
        <span className="block font-medium text-fg">{row.task}</span>
        <span className="block text-caption text-fg-muted">{row.detail}</span>
      </span>
    ),
  },
  { key: "xu", label: "Giá", align: "right", render: (row) => <span className="tabular-nums">{xu(row.xu)}</span> },
  {
    key: "count",
    label: `Với ${xu(BUDGET)}`,
    align: "right",
    render: (row) => <span className="font-semibold tabular-nums text-fg">{Math.floor(BUDGET / row.xu).toLocaleString("vi-VN")} lượt</span>,
  },
];

const PACKS = (Object.keys(XU_PACKS) as XuPackId[]).map((id) => XU_PACKS[id]);

/** `/pricing`: Xu Wrap, the one currency of every AI task (docs/19): xu per plan, packs, what 1.000 xu buy. */
export function XuWrapSection() {
  return (
    <section aria-labelledby="xu-wrap" className="pb-12 lg:pb-16">
      <Reveal>
        <Container className="mx-auto max-w-7xl">
          <div className="mb-6 text-center">
            <h2 id="xu-wrap" className="flex items-center justify-center gap-2 font-landing-heading text-heading-lg font-bold text-fg">
              <Coins className="size-7 text-fpt-orange-ink" aria-hidden /> Xu Wrap cho mọi tác vụ AI
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-body text-fg-muted">
              Một đồng xu cho ảnh AI, hoa văn AI và công cụ ảnh. 1 xu = {formatVnd(XU_VALUE_VND)}. Gói cộng xu mỗi kỳ:{" "}
              {PLAN_ORDER.map((tier) => `${PLANS[tier].name} ${xu(PLANS[tier].xuPerPeriod)}`).join(", ")}. Xu chưa dùng giữ thêm một kỳ; lỗi phía
              WrapFit thì xu được hoàn.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <h3 className="mb-3 font-landing-heading text-heading-sm font-bold text-fg">{xu(BUDGET)} làm được gì</h3>
              <DataTable label={`${xu(BUDGET)} làm được gì`} columns={COLUMNS} rows={ROWS} rowKey={(row) => row.task} mobile="cards" />
            </div>
            <div>
              <h3 className="mb-3 font-landing-heading text-heading-sm font-bold text-fg">Nạp thêm xu</h3>
              <ul className="flex flex-col gap-3">
                {PACKS.map((pack) => {
                  const bonus = pack.xu - pack.priceVnd / XU_VALUE_VND;
                  return (
                    <li key={pack.id} className="flex items-center justify-between gap-3 rounded-panel bg-surface-raised p-4 ring-1 ring-line">
                      <span>
                        <span className="block font-semibold tabular-nums text-fg">{xu(pack.xu)}</span>
                        <span className="block text-caption text-fg-muted">
                          {bonus > 0 ? `Tặng thêm ${xu(bonus)} · ` : ""}dùng trong 12 tháng
                        </span>
                      </span>
                      <span className="font-landing-heading text-title font-bold tabular-nums text-fg">{formatVnd(pack.priceVnd)}</span>
                    </li>
                  );
                })}
              </ul>
              <ButtonLink href="/dashboard/billing" variant="brand" block className="mt-4">
                Nạp xu ở trang Thanh toán
              </ButtonLink>
            </div>
          </div>
        </Container>
      </Reveal>
    </section>
  );
}

'use client';

/**
 * `/admin/revenue`: revenue per product (Pro 30 days, export packs). No payment records are read here yet: example
 * sales counts multiplied by the prices of @wrapfit/shared/billing.
 */

import { EXPORT_PACKS, PRO_MONTH } from '@wrapfit/shared';
import React from 'react';
import { Panel, PanelTitle } from '@/components/workspace';
import { PLANS, formatVnd } from '@/features/pricing';
import { SampleScreen } from '@/views/admin/shared/SampleScreen';

interface ProductRevenue {
  id: string;
  label: string;
  priceVnd: number;
  sold: number;
}

const ROWS: ProductRevenue[] = [
  { id: 'PRO_MONTH', label: `Gói ${PLANS.STARTER.name} · ${PRO_MONTH.periodDays} ngày`, priceVnd: PRO_MONTH.priceVnd, sold: 64 },
  ...Object.values(EXPORT_PACKS).map((pack, index) => ({
    id: pack.id,
    label: `${pack.credits} lượt xuất`,
    priceVnd: pack.priceVnd,
    sold: [118, 47, 12][index] ?? 0,
  })),
];

const revenueOf = (row: ProductRevenue) => row.sold * row.priceVnd;
const TOTAL = ROWS.reduce((sum, row) => sum + revenueOf(row), 0);
const LAST_MONTH = Math.round(TOTAL * 0.86);

const MONTHS = [
  { month: 'T5', value: Math.round(TOTAL * 0.41) },
  { month: 'T6', value: Math.round(TOTAL * 0.52) },
  { month: 'T7', value: Math.round(TOTAL * 0.63) },
  { month: 'T8', value: Math.round(TOTAL * 0.74) },
  { month: 'T9', value: LAST_MONTH },
  { month: 'T10', value: TOTAL },
];

export default function AdminRevenuePage() {
  const peak = Math.max(...MONTHS.map((item) => item.value));
  return (
    <SampleScreen<ProductRevenue>
      title="Doanh thu"
      description={`Doanh thu theo gói ${PLANS.STARTER.name} và các gói lượt xuất.`}
      note="Trang này chưa đọc bảng thanh toán. Số lượt bán dưới đây là ví dụ, nhân với giá gói hiện hành."
      stats={[
        { label: 'Doanh thu tháng này', value: formatVnd(TOTAL) },
        { label: `Gói ${PLANS.STARTER.name} đã bán`, value: String(ROWS[0].sold) },
        { label: 'Gói lượt xuất đã bán', value: String(ROWS.slice(1).reduce((sum, row) => sum + row.sold, 0)) },
        { label: 'Tăng so với T9', value: `+${Math.round((TOTAL / LAST_MONTH - 1) * 100)}%` },
      ]}
      tableTitle="Theo sản phẩm"
      rows={ROWS}
      rowKey={(row) => row.id}
      columns={[
        { key: 'product', label: 'Sản phẩm', render: (row) => <span className="font-medium">{row.label}</span> },
        { key: 'sold', label: 'Đã bán', align: 'right', render: (row) => `${row.sold} × ${formatVnd(row.priceVnd)}` },
        { key: 'revenue', label: 'Doanh thu', align: 'right', render: (row) => <span className="font-medium">{formatVnd(revenueOf(row))}</span> },
      ]}
    >
      <Panel aria-labelledby="revenue-months">
        <PanelTitle id="revenue-months">6 tháng gần đây</PanelTitle>
        <ul className="flex flex-col gap-3">
          {MONTHS.map((item) => (
            <li key={item.month} className="grid grid-cols-[40px_minmax(0,1fr)_96px] items-center gap-3 text-sm">
              <span className="text-library-muted">{item.month}</span>
              <span aria-hidden className="h-2.5 overflow-hidden rounded-full bg-library-panel">
                <span className="block h-full rounded-full bg-fpt-orange" style={{ width: `${(item.value / peak) * 100}%` }} />
              </span>
              <span className="text-right font-mono text-xs">{formatVnd(item.value)}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </SampleScreen>
  );
}

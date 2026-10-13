'use client';

/** `/admin/revenue`: subscription revenue per plan. No billing API yet: example figures from the plan prices. */

import React from 'react';
import { Panel, PanelTitle } from '@/components/workspace';
import { TIER_LABELS } from '@/constants';
import { PLANS, formatUsd } from '@/features/pricing';
import { SampleScreen } from '@/views/admin/shared/SampleScreen';

interface TierRevenue {
  tier: 'STARTER' | 'PRO_BUSINESS';
  monthly: number;
  yearly: number;
}

const ROWS: TierRevenue[] = [
  { tier: 'STARTER', monthly: 182, yearly: 64 },
  { tier: 'PRO_BUSINESS', monthly: 41, yearly: 23 },
];

const mrrOf = (row: TierRevenue) => row.monthly * PLANS[row.tier].price.monthly + row.yearly * PLANS[row.tier].price.yearlyPerMonth;
const TOTAL = ROWS.reduce((sum, row) => sum + mrrOf(row), 0);

const MONTHS = [
  { month: 'T5', value: 6120 },
  { month: 'T6', value: 7040 },
  { month: 'T7', value: 7980 },
  { month: 'T8', value: 9110 },
  { month: 'T9', value: 10430 },
  { month: 'T10', value: TOTAL },
];

export default function AdminRevenuePage() {
  const peak = Math.max(...MONTHS.map((item) => item.value));
  return (
    <SampleScreen<TierRevenue>
      title="Doanh thu"
      description="Doanh thu định kỳ theo gói Starter và Pro Business."
      note="WrapFit chưa mở thanh toán trực tuyến nên chưa có doanh thu thật. Số thuê bao dưới đây là ví dụ, nhân với giá gói hiện hành."
      stats={[
        { label: 'Doanh thu tháng (MRR)', value: formatUsd(TOTAL) },
        { label: 'Thuê bao trả phí', value: String(ROWS.reduce((sum, row) => sum + row.monthly + row.yearly, 0)) },
        { label: 'Trả theo năm', value: `${Math.round((ROWS.reduce((s, r) => s + r.yearly, 0) / ROWS.reduce((s, r) => s + r.monthly + r.yearly, 0)) * 100)}%` },
        { label: 'Tăng so với T9', value: `+${Math.round((TOTAL / 10430 - 1) * 100)}%` },
      ]}
      tableTitle="Theo gói"
      rows={ROWS}
      rowKey={(row) => row.tier}
      columns={[
        { key: 'tier', label: 'Gói', render: (row) => <span className="font-medium">{TIER_LABELS[row.tier]}</span> },
        { key: 'monthly', label: 'Trả theo tháng', align: 'right', render: (row) => `${row.monthly} × ${formatUsd(PLANS[row.tier].price.monthly)}` },
        { key: 'yearly', label: 'Trả theo năm', align: 'right', render: (row) => `${row.yearly} × ${formatUsd(PLANS[row.tier].price.yearlyPerMonth)}` },
        { key: 'mrr', label: 'MRR', align: 'right', render: (row) => <span className="font-medium">{formatUsd(mrrOf(row))}</span> },
      ]}
    >
      <Panel aria-labelledby="revenue-months">
        <PanelTitle id="revenue-months">6 tháng gần đây</PanelTitle>
        <ul className="flex flex-col gap-3">
          {MONTHS.map((item) => (
            <li key={item.month} className="grid grid-cols-[40px_minmax(0,1fr)_80px] items-center gap-3 text-sm">
              <span className="text-library-muted">{item.month}</span>
              <span aria-hidden className="h-2.5 overflow-hidden rounded-full bg-library-panel">
                <span className="block h-full rounded-full bg-library-accent" style={{ width: `${(item.value / peak) * 100}%` }} />
              </span>
              <span className="text-right font-mono text-xs">{formatUsd(item.value)}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </SampleScreen>
  );
}

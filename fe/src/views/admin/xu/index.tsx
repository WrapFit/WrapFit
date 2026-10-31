'use client';

/**
 * `/admin/xu`: Xu Wrap of one month (`GET /admin/analytics/xu`, docs/19 S5). Spent xu are valued at the money paid for
 * their lot (allowance and gift xu are worth 0đ), so the revenue is what WrapFit actually earned; the provider cost of
 * the month gives the gross margin.
 */

import { useQuery } from '@tanstack/react-query';
import React, { useState } from 'react';
import { getXuReport } from '@/api/payments';
import { DataTable } from '@/components/ui';
import { AdminShell, Panel, PanelTitle, StatTile, WORKSPACE_INPUT, WorkspaceError } from '@/components/workspace';
import { RequireAuth } from '@/features/auth';
import { formatVnd } from '@/features/pricing';
import { queryKeys } from '@/hooks/data';
import type { XuReport } from '@/types/api';
import { cn } from '@/utils/helpers';

const SOURCE_LABELS: Record<XuReport['issued'][number]['source'], string> = {
  PLAN_ALLOWANCE: 'Xu của gói',
  PURCHASE: 'Gói xu bán ra',
  ADMIN: 'Admin tặng',
};
const REASON_LABELS: Record<XuReport['spent'][number]['reason'], string> = {
  AI_IMAGE: 'Ảnh AI',
  AI_PATTERN: 'Hoa văn AI',
  AI_TOOL: 'Công cụ ảnh',
  EXPORT_UNLOCK: 'Mở khóa',
  ADMIN_ADJUSTMENT: 'Điều chỉnh',
};

const xu = (count: number) => `${count.toLocaleString('vi-VN')} xu`;

/** `yyyy-mm` of this month in Vietnam time (UTC+7). */
function thisMonth(): string {
  const local = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, '0')}`;
}

export default function AdminXuPage() {
  return (
    <RequireAuth role="ADMIN">
      <XuReportScreen />
    </RequireAuth>
  );
}

function XuReportScreen() {
  const [month, setMonth] = useState(thisMonth);
  const report = useQuery({ queryKey: queryKeys.xuReport(month), queryFn: () => getXuReport(month), staleTime: 60_000 });
  const data = report.data;

  return (
    <AdminShell
      title="Xu Wrap"
      description="Xu phát ra, đã tiêu, doanh thu ghi nhận theo tiền thật của từng lô, chi phí model AI và biên gộp của tháng."
      actions={
        <label className="flex items-center gap-2 text-sm text-library-sub">
          Tháng
          <input
            type="month"
            value={month}
            max={thisMonth()}
            onChange={(event) => event.target.value && setMonth(event.target.value)}
            className={cn(WORKSPACE_INPUT, 'w-44 font-mono tabular-nums')}
          />
        </label>
      }
    >
      {report.isError ? (
        <WorkspaceError error={report.error} title="Không tải được báo cáo xu" onRetry={() => void report.refetch()} retrying={report.isFetching} />
      ) : (
        <div className="flex flex-col gap-6" aria-busy={report.isPending}>
          <section aria-label="Số liệu chính" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Doanh thu ghi nhận" value={data ? formatVnd(data.recognizedRevenueVnd) : '–'} hint="Xu đã tiêu × giá thật của lô" />
            <StatTile label="Chi phí model AI" value={data ? formatVnd(data.providerCostVnd) : '–'} hint={data ? `1 USD = ${formatVnd(data.usdVndRate)}` : undefined} />
            <StatTile
              label="Biên gộp"
              value={data ? formatVnd(data.grossMarginVnd) : '–'}
              hint={data?.grossMarginRate != null ? `${Math.round(data.grossMarginRate * 100)}% doanh thu` : 'Chưa có doanh thu'}
            />
            <StatTile label="Xu bán chưa tiêu" value={data ? formatVnd(data.outstanding.valueVnd) : '–'} hint={data ? `${xu(data.outstanding.xu)} còn hạn, tính đến hôm nay` : undefined} />
          </section>

          <div className="grid grid-cols-1 gap-6">
            <Panel>
              <PanelTitle>Xu phát ra</PanelTitle>
              <DataTable
                label="Xu phát ra theo nguồn"
                className="mt-3"
                mobile="cards"
                rows={data?.issued ?? []}
                rowKey={(row) => row.source}
                empty="Không có xu nào được phát trong tháng."
                columns={[
                  { key: 'source', label: 'Nguồn', primary: true, render: (row) => SOURCE_LABELS[row.source] },
                  { key: 'lots', label: 'Lô', align: 'right', render: (row) => <span className="tabular-nums">{row.lots}</span> },
                  { key: 'xu', label: 'Xu', align: 'right', render: (row) => <span className="tabular-nums">{xu(row.xu)}</span> },
                  { key: 'value', label: 'Tiền thu', align: 'right', render: (row) => <span className="tabular-nums">{formatVnd(row.valueVnd)}</span> },
                ]}
              />
              {data && (
                <p className="mt-3 text-xs text-library-sub">
                  Hết hạn trong tháng: {xu(data.expired.xu)} ({formatVnd(data.expired.valueVnd)} tiền xu đã bán, ghi nhận khi hết hạn).
                </p>
              )}
            </Panel>

            <Panel>
              <PanelTitle>Xu đã tiêu</PanelTitle>
              <DataTable
                label="Xu đã tiêu theo tác vụ"
                className="mt-3"
                mobile="cards"
                rows={data?.spent ?? []}
                rowKey={(row) => row.reason}
                empty="Chưa có xu nào được tiêu trong tháng."
                columns={[
                  { key: 'reason', label: 'Tác vụ', primary: true, render: (row) => REASON_LABELS[row.reason] },
                  { key: 'ops', label: 'Lượt', align: 'right', render: (row) => <span className="tabular-nums">{row.operations}</span> },
                  { key: 'xu', label: 'Xu', align: 'right', render: (row) => <span className="tabular-nums">{xu(row.xu)}</span> },
                  { key: 'revenue', label: 'Doanh thu', align: 'right', render: (row) => <span className="tabular-nums">{formatVnd(row.revenueVnd)}</span> },
                ]}
              />
              {data && (
                <p className="mt-3 text-xs text-library-sub">
                  Đã hoàn do lỗi hệ thống: {xu(data.refundedXu)}. Theo giá niêm yết, lượng xu đã tiêu đáng {formatVnd(data.spentListValueVnd)}.
                </p>
              )}
            </Panel>
          </div>

          <Panel>
            <PanelTitle>Chi phí model AI</PanelTitle>
            <DataTable
              label="Chi phí model AI theo model"
              className="mt-3"
              mobile="cards"
              rows={data?.providerCost ?? []}
              rowKey={(row) => `${row.kind}-${row.model}`}
              empty="Chưa có lượt AI nào trong tháng."
              columns={[
                { key: 'model', label: 'Model', primary: true, render: (row) => <span className="font-mono text-sm">{row.model}</span> },
                { key: 'kind', label: 'Loại', render: (row) => (row.kind === 'IMAGE' ? 'Ảnh (fal)' : 'Hoa văn (Claude)') },
                { key: 'jobs', label: 'Lượt', align: 'right', render: (row) => <span className="tabular-nums">{row.jobs}</span> },
                { key: 'xu', label: 'Xu thu', align: 'right', render: (row) => <span className="tabular-nums">{xu(row.xu)}</span> },
                { key: 'usd', label: 'Chi phí USD', align: 'right', render: (row) => <span className="tabular-nums">${row.costUsd.toFixed(4)}</span> },
                { key: 'vnd', label: 'Chi phí', align: 'right', render: (row) => <span className="tabular-nums">{formatVnd(row.costVnd)}</span> },
              ]}
            />
            <p className="mt-3 text-xs text-library-sub">Chi phí ảnh là ước tính của từng job đã xong (gồm bước viết lại mô tả); hoa văn tính theo token.</p>
          </Panel>
        </div>
      )}
    </AdminShell>
  );
}

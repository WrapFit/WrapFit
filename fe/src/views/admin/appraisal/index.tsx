'use client';

/**
 * `/admin/appraisal`: the community designs shown in the template hub (`GET /templates/hub?section=community`: PUBLIC
 * projects with FitCheck™ ≥ 90), most liked first. There is no moderation API yet: the page reviews, it cannot hide.
 */

import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import React, { useState } from 'react';
import { Pagination } from '@/components/library';
import { AdminShell, Badge, DataTable, Panel, PanelTitle, StatTile, WorkspaceEmpty, WorkspaceError } from '@/components/workspace';
import { ROUTES } from '@/constants';
import { formatCount } from '@/features/admin';
import { RequireAuth } from '@/features/auth';
import { useCommunityTemplates } from '@/features/templates';
import type { CommunityCard } from '@/types/api';

export default function AdminAppraisalPage() {
  return (
    <RequireAuth role="ADMIN">
      <Appraisal />
    </RequireAuth>
  );
}

const PAGE_SIZE = 20;

function Appraisal() {
  const [page, setPage] = useState(1);
  const designs = useCommunityTemplates({ page, limit: PAGE_SIZE });
  const items = designs.data?.items ?? [];
  const meta = designs.data?.meta;

  let body: React.ReactNode;
  if (designs.isError && !designs.data) {
    body = <WorkspaceError error={designs.error} title="Không tải được thiết kế cộng đồng" onRetry={() => void designs.refetch()} retrying={designs.isFetching} />;
  } else if (designs.isPending) {
    body = <div aria-busy="true" className="h-64 animate-pulse rounded-xl bg-library-panel motion-reduce:animate-none" />;
  } else if (items.length === 0) {
    body = <WorkspaceEmpty title="Chưa có thiết kế cộng đồng" description="Dự án công khai đạt FitCheck™ từ 90 điểm sẽ hiện ở đây." />;
  } else {
    body = (
      <DataTable<CommunityCard>
        label="Thiết kế cộng đồng"
        rows={items}
        rowKey={(row) => row.slug}
        columns={[
          {
            key: 'title',
            label: 'Thiết kế',
            render: (row) => (
              <span className="block max-w-[260px]">
                <span className="block truncate font-medium">{row.title}</span>
                <span className="block truncate text-xs text-library-muted">{row.author.shopName ?? row.author.fullName ?? 'Ẩn danh'}</span>
              </span>
            ),
          },
          { key: 'structure', label: 'Cấu trúc', render: (row) => row.structure.name },
          {
            key: 'size',
            label: 'Kích thước',
            render: (row) => (
              <span className="font-mono text-xs">
                {row.dimensions.length}×{row.dimensions.width}×{row.dimensions.height}
              </span>
            ),
          },
          {
            key: 'fitcheck',
            label: 'FitCheck™',
            render: (row) =>
              row.fitcheckScore === null ? <Badge>Chưa kiểm</Badge> : <Badge tone={row.fitcheckScore >= 90 ? 'green' : row.fitcheckScore >= 70 ? 'amber' : 'red'}>{row.fitcheckScore}/100</Badge>,
          },
          { key: 'likes', label: 'Lượt thích', align: 'right', render: (row) => formatCount(row.likesCount) },
          { key: 'views', label: 'Lượt xem', align: 'right', render: (row) => formatCount(row.viewsCount) },
          {
            key: 'open',
            label: '',
            align: 'right',
            render: (row) => (
              <Link href={ROUTES.publicProject(row.slug)} target="_blank" aria-label={`Mở “${row.title}”`} className="inline-flex size-9 items-center justify-center rounded-lg hover:bg-library-panel">
                <ExternalLink className="size-4" aria-hidden />
              </Link>
            ),
          },
        ]}
      />
    );
  }

  return (
    <AdminShell title="Thẩm định mẫu" description="Thiết kế cộng đồng đang hiển thị trong thư viện mẫu: dự án công khai đạt FitCheck™ từ 90 điểm.">
      <div className="flex flex-col gap-6">
        <section aria-label="Số liệu" className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <StatTile label="Đang hiển thị" value={meta ? formatCount(meta.total) : '–'} />
          <StatTile label="Ngưỡng hiển thị" value="FitCheck™ ≥ 90" />
          <StatTile label="Lượt thích trong trang" value={designs.data ? formatCount(items.reduce((sum, item) => sum + item.likesCount, 0)) : '–'} />
        </section>
        <Panel aria-labelledby="appraisal-list">
          <PanelTitle id="appraisal-list">Thiết kế cộng đồng</PanelTitle>
          {body}
          {meta && <Pagination page={page} totalPages={meta.totalPages} busy={designs.isPlaceholderData} onPage={setPage} />}
        </Panel>
      </div>
    </AdminShell>
  );
}

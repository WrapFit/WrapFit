'use client';

/**
 * `/admin/dieline-vault`: the box structures (`GET /templates/structures`) with their size limits and the number of
 * WrapFit Curated designs of each (`GET /templates/hub?section=curated&structure=`).
 */

import { useQueries } from '@tanstack/react-query';
import { CURRENT_FORMULA_VERSION } from '@wrapfit/shared';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import React from 'react';
import { listCuratedTemplates } from '@/api/templates';
import { AdminShell, Badge, DataTable, Panel, PanelTitle, AdminStat, WorkspaceError, ADMIN_STAT_GROUP } from '@/components/workspace';
import { ROUTES } from '@/constants';
import { formatCount } from '@/features/admin';
import { RequireAuth } from '@/features/auth';
import { DielineSketch, useBoxStructures } from '@/features/templates';
import { queryKeys } from '@/hooks/data';
import type { BoxStructure, DimensionRange } from '@/types/api';

export default function AdminDielineVaultPage() {
  return (
    <RequireAuth role="ADMIN">
      <DielineVault />
    </RequireAuth>
  );
}

const range = (r: DimensionRange | undefined) => (r ? `${r.min}–${r.max}` : '–');

function DielineVault() {
  const structures = useBoxStructures();
  const list = structures.data ?? [];
  const counts = useQueries({
    queries: list.map((structure) => ({
      queryKey: queryKeys.templates.hub({ section: 'curated', structure: structure.id, limit: 1 }),
      queryFn: () => listCuratedTemplates({ structure: structure.id, limit: 1 }),
      staleTime: 60_000,
    })),
  });
  const countOf = (index: number) => counts[index]?.data?.meta.total;
  const total = counts.every((query) => query.data) ? counts.reduce((sum, query) => sum + (query.data?.meta.total ?? 0), 0) : undefined;

  return (
    <AdminShell title="Kho khuôn bế" description="Cấu trúc hộp được hỗ trợ và giới hạn kích thước.">
      {structures.isError ? (
        <WorkspaceError error={structures.error} title="Không tải được cấu trúc hộp" onRetry={() => void structures.refetch()} retrying={structures.isFetching} />
      ) : (
        <div className="flex flex-col gap-6">
          <section aria-label="Số liệu" className={`${ADMIN_STAT_GROUP} grid-cols-2 md:grid-cols-3`}>
            <AdminStat label="Cấu trúc hộp" value={structures.data ? list.length : '–'} />
            <AdminStat label="Mẫu WrapFit Curated" value={total !== undefined ? formatCount(total) : '–'} />
            <AdminStat label="Phiên bản công thức" value={`v${CURRENT_FORMULA_VERSION}`} hint="Bản cho dự án mới" />
          </section>

          <Panel aria-labelledby="vault-structures">
            <PanelTitle id="vault-structures">Cấu trúc hộp</PanelTitle>
            <DataTable<BoxStructure & { index: number }>
              label="Cấu trúc hộp"
              rows={list.map((structure, index) => ({ ...structure, index }))}
              rowKey={(row) => row.id}
              columns={[
                {
                  key: 'name',
                  label: 'Cấu trúc',
                  render: (row) => (
                    <span className="flex items-center gap-3">
                      <span className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg border border-library-ink bg-library-tile p-1">
                        <DielineSketch structure={row.id} dimensions={{ length: 80, width: 55, height: 60, paperThickness: 0.42 }} className="h-full w-full" />
                      </span>
                      <span>
                        <span className="block font-medium">{row.name}</span>
                        <span className="block font-mono text-xs text-library-muted">{row.id}</span>
                      </span>
                    </span>
                  ),
                },
                { key: 'category', label: 'Loại', render: (row) => <Badge>{row.category === 'rigid' ? 'Hộp cứng' : 'Hộp gấp'}</Badge> },
                { key: 'l', label: 'L (mm)', align: 'right', render: (row) => <span className="font-mono text-xs">{range(row.dimensionLimits.length)}</span> },
                { key: 'w', label: 'W (mm)', align: 'right', render: (row) => <span className="font-mono text-xs">{range(row.dimensionLimits.width)}</span> },
                { key: 'h', label: 'H (mm)', align: 'right', render: (row) => <span className="font-mono text-xs">{range(row.dimensionLimits.height)}</span> },
                { key: 't', label: 't (mm)', align: 'right', render: (row) => <span className="font-mono text-xs">{range(row.dimensionLimits.paperThickness)}</span> },
                {
                  key: 'templates',
                  label: 'Mẫu',
                  align: 'right',
                  render: (row) => (
                    <Link href={`${ROUTES.templates}?structure=${row.id}`} className="inline-flex items-center gap-1 font-medium text-fpt-orange-ink hover:underline">
                      {countOf(row.index) !== undefined ? formatCount(countOf(row.index)!) : '–'}
                      <ArrowRight className="size-3.5" aria-hidden />
                    </Link>
                  ),
                },
              ]}
            />
          </Panel>
        </div>
      )}
    </AdminShell>
  );
}

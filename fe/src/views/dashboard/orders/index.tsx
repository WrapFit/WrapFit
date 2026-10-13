'use client';

/**
 * `/dashboard/orders`: print files and print orders, in the pacdora.com workspace style. There is no order API yet:
 * the page lists the print files exported from the latest projects (`GET /projects/:id/exports`, download link from
 * `GET /exports/:jobId`) and explains the ordering steps to come.
 */

import { useQueries } from '@tanstack/react-query';
import { Download, FileDown, Loader2 } from 'lucide-react';
import Link from 'next/link';
import React, { useState } from 'react';
import { getExportJob, listProjectExports } from '@/api';
import { useToast } from '@/components/common/Toast';
import { outlineButton } from '@/components/library';
import { Badge, Panel, PanelTitle, WorkspaceEmpty, WorkspaceError, WorkspaceShell } from '@/components/workspace';
import { ROUTES } from '@/constants';
import { RequireAuth } from '@/features/auth';
import { RECENT_PROJECTS_QUERY, formatRelative, useProjectList } from '@/features/dashboard';
import { queryKeys } from '@/hooks/data/queryKeys';
import type { ExportFileType, ExportJob, ExportStatus } from '@/types/api';
import { cn } from '@/utils/helpers';

export default function DashboardOrdersPage() {
  return (
    <RequireAuth>
      <OrdersScreen />
    </RequireAuth>
  );
}

const FILE_LABELS: Record<ExportFileType, string> = { PDF_CMYK: 'PDF CMYK', SVG: 'SVG', DXF: 'DXF' };
const STATUS_BADGES: Record<ExportStatus, { tone: 'green' | 'grey' | 'red'; label: string }> = {
  COMPLETED: { tone: 'green', label: 'Sẵn sàng' },
  PROCESSING: { tone: 'grey', label: 'Đang xử lý' },
  PENDING: { tone: 'grey', label: 'Đang chờ' },
  FAILED: { tone: 'red', label: 'Lỗi' },
};

/** Projects whose exports are listed. */
const PROJECTS_QUERY = { ...RECENT_PROJECTS_QUERY, limit: 8 };

const STEPS = [
  { title: 'Thiết kế & đạt FitCheck™', text: 'Khuôn bế, hình in và điểm kiểm tra trong studio.', ready: true },
  { title: 'Xuất file in', text: 'PDF CMYK 300 DPI nhiều lớp, SVG hoặc DXF cho máy cắt.', ready: true },
  { title: 'Nhận báo giá từ xưởng', text: 'Chọn số lượng, giấy và gia công; xưởng đối tác báo giá.', ready: false },
  { title: 'Sản xuất & giao hàng', text: 'Theo dõi đơn in tới khi hộp đến tay bạn.', ready: false },
];

interface Row {
  job: ExportJob;
  projectId: string;
  projectTitle: string;
}

function OrdersScreen() {
  const toast = useToast();
  const projects = useProjectList(PROJECTS_QUERY);
  const items = projects.data?.items ?? [];
  const exports = useQueries({
    queries: items.map((project) => ({
      queryKey: queryKeys.projects.exports(project.id),
      queryFn: () => listProjectExports(project.id),
      staleTime: 30_000,
    })),
  });
  const [downloading, setDownloading] = useState<string | null>(null);

  const rows: Row[] = items
    .flatMap((project, index) => (exports[index]?.data ?? []).map((job) => ({ job, projectId: project.id, projectTitle: project.title })))
    .sort((a, b) => b.job.createdAt.localeCompare(a.job.createdAt))
    .slice(0, 20);
  const loading = projects.isPending || exports.some((query) => query.isPending);
  const failed = exports.find((query) => query.isError);

  // The link of a finished job expires after 15 minutes: always ask for a fresh one.
  const download = async (job: ExportJob) => {
    setDownloading(job.id);
    try {
      const fresh = await getExportJob(job.id);
      if (fresh.downloadUrl) window.location.assign(fresh.downloadUrl);
    } catch (error) {
      toast.error(error, 'Chưa lấy được link tải');
    } finally {
      setDownloading(null);
    }
  };

  let body: React.ReactNode;
  if (projects.isError) {
    body = <WorkspaceError error={projects.error} title="Không tải được dự án" onRetry={() => void projects.refetch()} retrying={projects.isFetching} />;
  } else if (loading) {
    body = (
      <div aria-busy="true" className="flex flex-col gap-2">
        <span role="status" className="sr-only">
          Đang tải file in…
        </span>
        {[0, 1, 2].map((index) => (
          <div key={index} aria-hidden className="h-14 animate-pulse rounded-xl bg-library-panel motion-reduce:animate-none" />
        ))}
      </div>
    );
  } else if (rows.length === 0) {
    body = (
      <WorkspaceEmpty
        icon={FileDown}
        title="Chưa có file in nào"
        description="Mở một dự án trong studio, chạy FitCheck™ rồi chọn Xuất file in: file sẽ hiện ở đây."
        action={
          <Link href={ROUTES.projects} className={outlineButton}>
            Xem dự án
          </Link>
        }
      />
    );
  } else {
    body = (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead>
            <tr className="border-b border-library-line text-library-muted">
              <th scope="col" className="py-2.5 pr-3 font-normal">
                Dự án
              </th>
              <th scope="col" className="px-3 py-2.5 font-normal">
                Định dạng
              </th>
              <th scope="col" className="px-3 py-2.5 font-normal">
                Trạng thái
              </th>
              <th scope="col" className="px-3 py-2.5 font-normal">
                Thời gian
              </th>
              <th scope="col" className="py-2.5 pl-3 text-right font-normal">
                <span className="sr-only">Tải</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-library-line">
            {rows.map(({ job, projectId, projectTitle }) => {
              const status = STATUS_BADGES[job.status];
              return (
                <tr key={job.id}>
                  <td className="max-w-[260px] py-3 pr-3">
                    <Link href={ROUTES.editor(projectId)} className="block truncate font-medium text-library-ink hover:underline">
                      {projectTitle}
                    </Link>
                    {job.fileName && <span className="block truncate font-mono text-xs text-library-muted">{job.fileName}</span>}
                  </td>
                  <td className="px-3 py-3">
                    <span className="font-mono text-xs text-library-ink">{FILE_LABELS[job.fileType]}</span>
                  </td>
                  <td className="px-3 py-3">
                    <Badge tone={status.tone}>{status.label}</Badge>
                    {job.status === 'FAILED' && job.error && <span className="mt-1 block max-w-[200px] truncate text-xs text-red-700">{job.error}</span>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-library-sub">{formatRelative(job.completedAt ?? job.createdAt)}</td>
                  <td className="py-3 pl-3 text-right">
                    {job.status === 'COMPLETED' && (
                      <button
                        type="button"
                        onClick={() => void download(job)}
                        disabled={downloading !== null}
                        aria-label={`Tải ${FILE_LABELS[job.fileType]} của “${projectTitle}”`}
                        className={cn(outlineButton, 'h-9 px-3 text-sm')}
                      >
                        {downloading === job.id ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden /> : <Download className="size-4" aria-hidden />}
                        Tải
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <WorkspaceShell title="Đơn hàng" description="File in bạn đã xuất từ các dự án gần đây, sẵn sàng gửi cho xưởng in.">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <Panel aria-labelledby="orders-files" className="xl:col-span-8">
          <PanelTitle id="orders-files" action={<span className="text-sm text-library-muted">Từ {items.length} dự án sửa gần nhất</span>}>
            File in đã xuất
          </PanelTitle>
          {failed && !loading && (
            <p role="alert" className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Một vài dự án chưa tải được danh sách file.{' '}
              <button type="button" onClick={() => exports.forEach((query) => query.isError && void query.refetch())} className="font-medium underline">
                Thử lại
              </button>
            </p>
          )}
          {body}
        </Panel>

        <section aria-labelledby="orders-steps" className="rounded-[20px] border-[1.5px] border-library-ink bg-library-tile p-5 shadow-hard xl:col-span-4">
          <h2 id="orders-steps" className="text-lg font-medium text-library-ink">
            Đặt in cùng WrapFit
          </h2>
          <p className="mt-1 text-sm text-library-sub">Đặt in trực tiếp với xưởng đối tác đang được chuẩn bị.</p>
          <ol className="mt-5 flex flex-col gap-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-3 rounded-xl bg-white p-3">
                <span
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-medium',
                    step.ready ? 'bg-library-lime text-library-lime-ink' : 'border border-library-line text-library-muted',
                  )}
                >
                  {index + 1}
                </span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2 text-[15px] font-medium text-library-ink">
                    {step.title}
                    {!step.ready && <Badge>Sắp có</Badge>}
                  </span>
                  <span className="block text-sm text-library-sub">{step.text}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </WorkspaceShell>
  );
}

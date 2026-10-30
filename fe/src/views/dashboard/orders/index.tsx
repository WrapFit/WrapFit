'use client';

/**
 * `/dashboard/orders`: print files and sample-print orders, in the pacdora.com workspace style. It lists the sample
 * orders (`GET /orders/my-orders`) and the print files exported from the latest projects (`GET /projects/:id/exports`,
 * download link from `GET /exports/:jobId`). Orders are placed from the sample-print cart (/cart), the one ordering flow.
 */

import { useQueries, useQuery } from '@tanstack/react-query';
import { Download, FileDown, Loader2, PackageCheck, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { getExportJob, listMyOrders, listProjectExports } from '@/api';
import { useToast } from '@/components/common/Toast';
import { outlineButton, primaryButton } from '@/components/library';
import { Badge, Panel, PanelTitle, WorkspaceEmpty, WorkspaceError, WorkspaceShell } from '@/components/workspace';
import { CheckoutDialog } from '@/features/payments';
import { ROUTES } from '@/constants';
import { RequireAuth } from '@/features/auth';
import { RECENT_PROJECTS_QUERY, formatRelative, useProjectList } from '@/features/dashboard';
import { orderStatusBadge } from '@/features/orders';
import { formatVnd } from '@/features/pricing';
import { queryKeys } from '@/hooks/data/queryKeys';
import type { ExportFileType, ExportJob, ExportStatus, SampleOrder } from '@/types/api';
import { cn } from '@/utils/helpers';
import { Alert, DataTable, DatePicker, startOfDay, type DataColumn, type DateRange } from '@/components/ui';

export default function DashboardOrdersPage() {
  return (
    <RequireAuth>
      <OrdersScreen />
    </RequireAuth>
  );
}

const FILE_LABELS: Record<ExportFileType, string> = {
  PDF_CMYK: 'PDF CMYK',
  PDF_A4_PRINT: 'PDF A4/A3 In Thủ Công',
  SVG: 'SVG',
  DXF: 'DXF',
  PRINT_PACKAGE: 'Gói nhà in (.ai + PDF + JPG)',
};

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
  { title: 'Xuất file in', text: 'PDF CMYK, PDF A4/A3 in tại nhà, SVG hoặc DXF cho máy cắt.', ready: true },
  { title: 'Đặt in mẫu thử 01 hộp', text: 'In mẫu 01 chiếc gửi tận tay trước khi in loạt.', ready: true },
  { title: 'Sản xuất loạt & giao hàng', text: 'Kết nối xưởng đối tác bế cắt CNC không cần khuôn sắt 2 triệu.', ready: true },
];

interface Row {
  job: ExportJob;
  projectId: string;
  projectTitle: string;
}

function OrdersScreen() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
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
  // Export date filter (DD/MM/YYYY, weeks from Monday); empty = every export.
  const [range, setRange] = useState<DateRange>({ from: null, to: null });

  // Sample orders from backend
  const sampleOrdersQuery = useQuery({
    queryKey: queryKeys.orders.myOrders,
    queryFn: listMyOrders,
    staleTime: 30_000,
  });
  const sampleOrders = sampleOrdersQuery.data ?? [];
  /** Sample order whose VietQR checkout is open (an order still waiting for payment). */
  const [payingOrder, setPayingOrder] = useState<string | null>(null);

  // Former links of the studio (?project=…&action=sample) now open the sample-print cart with that project.
  const targetProjectId = searchParams.get('project');
  const wantsSample = searchParams.get('action') === 'sample';
  useEffect(() => {
    if (targetProjectId || wantsSample) router.replace(targetProjectId ? `/cart?add=${encodeURIComponent(targetProjectId)}` : '/cart');
  }, [router, targetProjectId, wantsSample]);

  const inRange = (iso: string) => {
    const day = startOfDay(new Date(iso));
    return (!range.from || day >= range.from) && (!range.to || day <= range.to);
  };
  const allRows: Row[] = items
    .flatMap((project, index) => (exports[index]?.data ?? []).map((job) => ({ job, projectId: project.id, projectTitle: project.title })))
    .sort((a, b) => b.job.createdAt.localeCompare(a.job.createdAt));
  const rows = allRows.filter((row) => inRange(row.job.createdAt)).slice(0, 20);
  const filtering = Boolean(range.from || range.to);
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
  } else if (rows.length === 0 && filtering && allRows.length > 0) {
    body = (
      <WorkspaceEmpty
        icon={FileDown}
        title="Không có file in trong khoảng ngày này"
        description="Chọn khoảng ngày khác hoặc xoá bộ lọc để xem mọi file đã xuất."
        action={
          <button type="button" onClick={() => setRange({ from: null, to: null })} className={outlineButton}>
            Xoá bộ lọc ngày
          </button>
        }
      />
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
    // Sortable columns; on phones each export becomes a card.
    const columns: DataColumn<Row>[] = [
      {
        key: 'project',
        label: 'Dự án',
        primary: true,
        sortValue: (row) => row.projectTitle,
        render: ({ job, projectId, projectTitle }) => (
          <span className="block max-w-[260px]">
            <Link href={ROUTES.editor(projectId)} className="block truncate font-medium text-library-ink hover:underline" title={projectTitle}>
              {projectTitle}
            </Link>
            {job.fileName && <span className="block truncate font-mono text-caption text-library-muted" title={job.fileName}>{job.fileName}</span>}
          </span>
        ),
      },
      { key: 'format', label: 'Định dạng', sortValue: (row) => FILE_LABELS[row.job.fileType], render: ({ job }) => <span className="font-mono text-caption text-library-ink">{FILE_LABELS[job.fileType]}</span> },
      {
        key: 'status',
        label: 'Trạng thái',
        sortValue: (row) => STATUS_BADGES[row.job.status].label,
        render: ({ job }) => (
          <>
            <Badge tone={STATUS_BADGES[job.status].tone}>{STATUS_BADGES[job.status].label}</Badge>
            {job.status === 'FAILED' && job.error && <span className="mt-1 block max-w-[200px] truncate text-caption text-danger-fg" title={job.error}>{job.error}</span>}
          </>
        ),
      },
      {
        key: 'time',
        label: 'Thời gian',
        sortValue: (row) => new Date(row.job.completedAt ?? row.job.createdAt),
        render: ({ job }) => <span className="whitespace-nowrap text-library-sub">{formatRelative(job.completedAt ?? job.createdAt)}</span>,
      },
      {
        key: 'download',
        label: 'Tải',
        align: 'right',
        render: ({ job, projectTitle }) =>
          job.status === 'COMPLETED' ? (
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
          ) : null,
      },
    ];
    body = <DataTable label="File in đã xuất" columns={columns} rows={rows} rowKey={(row) => `${row.projectId}:${row.job.id}`} mobile="cards" initialSort={{ key: 'time', direction: 'desc' }} search={{ label: 'Lọc file in', placeholder: 'Tên dự án, định dạng…', text: (row) => `${row.projectTitle} ${FILE_LABELS[row.job.fileType]} ${STATUS_BADGES[row.job.status].label}` }} />;
  }

  const orderColumns: DataColumn<SampleOrder>[] = [
    {
      key: 'project',
      label: 'Dự án',
      primary: true,
      sortValue: (order) => order.projectTitle,
      render: (order) => (
        <span className="block max-w-[220px]">
          {order.projectId ? (
            <Link href={ROUTES.editor(order.projectId)} className="block truncate font-medium text-library-ink hover:underline" title={order.projectTitle}>
              {order.projectTitle}
            </Link>
          ) : (
            <span className="block truncate font-medium text-library-ink" title={order.projectTitle}>{order.projectTitle}</span>
          )}
          <span className="block font-mono text-caption text-library-muted tabular-nums">{order.orderCode}</span>
        </span>
      ),
    },
    {
      key: 'shop',
      label: 'Xưởng in',
      sortValue: (order) => order.printShopName ?? '',
      render: (order) => <span className="text-library-sub">{order.printShopName || order.partnerShop?.name || 'Xưởng đối tác WrapFit'}</span>,
    },
    { key: 'quantity', label: 'Số lượng', sortValue: (order) => order.quantity, render: (order) => <span className="tabular-nums">{order.quantity} hộp</span> },
    {
      key: 'total',
      label: 'Tổng phí',
      align: 'right',
      sortValue: (order) => order.totalVnd ?? 0,
      render: (order) => <span className="font-semibold tabular-nums text-library-ink">{formatVnd(order.totalVnd ?? order.sampleFeeVnd ?? 0)}</span>,
    },
    {
      key: 'status',
      label: 'Trạng thái',
      sortValue: (order) => orderStatusBadge(order.status).label,
      render: (order) => {
        const badge = orderStatusBadge(order.status);
        return (
          <span className="inline-flex flex-wrap items-center justify-end gap-2">
            <Badge tone={badge.tone}>{badge.label}</Badge>
            {order.status === 'pending_payment' && (
              <button type="button" onClick={() => setPayingOrder(order.id)} className={cn(primaryButton, 'h-8 px-3 text-xs')}>
                Thanh toán
              </button>
            )}
          </span>
        );
      },
    },
    {
      key: 'time',
      label: 'Đặt lúc',
      sortValue: (order) => new Date(order.createdAt),
      render: (order) => <span className="whitespace-nowrap text-library-sub">{formatRelative(order.createdAt)}</span>,
    },
  ];

  return (
    <WorkspaceShell
      title="Đơn hàng & File In"
      description="Quản lý file in công nghiệp đã xuất và theo dõi đơn đặt in mẫu thử 01 hộp."
    >
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-8 flex flex-col gap-6">
          {/* Sample Orders Panel */}
          <Panel aria-labelledby="sample-orders-heading">
            <PanelTitle
              id="sample-orders-heading"
              action={
                <Link href="/cart" className={cn(primaryButton, 'h-8 px-3 text-xs flex items-center gap-1.5')}>
                  <Plus className="size-3.5" aria-hidden />
                  Đặt in mẫu
                </Link>
              }
            >
              Đơn in mẫu thử
            </PanelTitle>

            {sampleOrdersQuery.isError ? (
              <WorkspaceError
                error={sampleOrdersQuery.error}
                title="Không tải được đơn in mẫu"
                onRetry={() => void sampleOrdersQuery.refetch()}
                retrying={sampleOrdersQuery.isFetching}
              />
            ) : sampleOrdersQuery.isPending ? (
              <div aria-busy="true" className="flex flex-col gap-2">
                <span role="status" className="sr-only">
                  Đang tải đơn in mẫu…
                </span>
                {[0, 1].map((index) => (
                  <div key={index} aria-hidden className="h-12 animate-pulse rounded-xl bg-library-panel motion-reduce:animate-none" />
                ))}
              </div>
            ) : sampleOrders.length === 0 ? (
              <div className="py-6 text-center text-sm text-library-muted">
                <PackageCheck className="size-8 mx-auto mb-2 text-library-sub opacity-60" />
                <p>Bạn chưa có đơn đặt in mẫu thử nào.</p>
                <p className="text-xs text-library-sub mt-1">In 01 hộp thực tế gửi tận tay để kiểm định màu in và khớp nối trước khi sản xuất hàng loạt.</p>
              </div>
            ) : (
              <DataTable
                label="Đơn in mẫu thử"
                columns={orderColumns}
                rows={sampleOrders}
                rowKey={(order) => order.id}
                mobile="cards"
                initialSort={{ key: 'time', direction: 'desc' }}
              />
            )}
          </Panel>
          {payingOrder && <CheckoutDialog purpose="SAMPLE_ORDER" orderId={payingOrder} doneLabel="Xong" onClose={() => setPayingOrder(null)} />}

          {/* Exported Files Panel */}
          <Panel aria-labelledby="orders-files">
            <PanelTitle id="orders-files" action={<span className="text-sm text-library-muted">Từ {items.length} dự án sửa gần nhất</span>}>
              File in đã xuất
            </PanelTitle>
            {!loading && allRows.length > 0 && (
              <DatePicker
                mode="range"
                label="Lọc theo ngày xuất"
                hint="Gõ DD/MM/YYYY – DD/MM/YYYY hoặc chọn trên lịch."
                value={range}
                onChange={setRange}
                max={new Date()}
                className="mb-4 max-w-sm"
              />
            )}
            {failed && !loading && (
              <Alert
                tone="warning"
                className="mb-3"
                title="Một vài dự án chưa tải được danh sách file."
                action={
                  <button type="button" onClick={() => exports.forEach((query) => query.isError && void query.refetch())} className={cn(outlineButton, "h-9 px-3 text-sm")}>
                    Thử lại
                  </button>
                }
              />
            )}
            {body}
          </Panel>
        </div>

        {/* Steps Sidebar */}
        <section aria-labelledby="orders-steps" className="rounded-squircle-md border-[1.5px] border-library-ink bg-library-tile p-5 shadow-hard xl:col-span-4 h-fit">
          <h2 id="orders-steps" className="text-lg font-medium text-library-ink">
            Quy trình in cùng WrapFit
          </h2>
          <p className="mt-1 text-sm text-library-sub">Liên kết mạng lưới xưởng in offset &amp; bàn cắt kỹ thuật số không cần tiền khuôn 2 triệu VNĐ.</p>
          <ol className="mt-5 flex flex-col gap-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-3 rounded-xl bg-white p-3">
                <span
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-medium',
                    step.ready ? 'bg-fpt-orange text-white' : 'border border-library-line text-library-muted',
                  )}
                >
                  {index + 1}
                </span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2 text-body font-medium text-library-ink">
                    {step.title}
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

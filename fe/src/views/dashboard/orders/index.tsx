'use client';

/**
 * `/dashboard/orders`: print files and print orders, in the pacdora.com workspace style. There is no order API yet:
 * the page lists the print files exported from the latest projects (`GET /projects/:id/exports`, download link from
 * `GET /exports/:jobId`) and explains the ordering steps to come.
 */

import { useQueries, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, FileDown, Loader2, PackageCheck, Plus, Truck } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import React, { useState } from 'react';
import { createSampleOrder, getExportJob, listMyOrders, listPrintShops, listProjectExports } from '@/api';
import { useToast } from '@/components/common/Toast';
import { outlineButton, primaryButton } from '@/components/library';
import { Badge, Panel, PanelTitle, WorkspaceEmpty, WorkspaceError, WorkspaceShell } from '@/components/workspace';
import { ROUTES } from '@/constants';
import { RequireAuth } from '@/features/auth';
import { RECENT_PROJECTS_QUERY, formatRelative, useProjectList } from '@/features/dashboard';
import { formatVnd } from '@/features/pricing';
import { queryKeys } from '@/hooks/data/queryKeys';
import type { ExportFileType, ExportJob, ExportStatus, SampleOrder } from '@/types/api';
import { cn } from '@/utils/helpers';

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
};

const STATUS_BADGES: Record<ExportStatus, { tone: 'green' | 'grey' | 'red'; label: string }> = {
  COMPLETED: { tone: 'green', label: 'Sẵn sàng' },
  PROCESSING: { tone: 'grey', label: 'Đang xử lý' },
  PENDING: { tone: 'grey', label: 'Đang chờ' },
  FAILED: { tone: 'red', label: 'Lỗi' },
};

const ORDER_STATUS_MAP: Record<string, { tone: 'green' | 'grey' | 'amber'; label: string }> = {
  pending: { tone: 'amber', label: 'Chờ xưởng duyệt' },
  confirmed: { tone: 'green', label: 'Đã xác nhận' },
  in_production: { tone: 'amber', label: 'Đang in mẫu thử' },
  shipped: { tone: 'green', label: 'Đang giao hàng' },
  delivered: { tone: 'green', label: 'Đã giao' },
  SUBMITTED: { tone: 'amber', label: 'Chờ xưởng duyệt' },
  IN_PRODUCTION: { tone: 'amber', label: 'Đang in mẫu thử' },
  SHIPPED: { tone: 'green', label: 'Đang giao hàng' },
  DELIVERED: { tone: 'green', label: 'Đã giao' },
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
  const queryClient = useQueryClient();
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

  // Sample orders from backend
  const sampleOrdersQuery = useQuery({
    queryKey: queryKeys.orders.myOrders,
    queryFn: listMyOrders,
    staleTime: 30_000,
  });
  const sampleOrders = sampleOrdersQuery.data ?? [];

  // Partner print shops for ordering
  const printShopsQuery = useQuery({
    queryKey: queryKeys.printShops.all,
    queryFn: listPrintShops,
    staleTime: 60_000,
  });
  const printShops = printShopsQuery.data ?? [];

  // Order modal state
  const targetProjectId = searchParams.get('project');
  const [showOrderModal, setShowOrderModal] = useState(searchParams.get('action') === 'sample' || !!targetProjectId);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(targetProjectId ?? (items[0]?.id || ''));
  const [selectedShopId, setSelectedShopId] = useState<string>('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  const createOrderMutation = useMutation({
    mutationFn: createSampleOrder,
    onSuccess: (order) => {
      toast.show({
        tone: 'success',
        title: 'Đặt in mẫu thử thành công!',
        description: `Đơn in 01 hộp mẫu thử mã #${order.id.slice(0, 8)} đã được gửi đến xưởng ${order.printShopName}.`,
      });
      setShowOrderModal(false);
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.myOrders });
    },
    onError: (err) => {
      toast.error(err, 'Chưa đặt được mẫu thử');
    },
  });

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
    <WorkspaceShell title="Đơn hàng & File In" description="Quản lý file in công nghiệp đã xuất và theo dõi đơn đặt in mẫu thử 01 hộp (Physical Proof).">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-8 flex flex-col gap-6">
          {/* Sample Orders Panel */}
          <Panel aria-labelledby="sample-orders-heading">
            <PanelTitle
              id="sample-orders-heading"
              action={
                <button
                  type="button"
                  onClick={() => setShowOrderModal(true)}
                  className={cn(primaryButton, 'h-8 px-3 text-xs flex items-center gap-1.5')}
                >
                  <Plus className="size-3.5" />
                  Đặt in mẫu 01 hộp
                </button>
              }
            >
              Đơn in mẫu thử (Sample Box Proofs)
            </PanelTitle>

            {sampleOrders.length === 0 ? (
              <div className="py-6 text-center text-sm text-library-muted">
                <PackageCheck className="size-8 mx-auto mb-2 text-library-sub opacity-60" />
                <p>Bạn chưa có đơn đặt in mẫu thử nào.</p>
                <p className="text-xs text-library-sub mt-1">In 01 hộp thực tế gửi tận tay để kiểm định màu in và khớp nối trước khi sản xuất hàng loạt.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-library-line text-library-muted">
                      <th scope="col" className="py-2.5 pr-3 font-normal">Dự án</th>
                      <th scope="col" className="px-3 py-2.5 font-normal">Xưởng in</th>
                      <th scope="col" className="px-3 py-2.5 font-normal">Số lượng</th>
                      <th scope="col" className="px-3 py-2.5 font-normal">Tổng phí</th>
                      <th scope="col" className="px-3 py-2.5 font-normal">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-library-line">
                    {sampleOrders.map((order) => {
                      const st = ORDER_STATUS_MAP[order.status] ?? { tone: 'grey', label: order.status };
                      const shopName = order.printShopName || order.partnerShop?.name || 'Xưởng đối tác WrapFit';
                      const fee = order.totalVnd ?? order.sampleFeeVnd ?? 49_000;
                      return (
                        <tr key={order.id}>
                          <td className="py-3 pr-3 font-medium text-library-ink">
                            <span className="block truncate max-w-[200px]">{order.projectTitle}</span>
                            <span className="block font-mono text-[11px] text-library-muted">#{order.id.slice(0, 8)}</span>
                          </td>
                          <td className="px-3 py-3 text-library-sub text-xs">{shopName}</td>
                          <td className="px-3 py-3 font-mono text-xs">{order.quantity} hộp</td>
                          <td className="px-3 py-3 font-semibold text-library-ink">{formatVnd(fee)}</td>
                          <td className="px-3 py-3">
                            <Badge tone={st.tone}>{st.label}</Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          {/* Exported Files Panel */}
          <Panel aria-labelledby="orders-files">
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
        </div>

        {/* Steps Sidebar */}
        <section aria-labelledby="orders-steps" className="rounded-[20px] border-[1.5px] border-library-ink bg-library-tile p-5 shadow-hard xl:col-span-4 h-fit">
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
                    step.ready ? 'bg-library-lime text-library-lime-ink' : 'border border-library-line text-library-muted',
                  )}
                >
                  {index + 1}
                </span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2 text-[15px] font-medium text-library-ink">
                    {step.title}
                  </span>
                  <span className="block text-sm text-library-sub">{step.text}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {/* Modal: Order Sample Box */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-library-line space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-library-ink flex items-center gap-2">
                <Truck className="size-5 text-library-accent" />
                Đặt in mẫu thử 01 hộp
              </h3>
              <button
                type="button"
                onClick={() => setShowOrderModal(false)}
                className="text-stone-400 hover:text-stone-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-library-sub">
              Xưởng đối tác sẽ dùng file PDF vector CMYK của bạn để in thử 01 hộp thực tế bằng bàn cắt kỹ thuật số.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!selectedProjectId || !recipientName || !recipientPhone || !shippingAddress) {
                  toast.show({ tone: 'error', title: 'Vui lòng điền đủ thông tin giao hàng' });
                  return;
                }
                createOrderMutation.mutate({
                  projectId: selectedProjectId,
                  printShopId: selectedShopId || undefined,
                  recipientName,
                  recipientPhone,
                  phone: recipientPhone,
                  shippingAddress,
                  notes: orderNotes,
                  quantity: 1,
                });
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-medium text-library-ink mb-1">Dự án muốn in mẫu</label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full h-9 rounded-lg border border-library-line px-2.5 bg-white text-library-ink"
                >
                  {items.map((p) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-library-ink mb-1">Xưởng in đối tác</label>
                <select
                  value={selectedShopId}
                  onChange={(e) => setSelectedShopId(e.target.value)}
                  className="w-full h-9 rounded-lg border border-library-line px-2.5 bg-white text-library-ink"
                >
                  <option value="">Tự động chọn xưởng gần nhất (Hồ Chí Minh / Hà Nội)</option>
                  {printShops.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.city})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-library-ink mb-1">Tên người nhận</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Nguyễn Văn A"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="w-full h-9 rounded-lg border border-library-line px-2.5"
                />
              </div>

              <div>
                <label className="block font-medium text-library-ink mb-1">Số điện thoại</label>
                <input
                  type="tel"
                  required
                  placeholder="0912 345 678"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  className="w-full h-9 rounded-lg border border-library-line px-2.5"
                />
              </div>

              <div>
                <label className="block font-medium text-library-ink mb-1">Địa chỉ giao hàng</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  className="w-full rounded-lg border border-library-line p-2"
                />
              </div>

              <div>
                <label className="block font-medium text-library-ink mb-1">Ghi chú cho xưởng</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Dùng giấy Ivory 350 GSM cán màng mờ"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  className="w-full h-9 rounded-lg border border-library-line px-2.5"
                />
              </div>

              <div className="pt-2 border-t border-library-line flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-library-muted block">Phí in mẫu &amp; vận chuyển</span>
                  <span className="text-base font-bold text-library-ink">49.000đ</span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowOrderModal(false)}
                    className="px-3.5 py-2 rounded-full border border-library-line text-xs font-medium"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={createOrderMutation.isPending}
                    className={cn(primaryButton, 'px-4 py-2 text-xs font-semibold')}
                  >
                    {createOrderMutation.isPending ? 'Đang gửi...' : 'Xác nhận đặt mẫu'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </WorkspaceShell>
  );
}

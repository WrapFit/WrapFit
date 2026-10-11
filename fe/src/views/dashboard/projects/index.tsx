'use client';

/**
 * Stitch screen `dashboard-projects`, wired to `GET /projects` and `/collections` (status "wired": `stitch:sync` keeps
 * this file). The markup and classes come from the generated screen, its CSS and tokens are scoped to `data-stitch`;
 * React replaces the screen's filter script (no StitchRuntime). Lifecycle: docs/06, section 5.4.
 */

import Link from 'next/link';
import React, { useEffect, useMemo, useState } from 'react';
import { GoiMascot } from '@/components/common/GoiMascot';
import { EmptyState, ErrorState, PRIMARY_BUTTON } from '@/components/common/StatusViews';
import { DashboardHeaderNav, MainFooter, MainHeader } from '@/components/layout';
import { ROUTES } from '@/constants';
import { RequireAuth } from '@/features/auth';
import {
  CollectionDialog,
  ConfirmDialog,
  FolderBar,
  MoveToFolderDialog,
  NO_FOLDER,
  PROJECTS_PAGE_SIZE,
  ProjectCard,
  SORT_OPTIONS,
  STATUS_TABS,
  TRASH_RETENTION_DAYS,
  formatCount,
  useBusyProjectIds,
  useChangeProjectStatus,
  useCollections,
  useDebouncedValue,
  useDeleteCollection,
  useDeleteProjectPermanently,
  useDuplicateProject,
  useProjectCount,
  useProjectList,
  type FolderFilter,
  type ProjectCardActions,
} from '@/features/dashboard';
import type { Collection, ProjectListQuery, ProjectStatus, ProjectSummary } from '@/types/api';

export default function DashboardProjectsPage() {
  return (
    <RequireAuth>
      <DashboardProjectsScreen />
    </RequireAuth>
  );
}

type Dialog =
  | { kind: 'purge'; project: ProjectSummary }
  | { kind: 'move'; project: ProjectSummary }
  | { kind: 'folder'; collection?: Collection }
  | { kind: 'delete-folder'; collection: Collection };

const PILL_ACTIVE =
  'filter-pill active-pill shrink-0 min-h-[44px] md:min-h-0 px-space-md py-1.5 rounded-lg font-label-ui text-label-ui transition-all bg-surface-container-lowest text-primary shadow-sm font-semibold whitespace-nowrap focus-visible:ring-2 focus-visible:ring-primary/40';
const PILL_IDLE =
  'filter-pill shrink-0 min-h-[44px] md:min-h-0 px-space-md py-1.5 rounded-lg font-label-ui text-label-ui text-on-surface-variant transition-all hover:text-on-surface whitespace-nowrap focus-visible:ring-2 focus-visible:ring-primary/40';
const PAGE_BUTTON =
  'w-11 h-11 rounded-full bg-surface-container-lowest text-on-surface-variant enabled:hover:text-on-surface enabled:hover:bg-surface-container transition-all flex items-center justify-center shadow-sm disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-primary/40';

/** Why the filtered grid is empty, in words. */
function noMatchDescription(q: string, folderName: string | undefined, tabLabel = ''): string {
  const where = folderName ? ` trong thư mục “${folderName}”` : '';
  if (q) return `Không có dự án nào có tên hoặc thẻ “${q}”${where} ở mục ${tabLabel}.`;
  return `Không có dự án nào${where} ở mục ${tabLabel}.`;
}

function DashboardProjectsScreen() {
  const [status, setStatus] = useState<ProjectStatus>('ACTIVE');
  const [search, setSearch] = useState('');
  const [sortId, setSortId] = useState(SORT_OPTIONS[0].id);
  const [folder, setFolder] = useState<FolderFilter>(undefined);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const q = useDebouncedValue(search.trim(), 300);
  const sort = SORT_OPTIONS.find((option) => option.id === sortId) ?? SORT_OPTIONS[0];

  // A change of filter starts again from page 1, without a request for the old page.
  const filtersKey = JSON.stringify([status, q, sort.id, folder]);
  const [paging, setPaging] = useState({ key: filtersKey, page: 1 });
  const page = paging.key === filtersKey ? paging.page : 1;
  const goToPage = (next: number) => setPaging({ key: filtersKey, page: next });

  const query: ProjectListQuery = {
    status,
    q: q || undefined,
    collectionId: folder,
    sortBy: sort.sortBy,
    order: sort.order,
    page,
    limit: PROJECTS_PAGE_SIZE,
  };
  const list = useProjectList(query, { keepPrevious: true });
  const counts = {
    ACTIVE: useProjectCount('ACTIVE'),
    ARCHIVED: useProjectCount('ARCHIVED'),
    DELETED: useProjectCount('DELETED'),
  } satisfies Record<ProjectStatus, unknown>;
  const collections = useCollections();
  const busyIds = useBusyProjectIds();
  const changeStatus = useChangeProjectStatus();
  const duplicate = useDuplicateProject();
  const purge = useDeleteProjectPermanently();
  const deleteFolder = useDeleteCollection();

  const meta = list.data?.meta;
  const items = useMemo(() => list.data?.items ?? [], [list.data]);
  const totalPages = Math.max(1, meta?.totalPages ?? 1);
  const filtering = q !== '' || folder !== undefined;
  const folderName =
    folder === NO_FOLDER ? 'Chưa phân loại' : collections.data?.find((collection) => collection.id === folder)?.title;

  // The last card of a page left it (archived, restored, deleted): go back to the last page that still exists.
  useEffect(() => {
    if (meta && !list.isPlaceholderData && page > 1 && items.length === 0) {
      setPaging({ key: filtersKey, page: Math.max(1, Math.min(page - 1, meta.totalPages)) });
    }
  }, [meta, items.length, page, list.isPlaceholderData, filtersKey]);

  // The selected folder was deleted (here or in another tab): show every project again.
  useEffect(() => {
    if (folder && folder !== NO_FOLDER && collections.data && !collections.data.some((item) => item.id === folder)) {
      setFolder(undefined);
    }
  }, [folder, collections.data]);

  const actions: ProjectCardActions = {
    onChangeStatus: (project, next) => changeStatus.mutate({ project, status: next }),
    onDuplicate: (project) => duplicate.mutate(project),
    onMove: (project) => setDialog({ kind: 'move', project }),
    onDeletePermanently: (project) => setDialog({ kind: 'purge', project }),
  };

  const clearFilters = () => {
    setSearch('');
    setFolder(undefined);
  };

  let gridBody: React.ReactNode;
  if (list.isError && !list.data) {
    gridBody = (
      <ErrorState
        error={list.error}
        title="Không tải được danh sách dự án"
        onRetry={() => void list.refetch()}
        retrying={list.isFetching}
      />
    );
  } else if (list.isPending) {
    gridBody = (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-space-lg" aria-busy="true">
        <span role="status" className="sr-only">
          Đang tải dự án…
        </span>
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <div
            key={index}
            aria-hidden="true"
            className="flex flex-col gap-space-md rounded-2xl bg-surface-container-lowest p-space-md shadow-sm"
          >
            <div className="w-full aspect-[4/3] rounded-xl bg-surface-container-low animate-pulse motion-reduce:animate-none" />
            <div className="h-5 w-3/4 rounded-full bg-surface-container-low animate-pulse motion-reduce:animate-none" />
            <div className="h-3 w-1/2 rounded-full bg-surface-container-low animate-pulse motion-reduce:animate-none" />
            <div className="h-11 rounded-lg bg-surface-container-low animate-pulse motion-reduce:animate-none" />
          </div>
        ))}
      </div>
    );
  } else if (items.length === 0 && filtering) {
    gridBody = (
      <EmptyState
        title="Không có dự án phù hợp"
        description={noMatchDescription(q, folderName, STATUS_TABS.find((tab) => tab.status === status)?.label)}
        action={
          <button type="button" onClick={clearFilters} className={PRIMARY_BUTTON}>
            Xoá bộ lọc
          </button>
        }
      />
    );
  } else if (items.length === 0) {
    gridBody =
      status === 'ACTIVE' ? (
        <EmptyState
          title="Chưa có dự án nào"
          description="Nhập kích thước món quà, WrapFit dựng khuôn bế và hộp 3D vừa khít cho bạn."
          action={
            <Link href={ROUTES.editorNew} className={PRIMARY_BUTTON}>
              Tạo hộp mới
            </Link>
          }
        />
      ) : status === 'ARCHIVED' ? (
        <EmptyState
          title="Chưa có dự án lưu trữ"
          description="Lưu trữ dự án đã xong để danh sách Đang thiết kế gọn gàng; bạn có thể bỏ lưu trữ bất cứ lúc nào."
        />
      ) : (
        <EmptyState
          title="Thùng rác trống"
          description={`Dự án bị xoá nằm ở đây ${TRASH_RETENTION_DAYS} ngày trước khi bị xoá vĩnh viễn.`}
        />
      );
  } else {
    gridBody = (
      <div
        className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-space-lg transition-opacity ${
          list.isPlaceholderData ? 'opacity-60' : ''
        }`}
        id="projectsGrid"
        aria-busy={list.isPlaceholderData}
      >
        {items.map((project) => (
          <ProjectCard key={project.id} project={project} busy={busyIds.has(project.id)} {...actions} />
        ))}
      </div>
    );
  }

  return (
    <div
      data-stitch="dashboard-projects"
      className="bg-background font-body-md text-on-surface antialiased min-h-screen"
    >
      <MainHeader />
      <main className="w-full pt-28 pb-28 md:pb-16 bg-background flex-1">
        <div className="w-full max-w-7xl 2xl:max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-6">
          <DashboardHeaderNav />{' '}
          <section className="w-full px-0 md:px-gutter lg:px-margin pt-space-lg pb-space-xl">
            {/* Top Action & Mascot Introduction Banner */}
            <div className="w-full flex flex-col md:flex-row md:items-end justify-between gap-space-lg pb-space-lg">
              <div className="flex items-center gap-space-md">
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 bg-surface-container-low rounded-2xl flex items-center justify-center shadow-sm overflow-hidden p-space-xs">
                  {/* Mascot spot with sticker styling (the Stitch image has expired: the app's own Gói) */}
                  <GoiMascot pose="presenting" size={56} interactive={false} label="WrapFit Bé Gói Mascot" />
                  <span className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full bg-secondary" />
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-space-xs">
                    <span className="font-cad-spec-micro text-cad-spec-micro uppercase tracking-wider text-secondary flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                      {' Đồng bộ thời gian thực • VectorCAD Cloud '}
                    </span>
                  </div>
                  <h1 className="font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-on-surface tracking-tight">
                    Dự Án Của Bạn
                  </h1>
                  <p className="font-body-sm text-body-sm text-on-surface-variant max-w-md">
                    Quản lý các bản dựng bao bì cao cấp, thông số khuôn bế CAD và chứng nhận hiệu chuẩn FitCheck™.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-space-sm self-start md:self-auto">
                <Link
                  href={ROUTES.editorNew}
                  className="group flex items-center gap-space-sm min-h-[44px] px-space-lg py-3 rounded-xl bg-primary text-on-primary font-label-ui text-label-ui shadow-md hover:bg-primary-container transition-all active:scale-95"
                >
                  <span className="material-symbols-outlined text-lg leading-none transition-transform group-hover:rotate-90">
                    add
                  </span>
                  <span>Bắt Đầu Thiết Kế Mới</span>
                </Link>
              </div>
            </div>

            {/* Minimal Filter Strip & Quick Status Counter */}
            <div className="w-full flex flex-wrap items-center justify-between gap-space-md pt-space-sm pb-space-md">
              <div
                className="relative inline-flex max-w-full overflow-x-auto p-1 rounded-xl bg-surface-container-low shadow-sm"
                id="statusFilterPills"
                role="group"
                aria-label="Trạng thái dự án"
              >
                {STATUS_TABS.map((tab) => {
                  const active = tab.status === status;
                  const count = counts[tab.status].data;
                  return (
                    <button
                      key={tab.status}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setStatus(tab.status)}
                      className={active ? PILL_ACTIVE : PILL_IDLE}
                    >
                      {tab.label}
                      <span className="font-cad-dimension text-cad-dimension ml-1 opacity-70">
                        ({count === undefined ? '–' : formatCount(count)})
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-space-md text-on-surface-variant font-cad-spec-micro text-cad-spec-micro">
                <span className="hidden sm:flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-secondary" />
                  {' Khuôn Dieline V4 Chuẩn ISO '}
                </span>
                <span className="hidden sm:inline opacity-40">•</span>
                <span aria-live="polite">
                  {meta ? `Hiển thị ${items.length} / ${formatCount(meta.total)} dự án` : 'Đang tải…'}
                </span>
              </div>
            </div>

            {/* Search & sort */}
            <div className="w-full flex flex-col sm:flex-row sm:items-center gap-space-sm pb-space-md">
              <div className="relative flex-1 sm:max-w-md">
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg"
                >
                  search
                </span>
                <input
                  type="text"
                  inputMode="search"
                  enterKeyHint="search"
                  value={search}
                  maxLength={100}
                  onChange={(event) => setSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape' && search) setSearch('');
                  }}
                  aria-label="Tìm dự án theo tên hoặc thẻ"
                  placeholder="Tìm theo tên hoặc thẻ…"
                  autoComplete="off"
                  className="w-full min-h-[44px] pl-10 pr-12 rounded-xl bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant/70 font-body-md text-body-md shadow-sm ring-1 ring-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    aria-label="Xoá từ khoá tìm kiếm"
                    className="absolute right-0.5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-lg">
                      close
                    </span>
                  </button>
                )}
              </div>
              <label className="flex items-center gap-space-sm">
                <span className="shrink-0 font-cad-spec-micro text-cad-spec-micro uppercase tracking-wider text-on-surface-variant">
                  Sắp xếp
                </span>
                <select
                  value={sort.id}
                  onChange={(event) => setSortId(event.target.value)}
                  className="flex-1 sm:flex-none min-h-[44px] pl-3 pr-9 rounded-xl bg-surface-container-lowest text-on-surface font-label-ui text-label-ui shadow-sm ring-1 ring-black/5 border-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <FolderBar
              collections={collections.data}
              loading={collections.isPending}
              error={collections.error}
              retrying={collections.isFetching}
              onRetry={() => void collections.refetch()}
              selected={folder}
              onSelect={setFolder}
              onCreate={() => setDialog({ kind: 'folder' })}
              onEdit={(collection) => setDialog({ kind: 'folder', collection })}
              onDelete={(collection) => setDialog({ kind: 'delete-folder', collection })}
            />

            {status === 'DELETED' && (
              <div className="w-full mb-space-lg flex items-start gap-space-sm px-space-md py-3 rounded-xl bg-error-container/50 text-on-error-container font-body-sm text-body-sm">
                <span aria-hidden="true" className="material-symbols-outlined text-lg">
                  auto_delete
                </span>
                <p>
                  Dự án trong thùng rác tự xoá vĩnh viễn sau {TRASH_RETENTION_DAYS} ngày, cùng các tệp gắn với dự án.
                  Khôi phục để tiếp tục chỉnh sửa.
                </p>
              </div>
            )}

            {/* Packaging Cards Grid */}
            {gridBody}

            {/* Pagination */}
            {meta && meta.total > 0 && (
              <nav
                aria-label="Phân trang dự án"
                className="w-full pt-space-xl flex flex-wrap items-center justify-between gap-space-md"
              >
                <span className="font-cad-spec-micro text-cad-spec-micro uppercase tracking-wider text-on-surface-variant">
                  {list.isFetching && !list.isPending ? 'Đang đồng bộ…' : `${formatCount(meta.total)} dự án`}
                  {list.isRefetchError && !list.isFetching && (
                    <button
                      type="button"
                      onClick={() => void list.refetch()}
                      className="ml-2 min-h-[44px] font-semibold text-primary normal-case underline-offset-2 hover:underline"
                    >
                      Không làm mới được · Thử lại
                    </button>
                  )}
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    aria-label="Trang trước"
                    className={PAGE_BUTTON}
                    disabled={page <= 1}
                    onClick={() => goToPage(Math.max(1, page - 1))}
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-lg">
                      chevron_left
                    </span>
                  </button>
                  <span
                    aria-live="polite"
                    className="px-3 py-1 rounded-full bg-surface-container font-cad-dimension text-cad-dimension text-on-surface font-medium"
                  >
                    Trang {page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    aria-label="Trang sau"
                    className={PAGE_BUTTON}
                    disabled={page >= totalPages}
                    onClick={() => goToPage(Math.min(totalPages, page + 1))}
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-lg">
                      chevron_right
                    </span>
                  </button>
                </div>
              </nav>
            )}
          </section>
        </div>
      </main>
      <MainFooter />

      {dialog?.kind === 'purge' && (
        <ConfirmDialog
          title="Xoá vĩnh viễn dự án?"
          icon="delete_forever"
          confirmLabel="Xoá vĩnh viễn"
          busyLabel="Đang xoá…"
          busy={purge.isPending}
          onClose={() => setDialog(null)}
          onConfirm={() => purge.mutate(dialog.project, { onSuccess: () => setDialog(null) })}
        >
          <p>
            <strong className="font-semibold text-stone-900">“{dialog.project.title}”</strong> sẽ bị xoá cùng mốc phiên
            bản, file in đã xuất và ảnh tải lên cho dự án. Không thể hoàn tác.
          </p>
        </ConfirmDialog>
      )}
      {dialog?.kind === 'move' && (
        <MoveToFolderDialog
          project={dialog.project}
          collections={collections.data ?? []}
          onClose={() => setDialog(null)}
          onCreateFolder={() => setDialog({ kind: 'folder' })}
        />
      )}
      {dialog?.kind === 'folder' && (
        <CollectionDialog
          collection={dialog.collection}
          onClose={() => setDialog(null)}
          onSaved={(saved) => {
            if (!dialog.collection) setFolder(saved.id);
          }}
        />
      )}
      {dialog?.kind === 'delete-folder' && (
        <ConfirmDialog
          title="Xoá thư mục?"
          icon="folder_delete"
          confirmLabel="Xoá thư mục"
          busyLabel="Đang xoá…"
          busy={deleteFolder.isPending}
          onClose={() => setDialog(null)}
          onConfirm={() =>
            deleteFolder.mutate(dialog.collection, {
              onSuccess: () => {
                if (folder === dialog.collection.id) setFolder(undefined);
                setDialog(null);
              },
            })
          }
        >
          <p>
            Thư mục <strong className="font-semibold text-stone-900">“{dialog.collection.title}”</strong> sẽ bị xoá.
          </p>
          <p>
            {dialog.collection.projectCount > 0
              ? `${dialog.collection.projectCount} dự án bên trong được giữ nguyên và chuyển về Chưa phân loại.`
              : 'Thư mục này không có dự án nào.'}
          </p>
        </ConfirmDialog>
      )}
    </div>
  );
}

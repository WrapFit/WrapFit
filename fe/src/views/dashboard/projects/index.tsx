'use client';

/**
 * `/dashboard/projects`: every project of the user in the pacdora.com workspace style (WrapFit greens), wired to
 * `GET /projects` (status, q, collectionId, sortBy, order, page, limit) and `/collections`.
 */

import { ArchiveRestore, FolderOpen, Plus, Search, Trash2, X } from 'lucide-react';
import { SelectMenu } from "@/components/ui";
import Link from 'next/link';
import React, { useEffect, useMemo, useState } from 'react';
import { Pagination, outlineButton, primaryButton, createBoxButton } from '@/components/library';
import { SegmentedControl, WORKSPACE_INPUT, WorkspaceEmpty, WorkspaceError, WorkspaceShell } from '@/components/workspace';
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
  RecentProjectSkeleton,
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
import { cn } from '@/utils/helpers';

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

const GRID = 'grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4';

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
      <WorkspaceError error={list.error} title="Không tải được danh sách dự án" onRetry={() => void list.refetch()} retrying={list.isFetching} />
    );
  } else if (list.isPending) {
    gridBody = (
      <div className={GRID} aria-busy="true">
        <span role="status" className="sr-only">
          Đang tải dự án…
        </span>
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <RecentProjectSkeleton key={index} />
        ))}
      </div>
    );
  } else if (items.length === 0 && filtering) {
    gridBody = (
      <WorkspaceEmpty
        icon={Search}
        title="Không có dự án phù hợp"
        description={noMatchDescription(q, folderName, STATUS_TABS.find((tab) => tab.status === status)?.label)}
        action={
          <button type="button" onClick={clearFilters} className={outlineButton}>
            Xoá bộ lọc
          </button>
        }
      />
    );
  } else if (items.length === 0) {
    gridBody =
      status === 'ACTIVE' ? (
        <WorkspaceEmpty
          icon={FolderOpen}
          title="Chưa có dự án nào"
          description="Nhập kích thước món quà, WrapFit dựng khuôn bế và hộp 3D vừa khít cho bạn."
          action={
            <Link href={ROUTES.editorNew} className={createBoxButton}>
              <Plus className="size-4" aria-hidden />
              Tạo hộp mới
            </Link>
          }
        />
      ) : status === 'ARCHIVED' ? (
        <WorkspaceEmpty
          icon={ArchiveRestore}
          title="Chưa có dự án lưu trữ"
          description="Lưu trữ dự án đã xong để danh sách Đang thiết kế gọn gàng; bạn có thể bỏ lưu trữ bất cứ lúc nào."
        />
      ) : (
        <WorkspaceEmpty
          icon={Trash2}
          title="Thùng rác trống"
          description={`Dự án bị xoá nằm ở đây ${TRASH_RETENTION_DAYS} ngày trước khi bị xoá vĩnh viễn.`}
        />
      );
  } else {
    gridBody = (
      <div className={cn(GRID, 'transition-opacity', list.isPlaceholderData && 'opacity-60')} aria-busy={list.isPlaceholderData}>
        {items.map((project) => (
          <ProjectCard key={project.id} project={project} busy={busyIds.has(project.id)} {...actions} />
        ))}
      </div>
    );
  }

  return (
    <WorkspaceShell
      title="Dự án"
      description="Mọi hộp bạn đã dựng: khuôn bế, kích thước, vật liệu và điểm FitCheck™ của từng hộp."
      actions={
        <Link href={ROUTES.editorNew} className={primaryButton}>
          <Plus className="size-4" aria-hidden />
          Tạo dự án mới
        </Link>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SegmentedControl<ProjectStatus>
            label="Trạng thái dự án"
            value={status}
            onChange={setStatus}
            options={STATUS_TABS.map((tab) => {
              const count = counts[tab.status].data;
              return {
                value: tab.status,
                label: (
                  <>
                    {tab.label}
                    <span className="ml-1.5 font-mono text-xs opacity-70">{count === undefined ? '–' : formatCount(count)}</span>
                  </>
                ),
              };
            })}
          />
          <span aria-live="polite" className="text-sm text-library-muted">
            {meta ? `Hiển thị ${items.length} / ${formatCount(meta.total)} dự án` : 'Đang tải…'}
          </span>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-md">
            <Search aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-library-muted" />
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
              className={cn(WORKSPACE_INPUT, 'rounded-full border-library-ink pl-10 pr-11')}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Xoá từ khoá tìm kiếm"
                className="absolute right-0 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-library-muted hover:text-library-ink"
              >
                <X className="size-4" aria-hidden />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-sm text-library-muted">Sắp xếp</span>
            <SelectMenu label="Sắp xếp" value={sort.id} onChange={setSortId} options={SORT_OPTIONS.map((option) => ({ value: option.id, label: option.label }))} className="flex-1 sm:w-56 sm:flex-none" />
          </div>
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
          <p className="flex items-start gap-2.5 rounded-xl border border-danger/30 bg-danger-bg/60 px-4 py-3 text-sm leading-[1.6] text-danger-fg">
            <Trash2 className="mt-0.5 size-4 shrink-0" aria-hidden />
            Dự án trong thùng rác tự xoá vĩnh viễn sau {TRASH_RETENTION_DAYS} ngày, cùng các tệp gắn với dự án. Khôi phục để tiếp tục chỉnh sửa.
          </p>
        )}

        {gridBody}

        {meta && meta.total > 0 && (
          <div className="flex flex-col items-center gap-1">
            <Pagination page={page} totalPages={totalPages} busy={list.isPlaceholderData} onPage={goToPage} />
            <p className="mt-2 text-sm text-library-muted">
              {list.isFetching && !list.isPending ? 'Đang đồng bộ…' : `${formatCount(meta.total)} dự án · Trang ${page} / ${totalPages}`}
              {list.isRefetchError && !list.isFetching && (
                <button type="button" onClick={() => void list.refetch()} className="ml-2 min-h-[44px] font-medium text-fpt-orange-ink hover:underline">
                  Không làm mới được · Thử lại
                </button>
              )}
            </p>
          </div>
        )}
      </div>

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
            <strong className="font-medium text-library-ink">“{dialog.project.title}”</strong> sẽ bị xoá cùng mốc phiên
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
            Thư mục <strong className="font-medium text-library-ink">“{dialog.collection.title}”</strong> sẽ bị xoá.
          </p>
          <p>
            {dialog.collection.projectCount > 0
              ? `${dialog.collection.projectCount} dự án bên trong được giữ nguyên và chuyển về Chưa phân loại.`
              : 'Thư mục này không có dự án nào.'}
          </p>
        </ConfirmDialog>
      )}
    </WorkspaceShell>
  );
}

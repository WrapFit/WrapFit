"use client";

import React from "react";
import { errorMessage } from "@/services/api";
import type { Collection } from "@/types/api";
import { MAX_COLLECTIONS } from "../format";
import { Icon } from "@/components/ui";

/** `undefined` = every project, `"none"` = outside any folder, otherwise a collection id (`GET /projects?collectionId=`). */
export type FolderFilter = string | undefined;
export const NO_FOLDER = "none";

interface FolderBarProps {
  collections: Collection[] | undefined;
  loading: boolean;
  error: unknown;
  retrying: boolean;
  onRetry(): void;
  selected: FolderFilter;
  onSelect(filter: FolderFilter): void;
  onCreate(): void;
  onEdit(collection: Collection): void;
  onDelete(collection: Collection): void;
}

const CHIP =
  "flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border-[1.5px] px-3 text-sm transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-library-ink/20 md:min-h-9";
const CHIP_ACTIVE = "border-library-ink bg-white text-library-ink shadow-hard-sm";
const CHIP_IDLE = "border-transparent text-library-sub hover:bg-library-panel hover:text-library-ink";
const TOOL =
  "flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 text-sm transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-library-ink/20 md:min-h-9";

/** Folder filter of the project grid, with create / edit / delete of the folders themselves (`/collections`). */
export function FolderBar({
  collections,
  loading,
  error,
  retrying,
  onRetry,
  selected,
  onSelect,
  onCreate,
  onEdit,
  onDelete,
}: FolderBarProps) {
  const active = collections?.find((collection) => collection.id === selected);
  const full = (collections?.length ?? 0) >= MAX_COLLECTIONS;

  const chip = (filter: FolderFilter, label: React.ReactNode, key: string, title?: string) => {
    const isActive = selected === filter;
    return (
      <button
        key={key}
        type="button"
        title={title}
        aria-pressed={isActive}
        onClick={() => onSelect(filter)}
        className={`${CHIP} ${isActive ? CHIP_ACTIVE : CHIP_IDLE}`}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="flex w-full flex-col gap-2 pb-5">
      <div className="flex items-center gap-2">
        <span className="hidden shrink-0 items-center gap-1.5 text-sm text-library-muted sm:flex">
          <Icon name="folder" className="size-4" />
          Thư mục
        </span>
        <div
          role="group"
          aria-label="Lọc theo thư mục"
          className="relative flex min-w-0 flex-1 items-center gap-1 overflow-x-auto rounded-xl border border-library-line bg-library-panel p-1 [scrollbar-width:none]"
        >
          {chip(undefined, "Tất cả", "all")}
          {chip(NO_FOLDER, "Chưa phân loại", "none")}
          {loading &&
            [0, 1, 2].map((index) => (
              <span
                key={index}
                aria-hidden="true"
                className="h-8 w-24 shrink-0 animate-pulse rounded-lg bg-library-line/70 motion-reduce:animate-none"
              />
            ))}
          {collections?.map((collection) =>
            chip(
              collection.id,
              <>
                <span
                  aria-hidden="true"
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: collection.colorTag ?? "#98E665" }}
                />
                <span className="max-w-[160px] truncate">{collection.title}</span>
                <span className="text-xs text-library-muted">{collection.projectCount}</span>
              </>,
              collection.id,
              collection.title,
            ),
          )}
        </div>
        <button
          type="button"
          onClick={onCreate}
          disabled={full || loading}
          aria-label="Tạo thư mục mới"
          title={full ? `Tối đa ${MAX_COLLECTIONS} thư mục` : "Tạo thư mục mới"}
          className={`${TOOL} min-w-[44px] shrink-0 justify-center border border-library-ink bg-white text-library-ink enabled:hover:bg-library-panel disabled:cursor-not-allowed disabled:opacity-50`}
        >
          <Icon name="create_new_folder" className="size-[18px]" />
          <span className="hidden sm:inline">Thư mục mới</span>
        </button>
      </div>

      {Boolean(error) && !collections && (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-2 rounded-xl bg-danger-bg px-4 py-2 text-sm text-danger-fg"
        >
          <Icon name="error" className="size-4" />
          <span>Không tải được thư mục: {errorMessage(error)}</span>
          <button
            type="button"
            onClick={onRetry}
            disabled={retrying}
            className="min-h-[44px] md:min-h-0 font-semibold underline-offset-2 hover:underline disabled:opacity-60"
          >
            {retrying ? "Đang thử lại…" : "Thử lại"}
          </button>
        </div>
      )}

      {active && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-library-line bg-white px-4 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              aria-hidden="true"
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: active.colorTag ?? "#98E665" }}
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-library-ink">
                {active.title}
                <span className="ml-2 text-xs font-normal text-library-muted">
                  {active.projectCount} dự án
                </span>
              </p>
              {active.description && (
                <p className="line-clamp-1 text-sm text-library-sub">{active.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onEdit(active)}
              className={`${TOOL} text-library-ink hover:bg-library-panel`}
            >
              <Icon name="edit" className="size-[18px]" />
              Sửa
            </button>
            <button
              type="button"
              onClick={() => onDelete(active)}
              className={`${TOOL} text-danger-fg hover:bg-danger-bg`}
            >
              <Icon name="folder_delete" className="size-[18px]" />
              Xoá thư mục
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

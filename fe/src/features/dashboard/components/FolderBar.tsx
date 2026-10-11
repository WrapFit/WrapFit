"use client";

import React from "react";
import { errorMessage } from "@/services/api";
import type { Collection } from "@/types/api";
import { MAX_COLLECTIONS } from "../format";

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
  "shrink-0 min-h-[44px] md:min-h-[36px] px-space-md rounded-lg font-label-ui text-label-ui transition-all flex items-center gap-2 whitespace-nowrap focus-visible:ring-2 focus-visible:ring-primary/40";
const CHIP_ACTIVE = "bg-surface-container-lowest text-primary shadow-sm font-semibold";
const CHIP_IDLE = "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest/60";
const TOOL =
  "min-h-[44px] md:min-h-[36px] px-3 rounded-lg font-label-ui text-label-ui flex items-center gap-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-primary/40";

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
    <div className="w-full flex flex-col gap-space-sm pb-space-lg">
      <div className="flex items-center gap-space-sm">
        <span className="hidden sm:flex items-center gap-1.5 shrink-0 font-cad-spec-micro text-cad-spec-micro uppercase tracking-wider text-on-surface-variant">
          <span aria-hidden="true" className="material-symbols-outlined text-base">
            folder
          </span>
          Thư mục
        </span>
        <div
          role="group"
          aria-label="Lọc theo thư mục"
          className="relative flex-1 min-w-0 flex items-center gap-1 p-1 rounded-xl bg-surface-container-low shadow-sm overflow-x-auto"
        >
          {chip(undefined, "Tất cả", "all")}
          {chip(NO_FOLDER, "Chưa phân loại", "none")}
          {loading &&
            [0, 1, 2].map((index) => (
              <span
                key={index}
                aria-hidden="true"
                className="shrink-0 h-8 w-24 rounded-lg bg-surface-container-high/70 animate-pulse motion-reduce:animate-none"
              />
            ))}
          {collections?.map((collection) =>
            chip(
              collection.id,
              <>
                <span
                  aria-hidden="true"
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: collection.colorTag ?? "#D4A373" }}
                />
                <span className="max-w-[160px] truncate">{collection.title}</span>
                <span className="font-cad-dimension text-cad-dimension opacity-70">{collection.projectCount}</span>
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
          className={`${TOOL} shrink-0 min-w-[44px] justify-center bg-surface-container-low text-primary enabled:hover:bg-surface-container disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <span aria-hidden="true" className="material-symbols-outlined text-lg">
            create_new_folder
          </span>
          <span className="hidden sm:inline">Thư mục mới</span>
        </button>
      </div>

      {Boolean(error) && !collections && (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-2 px-space-md py-2 rounded-xl bg-error-container/60 text-on-error-container font-body-sm text-body-sm"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-base">
            error
          </span>
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
        <div className="flex flex-wrap items-center justify-between gap-space-sm px-space-md py-2 rounded-xl bg-surface-container-lowest shadow-sm">
          <div className="flex items-center gap-2 min-w-0">
            <span
              aria-hidden="true"
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: active.colorTag ?? "#D4A373" }}
            />
            <div className="min-w-0">
              <p className="font-label-ui text-label-ui text-on-surface truncate">
                {active.title}
                <span className="ml-2 font-cad-dimension text-cad-dimension text-on-surface-variant">
                  {active.projectCount} dự án
                </span>
              </p>
              {active.description && (
                <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-1">{active.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onEdit(active)}
              className={`${TOOL} text-on-surface hover:bg-surface-container-low`}
            >
              <span aria-hidden="true" className="material-symbols-outlined text-lg">
                edit
              </span>
              Sửa
            </button>
            <button
              type="button"
              onClick={() => onDelete(active)}
              className={`${TOOL} text-error hover:bg-error-container/50`}
            >
              <span aria-hidden="true" className="material-symbols-outlined text-lg">
                folder_delete
              </span>
              Xoá thư mục
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useId, useRef, useState } from "react";
import type { Collection, ProjectSummary } from "@/types/api";
import { useMoveProject } from "../useProjects";
import { DIALOG_CANCEL, DIALOG_PANEL } from "./ConfirmDialog";
import { ModalDialog } from "./ModalDialog";
import { Icon } from "@/components/ui";

const SUBMIT =
  "flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-fpt-orange px-5 py-2.5 text-sm font-medium text-white transition-colors enabled:hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-wait focus-visible:ring-[3px] focus-visible:ring-fpt-orange/30";

interface MoveToFolderDialogProps {
  project: ProjectSummary;
  collections: Collection[];
  onClose(): void;
  /** Opens the "new folder" dialog instead. */
  onCreateFolder(): void;
}

const NONE = "";

/** Puts a project in one of my folders, or takes it out of its folder (`PATCH /projects/:id { collectionId }`). */
export function MoveToFolderDialog({ project, collections, onClose, onCreateFolder }: MoveToFolderDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const groupName = useId();
  const currentRef = useRef<HTMLInputElement>(null);
  const move = useMoveProject();
  const current = project.collection?.id ?? NONE;
  const [target, setTarget] = useState(current);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (target === current || move.isPending) return;
    const collection = collections.find((item) => item.id === target) ?? null;
    move.mutate({ project, collection }, { onSuccess: onClose });
  };

  const options = [
    {
      id: NONE,
      title: "Không thuộc thư mục nào",
      colorTag: null as string | null,
      projectCount: null as number | null,
    },
    ...collections,
  ];

  return (
    <ModalDialog
      onClose={move.isPending ? () => undefined : onClose}
      labelledBy={titleId}
      describedBy={descriptionId}
      initialFocus={currentRef}
      panelClassName={DIALOG_PANEL}
    >
      <form onSubmit={submit} className="flex flex-col gap-5">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 shrink-0 rounded-2xl bg-fpt-orange-light text-fpt-orange-ink flex items-center justify-center">
            <Icon name="drive_file_move" className="size-5" />
          </span>
          <div className="min-w-0 pt-0.5">
            <h2 id={titleId} className="text-xl font-medium text-library-ink leading-snug">
              Chuyển thư mục
            </h2>
            <p id={descriptionId} className="text-sm text-library-sub truncate">
              {project.title}
            </p>
          </div>
        </div>

        <div
          role="radiogroup"
          aria-labelledby={titleId}
          className="relative flex flex-col gap-1 max-h-[45dvh] overflow-y-auto -mx-1 px-1 py-1"
        >
          {options.map((option) => {
            const checked = option.id === target;
            return (
              <label
                key={option.id || "none"}
                className={`min-h-[48px] px-3 rounded-xl flex items-center gap-3 cursor-pointer transition-colors ${
                  checked ? "bg-fpt-orange-light ring-1 ring-fpt-orange/40" : "hover:bg-library-panel"
                } focus-within:ring-2 focus-within:ring-vibrant-cobalt`}
              >
                <input
                  ref={option.id === current ? currentRef : undefined}
                  type="radio"
                  name={groupName}
                  value={option.id}
                  checked={checked}
                  onChange={() => setTarget(option.id)}
                  className="sr-only"
                />
                <span
                  aria-hidden="true"
                  className={`w-3 h-3 shrink-0 rounded-full ${option.id ? "" : "ring-1 ring-library-muted bg-white"}`}
                  style={option.id ? { backgroundColor: option.colorTag ?? "#D4A373" } : undefined}
                />
                <span className="flex-1 min-w-0 truncate text-sm font-medium text-library-ink">{option.title}</span>
                {option.projectCount !== null && (
                  <span className="font-mono text-cad-spec-micro text-library-muted">{option.projectCount}</span>
                )}
                {option.id === current && (
                  <span className="font-mono text-cad-spec-micro uppercase tracking-wider text-library-muted">
                    Hiện tại
                  </span>
                )}
                <Icon name="check" className={`size-[18px] ${checked ? "text-fpt-orange-ink" : "text-transparent"}`} />
              </label>
            );
          })}
        </div>

        {collections.length === 0 && (
          <p className="text-sm text-library-sub">
            Bạn chưa có thư mục nào.{" "}
            <button
              type="button"
              onClick={onCreateFolder}
              className="font-semibold text-fpt-orange-ink underline-offset-2 hover:underline min-h-[44px]"
            >
              Tạo thư mục mới
            </button>
          </p>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button type="button" onClick={onClose} disabled={move.isPending} className={DIALOG_CANCEL}>
            Huỷ
          </button>
          <button type="submit" disabled={target === current} aria-disabled={move.isPending} className={SUBMIT}>
            {move.isPending ? "Đang chuyển…" : "Chuyển"}
          </button>
        </div>
      </form>
    </ModalDialog>
  );
}

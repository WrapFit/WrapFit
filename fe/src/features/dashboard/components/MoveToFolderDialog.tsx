"use client";

import React, { useId, useRef, useState } from "react";
import type { Collection, ProjectSummary } from "@/types/api";
import { useMoveProject } from "../useProjects";
import { DIALOG_CANCEL, DIALOG_PANEL } from "./ConfirmDialog";
import { ModalDialog } from "./ModalDialog";

const SUBMIT =
  "px-5 py-2.5 min-h-[44px] rounded-xl bg-[#004ac6] text-white enabled:hover:bg-[#2563eb] text-sm font-semibold shadow-sm enabled:active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed aria-disabled:cursor-wait focus-visible:ring-2 focus-visible:ring-[#2563eb]/40";

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
          <span className="w-10 h-10 shrink-0 rounded-2xl bg-[#dbe1ff] text-[#004ac6] flex items-center justify-center">
            <span aria-hidden="true" className="material-symbols-outlined text-xl">
              drive_file_move
            </span>
          </span>
          <div className="min-w-0 pt-0.5">
            <h2 id={titleId} className="font-['Playfair_Display'] text-xl font-semibold text-stone-900 leading-snug">
              Chuyển thư mục
            </h2>
            <p id={descriptionId} className="text-sm text-stone-600 truncate">
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
                  checked ? "bg-[#dbe1ff]/60 ring-1 ring-[#2563eb]/40" : "hover:bg-stone-50"
                } focus-within:ring-2 focus-within:ring-[#2563eb]`}
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
                  className={`w-3 h-3 shrink-0 rounded-full ${option.id ? "" : "ring-1 ring-stone-400 bg-white"}`}
                  style={option.id ? { backgroundColor: option.colorTag ?? "#D4A373" } : undefined}
                />
                <span className="flex-1 min-w-0 truncate text-sm font-medium text-stone-900">{option.title}</span>
                {option.projectCount !== null && (
                  <span className="font-['JetBrains_Mono'] text-[11px] text-stone-500">{option.projectCount}</span>
                )}
                {option.id === current && (
                  <span className="font-['JetBrains_Mono'] text-[10px] uppercase tracking-wider text-stone-500">
                    Hiện tại
                  </span>
                )}
                <span
                  aria-hidden="true"
                  className={`material-symbols-outlined text-lg ${checked ? "text-[#004ac6]" : "text-transparent"}`}
                >
                  check
                </span>
              </label>
            );
          })}
        </div>

        {collections.length === 0 && (
          <p className="text-sm text-stone-600">
            Bạn chưa có thư mục nào.{" "}
            <button
              type="button"
              onClick={onCreateFolder}
              className="font-semibold text-[#004ac6] underline-offset-2 hover:underline min-h-[44px]"
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

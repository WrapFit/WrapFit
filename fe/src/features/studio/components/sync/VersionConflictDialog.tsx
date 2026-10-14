"use client";

import React, { useEffect, useRef } from "react";
import { GitCompareArrows } from "lucide-react";

interface VersionConflictDialogProps {
  /** Drops the local changes and opens the version saved by the other tab. */
  onReload: () => void;
  reloading: boolean;
  /** Saves this design over the other version. */
  onOverwrite: () => void;
}

/** 409 PROJECT_VERSION_CONFLICT: the project was saved from another tab or device since this one loaded it. */
export function VersionConflictDialog({ onReload, reloading, onOverwrite }: VersionConflictDialogProps) {
  const firstButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    firstButton.current?.focus();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="conflict-title"
        aria-describedby="conflict-description"
        className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 border border-landing-line shadow-soft-16"
      >
        <div className="flex items-start gap-3">
          <span className="w-11 h-11 flex-shrink-0 rounded-3xl bg-vibrant-coral/15 text-vibrant-coral-dark flex items-center justify-center">
            <GitCompareArrows className="w-5 h-5" aria-hidden />
          </span>
          <div>
            <h2 id="conflict-title" className="font-landing-heading font-bold text-landing-ink text-lg leading-snug">
              Dự án vừa được lưu ở nơi khác
            </h2>
            <p id="conflict-description" className="text-sm text-landing-muted mt-1 leading-relaxed">
              Một tab hoặc thiết bị khác đã lưu bản mới hơn trong lúc bạn đang sửa. Các thay đổi trên tab này chưa được lưu.
            </p>
          </div>
        </div>

        <ul className="space-y-2 text-xs text-landing-muted">
          <li className="p-3 rounded-3xl bg-landing-canvas border border-landing-line">
            <span className="font-semibold text-landing-ink">Tải bản mới:</span> mở bản đã lưu ở nơi khác, bỏ thay đổi trên tab này.
          </li>
          <li className="p-3 rounded-3xl bg-landing-canvas border border-landing-line">
            <span className="font-semibold text-landing-ink">Ghi đè:</span> lưu bản trên tab này, thay thế bản ở nơi khác.
          </li>
        </ul>

        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <button
            type="button"
            onClick={onOverwrite}
            disabled={reloading}
            className="min-h-[44px] px-5 rounded-full border border-landing-line hover:bg-landing-canvas text-landing-ink text-sm font-semibold transition disabled:opacity-60"
          >
            Ghi đè bằng bản này
          </button>
          <button
            ref={firstButton}
            type="button"
            onClick={onReload}
            disabled={reloading}
            className="min-h-[44px] px-5 rounded-full bg-landing-green-night hover:bg-black text-white text-sm font-semibold shadow-none transition disabled:cursor-wait disabled:opacity-60"
          >
            {reloading ? "Đang tải bản mới…" : "Tải bản mới"}
          </button>
        </div>
      </div>
    </div>
  );
}

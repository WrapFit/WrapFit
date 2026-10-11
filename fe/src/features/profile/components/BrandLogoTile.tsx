"use client";

import React, { useId, useRef, useState } from "react";
import { useToast } from "@/components/common/Toast";
import { UPLOAD_RULES, formatBytes, showUploadError, uploadAccept, useFileUpload } from "@/features/dashboard";
import { isPdfUrl } from "../brandKit";

interface BrandLogoTileProps {
  logoUrl: string | null;
  /** Shown as a wordmark while there is no logo. */
  placeholder: string;
  onChange(logoUrl: string | null): void;
}

const TILE_BUTTON =
  "min-h-[44px] min-w-[44px] px-2 rounded-lg flex items-center justify-center gap-1 font-cad-spec-micro text-[10px] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-primary";

/**
 * Logo of the brand kit (upload purpose LOGO: PNG, JPEG, WebP, SVG or PDF up to 15 MB). The upload only stages the
 * file: the kit is saved as a whole with "Lưu Brand Kit".
 */
export function BrandLogoTile({ logoUrl, placeholder, onChange }: BrandLogoTileProps) {
  const toast = useToast();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useFileUpload("LOGO");
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  const onFile = (file: File | undefined) => {
    if (!file || upload.isPending) return;
    upload.mutate(file, {
      onSuccess: (fileUrl) => {
        onChange(fileUrl);
        toast.show({ tone: "info", title: "Đã tải logo lên", description: "Nhấn “Lưu Brand Kit” để dùng logo này." });
      },
      onError: (error) => showUploadError(toast, error, "LOGO", "Không tải được logo"),
      onSettled: () => {
        if (inputRef.current) inputRef.current.value = "";
      },
    });
  };

  let preview: React.ReactNode;
  if (upload.isPending) {
    preview = (
      <span role="status" className="flex flex-col items-center gap-1 text-on-surface-variant">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-surface-container-high border-t-primary motion-reduce:animate-none" />
        <span className="font-cad-spec-micro text-[9px]">Đang tải logo lên…</span>
      </span>
    );
  } else if (logoUrl && isPdfUrl(logoUrl)) {
    preview = (
      <span className="flex items-center gap-1.5 text-on-surface">
        <span aria-hidden="true" className="material-symbols-outlined text-2xl text-error">
          picture_as_pdf
        </span>
        <span className="font-cad-dimension text-[10px] font-semibold">Logo vector PDF</span>
      </span>
    );
  } else if (logoUrl && logoUrl !== failedUrl) {
    preview = (
      <img
        src={logoUrl}
        alt="Logo thương hiệu"
        onError={() => setFailedUrl(logoUrl)}
        className="max-h-16 max-w-full object-contain"
      />
    );
  } else {
    preview = (
      <span className="font-display-hero text-sm font-semibold tracking-widest text-on-surface/40 uppercase truncate max-w-full">
        {placeholder}
      </span>
    );
  }

  return (
    <div className="bg-white/80 hover:bg-white rounded-xl p-2.5 flex flex-col justify-between items-center text-center group transition-all shadow-sm">
      <div className="h-20 w-full flex items-center justify-center px-1">{preview}</div>
      <div className="w-full flex flex-col gap-1 pt-1.5 border-t border-black/5">
        <span className="font-cad-spec-micro text-[9px] text-on-surface-variant font-medium">
          {logoUrl ? "Logo thương hiệu" : "Chưa có logo"} · tối đa {formatBytes(UPLOAD_RULES.LOGO.maxBytes)}
        </span>
        <div className="flex flex-wrap items-center justify-center gap-1">
          <label
            htmlFor={inputId}
            aria-disabled={upload.isPending}
            className={`${TILE_BUTTON} relative cursor-pointer text-primary hover:bg-primary/10 focus-within:ring-2 focus-within:ring-primary ${
              upload.isPending ? "pointer-events-none opacity-60" : ""
            }`}
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
              upload
            </span>
            {logoUrl ? "Thay logo" : "Tải logo"}
            <input
              ref={inputRef}
              id={inputId}
              type="file"
              accept={uploadAccept("LOGO")}
              disabled={upload.isPending}
              onChange={(event) => onFile(event.target.files?.[0])}
              className="sr-only"
            />
          </label>
          {logoUrl && (
            <button
              type="button"
              onClick={() => onChange(null)}
              disabled={upload.isPending}
              className={`${TILE_BUTTON} text-on-surface-variant hover:text-error hover:bg-error-container/40`}
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
                hide_image
              </span>
              Gỡ
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

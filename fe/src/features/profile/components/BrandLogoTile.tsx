"use client";

import { FileText, ImageOff, Upload } from "lucide-react";
import React, { useId, useRef, useState } from "react";
import { useToast } from "@/components/common/Toast";
import { UPLOAD_RULES, formatBytes, showUploadError, uploadAccept, useFileUpload } from "@/features/dashboard";
import { cn } from "@/utils/helpers";
import { isPdfUrl } from "../brandKit";

interface BrandLogoTileProps {
  logoUrl: string | null;
  /** Shown as a wordmark while there is no logo. */
  placeholder: string;
  onChange(logoUrl: string | null): void;
}

const TILE_BUTTON =
  "inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-library-ink/20 disabled:opacity-60";

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
      <span role="status" className="flex flex-col items-center gap-1.5 text-library-sub">
        <span className="size-6 animate-spin rounded-full border-2 border-library-line border-t-fpt-orange motion-reduce:animate-none" />
        <span className="text-xs">Đang tải logo lên…</span>
      </span>
    );
  } else if (logoUrl && isPdfUrl(logoUrl)) {
    preview = (
      <span className="flex items-center gap-2 text-sm font-medium text-library-ink">
        <FileText className="size-6 text-danger-fg" aria-hidden />
        Logo vector PDF
      </span>
    );
  } else if (logoUrl && logoUrl !== failedUrl) {
    preview = <img src={logoUrl} alt="Logo thương hiệu" onError={() => setFailedUrl(logoUrl)} className="max-h-20 max-w-full object-contain" />;
  } else {
    preview = <span className="max-w-full truncate text-base font-medium uppercase tracking-[0.2em] text-library-muted">{placeholder}</span>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-library-line bg-library-panel px-3">{preview}</div>
      <div className="flex flex-wrap items-center gap-2">
        <label
          htmlFor={inputId}
          aria-disabled={upload.isPending}
          className={cn(
            TILE_BUTTON,
            "relative cursor-pointer border-library-ink bg-white text-library-ink hover:bg-library-panel focus-within:ring-[3px] focus-within:ring-library-ink/20",
            upload.isPending && "pointer-events-none opacity-60",
          )}
        >
          <Upload className="size-4" aria-hidden />
          {logoUrl ? "Thay logo" : "Tải logo lên"}
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
          <button type="button" onClick={() => onChange(null)} disabled={upload.isPending} className={cn(TILE_BUTTON, "border-transparent text-library-sub hover:bg-danger-bg hover:text-danger-fg")}>
            <ImageOff className="size-4" aria-hidden />
            Gỡ logo
          </button>
        )}
        <span className="text-xs text-library-muted">
          {UPLOAD_RULES.LOGO.formats} · tối đa {formatBytes(UPLOAD_RULES.LOGO.maxBytes)}
        </span>
      </div>
    </div>
  );
}

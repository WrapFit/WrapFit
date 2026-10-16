"use client";

import { Camera, ImageOff, Sparkles } from "lucide-react";
import React, { useEffect, useId, useRef, useState } from "react";
import { useToast } from "@/components/common/Toast";
import { displayName, initialsOf } from "@/components/layout/account";
import { UPLOAD_RULES, formatBytes, showUploadError, uploadAccept, useFileUpload } from "@/features/dashboard";
import type { SafeUser } from "@/types/api";
import { cn } from "@/utils/helpers";
import { useUpdateProfile } from "../useAccount";
import { AvatarCropDialog } from "./AvatarCropDialog";

const BUTTON =
  "inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-library-ink/20 disabled:cursor-wait disabled:opacity-60";

/**
 * Profile photo with "Đổi ảnh" (pick a file, frame and zoom it in a preview, then upload purpose AVATAR and
 * `PATCH /users/me { avatarUrl }`), "Ảnh minh hoạ" (an illustrated gift box instead of a photo) and "Gỡ ảnh"
 * (`avatarUrl: null`). The header follows through the session cache.
 */
export function AvatarEditor({ user }: { user: SafeUser }) {
  const toast = useToast();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useFileUpload("AVATAR");
  const update = useUpdateProfile();
  const [preview, setPreview] = useState<string | null>(null);
  /** The crop dialog: a picked file, "illustration" for the illustrated avatars, or closed. */
  const [cropping, setCropping] = useState<File | "illustration" | null>(null);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const busy = upload.isPending || update.isPending;
  const name = displayName(user);

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  const onFile = async (file: File | undefined) => {
    if (!file || busy) return;
    setCropping(null);
    const local = URL.createObjectURL(file);
    setPreview(local);
    try {
      let fileUrl: string;
      try {
        fileUrl = await upload.mutateAsync(file);
      } catch (error) {
        showUploadError(toast, error, "AVATAR", "Không tải được ảnh đại diện");
        return;
      }
      try {
        await update.mutateAsync({ avatarUrl: fileUrl });
        toast.show({ tone: "success", title: "Đã cập nhật ảnh đại diện" });
      } catch (error) {
        toast.error(error, "Không lưu được ảnh đại diện");
      }
    } finally {
      setPreview(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = () =>
    update.mutate(
      { avatarUrl: null },
      {
        onSuccess: () => toast.show({ tone: "success", title: "Đã gỡ ảnh đại diện" }),
        onError: (error) => toast.error(error, "Không gỡ được ảnh đại diện"),
      },
    );

  const shown = preview ?? (user.avatarUrl && user.avatarUrl !== failedUrl ? user.avatarUrl : null);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-24 h-24">
        {shown ? (
          <img
            src={shown}
            alt={`Ảnh đại diện của ${name}`}
            referrerPolicy="no-referrer"
            onError={() => setFailedUrl(user.avatarUrl)}
            className="h-24 w-24 rounded-full border-[1.5px] border-library-ink object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-24 w-24 items-center justify-center rounded-full border-[1.5px] border-library-ink bg-brand-forest-deep text-3xl font-medium text-white"
          >
            {initialsOf(name)}
          </span>
        )}
        {busy && (
          <span
            role="status"
            className="absolute inset-0 flex items-center justify-center rounded-full bg-white/70"
          >
            <span className="h-7 w-7 animate-spin rounded-full border-2 border-library-line border-t-fpt-orange motion-reduce:animate-none" />
            <span className="sr-only">{upload.isPending ? "Đang tải ảnh lên…" : "Đang lưu…"}</span>
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <label
          htmlFor={inputId}
          aria-disabled={busy}
          className={cn(
            BUTTON,
            "relative cursor-pointer border-transparent bg-fg text-fg-inverse hover:bg-fg/90 focus-within:ring-[3px] focus-within:ring-focus/40",
            busy && "pointer-events-none opacity-60",
          )}
        >
          <Camera className="size-4" aria-hidden />
          {user.avatarUrl ? "Đổi ảnh" : "Tải ảnh lên"}
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={uploadAccept("AVATAR")}
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) setCropping(file);
              event.target.value = "";
            }}
            className="sr-only"
          />
        </label>
        <button
          type="button"
          onClick={() => setCropping("illustration")}
          disabled={busy}
          className={cn(BUTTON, "border-library-line bg-white text-library-ink hover:bg-library-panel")}
        >
          <Sparkles className="size-4" aria-hidden />
          Ảnh minh hoạ
        </button>
        {user.avatarUrl && (
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className={cn(BUTTON, "border-library-ink bg-white text-library-ink hover:bg-library-panel")}
          >
            <ImageOff className="size-4" aria-hidden />
            Gỡ ảnh
          </button>
        )}
      </div>
      <p className="text-center text-caption text-library-muted">
        {UPLOAD_RULES.AVATAR.formats} · tối đa {formatBytes(UPLOAD_RULES.AVATAR.maxBytes)} · xem trước và căn ảnh trước khi lưu
      </p>
      {cropping && (
        <AvatarCropDialog
          file={cropping === "illustration" ? null : cropping}
          busy={busy}
          onCancel={() => setCropping(null)}
          onConfirm={(file) => void onFile(file)}
        />
      )}
    </div>
  );
}

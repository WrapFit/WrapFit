"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { useToast } from "@/components/common/Toast";
import { displayName, initialsOf } from "@/components/layout/account";
import { UPLOAD_RULES, formatBytes, showUploadError, uploadAccept, useFileUpload } from "@/features/dashboard";
import type { SafeUser } from "@/types/api";
import { useUpdateProfile } from "../useAccount";

const BUTTON =
  "min-h-[44px] px-4 rounded-full text-xs font-semibold transition-all flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[#122e20]/40 disabled:opacity-60 disabled:cursor-wait";

/**
 * Profile photo with "Đổi ảnh" (upload purpose AVATAR, then `PATCH /users/me { avatarUrl }`) and "Gỡ ảnh"
 * (`avatarUrl: null`). Each change is saved at once; the header follows through the session cache.
 */
export function AvatarEditor({ user }: { user: SafeUser }) {
  const toast = useToast();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useFileUpload("AVATAR");
  const update = useUpdateProfile();
  const [preview, setPreview] = useState<string | null>(null);
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
            className="w-24 h-24 rounded-full object-cover shadow-md ring-4 ring-white"
          />
        ) : (
          <span
            aria-hidden="true"
            className="w-24 h-24 rounded-full bg-[#122e20] text-white flex items-center justify-center font-bold text-3xl shadow-md ring-4 ring-white"
          >
            {initialsOf(name)}
          </span>
        )}
        {busy && (
          <span
            role="status"
            className="absolute inset-0 rounded-full bg-white/60 backdrop-blur-[2px] flex items-center justify-center"
          >
            <span className="h-7 w-7 animate-spin rounded-full border-2 border-stone-200 border-t-[#122e20] motion-reduce:animate-none" />
            <span className="sr-only">{upload.isPending ? "Đang tải ảnh lên…" : "Đang lưu…"}</span>
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <label
          htmlFor={inputId}
          aria-disabled={busy}
          className={`${BUTTON} relative bg-[#122e20] hover:bg-[#1a382b] text-white shadow-sm cursor-pointer focus-within:ring-2 focus-within:ring-[#122e20]/40 ${
            busy ? "pointer-events-none opacity-60" : ""
          }`}
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
            photo_camera
          </span>
          {user.avatarUrl ? "Đổi ảnh" : "Tải ảnh lên"}
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={uploadAccept("AVATAR")}
            disabled={busy}
            onChange={(event) => void onFile(event.target.files?.[0])}
            className="sr-only"
          />
        </label>
        {user.avatarUrl && (
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className={`${BUTTON} bg-white border border-[#e8ded0] text-stone-700 hover:bg-stone-50`}
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
              hide_image
            </span>
            Gỡ ảnh
          </button>
        )}
      </div>
      <p className="text-[11px] text-stone-500 font-['JetBrains_Mono'] text-center">
        {UPLOAD_RULES.AVATAR.formats} · tối đa {formatBytes(UPLOAD_RULES.AVATAR.maxBytes)}
      </p>
    </div>
  );
}

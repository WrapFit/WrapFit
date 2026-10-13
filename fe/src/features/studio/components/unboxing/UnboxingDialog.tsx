"use client";

import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, ExternalLink, QrCode, Trash2 } from "lucide-react";
import {
  ApiError,
  deleteProjectUnboxing,
  getProjectUnboxing,
  saveProjectUnboxing,
  unboxingQrDownloadUrl,
} from "@/api";
import { ErrorState } from "@/components/common/StatusViews";
import { useToast } from "@/components/common/Toast";
import { queryKeys } from "@/hooks/data";
import type { ParticleEffect, UnboxingConfig } from "@/types/api";
import { StudioDialog } from "../dialog/StudioDialog";

const MAX_NAME = 100;
const MAX_NOTE = 2000;

const EFFECTS: { value: ParticleEffect; label: string }[] = [
  { value: "confetti", label: "Pháo giấy" },
  { value: "fireworks", label: "Pháo hoa" },
  { value: "hearts", label: "Trái tim" },
  { value: "petals", label: "Cánh hoa" },
  { value: "snow", label: "Tuyết rơi" },
  { value: "none", label: "Không hiệu ứng" },
];

const FIELD_CLASS =
  "w-full px-3 rounded-xl border border-stone-200 bg-white text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-library-accent";

interface UnboxingDialogProps {
  projectId: string;
  onClose: () => void;
}

/** 3D unboxing page of the gift and its QR code (docs/06 §10): create, edit, download the QR, delete. */
export function UnboxingDialog({ projectId, onClose }: UnboxingDialogProps) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const key = queryKeys.projects.unboxing(projectId);
  const config = useQuery({
    queryKey: key,
    // 404 = no unboxing page yet.
    queryFn: async (): Promise<UnboxingConfig | null> => {
      try {
        return await getProjectUnboxing(projectId);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) return null;
        throw err;
      }
    },
  });

  const [recipientName, setRecipientName] = useState("");
  const [giftNote, setGiftNote] = useState("");
  const [particleEffect, setParticleEffect] = useState<ParticleEffect>("confetti");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Fills the form once the saved page is known.
  const loaded = config.data;
  useEffect(() => {
    if (!loaded) return;
    setRecipientName(loaded.recipientName);
    setGiftNote(loaded.giftNote);
    setParticleEffect(loaded.particleEffect);
  }, [loaded]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const saved = await saveProjectUnboxing(projectId, {
        recipientName: recipientName.trim(),
        giftNote: giftNote.trim(),
        particleEffect,
        // No track picker yet: keep the one already saved.
        audioTrackUrl: loaded?.audioTrackUrl ?? null,
      });
      queryClient.setQueryData(key, saved);
      setEditing(false);
      toast.show({ tone: "success", title: loaded ? "Đã cập nhật trang mở hộp" : "Đã tạo mã QR mở hộp" });
    } catch (err) {
      toast.error(err, "Chưa lưu được trang mở hộp");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await deleteProjectUnboxing(projectId);
      queryClient.setQueryData(key, null);
      setRecipientName("");
      setGiftNote("");
      setParticleEffect("confetti");
      setConfirmDelete(false);
      toast.show({ tone: "success", title: "Đã xoá trang mở hộp", description: "Mã QR đã in không còn mở được." });
    } catch (err) {
      toast.error(err, "Chưa xoá được trang mở hộp");
    } finally {
      setDeleting(false);
    }
  };

  const showForm = config.data === null || editing;
  const valid = recipientName.trim().length > 0 && giftNote.trim().length > 0;

  return (
    <StudioDialog
      title="Mã QR mở hộp 3D"
      subtitle="Người nhận quét mã để mở hộp quà ảo"
      icon={<QrCode className="w-5 h-5" aria-hidden />}
      onClose={onClose}
      widthClass="max-w-lg"
    >
      {config.isPending ? (
        <p className="text-sm text-stone-500">Đang tải…</p>
      ) : config.error ? (
        <ErrorState
          error={config.error}
          title="Chưa tải được trang mở hộp"
          onRetry={() => void config.refetch()}
          retrying={config.isFetching}
        />
      ) : showForm ? (
        <form onSubmit={(event) => void save(event)} className="space-y-4">
          <label className="block text-xs font-semibold text-stone-700 space-y-1">
            <span className="flex justify-between">
              <span>Tên người nhận</span>
              <span className="font-mono font-normal text-stone-400">
                {recipientName.length}/{MAX_NAME}
              </span>
            </span>
            <input
              type="text"
              required
              maxLength={MAX_NAME}
              value={recipientName}
              onChange={(event) => setRecipientName(event.target.value)}
              placeholder="Mẹ yêu"
              className={`${FIELD_CLASS} min-h-[44px]`}
            />
          </label>
          <label className="block text-xs font-semibold text-stone-700 space-y-1">
            <span className="flex justify-between">
              <span>Lời chúc</span>
              <span className="font-mono font-normal text-stone-400">
                {giftNote.length}/{MAX_NOTE}
              </span>
            </span>
            <textarea
              required
              rows={4}
              maxLength={MAX_NOTE}
              value={giftNote}
              onChange={(event) => setGiftNote(event.target.value)}
              placeholder="Chúc mẹ một mùa xuân an lành…"
              className={`${FIELD_CLASS} py-2.5 resize-y`}
            />
          </label>
          <fieldset>
            <legend className="text-xs font-semibold text-stone-700 mb-1.5">Hiệu ứng khi mở hộp</legend>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {EFFECTS.map((effect) => (
                <label
                  key={effect.value}
                  className={`min-h-[44px] px-3 rounded-xl border text-xs font-semibold flex items-center justify-center text-center cursor-pointer transition ${
                    particleEffect === effect.value
                      ? "border-library-accent bg-library-accent-mist/70 text-library-accent"
                      : "border-stone-200 text-stone-600 hover:border-stone-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="particle-effect"
                    value={effect.value}
                    checked={particleEffect === effect.value}
                    onChange={() => setParticleEffect(effect.value)}
                    className="sr-only"
                  />
                  {effect.label}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
            {editing && (
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="min-h-[44px] px-5 rounded-full border border-stone-200 hover:bg-stone-50 text-stone-700 text-sm font-semibold"
              >
                Huỷ
              </button>
            )}
            <button
              type="submit"
              disabled={!valid || saving}
              className="min-h-[44px] px-5 rounded-full bg-brand-forest hover:bg-brand-forest-dark text-white text-sm font-semibold shadow-tactile transition disabled:opacity-50"
            >
              {saving ? "Đang lưu…" : config.data ? "Lưu thay đổi" : "Tạo mã QR"}
            </button>
          </div>
        </form>
      ) : (
        config.data && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="p-3 bg-white rounded-2xl border border-stone-200 shadow-tactile flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={config.data.qrCodeUrl ?? unboxingQrDownloadUrl(projectId, "png")}
                  alt={`Mã QR mở hộp quà cho ${config.data.recipientName}`}
                  className="w-40 h-40 object-contain"
                />
              </div>
              <div className="min-w-0 text-sm text-stone-700 space-y-1.5 text-center sm:text-left">
                <span className="font-landing-heading font-bold text-stone-900 text-base block">Gửi {config.data.recipientName}</span>
                <p className="text-xs text-stone-600 line-clamp-3 whitespace-pre-line">{config.data.giftNote}</p>
                <span className="text-[11px] text-stone-500 font-mono block">
                  {EFFECTS.find((effect) => effect.value === config.data!.particleEffect)?.label} · {config.data.viewsCount} lượt mở
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <a
                href={unboxingQrDownloadUrl(projectId, "png")}
                download
                className="min-h-[44px] px-4 rounded-full bg-brand-forest hover:bg-brand-forest-dark text-white text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <Download className="w-4 h-4" aria-hidden /> QR PNG
              </a>
              <a
                href={unboxingQrDownloadUrl(projectId, "svg")}
                download
                className="min-h-[44px] px-4 rounded-full border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <Download className="w-4 h-4" aria-hidden /> QR SVG (in)
              </a>
            </div>

            <a
              href={config.data.unboxUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-2 p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-700 hover:border-stone-300"
            >
              <span className="font-mono truncate" title={config.data.unboxUrl}>
                {config.data.unboxUrl}
              </span>
              <ExternalLink className="w-4 h-4 flex-shrink-0" aria-hidden />
            </a>

            {confirmDelete ? (
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 space-y-2.5">
                <p className="text-xs text-stone-700">Xoá trang mở hộp? Mã QR đã in sẽ không mở được nữa.</p>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => setConfirmDelete(false)}
                    className="min-h-[36px] px-4 rounded-full border border-stone-200 hover:bg-white text-stone-700 text-xs font-semibold"
                  >
                    Huỷ
                  </button>
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => void remove()}
                    className="min-h-[36px] px-4 rounded-full bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold disabled:opacity-60"
                  >
                    {deleting ? "Đang xoá…" : "Xoá"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="min-h-[44px] px-4 rounded-full text-stone-500 hover:text-stone-800 hover:bg-stone-100 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" aria-hidden /> Xoá
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="min-h-[44px] px-5 rounded-full border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-semibold"
                >
                  Sửa lời chúc
                </button>
              </div>
            )}
          </div>
        )
      )}
    </StudioDialog>
  );
}

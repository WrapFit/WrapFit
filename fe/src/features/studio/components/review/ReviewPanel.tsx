"use client";

import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Link2, MessageSquare, RefreshCw, Trash2, Unlink } from "lucide-react";
import type { DielinePiece } from "@wrapfit/shared";
import { addReviewComment, closeReviewLink, deleteReviewComment, getReview, openReviewLink, resolveReviewComment } from "@/api";
import { useToast } from "@/components/common/Toast";
import { ROUTES } from "@/constants";
import type { ReviewComment, ReviewState } from "@/types/api";
import { cn } from "@/utils/helpers";
import { panelLabel } from "@/features/studio/utils/dieline";
import { ApprovalBadge, CommentItem } from "@/views/review";

const reviewKey = (projectId: string) => ["projects", projectId, "review"];
const SMALL_BUTTON =
  "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full border border-landing-line bg-white px-3 text-xs font-semibold text-landing-ink hover:border-landing-ink disabled:opacity-50";

/** The review state of a design, kept fresh while the studio is open (reviewers comment from elsewhere). */
export function useReview(projectId: string | null) {
  return useQuery({
    queryKey: reviewKey(projectId ?? "none"),
    queryFn: () => getReview(projectId!),
    enabled: !!projectId,
    refetchInterval: 60_000,
  });
}

/**
 * The review link of a design (docs/23 S23): create, copy, replace or turn off the secret link a customer or a print
 * shop opens to comment and approve for print. Used by the share dialog and the review panel.
 */
export function ReviewLinkSection({ projectId }: { projectId: string }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const review = useReview(projectId);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);
  const update = (state: ReviewState) => queryClient.setQueryData(reviewKey(projectId), state);
  const open = useMutation({ mutationFn: () => openReviewLink(projectId), onSuccess: update, onError: (e) => toast.error(e, "Chưa tạo được link") });
  const close = useMutation({ mutationFn: () => closeReviewLink(projectId), onSuccess: update, onError: (e) => toast.error(e, "Chưa tắt được link") });
  const token = review.data?.token ?? null;
  const link = token ? (typeof window === "undefined" ? ROUTES.review(token) : `${window.location.origin}${ROUTES.review(token)}`) : null;

  return (
    <div className="space-y-2">
      <p className="text-sm leading-6 text-landing-muted">
        Gửi link cho khách hoặc xưởng in: họ xem hộp 3D, góp ý theo từng mặt và bấm <strong className="text-landing-ink">Duyệt in</strong>, không cần tài khoản. Thiết kế vẫn
        riêng tư.
      </p>
      {link ? (
        <>
          <div className="flex items-center gap-2 rounded-xl border border-landing-line bg-landing-canvas px-3 py-2">
            <Link2 className="size-4 shrink-0 text-landing-muted" aria-hidden />
            <input readOnly value={link} aria-label="Link duyệt mẫu" className="min-w-0 flex-1 bg-transparent text-xs text-landing-ink outline-none" onFocus={(e) => e.target.select()} />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={SMALL_BUTTON}
              onClick={() => {
                void navigator.clipboard?.writeText(link).then(() => setCopied(true));
              }}
            >
              {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
              {copied ? "Đã chép" : "Chép link"}
            </button>
            <button type="button" className={SMALL_BUTTON} disabled={open.isPending} onClick={() => open.mutate()} title="Link cũ sẽ không mở được nữa">
              <RefreshCw className="size-3.5" aria-hidden />
              Đổi link mới
            </button>
            <button type="button" className={SMALL_BUTTON} disabled={close.isPending} onClick={() => close.mutate()}>
              <Unlink className="size-3.5" aria-hidden />
              Tắt link
            </button>
          </div>
        </>
      ) : (
        <button type="button" className={SMALL_BUTTON} disabled={open.isPending || review.isLoading} onClick={() => open.mutate()}>
          <Link2 className="size-3.5" aria-hidden />
          {open.isPending ? "Đang tạo…" : "Tạo link duyệt mẫu"}
        </button>
      )}
    </div>
  );
}

/**
 * "Duyệt mẫu" in step 6 (docs/23 S23): whether the design is approved for print, the link, and the comments of the
 * reviewers, which the owner resolves, deletes or answers.
 */
export function ReviewPanel({ projectId, pieces }: { projectId: string; pieces: DielinePiece[] }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const review = useReview(projectId);
  const [reply, setReply] = useState("");
  const key = reviewKey(projectId);
  const patchComments = (change: (comments: ReviewComment[]) => ReviewComment[]) =>
    queryClient.setQueryData<ReviewState>(key, (old) => (old ? { ...old, comments: change(old.comments) } : old));
  const resolve = useMutation({
    mutationFn: ({ id, resolved }: { id: string; resolved: boolean }) => resolveReviewComment(projectId, id, resolved),
    onSuccess: (c) => patchComments((all) => all.map((x) => (x.id === c.id ? c : x))),
    onError: (e) => toast.error(e, "Chưa cập nhật được góp ý"),
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteReviewComment(projectId, id),
    onSuccess: (_, id) => patchComments((all) => all.filter((x) => x.id !== id)),
    onError: (e) => toast.error(e, "Chưa xóa được góp ý"),
  });
  const add = useMutation({
    mutationFn: () => addReviewComment(projectId, { body: reply.trim() }),
    onSuccess: (c) => {
      setReply("");
      patchComments((all) => [...all, c]);
    },
    onError: (e) => toast.error(e, "Chưa gửi được"),
  });
  const faceName = (id: string | null) => (id ? panelLabel(pieces.flatMap((p) => p.geometry.panels).find((p) => p.id === id)?.name ?? id) : null);
  const comments = review.data?.comments ?? [];
  // Feedback still open: the reviewers' comments not resolved yet (the owner's replies are not to-dos).
  const waiting = comments.filter((c) => !c.resolved && !c.byOwner).length;

  return (
    <section aria-labelledby="review-panel-title" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="review-panel-title" className="flex items-center gap-2 font-landing-heading text-base font-bold text-landing-ink">
          <MessageSquare className="size-4 text-fpt-orange" aria-hidden />
          Duyệt mẫu
        </h3>
        {review.data && <ApprovalBadge approval={review.data.approval} />}
      </div>
      <ReviewLinkSection projectId={projectId} />
      {comments.length > 0 && (
        <>
          <p className="text-xs font-semibold text-landing-ink">
            Góp ý · {waiting ? `${waiting} chưa xử lý` : "đã xử lý hết"}
          </p>
          <ol className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {comments.map((c) => (
              <CommentItem
                key={c.id}
                comment={c}
                face={faceName(c.panelId)}
                actions={
                  <div className="mt-2 flex gap-2">
                    <button type="button" className={SMALL_BUTTON} onClick={() => resolve.mutate({ id: c.id, resolved: !c.resolved })}>
                      <Check className="size-3.5" aria-hidden />
                      {c.resolved ? "Mở lại" : "Đã xử lý"}
                    </button>
                    <button type="button" className={cn(SMALL_BUTTON, "text-danger-fg")} aria-label="Xóa góp ý" onClick={() => remove.mutate(c.id)}>
                      <Trash2 className="size-3.5" aria-hidden />
                    </button>
                  </div>
                }
              />
            ))}
          </ol>
        </>
      )}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (reply.trim()) add.mutate();
        }}
      >
        <input
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          maxLength={1000}
          placeholder="Trả lời người duyệt…"
          aria-label="Trả lời người duyệt"
          className="min-w-0 flex-1 rounded-xl border border-landing-line bg-white px-3 py-2 text-sm text-landing-ink focus:border-fpt-orange focus:outline-none"
        />
        <button type="submit" className={SMALL_BUTTON} disabled={!reply.trim() || add.isPending}>
          Gửi
        </button>
      </form>
    </section>
  );
}

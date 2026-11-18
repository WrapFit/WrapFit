"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock3, MessageSquare, PenLine, ShieldCheck } from "lucide-react";
import type { BoxStructureType } from "@wrapfit/shared";
import { addGuestReviewComment, approveReview, getPublicReview } from "@/api";
import { landingFontVariables } from "@/assets/fonts/landing";
import { EmptyState, PageLoader } from "@/components/common/StatusViews";
import { useToast } from "@/components/common/Toast";
import { BoxStage3D } from "@/features/showcase";
import { dielinePiecesOf } from "@/features/studio/utils/dieline";
import { isApiError } from "@/services/api";
import type { PublicReview, ReviewApproval, ReviewComment } from "@/types/api";
import { cn } from "@/utils/helpers";

const NAME_KEY = "wf-reviewer-name";
const FIELD =
  "w-full rounded-xl border border-landing-line bg-white px-3 py-2.5 text-sm text-landing-ink focus:border-fpt-orange focus:outline-none focus-visible:ring-[3px] focus-visible:ring-focus/40";

const when = (iso: string) =>
  new Date(iso).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" });

/** "Đã duyệt in", "đã sửa sau khi duyệt" or "chờ duyệt", from the approval of the review. */
export function ApprovalBadge({ approval, className }: { approval: ReviewApproval | null; className?: string }) {
  if (approval?.current) {
    return (
      <span className={cn("inline-flex items-center gap-1.5 rounded-full bg-success-bg px-3 py-1 text-xs font-semibold text-success-fg", className)}>
        <ShieldCheck className="size-3.5" aria-hidden />
        Đã duyệt in · {approval.approvedBy}
      </span>
    );
  }
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full bg-warning-bg px-3 py-1 text-xs font-semibold text-warning-fg", className)}>
      <Clock3 className="size-3.5" aria-hidden />
      {approval ? "Đã sửa sau khi duyệt, cần duyệt lại" : "Chờ duyệt"}
    </span>
  );
}

/**
 * The review page of a design (docs/23 S23): the box in 3D as it was last saved, the comments, a form to add one
 * (optionally about one face), and "Duyệt in" for the version shown. No account: the reviewer types a name.
 */
export default function ReviewView({ token }: { token: string }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const key = ["review", token];
  const review = useQuery({ queryKey: key, queryFn: () => getPublicReview(token), retry: (count, error) => !(isApiError(error) && error.status === 404) && count < 2 });
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [panelId, setPanelId] = useState("");
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    try {
      setName(window.localStorage.getItem(NAME_KEY) ?? "");
    } catch {
      // private mode: the name is typed each time
    }
  }, []);
  const rememberName = (value: string) => {
    try {
      window.localStorage.setItem(NAME_KEY, value.trim());
    } catch {
      // ignore
    }
  };

  const data = review.data;
  const panels = useMemo(() => {
    if (!data) return [];
    try {
      return dielinePiecesOf(data.structure, data.dimensions, data.formulaVersion).flatMap((piece) => piece.geometry.panels);
    } catch {
      return [];
    }
  }, [data]);
  const panelName = (id: string | null) => (id ? (panels.find((p) => p.id === id)?.name ?? id) : null);

  const comment = useMutation({
    mutationFn: () => addGuestReviewComment(token, { authorName: name.trim(), body: body.trim(), ...(panelId ? { panelId } : {}) }),
    onSuccess: (added) => {
      rememberName(name);
      setBody("");
      queryClient.setQueryData<PublicReview>(key, (old) => (old ? { ...old, comments: [...old.comments, added] } : old));
      toast.show({ tone: "success", title: "Đã gửi góp ý", description: "Người thiết kế sẽ thấy góp ý của bạn trong studio." });
    },
    onError: (error) => toast.error(error, "Chưa gửi được góp ý"),
  });

  const approve = useMutation({
    mutationFn: () => approveReview(token, { name: name.trim(), version: data!.version }),
    onSuccess: (approval) => {
      rememberName(name);
      setChecked(false);
      queryClient.setQueryData<PublicReview>(key, (old) => (old ? { ...old, approval } : old));
      toast.show({ tone: "success", title: "Đã duyệt in", description: "Người thiết kế có thể gửi file in cho xưởng." });
    },
    onError: (error) => {
      toast.error(error, "Chưa duyệt được");
      if (isApiError(error) && error.status === 409) void review.refetch();
    },
  });

  if (review.isLoading) return <PageLoader label="Đang mở mẫu thiết kế…" />;
  if (!data) {
    return (
      <main className={cn(landingFontVariables, "flex min-h-screen items-center justify-center bg-landing-canvas p-6")}>
        <EmptyState title="Link duyệt mẫu không còn hiệu lực" description="Người thiết kế đã tắt hoặc đổi link này. Hãy xin họ link mới." />
      </main>
    );
  }

  const open_ = data.comments.filter((c) => !c.resolved && !c.byOwner);
  const nameOk = name.trim().length > 0 && name.trim().length <= 60;

  return (
    <main className={cn(landingFontVariables, "min-h-screen bg-landing-canvas")}>
      <header className="border-b border-landing-line bg-white">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-fpt-orange-ink">WrapFit · Duyệt mẫu</p>
            <h1 className="truncate font-landing-heading text-2xl font-bold text-landing-ink">{data.title}</h1>
            <p className="text-sm text-landing-muted">
              {data.dimensions.length} × {data.dimensions.width} × {data.dimensions.height} mm · phiên bản {data.version}
            </p>
          </div>
          <ApprovalBadge approval={data.approval} />
        </div>
      </header>

      <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <section aria-label="Mẫu hộp 3D" className="relative h-[440px] overflow-hidden rounded-3xl bg-white sm:h-[560px]">
          <BoxStage3D
            structure={data.structure as BoxStructureType}
            dimensions={data.dimensions}
            materialSpec={data.materialSpec}
            canvasState={data.canvasState}
            title={data.title}
            environment="studio"
            frameless
            className="h-full"
          />
        </section>

        <div className="space-y-5">
          <section aria-labelledby="approve-title" className="space-y-3 rounded-3xl bg-white p-5">
            <h2 id="approve-title" className="flex items-center gap-2 font-landing-heading text-base font-bold text-landing-ink">
              <CheckCircle2 className="size-4 text-fpt-orange" aria-hidden />
              Duyệt in
            </h2>
            {data.approval?.current ? (
              <p className="text-sm leading-6 text-landing-muted">
                {data.approval.approvedBy} đã duyệt phiên bản này lúc {when(data.approval.approvedAt)}. Nếu cần sửa thêm, hãy để lại góp ý bên dưới.
              </p>
            ) : (
              <>
                <p className="text-sm leading-6 text-landing-muted">
                  {data.approval
                    ? `Bản ${data.approval.approvedBy} duyệt (phiên bản ${data.approval.approvedVersion}) đã được sửa. Hãy xem lại bản mới rồi duyệt lại.`
                    : "Xem kỹ chữ, màu, logo trên từng mặt hộp. Khi đồng ý, bấm duyệt để người thiết kế gửi file in."}
                </p>
                <label className="block space-y-1.5">
                  <span className="text-xs font-semibold text-landing-ink">Tên của bạn</span>
                  <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Ví dụ: Chị Hoa, Xưởng in Minh Phát" className={FIELD} />
                </label>
                <label className="flex items-start gap-2 text-sm text-landing-ink">
                  <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-1 size-4 accent-fpt-orange" />
                  Tôi đã kiểm tra nội dung, màu sắc và kích thước của mẫu này.
                </label>
                <button
                  type="button"
                  disabled={!nameOk || !checked || approve.isPending}
                  onClick={() => approve.mutate()}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-fpt-orange text-sm font-semibold text-white transition-colors hover:bg-fpt-orange-dark disabled:opacity-50"
                >
                  <ShieldCheck className="size-4" aria-hidden />
                  {approve.isPending ? "Đang duyệt…" : `Duyệt in phiên bản ${data.version}`}
                </button>
              </>
            )}
          </section>

          <section aria-labelledby="comments-title" className="space-y-3 rounded-3xl bg-white p-5">
            <h2 id="comments-title" className="flex items-center gap-2 font-landing-heading text-base font-bold text-landing-ink">
              <MessageSquare className="size-4 text-fpt-orange" aria-hidden />
              Góp ý <span className="text-sm font-normal text-landing-muted">· {open_.length} chưa xử lý</span>
            </h2>
            <ol className="max-h-80 space-y-2 overflow-y-auto pr-1">
              {data.comments.length === 0 && <li className="text-sm text-landing-muted">Chưa có góp ý nào.</li>}
              {data.comments.map((c) => (
                <CommentItem key={c.id} comment={c} face={panelName(c.panelId)} />
              ))}
            </ol>
            <form
              className="space-y-2 border-t border-landing-line pt-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (nameOk && body.trim()) comment.mutate();
              }}
            >
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Tên của bạn" aria-label="Tên của bạn" className={FIELD} />
              <select value={panelId} onChange={(e) => setPanelId(e.target.value)} aria-label="Góp ý cho mặt nào" className={FIELD}>
                <option value="">Cả hộp</option>
                {panels.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={1000} rows={3} placeholder="Ví dụ: logo to hơn một chút, đổi chữ thành màu đỏ…" aria-label="Nội dung góp ý" className={FIELD} />
              <button
                type="submit"
                disabled={!nameOk || !body.trim() || comment.isPending}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-landing-line bg-white text-sm font-semibold text-landing-ink hover:border-landing-ink disabled:opacity-50"
              >
                <PenLine className="size-4" aria-hidden />
                {comment.isPending ? "Đang gửi…" : "Gửi góp ý"}
              </button>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}

/** One comment: author, face, text; resolved ones are faded. */
export function CommentItem({ comment, face, actions }: { comment: ReviewComment; face: string | null; actions?: React.ReactNode }) {
  return (
    <li className={cn("rounded-2xl border border-landing-line p-3 text-sm", comment.resolved && "opacity-60")}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-landing-muted">
        <span className="font-semibold text-landing-ink">{comment.authorName}</span>
        {comment.byOwner && <span className="rounded-full bg-orange-50 px-1.5 text-fpt-orange-ink">Người thiết kế</span>}
        {face && <span>· {face}</span>}
        <span>· {when(comment.createdAt)}</span>
        {comment.resolved && <span className="font-semibold text-success-fg">· Đã xử lý</span>}
      </div>
      <p className="mt-1 whitespace-pre-line leading-6 text-landing-ink">{comment.body}</p>
      {actions}
    </li>
  );
}

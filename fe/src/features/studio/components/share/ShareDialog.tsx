"use client";

import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, ExternalLink, Globe2, Link2, Lock, Share2 } from "lucide-react";
import { changeProjectVisibility, getProject } from "@/api";
import { useToast } from "@/components/common/Toast";
import { ROUTES } from "@/constants";
import { INDUSTRIES, INDUSTRY_LABELS, OCCASIONS, OCCASION_LABELS } from "@/features/templates/labels";
import { queryKeys } from "@/hooks/data";
import type { Industry, Occasion, ProjectDetail, ProjectVisibility, UpdateProjectRequest } from "@/types/api";
import { StudioDialog } from "../dialog/StudioDialog";

/** Score a public design needs to be listed in the community section of the template hub (docs/06 §8). */
const COMMUNITY_MIN_SCORE = 90;

const VISIBILITIES: { value: ProjectVisibility; title: string; hint: string; icon: typeof Lock }[] = [
  { value: "PRIVATE", title: "Riêng tư", hint: "Chỉ bạn xem được.", icon: Lock },
  { value: "UNLISTED", title: "Có link", hint: "Ai có link đều xem được; không hiện trên tìm kiếm.", icon: Link2 },
  { value: "PUBLIC", title: "Công khai", hint: "Ai cũng xem được; có thể lên thư viện cộng đồng.", icon: Globe2 },
];

const SELECT_CLASS =
  "w-full min-h-[44px] px-3 rounded-xl border border-landing-line bg-white text-sm text-landing-ink focus:outline-none focus:border-landing-green";

interface ShareDialogProps {
  /** The project as the editor loaded it; the dialog reads newer values from the cache. */
  project: ProjectDetail;
  /** FitCheck score of the saved design. */
  score: number | null;
  /** Saves occasion / industry in the save queue (they change the project version). */
  patch: (body: Omit<UpdateProjectRequest, "version">) => Promise<ProjectDetail>;
  onClose: () => void;
}

/** Privacy, remix permission, the public link and the community listing of a project (docs/06 §8). */
export function ShareDialog({ project, score, patch, onClose }: ShareDialogProps) {
  const toast = useToast();
  const queryClient = useQueryClient();
  // Kept up to date by every save of the editor (useProjectSync writes the detail query).
  const { data: current } = useQuery({
    queryKey: queryKeys.projects.detail(project.id),
    queryFn: () => getProject(project.id),
    initialData: project,
    staleTime: Infinity,
  });
  const [saving, setSaving] = useState<"visibility" | "fork" | "community" | null>(null);
  const [copied, setCopied] = useState(false);
  const [occasion, setOccasion] = useState<Occasion | "">(current.occasion ?? "");
  const [industry, setIndustry] = useState<Industry | "">(current.industry ?? "");

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const link =
    typeof window === "undefined"
      ? ROUTES.publicProject(encodeURIComponent(current.slug))
      : new URL(ROUTES.publicProject(encodeURIComponent(current.slug)), window.location.origin).href;

  const changeVisibility = async (change: { visibility?: ProjectVisibility; allowFork?: boolean }) => {
    setSaving(change.visibility ? "visibility" : "fork");
    try {
      const saved = await changeProjectVisibility(project.id, change);
      queryClient.setQueryData<ProjectDetail>(queryKeys.projects.detail(project.id), (old) =>
        old ? { ...old, visibility: saved.visibility, allowFork: saved.allowFork } : saved
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.lists() });
    } catch (err) {
      toast.error(err, "Chưa đổi được quyền chia sẻ");
    } finally {
      setSaving(null);
    }
  };

  const saveCommunity = async () => {
    setSaving("community");
    try {
      await patch({ occasion: occasion || null, industry: industry || null });
      toast.show({ tone: "success", title: "Đã lưu chủ đề cho thư viện cộng đồng" });
    } catch (err) {
      toast.error(err, "Chưa lưu được chủ đề");
    } finally {
      setSaving(null);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      toast.show({ tone: "info", title: "Không sao chép tự động được", description: link });
    }
  };

  const shared = current.visibility !== "PRIVATE";
  const communityChanged = (occasion || null) !== current.occasion || (industry || null) !== current.industry;

  return (
    <StudioDialog
      title="Chia sẻ thiết kế"
      subtitle={`/p/${current.slug}`}
      icon={<Share2 className="w-5 h-5" aria-hidden />}
      onClose={onClose}
      widthClass="max-w-lg"
    >
      <fieldset className="space-y-2" disabled={saving !== null}>
        <legend className="font-landing-heading text-base font-bold text-landing-ink mb-2">Ai xem được</legend>
        {VISIBILITIES.map((option) => {
          const Icon = option.icon;
          const active = current.visibility === option.value;
          return (
            <label
              key={option.value}
              className={`flex items-center gap-3 p-3 min-h-[56px] rounded-3xl border cursor-pointer transition ${
                active ? "border-landing-green bg-landing-lime-mist/60" : "border-landing-line hover:border-landing-ink/30"
              }`}
            >
              <input
                type="radio"
                name="visibility"
                value={option.value}
                checked={active}
                onChange={() => void changeVisibility({ visibility: option.value })}
                className="sr-only"
              />
              <span
                className={`w-9 h-9 flex-shrink-0 rounded-xl flex items-center justify-center ${
                  active ? "bg-landing-green text-white" : "bg-landing-canvas text-landing-muted"
                }`}
              >
                <Icon className="w-4 h-4" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="text-sm font-semibold text-landing-ink block">{option.title}</span>
                <span className="text-xs text-landing-muted block">{option.hint}</span>
              </span>
            </label>
          );
        })}
      </fieldset>

      {shared && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <label htmlFor="share-link" className="sr-only">
              Link chia sẻ
            </label>
            <input
              id="share-link"
              readOnly
              value={link}
              onFocus={(event) => event.currentTarget.select()}
              className="flex-1 min-w-0 min-h-[44px] px-3 rounded-xl border border-landing-line bg-landing-canvas font-mono text-xs text-landing-ink"
            />
            <button
              type="button"
              onClick={() => void copy()}
              className="min-h-[44px] px-4 rounded-full bg-landing-green-night hover:bg-black text-white text-xs font-semibold flex items-center gap-1.5 flex-shrink-0"
            >
              {copied ? <Check className="w-4 h-4" aria-hidden /> : <Copy className="w-4 h-4" aria-hidden />}
              {copied ? "Đã chép" : "Sao chép"}
            </button>
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Mở trang chia sẻ trong tab mới"
              title="Mở trang chia sẻ"
              className="w-11 h-11 rounded-full border border-landing-line hover:bg-landing-canvas text-landing-muted flex items-center justify-center flex-shrink-0"
            >
              <ExternalLink className="w-4 h-4" aria-hidden />
            </a>
          </div>

          <label className="flex items-center justify-between gap-3 p-3 min-h-[56px] rounded-3xl border border-landing-line cursor-pointer">
            <span>
              <span className="text-sm font-semibold text-landing-ink block">Cho phép Remix</span>
              <span className="text-xs text-landing-muted block">Người xem tạo được bản sao để chỉnh sửa trong tài khoản của họ.</span>
            </span>
            <input
              type="checkbox"
              checked={current.allowFork}
              disabled={saving !== null}
              onChange={(event) => void changeVisibility({ allowFork: event.target.checked })}
              className="w-5 h-5 flex-shrink-0 accent-vibrant-cobalt"
            />
          </label>
        </div>
      )}

      {current.visibility === "PUBLIC" && (
        <section aria-labelledby="community-title" className="space-y-3 pt-4 border-t border-landing-line">
          <div>
            <h3 id="community-title" className="font-landing-heading text-base font-bold text-landing-ink">
              Thư viện cộng đồng
            </h3>
            <p className="text-xs text-landing-muted mt-1 leading-relaxed">
              Gắn dịp và ngành hàng để thiết kế hiện ở Thư viện mẫu. Chỉ thiết kế có FitCheck từ {COMMUNITY_MIN_SCORE} điểm
              được hiện.
            </p>
          </div>
          {score !== null && score < COMMUNITY_MIN_SCORE && (
            <p role="note" className="text-xs p-3 rounded-xl bg-vibrant-coral/10 border border-vibrant-coral/30 text-landing-ink">
              Điểm FitCheck hiện tại là <strong>{score}</strong>: thiết kế chưa hiện ở thư viện cộng đồng cho tới khi đạt{" "}
              {COMMUNITY_MIN_SCORE}.
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label className="text-xs font-semibold text-landing-ink space-y-1">
              <span className="block">Dịp tặng quà</span>
              <select value={occasion} onChange={(event) => setOccasion(event.target.value as Occasion | "")} className={SELECT_CLASS}>
                <option value="">Chưa chọn</option>
                {OCCASIONS.map((value) => (
                  <option key={value} value={value}>
                    {OCCASION_LABELS[value]}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-landing-ink space-y-1">
              <span className="block">Ngành hàng</span>
              <select value={industry} onChange={(event) => setIndustry(event.target.value as Industry | "")} className={SELECT_CLASS}>
                <option value="">Chưa chọn</option>
                {INDUSTRIES.map((value) => (
                  <option key={value} value={value}>
                    {INDUSTRY_LABELS[value]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              disabled={!communityChanged || saving !== null}
              onClick={() => void saveCommunity()}
              className="min-h-[44px] px-5 rounded-full bg-landing-green hover:bg-landing-green-deep text-white text-sm font-semibold shadow-none transition disabled:opacity-50"
            >
              {saving === "community" ? "Đang lưu…" : "Lưu chủ đề"}
            </button>
          </div>
        </section>
      )}
    </StudioDialog>
  );
}

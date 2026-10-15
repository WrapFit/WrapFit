"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Box, Check, Eye, GitFork, Heart, Info, Link2, Lock, Ruler } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { forkPublicProject, getPublicProject, likePublicProject, unlikePublicProject } from "@/api/public";
import { landingFontVariables } from "@/assets/fonts/landing";
import { GoiMascot, type MascotPose } from "@/components/common/GoiMascot";
import { EmptyState, ErrorState, PageLoader } from "@/components/common/StatusViews";
import { useToast } from "@/components/common/Toast";
import { MainFooter, MainHeader } from "@/components/layout";
import { LibraryCard, outlineButton, primaryButton } from "@/components/library";
import { ROUTES } from "@/constants";
import { loginUrl, useAuth } from "@/features/auth";
import { BoxStage3D, isShareSlug } from "@/features/showcase";
import {
  AuthorAvatar,
  DielineSketch,
  INDUSTRY_LABELS,
  OCCASION_LABELS,
  authorName,
  formatCount,
  formatDimensions,
  formatMaterial,
  useCommunityTemplates,
} from "@/features/templates";
import { queryKeys } from "@/hooks/data";
import { isApiError } from "@/services/api";
import { tactileAudio } from "@/services/audio/tactileAudio";
import type { PublicProject } from "@/types/api";
import { cn } from "@/utils/helpers";

interface PublicProjectViewProps {
  slug: string;
  /** Read by the server for the metadata (`features/showcase/server`); absent when that request failed. */
  initialProject?: PublicProject;
}

// dd/mm/yyyy in Vietnam time: the same text on the server and in the browser (no hydration mismatch).
const dateFormat = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Asia/Ho_Chi_Minh",
});

/**
 * `/p/[slug]`: a shared design in 3D, its author, likes and remix. Readable without an account. Laid out after
 * pacdora.com's mockup viewer: a grey workspace with the box in 3D, a side panel, a fold slider and the actions on top.
 */
export default function PublicProjectView({ slug, initialProject }: PublicProjectViewProps) {
  return (
    <>
      <MainHeader />
      {/* Bottom padding clears the floating mobile navigation bar. */}
      <main className={`${landingFontVariables} min-h-screen bg-white pb-28 pt-[5.5rem] font-landing-heading text-library-text md:pb-0`}>
        <PublicProjectContent slug={slug} initialProject={initialProject} />
      </main>
      <MainFooter compact />
    </>
  );
}

function PublicProjectContent({ slug, initialProject }: PublicProjectViewProps) {
  const auth = useAuth();
  const validSlug = isShareSlug(slug);
  const project = useQuery({
    queryKey: queryKeys.public.project(slug),
    queryFn: () => getPublicProject(slug),
    // The server's read (`count=false`, no cookie) paints the page; this browser read counts the view and tells
    // whether the visitor is the owner or already liked it. It waits for the session check, which refreshes an
    // expired access cookie first (this endpoint treats an expired one as a guest instead of answering 401).
    enabled: validSlug && auth.status !== "loading",
    initialData: initialProject,
    initialDataUpdatedAt: 0,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  if (!validSlug || (isApiError(project.error) && project.error.status === 404 && !project.data)) {
    return <ProjectNotFound />;
  }
  if (project.isError && !project.data) {
    return (
      <div className="px-4 py-16">
        <ErrorState error={project.error} title="Chưa tải được thiết kế" onRetry={() => void project.refetch()} retrying={project.isFetching} />
      </div>
    );
  }
  if (!project.data) return <PageLoader label="Đang mở thiết kế…" />;

  // The like button waits until we know whether this visitor already liked the design (a failed check leaves the
  // server's answer: liking is idempotent anyway).
  const viewerKnown = auth.status === "anonymous" || auth.status === "error" || project.dataUpdatedAt > 0 || project.isError;
  return (
    <>
      <ProjectWorkspace slug={slug} project={project.data} viewerKnown={viewerKnown} />
      <RelatedDesigns project={project.data} />
    </>
  );
}

type PanelTab = "info" | "dieline";

function ProjectWorkspace({ slug, project, viewerKnown }: { slug: string; project: PublicProject; viewerKnown: boolean }) {
  const auth = useAuth();
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [pose, setPose] = useState<MascotPose>("presenting");
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<PanelTab>("info");
  const [fold, setFold] = useState(1);
  const [open, setOpen] = useState(false);
  const timers = useRef<number[]>([]);
  const key = queryKeys.public.project(slug);
  const here = ROUTES.publicProject(slug);

  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);

  /** Gói celebrates for a moment (like, remix). */
  const celebrate = () => {
    setPose("celebration");
    timers.current.push(window.setTimeout(() => setPose("presenting"), 2600));
  };

  const like = useMutation({
    mutationFn: (liked: boolean) => (liked ? likePublicProject(slug) : unlikePublicProject(slug)),
    // Optimistic: the heart reacts at once, and is put back if the API refuses.
    onMutate: async (liked) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<PublicProject>(key);
      if (previous) {
        queryClient.setQueryData<PublicProject>(key, {
          ...previous,
          likesCount: Math.max(0, previous.likesCount + (liked ? 1 : -1)),
          viewer: { ...previous.viewer, liked },
        });
      }
      return { previous };
    },
    onSuccess: (state) => {
      queryClient.setQueryData<PublicProject>(key, (current) =>
        current && { ...current, likesCount: state.likesCount, viewer: { ...current.viewer, liked: state.liked } }
      );
      if (state.liked) celebrate();
    },
    onError: (error, _liked, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
      if (isApiError(error) && error.status === 401) router.push(loginUrl(here));
      else toast.error(error, "Chưa thả tim được");
    },
  });

  const fork = useMutation({
    mutationFn: () => forkPublicProject(slug),
    onSuccess: (copy) => {
      queryClient.setQueryData(queryKeys.projects.detail(copy.id), copy);
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.lists() });
      celebrate();
      tactileAudio.playSuccessChime();
      toast.show({ tone: "success", title: "Đã remix vào dự án của bạn", description: copy.title });
      router.push(ROUTES.editor(copy.id));
    },
    onError: (error) => {
      if (isApiError(error) && error.status === 401) {
        router.push(loginUrl(here));
      } else if (isApiError(error) && error.status === 403) {
        // The author has just turned remixing off: show the page as it is now.
        void queryClient.invalidateQueries({ queryKey: key });
        toast.show({
          tone: "error",
          title: "Không remix được",
          description: "Tác giả không cho phép remix thiết kế này.",
        });
      } else {
        toast.error(error, "Không remix được");
      }
    },
  });

  const requireAccount = () => {
    if (auth.status !== "anonymous") return false;
    router.push(loginUrl(here));
    return true;
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${here}`);
      setCopied(true);
      timers.current.push(window.setTimeout(() => setCopied(false), 2200));
    } catch {
      toast.show({ tone: "error", title: "Không sao chép được", description: "Hãy sao chép địa chỉ trên thanh trình duyệt." });
    }
  };

  const { liked } = project.viewer;
  const toggleLike = () => {
    // One request at a time, so answers cannot arrive out of order.
    if (like.isPending || requireAccount()) return;
    tactileAudio.playSquishyTap();
    like.mutate(!liked);
  };

  return (
    <section aria-labelledby="project-title" className="border-y border-library-line">
      {/* Top bar: where we are, and the actions on the right */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-3 sm:px-5">
        <nav aria-label="Vị trí" className="flex min-w-0 items-center gap-2 text-sm">
          <Link href={ROUTES.templates} className="shrink-0 text-library-ink hover:underline">
            Thư viện mẫu
          </Link>
          <span className="text-library-muted">/</span>
          <span className="truncate text-library-muted" title={project.title}>
            {project.title}
          </span>
        </nav>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            type="button"
            aria-pressed={liked}
            aria-busy={!viewerKnown || like.isPending}
            disabled={!viewerKnown}
            onClick={toggleLike}
            className={cn(outlineButton, liked && "border-dieline-cut text-danger-fg")}
          >
            <Heart className={cn("size-4", liked && "fill-dieline-cut text-dieline-cut")} aria-hidden />
            {liked ? "Đã thích" : "Thả tim"}
            <span className="text-sm text-library-muted">{formatCount(project.likesCount)}</span>
          </button>
          <span className="hidden h-6 w-px bg-library-line sm:block" aria-hidden />
          <button type="button" onClick={() => void copyLink()} className={cn(outlineButton, "w-10 px-0")} aria-label={copied ? "Đã sao chép liên kết" : "Sao chép liên kết"} title="Sao chép liên kết">
            {copied ? <Check className="size-4 text-fpt-orange-ink" aria-hidden /> : <Link2 className="size-4" aria-hidden />}
          </button>
          {project.allowFork && (
            <button
              type="button"
              disabled={fork.isPending || auth.status === "loading"}
              onClick={() => {
                if (requireAccount()) return;
                fork.mutate();
              }}
              className={primaryButton}
            >
              <GitFork className="size-4" aria-hidden />
              {fork.isPending ? "Đang tạo bản remix…" : "Remix thiết kế này"}
            </button>
          )}
        </div>
      </div>
      <span className="sr-only" aria-live="polite">
        {copied ? "Đã sao chép liên kết" : ""}
      </span>

      {/* Workspace: grey surface, 3D stage, side panel, fold toolbar */}
      <div className="relative flex flex-col bg-gradient-to-b from-library-line to-library-canvas lg:h-[calc(100vh-9.5rem)] lg:min-h-[640px] lg:flex-row">
        <div className="relative z-10 flex gap-2 p-4 lg:p-5">
          <Rail tab={tab} onTab={setTab} pose={pose} />
          <aside className="min-w-0 flex-1 rounded-2xl bg-white px-4 py-5 shadow-panel lg:w-[320px] lg:flex-none lg:overflow-y-auto">
            {tab === "info" ? <InfoPanel project={project} /> : <DielinePanel project={project} />}
          </aside>
        </div>

        <div className="relative h-[420px] sm:h-[520px] lg:h-auto lg:flex-1">
          {/* The stage fills its column, whose height the workspace sets on large screens: hence the absolute frame. */}
          <div className="absolute inset-0">
            <BoxStage3D
              structure={project.template.id}
              dimensions={project.dimensions}
              materialSpec={project.materialSpec}
              canvasState={project.canvasState}
              title={project.title}
              open={open}
              foldProgress={fold}
              environment="transparent"
              frameless
              className="h-full"
            />
          </div>

          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 sm:bottom-6">
            <div className="flex h-11 items-center gap-3 rounded-full bg-white px-4 text-xs text-fg-muted shadow-[0_0_4px_rgba(0,0,0,0.1)]">
              <label htmlFor="fold" className="whitespace-nowrap">
                Trải phẳng
              </label>
              <input
                id="fold"
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={fold}
                onChange={(event) => setFold(Number(event.target.value))}
                className="h-1 w-28 cursor-pointer accent-library-ink sm:w-36"
                aria-valuetext={`${Math.round(fold * 100)}% đã gập`}
              />
              <span className="whitespace-nowrap">Gập kín</span>
              <span className="h-5 w-px bg-library-line" aria-hidden />
              <button
                type="button"
                aria-pressed={open}
                onClick={() => setOpen((value) => !value)}
                disabled={fold < 1}
                className="inline-flex items-center gap-1.5 whitespace-nowrap font-medium text-library-ink disabled:opacity-40"
              >
                <Box className="size-4" aria-hidden />
                {open ? "Đóng nắp" : "Mở nắp"}
              </button>
            </div>
            <span className="hidden h-11 items-center gap-1.5 whitespace-nowrap rounded-full bg-white px-4 text-xs text-library-ink shadow-[0_0_4px_rgba(0,0,0,0.1)] md:inline-flex">
              <Eye className="size-4 text-library-muted" aria-hidden />
              {formatCount(project.viewsCount)} lượt xem
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Narrow white column of panel switches, and Gói below it (like Pacdora's AI card). */
function Rail({ tab, onTab, pose }: { tab: PanelTab; onTab(tab: PanelTab): void; pose: MascotPose }) {
  const items: { id: PanelTab; label: string; icon: typeof Info }[] = [
    { id: "info", label: "Chi tiết", icon: Info },
    { id: "dieline", label: "Khuôn bế", icon: Ruler },
  ];
  return (
    <div className="flex w-[70px] shrink-0 flex-col gap-2">
      <div className="flex flex-col rounded-2xl bg-white py-1 shadow-panel" role="tablist" aria-label="Bảng thông tin">
        {items.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => onTab(id)}
            className={cn(
              "flex flex-col items-center gap-1 py-2.5 text-caption transition-colors",
              tab === id ? "text-fpt-orange-ink" : "text-library-ink hover:text-fpt-orange-ink"
            )}
          >
            <Icon className="size-6" strokeWidth={1.75} aria-hidden />
            {label}
          </button>
        ))}
      </div>
      <div className="flex flex-col items-center gap-1 rounded-2xl bg-white py-2 text-caption text-library-ink shadow-panel">
        <GoiMascot pose={pose} size={44} showPhotoBadge={false} label="Gói, trợ lý đóng gói của WrapFit" />
        Gói
      </div>
    </div>
  );
}

function InfoPanel({ project }: { project: PublicProject }) {
  const tags = [
    ...(project.occasion ? [OCCASION_LABELS[project.occasion]] : []),
    ...(project.industry ? [INDUSTRY_LABELS[project.industry]] : []),
    ...project.tags.map((tag) => `#${tag}`),
  ];
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="flex flex-wrap items-center gap-2 text-xs text-library-muted">
          {project.template.name}
          {project.visibility === "UNLISTED" && (
            <span className="inline-flex items-center gap-1 rounded-md bg-library-panel px-1.5 py-0.5">
              <Lock className="size-3" aria-hidden />
              Chỉ ai có liên kết
            </span>
          )}
        </p>
        <h1 id="project-title" className="mt-1 text-xl font-medium leading-snug text-library-ink">
          {project.title}
        </h1>
      </div>

      <div className="flex items-center gap-3 rounded-lg border border-library-line bg-library-panel px-4 py-2.5">
        <AuthorAvatar author={project.author} size="md" />
        <div className="min-w-0">
          <p className="text-xs text-library-muted">Tác giả</p>
          <p className="truncate text-sm text-library-ink">{authorName(project.author)}</p>
        </div>
      </div>

      {project.forkedFrom && (
        <p className="flex items-start gap-1.5 text-sm text-library-sub">
          <GitFork className="mt-0.5 size-4 shrink-0 text-library-muted" aria-hidden />
          <span>
            Remix từ{" "}
            <Link href={ROUTES.publicProject(project.forkedFrom.slug)} className="font-medium text-fpt-orange-ink underline-offset-4 hover:underline">
              {project.forkedFrom.title}
            </Link>{" "}
            của {authorName(project.forkedFrom.author)}
          </span>
        </p>
      )}

      <Row label="Kích thước L × W × H" value={formatDimensions(project.dimensions)} />
      <Row label="Chất liệu" value={formatMaterial(project.materialSpec) || "—"} />

      <dl className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Lượt xem" value={formatCount(project.viewsCount)} />
        <Stat label="Lượt thích" value={formatCount(project.likesCount)} />
        <Stat label="Ngày tạo" value={dateFormat.format(new Date(project.createdAt))} />
      </dl>

      {tags.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Thẻ">
          {tags.map((tag) => (
            <li key={tag} className="rounded-md border border-library-line bg-white px-2 py-1 text-xs text-library-sub">
              {tag}
            </li>
          ))}
        </ul>
      )}

      {project.viewer.isOwner ? (
        <p className="rounded-lg bg-fpt-orange-light px-4 py-3 text-sm text-fpt-orange-ink">
          Đây là thiết kế của bạn.{" "}
          <Link href={ROUTES.projects} className="font-medium underline-offset-4 hover:underline">
            Quản lý trong Dự án
          </Link>
        </p>
      ) : (
        !project.allowFork && <p className="text-xs text-library-muted">Tác giả chưa bật remix cho thiết kế này.</p>
      )}
    </div>
  );
}

function DielinePanel({ project }: { project: PublicProject }) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-medium text-library-ink">Khuôn bế trải phẳng</h2>
      <div className="flex aspect-[4/3] items-center justify-center rounded-xl border border-dashed border-fpt-orange bg-fpt-orange-light p-4">
        <DielineSketch
          structure={project.template.id}
          dimensions={project.dimensions}
          label={`Khuôn bế ${project.template.name} ${formatDimensions(project.dimensions)}`}
          className="max-h-full w-full"
        />
      </div>
      <p className="flex gap-4 text-xs text-library-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-dieline-cut" aria-hidden />
          Nét cắt
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-4 border-t-2 border-dashed border-dieline-crease" aria-hidden />
          Nét gấp
        </span>
      </p>
      <Row label="Cấu trúc" value={project.template.name} />
      <Row label="Kích thước lòng hộp" value={formatDimensions(project.dimensions)} />
      <Row label="Độ dày giấy" value={`t = ${project.dimensions.paperThickness} mm`} />
      <p className="text-xs text-library-muted">
        Mã thiết kế: <span className="underline">{project.slug}</span>
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-library-line bg-library-panel px-4 py-2">
      <p className="text-xs text-library-muted">{label}</p>
      <p className="text-sm text-library-ink">{value}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-library-panel px-1 py-2">
      <dt className="text-caption text-library-muted">{label}</dt>
      <dd className="truncate text-body-sm text-library-ink" title={value}>
        {value}
      </dd>
    </div>
  );
}

/** Other public designs of the same structure (`GET /templates/hub?section=community`). */
function RelatedDesigns({ project }: { project: PublicProject }) {
  const related = useCommunityTemplates({ structure: project.template.id, page: 1, limit: 7 });
  const items = (related.data?.items ?? []).filter((item) => item.slug !== project.slug).slice(0, 6);
  if (!items.length) return null;
  return (
    <section aria-labelledby="related-title" className="mx-auto w-full max-w-[1440px] px-4 py-14 sm:px-6 lg:px-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <h2 id="related-title" className="text-2xl font-medium text-library-ink">
          Thiết kế {project.template.name.toLowerCase()} khác
        </h2>
        <Link href={`${ROUTES.templates}?tab=community&structure=${project.template.id}`} className="text-sm text-library-ink underline-offset-4 hover:underline">
          Xem tất cả
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-x-6 gap-y-7 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <LibraryCard
            key={item.slug}
            href={ROUTES.publicProject(item.slug)}
            title={item.title}
            structure={item.structure.id}
            dimensions={item.dimensions}
            materialSpec={item.materialSpec}
            thumbnailUrl={item.thumbnailUrl}
            tags={[...(item.fitcheckScore !== null ? [`FitCheck ${item.fitcheckScore}`] : []), `♥ ${formatCount(item.likesCount)}`]}
          />
        ))}
      </div>
    </section>
  );
}

/** Unknown, private or trashed design (the API answers 404 in every case, also to its owner). */
function ProjectNotFound() {
  return (
    <div className="px-4 py-16">
      <EmptyState
        title="Không tìm thấy thiết kế"
        description="Liên kết sai, hoặc tác giả đã chuyển thiết kế về riêng tư hay xoá nó."
        action={
          <Link href={ROUTES.templates} className={primaryButton}>
            Xem thư viện mẫu
          </Link>
        }
      />
    </div>
  );
}

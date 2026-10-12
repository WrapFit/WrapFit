"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronRight, Eye, GitFork, Heart, Link2, Lock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { forkPublicProject, getPublicProject, likePublicProject, unlikePublicProject } from "@/api/public";
import { GoiMascot, type MascotPose } from "@/components/common/GoiMascot";
import { EmptyState, ErrorState, PageLoader, PRIMARY_BUTTON } from "@/components/common/StatusViews";
import { useToast } from "@/components/common/Toast";
import { MainFooter, MainHeader } from "@/components/layout";
import { ROUTES } from "@/constants";
import { loginUrl, useAuth } from "@/features/auth";
import { BoxStage3D, isShareSlug } from "@/features/showcase";
import {
  AuthorAvatar,
  authorName,
  formatCount,
  formatDimensions,
  formatMaterial,
  TagChips,
} from "@/features/templates";
import { queryKeys } from "@/hooks/data";
import { isApiError } from "@/services/api";
import { tactileAudio } from "@/services/audio/tactileAudio";
import type { PublicProject } from "@/types/api";

interface PublicProjectViewProps {
  slug: string;
  /** Read by the server for the metadata (`features/showcase/server`); absent when that request failed. */
  initialProject?: PublicProject;
}

const SECONDARY_BUTTON =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-stone-200 bg-white px-5 text-sm font-semibold text-stone-800 transition hover:border-brand-forest/40 active:scale-95 disabled:cursor-wait disabled:opacity-60";

// dd/mm/yyyy in Vietnam time: the same text on the server and in the browser (no hydration mismatch).
const dateFormat = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Asia/Ho_Chi_Minh",
});

/** `/p/[slug]`: a shared design in 3D, its author, likes and remix. Readable without an account. */
export default function PublicProjectView({ slug, initialProject }: PublicProjectViewProps) {
  return (
    <>
      <MainHeader />
      {/* Bottom padding clears the floating mobile navigation bar. */}
      <main className="min-h-screen bg-paper-ivory pb-28 pt-24 font-sans text-stone-800 md:pb-16">
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
        <ErrorState
          error={project.error}
          title="Chưa tải được thiết kế"
          onRetry={() => void project.refetch()}
          retrying={project.isFetching}
        />
      </div>
    );
  }
  if (!project.data) return <PageLoader label="Đang mở thiết kế…" />;

  // The like button waits until we know whether this visitor already liked the design (a failed check leaves the
  // server's answer: liking is idempotent anyway).
  const viewerKnown =
    auth.status === "anonymous" || auth.status === "error" || project.dataUpdatedAt > 0 || project.isError;
  return <ProjectDetail slug={slug} project={project.data} viewerKnown={viewerKnown} />;
}

function ProjectDetail({ slug, project, viewerKnown }: { slug: string; project: PublicProject; viewerKnown: boolean }) {
  const auth = useAuth();
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [pose, setPose] = useState<MascotPose>("presenting");
  const [copied, setCopied] = useState(false);
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
        current && { ...current, likesCount: state.likesCount, viewer: { ...current.viewer, liked: state.liked } },
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
          requestId: error.requestId,
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

  const { liked, isOwner } = project.viewer;

  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
      <nav aria-label="Vị trí" className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-stone-500">
        <Link href={ROUTES.templates} className="inline-flex min-h-[44px] items-center hover:text-brand-forest">
          Thư viện mẫu
        </Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        <span className="min-w-0 truncate text-stone-700">{project.title}</span>
      </nav>

      <div className="mt-2 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-start">
        <BoxStage3D
          structure={project.template.id}
          dimensions={project.dimensions}
          materialSpec={project.materialSpec}
          canvasState={project.canvasState}
          title={project.title}
          className="h-[460px] sm:h-[560px]"
        />

        <section
          aria-labelledby="project-title"
          className="relative rounded-3xl border border-stone-200/80 bg-white/85 p-6 shadow-tactile backdrop-blur-md sm:p-8 lg:sticky lg:top-28"
        >
          <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
            <GoiMascot pose={pose} size={60} showPhotoBadge={false} label="Gói, trợ lý đóng gói của WrapFit" />
          </div>

          <p className="flex flex-wrap items-center gap-2 pr-16 font-mono text-[11px] font-semibold uppercase tracking-wider text-stone-500">
            <span>{project.template.name}</span>
            {project.visibility === "UNLISTED" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 normal-case tracking-normal text-stone-600">
                <Lock className="h-3 w-3" aria-hidden />
                Chỉ ai có liên kết
              </span>
            )}
          </p>
          <h1
            id="project-title"
            className="mt-2 pr-16 font-serif text-[30px] leading-[1.1] tracking-tight text-stone-900 sm:text-[38px]"
          >
            {project.title}
          </h1>

          <div className="mt-4 flex items-center gap-3">
            <AuthorAvatar author={project.author} size="md" />
            <div className="min-w-0 text-sm">
              <p className="truncate font-semibold text-stone-900">{authorName(project.author)}</p>
              {project.author.shopName && project.author.fullName && (
                <p className="truncate text-stone-500">{project.author.fullName}</p>
              )}
            </div>
          </div>

          {project.forkedFrom && (
            <p className="mt-3 flex items-start gap-1.5 text-sm text-stone-600">
              <GitFork className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" aria-hidden />
              <span>
                Remix từ{" "}
                <Link
                  href={ROUTES.publicProject(project.forkedFrom.slug)}
                  className="font-semibold text-brand-forest underline-offset-4 hover:underline"
                >
                  {project.forkedFrom.title}
                </Link>{" "}
                của {authorName(project.forkedFrom.author)}
              </span>
            </p>
          )}

          <dl className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-xs text-stone-500">
            <div className="flex items-center gap-1.5">
              <dt className="sr-only">Lượt xem</dt>
              <Eye className="h-4 w-4" aria-hidden />
              <dd>{formatCount(project.viewsCount)} lượt xem</dd>
            </div>
            <div className="flex items-center gap-1.5">
              <dt className="sr-only">Lượt thích</dt>
              <Heart className="h-4 w-4 text-vibrant-coral" aria-hidden />
              <dd>{formatCount(project.likesCount)} lượt thích</dd>
            </div>
            <div>
              <dt className="sr-only">Ngày tạo</dt>
              <dd>
                <time dateTime={project.createdAt}>{dateFormat.format(new Date(project.createdAt))}</time>
              </dd>
            </div>
          </dl>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              aria-pressed={liked}
              aria-busy={!viewerKnown || like.isPending}
              disabled={!viewerKnown}
              onClick={() => {
                // One request at a time, so answers cannot arrive out of order.
                if (like.isPending || requireAccount()) return;
                tactileAudio.playSquishyTap();
                like.mutate(!liked);
              }}
              className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border px-5 text-sm font-semibold transition active:scale-95 disabled:cursor-wait disabled:opacity-60 ${
                liked
                  ? "border-vibrant-coral/50 bg-vibrant-coral/10 text-vibrant-coral-dark"
                  : "border-stone-200 bg-white text-stone-800 hover:border-vibrant-coral/50"
              }`}
            >
              <Heart className={`h-4 w-4 ${liked ? "fill-vibrant-coral text-vibrant-coral" : ""}`} aria-hidden />
              {liked ? "Đã thích" : "Thả tim"}
              <span className="font-mono text-xs opacity-70">{formatCount(project.likesCount)}</span>
            </button>

            {project.allowFork && (
              <button
                type="button"
                disabled={fork.isPending || auth.status === "loading"}
                onClick={() => {
                  if (requireAccount()) return;
                  fork.mutate();
                }}
                className={`${PRIMARY_BUTTON} disabled:cursor-wait disabled:opacity-60`}
              >
                <GitFork className="h-4 w-4" aria-hidden />
                {fork.isPending ? "Đang tạo bản remix…" : "Remix thiết kế này"}
              </button>
            )}

            <button type="button" onClick={() => void copyLink()} className={SECONDARY_BUTTON}>
              {copied ? <Check className="h-4 w-4 text-brand-forest" aria-hidden /> : <Link2 className="h-4 w-4" aria-hidden />}
              <span aria-live="polite">{copied ? "Đã sao chép" : "Sao chép liên kết"}</span>
            </button>
          </div>

          {!project.allowFork && (
            <p className="mt-3 text-xs text-stone-500">Tác giả chưa bật remix cho thiết kế này.</p>
          )}
          {auth.status === "anonymous" && (
            <p className="mt-3 text-xs text-stone-500">
              {project.allowFork
                ? "Đăng nhập để thả tim hoặc remix vào dự án của bạn."
                : "Đăng nhập để thả tim cho thiết kế này."}
            </p>
          )}
          {isOwner && (
            <p className="mt-4 rounded-2xl border border-brand-forest/15 bg-brand-forest/5 px-4 py-3 text-sm text-brand-forest">
              Đây là thiết kế của bạn.{" "}
              <Link href={ROUTES.projects} className="font-semibold underline-offset-4 hover:underline">
                Quản lý trong Dự án
              </Link>
            </p>
          )}

          <dl className="mt-7 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-stone-200/80 pt-6 font-mono text-xs">
            <Spec label="Kích thước L × W × H">{formatDimensions(project.dimensions)}</Spec>
            <Spec label="Độ dày giấy">t = {project.dimensions.paperThickness} mm</Spec>
            <Spec label="Chất liệu" wide>
              {formatMaterial(project.materialSpec) || "—"}
            </Spec>
          </dl>

          <TagChips occasion={project.occasion} industry={project.industry} />
          {project.tags.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Thẻ">
              {project.tags.map((tag) => (
                <li key={tag} className="font-mono text-[11px] text-stone-500">
                  #{tag}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Spec({ label, wide = false, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={wide ? "col-span-2" : undefined}>
      <dt className="text-[10px] uppercase tracking-wider text-stone-500">{label}</dt>
      <dd className="mt-1 text-stone-900">{children}</dd>
    </div>
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
          <Link href={ROUTES.templates} className={PRIMARY_BUTTON}>
            Xem thư viện mẫu
          </Link>
        }
      />
    </div>
  );
}

"use client";

import { ArrowUpRight, Clock3, FolderOpen, PanelRightClose, Plus, Search, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import type { BoxDimensions, BoxStructureType, MaterialType } from "@wrapfit/shared";
import { mediaUp } from "@/assets/styles/tokens";
import { Button, buttonClass, Input, ModalLayer, Select, Skeleton } from "@/components/ui";
import { ROUTES } from "@/constants";
import { isDemoUser, useAuth } from "@/features/auth";
import { ProjectTile } from "@/features/dashboard/components/ProjectCard";
import { formatRelative } from "@/features/dashboard/format";
import { PROJECTS_PAGE_SIZE, useProjectList } from "@/features/dashboard/useProjects";
import { BoxPreview } from "@/features/templates/components/BoxPreview";
import { useInView } from "@/hooks/dom";
import { useDebouncedValue } from "@/hooks/shared";
import type { BoxStructure, ProjectListQuery, ProjectSummary } from "@/types/api";
import { cn } from "@/utils/helpers";
import { BOX_STRUCTURES } from "../utils/boxStructures";

interface LibraryProps {
  currentId?: string;
  structures?: BoxStructure[];
  draft?: { title: string; structure: BoxStructureType; dimensions: BoxDimensions; material: MaterialType };
  onNavigate(href: string): void;
  busy: boolean;
  overlayOpen: boolean;
  onCloseOverlay(): void;
}

function LoadingTiles() {
  return <div role="status" aria-label="Đang tải dự án" className="col-span-full grid grid-cols-2 gap-3">
    {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="aspect-[3/2] rounded-control" />)}
  </div>;
}

function Retry({ onRetry }: { onRetry(): void }) {
  return <div className="col-span-full space-y-2 text-body-sm">
    <p role="alert">Chưa tải được danh sách dự án.</p>
    <Button variant="secondary" onClick={onRetry}>Thử lại</Button>
  </div>;
}

interface ResultProps {
  query: ProjectListQuery;
  /** False for the demo account given when the API is down: the list falls back to the demo projects. */
  accountOnly: boolean;
  currentId?: string;
  onOpen(project: ProjectSummary): void;
  seen: ReadonlySet<string>;
}

function ResultTiles({ result, query, accountOnly, currentId, onOpen, seen }: ResultProps & { result: ReturnType<typeof useProjectList> }) {
  if (result.isError) return <Retry onRetry={() => void result.refetch()} />;
  if (!result.data) return <LoadingTiles />;
  const { items, meta } = result.data;
  const shown = new Set(seen);
  return <>
    {items.map((project) => {
      if (shown.has(project.id)) return null;
      shown.add(project.id);
      const current = project.id === currentId;
      return <button key={project.id} type="button" disabled={current} aria-current={current ? "page" : undefined}
        title={project.title} aria-label={current ? `Đang mở: ${project.title}` : `Mở ${project.title}`}
        aria-description={project.hasFitcheckErrors ? "FitCheck có lỗi" : undefined} onClick={() => onOpen(project)}
        className={cn("min-w-0 rounded-control p-1 text-left outline-none hover:bg-surface-sunken focus-visible:ring-2 focus-visible:ring-focus", current && "bg-accent-bg ring-2 ring-accent")}>
        <ProjectTile compact project={project} />
        <span className="mt-1.5 block truncate text-label-sm font-semibold">{project.title}</span>
        <time dateTime={project.updatedAt} className="block text-caption text-fg-muted">{formatRelative(project.updatedAt)}</time>
      </button>;
    })}
    {meta.page < meta.totalPages && <NextPage query={{ ...query, page: meta.page + 1 }} accountOnly={accountOnly} currentId={currentId} onOpen={onOpen} seen={shown} />}
  </>;
}

function NextPage(props: ResultProps) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const [requested, setRequested] = useState(false);
  const enabled = inView || requested;
  const result = useProjectList(props.query, { accountOnly: props.accountOnly, enabled });
  return enabled ? <ResultTiles {...props} result={result} /> : (
    <div ref={ref} className="col-span-full text-center">
      <Button variant="ghost" onClick={() => setRequested(true)}>Tải thêm dự án</Button>
    </div>
  );
}

const COLLAPSED_KEY = "wrapfit:studio-projects-collapsed";

export function StudioProjectLibrary({ currentId, structures, draft, onNavigate, overlayOpen, onCloseOverlay, busy }: LibraryProps) {
  const { status, refresh, user } = useAuth();
  // A real account never sees the demo projects, even when its list fails; the stand-in demo account sees them as the
  // dashboard does.
  const accountOnly = !isDemoUser(user);
  const id = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const restoreToggleFocus = useRef(false);
  const [wide, setWide] = useState(() => window.matchMedia(mediaUp("xl")).matches);
  const [side, setSide] = useState(() => window.matchMedia(mediaUp("lg")).matches);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSED_KEY) === "1"; } catch { return false; }
  });
  useEffect(() => {
    const xl = window.matchMedia(mediaUp("xl"));
    const lg = window.matchMedia(mediaUp("lg"));
    const resize = () => { setWide(xl.matches); setSide(lg.matches); };
    xl.addEventListener("change", resize);
    lg.addEventListener("change", resize);
    return () => { xl.removeEventListener("change", resize); lg.removeEventListener("change", resize); };
  }, []);
  useEffect(() => {
    if (wide && overlayOpen) onCloseOverlay();
  }, [wide, overlayOpen, onCloseOverlay]);
  function toggleColumn() {
    restoreToggleFocus.current = true;
    setCollapsed(!collapsed);
    try { localStorage.setItem(COLLAPSED_KEY, collapsed ? "0" : "1"); } catch { /* Keep the choice for this session. */ }
  }
  useEffect(() => {
    if (restoreToggleFocus.current) toggleRef.current?.focus();
    restoreToggleFocus.current = false;
  }, [collapsed]);
  const [search, setSearch] = useState("");
  const [structure, setStructure] = useState<BoxStructureType | "">("");
  const q = useDebouncedValue(search.trim());
  const query: ProjectListQuery = { status: "ACTIVE", sortBy: "updatedAt", order: "desc", limit: PROJECTS_PAGE_SIZE, page: 1, q: q || undefined, templateId: structure || undefined };
  const visible = wide ? !collapsed : overlayOpen;
  const signedIn = status === "authenticated";
  const first = useProjectList(query, { accountOnly, enabled: signedIn && visible });
  function linkTo(href: string) {
    return { href, prefetch: false, onNavigate(event: { preventDefault(): void }) { event.preventDefault(); onNavigate(href); } };
  }
  if (!visible) return wide ? (
    <aside className="shrink-0 border-l border-line bg-surface-raised">
      <Button ref={toggleRef} aria-label="Mở Dự án của tôi" title="Mở Dự án của tôi" aria-expanded={false} size="icon-lg" variant="ghost" onClick={toggleColumn}><FolderOpen /></Button>
    </aside>
  ) : null;

  const content = <>
    <div className="flex shrink-0 items-center gap-2 border-b border-line px-4 py-2">
      <h2 id={id} className="flex-1 font-landing-heading text-title">Dự án của tôi</h2>
      {signedIn && first.data && <span className="text-caption tabular-nums text-fg-muted" aria-label={`${first.data.meta.total} dự án`}>{first.data.meta.total}</span>}
      <Button ref={toggleRef} variant="ghost" size="icon-lg" aria-label={wide ? "Thu gọn thư viện dự án" : "Đóng thư viện dự án"} onClick={wide ? toggleColumn : onCloseOverlay}>
        {wide ? <PanelRightClose /> : <X />}
      </Button>
    </div>
    {signedIn && <div className="shrink-0 space-y-2 border-b border-line p-3">
      <Input type="search" leadingIcon={<Search />} aria-label="Tìm dự án" placeholder="Tìm theo tên hoặc thẻ" value={search} onChange={(event) => setSearch(event.target.value)} />
      <Select aria-label="Lọc theo kiểu hộp" value={structure} onChange={(event) => setStructure(event.target.value as typeof structure)}>
        <option value="">Tất cả kiểu hộp</option>
        {(structures ?? BOX_STRUCTURES.map((box) => ({ id: box.id, name: box.vietnameseName }))).map((box) => <option key={box.id} value={box.id}>{box.name}</option>)}
      </Select>
      <Link {...linkTo(ROUTES.templates)} className={buttonClass({ block: true, variant: "brand", className: "min-h-11" })}><Plus aria-hidden />Dự án mới</Link>
    </div>}
    <div key={JSON.stringify([q, structure])} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
      {draft && <div aria-current="page" className="mb-4 flex items-center gap-3 rounded-control border border-accent bg-accent-bg p-2">
        <BoxPreview structure={draft.structure} dimensions={draft.dimensions} material={draft.material} className="h-12 w-16 shrink-0" />
        <div className="min-w-0"><span className="text-caption font-semibold text-accent">Bản nháp</span><p title={draft.title} className="truncate text-label-sm">{draft.title}</p></div>
      </div>}
      {status === "loading" && <LoadingTiles />}
      {status === "error" && <Retry onRetry={() => void refresh()} />}
      {status === "anonymous" && <Link {...linkTo(`${ROUTES.login}?redirect=${encodeURIComponent(ROUTES.editorDemo)}`)} className={buttonClass({ variant: "secondary", block: true, className: "min-h-11 whitespace-normal" })}>Đăng nhập để lưu và xem dự án</Link>}
      {signedIn && <>
        <h3 className="mb-3 flex items-center gap-1.5 text-label-sm text-fg-muted"><Clock3 className="size-4" aria-hidden />Gần đây</h3>
        <div className="grid grid-cols-2 gap-2">
          <ResultTiles result={first} query={query} accountOnly={accountOnly} currentId={currentId} seen={new Set()} onOpen={(project) => onNavigate(`/editor/${encodeURIComponent(project.id)}`)} />
        </div>
        {!first.isError && first.data?.meta.total === 0 && <p className="text-body-sm text-fg-muted">{q || structure ? "Không có dự án khớp với bộ lọc." : "Chưa có dự án. Chọn Dự án mới để bắt đầu từ một mẫu hộp."}</p>}
      </>}
    </div>
    {signedIn && <div className="shrink-0 border-t border-line p-2">
      <Link {...linkTo(ROUTES.projects)} className={buttonClass({ variant: "ghost", block: true, className: "min-h-11" })}>Xem tất cả<ArrowUpRight aria-hidden /></Link>
    </div>}
  </>;

  return wide ? <aside aria-labelledby={id} aria-busy={busy} className="flex w-[300px] shrink-0 flex-col border-l border-line bg-surface-raised 2xl:w-[340px]">{content}</aside>
    : <ModalLayer labelledBy={id} placement={side ? "sheet-right" : "sheet-bottom"} onClose={onCloseOverlay} dismissible={!busy}
        panelClassName={cn("bg-surface-raised pb-[env(safe-area-inset-bottom)] shadow-popover", side && "max-w-sm")}>{content}</ModalLayer>;
}

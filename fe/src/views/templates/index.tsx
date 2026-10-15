"use client";

import type { BoxStructureType, MaterialType } from "@wrapfit/shared";
import { useQueries, type UseQueryResult } from "@tanstack/react-query";
import { ArrowRight, ChevronDown, ScanSearch, SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { listCommunityTemplates, listCuratedTemplates } from "@/api/templates";
import { landingFontVariables } from "@/assets/fonts/landing";
import { EmptyState, ErrorState, PageLoader } from "@/components/common/StatusViews";
import { MainFooter, MainHeader } from "@/components/layout";
import { HowItWorks, LibraryCard, LibraryCardSkeleton, Pagination, StartBar } from "@/components/library";
import { Breadcrumb, Tab, TabList, TabPanel, Tabs } from "@/components/ui";
import { ROUTES } from "@/constants";
import {
  DielineSketch,
  INDUSTRIES,
  INDUSTRY_LABELS,
  MATERIALS,
  MATERIAL_LABELS,
  OCCASIONS,
  OCCASION_LABELS,
  formatCount,
  formatDimensions,
  templateHref,
  useBoxStructures,
  useCommunityTemplates,
  useCuratedTemplates,
  type HubFilters,
} from "@/features/templates";
import { useHydrated, useInView } from "@/hooks/dom";
import { queryKeys } from "@/hooks/data";
import type { CommunityCard, CuratedCard, Industry, Occasion, Paginated } from "@/types/api";
import { cn } from "@/utils/helpers";

const PAGE_SIZE = 12;
const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_MAX = 100;
const FILTER_KEYS = ["structure", "occasion", "industry", "material", "q"] as const;
/** Page of each section in the URL. */
const PAGE_PARAM = { curated: "page", community: "cpage" } as const;

type FilterKey = (typeof FILTER_KEYS)[number];
type Section = keyof typeof PAGE_PARAM;
type Filters = Omit<HubFilters, "page" | "limit">;
type Patch = Partial<Record<FilterKey | (typeof PAGE_PARAM)[Section] | "tab", string | null>>;

interface LibraryState {
  filters: Filters;
  pages: Record<Section, number>;
  tab: Section;
}

const pageOf = (value: string | null) => {
  const page = Number(value);
  return Number.isInteger(page) && page >= 1 && page <= 10_000 ? page : 1;
};

const oneOf = <T extends string>(value: string | null, allowed: readonly T[]): T | undefined =>
  value && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;

/** Filters, pages and tab from the query string. Unknown values are ignored instead of being sent to the API. */
function readState(params: URLSearchParams): LibraryState {
  const structure = params.get("structure");
  return {
    filters: {
      structure: structure && /^[a-z0-9-]{1,64}$/.test(structure) ? (structure as BoxStructureType) : undefined,
      occasion: oneOf<Occasion>(params.get("occasion"), OCCASIONS),
      industry: oneOf<Industry>(params.get("industry"), INDUSTRIES),
      material: oneOf<MaterialType>(params.get("material"), MATERIALS),
      q: params.get("q")?.trim().slice(0, SEARCH_MAX) || undefined,
    },
    pages: { curated: pageOf(params.get(PAGE_PARAM.curated)), community: pageOf(params.get(PAGE_PARAM.community)) },
    tab: params.get("tab") === "community" ? "community" : "curated",
  };
}

/**
 * `/templates`: WrapFit Curated designs and the community's public projects, laid out after pacdora.com's dieline
 * library: filters down the left, a search card, a grid of dieline + box tiles, numbered pages, how-to and a start bar.
 */
export default function TemplatesPage() {
  return (
    <>
      <MainHeader />
      {/* Bottom padding clears the floating mobile navigation bar. */}
      <main className={`${landingFontVariables} min-h-screen bg-white pb-28 pt-24 font-landing-heading text-library-text md:pb-0`}>
        <Suspense fallback={<PageLoader label="Đang mở thư viện mẫu…" />}>
          <HydratedLibrary />
        </Suspense>
      </main>
      <MainFooter />
    </>
  );
}

/**
 * The library shows answers of the API (structures, totals) that may arrive while the page still hydrates: it renders
 * after hydration, so the first client render always matches the server's loader.
 */
function HydratedLibrary() {
  return useHydrated() ? <TemplateLibrary /> : <PageLoader label="Đang mở thư viện mẫu…" />;
}

function TemplateLibrary() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const queryString = searchParams.toString();
  const { filters, pages, tab } = useMemo(() => readState(new URLSearchParams(queryString)), [queryString]);
  const hasFilters = FILTER_KEYS.some((key) => filters[key] !== undefined);
  const gridRef = useRef<HTMLDivElement>(null);
  const grid = useInView<HTMLDivElement>({ once: false });

  /** Changes the query string; a filter change sends both sections back to their first page. */
  const update = useCallback(
    (patch: Patch) => {
      const next = new URLSearchParams(queryString);
      const filterChanged = Object.keys(patch).some((key) => (FILTER_KEYS as readonly string[]).includes(key));
      if (filterChanged) Object.values(PAGE_PARAM).forEach((key) => next.delete(key));
      for (const [key, value] of Object.entries(patch)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      const search = next.toString();
      router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
    },
    [pathname, queryString, router]
  );

  const clearFilters = useCallback(() => update(Object.fromEntries(FILTER_KEYS.map((key) => [key, null]))), [update]);
  const curated = useCuratedTemplates({ ...filters, page: pages.curated, limit: PAGE_SIZE });
  const community = useCommunityTemplates({ ...filters, page: pages.community, limit: PAGE_SIZE });
  // Size of the whole library, for the title (one card per section is enough to read the total).
  const allCurated = useCuratedTemplates({ page: 1, limit: 1 });
  const allCommunity = useCommunityTemplates({ page: 1, limit: 1 });
  const libraryTotal =
    allCurated.data && allCommunity.data ? allCurated.data.meta.total + allCommunity.data.meta.total : null;

  const scrollToGrid = () => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    gridRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  };

  const sidebar = <SideFilters filters={filters} tab={tab} onChange={update} />;

  return (
    <>
      <div className="mx-auto flex w-full max-w-[1440px] gap-8 px-4 sm:px-6 lg:px-10">
        <aside className="hidden w-[302px] shrink-0 lg:block" aria-label="Bộ lọc thư viện">
          <div className="sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto pb-6 pr-2 pt-2">{sidebar}</div>
        </aside>

        <div className="min-w-0 flex-1 pt-2">
          <HeroCard total={libraryTotal} filters={filters} onChange={update} />

          <details className="group mt-4 rounded-2xl border border-library-ink bg-white lg:hidden">
            <summary className="flex h-12 cursor-pointer list-none items-center justify-between px-4 text-base text-library-ink [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-2">
                <SlidersHorizontal className="size-4" aria-hidden />
                Bộ lọc
                {hasFilters && <span className="rounded-full bg-library-lime px-2 text-xs leading-5 text-library-lime-ink">đang lọc</span>}
              </span>
              <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <div className="border-t border-library-line px-2 pb-3 pt-2">{sidebar}</div>
          </details>

          <div ref={gridRef} className="scroll-mt-28">
            <Tabs value={tab} onValueChange={(next) => update({ tab: next === "curated" ? null : next })} variant="segmented">
            <div ref={grid.ref}>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <p className="text-base text-library-sub" aria-live="polite">
                  {(tab === "curated" ? curated : community).data
                    ? `${(tab === "curated" ? curated : community).data!.meta.total} ${tab === "curated" ? "mẫu" : "thiết kế"}`
                    : "Đang tải…"}
                  {hasFilters && (
                    <button type="button" onClick={clearFilters} className="ml-3 inline-flex items-center gap-1 text-sm text-library-ink underline-offset-4 hover:underline">
                      <X className="size-3.5" aria-hidden />
                      Xoá bộ lọc
                    </button>
                  )}
                </p>
                {/* Curated first: most visitors start from a ready-made template. */}
                <TabList label="Nguồn mẫu">
                  <Tab value="curated" count={curated.data?.meta.total}>
                    WrapFit Curated
                  </Tab>
                  <Tab value="community" count={community.data?.meta.total}>
                    Cộng đồng
                  </Tab>
                </TabList>
              </div>

              <TabPanel value="curated">
                <LibraryGrid
                  query={curated}
                  hasFilters={hasFilters}
                  onClearFilters={clearFilters}
                  onPage={(page) => {
                    update({ [PAGE_PARAM.curated]: page > 1 ? String(page) : null });
                    scrollToGrid();
                  }}
                  empty={{ title: "Chưa có mẫu phù hợp", description: "Thử bỏ bớt bộ lọc hoặc tìm bằng từ khoá khác." }}
                  renderCard={(item: CuratedCard) => (
                    <LibraryCard
                      key={item.id}
                      href={templateHref(item.id)}
                      title={item.title}
                      label={`Dùng mẫu ${item.title}, ${item.structure.name} ${formatDimensions(item.dimensions)}`}
                      structure={item.structure.id}
                      dimensions={item.dimensions}
                      materialSpec={item.materialSpec}
                      thumbnailUrl={item.thumbnailUrl}
                      tags={["Curated", `${formatCount(item.usesCount)} lượt dùng`]}
                    />
                  )}
                />
              </TabPanel>
              <TabPanel value="community">
                <LibraryGrid
                  query={community}
                  hasFilters={hasFilters}
                  onClearFilters={clearFilters}
                  onPage={(page) => {
                    update({ [PAGE_PARAM.community]: page > 1 ? String(page) : null });
                    scrollToGrid();
                  }}
                  empty={{
                    title: hasFilters ? "Chưa có thiết kế phù hợp" : "Cộng đồng chưa chia sẻ thiết kế nào",
                    description: hasFilters
                      ? "Thử bỏ bớt bộ lọc hoặc tìm bằng từ khoá khác."
                      : "Thiết kế để chế độ Công khai và đạt FitCheck™ từ 90 điểm sẽ xuất hiện ở đây.",
                  }}
                  renderCard={(item: CommunityCard) => (
                    <LibraryCard
                      key={item.slug}
                      href={ROUTES.publicProject(item.slug)}
                      title={item.title}
                      label={`Thiết kế ${item.title}, ${item.structure.name} ${formatDimensions(item.dimensions)}`}
                      structure={item.structure.id}
                      dimensions={item.dimensions}
                      materialSpec={item.materialSpec}
                      thumbnailUrl={item.thumbnailUrl}
                      tags={[...(item.fitcheckScore !== null ? [`FitCheck ${item.fitcheckScore}`] : []), `♥ ${formatCount(item.likesCount)}`]}
                    />
                  )}
                />
              </TabPanel>
            </div>
            </Tabs>
          </div>
        </div>
      </div>

      <HowItWorks />
      <StartBar visible={grid.inView} onStart={scrollToGrid} />
    </>
  );
}

// ---------------------------------------------------------------- hero

function HeroCard({ total, filters, onChange }: { total: number | null; filters: Filters; onChange(patch: Patch): void }) {
  const [search, setSearch] = useState(filters.q ?? "");
  const appliedQ = filters.q ?? "";
  const lastApplied = useRef(appliedQ);

  // The URL changed on its own (back button, "Xoá bộ lọc"): show its search.
  useEffect(() => {
    if (appliedQ !== lastApplied.current) {
      lastApplied.current = appliedQ;
      setSearch(appliedQ);
    }
  }, [appliedQ]);

  // Typing: apply the search once the visitor pauses.
  useEffect(() => {
    const value = search.trim();
    if (value === lastApplied.current) return;
    const timer = window.setTimeout(() => {
      lastApplied.current = value;
      onChange({ q: value || null });
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [search, onChange]);

  return (
    <section className="grid grid-cols-1 overflow-hidden rounded-squircle-md border-[1.5px] border-library-ink bg-library-tile shadow-hard md:grid-cols-[minmax(0,575fr)_minmax(0,435fr)]">
      <div className="px-5 pb-8 pt-5 sm:pl-8">
        <Breadcrumb items={[{ label: "Trang chủ", href: ROUTES.home }, { label: "Thư viện mẫu" }]} />
        <h1 className="mt-4 flex gap-3 text-2xl font-medium leading-snug text-library-ink sm:text-heading-lg sm:leading-[1.3]">
          <ArrowRight className="mt-1 size-7 shrink-0 text-library-accent sm:size-8" strokeWidth={1.75} aria-hidden />
          <span>{total !== null ? `${total} mẫu hộp quà` : "Mẫu hộp quà"} in được & tuỳ chỉnh theo từng milimét</span>
        </h1>
        <p className="mt-4 text-base leading-[1.6] text-library-sub">
          Một chiếc hộp vừa khít giúp món quà được nhớ lâu hơn. Thư viện WrapFit gồm mẫu do WrapFit tuyển chọn và thiết kế đạt
          FitCheck™ của cộng đồng: chọn một mẫu, đổi kích thước theo món quà rồi xuất file in.
        </p>
        <form
          role="search"
          aria-label="Tìm mẫu"
          onSubmit={(event) => {
            event.preventDefault();
            lastApplied.current = search.trim();
            onChange({ q: search.trim() || null });
          }}
          className="mt-6"
        >
          <label className="flex h-12 items-center gap-2 rounded-control border-[0.8px] border-library-ink bg-white px-3 focus-within:shadow-hard-sm">
            <ScanSearch className="size-5 shrink-0 text-library-muted" aria-hidden />
            <span className="sr-only">Tìm mẫu</span>
            <input
              type="search"
              value={search}
              maxLength={SEARCH_MAX}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo tên hoặc thẻ, ví dụ: tết, kraft…"
              enterKeyHint="search"
              className="h-full min-w-0 flex-1 bg-transparent text-base text-library-ink outline-none placeholder:text-library-muted"
            />
          </label>
        </form>
      </div>
      <ParametricPreview />
    </section>
  );
}

const PREVIEW_FIELDS = [
  { key: "height", letter: "H" },
  { key: "length", letter: "L" },
  { key: "width", letter: "W" },
] as const;

/** Three size inputs and the tuck-top dieline they produce, redrawn as you type. */
function ParametricPreview() {
  const [size, setSize] = useState({ length: 75, width: 60, height: 80 });
  const clamp = (value: number) => Math.min(300, Math.max(20, Math.round(value) || 20));
  return (
    <div className="hidden flex-col gap-3 p-6 pl-0 md:flex">
      <div className="flex flex-wrap justify-end gap-2">
        {PREVIEW_FIELDS.map(({ key, letter }) => (
          <label key={key} className="flex h-8 items-center gap-2 rounded-md border border-library-line bg-white px-2 text-xs text-library-ink">
            <span aria-hidden>{letter}</span>
            <input
              type="number"
              min={20}
              max={300}
              value={size[key]}
              aria-label={`${letter} (mm)`}
              onChange={(event) => setSize((prev) => ({ ...prev, [key]: Number(event.target.value) }))}
              onBlur={() => setSize((prev) => ({ ...prev, [key]: clamp(prev[key]) }))}
              className="w-10 rounded-sm bg-transparent text-center text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-library-muted">mm</span>
          </label>
        ))}
      </div>
      <div className="min-h-0 flex-1">
        <DielineSketch
          structure="tuck-top"
          dimensions={{ length: clamp(size.length), width: clamp(size.width), height: clamp(size.height), paperThickness: 0.42 }}
          label={`Khuôn hộp nắp gài ${clamp(size.length)} × ${clamp(size.width)} × ${clamp(size.height)} mm`}
          className="h-full max-h-[220px] w-full"
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- filters

interface FilterGroup {
  key: Exclude<FilterKey, "q">;
  title: string;
  options: { value: string; label: string; count?: number }[];
}

function SideFilters({ filters, tab, onChange }: { filters: Filters; tab: Section; onChange(patch: Patch): void }) {
  const structures = useBoxStructures();
  // Designs of each structure in the open section (one card per request is enough to read the total).
  const counts = useQueries({
    queries: (structures.data ?? []).map((structure) => {
      const query = { structure: structure.id, page: 1, limit: 1 };
      return {
        queryKey: queryKeys.templates.hub({ ...query, section: tab }),
        queryFn: () => (tab === "curated" ? listCuratedTemplates(query) : listCommunityTemplates(query)),
        staleTime: 60_000,
      };
    }),
  });

  const structureOptions = (structures.data ?? []).map((structure, index) => ({
    value: structure.id,
    label: structure.name,
    count: (counts[index]?.data as Paginated<unknown> | undefined)?.meta.total,
  }));
  // A structure from a shared link stays selectable while the list loads.
  if (filters.structure && !structureOptions.some((option) => option.value === filters.structure)) {
    structureOptions.push({ value: filters.structure, label: filters.structure, count: undefined });
  }

  const groups: FilterGroup[] = [
    { key: "structure", title: "Theo cấu trúc", options: structureOptions },
    { key: "occasion", title: "Theo dịp tặng", options: OCCASIONS.map((value) => ({ value, label: OCCASION_LABELS[value] })) },
    { key: "industry", title: "Theo ngành hàng", options: INDUSTRIES.map((value) => ({ value, label: INDUSTRY_LABELS[value] })) },
    { key: "material", title: "Theo chất liệu", options: MATERIALS.map((value) => ({ value, label: MATERIAL_LABELS[value] })) },
  ];

  return (
    <div className="flex flex-col gap-1">
      {groups.map((group, index) => (
        <FilterGroupList
          key={group.key}
          group={group}
          value={filters[group.key]}
          defaultOpen={index === 0 || filters[group.key] !== undefined}
          onSelect={(value) => onChange({ [group.key]: value })}
        />
      ))}
    </div>
  );
}

function FilterGroupList({
  group,
  value,
  defaultOpen,
  onSelect,
}: {
  group: FilterGroup;
  value: string | undefined;
  defaultOpen: boolean;
  onSelect(value: string | null): void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const listId = `filter-${group.key}`;
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
        className="flex h-[38px] w-full items-center justify-between rounded-lg px-3 text-base text-library-ink hover:bg-library-panel"
      >
        {group.title}
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <ul id={listId} className="mt-1 flex flex-col gap-1 pb-2">
          <FilterItem label="Tất cả" active={value === undefined} onClick={() => onSelect(null)} />
          {group.options.map((option) => (
            <FilterItem
              key={option.value}
              label={option.label}
              count={option.count}
              active={value === option.value}
              onClick={() => onSelect(value === option.value ? null : option.value)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterItem({ label, count, active, onClick }: { label: string; count?: number; active: boolean; onClick(): void }) {
  return (
    <li>
      <button
        type="button"
        aria-pressed={active}
        onClick={onClick}
        className={cn(
          "flex min-h-[38px] w-full items-center rounded-lg px-3.5 text-left text-base text-library-ink transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-library-ink/20",
          active ? "border-[1.5px] border-library-ink bg-white shadow-hard-sm" : "border-[1.5px] border-transparent hover:bg-library-panel"
        )}
      >
        <span aria-hidden className="mr-1.5">
          #
        </span>
        {label}
        {count !== undefined && <span className="ml-2 text-xs text-library-muted">{count}</span>}
      </button>
    </li>
  );
}

// ---------------------------------------------------------------- grid

function LibraryGrid<T>({
  query,
  hasFilters,
  onClearFilters,
  onPage,
  empty,
  renderCard,
}: {
  query: UseQueryResult<Paginated<T>>;
  hasFilters: boolean;
  onClearFilters(): void;
  onPage(page: number): void;
  empty: { title: string; description: string };
  renderCard(item: T): React.ReactNode;
}) {
  const data = query.data;
  const gridClass = "mt-6 grid grid-cols-1 gap-x-6 gap-y-7 sm:grid-cols-2 xl:grid-cols-3";

  if (query.isPending) {
    return (
      <div role="status" aria-label="Đang tải" className={gridClass}>
        {Array.from({ length: 6 }, (_, index) => (
          <LibraryCardSkeleton key={index} />
        ))}
      </div>
    );
  }
  if (query.isError && !data) {
    return (
      <div className="mt-6">
        <ErrorState error={query.error} title="Chưa tải được danh sách" onRetry={() => void query.refetch()} retrying={query.isFetching} />
      </div>
    );
  }
  if (!data?.items.length) {
    // A page past the end (old link, fewer results since): offer the first page.
    const pastEnd = !!data && data.meta.total > 0;
    const button = "inline-flex h-10 items-center rounded-lg border border-library-ink bg-white px-4 text-sm font-medium text-library-ink hover:bg-library-panel";
    return (
      <div className="mt-6">
        <EmptyState
          title={pastEnd ? "Trang này không còn mục nào" : empty.title}
          description={pastEnd ? undefined : empty.description}
          action={
            pastEnd ? (
              <button type="button" onClick={() => onPage(1)} className={button}>
                Về trang đầu
              </button>
            ) : hasFilters ? (
              <button type="button" onClick={onClearFilters} className={button}>
                Xoá bộ lọc
              </button>
            ) : undefined
          }
        />
      </div>
    );
  }
  return (
    <>
      <div aria-busy={query.isPlaceholderData} className={cn(gridClass, "transition-opacity", query.isPlaceholderData && "opacity-60")}>
        {data.items.map(renderCard)}
      </div>
      <Pagination page={data.meta.page} totalPages={data.meta.totalPages} busy={query.isFetching} onPage={onPage} />
    </>
  );
}

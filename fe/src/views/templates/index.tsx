"use client";

import type { BoxStructureType, MaterialType } from "@wrapfit/shared";
import type { UseQueryResult } from "@tanstack/react-query";
import { ChevronDown, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GoiMascot } from "@/components/common/GoiMascot";
import { EmptyState, ErrorState, PageLoader } from "@/components/common/StatusViews";
import { MainFooter, MainHeader } from "@/components/layout";
import {
  CommunityTemplateCard,
  CuratedTemplateCard,
  INDUSTRIES,
  INDUSTRY_LABELS,
  MATERIALS,
  MATERIAL_LABELS,
  OCCASIONS,
  OCCASION_LABELS,
  TemplateCardSkeleton,
  useBoxStructures,
  useCommunityTemplates,
  useCuratedTemplates,
  type HubFilters,
} from "@/features/templates";
import type { Industry, Occasion, Paginated } from "@/types/api";

const PAGE_SIZE = 9;
const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_MAX = 100;
const FILTER_KEYS = ["structure", "occasion", "industry", "material", "q"] as const;
/** Page of each section in the URL. */
const PAGE_PARAM = { curated: "page", community: "cpage" } as const;

type FilterKey = (typeof FILTER_KEYS)[number];
type Section = keyof typeof PAGE_PARAM;

interface LibraryState {
  filters: Omit<HubFilters, "page" | "limit">;
  pages: Record<Section, number>;
}

const pageOf = (value: string | null) => {
  const page = Number(value);
  return Number.isInteger(page) && page >= 1 && page <= 10_000 ? page : 1;
};

const oneOf = <T extends string>(value: string | null, allowed: readonly T[]): T | undefined =>
  value && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;

/** Filters and pages from the query string. Unknown values are ignored instead of being sent to the API. */
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
  };
}

/** `/templates`: WrapFit Curated designs and the community's public projects, with the same filters. */
export default function TemplatesPage() {
  return (
    <>
      <MainHeader />
      {/* Bottom padding clears the floating mobile navigation bar. */}
      <main className="min-h-screen bg-paper-ivory pb-28 pt-24 font-sans text-stone-800 md:pb-16">
        <Suspense fallback={<PageLoader label="Đang mở thư viện mẫu…" />}>
          <TemplateLibrary />
        </Suspense>
      </main>
      <MainFooter />
    </>
  );
}

function TemplateLibrary() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const queryString = searchParams.toString();
  const { filters, pages } = useMemo(() => readState(new URLSearchParams(queryString)), [queryString]);
  const hasFilters = FILTER_KEYS.some((key) => filters[key] !== undefined);

  /** Changes the query string; a filter change sends both sections back to their first page. */
  const update = useCallback(
    (patch: Partial<Record<FilterKey | (typeof PAGE_PARAM)[Section], string | null>>) => {
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
    [pathname, queryString, router],
  );

  const curated = useCuratedTemplates({ ...filters, page: pages.curated, limit: PAGE_SIZE });
  const community = useCommunityTemplates({ ...filters, page: pages.community, limit: PAGE_SIZE });

  return (
    <>
      <header className="mx-auto flex max-w-7xl flex-col-reverse gap-4 px-4 pt-6 sm:px-6 md:flex-row md:items-end md:justify-between lg:px-8">
        <div className="max-w-2xl">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-stone-500">
            Thư viện mẫu · 4 cấu trúc hộp chuẩn
          </p>
          <h1 className="mt-2 font-serif text-[38px] leading-[1.06] tracking-tight text-brand-forest sm:text-[52px]">
            Bắt đầu từ một chiếc hộp đã vừa vặn.
          </h1>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-stone-600">
            Mẫu WrapFit Curated dựng sẵn và thiết kế đã qua FitCheck™ của cộng đồng. Chọn một mẫu, đổi kích thước theo món
            quà của bạn, rồi xuất file in.
          </p>
        </div>
        <GoiMascot pose="presenting" size={96} label="Gói giới thiệu thư viện mẫu" />
      </header>

      <FilterBar filters={filters} hasFilters={hasFilters} onChange={update} />

      <HubSection
        id="curated"
        eyebrow="WrapFit Curated"
        title="Mẫu do WrapFit tuyển chọn"
        description="Canvas, chất liệu và kích thước gợi ý đã dựng sẵn. “Dùng mẫu này” mở một dự án mới từ mẫu."
        unit="mẫu"
        query={curated}
        page={pages.curated}
        onPage={(page) => update({ [PAGE_PARAM.curated]: page > 1 ? String(page) : null })}
        hasFilters={hasFilters}
        onClearFilters={() => update(Object.fromEntries(FILTER_KEYS.map((key) => [key, null])))}
        empty={{
          title: "Chưa có mẫu phù hợp",
          description: "Thử bỏ bớt bộ lọc hoặc tìm bằng từ khoá khác.",
        }}
        renderCard={(item) => <CuratedTemplateCard key={item.id} template={item} />}
      />

      <HubSection
        id="community"
        eyebrow="Cộng đồng"
        title="Thiết kế từ cộng đồng"
        description="Thiết kế công khai đạt FitCheck™ từ 90 điểm, nhiều lượt thích nhất xếp trước. Mở để xem 3D, thả tim hoặc remix."
        unit="thiết kế"
        query={community}
        page={pages.community}
        onPage={(page) => update({ [PAGE_PARAM.community]: page > 1 ? String(page) : null })}
        hasFilters={hasFilters}
        onClearFilters={() => update(Object.fromEntries(FILTER_KEYS.map((key) => [key, null])))}
        empty={{
          title: hasFilters ? "Chưa có thiết kế phù hợp" : "Cộng đồng chưa chia sẻ thiết kế nào",
          description: hasFilters
            ? "Thử bỏ bớt bộ lọc hoặc tìm bằng từ khoá khác."
            : "Thiết kế để chế độ Công khai và đạt FitCheck™ từ 90 điểm sẽ xuất hiện ở đây.",
        }}
        renderCard={(item) => <CommunityTemplateCard key={item.slug} project={item} />}
      />
    </>
  );
}

// ---------------------------------------------------------------- filters

function FilterBar({
  filters,
  hasFilters,
  onChange,
}: {
  filters: LibraryState["filters"];
  hasFilters: boolean;
  onChange: (patch: Partial<Record<FilterKey, string | null>>) => void;
}) {
  const structures = useBoxStructures();
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

  const structureOptions = (structures.data ?? []).map((structure) => ({ value: structure.id, label: structure.name }));
  // A structure from a shared link stays selectable while the list loads.
  if (filters.structure && !structureOptions.some((option) => option.value === filters.structure)) {
    structureOptions.push({ value: filters.structure, label: filters.structure });
  }

  return (
    <div className="mx-auto mt-8 max-w-7xl px-4 sm:px-6 lg:px-8">
      <form
        role="search"
        aria-label="Lọc thư viện mẫu"
        onSubmit={(event) => {
          event.preventDefault();
          lastApplied.current = search.trim();
          onChange({ q: search.trim() || null });
        }}
        className="flex flex-col gap-3 rounded-3xl border border-stone-200/80 bg-white/80 p-3 shadow-tactile backdrop-blur-md sm:p-4 lg:flex-row lg:items-center"
      >
        <label className="relative block flex-1">
          <span className="sr-only">Tìm mẫu</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden />
          <input
            type="search"
            value={search}
            maxLength={SEARCH_MAX}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm theo tên hoặc thẻ, vd. tet, kraft"
            enterKeyHint="search"
            className="h-12 w-full rounded-full border border-stone-200 bg-paper-ivory pl-11 pr-4 text-sm text-stone-800 placeholder:text-stone-400 focus:border-brand-forest focus:outline-none focus:ring-2 focus:ring-brand-forest/20"
          />
        </label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex">
          <FilterSelect
            label="Cấu trúc"
            allLabel="Mọi cấu trúc"
            value={filters.structure}
            options={structureOptions}
            disabled={structures.isPending && !filters.structure}
            onChange={(value) => onChange({ structure: value })}
          />
          <FilterSelect
            label="Dịp tặng"
            allLabel="Mọi dịp"
            value={filters.occasion}
            options={OCCASIONS.map((value) => ({ value, label: OCCASION_LABELS[value] }))}
            onChange={(value) => onChange({ occasion: value })}
          />
          <FilterSelect
            label="Ngành hàng"
            allLabel="Mọi ngành hàng"
            value={filters.industry}
            options={INDUSTRIES.map((value) => ({ value, label: INDUSTRY_LABELS[value] }))}
            onChange={(value) => onChange({ industry: value })}
          />
          <FilterSelect
            label="Chất liệu"
            allLabel="Mọi chất liệu"
            value={filters.material}
            options={MATERIALS.map((value) => ({ value, label: MATERIAL_LABELS[value] }))}
            onChange={(value) => onChange({ material: value })}
          />
        </div>
        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              lastApplied.current = "";
              setSearch("");
              onChange(Object.fromEntries(FILTER_KEYS.map((key) => [key, null])));
            }}
            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full px-4 text-sm font-semibold text-brand-forest transition hover:bg-brand-forest/5"
          >
            <X className="h-4 w-4" aria-hidden />
            Xoá bộ lọc
          </button>
        )}
      </form>
    </div>
  );
}

function FilterSelect({
  label,
  allLabel,
  value,
  options,
  disabled = false,
  onChange,
}: {
  label: string;
  allLabel: string;
  value: string | undefined;
  options: { value: string; label: string }[];
  disabled?: boolean;
  onChange: (value: string | null) => void;
}) {
  const active = value !== undefined;
  return (
    <label className="relative block min-w-0 lg:w-44">
      <span className="sr-only">{label}</span>
      <select
        value={value ?? ""}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value || null)}
        className={`h-12 w-full appearance-none truncate rounded-full border pl-4 pr-9 text-sm transition focus:outline-none focus:ring-2 focus:ring-brand-forest/20 disabled:cursor-wait disabled:opacity-60 ${
          active
            ? "border-brand-forest bg-brand-forest/5 font-semibold text-brand-forest"
            : "border-stone-200 bg-paper-ivory text-stone-700"
        }`}
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden />
    </label>
  );
}

// ---------------------------------------------------------------- sections

interface HubSectionProps<T> {
  id: Section;
  eyebrow: string;
  title: string;
  description: string;
  /** Noun of the counter: "mẫu", "thiết kế". */
  unit: string;
  query: UseQueryResult<Paginated<T>>;
  page: number;
  onPage(page: number): void;
  hasFilters: boolean;
  onClearFilters(): void;
  empty: { title: string; description: string };
  renderCard(item: T): React.ReactNode;
}

function HubSection<T>({
  id,
  eyebrow,
  title,
  description,
  unit,
  query,
  page,
  onPage,
  hasFilters,
  onClearFilters,
  empty,
  renderCard,
}: HubSectionProps<T>) {
  const sectionRef = useRef<HTMLElement>(null);
  const data = query.data;
  const titleId = `${id}-title`;

  const goTo = (next: number) => {
    onPage(next);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    sectionRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  };

  let body: React.ReactNode;
  if (query.isPending) {
    body = (
      <div role="status" aria-label="Đang tải" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <TemplateCardSkeleton key={index} />
        ))}
      </div>
    );
  } else if (query.isError && !data) {
    body = (
      <ErrorState
        error={query.error}
        title="Chưa tải được danh sách"
        onRetry={() => void query.refetch()}
        retrying={query.isFetching}
      />
    );
  } else if (!data?.items.length) {
    // A page past the end (old link, fewer results since): offer the first page.
    const pastEnd = !!data && data.meta.total > 0;
    body = (
      <EmptyState
        title={pastEnd ? "Trang này không còn mục nào" : empty.title}
        description={pastEnd ? undefined : empty.description}
        action={
          pastEnd ? (
            <button type="button" onClick={() => goTo(1)} className={SECONDARY_BUTTON}>
              Về trang đầu
            </button>
          ) : hasFilters ? (
            <button type="button" onClick={onClearFilters} className={SECONDARY_BUTTON}>
              Xoá bộ lọc
            </button>
          ) : undefined
        }
      />
    );
  } else {
    body = (
      <>
        <div
          aria-busy={query.isPlaceholderData}
          className={`grid gap-5 transition-opacity sm:grid-cols-2 lg:grid-cols-3 ${query.isPlaceholderData ? "opacity-60" : ""}`}
        >
          {data.items.map(renderCard)}
        </div>
        <Pager page={data.meta.page} totalPages={data.meta.totalPages} busy={query.isFetching} onPage={goTo} />
      </>
    );
  }

  return (
    <section ref={sectionRef} id={id} aria-labelledby={titleId} className="mx-auto mt-14 max-w-7xl scroll-mt-28 px-4 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-stone-200/80 pb-4">
        <div className="max-w-2xl">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-stone-500">{eyebrow}</p>
          <h2 id={titleId} className="mt-1 font-serif text-[28px] leading-tight tracking-tight text-stone-900 sm:text-[34px]">
            {title}
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-stone-600">{description}</p>
        </div>
        {data && (
          <span className="font-mono text-xs text-stone-500" aria-live="polite">
            {data.meta.total} {unit}
            {page > 1 && data.meta.totalPages > 1 ? ` · trang ${page}` : ""}
          </span>
        )}
      </div>
      {body}
    </section>
  );
}

const SECONDARY_BUTTON =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-stone-200 bg-white px-5 text-sm font-semibold text-brand-forest transition hover:border-brand-forest/40 active:scale-95";

function Pager({
  page,
  totalPages,
  busy,
  onPage,
}: {
  page: number;
  totalPages: number;
  busy: boolean;
  onPage(page: number): void;
}) {
  if (totalPages <= 1) return null;
  const button =
    "inline-flex h-11 w-11 items-center justify-center rounded-full border border-stone-200 bg-white text-brand-forest transition hover:border-brand-forest/40 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100";
  return (
    <nav aria-label="Phân trang" className="mt-8 flex items-center justify-center gap-4">
      <button type="button" className={button} disabled={page <= 1 || busy} onClick={() => onPage(page - 1)} aria-label="Trang trước">
        <ChevronLeft className="h-5 w-5" aria-hidden />
      </button>
      <span className="font-mono text-xs uppercase tracking-wider text-stone-600">
        Trang {page} / {totalPages}
      </span>
      <button
        type="button"
        className={button}
        disabled={page >= totalPages || busy}
        onClick={() => onPage(page + 1)}
        aria-label="Trang sau"
      >
        <ChevronRight className="h-5 w-5" aria-hidden />
      </button>
    </nav>
  );
}

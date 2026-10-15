"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { BookOpen, Boxes, FileText, LayoutTemplate, LifeBuoy, Loader2, Search, X } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { listCommunityTemplates, listCuratedTemplates } from "@/api/templates";
import { Container } from "@/components/landing";
import { SitePage } from "@/components/site";
import { ALL_ARTICLES } from "@/components/support/articles";
import { RESOURCE_LINKS, STUDIO_LINKS } from "@/components/layout/navigation";
import { useDebouncedValue } from "@/features/dashboard/useDebouncedValue";
import { BLOG_POSTS } from "@/features/site/blog";
import { useBoxStructures } from "@/features/templates/hooks";
import { BoxPreview } from "@/features/templates/components/BoxPreview";
import type { BoxDimensions, BoxStructureType, MaterialType } from "@wrapfit/shared";
import { cn } from "@/utils/helpers";
import { useRouter } from "next/navigation";
import { SearchBar, type SearchSuggestion } from "@/components/ui";

// /search: one box for the whole site. Templates come from the API (`GET /templates/hub?q=`, curated and community)
// and the structures from `GET /templates/structures`; articles, help answers and pages are searched in the front end.

type Kind = "template" | "structure" | "post" | "help" | "page";
const KINDS: { id: Kind | "all"; label: string; icon: typeof Search }[] = [
  { id: "all", label: "Tất cả", icon: Search },
  { id: "template", label: "Mẫu hộp", icon: LayoutTemplate },
  { id: "structure", label: "Cấu trúc", icon: Boxes },
  { id: "post", label: "Bài viết", icon: BookOpen },
  { id: "help", label: "Hỗ trợ", icon: LifeBuoy },
  { id: "page", label: "Trang", icon: FileText },
];
type Order = "relevance" | "popular" | "newest";

interface Result {
  key: string;
  kind: Kind;
  title: string;
  text: string;
  href: string;
  score: number;
  /** Popularity (template uses) and date (articles), for the other orders. */
  popularity?: number;
  date?: string;
  box?: { structure: BoxStructureType; material?: MaterialType; dimensions: BoxDimensions };
}

const SUGGESTIONS = ["hộp nến", "tràn lề", "giấy kraft", "hộp gối", "file in", "Tết", "mã QR", "FitCheck"];
const PAGES = [
  ...STUDIO_LINKS,
  ...RESOURCE_LINKS,
  { label: "Tính năng", href: "/features", description: "Khuôn bế, 3D, FitCheck™, file in, hoa văn AI" },
  { label: "So sánh với công cụ khác", href: "/compare", description: "WrapFit, Pacdora, Canva, xưởng offset" },
  { label: "Blog", href: "/blog", description: "Kiến thức in và làm hộp quà" },
  { label: "Trạng thái hệ thống", href: "/status", description: "API, cơ sở dữ liệu, xuất file in" },
  { label: "Bảo mật", href: "/security", description: "Mã hoá, phân quyền, báo cáo lỗ hổng" },
  { label: "Tuyển dụng", href: "/careers", description: "Vị trí đang mở tại WrapFit" },
  { label: "Giỏ in mẫu", href: "/cart", description: "Đặt hộp mẫu thử từ dự án của bạn" },
  { label: "Chính sách quyền riêng tư", href: "/legal/privacy", description: "Dữ liệu WrapFit thu thập và cách dùng" },
  { label: "Điều khoản sử dụng", href: "/legal/terms", description: "Tài khoản, file in, màu in, hoàn tiền" },
];

const fold = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();

/** Every word must appear; a word in the title counts three times. */
function scoreOf(words: string[], title: string, text: string): number {
  const t = fold(title);
  const b = fold(text);
  let score = 0;
  for (const word of words) {
    if (t.includes(word)) score += 3;
    else if (b.includes(word)) score += 1;
    else return 0;
  }
  return score;
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<Kind | "all">("all");
  const [order, setOrder] = useState<Order>("relevance");
  const debounced = useDebouncedValue(query.trim(), 300);
  const words = useMemo(() => fold(debounced).split(/\s+/).filter(Boolean), [debounced]);

  useEffect(() => {
    setQuery(new URLSearchParams(window.location.search).get("q") ?? "");
  }, []);
  useEffect(() => {
    const url = debounced ? `/search?q=${encodeURIComponent(debounced)}` : "/search";
    window.history.replaceState(null, "", url);
  }, [debounced]);

  const enabled = debounced.length >= 2;
  const curated = useQuery({ queryKey: ["search", "curated", debounced], queryFn: () => listCuratedTemplates({ q: debounced, limit: 6 }), enabled, placeholderData: keepPreviousData, staleTime: 60_000 });
  const community = useQuery({ queryKey: ["search", "community", debounced], queryFn: () => listCommunityTemplates({ q: debounced, limit: 6 }), enabled, placeholderData: keepPreviousData, staleTime: 60_000 });
  const structures = useBoxStructures();
  const searching = enabled && (curated.isFetching || community.isFetching);
  const apiFailed = enabled && curated.isError && community.isError;

  const results = useMemo<Result[]>(() => {
    if (!words.length) return [];
    const out: Result[] = [];
    for (const card of curated.data?.items ?? []) {
      out.push({ key: `c-${card.id}`, kind: "template", title: card.title, text: card.description ?? `${card.structure.name} · ${card.dimensions.length} × ${card.dimensions.width} × ${card.dimensions.height} mm`, href: `/templates?q=${encodeURIComponent(card.title)}`, score: Math.max(1, scoreOf(words, card.title, [card.description, card.structure.name, ...card.tags].join(" "))), popularity: card.usesCount, box: { structure: card.structure.id, material: card.materialSpec.type, dimensions: card.dimensions } });
    }
    for (const card of community.data?.items ?? []) {
      out.push({ key: `p-${card.slug}`, kind: "template", title: card.title, text: `Cộng đồng · ${card.author.shopName ?? card.author.fullName ?? "Ẩn danh"} · FitCheck™ ${card.fitcheckScore ?? "—"}`, href: `/p/${card.slug}`, score: Math.max(1, scoreOf(words, card.title, [card.structure.name, ...card.tags].join(" "))), popularity: card.likesCount, box: { structure: card.structure.id, material: card.materialSpec.type, dimensions: card.dimensions } });
    }
    for (const structure of structures.data ?? []) {
      const score = scoreOf(words, structure.name, structure.description ?? "");
      if (score) out.push({ key: `s-${structure.id}`, kind: "structure", title: structure.name, text: structure.description ?? "", href: `/structures/${structure.id}`, score, box: { structure: structure.id, dimensions: { length: 120, width: 80, height: structure.id === "pillow" ? 30 : 60, paperThickness: 0.42 } } });
    }
    for (const post of BLOG_POSTS) {
      const body = post.body.map((block) => ("text" in block ? block.text : "items" in block ? JSON.stringify(block.items) : "rows" in block ? block.rows.flat().join(" ") : "")).join(" ");
      const score = scoreOf(words, post.title, `${post.subtitle} ${post.tags.join(" ")} ${body}`);
      if (score) out.push({ key: `b-${post.slug}`, kind: "post", title: post.title, text: post.subtitle, href: `/blog/${post.slug}`, score, date: post.date });
    }
    for (const article of ALL_ARTICLES) {
      const score = scoreOf(words, article.title, article.body.join(" "));
      if (score) out.push({ key: `h-${article.id}`, kind: "help", title: article.title, text: article.body[0], href: `/support?a=${article.id}`, score });
    }
    for (const page of PAGES) {
      const score = scoreOf(words, page.label, page.description ?? "");
      if (score) out.push({ key: `g-${page.href}`, kind: "page", title: page.label, text: page.description ?? "", href: page.href, score });
    }
    return out;
  }, [words, curated.data, community.data, structures.data]);

  const counts = useMemo(() => {
    const map = new Map<Kind | "all", number>([["all", results.length]]);
    for (const result of results) map.set(result.kind, (map.get(result.kind) ?? 0) + 1);
    return map;
  }, [results]);

  const router = useRouter();
  const kindLabel = useMemo(() => new Map(KINDS.map(({ id, label }) => [id, label])), []);
  const suggestions = useMemo<SearchSuggestion[]>(
    () =>
      [...results]
        .sort((a, b) => b.score - a.score)
        .slice(0, 6)
        .map((result) => ({ id: result.key, label: result.title, hint: kindLabel.get(result.kind), href: result.href })),
    [results, kindLabel],
  );

  const shown = results
    .filter((result) => kind === "all" || result.kind === kind)
    .sort((a, b) => (order === "popular" ? (b.popularity ?? -1) - (a.popularity ?? -1) : order === "newest" ? (b.date ?? "").localeCompare(a.date ?? "") : b.score - a.score));

  return (
    <SitePage>
      <section className="bg-gradient-to-b from-white to-landing-canvas pb-8 pt-28 sm:pt-32">
        <Container className="max-w-4xl">
          <h1 className="font-landing-heading text-display text-fg">Tìm kiếm</h1>
          {/* Whole-site search: matches while typing (Enter or a click opens one), recent searches when empty. */}
          <SearchBar
            className="mt-6"
            label="Tìm trong WrapFit"
            placeholder="Mẫu hộp, cấu trúc, bài viết, câu hỏi…"
            value={query}
            onChange={setQuery}
            onSubmit={setQuery}
            suggestions={suggestions}
            onPickSuggestion={(suggestion) => suggestion.href && router.push(suggestion.href)}
            historyKey="site"
            autoFocus
          />
          <p className="mt-2 h-5 text-caption text-fg-muted" aria-live="polite">
            {searching ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden /> Đang tìm…
              </span>
            ) : null}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-landing-muted">Gợi ý:</span>
            {SUGGESTIONS.map((suggestion) => (
              <button key={suggestion} type="button" onClick={() => setQuery(suggestion)} className="rounded-full bg-white px-3 py-1 text-sm ring-1 ring-landing-line hover:bg-landing-tile/60">
                {suggestion}
              </button>
            ))}
          </div>
        </Container>
      </section>

      <Container className="max-w-4xl pb-16">
        {words.length > 0 && (
          <div className="flex flex-col gap-3 border-b border-landing-line/70 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <nav aria-label="Loại kết quả" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 [scrollbar-width:none]">
              {KINDS.map(({ id, label, icon: Icon }) => (
                <button key={id} type="button" aria-pressed={kind === id} onClick={() => setKind(id)} className={cn("inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium", kind === id ? "bg-landing-ink text-white" : "bg-white ring-1 ring-landing-line hover:bg-landing-tile/60")}>
                  <Icon className="size-4" aria-hidden />
                  {label}
                  <span className={cn("text-xs", kind === id ? "text-white/70" : "text-landing-muted")}>{counts.get(id) ?? 0}</span>
                </button>
              ))}
            </nav>
            <label className="flex shrink-0 items-center gap-2 text-sm text-landing-muted">
              Sắp xếp
              <select value={order} onChange={(event) => setOrder(event.target.value as Order)} className="h-9 rounded-full bg-white px-3 text-sm text-landing-ink ring-1 ring-landing-line">
                <option value="relevance">Liên quan nhất</option>
                <option value="popular">Phổ biến nhất</option>
                <option value="newest">Mới nhất</option>
              </select>
            </label>
          </div>
        )}

        <div aria-live="polite" className="mt-6">
          {!words.length ? (
            <p className="text-sm text-landing-muted">Gõ từ hai ký tự để tìm trong thư viện mẫu, 4 cấu trúc hộp, blog và trung tâm hỗ trợ.</p>
          ) : (
            <>
              <p className="mb-4 text-sm text-landing-muted">
                {searching ? "Đang tìm trong thư viện mẫu…" : `${shown.length} kết quả cho “${debounced}”`}
                {apiFailed && " · Không kết nối được thư viện mẫu, đang hiện kết quả còn lại."}
              </p>
              {shown.length === 0 && !searching ? (
                <div className="rounded-card bg-white p-8 text-center ring-1 ring-landing-ink/10">
                  <p className="font-landing-heading text-xl font-bold">Không tìm thấy kết quả</p>
                  <p className="mt-2 text-sm text-landing-muted">Thử từ ngắn hơn, bỏ dấu, hoặc chọn một gợi ý ở trên.</p>
                  <Link href="/contact" className="mt-4 inline-block text-sm font-semibold text-landing-green-deep">
                    Hỏi đội ngũ WrapFit →
                  </Link>
                </div>
              ) : (
                <ul className="flex flex-col gap-3">
                  {shown.map((result) => (
                    <li key={result.key}>
                      <ResultCard result={result} words={words} />
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </Container>
    </SitePage>
  );
}

const KIND_LABEL: Record<Kind, string> = { template: "Mẫu hộp", structure: "Cấu trúc hộp", post: "Bài viết", help: "Hỗ trợ", page: "Trang" };

function ResultCard({ result, words }: { result: Result; words: string[] }) {
  return (
    <Link href={result.href} className="group flex items-center gap-4 rounded-3xl bg-white p-4 ring-1 ring-landing-ink/10 transition-shadow hover:shadow-soft-8 sm:p-5">
      {result.box ? (
        <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-landing-canvas sm:size-20">
          <BoxPreview structure={result.box.structure} material={result.box.material} dimensions={result.box.dimensions} className="size-full" />
        </span>
      ) : (
        <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-landing-lime-mist text-landing-green-deep sm:size-20">
          {result.kind === "post" ? <BookOpen className="size-6" aria-hidden /> : result.kind === "help" ? <LifeBuoy className="size-6" aria-hidden /> : <FileText className="size-6" aria-hidden />}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="text-xs font-semibold text-landing-green-deep">{KIND_LABEL[result.kind]}</span>
        <span className="block font-landing-heading text-base font-bold leading-snug group-hover:underline sm:text-lg">
          <Highlight text={result.title} words={words} />
        </span>
        <span className="mt-0.5 line-clamp-2 block text-sm text-landing-muted">
          <Highlight text={result.text} words={words} />
        </span>
      </span>
    </Link>
  );
}

/** Marks the searched words, accents ignored: "tran le" marks "tràn lề". */
function Highlight({ text, words }: { text: string; words: string[] }) {
  if (!words.length || !text) return <>{text}</>;
  const folded = fold(text);
  const marks: [number, number][] = [];
  for (const word of words) {
    let at = folded.indexOf(word);
    while (at !== -1) {
      marks.push([at, at + word.length]);
      at = folded.indexOf(word, at + word.length);
    }
  }
  if (!marks.length) return <>{text}</>;
  marks.sort((a, b) => a[0] - b[0]);
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  for (const [start, end] of marks) {
    if (start < cursor) continue;
    parts.push(text.slice(cursor, start));
    parts.push(
      <mark key={start} className="rounded bg-landing-lime/50 px-0.5 text-inherit">
        {text.slice(start, end)}
      </mark>
    );
    cursor = end;
  }
  parts.push(text.slice(cursor));
  return <>{parts}</>;
}

"use client";

import { ArrowRight, Search, X } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { GoiMascot } from "@/components/common/GoiMascot";
import { Carousel, Container, SectionHeading, limeButton } from "@/components/landing";
import { ROUTES } from "@/constants";
import { ModalDialog } from "@/features/dashboard";
import { useBoxStructures } from "@/features/templates";
import type { BoxStructure } from "@/types/api";
import { cn } from "@/utils/helpers";
import { ALL_ARTICLES, CATEGORIES, POPULAR_IDS, type Article } from "./articles";

const SLIDE = "w-[85vw] sm:w-[340px] lg:w-[356px]";

/** Lower-case text without Vietnamese accents, so "dinh dang" finds "định dạng". */
const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();

/**
 * The help center of /support, after pack.ly's: title, search box (Ctrl K), rows of article cards by topic, the box
 * structures read from the API, and a closing "need support" card. A card opens its article in a dialog.
 */
export function HelpCenter() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Article | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Ctrl K / ⌘ K jumps to the search box, as the hint in it says.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // /support?a=<article id> opens that article (links from the site search and the blog).
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("a");
    const article = id ? ALL_ARTICLES.find((item) => item.id === id) : undefined;
    if (article) setOpen(article);
  }, []);

  const results = useMemo(() => {
    const words = fold(query).split(/\s+/).filter(Boolean);
    if (!words.length) return null;
    return ALL_ARTICLES.filter((article) => {
      const text = fold(`${article.title} ${article.body.join(" ")}`);
      return words.every((word) => text.includes(word));
    });
  }, [query]);

  const popular = POPULAR_IDS.map((id) => ALL_ARTICLES.find((article) => article.id === id)).filter(
    (article): article is Article => !!article
  );

  return (
    <>
      <header className="pt-28 sm:pt-32">
        <Container>
          <h1 className="font-landing-heading text-4xl font-bold leading-[110%] tracking-tight text-landing-ink lg:text-6xl">
            Trung tâm hỗ trợ
          </h1>
          <p className="mt-2 font-landing-heading text-2xl font-semibold leading-tight text-landing-muted lg:text-4xl">
            Cần giúp? Tìm câu trả lời nhanh cho câu hỏi của bạn
          </p>
          <form role="search" onSubmit={(event) => event.preventDefault()} className="mx-auto mt-8 max-w-2xl lg:mt-10">
            <div className="rounded-full bg-white/60 p-2 shadow-soft-8 ring-1 ring-landing-ink/5">
              <label className="flex h-12 items-center gap-2.5 rounded-full border border-landing-line bg-white px-4 focus-within:border-focus focus-within:ring-[3px] focus-within:ring-focus/30">
                <Search className="size-5 shrink-0 text-landing-muted" aria-hidden />
                <span className="sr-only">Tìm trong trung tâm hỗ trợ</span>
                <input
                  ref={searchRef}
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Tìm trong trung tâm hỗ trợ…"
                  className="h-full min-w-0 flex-1 bg-transparent text-base text-landing-ink outline-none placeholder:text-landing-muted [&::-webkit-search-cancel-button]:hidden"
                />
                {query ? (
                  <button type="button" onClick={() => setQuery("")} aria-label="Xoá tìm kiếm" className="rounded-full p-1 text-landing-muted hover:bg-landing-tile">
                    <X className="size-4" aria-hidden />
                  </button>
                ) : (
                  <kbd className="hidden rounded-md border border-landing-line px-1.5 py-0.5 font-mono text-xs text-landing-muted sm:inline">
                    Ctrl K
                  </kbd>
                )}
              </label>
            </div>
          </form>
          {/* Table of contents: jump to a topic */}
          <nav aria-label="Chủ đề hỗ trợ" className="mx-auto mt-6 flex max-w-3xl flex-wrap justify-center gap-2">
            {CATEGORIES.map((category) => (
              <a
                key={category.id}
                href={`#${category.id}`}
                onClick={() => setQuery("")}
                className="inline-flex h-9 items-center rounded-full bg-white px-4 text-sm font-medium text-landing-ink ring-1 ring-landing-line transition-colors hover:bg-landing-tile/60"
              >
                {category.title}
              </a>
            ))}
          </nav>
        </Container>
      </header>

      {results ? (
        <SearchResults query={query} results={results} onOpen={setOpen} />
      ) : (
        <div className="flex flex-col gap-12 overflow-x-clip py-12 lg:gap-16 lg:py-16">
          <ArticleRow id="pho-bien" title="Bài viết phổ biến" articles={popular} onOpen={setOpen} />
          {CATEGORIES.map((category) => (
            <React.Fragment key={category.id}>
              <ArticleRow id={category.id} title={category.title} articles={category.articles} onOpen={setOpen} />
              {category.id === "kich-thuoc" && <StructureRow />}
            </React.Fragment>
          ))}
        </div>
      )}

      <NeedSupport />
      {open && <ArticleDialog article={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function ArticleRow({
  id,
  title,
  articles,
  onOpen,
}: {
  id: string;
  title: string;
  articles: Article[];
  onOpen(article: Article): void;
}) {
  return (
    <section id={id} aria-label={title} className="scroll-mt-28">
      <Container className="flex flex-col gap-6">
        <SectionHeading title={title} href={`#${id}`} />
        <Carousel label={title} slideClassName={SLIDE}>
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} onOpen={onOpen} />
          ))}
        </Carousel>
      </Container>
    </section>
  );
}

function ArticleCard({ article, onOpen }: { article: Article; onOpen(article: Article): void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(article)}
      className="flex h-full w-full flex-col gap-3 rounded-2xl bg-white p-4 text-left ring-1 ring-landing-ink/10 transition-shadow outline-none hover:shadow-soft-16 focus-visible:ring-[3px] focus-visible:ring-landing-ink/25"
    >
      <h3 className="line-clamp-2 font-landing-heading text-base font-semibold leading-6 text-landing-ink">{article.title}</h3>
      <p className="line-clamp-3 text-base leading-6 text-landing-muted">{article.body[0]}</p>
    </button>
  );
}

function SearchResults({ query, results, onOpen }: { query: string; results: Article[]; onOpen(article: Article): void }) {
  return (
    <section aria-live="polite" className="py-12 lg:py-16">
      <Container className="flex flex-col gap-6">
        <h2 className="font-landing-heading text-3xl font-bold tracking-tight text-landing-ink lg:text-4xl">
          {results.length ? `${results.length} kết quả cho “${query.trim()}”` : `Không có kết quả cho “${query.trim()}”`}
        </h2>
        {results.length ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((article) => (
              <ArticleCard key={article.id} article={article} onOpen={onOpen} />
            ))}
          </div>
        ) : (
          <p className="text-base text-landing-muted">Thử từ khoá ngắn hơn, ví dụ “QR”, “FitCheck” hay “dung lượng”.</p>
        )}
      </Container>
    </section>
  );
}

/** The box structures of the API (`GET /templates/structures`) with their size limits. */
function StructureRow() {
  const structures = useBoxStructures();
  if (structures.isError) return null;
  const title = "Bốn cấu trúc hộp";
  return (
    <section id="cau-truc" aria-label={title} className="scroll-mt-28">
      <Container className="flex flex-col gap-6">
        <SectionHeading title={title} href={ROUTES.templates} />
        <Carousel label={title} slideClassName={SLIDE}>
          {structures.data
            ? structures.data.map((structure) => <StructureCard key={structure.id} structure={structure} />)
            : [0, 1, 2].map((index) => <div key={index} aria-hidden className="h-44 animate-pulse rounded-2xl bg-white/70" />)}
        </Carousel>
      </Container>
    </section>
  );
}

function StructureCard({ structure }: { structure: BoxStructure }) {
  const { length, width, height } = structure.dimensionLimits;
  return (
    <Link
      href={`${ROUTES.templates}?structure=${structure.id}`}
      className="flex h-full flex-col gap-3 rounded-2xl bg-white p-4 ring-1 ring-landing-ink/10 transition-shadow hover:shadow-soft-16"
    >
      <h3 className="font-landing-heading text-base font-semibold text-landing-ink">{structure.name}</h3>
      {structure.description && <p className="line-clamp-3 text-base leading-6 text-landing-muted">{structure.description}</p>}
      <dl className="mt-auto grid grid-cols-3 gap-2 font-mono text-xs text-landing-ink">
        {(
          [
            ["L", length],
            ["W", width],
            ["H", height],
          ] as const
        ).map(([letter, range]) => (
          <div key={letter} className="rounded-lg bg-landing-canvas px-2 py-1.5">
            <dt className="text-landing-muted">{letter} (mm)</dt>
            <dd>
              {range.min}–{range.max}
            </dd>
          </div>
        ))}
      </dl>
    </Link>
  );
}

/** Warm gradient card at the end of the page. */
function NeedSupport() {
  return (
    <section className="pb-12 lg:pb-24">
      <Container>
        {/* ds-allow: peach hero gradient of the help centre (illustration). */}
        <div className="relative flex flex-col items-center gap-4 overflow-hidden rounded-card bg-gradient-to-br from-[#FFF7ED] via-[#FFE9D2] to-[#FFD5A8] px-6 py-20 text-center lg:rounded-card-lg lg:py-40">
          <GoiMascot pose="waving" size={72} label="Gói" />
          <h2 className="font-landing-heading text-3xl font-bold text-landing-green-night lg:text-4xl">Cần hỗ trợ thêm?</h2>
          <p className="max-w-xl text-base text-landing-green-night lg:text-lg">
            Chưa tìm thấy câu trả lời? Đừng lo, Gói luôn ở trong studio để giúp bạn từng bước.
          </p>
          <Link
            href={ROUTES.editorDemo}
            className="inline-flex h-10 items-center rounded-full bg-white px-4 text-sm font-medium text-landing-ink shadow-soft-8 transition-colors hover:bg-landing-lime-mist"
          >
            Hỏi Gói ngay
          </Link>
        </div>
      </Container>
    </section>
  );
}

function ArticleDialog({ article, onClose }: { article: Article; onClose(): void }) {
  const titleId = useId();
  return (
    <ModalDialog
      onClose={onClose}
      labelledBy={titleId}
      panelClassName="w-full max-w-xl rounded-t-3xl bg-white p-6 font-landing-body text-landing-ink shadow-soft-16 sm:rounded-3xl sm:p-8"
    >
      <div className="flex items-start justify-between gap-4">
        <h2 id={titleId} className="font-landing-heading text-2xl font-bold leading-tight">
          {article.title}
        </h2>
        <button type="button" onClick={onClose} aria-label="Đóng" className="-mr-2 rounded-full p-2 text-landing-muted hover:bg-landing-tile">
          <X className="size-5" aria-hidden />
        </button>
      </div>
      <div className="mt-4 flex flex-col gap-3 text-base leading-7 text-landing-muted">
        {article.body.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      {article.action && (
        <Link href={article.action.href} className={cn(limeButton(), "mt-6 w-fit")}>
          {article.action.label}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      )}
    </ModalDialog>
  );
}

"use client";

import { ChevronLeft, ChevronRight, Clock, Search, X } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { Container } from "@/components/landing";
import { Card, EmailCapture, PageHero, SitePage } from "@/components/site";
import { BLOG_CATEGORIES, BLOG_POSTS, formatPostDate, type BlogCategory, type BlogPost } from "@/features/site/blog";
import { cn } from "@/utils/helpers";
import { BlogCover } from "./BlogCover";

const PAGE_SIZE = 6;
const normalize = (text: string) => text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");

/**
 * `/blog`: packaging know-how for gift makers, from docs/05 and the CP2 research. The articles live in the front end
 * (features/site/blog.ts); search, categories, tags and pages are filtered here.
 */
export default function BlogPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<BlogCategory | null>(null);
  const [tag, setTag] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // Links from an article: /blog?category=su-co or /blog?tag=giấy.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("category");
    if (fromUrl && fromUrl in BLOG_CATEGORIES) setCategory(fromUrl as BlogCategory);
    setTag(params.get("tag"));
  }, []);

  const filtered = useMemo(() => {
    const words = normalize(query).split(/\s+/).filter(Boolean);
    return BLOG_POSTS.filter((post) => {
      if (category && post.category !== category) return false;
      if (tag && !post.tags.includes(tag)) return false;
      const haystack = normalize([post.title, post.subtitle, ...post.tags].join(" "));
      return words.every((word) => haystack.includes(word));
    });
  }, [query, category, tag]);

  const browsing = !query && !category && !tag;
  const featured = browsing ? filtered[0] : undefined;
  const rest = browsing ? filtered.slice(1) : filtered;
  const pages = Math.max(1, Math.ceil(rest.length / PAGE_SIZE));
  const shown = rest.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const tags = [...new Set(BLOG_POSTS.flatMap((post) => post.tags))];
  const reset = (next: () => void) => {
    next();
    setPage(1);
  };

  return (
    <SitePage>
      <PageHero
        title="Blog WrapFit"
        subtitle="Kiến thức làm hộp quà cho người bán nhỏ."
        lead="Thuật ngữ in, cách chọn giấy, lỗi thường gặp ở xưởng và số liệu thật từ 109 người bán quà tặng Việt Nam."
      />

      <Container className="pb-16">
        {/* Categories and search */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <nav aria-label="Chủ đề" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
            <button type="button" onClick={() => reset(() => setCategory(null))} aria-pressed={!category} className={chip(!category)}>
              Tất cả
            </button>
            {(Object.keys(BLOG_CATEGORIES) as BlogCategory[]).map((id) => (
              <button key={id} type="button" onClick={() => reset(() => setCategory(id))} aria-pressed={category === id} className={chip(category === id)}>
                {BLOG_CATEGORIES[id]}
              </button>
            ))}
          </nav>
          <label className="relative block w-full lg:w-80">
            <span className="sr-only">Tìm bài viết</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-landing-muted" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(event) => reset(() => setQuery(event.target.value))}
              placeholder="Tìm: tràn lề, giấy kraft…"
              className="h-11 w-full rounded-full bg-white pl-10 pr-4 text-sm outline-none ring-1 ring-landing-line focus-visible:ring-[3px] focus-visible:ring-landing-green/30"
            />
          </label>
        </div>

        {tag && (
          <p className="mt-4 flex items-center gap-2 text-sm text-landing-muted">
            Thẻ:
            <button type="button" onClick={() => reset(() => setTag(null))} className="inline-flex items-center gap-1 rounded-full bg-landing-ink px-3 py-1 text-xs font-semibold text-white">
              #{tag} <X className="size-3" aria-label="Bỏ thẻ" />
            </button>
          </p>
        )}

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex flex-col gap-8">
            {featured && <FeaturedPost post={featured} />}

            {filtered.length === 0 ? (
              <Card className="text-center">
                <p className="font-landing-heading text-xl font-bold">Chưa có bài viết phù hợp</p>
                <p className="mt-2 text-sm text-landing-muted">Thử từ khoá khác, hoặc xem tất cả chủ đề.</p>
                <button type="button" onClick={() => reset(() => (setQuery(""), setCategory(null), setTag(null)))} className="mt-4 text-sm font-semibold text-landing-green-deep">
                  Xem tất cả bài viết
                </button>
              </Card>
            ) : (
              <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {shown.map((post) => (
                  <li key={post.slug}>
                    <PostCard post={post} onTag={(value) => reset(() => setTag(value))} />
                  </li>
                ))}
              </ul>
            )}

            {pages > 1 && (
              <nav aria-label="Phân trang" className="flex items-center justify-center gap-2">
                <button type="button" disabled={page === 1} onClick={() => setPage(page - 1)} className={pager} aria-label="Trang trước">
                  <ChevronLeft className="size-4" aria-hidden />
                </button>
                {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                  <button key={n} type="button" onClick={() => setPage(n)} aria-current={n === page ? "page" : undefined} className={cn(pager, n === page && "bg-landing-ink text-white")}>
                    {n}
                  </button>
                ))}
                <button type="button" disabled={page === pages} onClick={() => setPage(page + 1)} className={pager} aria-label="Trang sau">
                  <ChevronRight className="size-4" aria-hidden />
                </button>
              </nav>
            )}
          </div>

          {/* Sidebar */}
          <aside className="flex flex-col gap-5">
            <Card className="bg-landing-green-night text-white ring-0">
              <p className="font-landing-heading text-xl font-bold">Nhận bài mới mỗi tháng</p>
              <p className="mt-2 text-sm text-landing-lime-mist/90">Một email gọn: mẹo in, giấy mới và ưu đãi in mẫu. Huỷ bất cứ lúc nào.</p>
              <EmailCapture
                list="blog"
                cta="Đăng ký"
                tone="dark"
                className="mt-4"
                done="Đã ghi nhận email trên thiết bị này. Bản tin sẽ gửi khi WrapFit mở danh sách thư."
              />
            </Card>
            <Card>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-landing-muted">Thẻ phổ biến</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {tags.map((value) => (
                  <button key={value} type="button" onClick={() => reset(() => setTag(value))} className={cn("rounded-full px-3 py-1 text-xs font-medium ring-1 ring-landing-line transition-colors", tag === value ? "bg-landing-ink text-white ring-landing-ink" : "bg-landing-canvas text-landing-ink hover:bg-landing-tile")}>
                    #{value}
                  </button>
                ))}
              </div>
            </Card>
            <Card>
              <p className="font-landing-heading text-lg font-bold">Thử ngay điều bạn vừa đọc</p>
              <p className="mt-1 text-sm text-landing-muted">Studio dùng thử dựng khuôn và hộp 3D, không cần tài khoản.</p>
              <Link href="/editor/demo" className="mt-4 inline-flex text-sm font-semibold text-landing-green-deep hover:text-landing-green">
                Mở studio dùng thử →
              </Link>
            </Card>
          </aside>
        </div>
      </Container>
    </SitePage>
  );
}

const chip = (active: boolean) =>
  cn(
    "h-9 shrink-0 rounded-full px-4 text-sm font-medium transition-colors",
    active ? "bg-landing-ink text-white" : "bg-white text-landing-ink ring-1 ring-landing-line hover:bg-landing-tile/60"
  );
const pager = "inline-flex size-10 items-center justify-center rounded-full bg-white text-sm font-semibold ring-1 ring-landing-line transition-colors hover:bg-landing-tile disabled:opacity-40";

function Meta({ post }: { post: BlogPost }) {
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-landing-muted">
      <span className="font-semibold text-landing-ink">{post.author.name}</span>
      <span aria-hidden>·</span>
      <time dateTime={post.date}>{formatPostDate(post.date)}</time>
      <span aria-hidden>·</span>
      <span className="inline-flex items-center gap-1">
        <Clock className="size-3" aria-hidden /> {post.readMinutes} phút đọc
      </span>
    </p>
  );
}

function FeaturedPost({ post }: { post: BlogPost }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group grid grid-cols-1 overflow-hidden rounded-card bg-white ring-1 ring-landing-ink/10 transition-shadow hover:shadow-soft-16 md:grid-cols-2">
      <BlogCover post={post} className="aspect-[4/3] md:aspect-auto md:min-h-[320px]" />
      <div className="flex flex-col justify-center gap-3 p-6 sm:p-8">
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-fpt-orange-ink">Nổi bật · {BLOG_CATEGORIES[post.category]}</span>
        <h2 className="font-landing-heading text-2xl font-bold leading-tight tracking-tight group-hover:underline sm:text-3xl">{post.title}</h2>
        <p className="text-sm leading-relaxed text-landing-muted sm:text-base">{post.subtitle}</p>
        <Meta post={post} />
      </div>
    </Link>
  );
}

function PostCard({ post, onTag }: { post: BlogPost; onTag: (tag: string) => void }) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-card bg-white ring-1 ring-landing-ink/10 transition-shadow hover:shadow-soft-16">
      <Link href={`/blog/${post.slug}`} className="group flex flex-1 flex-col">
        <BlogCover post={post} className="aspect-[16/10]" />
        <div className="flex flex-1 flex-col gap-2 p-5">
          <span className="text-xs font-semibold text-landing-green-deep">{BLOG_CATEGORIES[post.category]}</span>
          <h3 className="font-landing-heading text-lg font-bold leading-snug group-hover:underline">{post.title}</h3>
          <p className="line-clamp-2 text-sm text-landing-muted">{post.subtitle}</p>
          <div className="mt-auto pt-2">
            <Meta post={post} />
          </div>
        </div>
      </Link>
      <div className="flex flex-wrap gap-1.5 px-5 pb-5">
        {post.tags.slice(0, 3).map((value) => (
          <button key={value} type="button" onClick={() => onTag(value)} className="inline-flex min-h-6 items-center rounded-full bg-landing-canvas px-2.5 py-0.5 text-caption text-landing-muted hover:text-landing-ink">
            #{value}
          </button>
        ))}
      </div>
    </article>
  );
}

"use client";

import { Check, Clock, Facebook, Lightbulb, Link2, MessageCircle } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { Container, Reveal } from "@/components/landing";
import { Card, EmailCapture, PRIMARY_CTA, SECONDARY_CTA, SitePage } from "@/components/site";
import { BLOG_CATEGORIES, BLOG_POSTS, formatPostDate, type BlogBlock, type BlogPost } from "@/features/site/blog";
import { Breadcrumb } from "@/components/ui";
import { cn } from "@/utils/helpers";
import { BlogCover } from "./BlogCover";

/** `/blog/[slug]`: one article, with sharing, a studio call to action, related articles and comments. */
export default function BlogPostPage({ post }: { post: BlogPost }) {
  const related = BLOG_POSTS.filter((other) => other.slug !== post.slug)
    .map((other) => ({ other, score: Number(other.category === post.category) * 2 + other.tags.filter((tag) => post.tags.includes(tag)).length }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ other }) => other);
  const headings = post.body.filter((block): block is Extract<BlogBlock, { type: "h2" }> => block.type === "h2");

  return (
    <SitePage>
      <article>
        <header className="bg-gradient-to-b from-white to-landing-canvas pb-10 pt-28 sm:pt-32">
          <Container className="max-w-4xl">
            <Breadcrumb
              items={[
                { label: "Trang chủ", href: "/" },
                { label: "Blog", href: "/blog" },
                { label: BLOG_CATEGORIES[post.category], href: `/blog?category=${post.category}` },
                { label: post.title },
              ]}
            />
            <Reveal variant="text" className="mt-6 flex flex-col gap-4">
              <Link href={`/blog?category=${post.category}`} className="w-fit text-overline uppercase text-fpt-orange-ink">
                {BLOG_CATEGORIES[post.category]}
              </Link>
              <h1 className="font-landing-heading text-display text-fg">{post.title}</h1>
              <p className="text-body-lg text-fg-muted">{post.subtitle}</p>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <span className="inline-flex size-10 items-center justify-center rounded-full bg-landing-green-night font-landing-heading text-sm font-bold text-landing-lime">
                  {post.author.name.split(" ").pop()?.[0]}
                </span>
                <div className="text-sm">
                  <p className="font-semibold">{post.author.name}</p>
                  <p className="text-landing-muted">
                    {post.author.role} · <time dateTime={post.date}>{formatPostDate(post.date)}</time> ·{" "}
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3" aria-hidden /> {post.readMinutes} phút đọc
                    </span>
                  </p>
                </div>
              </div>
            </Reveal>
          </Container>
        </header>

        <Container className="max-w-4xl">
          <BlogCover post={post} className="aspect-[16/8] rounded-card" />
        </Container>

        <Container className="grid max-w-6xl grid-cols-1 gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_240px] lg:py-14">
          <div className="mx-auto w-full max-w-[720px]">
            <div className="flex flex-col gap-5 text-body-lg leading-8 text-landing-ink/90">
              {post.body.map((block, index) => (
                <Block key={index} block={block} />
              ))}
            </div>

            <div className="mt-10 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-landing-muted ring-1 ring-landing-line">
                  #{tag}
                </span>
              ))}
            </div>

            <Share post={post} className="mt-6" />

            {/* Lead conversion */}
            <div className="mt-10 rounded-card bg-landing-green-night p-6 text-white sm:p-8">
              <p className="font-landing-heading text-2xl font-bold">Dựng khuôn cho món quà của bạn</p>
              <p className="mt-2 text-sm leading-relaxed text-landing-lime-mist/90">
                Nhập dài × rộng × cao, chọn giấy: WrapFit dựng khuôn bế đã cộng độ dày giấy, kiểm tra FitCheck™ và cho xem hộp gấp 3D.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href="/editor/demo" className={PRIMARY_CTA}>
                  Mở studio dùng thử
                </Link>
                <Link href="/auth/register" className="inline-flex h-10 items-center rounded-full border border-white/25 px-5 text-sm font-semibold text-white hover:bg-white/10">
                  Tạo tài khoản miễn phí
                </Link>
              </div>
            </div>

            <Comments slug={post.slug} />
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-24 flex flex-col gap-5">
              {headings.length > 0 && (
                <nav aria-label="Trong bài" className="rounded-3xl bg-white p-5 ring-1 ring-landing-ink/10">
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-landing-muted">Trong bài</p>
                  <ul className="flex flex-col gap-1 text-sm">
                    {headings.map((heading) => (
                      <li key={heading.id}>
                        <a href={`#${heading.id}`} className="block rounded-lg px-2 py-1 hover:bg-landing-canvas">
                          {heading.text}
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
              )}
              <Card className="p-5">
                <p className="font-landing-heading text-base font-bold">Bản tin WrapFit</p>
                <p className="mt-1 text-xs text-landing-muted">Bài mới và mẹo in, mỗi tháng một lần.</p>
                <EmailCapture list="blog" cta="Đăng ký" className="mt-3" done="Đã ghi nhận email trên thiết bị này." />
              </Card>
            </div>
          </aside>
        </Container>
      </article>

      <section className="pb-16">
        <Container>
          <h2 className="font-landing-heading text-2xl font-bold tracking-tight lg:text-3xl">Bài viết liên quan</h2>
          <ul className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
            {related.map((other) => (
              <li key={other.slug}>
                <Link href={`/blog/${other.slug}`} className="group flex h-full flex-col overflow-hidden rounded-card bg-white ring-1 ring-landing-ink/10 hover:shadow-soft-16">
                  <BlogCover post={other} className="aspect-[16/10]" />
                  <div className="flex flex-col gap-1.5 p-5">
                    <span className="text-xs font-semibold text-landing-green-deep">{BLOG_CATEGORIES[other.category]}</span>
                    <p className="font-landing-heading text-lg font-bold leading-snug group-hover:underline">{other.title}</p>
                    <time dateTime={other.date} className="text-xs text-landing-muted">
                      {formatPostDate(other.date)}
                    </time>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </section>
    </SitePage>
  );
}

function Block({ block }: { block: BlogBlock }) {
  switch (block.type) {
    case "p":
      return <p>{block.text}</p>;
    case "h2":
      return (
        <h2 id={block.id} className="scroll-mt-24 pt-4 font-landing-heading text-2xl font-bold leading-tight tracking-tight text-landing-ink">
          {block.text}
        </h2>
      );
    case "list":
      return (
        <ul className="flex list-disc flex-col gap-1.5 pl-6 marker:text-landing-green">
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case "steps":
      return (
        <ol className="flex flex-col gap-3">
          {block.items.map((item, index) => (
            <li key={item.title} className="flex gap-4 rounded-2xl bg-white p-4 ring-1 ring-landing-ink/10">
              <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-landing-lime font-landing-heading text-sm font-bold text-landing-green-night">
                {index + 1}
              </span>
              <span>
                <span className="block font-semibold text-landing-ink">{item.title}</span>
                <span className="block text-base leading-7 text-landing-muted">{item.text}</span>
              </span>
            </li>
          ))}
        </ol>
      );
    case "quote":
      return (
        <figure className="border-l-4 border-fpt-orange pl-5">
          <blockquote className="font-landing-heading text-xl font-semibold leading-snug text-landing-ink">&ldquo;{block.text}&rdquo;</blockquote>
          <figcaption className="mt-2 text-sm text-landing-muted">— {block.cite}</figcaption>
        </figure>
      );
    case "tip":
      return (
        <div className="flex gap-3 rounded-2xl bg-landing-lime-mist p-5">
          <Lightbulb className="mt-1 size-5 shrink-0 text-landing-green-deep" aria-hidden />
          <div>
            <p className="font-semibold text-landing-green-night">{block.title}</p>
            <p className="text-base leading-7 text-landing-green-deep">{block.text}</p>
          </div>
        </div>
      );
    case "table":
      return (
        <div className="-mx-4 overflow-x-auto px-4">
          <table className="w-full min-w-[520px] overflow-hidden rounded-2xl bg-white text-left text-sm ring-1 ring-landing-ink/10">
            <thead className="bg-landing-tile/60 text-xs uppercase tracking-wide text-landing-muted">
              <tr>
                {block.head.map((cell) => (
                  <th key={cell} scope="col" className="px-4 py-3 font-semibold">
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-landing-line/60">
              {block.rows.map((row) => (
                <tr key={row[0]}>
                  {row.map((cell, index) => (
                    <td key={index} className={cn("px-4 py-3 leading-6", index === 0 && "font-semibold text-landing-ink")}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

function Share({ post, className }: { post: BlogPost; className?: string }) {
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState(`/blog/${post.slug}`);
  useEffect(() => setUrl(`${window.location.origin}/blog/${post.slug}`), [post.slug]);
  const encoded = encodeURIComponent(url);
  const button = "inline-flex h-9 items-center gap-1.5 rounded-full bg-white px-3.5 text-sm font-medium ring-1 ring-landing-line transition-colors hover:bg-landing-tile/60";

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="mr-1 text-sm font-semibold">Chia sẻ:</span>
      <button
        type="button"
        className={button}
        onClick={() =>
          navigator.clipboard?.writeText(url).then(
            () => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1800);
            },
            () => undefined
          )
        }
      >
        {copied ? <Check className="size-4 text-landing-green" aria-hidden /> : <Link2 className="size-4" aria-hidden />}
        {copied ? "Đã chép liên kết" : "Chép liên kết"}
      </button>
      <a className={button} href={`https://www.facebook.com/sharer/sharer.php?u=${encoded}`} target="_blank" rel="noopener noreferrer">
        <Facebook className="size-4" aria-hidden /> Facebook
      </a>
      <a className={button} href={`https://zalo.me/share/url?url=${encoded}`} target="_blank" rel="noopener noreferrer">
        <MessageCircle className="size-4" aria-hidden /> Zalo
      </a>
    </div>
  );
}

interface Comment {
  name: string;
  text: string;
  at: string;
}

/** Comments: the API has none yet, so they stay on this device and the section says so. */
function Comments({ slug }: { slug: string }) {
  const key = `wrapfit:comments:${slug}`;
  const [comments, setComments] = useState<Comment[]>([]);
  const [name, setName] = useState("");
  const [text, setText] = useState("");

  useEffect(() => {
    try {
      setComments(JSON.parse(localStorage.getItem(key) ?? "[]"));
    } catch {
      setComments([]);
    }
  }, [key]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!text.trim()) return;
    const next = [...comments, { name: name.trim() || "Bạn", text: text.trim(), at: new Date().toISOString() }];
    setComments(next);
    setText("");
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // Private mode: the comment shows until the page is closed.
    }
  };

  return (
    <section aria-labelledby="comments" className="mt-12">
      <h2 id="comments" className="font-landing-heading text-2xl font-bold tracking-tight">
        Bình luận {comments.length > 0 && <span className="text-landing-muted">({comments.length})</span>}
      </h2>
      <p className="mt-1 text-sm text-landing-muted">
        Bình luận công khai sẽ mở cùng tài khoản WrapFit; hiện bình luận được lưu trên thiết bị của bạn. Cần hỏi gấp?{" "}
        <Link href="/contact" className="font-semibold text-landing-green-deep">
          Liên hệ đội ngũ
        </Link>
        .
      </p>
      {comments.length > 0 && (
        <ul className="mt-5 flex flex-col gap-3">
          {comments.map((comment) => (
            <li key={comment.at} className="rounded-2xl bg-white p-4 ring-1 ring-landing-ink/10">
              <p className="text-sm font-semibold">
                {comment.name} <span className="font-normal text-landing-muted">· {new Date(comment.at).toLocaleDateString("vi-VN")}</span>
              </p>
              <p className="mt-1 text-sm leading-6">{comment.text}</p>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={submit} className="mt-5 flex flex-col gap-3 rounded-2xl bg-white p-4 ring-1 ring-landing-ink/10">
        <label className="text-sm font-medium">
          Tên hiển thị
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={60} placeholder="Tiệm nến Mộc" className="mt-1 h-10 w-full rounded-xl bg-landing-canvas px-3 text-sm outline-none ring-1 ring-landing-line focus-visible:ring-landing-green" />
        </label>
        <label className="text-sm font-medium">
          Bình luận
          <textarea value={text} onChange={(event) => setText(event.target.value)} rows={3} maxLength={1000} placeholder="Chia sẻ kinh nghiệm hoặc đặt câu hỏi…" className="mt-1 w-full rounded-xl bg-landing-canvas p-3 text-sm outline-none ring-1 ring-landing-line focus-visible:ring-landing-green" />
        </label>
        <button type="submit" disabled={!text.trim()} className={cn(SECONDARY_CTA, "self-end disabled:opacity-50")}>
          Gửi bình luận
        </button>
      </form>
    </section>
  );
}

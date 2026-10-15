import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BLOG_POSTS, findPost } from "@/features/site/blog";
import BlogPostPage from "@/views/blog/post";

type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const post = findPost((await params).slug);
  if (!post) return { title: "Không tìm thấy bài viết — WrapFit" };
  return {
    title: `${post.title} — Blog WrapFit`,
    description: post.subtitle,
    openGraph: { title: post.title, description: post.subtitle, type: "article", publishedTime: post.date, authors: [post.author.name] },
  };
}

export default async function Page({ params }: { params: Params }) {
  const post = findPost((await params).slug);
  if (!post) notFound();
  return <BlogPostPage post={post} />;
}

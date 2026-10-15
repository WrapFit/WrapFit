"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { listCommunityTemplates, listCuratedTemplates } from "@/api/templates";
import { ALL_ARTICLES } from "@/components/support/articles";
import { RESOURCE_LINKS, STUDIO_LINKS } from "@/components/layout/navigation";
import { useDebouncedValue } from "@/features/dashboard/useDebouncedValue";
import { useBoxStructures } from "@/features/templates/hooks";
import type { SearchSuggestion } from "@/components/ui";

// Whole-site search of the header box. Templates come from the API (`GET /templates/hub?q=`, curated and community),
// structures from `GET /templates/structures`; help answers and pages are searched here.

export type SiteResultKind = "template" | "structure" | "help" | "page";

const KIND_LABEL: Record<SiteResultKind, string> = { template: "Mẫu hộp", structure: "Cấu trúc", help: "Hỗ trợ", page: "Trang" };

const PAGES = [
  ...STUDIO_LINKS,
  ...RESOURCE_LINKS,
  { label: "Tính năng", href: "/features", description: "Khuôn bế, 3D, FitCheck™, file in, hoa văn AI" },
  { label: "Khách hàng nói gì", href: "/testimonials", description: "Câu chuyện của người bán quà" },
  { label: "Trạng thái hệ thống", href: "/status", description: "API, cơ sở dữ liệu, xuất file in" },
  { label: "Bảo mật", href: "/security", description: "Mã hoá, phân quyền, báo cáo lỗ hổng" },
  { label: "Giỏ in mẫu", href: "/cart", description: "Đặt hộp mẫu thử từ dự án của bạn" },
  { label: "Chính sách quyền riêng tư", href: "/legal/privacy", description: "Dữ liệu WrapFit thu thập và cách dùng" },
  { label: "Điều khoản sử dụng", href: "/legal/terms", description: "Tài khoản, file in, màu in, hoàn tiền" },
];

/** Lower case without Vietnamese accents: "hop qua" finds "Hộp quà". */
export const foldText = (text: string) =>
  text.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();

/** Every word must appear; a word in the title counts three times. */
function scoreOf(words: string[], title: string, text: string): number {
  const t = foldText(title);
  const b = foldText(text);
  let score = 0;
  for (const word of words) {
    if (t.includes(word)) score += 3;
    else if (b.includes(word)) score += 1;
    else return 0;
  }
  return score;
}

interface Result {
  key: string;
  kind: SiteResultKind;
  title: string;
  href: string;
  score: number;
}

/** Suggestions for what is typed, best first; `searching` while the template API answers. */
export function useSiteSearch(query: string, limit = 8): { suggestions: SearchSuggestion[]; searching: boolean } {
  const debounced = useDebouncedValue(query.trim(), 250);
  const words = useMemo(() => foldText(debounced).split(/\s+/).filter(Boolean), [debounced]);
  const enabled = debounced.length >= 2;
  const curated = useQuery({ queryKey: ["site-search", "curated", debounced], queryFn: () => listCuratedTemplates({ q: debounced, limit: 4 }), enabled, placeholderData: keepPreviousData, staleTime: 60_000 });
  const community = useQuery({ queryKey: ["site-search", "community", debounced], queryFn: () => listCommunityTemplates({ q: debounced, limit: 3 }), enabled, placeholderData: keepPreviousData, staleTime: 60_000 });
  const structures = useBoxStructures();

  const suggestions = useMemo<SearchSuggestion[]>(() => {
    if (!words.length) return [];
    const out: Result[] = [];
    for (const card of enabled ? curated.data?.items ?? [] : []) {
      out.push({ key: `c-${card.id}`, kind: "template", title: card.title, href: `/templates?q=${encodeURIComponent(card.title)}`, score: Math.max(1, scoreOf(words, card.title, [card.description, card.structure.name, ...card.tags].join(" "))) });
    }
    for (const card of enabled ? community.data?.items ?? [] : []) {
      out.push({ key: `p-${card.slug}`, kind: "template", title: card.title, href: `/p/${card.slug}`, score: Math.max(1, scoreOf(words, card.title, [card.structure.name, ...card.tags].join(" "))) });
    }
    for (const structure of structures.data ?? []) {
      const score = scoreOf(words, structure.name, structure.description ?? "");
      if (score) out.push({ key: `s-${structure.id}`, kind: "structure", title: structure.name, href: `/structures/${structure.id}`, score: score + 1 });
    }
    for (const article of ALL_ARTICLES) {
      const score = scoreOf(words, article.title, article.body.join(" "));
      if (score) out.push({ key: `h-${article.id}`, kind: "help", title: article.title, href: `/support?a=${article.id}`, score });
    }
    for (const page of PAGES) {
      const score = scoreOf(words, page.label, page.description ?? "");
      if (score) out.push({ key: `g-${page.href}`, kind: "page", title: page.label, href: page.href, score });
    }
    const seen = new Set<string>();
    return out
      .sort((a, b) => b.score - a.score)
      .filter((result) => (seen.has(result.href) ? false : (seen.add(result.href), true)))
      .slice(0, limit)
      .map((result) => ({ id: result.key, label: result.title, hint: KIND_LABEL[result.kind], href: result.href }));
  }, [words, enabled, curated.data, community.data, structures.data, limit]);

  return { suggestions, searching: enabled && (curated.isFetching || community.isFetching) };
}

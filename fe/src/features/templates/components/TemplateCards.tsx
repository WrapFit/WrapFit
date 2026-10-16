"use client";

import { ArrowRight, Eye, GitFork, Heart, ShieldCheck } from "lucide-react";
import Link from "next/link";
import React from "react";
import { PRIMARY_BUTTON } from "@/components/common/StatusViews";
import { ROUTES } from "@/constants";
import type { CommunityCard, CuratedCard, Industry, Occasion } from "@/types/api";
import {
  authorName,
  formatCount,
  formatDimensions,
  formatMaterial,
  INDUSTRY_LABELS,
  OCCASION_LABELS,
} from "../labels";
import { AuthorAvatar } from "./AuthorAvatar";
import { DesignThumb } from "./DesignThumb";

const CARD =
  "group flex h-full flex-col overflow-hidden rounded-3xl border border-line/80 bg-white/85 shadow-tactile backdrop-blur-md transition duration-300 motion-reduce:transition-none";

/** Link of the "use this template" button: the project wizard starts from the curated design. */
export function templateHref(id: string): string {
  return `${ROUTES.editorNew}?template=${encodeURIComponent(id)}`;
}

function Preview({ card, label }: { card: CuratedCard | CommunityCard; label: string }) {
  return (
    <div className="relative aspect-[4/3] border-b border-line/70 bg-paper-cotton p-5">
      <DesignThumb
        thumbnailUrl={card.thumbnailUrl}
        structure={card.structure.id}
        dimensions={card.dimensions}
        materialSpec={card.materialSpec}
        alt={label}
      />
      <span className="absolute left-3 top-3 max-w-[70%] truncate rounded-full border border-line/80 bg-white/90 px-2.5 py-1 font-mono text-cad-spec-micro uppercase tracking-wider text-fg-muted backdrop-blur-md">
        {card.structure.name}
      </span>
    </div>
  );
}

/** mm readout and paper stock of a design. */
function Specs({ card }: { card: CuratedCard | CommunityCard }) {
  return (
    <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-cad-spec-micro text-fg-muted">
      <span className="text-fg-muted">{formatDimensions(card.dimensions)}</span>
      {card.materialSpec && (
        <>
          <span aria-hidden className="text-white/75">
            /
          </span>
          <span>{formatMaterial(card.materialSpec)}</span>
        </>
      )}
    </p>
  );
}

export function TagChips({ occasion, industry }: { occasion: Occasion | null; industry: Industry | null }) {
  if (!occasion && !industry) return null;
  return (
    <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Dịp và ngành hàng">
      {occasion && (
        <li className="rounded-full border border-brand-gold/40 bg-brand-gold-light/50 px-2.5 py-0.5 text-caption font-medium text-brand-espresso">
          {OCCASION_LABELS[occasion]}
        </li>
      )}
      {industry && (
        <li className="rounded-full border border-line bg-paper-linen px-2.5 py-0.5 text-caption font-medium text-fg-muted">
          {INDUSTRY_LABELS[industry]}
        </li>
      )}
    </ul>
  );
}

/** A WrapFit Curated design: starts a new project from it. */
export function CuratedTemplateCard({ template }: { template: CuratedCard }) {
  const href = templateHref(template.id);
  return (
    <article className={`${CARD} hover:-translate-y-0.5 hover:shadow-tactile-lg motion-reduce:hover:translate-y-0`}>
      <Preview card={template} label={`Mẫu ${template.title}`} />
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-landing-heading text-xl leading-snug tracking-tight text-fg">{template.title}</h3>
        {template.description && (
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-fg-muted">{template.description}</p>
        )}
        <Specs card={template} />
        <TagChips occasion={template.occasion} industry={template.industry} />
        <div className="mt-auto flex items-center justify-between gap-3 pt-5">
          <span className="font-mono text-cad-spec-micro text-fg-muted">{formatCount(template.usesCount)} lượt dùng</span>
          <Link href={href} className={PRIMARY_BUTTON} aria-label={`Dùng mẫu ${template.title}`}>
            Dùng mẫu này
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </article>
  );
}

/** A PUBLIC project of the community: opens its public 3D page. */
export function CommunityTemplateCard({ project }: { project: CommunityCard }) {
  return (
    <Link
      href={ROUTES.publicProject(project.slug)}
      className={`${CARD} hover:-translate-y-0.5 hover:shadow-tactile-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-forest/40 motion-reduce:hover:translate-y-0`}
    >
      <Preview card={project} label={`Thiết kế ${project.title}`} />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-landing-heading text-xl leading-snug tracking-tight text-fg">{project.title}</h3>
          {project.fitcheckScore !== null && (
            <span
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-forest/10 px-2 py-0.5 font-mono text-cad-spec-micro font-bold text-brand-forest"
              title="Điểm FitCheck™ của bản in"
            >
              <ShieldCheck className="h-3 w-3" aria-hidden />
              {project.fitcheckScore}
            </span>
          )}
        </div>
        <div className="mt-2 flex items-center gap-2 text-sm text-fg-muted">
          <AuthorAvatar author={project.author} />
          <span className="truncate">{authorName(project.author)}</span>
        </div>
        <Specs card={project} />
        <TagChips occasion={project.occasion} industry={project.industry} />
        <dl className="mt-auto flex items-center gap-4 pt-5 font-mono text-cad-spec-micro text-fg-muted">
          <div className="flex items-center gap-1" title="Lượt thích">
            <dt className="sr-only">Lượt thích</dt>
            <Heart className="h-3.5 w-3.5 text-vibrant-coral" aria-hidden />
            <dd>{formatCount(project.likesCount)}</dd>
          </div>
          <div className="flex items-center gap-1" title="Lượt xem">
            <dt className="sr-only">Lượt xem</dt>
            <Eye className="h-3.5 w-3.5" aria-hidden />
            <dd>{formatCount(project.viewsCount)}</dd>
          </div>
          <div className="flex items-center gap-1" title="Bản phối lại">
            <dt className="sr-only">Bản phối lại</dt>
            <GitFork className="h-3.5 w-3.5" aria-hidden />
            <dd>{formatCount(project.usesCount)}</dd>
          </div>
        </dl>
      </div>
    </Link>
  );
}

/** Placeholder card while a section loads. */
export function TemplateCardSkeleton() {
  return (
    <div aria-hidden className="flex flex-col overflow-hidden rounded-3xl border border-line/80 bg-white/70">
      <div className="aspect-[4/3] animate-pulse bg-paper-linen motion-reduce:animate-none" />
      <div className="space-y-3 p-5">
        <div className="h-5 w-2/3 animate-pulse rounded-full bg-line/70 motion-reduce:animate-none" />
        <div className="h-3 w-full animate-pulse rounded-full bg-line/60 motion-reduce:animate-none" />
        <div className="h-3 w-1/2 animate-pulse rounded-full bg-line/60 motion-reduce:animate-none" />
      </div>
    </div>
  );
}

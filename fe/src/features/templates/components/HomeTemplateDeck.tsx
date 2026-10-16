"use client";
/* ds-artwork: paper and ink colours of the Stitch home deck (Playfair look), drawn like printed cards. Raw colours and sizes here are allowed (docs/15_DESIGN_SYSTEM.md §2). */

import Link from "next/link";
import React, { useRef, useState } from "react";
import { EmptyState, ErrorState, PRIMARY_BUTTON } from "@/components/common/StatusViews";
import { ROUTES } from "@/constants";
import type { CuratedCard } from "@/types/api";
import { useCuratedTemplates } from "../hooks";
import { formatDimensions, formatMaterial } from "../labels";
import { DesignThumb } from "./DesignThumb";
import { templateHref } from "./TemplateCards";
import { Icon } from "@/components/ui";

const DECK_SIZE = 6;
const SWIPE_PX = 40;

/** Signed distance of a card from the selected one around the ring, so the deck has cards on both sides. */
function ringOffset(index: number, current: number, count: number): number {
  const half = Math.floor(count / 2);
  return ((index - current + count + half) % count) - half;
}

/** Position of a card in the stacked deck, `offset` cards away from the selected one. */
function deckStyle(offset: number): React.CSSProperties {
  const selected = offset === 0;
  // The card at the back of the ring stays hidden: it is the one that crosses over when the deck wraps around.
  const hidden = Math.abs(offset) > 2;
  return {
    willChange: "transform, opacity, filter",
    transform: selected
      ? "translate(-50%, -50%) scale(1.05)"
      : `translate(calc(-50% + ${offset * 310}px), -50%) scale(${Math.max(0.7, 1.05 - Math.abs(offset) * 0.15)})`,
    left: "50%",
    zIndex: selected ? 35 : 25 - Math.abs(offset) * 10,
    opacity: hidden ? 0 : selected ? 1 : Math.max(0.3, 1 - Math.abs(offset) * 0.25),
    filter: selected ? "blur(0px)" : `blur(${Math.abs(offset) * 1.5}px)`,
    pointerEvents: hidden ? "none" : "auto",
  };
}

// Same easing as the original deck; reduced motion users get the cards without the slide.
const DECK_MOTION = "transition-all duration-[650ms] ease-[cubic-bezier(0.25,1,0.35,1)] motion-reduce:transition-none";

/**
 * Content of the home `#thu-vien-mau` section: the 6 first WrapFit Curated designs in the 360° stacked deck. The
 * section element itself stays in views/home.
 */
export function HomeTemplateDeck() {
  const curated = useCuratedTemplates({ limit: DECK_SIZE });
  const cards = curated.data?.items ?? [];
  const [active, setActive] = useState(0);
  const touchX = useRef<number | null>(null);
  const count = cards.length;
  const current = count ? Math.min(active, count - 1) : 0;

  const step = (delta: number) => {
    if (count) setActive((current + delta + count) % count);
  };

  return (
    <>
      {/*  Minimalist Title Header  */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-[#133020]"></span>
            <span className="font-cad-spec-micro text-cad-spec-micro uppercase tracking-widest text-[#4d6657] font-semibold">WRAPFIT TUYỂN CHỌN</span>
          </div>
          <h2 className="font-headline-lg text-[32px] md:text-[40px] text-brand-forest-deep font-landing-heading font-medium tracking-tight">
            Thư Viện Cấu Trúc Mẫu
          </h2>
          <p className="font-body-md text-sm md:text-base text-[#485950] mt-1 font-landing-body">
            Mẫu hộp dựng sẵn trên 4 cấu trúc chuẩn ECMA/FEFCO. Chọn một mẫu, đổi kích thước theo món quà và xuất dieline vector sẵn sàng sản xuất.
          </p>
        </div>

        {/*  Apple-style Navigation Controls (Infinite Wrap) */}
        <div className="flex items-center gap-3 self-end md:self-auto shrink-0">
          <Link
            href={ROUTES.templates}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 px-5 rounded-full whitespace-nowrap bg-white/80 hover:bg-white text-[#152e22] text-sm font-medium border border-[#e3ded6] shadow-xs transition-all active:scale-95"
          >
            Xem tất cả
            <Icon name="arrow_forward" className="size-4 text-stitch-forest" />
          </Link>
          <button
            type="button"
            aria-label="Mẫu trước"
            disabled={count < 2}
            onClick={() => step(-1)}
            className="w-11 h-11 rounded-full bg-white/90 hover:bg-white border border-[#ded7cb] text-[#152e22] shadow-xs backdrop-blur-md flex items-center justify-center transition-all hover:scale-105 active:scale-90 disabled:opacity-40 disabled:hover:scale-100"
          >
            <Icon name="arrow_back" className="size-5" />
          </button>
          <button
            type="button"
            aria-label="Mẫu tiếp theo"
            disabled={count < 2}
            onClick={() => step(1)}
            className="w-11 h-11 rounded-full bg-white/90 hover:bg-white border border-[#ded7cb] text-[#152e22] shadow-xs backdrop-blur-md flex items-center justify-center transition-all hover:scale-105 active:scale-90 disabled:opacity-40 disabled:hover:scale-100"
          >
            <Icon name="arrow_forward" className="size-5" />
          </button>
        </div>
      </div>

      {/*  Continuous Circular Carousel Stage  */}
      <div className="relative w-full py-2 select-none">
        <div
          className="relative w-full h-[500px] md:h-[530px] flex items-center justify-center overflow-visible"
          id="coverflowContainer"
          aria-roledescription="carousel"
          aria-label="Mẫu WrapFit tuyển chọn"
          onTouchStart={(event) => (touchX.current = event.touches[0]?.clientX ?? null)}
          onTouchEnd={(event) => {
            const start = touchX.current;
            const end = event.changedTouches[0]?.clientX;
            touchX.current = null;
            if (start === null || end === undefined || Math.abs(end - start) < SWIPE_PX) return;
            step(end < start ? 1 : -1);
          }}
        >
          {curated.isPending ? (
            <DeckSkeleton />
          ) : curated.isError && !count ? (
            <ErrorState
              error={curated.error}
              title="Chưa tải được thư viện mẫu"
              onRetry={() => void curated.refetch()}
              retrying={curated.isFetching}
              className="relative z-40"
            />
          ) : !count ? (
            <EmptyState
              title="Thư viện đang được chuẩn bị"
              description="Các mẫu WrapFit tuyển chọn sẽ xuất hiện ở đây."
              className="relative z-40"
            />
          ) : (
            cards.map((card, idx) => (
              <DeckCard
                key={card.id}
                card={card}
                offset={ringOffset(idx, current, count)}
                position={`${idx + 1} / ${count}`}
                onSelect={() => setActive(idx)}
              />
            ))
          )}
        </div>

        {/*  Apple-style Minimal Pagination Dots  */}
        {count > 1 && (
          <div className="flex items-center justify-center mt-6" id="coverflowDots">
            {cards.map((card, idx) => (
              <button
                key={card.id}
                type="button"
                aria-label={`Xem mẫu ${idx + 1}: ${card.title}`}
                aria-current={current === idx}
                onClick={() => setActive(idx)}
                className="group flex h-11 w-11 items-center justify-center"
              >
                <span
                  className={`block transition-all duration-300 rounded-full ${
                    current === idx ? "h-2.5 w-7 bg-[#133020]" : "w-2.5 h-2.5 bg-[#cfc5b3] group-hover:bg-[#8e8574]"
                  }`}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function DeckCard({
  card,
  offset,
  position,
  onSelect,
}: {
  card: CuratedCard;
  offset: number;
  position: string;
  onSelect: () => void;
}) {
  const isSelected = offset === 0;
  // A card behind the selected one is a button that brings it forward; the selected card holds the CTA link.
  const selectProps = isSelected
    ? { "aria-roledescription": "slide", "aria-label": `${position}: ${card.title}` }
    : {
        role: "button",
        // The hidden card at the back of the ring is out of the tab order too.
        tabIndex: Math.abs(offset) > 2 ? -1 : 0,
        "aria-hidden": Math.abs(offset) > 2 || undefined,
        "aria-label": `Xem mẫu ${card.title}`,
        onClick: onSelect,
        onKeyDown: (event: React.KeyboardEvent) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect();
          }
        },
      };

  return (
    <div
      className={`coverflow-card absolute top-1/2 -translate-y-1/2 flex flex-col items-center ${DECK_MOTION} ${
        isSelected ? "" : "cursor-pointer"
      }`}
      style={deckStyle(offset)}
      {...selectProps}
    >
      <div
        className={`coverflow-box w-[290px] sm:w-[380px] md:w-[460px] rounded-stitch-30 border p-5 sm:p-6 md:p-7 flex flex-col items-center justify-between transition-all duration-500 ${
          isSelected
            ? "border-[#cfc4b0] shadow-2xl bg-white/95"
            : "border-[#e3d7c5] shadow-md bg-gradient-to-b from-[#f7f2ea]/90 to-[#ede3d3]/80"
        }`}
      >
        {/* Subtle Browser Window Bar for active card */}
        {isSelected && (
          <div className="w-full flex items-center justify-between pb-3.5 mb-2 border-b border-[#e8ded0]">
            <div className="flex items-center gap-1.5" aria-hidden>
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
            </div>
            <div className="px-3.5 py-1 rounded-full bg-[#f4eee3] border border-[#e3d7c5] text-cad-spec-micro font-mono text-[#526359] flex items-center gap-1.5 shadow-2xs">
              <Icon name="straighten" className="size-3.5 text-stitch-forest" />
              <span>{formatDimensions(card.dimensions)}</span>
            </div>
            <div className="w-10" />
          </div>
        )}

        <div className="w-full aspect-[16/10] rounded-[22px] bg-[#fbf9f5]/85 flex items-center justify-center p-3 overflow-hidden shadow-inner">
          <DesignThumb
            thumbnailUrl={card.thumbnailUrl}
            structure={card.structure.id}
            dimensions={card.dimensions}
            materialSpec={card.materialSpec}
            color={card.color}
            alt={`${card.structure.name} ${formatDimensions(card.dimensions)}`}
            className="mix-blend-multiply transition-transform duration-500 pointer-events-none"
          />
        </div>

        <div className="card-caption w-full pt-4 flex flex-col items-center">
          <h3 className="font-headline-sm text-base sm:text-lg md:text-xl text-brand-forest-deep font-semibold text-center font-landing-heading">
            {card.title}
          </h3>
          <div
            className="card-details mt-2.5 flex flex-wrap items-center justify-center gap-2 overflow-hidden transition-all duration-300 motion-reduce:transition-none"
            style={{
              maxHeight: isSelected ? "140px" : "0px",
              opacity: isSelected ? 1 : 0,
              transform: isSelected ? "translateY(0px)" : "translateY(6px)",
              pointerEvents: isSelected ? "auto" : "none",
            }}
          >
            <span className="px-3.5 py-1 rounded-full bg-white/90 border border-[#ded5c5] font-cad-dimension text-xs text-[#133020] shadow-xs">
              {card.structure.name}
            </span>
            {card.materialSpec && (
              <span className="px-3 py-1 rounded-full bg-[#caead9]/60 text-[#133020] font-cad-dimension text-cad-spec-micro font-medium">
                {formatMaterial(card.materialSpec)}
              </span>
            )}
            {isSelected && (
              <Link href={templateHref(card.id)} className={`${PRIMARY_BUTTON} mt-1 w-full sm:w-auto`}>
                Dùng mẫu này
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Three ghost cards in deck position while the designs load. */
function DeckSkeleton() {
  return (
    <div role="status" aria-label="Đang tải mẫu" className="contents">
      {[-1, 0, 1].map((offset) => (
        <div key={offset} className="absolute top-1/2 -translate-y-1/2" style={deckStyle(offset)} aria-hidden>
          <div className="w-[290px] sm:w-[380px] md:w-[460px] rounded-stitch-30 border border-[#e3d7c5] bg-white/80 p-5 sm:p-6 md:p-7">
            <div className="w-full aspect-[16/10] rounded-[22px] bg-[#f4eee3] animate-pulse motion-reduce:animate-none" />
            <div className="mx-auto mt-5 h-5 w-2/3 rounded-full bg-[#ede3d3] animate-pulse motion-reduce:animate-none" />
          </div>
        </div>
      ))}
    </div>
  );
}

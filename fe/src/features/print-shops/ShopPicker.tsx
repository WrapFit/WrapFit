"use client";

import { useQuery } from "@tanstack/react-query";
import { EXCLUSION_REASON_LABELS, MATCH_REASON_LABELS, PROVINCES } from "@wrapfit/shared";
import { CalendarClock, Factory, MapPin, RefreshCw, Star } from "lucide-react";
import React, { useMemo, useState } from "react";
import { matchSampleShops } from "@/api/orders";
import { errorMessage } from "@/services/api";
import type { PrintShopMatch, PrintShopOffer } from "@/types/api";
import { cn } from "@/utils/helpers";

/** Order of the shop cards (docs/19 G.3); "recommended" keeps the order of the API. */
type SortKey = "recommended" | "fastest" | "nearest" | "rating";
const SORTS: { key: SortKey; label: string }[] = [
  { key: "recommended", label: "Đề xuất" },
  { key: "fastest", label: "Giao sớm nhất" },
  { key: "nearest", label: "Gần nhất" },
  { key: "rating", label: "Đánh giá cao" },
];

const sorters: Record<SortKey, (a: PrintShopOffer, b: PrintShopOffer) => number> = {
  recommended: () => 0,
  fastest: (a, b) => a.estimatedDelivery.localeCompare(b.estimatedDelivery),
  nearest: (a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity),
  rating: (a, b) => (b.shop.rating ?? 0) - (a.shop.rating ?? 0),
};

/** "Thứ hai, 23/11" for a YYYY-MM-DD of Vietnam. */
export function deliveryDateLabel(day: string): string {
  return new Date(`${day}T12:00:00+07:00`).toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

/** Ranked shops for the designs of the cart and the province they go to. */
export function useShopMatch(items: { projectId: string; quantity: number }[], provinceCode: string) {
  const key = items.map((item) => `${item.projectId}:${item.quantity}`).join(",");
  return useQuery({
    queryKey: ["printShops", "match", provinceCode, key],
    queryFn: () => matchSampleShops({ provinceCode: provinceCode || undefined, items }),
    enabled: items.length > 0,
    staleTime: 60_000,
  });
}

export function ProvinceSelect({ value, onChange, id }: { value: string; onChange: (code: string) => void; id?: string }) {
  return (
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="mt-1 h-11 w-full rounded-xl bg-landing-canvas px-3 text-sm ring-1 ring-landing-line"
    >
      <option value="">Chọn tỉnh / thành</option>
      {PROVINCES.map((province) => (
        <option key={province.code} value={province.code}>
          {province.name}
        </option>
      ))}
    </select>
  );
}

/**
 * The shops that can print the cart, as cards to compare (docs/19 G.3): delivery date, distance, rating and why each
 * is suggested. The recommended shop is selected until the customer picks another, and is named before payment
 * (BR-G12). Shops left out are listed with their reason.
 */
export function ShopPicker({
  match,
  value,
  onChange,
}: {
  match: { data?: PrintShopMatch; isLoading: boolean; isError: boolean; error: unknown; refetch: () => unknown };
  /** Chosen shop id; "" = the recommended one. */
  value: string;
  onChange: (shopId: string) => void;
}) {
  const [sort, setSort] = useState<SortKey>("recommended");
  const offers = useMemo(() => [...(match.data?.offers ?? [])].sort(sorters[sort]), [match.data, sort]);
  const selected = value || match.data?.recommendedId || "";

  if (match.isLoading) {
    return (
      <div className="flex flex-col gap-2" aria-busy="true" aria-label="Đang tìm xưởng phù hợp">
        {[0, 1].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-landing-canvas" />
        ))}
      </div>
    );
  }
  if (match.isError) {
    return (
      <div role="alert" className="flex flex-col gap-2 rounded-xl bg-danger-bg px-3 py-3 text-sm text-danger-fg">
        <p>Chưa tải được danh sách xưởng: {errorMessage(match.error)}</p>
        <button type="button" onClick={() => match.refetch()} className="inline-flex items-center gap-1.5 self-start font-semibold underline">
          <RefreshCw className="size-3.5" aria-hidden /> Thử lại
        </button>
      </div>
    );
  }
  if (!match.data) return <p className="text-sm text-landing-muted">Thêm thiết kế vào giỏ để xem xưởng in được.</p>;

  const excluded = match.data.excluded;
  return (
    <div className="flex flex-col gap-3">
      {offers.length === 0 ? (
        <p role="alert" className="rounded-xl bg-warning-bg px-3 py-3 text-sm text-warning-fg">
          Chưa có xưởng đối tác nào in được đơn này. Xem lý do bên dưới, hoặc{" "}
          <a href="/contact" className="font-semibold underline">
            gửi yêu cầu báo giá riêng
          </a>
          .
        </p>
      ) : (
        <>
          <label className="flex items-center justify-between gap-2 text-xs text-landing-muted">
            {offers.length} xưởng in được đơn này
            <select value={sort} onChange={(event) => setSort(event.target.value as SortKey)} className="h-8 rounded-full bg-landing-canvas px-2 text-xs ring-1 ring-landing-line">
              {SORTS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <div role="radiogroup" aria-label="Xưởng in" className="flex flex-col gap-2">
            {offers.map((offer) => (
              <OfferCard key={offer.shop.id} offer={offer} checked={offer.shop.id === selected} onSelect={() => onChange(offer.shop.id)} />
            ))}
          </div>
          {!match.data.provinceCode && <p className="text-xs text-landing-muted">Chọn tỉnh / thành nhận hàng để xếp xưởng gần bạn lên trước.</p>}
        </>
      )}
      {excluded.length > 0 && (
        <details className="text-xs text-landing-muted">
          <summary className="cursor-pointer">{excluded.length} xưởng không nhận được đơn này</summary>
          <ul className="mt-2 flex flex-col gap-1">
            {excluded.map(({ shop, reasons }) => (
              <li key={shop.id}>
                <span className="font-semibold text-landing-ink">{shop.name}</span>: {reasons.map((reason) => EXCLUSION_REASON_LABELS[reason]).join(", ")}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function OfferCard({ offer, checked, onSelect }: { offer: PrintShopOffer; checked: boolean; onSelect: () => void }) {
  const { shop } = offer;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      className={cn(
        "flex flex-col gap-2 rounded-xl p-3 text-left transition-shadow",
        checked ? "bg-white ring-2 ring-landing-ink" : "bg-landing-canvas ring-1 ring-landing-line hover:ring-landing-ink/40"
      )}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 text-sm font-semibold">
            <Factory className="size-4 shrink-0" aria-hidden />
            <span className="truncate">{shop.name}</span>
          </span>
          <span className="mt-0.5 flex items-center gap-1 text-xs text-landing-muted">
            <MapPin className="size-3 shrink-0" aria-hidden />
            {shop.city}
            {offer.distanceKm !== null && ` · cách ${offer.distanceKm.toLocaleString("vi-VN")} km`}
          </span>
        </span>
        {typeof shop.rating === "number" && shop.rating > 0 && (
          <span className="flex shrink-0 items-center gap-1 text-xs font-semibold">
            <Star className="size-3.5 fill-current text-fpt-orange" aria-hidden />
            {shop.rating.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}
            {shop.completedOrders ? <span className="font-normal text-landing-muted">· {shop.completedOrders.toLocaleString("vi-VN")} đơn</span> : null}
          </span>
        )}
      </span>
      <span className="flex items-center gap-1.5 text-sm">
        <CalendarClock className="size-4 shrink-0 text-landing-muted" aria-hidden />
        Nhận dự kiến <strong className="font-semibold">{deliveryDateLabel(offer.estimatedDelivery)}</strong>
      </span>
      <span className="text-xs text-landing-muted">
        In {offer.productionDays} ngày làm việc · giao {offer.shippingDays} ngày
        {shop.services.length > 0 && ` · ${shop.services.slice(0, 2).join(", ")}`}
      </span>
      {offer.reasons.length > 0 && (
        <span className="flex flex-wrap gap-1">
          {offer.reasons.map((reason) => (
            <span
              key={reason}
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-semibold",
                reason === "recommended" ? "bg-fpt-orange text-white" : "bg-white text-landing-ink ring-1 ring-landing-line"
              )}
            >
              {MATCH_REASON_LABELS[reason]}
            </span>
          ))}
        </span>
      )}
    </button>
  );
}

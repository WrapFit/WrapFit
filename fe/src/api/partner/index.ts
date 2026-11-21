import { request } from "@/services/api";
import type { PartnerMe, PartnerSummary, UpdatePartnerShopRequest } from "@/types/api";

/** The portal of a print shop account (docs/19 G.1). Orders themselves go through `@/api/orders`. */
export function getPartnerMe(): Promise<PartnerMe> {
  return request("/partner/me");
}

export function getPartnerSummary(): Promise<PartnerSummary> {
  return request("/partner/summary");
}

/** OWNER only: pause until a date, capacity, phone, Zalo. */
export function updatePartnerShop(data: UpdatePartnerShopRequest): Promise<PartnerMe> {
  return request("/partner/shop", { method: "PATCH", json: data });
}

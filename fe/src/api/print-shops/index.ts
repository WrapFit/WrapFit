import { request } from "@/services/api";
import type { PrintShop } from "@/types/api";

/** Lists partner print shops with machine specs and lead times. */
export function listPrintShops(): Promise<PrintShop[]> {
  return request("/print-shops");
}

/** Get a single partner print shop by id. */
export function getPrintShop(id: string): Promise<PrintShop> {
  return request(`/print-shops/${id}`);
}

import { request } from "@/services/api";
import type { PrintShop } from "@/types/api";
import { DEMO_PRINT_SHOPS } from "@/features/dashboard/demoData";

/** Lists partner print shops with machine specs and lead times. */
export async function listPrintShops(): Promise<PrintShop[]> {
  try {
    return await request("/print-shops");
  } catch (error) {
    console.warn("[PrintShops API] Failed to fetch print shops, using demo fallback:", error);
    return DEMO_PRINT_SHOPS;
  }
}

/** Get a single partner print shop by id. */
export async function getPrintShop(id: string): Promise<PrintShop> {
  try {
    return await request(`/print-shops/${id}`);
  } catch (error) {
    console.warn("[PrintShops API] Failed to fetch print shop, using demo fallback:", error);
    return DEMO_PRINT_SHOPS.find((p) => p.id === id) ?? DEMO_PRINT_SHOPS[0];
  }
}

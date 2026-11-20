import { request } from "@/services/api";
import type { AdminPrintShop, PrintShop, UpdatePrintShopRequest } from "@/types/api";

/**
 * Partner print shops. An error stays an error (docs/19 BR-G13): a list of example shops would let a customer order
 * from a shop that does not exist. The offline demo answers these routes from its mock API.
 */
export function listPrintShops(): Promise<PrintShop[]> {
  return request("/print-shops");
}

/** A partner print shop a customer may see. */
export function getPrintShop(id: string): Promise<PrintShop> {
  return request(`/print-shops/${id}`);
}

/** Every shop with contacts, contract fee and queue (ADMIN). */
export function listAdminPrintShops(): Promise<AdminPrintShop[]> {
  return request("/admin/print-shops");
}

/** Changes a shop (ADMIN): status, pause, fee rate, capacity. Orders keep the fee rate they were placed with. */
export function updatePrintShop(id: string, data: UpdatePrintShopRequest): Promise<AdminPrintShop> {
  return request(`/admin/print-shops/${id}`, { method: "PATCH", json: data });
}

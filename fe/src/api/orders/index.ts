import { OFFLINE_DEMO } from "@/config";
import { ApiError, request } from "@/services/api";
import type { CreateSampleOrderRequest, OrderStatus, SampleOrder, StaffOrdersQuery } from "@/types/api";
import { DEMO_ORDERS } from "@/features/dashboard/demoData";

/**
 * The build without a backend (`OFFLINE_DEMO`) shows the example orders when the API is unreachable or the visitor uses
 * the demo account. Everywhere else an error stays an error: orders are real records and must never be invented.
 */

function demoFallback<T>(error: unknown, value: () => T): T {
  const unreachable = error instanceof ApiError && (error.status === 0 || error.status === 401 || error.status >= 502);
  if (OFFLINE_DEMO && unreachable) return value();
  throw error;
}

/** Place a sample box order (1–10 boxes of one design). The order waits for payment; errors reach the caller. */
export function createSampleOrder(data: CreateSampleOrderRequest): Promise<SampleOrder> {
  return request("/orders/sample", { method: "POST", json: data });
}

/** Sample box orders placed by the current user, newest first. */
export function listMyOrders(): Promise<SampleOrder[]> {
  return request<SampleOrder[]>("/orders/my-orders").catch((error) => demoFallback(error, () => DEMO_ORDERS));
}

/** One order of the current user. */
export function getOrder(id: string): Promise<SampleOrder> {
  return request<SampleOrder>(`/orders/${id}`).catch((error) =>
    demoFallback(error, () => {
      const order = DEMO_ORDERS.find((o) => o.id === id);
      if (!order) throw error;
      return order;
    })
  );
}

/** Orders to handle (ADMIN: every shop; PRINT_SHOP: its own shop). */
export function listStaffOrders(query: StaffOrdersQuery = {}): Promise<SampleOrder[]> {
  return request("/orders", { query });
}

/** Moves an order one step of its lifecycle; a step that is not allowed answers 409. */
export function updateOrderStatus(id: string, status: OrderStatus, note?: string): Promise<SampleOrder> {
  return request(`/orders/${id}/status`, { method: "PATCH", json: { status, note } });
}

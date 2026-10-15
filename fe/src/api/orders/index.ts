import { request } from "@/services/api";
import type { CreateSampleOrderRequest, SampleOrder } from "@/types/api";

/** Place a 1-unit physical proof (sample box) order. */
export function createSampleOrder(data: CreateSampleOrderRequest): Promise<SampleOrder> {
  return request("/orders/sample", { method: "POST", json: data });
}

/** List sample box orders placed by the current user. */
export function listMyOrders(): Promise<SampleOrder[]> {
  return request("/orders/my-orders");
}

/** Get order status by id. */
export function getOrder(id: string): Promise<SampleOrder> {
  return request(`/orders/${id}`);
}

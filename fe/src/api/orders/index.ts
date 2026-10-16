import { request } from "@/services/api";
import type { CreateSampleOrderRequest, SampleOrder } from "@/types/api";
import { DEMO_ORDERS } from "@/features/dashboard/demoData";

/** Place a 1-unit physical proof (sample box) order. */
export async function createSampleOrder(data: CreateSampleOrderRequest): Promise<SampleOrder> {
  try {
    return await request("/orders/sample", { method: "POST", json: data });
  } catch (error) {
    console.warn("[Orders API] Create sample order fallback:", error);
    const newOrder: SampleOrder = {
      id: `ord-demo-${Date.now()}`,
      orderCode: `WF-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      userId: "demo-user-id",
      projectId: data.projectId,
      projectTitle: "Hộp Nến Thơm Tinh Dầu Lavender",
      printShopId: data.printShopId,
      printShopName: "In Bao Bì Sài Gòn Xanh",
      partnerShop: {
        id: data.printShopId ?? "ps-sg-01",
        name: "In Bao Bì Sài Gòn Xanh",
        city: "TP. Hồ Chí Minh",
        contactPhone: "028 3816 8888",
      },
      quantity: data.quantity ?? 1,
      recipientName: data.recipientName,
      phone: data.phone,
      shippingAddress: data.shippingAddress,
      notes: data.notes ?? null,
      totalVnd: 49000,
      sampleFeeVnd: 49000,
      status: "in_production",
      createdAt: new Date().toISOString(),
    };
    return newOrder;
  }
}

/** List sample box orders placed by the current user. */
export async function listMyOrders(): Promise<SampleOrder[]> {
  try {
    return await request("/orders/my-orders");
  } catch (error) {
    console.warn("[Orders API] Failed to fetch orders, using demo fallback:", error);
    return DEMO_ORDERS;
  }
}

/** Get order status by id. */
export async function getOrder(id: string): Promise<SampleOrder> {
  try {
    return await request(`/orders/${id}`);
  } catch (error) {
    console.warn("[Orders API] Failed to fetch order, using demo fallback:", error);
    return DEMO_ORDERS.find((o) => o.id === id) ?? DEMO_ORDERS[0];
  }
}

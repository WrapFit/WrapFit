import type { OrderStatus, SampleOrder } from "@/types/api";

/** Badge of each order status (`SampleOrder.status`, lower case), shared by /dashboard/orders and /admin/print-shops. */
export const ORDER_STATUS_BADGES: Record<SampleOrder["status"], { tone: "green" | "grey" | "amber" | "red"; label: string }> = {
  pending_payment: { tone: "amber", label: "Chờ thanh toán" },
  paid: { tone: "green", label: "Đã thanh toán" },
  in_production: { tone: "amber", label: "Đang in mẫu thử" },
  shipped: { tone: "green", label: "Đang giao hàng" },
  delivered: { tone: "green", label: "Đã giao" },
  cancelled: { tone: "grey", label: "Đã hủy" },
};

export const orderStatusBadge = (status: string) =>
  ORDER_STATUS_BADGES[status as SampleOrder["status"]] ?? { tone: "grey" as const, label: status };

/**
 * Next steps of an order, as in `be/src/orders/order-status.ts`, with the label of the button that takes each one.
 * The API checks them again (409); this list only decides which buttons to show.
 */
export const ORDER_NEXT_STEPS: Record<OrderStatus, { to: OrderStatus; label: string }[]> = {
  PENDING_PAYMENT: [
    { to: "PAID", label: "Xác nhận đã thanh toán" },
    { to: "CANCELLED", label: "Hủy đơn" },
  ],
  PAID: [
    { to: "IN_PRODUCTION", label: "Bắt đầu in" },
    { to: "CANCELLED", label: "Hủy đơn" },
  ],
  IN_PRODUCTION: [{ to: "SHIPPED", label: "Đã gửi hàng" }],
  SHIPPED: [{ to: "DELIVERED", label: "Đã giao" }],
  DELIVERED: [],
  CANCELLED: [],
};

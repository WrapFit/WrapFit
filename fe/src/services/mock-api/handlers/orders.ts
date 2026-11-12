/** Sample print orders of the offline demo: placed from the cart, paid through the checkout, moved by the admin. */

import { findSamplePromo, samplePromoDiscount } from "@wrapfit/shared";
import { DEMO_PRINT_SHOPS } from "@/features/dashboard/demoData";
import type { OrderStatus, SampleOrder } from "@/types/api";
import { badRequest, conflict, currentUser, MockHttpError, notFound, type Handler } from "../http";
import { db, newId, nowIso, save } from "../store";
import { ownProject } from "./projects";

/** Same fees as `be/src/orders/orders.service.ts`. */
const SAMPLE_FIRST_BOX_VND = 49_000;
const SAMPLE_EXTRA_BOX_VND = 25_000;
const sampleFeeVnd = (quantity: number) => SAMPLE_FIRST_BOX_VND + Math.max(0, quantity - 1) * SAMPLE_EXTRA_BOX_VND;

/** Allowed moves of `be/src/orders/order-status.ts`. */
const NEXT: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ["PAID", "CANCELLED"],
  PAID: ["IN_PRODUCTION", "CANCELLED"],
  IN_PRODUCTION: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

const STAMP: Partial<Record<OrderStatus, keyof SampleOrder>> = {
  PAID: "paidAt",
  SHIPPED: "shippedAt",
  DELIVERED: "deliveredAt",
  CANCELLED: "cancelledAt",
};

function nextOrderCode(): string {
  const year = new Date().getFullYear();
  const taken = new Set(db().orders.map((o) => o.orderCode));
  let code: string;
  do code = `WF-${year}-${String(Math.floor(1000 + Math.random() * 9000))}`;
  while (taken.has(code));
  return code;
}

interface Line {
  projectId: string;
  quantity?: number;
  paperStock?: string;
}

function placeOrder(body: Record<string, unknown>, lines: Line[]): SampleOrder {
  const user = currentUser();
  if (!lines.length) throw badRequest("Giỏ in mẫu đang trống.");
  const recipientName = String(body.recipientName ?? "").trim();
  const shippingAddress = String(body.shippingAddress ?? "").trim();
  const phone = String(body.recipientPhone ?? body.phone ?? "").trim();
  const errors: string[] = [];
  if (!recipientName) errors.push("Cần tên người nhận.");
  if (!phone) errors.push("Cần số điện thoại người nhận.");
  if (!shippingAddress) errors.push("Cần địa chỉ giao hàng.");
  if (errors.length) throw badRequest(errors);
  const promoCode = typeof body.promoCode === "string" && body.promoCode.trim() ? body.promoCode.trim().toUpperCase() : null;
  if (promoCode && !findSamplePromo(promoCode)) throw new MockHttpError(400, "Mã giảm giá không hợp lệ.", { code: "INVALID_PROMO" });

  const items = lines.map((line) => {
    const project = ownProject(line.projectId);
    if (project.status === "DELETED") throw notFound("Thiết kế đang ở thùng rác.");
    const quantity = Math.min(10, Math.max(1, Number(line.quantity) || 1));
    return { projectId: project.id, projectTitle: project.title, projectVersion: project.version, quantity, lineTotalVnd: sampleFeeVnd(quantity), project };
  });
  const subtotalVnd = items.reduce((sum, item) => sum + item.lineTotalVnd, 0);
  const discountVnd = samplePromoDiscount(promoCode, subtotalVnd);
  const shop = DEMO_PRINT_SHOPS.find((s) => s.id === body.printShopId) ?? DEMO_PRINT_SHOPS[0];
  const first = items[0].project;
  const now = nowIso();
  const order: SampleOrder = {
    id: newId(),
    orderCode: nextOrderCode(),
    userId: user.id,
    projectId: first.id,
    projectTitle: items.length > 1 ? `${first.title} (+${items.length - 1} thiết kế)` : first.title,
    projectVersion: first.version,
    structure: first.template.id,
    dimensions: first.dimensions,
    printShopId: shop.id,
    printShopName: shop.name,
    partnerShop: { id: shop.id, name: shop.name, city: shop.city, contactPhone: shop.phone },
    quantity: items.reduce((sum, item) => sum + item.quantity, 0),
    paperStock: lines[0].paperStock ?? "Kraft 350g cán màng mờ",
    recipientName,
    phone,
    recipientPhone: phone,
    shippingAddress,
    notes: typeof body.notes === "string" ? body.notes : null,
    subtotalVnd,
    shippingVnd: 0,
    discountVnd,
    promoCode,
    totalVnd: subtotalVnd - discountVnd,
    sampleFeeVnd: subtotalVnd,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    items: items.map(({ project, ...item }) => item),
    status: "pending_payment",
    orderStatus: "PENDING_PAYMENT",
    estimatedDeliveryDays: shop.leadTime ?? "3–5 ngày",
    paymentId: null,
    paidAt: null,
    shippedAt: null,
    deliveredAt: null,
    cancelledAt: null,
    createdAt: now,
    updatedAt: now,
  };
  // A promo that covers the whole fee leaves nothing to pay: the order is paid at once, like the API.
  if (order.totalVnd === 0) {
    order.status = "paid";
    order.orderStatus = "PAID";
    order.paidAt = now;
  }
  db().orders.push(order);
  save();
  return order;
}

const createSample: Handler = ({ body }) =>
  placeOrder(body, [{ projectId: String(body.projectId ?? ""), quantity: body.quantity as number, paperStock: body.paperStock as string }]);

const createBundle: Handler = ({ body }) => placeOrder(body, (Array.isArray(body.items) ? body.items : []) as Line[]);

const mine = () => {
  const user = currentUser();
  return db()
    .orders.filter((o) => o.userId === user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

const getOrder: Handler = ({ params }) => {
  const user = currentUser();
  const order = db().orders.find((o) => o.id === params.id && (o.userId === user.id || user.role === "ADMIN"));
  if (!order) throw notFound("Không tìm thấy đơn.");
  return order;
};

const staffOrders: Handler = ({ query }) => {
  const user = currentUser();
  if (user.role !== "ADMIN" && user.role !== "PRINT_SHOP") throw new MockHttpError(403, "Không có quyền xem đơn của xưởng.");
  const status = query.get("status");
  const shop = query.get("printShopId");
  const limit = Number(query.get("limit")) || 100;
  return db()
    .orders.filter((o) => (!status || o.orderStatus === status) && (!shop || o.printShopId === shop))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
};

const updateStatus: Handler = ({ params, body }) => {
  const user = currentUser();
  if (user.role !== "ADMIN" && user.role !== "PRINT_SHOP") throw new MockHttpError(403, "Không có quyền đổi trạng thái đơn.");
  const order = db().orders.find((o) => o.id === params.id);
  if (!order) throw notFound("Không tìm thấy đơn.");
  const from = (order.orderStatus ?? (order.status.toUpperCase() as OrderStatus)) as OrderStatus;
  const to = body.status as OrderStatus;
  if (!NEXT[from]?.includes(to)) throw conflict(`Không chuyển được đơn từ ${from} sang ${to}.`);
  const now = nowIso();
  order.orderStatus = to;
  order.status = to.toLowerCase() as SampleOrder["status"];
  const stamp = STAMP[to];
  if (stamp) (order as unknown as Record<string, unknown>)[stamp] = now;
  if (typeof body.note === "string" && body.note.trim()) order.notes = body.note.trim();
  order.updatedAt = now;
  save();
  return order;
};

export const orderRoutes: [string, string, Handler][] = [
  ["POST", "/orders/sample", createSample],
  ["POST", "/orders/sample/bundle", createBundle],
  ["GET", "/orders/my-orders", mine],
  ["GET", "/orders", staffOrders],
  ["GET", "/orders/:id", getOrder],
  ["PATCH", "/orders/:id/status", updateStatus],
];

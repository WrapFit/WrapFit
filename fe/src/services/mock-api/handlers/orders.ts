/**
 * Sample print orders of the offline demo, with the same rules as `be/src/orders` (docs/19 G.3–G.5): placed from the
 * cart, paid through the checkout, taken or refused by the shop in its portal, printed, shipped with a tracking code,
 * received by the customer, and talked about in the order.
 */

import {
  acceptDeadlineFrom,
  carrierOf,
  isOrderLate,
  messageNeedsWarning,
  platformFeeSplit,
  shipmentProblem,
  trackingLinkOf,
} from "@wrapfit/shared";
import type { OrderMessage, OrderPrintFile, OrderStatus, PartnerMe, SampleOrder } from "@/types/api";
import { badRequest, conflict, currentUser, MockHttpError, notFound, type Handler } from "../http";
import { db, newId, nowIso, save, type MockUser } from "../store";
import { notifyOrder } from "./notifications";
import { ownProject } from "./projects";
import { feeAt, matchShops, MOCK_SHOPS, publicShop } from "./printShops";

/** Same fees as `be/src/orders/orders.service.ts`. */
const SAMPLE_FIRST_BOX_VND = 49_000;
const SAMPLE_EXTRA_BOX_VND = 25_000;
const sampleFeeVnd = (quantity: number) => SAMPLE_FIRST_BOX_VND + Math.max(0, quantity - 1) * SAMPLE_EXTRA_BOX_VND;

/** Allowed moves of `be/src/orders/order-status.ts`. */
const NEXT: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ["PAID", "CANCELLED"],
  PAID: ["IN_PRODUCTION", "CANCELLED"],
  IN_PRODUCTION: ["SHIPPED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};
const SHOP_TARGETS: OrderStatus[] = ["IN_PRODUCTION", "SHIPPED", "DELIVERED"];

const STAMP: Partial<Record<OrderStatus, keyof SampleOrder>> = {
  PAID: "paidAt",
  SHIPPED: "shippedAt",
  DELIVERED: "deliveredAt",
  CANCELLED: "cancelledAt",
};

/** The demo's print shop account works for Sài Gòn Xanh (like print_shop_members). */
const MEMBERS: Record<string, { printShopId: string; role: "OWNER" | "STAFF" }> = {
  "usr-04": { printShopId: "ps-sg-01", role: "OWNER" },
};

type Side = "CUSTOMER" | "SHOP" | "ADMIN";

/** What the demo keeps besides the API shape: read marks of each side. */
type MockOrder = SampleOrder & { customerReadAt?: string | null; shopReadAt?: string | null };
type MockMessage = OrderMessage & { orderId: string; authorId: string | null };

const messages = (): MockMessage[] => {
  const data = db() as ReturnType<typeof db> & { orderMessages?: MockMessage[] };
  data.orderMessages ??= [];
  return data.orderMessages;
};

function nextOrderCode(): string {
  const year = new Date().getFullYear();
  const taken = new Set(db().orders.map((o) => o.orderCode));
  let code: string;
  do code = `WF-${year}-${String(Math.floor(100000 + Math.random() * 900000))}`;
  while (taken.has(code));
  return code;
}

const statusOf = (order: SampleOrder): OrderStatus => (order.orderStatus ?? (order.status.toUpperCase() as OrderStatus)) as OrderStatus;

function memberOf(user: MockUser) {
  const member = MEMBERS[user.id];
  if (!member) throw new MockHttpError(403, "Tài khoản chưa được gán cho xưởng in nào");
  return member;
}

function access(id: string): { order: MockOrder; side: Side; user: MockUser; shopRole: "OWNER" | "STAFF" | null } {
  const user = currentUser();
  const order = db().orders.find((o) => o.id === id) as MockOrder | undefined;
  if (!order) throw notFound("Đơn hàng không tồn tại");
  if (user.role === "ADMIN") return { order, side: "ADMIN", user, shopRole: null };
  if (order.userId === user.id) return { order, side: "CUSTOMER", user, shopRole: null };
  const member = MEMBERS[user.id];
  if (user.role === "PRINT_SHOP" && member?.printShopId === order.printShopId) return { order, side: "SHOP", user, shopRole: member.role };
  throw notFound("Đơn hàng không tồn tại");
}

function unread(order: MockOrder, side: Side): number {
  if (side === "ADMIN") return 0;
  const since = (side === "CUSTOMER" ? order.customerReadAt : order.shopReadAt) ?? "";
  return messages().filter((m) => m.orderId === order.id && m.authorRole !== side && m.createdAt > since).length;
}

/** The order as `side` sees it, like OrdersService.toResponse. */
function view(order: MockOrder, side: Side, shopRole: "OWNER" | "STAFF" | null = null): SampleOrder {
  /* eslint-disable @typescript-eslint/no-unused-vars */
  const { customerReadAt, shopReadAt, platformFeeBps, platformFeeVnd, shopPayableVnd, rejectReason, ...rest } = order;
  /* eslint-enable @typescript-eslint/no-unused-vars */
  const shop = MOCK_SHOPS.find((s) => s.id === order.printShopId);
  const accepted = !!order.acceptedAt;
  const hidden = side === "SHOP" && !accepted;
  const money = side === "ADMIN" || shopRole === "OWNER";
  const status = statusOf(order);
  return {
    ...rest,
    phone: hidden ? "" : order.recipientPhone ?? order.phone,
    recipientPhone: hidden ? "" : order.recipientPhone ?? order.phone,
    shippingAddress: hidden ? "" : order.shippingAddress,
    partnerShop: {
      id: order.printShopId ?? "",
      name: shop?.name ?? order.printShopName ?? "",
      city: shop?.city ?? "",
      contactPhone: side !== "CUSTOMER" || accepted ? (shop?.phone ?? "") : "",
      zalo: side !== "CUSTOMER" || accepted ? (shop?.zalo ?? null) : null,
    },
    printShopName: shop?.name ?? order.printShopName,
    isLate: isOrderLate(order.estimatedDelivery, status),
    carrierName: carrierOf(order.carrier)?.name ?? null,
    trackingUrl: trackingLinkOf(order.carrier, order.trackingCode),
    timeline: order.timeline ?? [],
    unreadMessages: unread(order, side),
    ...(side !== "CUSTOMER" ? { rejectReason: rejectReason ?? null } : {}),
    ...(money ? { platformFeeBps, platformFeeVnd, shopPayableVnd } : {}),
  };
}

function system(orderId: string, body: string) {
  messages().push({ id: newId("msg-"), orderId, authorId: null, authorRole: "SYSTEM", authorName: "WrapFit", mine: false, body, flagged: false, createdAt: nowIso() });
}

function moveTo(order: MockOrder, to: OrderStatus, note?: string | null) {
  const from = statusOf(order);
  if (!NEXT[from]?.includes(to)) throw conflict(`Không thể chuyển đơn từ ${from} sang ${to}`);
  const now = nowIso();
  order.orderStatus = to;
  order.status = to.toLowerCase() as SampleOrder["status"];
  const stamp = STAMP[to];
  if (stamp) (order as unknown as Record<string, unknown>)[stamp] = now;
  order.timeline = [...(order.timeline ?? []), { status: to, at: now, note: note?.trim() || null }];
  order.updatedAt = now;
}

const shopAccounts = (printShopId?: string) => Object.entries(MEMBERS).filter(([, m]) => m.printShopId === printShopId).map(([id]) => id);
const adminAccounts = () => db().users.filter((u) => u.role === "ADMIN").map((u) => u.id);
const ref = (order: SampleOrder) => ({ id: order.id, orderCode: order.orderCode });

/** Called by the demo checkout when a sample order is paid: the shop's deadline starts and the shop is told. */
export function onOrderPaid(order: SampleOrder): void {
  const paidAt = order.paidAt ?? nowIso();
  order.acceptDeadline = acceptDeadlineFrom(new Date(paidAt)).toISOString();
  order.timeline = [...(order.timeline ?? []), { status: "PAID", at: paidAt, note: null }];
  notifyOrder("ORDER_NEW", ref(order), shopAccounts(order.printShopId), "paid");
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
  // Vouchers were removed (docs-old/25 item 1): like the API's ValidationPipe, a body that still sends a code gets 400.
  if ("promoCode" in body) errors.push("property promoCode should not exist");
  if (errors.length) throw badRequest(errors);

  const items = lines.map((line) => {
    const project = ownProject(line.projectId);
    if (project.status === "DELETED") throw notFound("Thiết kế đang ở thùng rác.");
    const quantity = Math.min(10, Math.max(1, Number(line.quantity) || 1));
    return {
      projectId: project.id,
      projectTitle: project.title,
      projectVersion: project.version,
      quantity,
      lineTotalVnd: sampleFeeVnd(quantity),
      paperStock: line.paperStock ?? "Kraft 350g cán màng mờ",
      project,
    };
  });
  const subtotalVnd = items.reduce((sum, item) => sum + item.lineTotalVnd, 0);
  // Same rule as the API: the chosen shop must still take the order, otherwise the recommended one (docs/19 BR-G16).
  const recipientProvince = typeof body.recipientProvince === "string" && body.recipientProvince ? body.recipientProvince : null;
  const match = matchShops(lines, recipientProvince);
  const shopId = (typeof body.printShopId === "string" && body.printShopId) || match.recommendedId;
  if (!shopId) throw new MockHttpError(400, "Chưa có xưởng đối tác nào in được đơn này", { code: "NO_PRINT_SHOP" });
  const offer = match.offers.find((candidate) => candidate.shop.id === shopId);
  if (!offer) throw new MockHttpError(400, "Xưởng in này chưa nhận đơn", { code: "PRINT_SHOP_UNAVAILABLE" });
  const shop = MOCK_SHOPS.find((s) => s.id === shopId)!;
  const fee = feeAt(shop.id, subtotalVnd);
  const first = items[0].project;
  const now = nowIso();
  const order: MockOrder = {
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
    partnerShop: { id: shop.id, name: shop.name, city: shop.city, contactPhone: "", zalo: null },
    recipientProvince,
    platformFeeBps: fee.platformFeeBps,
    platformFeeVnd: fee.platformFeeVnd,
    shopPayableVnd: fee.shopPayableVnd,
    estimatedDelivery: offer.estimatedDelivery,
    quantity: items.reduce((sum, item) => sum + item.quantity, 0),
    paperStock: items[0].paperStock,
    recipientName,
    phone,
    recipientPhone: phone,
    shippingAddress,
    notes: typeof body.notes === "string" ? body.notes : null,
    subtotalVnd,
    shippingVnd: 0,
    discountVnd: 0,
    promoCode: null,
    totalVnd: subtotalVnd,
    sampleFeeVnd: subtotalVnd,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    items: items.map(({ project, ...item }) => item),
    status: "pending_payment",
    orderStatus: "PENDING_PAYMENT",
    estimatedDeliveryDays: shop.leadTime ?? "3–5 ngày",
    acceptDeadline: null,
    acceptedAt: null,
    rejectedAt: null,
    carrier: null,
    trackingCode: null,
    timeline: [{ status: "PENDING_PAYMENT", at: now, note: null }],
    paymentId: null,
    paidAt: null,
    shippedAt: null,
    deliveredAt: null,
    cancelledAt: null,
    createdAt: now,
    updatedAt: now,
  };
  db().orders.push(order);
  save();
  return view(order, "CUSTOMER");
}

const createSample: Handler = ({ body }) =>
  placeOrder(body, [{ projectId: String(body.projectId ?? ""), quantity: body.quantity as number, paperStock: body.paperStock as string }]);

const createBundle: Handler = ({ body }) => placeOrder(body, (Array.isArray(body.items) ? body.items : []) as Line[]);

const mine = () => {
  const user = currentUser();
  return (db().orders as MockOrder[])
    .filter((o) => o.userId === user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((order) => view(order, "CUSTOMER"));
};

const getOrder: Handler = ({ params }) => {
  const { order, side, shopRole } = access(params.id);
  return view(order, side, shopRole);
};

const staffOrders: Handler = ({ query }) => {
  const user = currentUser();
  if (user.role !== "ADMIN" && user.role !== "PRINT_SHOP") throw new MockHttpError(403, "Không có quyền xem đơn của xưởng.");
  const member = user.role === "PRINT_SHOP" ? memberOf(user) : null;
  const status = query.get("status");
  const shop = member?.printShopId ?? query.get("printShopId");
  const limit = Number(query.get("limit")) || 100;
  return (db().orders as MockOrder[])
    .filter((o) => (!status || o.orderStatus === status) && (!shop || o.printShopId === shop))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit)
    .map((order) => view(order, member ? "SHOP" : "ADMIN", member?.role ?? null));
};

const updateStatus: Handler = ({ params, body }) => {
  const { order, side, user, shopRole } = access(params.id);
  if (side === "CUSTOMER") throw notFound("Đơn hàng không tồn tại");
  const to = body.status as OrderStatus;
  if (side === "SHOP" && !SHOP_TARGETS.includes(to)) throw new MockHttpError(403, "Tài khoản xưởng in chỉ cập nhật các bước in, giao và đã giao");
  if (to === "IN_PRODUCTION" && !order.acceptedAt) {
    if (side === "SHOP") throw conflict("Hãy nhận đơn trước khi bắt đầu in");
    order.acceptedAt = nowIso();
  }
  const note = typeof body.note === "string" ? body.note : null;
  if (to === "SHIPPED") {
    const problem = shipmentProblem(body.carrier as string, body.trackingCode as string);
    if (problem) throw badRequest(problem);
  }
  if (to === "DELIVERED" && side === "SHOP" && (note?.trim().length ?? 0) < 5) {
    throw badRequest("Ghi bằng chứng đã giao (hãng báo đã giao, người nhận ký…) vào ghi chú");
  }
  moveTo(order, to, note);
  if (to === "SHIPPED") {
    const carrier = carrierOf(body.carrier as string)!;
    order.carrier = carrier.id;
    order.trackingCode = carrier.needsCode ? String(body.trackingCode).trim() : null;
    system(order.id, `Đã gửi hàng qua ${carrier.name}${order.trackingCode ? `, mã vận đơn ${order.trackingCode}` : ""}.`);
  }
  notifyOrder("ORDER_UPDATE", ref(order), [order.userId], to.toLowerCase(), { id: user.id, name: null });
  save();
  return view(order, side, shopRole);
};

const accept: Handler = ({ params }) => {
  const { order, side, user, shopRole } = access(params.id);
  if (side === "CUSTOMER") throw notFound("Đơn hàng không tồn tại");
  if (statusOf(order) !== "PAID" || order.acceptedAt || order.rejectedAt) throw conflict("Đơn không còn chờ xưởng nhận");
  order.acceptedAt = nowIso();
  system(order.id, `${order.printShopName ?? "Xưởng"} đã nhận đơn.`);
  notifyOrder("ORDER_UPDATE", ref(order), [order.userId], "accepted", { id: user.id, name: null });
  save();
  return view(order, side, shopRole);
};

const reject: Handler = ({ params, body }) => {
  const { order, side, user, shopRole } = access(params.id);
  if (side !== "SHOP") throw new MockHttpError(403, "Chỉ xưởng của đơn được từ chối đơn");
  const reason = String(body.reason ?? "").trim();
  if (reason.length < 5) throw badRequest("Lý do từ chối cần ít nhất 5 ký tự");
  if (statusOf(order) !== "PAID" || order.acceptedAt || order.rejectedAt) throw conflict("Đơn không còn chờ xưởng nhận");
  order.rejectedAt = nowIso();
  (order as MockOrder).rejectReason = reason;
  system(order.id, "Xưởng không nhận được đơn này. WrapFit đang chuyển đơn sang xưởng khác.");
  notifyOrder("ORDER_ALERT", ref(order), adminAccounts(), "rejected", { id: user.id, name: null });
  notifyOrder("ORDER_UPDATE", ref(order), [order.userId], "reassigning", { id: user.id, name: null });
  save();
  return view(order, side, shopRole);
};

const reassign: Handler = ({ params, body }) => {
  const { order, side, user } = access(params.id);
  if (side !== "ADMIN") throw new MockHttpError(403, "Chỉ quản trị viên");
  if (statusOf(order) !== "PAID" || order.acceptedAt) throw conflict("Chỉ chuyển được đơn đã thanh toán mà chưa xưởng nào nhận");
  const shop = MOCK_SHOPS.find((s) => s.id === body.printShopId && (s.status ?? "active") === "active");
  if (!shop) throw new MockHttpError(400, "Xưởng này không nhận được đơn", { code: "PRINT_SHOP_UNAVAILABLE" });
  const fee = platformFeeSplit({ subtotalVnd: order.subtotalVnd ?? 0, totalVnd: order.totalVnd ?? 0 }, shop.platformFeeBps);
  Object.assign(order, {
    printShopId: shop.id,
    printShopName: shop.name,
    ...fee,
    rejectedAt: null,
    rejectReason: null,
    acceptDeadline: acceptDeadlineFrom(new Date()).toISOString(),
  });
  system(order.id, `Đơn được chuyển sang ${shop.name}.`);
  notifyOrder("ORDER_UPDATE", ref(order), [order.userId], "reassigned", { id: user.id, name: null });
  notifyOrder("ORDER_NEW", ref(order), shopAccounts(shop.id), "paid");
  save();
  return view(order, "ADMIN");
};

const received: Handler = ({ params }) => {
  const { order, side, user } = access(params.id);
  if (side !== "CUSTOMER") throw new MockHttpError(403, "Chỉ người đặt đơn xác nhận đã nhận hàng");
  moveTo(order, "DELIVERED", "Khách xác nhận đã nhận hàng");
  notifyOrder("ORDER_UPDATE", ref(order), shopAccounts(order.printShopId), "received", { id: user.id, name: null });
  save();
  return view(order, side);
};

const printFiles: Handler = ({ params }) => {
  const { order } = access(params.id);
  const lines = order.items?.length ? order.items : [{ projectId: order.projectId, projectTitle: order.projectTitle }];
  const files: OrderPrintFile[] = [];
  lines.forEach((line, index) => {
    const seen = new Set<string>();
    for (const job of db().exportJobs.filter((j) => j.projectId === line.projectId && j.status === "COMPLETED" && j.downloadUrl)) {
      if (seen.has(job.fileType)) continue;
      seen.add(job.fileType);
      files.push({
        projectTitle: line.projectTitle,
        projectVersion: order.projectVersion ?? 1,
        fileType: job.fileType as OrderPrintFile["fileType"],
        fileName: `${order.orderCode}-${index + 1}-${job.fileType.toLowerCase()}`,
        url: job.downloadUrl!,
        expiresIn: 900,
      });
    }
  });
  return files;
};

const listMessages: Handler = ({ params }) => {
  const { order, side, user } = access(params.id);
  if (side === "CUSTOMER") order.customerReadAt = nowIso();
  if (side === "SHOP") order.shopReadAt = nowIso();
  save();
  return messages()
    .filter((m) => m.orderId === order.id)
    .map(({ orderId: _o, authorId, ...m }) => ({
      ...m,
      authorName: m.authorRole === "SHOP" ? (order.printShopName ?? "Xưởng") : m.authorRole === "CUSTOMER" ? order.recipientName : "WrapFit",
      mine: m.authorRole === side && (side !== "CUSTOMER" || authorId === user.id),
      flagged: side === "CUSTOMER" ? false : m.flagged,
    }));
};

const postMessage: Handler = ({ params, body }) => {
  const { order, side, user } = access(params.id);
  const text = String(body.body ?? "").trim();
  if (!text) throw badRequest("Tin nhắn trống");
  if (text.length > 2000) throw badRequest("Tin nhắn tối đa 2000 ký tự");
  const flagged = side !== "ADMIN" && !order.acceptedAt && messageNeedsWarning(text);
  const message: MockMessage = {
    id: newId("msg-"),
    orderId: order.id,
    authorId: user.id,
    authorRole: side,
    authorName: side === "SHOP" ? (order.printShopName ?? "Xưởng") : side === "ADMIN" ? "WrapFit" : order.recipientName,
    mine: true,
    body: text,
    flagged,
    createdAt: nowIso(),
  };
  messages().push(message);
  if (side === "CUSTOMER") order.customerReadAt = message.createdAt;
  if (side === "SHOP") order.shopReadAt = message.createdAt;
  const to = side === "CUSTOMER" ? shopAccounts(order.printShopId) : side === "SHOP" ? [order.userId] : [order.userId, ...shopAccounts(order.printShopId)];
  notifyOrder("ORDER_MESSAGE", ref(order), to, "message", { id: user.id, name: message.authorName });
  save();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { orderId, authorId, ...view } = message;
  return { message: { ...view, flagged: side === "CUSTOMER" ? false : flagged }, warning: flagged };
};

function partnerMe(user: MockUser): PartnerMe {
  const member = memberOf(user);
  const shop = MOCK_SHOPS.find((s) => s.id === member.printShopId)!;
  return {
    role: member.role,
    shop: {
      ...publicShop(shop),
      phone: shop.phone,
      zalo: shop.zalo,
      contactEmail: shop.contactEmail,
      dailyCapacity: shop.dailyCapacity,
      ...(member.role === "OWNER" ? { platformFeeBps: shop.platformFeeBps } : {}),
    },
  };
}

const me: Handler = () => partnerMe(currentUser());

const summary: Handler = () => {
  const user = currentUser();
  const { printShopId } = memberOf(user);
  const mineOrders = (db().orders as MockOrder[]).filter((o) => o.printShopId === printShopId);
  const waiting = mineOrders.filter((o) => statusOf(o) === "PAID" && !o.acceptedAt && !o.rejectedAt);
  return {
    waitingAccept: waiting.length,
    overdueAccept: waiting.filter((o) => o.acceptDeadline && o.acceptDeadline < nowIso()).length,
    toStart: mineOrders.filter((o) => statusOf(o) === "PAID" && !!o.acceptedAt).length,
    inProduction: mineOrders.filter((o) => statusOf(o) === "IN_PRODUCTION").length,
    shipped: mineOrders.filter((o) => statusOf(o) === "SHIPPED").length,
    unreadMessages: mineOrders.reduce((sum, o) => sum + unread(o, "SHOP"), 0),
  };
};

const updateShop: Handler = ({ body }) => {
  const user = currentUser();
  const member = memberOf(user);
  if (member.role !== "OWNER") throw new MockHttpError(403, "Chỉ chủ xưởng đổi được thông tin xưởng");
  const shop = MOCK_SHOPS.find((s) => s.id === member.printShopId)!;
  if ("pausedUntil" in body) shop.pausedUntil = (body.pausedUntil as string | null) ?? null;
  if (typeof body.dailyCapacity === "number") shop.dailyCapacity = body.dailyCapacity;
  if (typeof body.phone === "string") shop.phone = body.phone;
  if (typeof body.zalo === "string") shop.zalo = body.zalo || null;
  return partnerMe(user);
};

export const orderRoutes: [string, string, Handler][] = [
  ["POST", "/orders/sample", createSample],
  ["POST", "/orders/sample/bundle", createBundle],
  ["GET", "/orders/my-orders", mine],
  ["GET", "/orders", staffOrders],
  ["GET", "/orders/:id", getOrder],
  ["PATCH", "/orders/:id/status", updateStatus],
  ["POST", "/orders/:id/accept", accept],
  ["POST", "/orders/:id/reject", reject],
  ["PATCH", "/orders/:id/shop", reassign],
  ["POST", "/orders/:id/received", received],
  ["GET", "/orders/:id/print-files", printFiles],
  ["GET", "/orders/:id/messages", listMessages],
  ["POST", "/orders/:id/messages", postMessage],
  ["GET", "/partner/me", me],
  ["GET", "/partner/summary", summary],
  ["PATCH", "/partner/shop", updateShop],
];

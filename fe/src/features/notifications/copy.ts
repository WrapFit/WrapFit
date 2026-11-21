/** Wording and links of the notification inbox (docs-old/25 S8, docs/19 G.5). Pure functions: no React, no API. */

import { ROUTES } from "@/constants";
import type { AppNotification, Role } from "@/types/api";

/** Shown for a remixer without a name, or whose account was deleted or anonymized. */
export const UNKNOWN_ACTOR = "Một người dùng WrapFit";

const FILE_LABELS: Record<string, string> = {
  PDF_CMYK: "PDF CMYK",
  PDF_A4_PRINT: "PDF A4/A3 in thủ công",
  SVG: "SVG",
  DXF: "DXF",
  PRINT_PACKAGE: "gói nhà in",
};

/** What happened to an order, for the customer (ORDER_UPDATE) and the shop (ORDER_UPDATE, ORDER_NEW). */
const ORDER_EVENTS: Record<string, string> = {
  paid: "có đơn mới đã thanh toán, chờ xưởng nhận",
  accepted: "đã được xưởng nhận và sẽ sớm vào in",
  in_production: "đang được in",
  shipped: "đã được gửi đi",
  delivered: "đã giao xong",
  received: "đã được khách xác nhận nhận hàng",
  cancelled: "đã bị hủy",
  reassigning: "đang được WrapFit chuyển sang xưởng khác",
  reassigned: "đã được chuyển sang xưởng mới",
};

/** What the admins are alerted about (ORDER_ALERT). */
const ORDER_ALERTS: Record<string, string> = {
  rejected: "bị xưởng từ chối, cần chuyển sang xưởng khác",
  overdue: "quá hạn mà chưa xưởng nào nhận",
};

const isOrder = (notification: AppNotification) => notification.type.startsWith("ORDER_");

/**
 * The page each notification opens: my own design (never the remixer's copy), my print files, or the order in the
 * space of the reader (customer orders, shop portal, admin console).
 */
export function notificationHref(notification: AppNotification, role?: Role): string {
  if (isOrder(notification)) {
    const id = notification.order?.id;
    if (role === "ADMIN" || notification.type === "ORDER_ALERT") return "/admin/print-shops";
    if (role === "PRINT_SHOP" || notification.type === "ORDER_NEW") return id ? `/partner/orders/${id}` : "/partner";
    return id ? `/dashboard/orders?order=${id}` : "/dashboard/orders";
  }
  if (notification.type === "EXPORT_COMPLETED" || !notification.project) return "/dashboard/orders";
  return ROUTES.editor(notification.project.id);
}

/** One sentence, in the product's tone. */
export function notificationText(notification: AppNotification): string {
  if (isOrder(notification)) {
    const code = notification.order?.orderCode ?? "";
    if (notification.type === "ORDER_MESSAGE") {
      const from = notification.actorName ?? "WrapFit";
      return notification.count > 1 ? `Đơn ${code} có ${notification.count} tin nhắn mới, gần nhất từ ${from}.` : `${from} nhắn trong đơn ${code}.`;
    }
    if (notification.type === "ORDER_ALERT") return `Đơn ${code} ${ORDER_ALERTS[notification.event ?? ""] ?? "cần xử lý"}.`;
    if (notification.type === "ORDER_NEW") return `Đơn ${code}: ${ORDER_EVENTS.paid}.`;
    return `Đơn ${code} ${ORDER_EVENTS[notification.event ?? ""] ?? "vừa được cập nhật"}.`;
  }
  const title = `“${notification.project?.title ?? ""}”`;
  if (notification.type === "EXPORT_COMPLETED") {
    const label = FILE_LABELS[notification.export?.fileType ?? ""];
    return `File in ${label ? `${label} ` : ""}của ${title} đã sẵn sàng. Mở danh sách file in để tải về.`;
  }
  const actor = notification.actorName ?? UNKNOWN_ACTOR;
  return notification.count > 1
    ? `${title} có ${notification.count} lượt remix mới, gần nhất từ ${actor}.`
    : `${actor} đã remix thiết kế ${title} của bạn.`;
}

/** Badge text: 1…99, then "99+". */
export const unreadBadge = (count: number) => (count > 99 ? "99+" : String(count));

/** Wording and links of the notification inbox (docs/25 S8). Pure functions: no React, no API. */

import { ROUTES } from "@/constants";
import type { AppNotification } from "@/types/api";

/** Shown for a remixer without a name, or whose account was deleted or anonymized. */
export const UNKNOWN_ACTOR = "Một người dùng WrapFit";

const FILE_LABELS: Record<string, string> = {
  PDF_CMYK: "PDF CMYK",
  PDF_A4_PRINT: "PDF A4/A3 in thủ công",
  SVG: "SVG",
  DXF: "DXF",
  PRINT_PACKAGE: "gói nhà in",
};

/** The page each notification opens: my own design (never the remixer's copy), or the list of my print files. */
export function notificationHref(notification: AppNotification): string {
  return notification.type === "EXPORT_COMPLETED" ? "/dashboard/orders" : ROUTES.editor(notification.project.id);
}

/** One sentence, in the product's tone. */
export function notificationText(notification: AppNotification): string {
  const title = `“${notification.project.title}”`;
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

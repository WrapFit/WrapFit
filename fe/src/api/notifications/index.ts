/** Notification inbox (`be/src/notifications`, docs-old/25 S8): the bell of the header. */

import { request } from "@/services/api";
import type { NotificationPage } from "@/types/api";

/** My notifications, newest first; pass `nextBefore` to continue. */
export function listNotifications(params: { before?: string; limit?: number } = {}): Promise<NotificationPage> {
  return request("/notifications", { query: params });
}

/** Number of unread notifications (the badge of the bell). */
export function getUnreadNotificationCount(): Promise<{ count: number }> {
  return request("/notifications/unread-count");
}

/** Idempotent; 404 for a notification that is not mine. */
export function markNotificationRead(id: string): Promise<void> {
  return request(`/notifications/${id}/read`, { method: "POST" });
}

export function markAllNotificationsRead(): Promise<{ updated: number }> {
  return request("/notifications/read-all", { method: "POST" });
}

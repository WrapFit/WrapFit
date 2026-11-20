/** Notification inbox of the offline demo, like `be/src/notifications` (docs-old/25 S8). */

import type { AppNotification } from "@/types/api";
import { currentUser, cursorPage, notFound, type Handler } from "../http";
import { DEMO_USER_ID, db, newId, nowIso, save, type MockProject } from "../store";

type MockNotification = AppNotification & { userId: string };

const HOUR = 3_600_000;

/** The demo account starts with a remix and a finished print file, so the bell has something to show. */
function seed(): MockNotification[] {
  const now = Date.now();
  const at = (hoursAgo: number) => new Date(now - hoursAgo * HOUR).toISOString();
  return [
    {
      id: "notif-seed-remix",
      userId: DEMO_USER_ID,
      type: "PROJECT_REMIXED",
      createdAt: at(2),
      readAt: null,
      project: { id: "demo-tuck-top", title: "Hộp Nến Thơm Tinh Dầu Lavender" },
      count: 3,
      actorName: "Tiệm Gốm Mộc",
      export: null,
    },
    {
      id: "notif-seed-export",
      userId: DEMO_USER_ID,
      type: "EXPORT_COMPLETED",
      createdAt: at(26),
      readAt: at(25),
      project: { id: "demo-sleeve", title: "Hộp Bao Diêm Khay Rút — Trang Sức Bạc" },
      count: 1,
      actorName: null,
      export: { jobId: "demo-export-1", fileType: "PDF_CMYK" },
    },
  ];
}

/** Older demo databases have no notifications yet. */
const store = (): MockNotification[] => {
  const data = db() as ReturnType<typeof db> & { notifications?: MockNotification[] };
  data.notifications ??= seed();
  return data.notifications;
};

const mine = () => {
  const user = currentUser();
  return store().filter((n) => n.userId === user.id);
};

const strip = ({ userId: _userId, ...notification }: MockNotification): AppNotification => notification;

/**
 * Called by the demo's remix: "someone remixed your design" for the author, folded into the unread one of the same
 * design, as the API does. Nothing for a self-remix.
 */
export function notifyRemix(source: MockProject, remixerId: string, remixerName: string | null): void {
  if (source.ownerId === remixerId) return;
  const unread = store().find((n) => n.userId === source.ownerId && n.type === "PROJECT_REMIXED" && n.project.id === source.id && !n.readAt);
  if (unread) {
    unread.count += 1;
    unread.actorName = remixerName;
    unread.createdAt = nowIso();
  } else {
    store().push({
      id: newId("notif-"),
      userId: source.ownerId,
      type: "PROJECT_REMIXED",
      createdAt: nowIso(),
      readAt: null,
      project: { id: source.id, title: source.title },
      count: 1,
      actorName: remixerName,
      export: null,
    });
  }
  save();
}

const list: Handler = ({ query }) => {
  const page = cursorPage(mine(), query, 20);
  return { items: page.entries.map(strip), nextBefore: page.nextBefore };
};

const unreadCount: Handler = () => ({ count: mine().filter((n) => !n.readAt).length });

const markRead: Handler = ({ params }) => {
  const notification = mine().find((n) => n.id === params.id);
  if (!notification) throw notFound("Không tìm thấy thông báo.");
  notification.readAt ??= nowIso();
  save();
  return undefined;
};

const markAllRead: Handler = () => {
  const unread = mine().filter((n) => !n.readAt);
  const at = nowIso();
  for (const notification of unread) notification.readAt = at;
  save();
  return { updated: unread.length };
};

export const notificationRoutes: [string, string, Handler][] = [
  ["GET", "/notifications", list],
  ["GET", "/notifications/unread-count", unreadCount],
  ["POST", "/notifications/read-all", markAllRead],
  ["POST", "/notifications/:id/read", markRead],
];

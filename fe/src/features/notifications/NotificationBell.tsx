"use client";

import { AlertTriangle, Bell, CheckCheck, FileCheck2, MessageCircle, PackagePlus, Shuffle, Truck } from "lucide-react";
import { useAuth } from "@/features/auth";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useId, useRef, useState } from "react";
import { Button, Skeleton } from "@/components/ui";
import { formatRelative } from "@/features/dashboard/format";
import type { AppNotification } from "@/types/api";
import { cn } from "@/utils/helpers";
import { notificationHref, notificationText, unreadBadge } from "./copy";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationFeed,
  useNotificationsLive,
  useUnreadNotificationCount,
} from "./useNotifications";

export interface NotificationBellProps {
  /** Classes of the round trigger, so it matches the other buttons of the header. */
  buttonClassName?: string;
}

/**
 * Bell of the signed-in header (docs-old/25 S8): unread badge, and a panel listing my notifications newest first, with
 * "Xem thêm", "Đánh dấu đã đọc tất cả", and loading, error and empty states. Opening an item marks it read. Mount it for
 * a signed-in user only.
 */
export function NotificationBell({ buttonClassName }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const unread = useUnreadNotificationCount(true);
  useNotificationsLive(true);
  const count = unread.data?.count ?? 0;

  useEffect(() => setOpen(false), [pathname]);

  // Closes on Escape (focus back on the bell) and on a press outside.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  const label = count > 0 ? `Thông báo, ${count} chưa đọc` : "Thông báo";
  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={label}
        title="Thông báo"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-haspopup="dialog"
        className={cn("relative", buttonClassName)}
      >
        <Bell className="size-[18px]" strokeWidth={1.75} aria-hidden />
        {count > 0 && (
          <span
            aria-hidden
            className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-fpt-orange px-1 text-cad-spec-micro font-bold leading-none text-white ring-2 ring-white"
          >
            {unreadBadge(count)}
          </span>
        )}
      </button>
      {open && <NotificationPanel id={panelId} unread={count} onNavigate={() => setOpen(false)} />}
    </div>
  );
}

function NotificationPanel({ id, unread, onNavigate }: { id: string; unread: number; onNavigate(): void }) {
  const feed = useNotificationFeed(true);
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const titleId = `${id}-title`;
  const items = feed.data?.pages.flatMap((page) => page.items) ?? [];

  let body: React.ReactNode;
  if (feed.isPending) {
    body = (
      <div aria-busy="true" className="flex flex-col gap-1 p-2">
        <span role="status" className="sr-only">
          Đang tải thông báo…
        </span>
        {[0, 1, 2].map((index) => (
          <div key={index} aria-hidden className="flex items-start gap-3 rounded-xl p-2.5">
            <Skeleton shape="circle" className="size-9" />
            <span className="flex flex-1 flex-col gap-2 pt-1">
              <Skeleton shape="text" className="h-3.5 w-4/5" />
              <Skeleton shape="text" className="h-3 w-1/3" />
            </span>
          </div>
        ))}
      </div>
    );
  } else if (feed.isError && items.length === 0) {
    body = (
      <div role="alert" className="flex flex-col items-center gap-3 px-4 py-8 text-center">
        <p className="text-sm text-landing-muted">Chưa tải được thông báo. Kiểm tra kết nối rồi thử lại.</p>
        <Button size="sm" variant="secondary" loading={feed.isFetching} loadingLabel="Đang tải lại…" onClick={() => void feed.refetch()}>
          Thử lại
        </Button>
      </div>
    );
  } else if (items.length === 0) {
    body = (
      <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
        <span className="flex size-11 items-center justify-center rounded-full bg-landing-tile text-landing-ink">
          <Bell className="size-5" strokeWidth={1.75} aria-hidden />
        </span>
        <p className="text-sm font-medium text-landing-ink">Chưa có thông báo nào</p>
        <p className="text-xs leading-5 text-landing-muted">
          Khi có người remix thiết kế của bạn hoặc file in xuất xong, bạn sẽ thấy ở đây.
        </p>
      </div>
    );
  } else {
    body = (
      <>
        <ul className="flex flex-col gap-0.5 p-1.5">
          {items.map((item) => (
            <li key={item.id}>
              <NotificationItem
                notification={item}
                onOpen={() => {
                  if (!item.readAt) markRead.mutate(item.id);
                  onNavigate();
                }}
              />
            </li>
          ))}
        </ul>
        {feed.hasNextPage && (
          <div className="px-3 pb-3">
            <Button
              size="sm"
              variant="ghost"
              block
              loading={feed.isFetchingNextPage}
              loadingLabel="Đang tải thêm…"
              onClick={() => void feed.fetchNextPage()}
            >
              Xem thêm
            </Button>
          </div>
        )}
        {feed.isError && (
          <p role="alert" className="px-4 pb-3 text-center text-xs text-danger-fg">
            Chưa tải thêm được. Thử lại sau ít phút.
          </p>
        )}
      </>
    );
  }

  return (
    <div
      id={id}
      role="dialog"
      aria-labelledby={titleId}
      className="fixed inset-x-2 top-[4.25rem] z-50 flex max-h-[calc(100dvh-5.5rem)] flex-col overflow-clip rounded-2xl bg-white shadow-[0_10px_30px_-6px_rgba(29,41,61,0.18)] ring-1 ring-landing-ink/10 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:max-h-[min(560px,calc(100dvh-6rem))] sm:w-[380px]"
    >
      <div className="flex items-center justify-between gap-3 border-b border-landing-line/60 px-4 py-3">
        <h2 id={titleId} className="min-w-0 text-sm font-semibold text-landing-ink">
          Thông báo
          {unread > 0 && <span className="ml-1.5 whitespace-nowrap font-normal text-landing-muted">({unread} chưa đọc)</span>}
        </h2>
        <Button
          size="sm"
          variant="link"
          className="text-xs"
          disabled={unread === 0 || markAll.isPending}
          onClick={() => markAll.mutate()}
          leadingIcon={<CheckCheck aria-hidden />}
        >
          <span className="sm:hidden">Đọc hết</span>
          <span className="hidden sm:inline">Đánh dấu đã đọc tất cả</span>
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{body}</div>
      <div className="border-t border-landing-line/60 px-4 py-2.5 text-center">
        <Link href="/notifications" onClick={onNavigate} className="text-xs font-medium text-landing-ink underline-offset-4 hover:underline">
          Xem việc cần xử lý của tài khoản
        </Link>
      </div>
    </div>
  );
}

const ICONS: Record<AppNotification["type"], typeof Shuffle> = {
  PROJECT_REMIXED: Shuffle,
  EXPORT_COMPLETED: FileCheck2,
  ORDER_UPDATE: Truck,
  ORDER_MESSAGE: MessageCircle,
  ORDER_NEW: PackagePlus,
  ORDER_ALERT: AlertTriangle,
};

function NotificationItem({ notification, onOpen }: { notification: AppNotification; onOpen(): void }) {
  const { user } = useAuth();
  const unread = !notification.readAt;
  const Icon = ICONS[notification.type] ?? Shuffle;
  return (
    <Link
      href={notificationHref(notification, user?.role)}
      onClick={onOpen}
      className={cn(
        "flex items-start gap-3 rounded-xl p-2.5 outline-none transition-colors hover:bg-landing-tile/70 focus-visible:ring-[3px] focus-visible:ring-landing-ink/20",
        unread && "bg-fpt-orange-light/40",
      )}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full",
          unread ? "bg-fpt-orange-light text-fpt-orange-ink" : "bg-landing-tile text-landing-muted",
        )}
      >
        <Icon className="size-4" strokeWidth={1.75} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block text-sm leading-5", unread ? "font-medium text-landing-ink" : "text-landing-muted")}>
          {notificationText(notification)}
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 text-xs text-landing-muted">
          {unread && <span className="sr-only">Chưa đọc. </span>}
          <time dateTime={notification.createdAt}>{formatRelative(notification.createdAt)}</time>
        </span>
      </span>
      {unread && <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-fpt-orange" />}
    </Link>
  );
}

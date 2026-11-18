import type { Socket } from "socket.io-client";
import { API_BASE_URL, OFFLINE_DEMO } from "@/config";

/**
 * Id of this browser tab, sent with project saves (`X-WF-Tab`) and echoed in `project.saved` so the tab that saved
 * ignores its own save (docs/28 Q5). Module state, not sessionStorage: a duplicated tab copies sessionStorage.
 */
export const TAB_ID: string =
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

type Handler = (payload: unknown) => void;

const handlers = new Map<string, Set<Handler>>();
let socket: Socket | null = null;
let opening = false;
let retry: ReturnType<typeof setTimeout> | undefined;

const listenerCount = () => [...handlers.values()].reduce((count, set) => count + set.size, 0);

function open(): void {
  if (socket || opening) return;
  opening = true;
  // socket.io-client is loaded only when a signed-in screen listens.
  void import("socket.io-client")
    .then(({ io }) => {
      opening = false;
      if (socket || listenerCount() === 0) return;
      // `/api` -> `<this origin>/events` on path `/api/socket.io` (the gateway's path, behind the same proxy).
      const base = new URL(API_BASE_URL, window.location.href);
      const opened = io(`${base.origin}/events`, {
        path: `${base.pathname.replace(/\/+$/, "")}/socket.io`,
        // The Next.js `/api/*` rewrite drops a trailing slash before the query (the gateway accepts both).
        addTrailingSlash: false,
        withCredentials: true,
        reconnectionDelayMax: 30_000,
      });
      opened.onAny((event: string, payload: unknown) => handlers.get(event)?.forEach((handler) => handler(payload)));
      // The server closes a socket whose access cookie expired: come back once the client has refreshed it.
      opened.on("disconnect", (reason) => {
        if (reason === "io server disconnect") retry = setTimeout(() => opened.connect(), 15_000);
      });
      socket = opened;
    })
    .catch(() => {
      opening = false;
    });
}

function close(): void {
  clearTimeout(retry);
  socket?.close();
  socket = null;
}

/**
 * Listens to an event of the API's WebSocket gateway (`be/src/events/events.gateway.ts`): one socket per tab, opened
 * with the first listener and closed with the last. Best effort: without a socket nothing arrives, and every caller
 * must stay correct on its own (polling, 409 on save). Returns the unsubscribe function.
 */
export function onServerEvent(event: string, handler: Handler): () => void {
  if (OFFLINE_DEMO || typeof window === "undefined") return () => undefined;
  let set = handlers.get(event);
  if (!set) handlers.set(event, (set = new Set()));
  set.add(handler);
  open();
  return () => {
    set.delete(handler);
    if (set.size === 0) handlers.delete(event);
    if (listenerCount() === 0) close();
  };
}

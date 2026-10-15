"use client";

import { useCallback, useEffect, useState } from "react";

// Sample-print cart. The API takes one sample order per project (`POST /orders/sample`, 1–10 boxes) and has no cart:
// the chosen projects stay on this device until the orders are placed.

export interface CartItem {
  projectId: string;
  quantity: number;
  paperStock: string;
}

export const PAPER_STOCKS = ["Ivory 300 GSM", "Kraft 300 GSM", "Duplex 350 GSM", "Carton bồi 400 GSM"] as const;
export const MAX_QUANTITY = 10;

/** Fee of a sample order, as be/src/orders/orders.service.ts computes it: 49.000đ the first box, 25.000đ each more. */
export const sampleFee = (quantity: number) => 49_000 + Math.max(0, quantity - 1) * 25_000;

/** Codes of the launch campaigns, checked again by the print shop when it confirms the order. */
export const PROMO_CODES: Record<string, { label: string; discount: (subtotal: number, firstBoxes: number) => number }> = {
  WORKSHOPTET: { label: "Workshop Tết 2027: hộp mẫu đầu tiên miễn phí", discount: (_subtotal, firstBoxes) => Math.min(1, firstBoxes) * 49_000 },
  WRAPFIT10: { label: "Giảm 10% đơn in mẫu", discount: (subtotal) => Math.round(subtotal * 0.1) },
};

const KEY = "wrapfit:sample-cart";
const EVENT = "wrapfit:cart";

function read(): CartItem[] {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((item) => typeof item?.projectId === "string") : [];
  } catch {
    return [];
  }
}

function write(items: CartItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // Private mode: the cart lives until the page closes.
  }
  window.dispatchEvent(new Event(EVENT));
}

/** The cart, shared by every component of the page and kept in sync across tabs. */
export function useSampleCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setItems(read());
    sync();
    setReady(true);
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const save = useCallback((next: CartItem[]) => {
    setItems(next);
    write(next);
  }, []);

  return {
    items,
    ready,
    add: (projectId: string, paperStock: string = PAPER_STOCKS[0]) =>
      save(items.some((item) => item.projectId === projectId) ? items : [...items, { projectId, quantity: 1, paperStock }]),
    update: (projectId: string, change: Partial<CartItem>) => save(items.map((item) => (item.projectId === projectId ? { ...item, ...change } : item))),
    remove: (projectId: string) => save(items.filter((item) => item.projectId !== projectId)),
    clear: () => save([]),
  };
}

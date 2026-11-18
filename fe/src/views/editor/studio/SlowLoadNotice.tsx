"use client";

import React, { useEffect, useState } from "react";
import { buttonClass } from "@/components/ui";

/** After this long on the studio placeholder, the user gets a way out instead of an endless skeleton. */
const SLOW_LOAD_MS = 20_000;

/**
 * Shown on the studio placeholder when the studio code takes unusually long: the chunk may have been lost (a deploy or
 * a dev rebuild while it loaded, a flaky network). A reload fetches it again.
 */
export function SlowLoadNotice() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), SLOW_LOAD_MS);
    return () => window.clearTimeout(timer);
  }, []);
  if (!slow) return null;
  return (
    <div role="alert" className="fixed inset-x-4 bottom-6 z-50 mx-auto flex max-w-md flex-wrap items-center gap-3 rounded-panel bg-surface-raised p-4 shadow-popover ring-1 ring-line">
      <p className="min-w-0 flex-1 text-body-sm text-fg">Studio đang tải lâu hơn bình thường. Mạng yếu hoặc trang vừa được cập nhật.</p>
      <button type="button" className={buttonClass({ variant: "brand", size: "sm" })} onClick={() => window.location.reload()}>
        Tải lại trang
      </button>
    </div>
  );
}

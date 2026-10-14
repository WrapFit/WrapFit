"use client";

import dynamic from "next/dynamic";
import React from "react";

/** The folding 3D box, loaded on demand: three.js stays out of the first download of the studio. */
export const Box3DView = dynamic(() => import("./InteractiveFoldingBox3D").then((m) => m.InteractiveFoldingBox3D), {
  ssr: false,
  loading: () => (
    <div role="status" className="flex h-full min-h-[320px] w-full items-center justify-center gap-3 text-sm text-landing-muted">
      <span aria-hidden className="size-5 animate-spin rounded-full border-2 border-landing-line border-t-landing-green motion-reduce:animate-none" />
      Đang dựng hộp 3D…
    </div>
  ),
});

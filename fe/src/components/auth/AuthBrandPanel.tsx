/* ds-artwork: brand panel of the sign-in pages; the warm paper gradient sets it apart from the grey form side. */
import React from "react";
import { LandingLogo } from "@/components/layout/LandingLogo";

/**
 * Left half of `/auth/login` and `/auth/register` from lg up, full height: the WrapFit mark large in the middle, the brand line at the bottom left, on a warm paper gradient. Hidden below
 * lg, where the form stands alone.
 */
export function AuthBrandPanel() {
  return (
    <aside aria-label="WrapFit" className="relative isolate hidden h-screen flex-col justify-between overflow-hidden border-r border-fpt-orange/15 bg-[linear-gradient(160deg,#FFF8F1_0%,#FFFFFF_45%,#FFEEDF_100%)] shadow-[8px_0_40px_-24px_rgba(242,101,34,0.35)] p-12 lg:sticky lg:top-0 text-fg lg:flex xl:p-14">
      <span aria-hidden />

      <LandingLogo
        size="xl"
        className="mx-auto rounded-[32px] transition-transform duration-500 ease-out hover:-translate-y-2 hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus/40 motion-reduce:transition-none motion-reduce:hover:transform-none"
      />

      <p className="font-landing-heading text-5xl font-bold leading-[1.1] tracking-tight xl:text-[56px]">
        Gói trọn tâm ý,
        <br />
        <span className="text-[#C88B00]">chuẩn xác từng mi li</span>
      </p>
    </aside>
  );
}

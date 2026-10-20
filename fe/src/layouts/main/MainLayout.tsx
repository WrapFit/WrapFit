"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { ViewTransition } from "@/components/common/ViewTransition";
import { BottomNavBar } from "@/components/layout";

/**
 * Chrome shared by every route: the page, then the mobile bottom navigation. The page sits in a <ViewTransition>:
 * on navigation the old page fades out and the new one rises in (keyframes `page-*` in globals.css), while the header
 * and the bottom bar keep their own names and stay still. Reduced motion: no animation.
 * On /admin routes, we bypass <ViewTransition> to keep sidebar and page transitions instant and smooth without jerking.
 */
export function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      <ViewTransition enter="page-enter" exit="page-exit" default="page">
        {children}
      </ViewTransition>
      <BottomNavBar />
    </>
  );
}

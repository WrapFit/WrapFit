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
 * The studio (/editor) skips it too: it is a full-screen tool loaded behind a Suspense boundary, and a view transition
 * started while the tab is hidden (a direct load in a background tab) is aborted by the browser and could leave that
 * boundary on its placeholder ("Đang mở Studio 3D…") until the next navigation.
 */
export function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin) {
    return <>{children}</>;
  }

  if (pathname.startsWith("/editor")) {
    return (
      <>
        {children}
        <BottomNavBar />
      </>
    );
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

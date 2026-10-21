"use client";

import React from "react";
import { ViewTransition } from "@/components/common/ViewTransition";
import Link from "next/link";
import { ROUTES } from "@/constants";
import { usePathname } from "next/navigation";
import { useHydrated } from "@/hooks/dom";
import { Home, FolderHeart, Box, Shield } from "lucide-react";
import { GoiMascot } from "@/components/common/GoiMascot";
import { isRealAdmin, useAuth } from "@/features/auth";

import { triggerSquishyClick } from "@/utils/animation/animeUtils";

export const BottomNavBar: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = isRealAdmin(user);
  const routePath = usePathname();
  // The 404 page renders with another pathname on the server: tabs light up only once hydrated.
  const hydrated = useHydrated();
  const pathname = hydrated ? routePath : "";

  const handleTabClick = (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
    
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(15);
    }
    triggerSquishyClick(e.currentTarget);
  };

  // Hide only on fullscreen interactive 3D studio where canvas gestures take priority
  const isFullscreenStudio = routePath === "/editor" || (routePath.startsWith("/editor/") && !routePath.includes("step-"));
  // The intro is a full-screen 3D stage too, with its own stage dock at the bottom (under this bar otherwise).
  const isIntro = routePath.startsWith("/intro");
  // Hide completely on the admin console: admin console has its own dedicated navigation
  const isAdminRoute = routePath.startsWith("/admin");
  if (isFullscreenStudio || isIntro || isAdminRoute) return null;

  const isHome = pathname === "/";
  const isDashboard = pathname.startsWith("/dashboard");
  const isAdminActive = pathname.startsWith("/admin");
  const isStudio = pathname.startsWith("/editor");

  return (
    <ViewTransition name="bottom-nav">
    <nav
      className="md:hidden fixed bottom-3 left-1/2 -translate-x-1/2 z-40 w-[92vw] max-w-[360px] bg-white/90 backdrop-blur-xl border border-white/80 shadow-[0_10px_35px_-5px_rgba(30,86,160,0.18)] rounded-full px-3 py-1.5 flex items-center justify-between select-none"
      aria-label="Điều hướng chính"
    >
      {/* 1. Home Tab */}
      <Link
        href="/"
        onClick={handleTabClick}
        className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-full transition-all duration-200 ${
          isHome
            ? "bg-landing-green-night text-white shadow-tactile scale-105"
            : "text-fg-muted hover:text-fpt-orange-ink"
        }`}
      >
        <Home className="w-4 h-4" />
        <span className="text-caption font-semibold">Trang Chủ</span>
      </Link>

      {/* 2. Admin Console for Admin, Projects for Makers */}
      {isAdmin ? (
        <Link
          href="/admin"
          onClick={handleTabClick}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-full transition-all duration-200 ${
            isAdminActive
              ? "bg-landing-green-night text-white shadow-tactile scale-105"
              : "text-fg-muted hover:text-fpt-orange-ink"
          }`}
        >
          <Shield className="w-4 h-4" />
          <span className="text-caption font-semibold">Quản Trị</span>
        </Link>
      ) : (
        <Link
          href="/dashboard/projects"
          onClick={handleTabClick}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-full transition-all duration-200 ${
            isDashboard
              ? "bg-landing-green-night text-white shadow-tactile scale-105"
              : "text-fg-muted hover:text-fpt-orange-ink"
          }`}
        >
          <FolderHeart className="w-4 h-4" />
          <span className="text-caption font-semibold">Dự Án</span>
        </Link>
      )}

      {/* 3. 2D/3D Studio */}
      <Link
        href={ROUTES.editorNew}
        onClick={handleTabClick}
        className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-full transition-all duration-200 ${
          isStudio
            ? "bg-vibrant-cobalt text-white shadow-cobalt-glow scale-105"
            : "text-fg-muted hover:text-vibrant-cobalt"
        }`}
      >
        <Box className="w-4 h-4" />
        <span className="text-caption font-semibold">Studio 3D</span>
      </Link>

      {/* 4. Mascot Copilot Quick Action */}
      <button
        type="button"
        onClick={(e) => {
          handleTabClick(e);
          // Dispatch custom event to expand floating copilot if present
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("wrapfit_toggle_copilot"));
          }
        }}
        className="flex flex-col items-center gap-0.5 px-2 py-0.5 rounded-full text-fg-muted hover:text-fpt-orange-ink transition"
        title="Trợ lý AI Gói"
      >
        <GoiMascot pose="waving" size={26} showPhotoBadge={false} interactive={false} />
        <span className="text-caption font-bold text-fpt-orange-ink">Bé Gói</span>
      </button>
    </nav>
    </ViewTransition>
  );
};

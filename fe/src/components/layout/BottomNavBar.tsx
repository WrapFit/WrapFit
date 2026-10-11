"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, FolderHeart, Box, Sparkles } from "lucide-react";
import { GoiMascot } from "@/components/common/GoiMascot";

import { STITCH_ROUTES } from "@/features/stitch/routes.generated";
import { triggerSquishyClick } from "@/utils/animation/animeUtils";

export const BottomNavBar: React.FC = () => {
  const pathname = usePathname();

  const handleTabClick = (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
    
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(15);
    }
    triggerSquishyClick(e.currentTarget);
  };

  // Hide only on fullscreen interactive 3D studio where canvas gestures take priority
  const isFullscreenStudio = pathname === "/editor" || (pathname.startsWith("/editor/") && !pathname.includes("step-") && !pathname.includes("export") && !pathname.includes("inspect") && !pathname.includes("materials"));
  // The intro is a full-screen 3D stage too, with its own stage dock at the bottom (under this bar otherwise).
  const isIntro = pathname.startsWith("/intro");
  if (isFullscreenStudio || isIntro) return null;

  const isHome = pathname === "/";
  const isDashboard = pathname.startsWith("/dashboard");
  const isStudio = pathname.startsWith("/editor");

  return (
    <nav
      className="md:hidden fixed bottom-3 left-1/2 -translate-x-1/2 z-40 w-[92vw] max-w-[360px] bg-white/90 backdrop-blur-xl border border-white/80 shadow-[0_10px_35px_-5px_rgba(30,86,160,0.18)] rounded-full px-3 py-1.5 flex items-center justify-between select-none"
      aria-label="Mobile Bottom Navigation"
    >
      {/* 1. Home Tab */}
      <Link
        href="/"
        onClick={handleTabClick}
        className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-full transition-all duration-200 ${
          isHome
            ? "bg-brand-forest text-white shadow-tactile scale-105"
            : "text-stone-500 hover:text-brand-forest"
        }`}
      >
        <Home className="w-4 h-4" />
        <span className="text-[10px] font-semibold">Trang Chủ</span>
      </Link>

      {/* 2. Projects Dashboard */}
      <Link
        href="/dashboard/projects"
        onClick={handleTabClick}
        className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-full transition-all duration-200 ${
          isDashboard
            ? "bg-brand-forest text-white shadow-tactile scale-105"
            : "text-stone-500 hover:text-brand-forest"
        }`}
      >
        <FolderHeart className="w-4 h-4" />
        <span className="text-[10px] font-semibold">Dự Án</span>
      </Link>

      {/* 3. 2D/3D Studio */}
      <Link
        href="/editor/step-1"
        onClick={handleTabClick}
        className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-full transition-all duration-200 ${
          isStudio
            ? "bg-vibrant-cobalt text-white shadow-cobalt-glow scale-105"
            : "text-stone-500 hover:text-vibrant-cobalt"
        }`}
      >
        <Box className="w-4 h-4" />
        <span className="text-[10px] font-semibold">Studio 3D</span>
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
        className="flex flex-col items-center gap-0.5 px-2 py-0.5 rounded-full text-stone-600 hover:text-brand-forest transition"
        title="Trợ lý AI Gói"
      >
        <GoiMascot pose="waving" size={26} showPhotoBadge={false} interactive={false} />
        <span className="text-[10px] font-bold text-brand-forest">Bé Gói</span>
      </button>
    </nav>
  );
};

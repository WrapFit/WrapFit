"use client";

import { Box, FolderOpen, Gift, MessageCircle, PenTool, Printer } from "lucide-react";
import { cn } from "@/utils/helpers";

/** The existing step numbers are also saved in draft data and project links. */
export type StudioStep = 1 | 2 | 3 | 4 | 5 | 6;
const MODES = [
  { step: 2, label: "Hộp & giấy", icon: Box },
  { step: 4, label: "Thiết kế", icon: PenTool },
  { step: 5, label: "Quà tặng", icon: Gift },
  { step: 6, label: "Đặt in", icon: Printer },
] as const;

export function WorkspaceNav({ current, onSelect, onCopilot, onProjects, libraryOpen }: {
  current: StudioStep;
  onSelect(step: StudioStep): void;
  onCopilot?: () => void;
  onProjects(): void;
  libraryOpen: boolean;
}) {
  return (
    <nav aria-label="Công cụ Studio" className="flex shrink-0 items-stretch justify-around bg-fg px-1 pt-1 text-fg-inverse pb-[max(0.25rem,env(safe-area-inset-bottom))] lg:w-[72px] lg:flex-col lg:justify-start lg:gap-2 lg:pt-4">
      {MODES.map(({ step, label, icon: Icon }) => {
        const active = step === (current <= 3 ? 2 : current);
        return (
          <button key={step} type="button" aria-label={label} aria-current={active ? "page" : undefined}
            onClick={() => onSelect(step)}
            className={cn("flex min-h-12 flex-1 flex-col items-center justify-center gap-1 rounded-control px-1 text-caption font-semibold focus-visible:outline-focus lg:min-h-16 lg:flex-none lg:whitespace-nowrap lg:px-0",
              active ? "bg-surface-raised text-accent" : "text-white hover:bg-white/10")}>
            <Icon className="size-5" strokeWidth={1.75} aria-hidden />
            {label}
          </button>
        );
      })}
      <button type="button" aria-label="Dự án" aria-expanded={libraryOpen} onClick={onProjects}
        className="flex min-h-12 flex-1 flex-col items-center justify-center gap-1 rounded-control text-caption font-semibold hover:bg-white/10 focus-visible:outline-focus lg:min-h-16 lg:flex-none xl:hidden">
        <FolderOpen className="size-5" aria-hidden />Dự án
      </button>
      {onCopilot && (
        <button type="button" aria-label="Mở trợ lý Gói" onClick={onCopilot}
          className="flex min-h-12 flex-1 flex-col items-center justify-center gap-1 rounded-control text-caption font-semibold text-white lg:hidden">
          <MessageCircle className="size-5" strokeWidth={1.75} aria-hidden />Gói
        </button>
      )}
    </nav>
  );
}

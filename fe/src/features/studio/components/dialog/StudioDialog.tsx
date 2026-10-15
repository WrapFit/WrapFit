"use client";

import React from "react";
import { Dialog } from "@/components/ui";

interface StudioDialogProps {
  title: string;
  /** Small line under the title (e.g. formats, limits). */
  subtitle?: string;
  icon: React.ReactNode;
  onClose: () => void;
  /** While true, Escape, the backdrop and the close button do nothing (e.g. during a restore). */
  busy?: boolean;
  /** Tailwind max-width of the panel. */
  widthClass?: string;
  children: React.ReactNode;
}

/**
 * Modal of the studio (export, snapshots, sharing, QR): the shared `Dialog`, a bottom sheet on phones and a centred
 * card from `sm`, with focus trap, Escape, backdrop and focus return.
 */
export function StudioDialog({ title, subtitle, icon, onClose, busy = false, widthClass = "max-w-md", children }: StudioDialogProps) {
  return (
    <Dialog title={title} description={subtitle} monoDescription icon={icon} onClose={onClose} busy={busy} size="none" layerClassName="z-50" className={widthClass}>
      {children}
    </Dialog>
  );
}

"use client";

import React from "react";
import { ModalLayer } from "@/components/ui";

interface ModalDialogProps {
  onClose(): void;
  /** Id of the element naming the dialog. */
  labelledBy: string;
  describedBy?: string;
  /** Focused on open; the first focusable element of the panel otherwise. */
  initialFocus?: React.RefObject<HTMLElement | null>;
  panelClassName: string;
  children: React.ReactNode;
}

/**
 * Dashboard modal: the shared `ModalLayer` placed at the bottom on phones (thumb reach) and centred from sm. Rendered
 * inside the screen's `[data-stitch]` root, so its colour tokens apply.
 */
export function ModalDialog(props: ModalDialogProps) {
  return <ModalLayer placement="responsive" layerClassName="z-[60]" backdropClassName="bg-fg/25 backdrop-blur-sm" {...props} />;
}

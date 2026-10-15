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
  /** "sheet" slides in from the right edge, "center" is a card in the middle of the screen. */
  variant: "sheet" | "center";
  /** Stacking class of the layer: a confirmation goes above the drawer. */
  layerClassName?: string;
  panelClassName: string;
  children: React.ReactNode;
}

/**
 * Admin modal layer: the shared `ModalLayer` (focus trap, Escape, backdrop, focus return, scroll lock). Rendered
 * inside the `[data-stitch]` root so the screen's colour tokens apply.
 */
export function ModalDialog({ variant, layerClassName = "z-50", ...rest }: ModalDialogProps) {
  return (
    <ModalLayer
      placement={variant === "sheet" ? "sheet-right" : "center"}
      layerClassName={layerClassName}
      backdropClassName="bg-black/20 backdrop-blur-sm"
      {...rest}
    />
  );
}

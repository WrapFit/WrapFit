"use client";

import React from "react";
import { cn } from "@/utils/helpers";

interface FlowStepClipProps {
  /** Path without extension: `${clip}.mp4` is the video, `${clip}.webp` its still. */
  clip: string;
  label: string;
  className?: string;
}

/** The muted, looping clip of one studio step, played from the start with its controls when the step is opened. */
export function FlowStepClip({ clip, label, className }: FlowStepClipProps) {
  return (
    <video
      src={`${clip}.mp4`}
      poster={`${clip}.webp`}
      aria-label={label}
      autoPlay
      muted
      loop
      playsInline
      controls
      className={cn("block select-none", className)}
    />
  );
}

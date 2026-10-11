"use client";

import type { BoxDimensions, BoxStructureType, MaterialSpecification } from "@wrapfit/shared";
import React, { useState } from "react";
import { BoxPreview } from "./BoxPreview";

interface DesignThumbProps {
  thumbnailUrl: string | null;
  structure: BoxStructureType;
  dimensions: BoxDimensions;
  materialSpec: MaterialSpecification | null;
  alt: string;
  className?: string;
}

/** The saved thumbnail of a design, or its parametric sketch when there is none (or it fails to load). */
export function DesignThumb({ thumbnailUrl, structure, dimensions, materialSpec, alt, className = "" }: DesignThumbProps) {
  const [broken, setBroken] = useState(false);

  if (thumbnailUrl && !broken) {
    return (
      // Plain <img>: storage URLs are not in next/image remote patterns.
      <img
        src={thumbnailUrl}
        alt={alt}
        loading="lazy"
        decoding="async"
        onError={() => setBroken(true)}
        className={`h-full w-full object-contain ${className}`}
      />
    );
  }
  return (
    <BoxPreview
      structure={structure}
      dimensions={dimensions}
      material={materialSpec?.type}
      label={alt}
      className={`h-full w-full ${className}`}
    />
  );
}

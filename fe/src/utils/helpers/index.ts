/** Generic pure helpers. */
import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";
import { RADII, SPACING, TYPE_SCALE } from "@/assets/styles/tokens";

/**
 * tailwind-merge taught the custom tokens: without this, `text-caption` (a size) and `text-fg` (a colour) look like
 * two colours and the first one is dropped.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: TYPE_SCALE.map((style) => style.name) }],
    },
    theme: {
      spacing: Object.keys(SPACING),
      borderRadius: Object.keys(RADII),
    },
  },
});

/** Joins class names and lets a later Tailwind class win over an earlier one of the same property. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

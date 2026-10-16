/**
 * Dimension guides of the 3D stage, shared with the dimension panel (no three.js here, so the panel can import it
 * without loading the 3D bundle).
 */

/** A box measure shown by the dimension guides. */
export type DimensionAxis = "length" | "width" | "height";

export const DIMENSION_AXES: DimensionAxis[] = ["length", "width", "height"];

/** Dimension lines with labels on the model (CAD style): one per measure, the active one stands out. */
export interface DimensionGuides {
  /** Measure being edited or hovered; null: all three at the same strength. */
  active: DimensionAxis | null;
  /** Text of each label, already formatted with its unit ("120 mm"). */
  labels: Record<DimensionAxis, string>;
}

/** One colour per measure, on the model and on the panel: FPT blue, FPT orange, green. */
export const AXIS_COLORS: Record<DimensionAxis, string> = { length: "#005CA9", width: "#F26522", height: "#458C17" };

/** Vietnamese initials: Dài, Rộng, Cao. */
export const AXIS_LETTER: Record<DimensionAxis, string> = { length: "D", width: "R", height: "C" };

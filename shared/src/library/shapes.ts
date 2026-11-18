/**
 * Vector shapes of the "Hình khối" rail (elements of type "shape", docs/23 S4). A shape is drawn as VectorArt at the
 * size of its element, like the library art, so the editor, the 3D box, the thumbnail and the print files draw the
 * same paths (absolute M L C Z only, no arcs; lines at least MIN_LINE_MM).
 */
import { MIN_LINE_MM } from "../print/prepress";
import type { CanvasElement, ShapeKind } from "../types/project";
import { libraryArt, type ArtShape, type VectorArt } from "./art";

export const SHAPE_KINDS: { kind: ShapeKind; name: string }[] = [
  { kind: "rect", name: "Chữ nhật" },
  { kind: "ellipse", name: "Hình tròn" },
  { kind: "line", name: "Đường kẻ" },
  { kind: "arrow", name: "Mũi tên" },
  { kind: "star", name: "Ngôi sao" },
  { kind: "polygon", name: "Đa giác" },
  { kind: "frame", name: "Khung viền" },
];

export const DEFAULT_SHAPE_FILL = "#F26522";
export const DEFAULT_SHAPE_STROKE = "#1D293D";
/** Bézier handle length of a quarter circle, as a fraction of the radius. */
const KAPPA = 0.5522847498;

const n = (value: number) => Number(value.toFixed(3)).toString();

function rectPath(x: number, y: number, w: number, h: number, radius: number): string {
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  if (!r) return `M ${n(x)} ${n(y)} L ${n(x + w)} ${n(y)} L ${n(x + w)} ${n(y + h)} L ${n(x)} ${n(y + h)} Z`;
  const k = r * (1 - KAPPA);
  return [
    `M ${n(x + r)} ${n(y)}`,
    `L ${n(x + w - r)} ${n(y)}`,
    `C ${n(x + w - k)} ${n(y)} ${n(x + w)} ${n(y + k)} ${n(x + w)} ${n(y + r)}`,
    `L ${n(x + w)} ${n(y + h - r)}`,
    `C ${n(x + w)} ${n(y + h - k)} ${n(x + w - k)} ${n(y + h)} ${n(x + w - r)} ${n(y + h)}`,
    `L ${n(x + r)} ${n(y + h)}`,
    `C ${n(x + k)} ${n(y + h)} ${n(x)} ${n(y + h - k)} ${n(x)} ${n(y + h - r)}`,
    `L ${n(x)} ${n(y + r)}`,
    `C ${n(x)} ${n(y + k)} ${n(x + k)} ${n(y)} ${n(x + r)} ${n(y)}`,
    "Z",
  ].join(" ");
}

function ellipsePath(cx: number, cy: number, rx: number, ry: number): string {
  const ox = rx * KAPPA;
  const oy = ry * KAPPA;
  return [
    `M ${n(cx - rx)} ${n(cy)}`,
    `C ${n(cx - rx)} ${n(cy - oy)} ${n(cx - ox)} ${n(cy - ry)} ${n(cx)} ${n(cy - ry)}`,
    `C ${n(cx + ox)} ${n(cy - ry)} ${n(cx + rx)} ${n(cy - oy)} ${n(cx + rx)} ${n(cy)}`,
    `C ${n(cx + rx)} ${n(cy + oy)} ${n(cx + ox)} ${n(cy + ry)} ${n(cx)} ${n(cy + ry)}`,
    `C ${n(cx - ox)} ${n(cy + ry)} ${n(cx - rx)} ${n(cy + oy)} ${n(cx - rx)} ${n(cy)}`,
    "Z",
  ].join(" ");
}

function polygonPath(points: [number, number][]): string {
  return `${points.map(([x, y], i) => `${i ? "L" : "M"} ${n(x)} ${n(y)}`).join(" ")} Z`;
}

/** Corners of a regular polygon or star in the w × h box, first point at the top. */
function radialPoints(w: number, h: number, count: number, inner: number | null): [number, number][] {
  const steps = inner === null ? count : count * 2;
  const points: [number, number][] = [];
  for (let i = 0; i < steps; i++) {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / steps;
    const scale = inner !== null && i % 2 === 1 ? inner : 1;
    points.push([w / 2 + (Math.cos(angle) * w * scale) / 2, h / 2 + (Math.sin(angle) * h * scale) / 2]);
  }
  return points;
}

/** The art of a shape element at its size, or null when the element is not a drawable shape. */
export function shapeArt(element: Pick<CanvasElement, "type" | "width" | "height" | "style" | "shape">): VectorArt | null {
  const { width: w, height: h } = element;
  if (element.type !== "shape" || !element.shape || !(w > 0) || !(h > 0)) return null;
  const style = element.style ?? {};
  const fill = style.fillColor ?? DEFAULT_SHAPE_FILL;
  const strokeWidth = style.strokeWidth && style.strokeWidth > 0 ? Math.max(MIN_LINE_MM, style.strokeWidth) : 0;
  const border = strokeWidth ? { stroke: style.strokeColor ?? DEFAULT_SHAPE_STROKE, strokeWidth } : {};
  const inset = strokeWidth / 2;
  const shapes: ArtShape[] = [];
  switch (element.shape.kind) {
    case "rect":
      shapes.push({ d: rectPath(inset, inset, w - 2 * inset, h - 2 * inset, element.shape.cornerRadius ?? 0), fill, ...border });
      break;
    case "ellipse":
      shapes.push({ d: ellipsePath(w / 2, h / 2, w / 2 - inset, h / 2 - inset), fill, ...border });
      break;
    case "line": {
      const thickness = Math.max(MIN_LINE_MM, strokeWidth || Math.min(h, 1));
      shapes.push({ d: `M 0 ${n(h / 2)} L ${n(w)} ${n(h / 2)}`, stroke: style.strokeColor ?? style.color ?? DEFAULT_SHAPE_STROKE, strokeWidth: thickness, round: true });
      break;
    }
    case "arrow": {
      const shaft = h * 0.36;
      const head = Math.min(w * 0.4, h);
      const top = (h - shaft) / 2;
      shapes.push({
        d: polygonPath([
          [0, top],
          [w - head, top],
          [w - head, 0],
          [w, h / 2],
          [w - head, h],
          [w - head, top + shaft],
          [0, top + shaft],
        ]),
        fill,
        ...border,
      });
      break;
    }
    case "star": {
      const count = Math.max(3, Math.min(12, Math.round(element.shape.points ?? 5)));
      const inner = Math.max(0.15, Math.min(0.9, element.shape.innerRatio ?? 0.45));
      shapes.push({ d: polygonPath(radialPoints(w, h, count, inner)), fill, ...border });
      break;
    }
    case "polygon": {
      const count = Math.max(3, Math.min(12, Math.round(element.shape.points ?? 6)));
      shapes.push({ d: polygonPath(radialPoints(w, h, count, null)), fill, ...border });
      break;
    }
    case "frame": {
      const line = Math.max(MIN_LINE_MM, strokeWidth || 1.5);
      shapes.push({
        d: rectPath(line / 2, line / 2, w - line, h - line, element.shape.cornerRadius ?? 0),
        stroke: style.strokeColor ?? style.color ?? DEFAULT_SHAPE_STROKE,
        strokeWidth: line,
      });
      break;
    }
    default:
      return null;
  }
  // A fill typed in CMYK prints with that ink (docs/23 S7).
  const cmyk = style.cmyk;
  // A gradient replaces the plain fill (2 to 8 stops), the first stop stands for it where gradients are not drawn.
  const gradient = style.gradient && style.gradient.stops.length >= 2 ? { angle: style.gradient.angle ?? 0, stops: style.gradient.stops } : undefined;
  const filled = shapes.map((shape) => (shape.fill ? { ...shape, ...(cmyk ? { cmyk } : {}), ...(gradient ? { gradient, fill: gradient.stops[0].color } : {}) } : shape));
  return { width: w, height: h, shapes: filled, texts: [] };
}

/** Vector art of any element drawn as vectors: a shape, or a library sticker / label / background (`wf-art:`). */
export function elementVectorArt(
  element: Pick<CanvasElement, "type" | "content" | "width" | "height" | "style" | "shape">
): VectorArt | null {
  if (element.type === "shape") return shapeArt(element);
  if (element.type === "logo" || element.type === "image" || element.type === "pattern") {
    return libraryArt(element.content, element.width, element.height);
  }
  return null;
}

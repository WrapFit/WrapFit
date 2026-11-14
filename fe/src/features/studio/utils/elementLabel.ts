import { artDesignOf, ean13Digits, parseLibraryArt, SHAPE_KINDS, type CanvasElement } from "@wrapfit/shared";

/** Name of an element for the toolbar and the layers panel: the name the user gave it, its words, its design or kind. */
export function elementLabel(el: CanvasElement): string {
  if (el.name) return el.name;
  if (el.type === "text") return el.content || "Chữ";
  if (el.type === "barcode") return ean13Digits(el.content) ? "Mã vạch" : "Mã QR";
  if (el.type === "shape") return SHAPE_KINDS.find((s) => s.kind === el.shape?.kind)?.name ?? "Hình khối";
  const ref = parseLibraryArt(el.content);
  if (ref) return artDesignOf(ref.design)?.name ?? "Tem";
  return el.type === "pattern" ? "Hoa văn" : el.type === "logo" ? "Logo" : "Hình ảnh";
}

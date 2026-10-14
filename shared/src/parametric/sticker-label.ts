/**
 * Parametric Dieline Engine — Nhãn Dán Hộp Có Sẵn (Sticker & Decal Label)
 * Luồng của Linh (Chủ shop handmade dán tem nhãn/decal lên hộp mua sẵn).
 * Hỗ trợ tem nắp hộp chữ nhật, tem niêm phong tròn/chữ nhật, và đai quấn (belly band).
 */

import { BoxDimensions, DielineGeometry, PanelFace, Point2D } from "../types/dieline";
import { segmentWriter } from "./segments";

export function generateStickerLabelDieline(dimensions: BoxDimensions): DielineGeometry {
  const { length, width, height } = dimensions;
  // Cho nhãn dán: length là chiều dài tem, width là chiều rộng tem (mm)
  const L = Math.max(30, length);
  const W = Math.max(20, width);
  const cornerRadius = Math.min(6, Math.min(L, W) * 0.1); // Bo góc mềm mại cho tem decal dễ bóc

  const margin = 10; // Lề định vị trên tờ in
  const x0 = margin;
  const y0 = margin;
  const x1 = x0 + L;
  const y1 = y0 + W;

  const panels: PanelFace[] = [
    {
      id: "panel_sticker",
      name: "Mặt Nhãn Dán (Sticker Face)",
      bounds: { x: x0, y: y0, width: L, height: W },
    },
  ];

  const { segments, line, path } = segmentWriter();

  // Nét cắt bế viền tem decal (Kiss-cut hoặc Die-cut)
  if (cornerRadius > 0) {
    path("cut_sticker_perimeter", "cut", [
      { x: x0 + cornerRadius, y: y0 },
      { x: x1 - cornerRadius, y: y0 },
      { x: x1, y: y0 + cornerRadius },
      { x: x1, y: y1 - cornerRadius },
      { x: x1 - cornerRadius, y: y1 },
      { x: x0 + cornerRadius, y: y1 },
      { x: x0, y: y1 - cornerRadius },
      { x: x0, y: y0 + cornerRadius },
      { x: x0 + cornerRadius, y: y0 },
    ]);
  } else {
    path("cut_sticker_perimeter", "cut", [
      { x: x0, y: y0 },
      { x: x1, y: y0 },
      { x: x1, y: y1 },
      { x: x0, y: y1 },
      { x: x0, y: y0 },
    ]);
  }

  // Nếu là đai quấn (belly band / chiều dài > 200mm): thêm nếp cấn 2 bên để ôm thân hộp
  if (L > 160 && height > 20) {
    const foldOffset = (L - width) / 2;
    if (foldOffset > 20 && foldOffset < L / 2) {
      line("crease_band_left", "crease", { x: x0 + foldOffset, y: y0 }, { x: x0 + foldOffset, y: y1 });
      line("crease_band_right", "crease", { x: x1 - foldOffset, y: y0 }, { x: x1 - foldOffset, y: y1 });
    }
  }

  return {
    structureType: "sticker-label",
    dimensions,
    totalBoundingBox: { width: x1 + margin, height: y1 + margin },
    panels,
    segments,
    glueAreas: [],
    orientation: { up: "-y", front: "+z" },
  };
}

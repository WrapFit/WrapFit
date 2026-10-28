/**
 * Checklist that goes with the print package (prepress rule 7): which file is which and how each prepress rule is met,
 * for the print shop, in Vietnamese plain text. Used by the export worker and the offline export of the editor.
 */
import type { BoxDimensions } from "../types/dieline";
import {
  BLEED_BOX_MM,
  BLEED_MM,
  HARD_MIN_DPI,
  MIN_LINE_MM,
  PRINT_DPI,
  RICH_BLACK,
  RICH_BLACK_MIN_FONT_PT,
  SAFE_MARGIN_CREASE_MM,
  SAFE_MARGIN_CUT_MM,
} from "./prepress";

/** Resolution of the JPG proof in the package: enough to check the artwork by eye, light enough to e-mail. */
export const PROOF_DPI = 150;
/** Name of the checklist in the package. */
export const PACKAGE_README = "DOC-TRUOC-KHI-IN.txt";

/** Files of a print package named after `base` (the title slug). */
export const packageFileNames = (base: string) => ({
  source: `${base}.ai`,
  pdf: `${base}-print.pdf`,
  proof: `${base}-proof.jpg`,
  svg: `${base}.svg`,
  dxf: `${base}.dxf`,
});

export function printPackageReadme(input: {
  title: string;
  structure: string;
  dimensions: BoxDimensions;
  base: string;
  /** Resolution of every image at its printed size; null dpi = vector or unreadable. */
  images: { url: string; dpi: number | null; vector: boolean }[];
  /** False when the JPG proof could not be made (the browser refused to draw the sheet). */
  withProof?: boolean;
}): string {
  const files = packageFileNames(input.base);
  const { length, width, height, paperThickness } = input.dimensions;
  const images = input.images.length
    ? input.images.map(({ url, dpi, vector }, i) => {
        const name = decodeURIComponent(url.split(/[/?#]/).filter(Boolean).pop() ?? url).slice(0, 60);
        const state = vector ? "vector (SVG)" : dpi === null ? "không đo được" : `${dpi} DPI${dpi < PRINT_DPI ? " — DƯỚI CHUẨN" : ""}`;
        return `   ${i + 1}. ${name}: ${state}`;
      })
    : ["   (không có ảnh)"];
  const low = input.images.filter((image) => image.dpi !== null && image.dpi < PRINT_DPI).length;
  return [
    `WRAPFIT — GÓI FILE IN: ${input.title}`,
    `Hộp ${input.structure} ${length} x ${width} x ${height} mm, giấy dày ${paperThickness} mm`,
    "",
    "CÁC FILE",
    `- ${files.source}: file gốc chỉnh sửa, Illustrator tương thích PDF (giữ lớp Artwork / Crease / CutContour / Dimensions).`,
    `- ${files.pdf}: bản PDF in, đúng kích thước thật 1:1.`,
    input.withProof === false
      ? `- (Không tạo được bản JPG đối chiếu trên trình duyệt này; mở ${files.pdf} để đối chiếu.)`
      : `- ${files.proof}: bản JPG ${PROOF_DPI} DPI để đối chiếu màu sắc và bố cục.`,
    `- ${files.svg} / ${files.dxf}: đường cắt và gấp cho máy cắt Cricut / laser / máy bế CNC.`,
    "",
    "KIỂM TRA TIÊU CHUẨN IN",
    "1. Hệ màu: toàn bộ hình in là CMYK (ảnh chuyển sang DeviceCMYK, chữ và mã vạch tô màu CMYK).",
    "   Nét cắt và nét gấp là màu pha (spot) CutContour 100M và Crease 100C, chế độ overprint, không in lên hộp.",
    "2. Font chữ: toàn bộ chữ đã chuyển thành đường nét vector (outline), file không chứa font.",
    `3. Ảnh nhúng sẵn trong file, chuẩn ${PRINT_DPI} DPI ở kích thước in thật (dưới ${HARD_MIN_DPI} DPI FitCheck chặn xuất file):`,
    ...images,
    ...(low ? [`   => ${low} ảnh dưới ${PRINT_DPI} DPI: nên thay bằng ảnh gốc chất lượng cao hơn trước khi in số lượng lớn.`] : []),
    `4. Tràn lề: BleedBox ${BLEED_BOX_MM} mm quanh đường cắt, nền chạm đường cắt tràn ra ≥ ${BLEED_MM} mm.`,
    `   Vùng an toàn: chữ, logo, mã vạch cách đường cắt ≥ ${SAFE_MARGIN_CUT_MM} mm, cách nếp gấp ≥ ${SAFE_MARGIN_CREASE_MM} mm.`,
    `5. Độ dày nét: nét cắt / gấp 0.25 mm; FitCheck cảnh báo chữ có nét mảnh dưới ${MIN_LINE_MM} mm.`,
    "6. Mã vạch và QR: vector đen đơn K100 trên nền trắng (đục nền, không in chồng).",
    `   Đen diện rộng (ảnh, hoa văn, chữ từ ${RICH_BLACK_MIN_FONT_PT} pt) in đen giàu C${RICH_BLACK[0]} M${RICH_BLACK[1]} Y${RICH_BLACK[2]} K${RICH_BLACK[3]};`,
    "   chữ nhỏ, logo và mã vạch giữ K100. Hãy hỏi nhà in thông số đen giàu hợp với máy của họ.",
    "7. Bàn giao: file gốc .ai kèm bản PDF và JPG để đối chiếu (chính là gói này).",
    "",
    "Lưu ý: chuyển RGB -> CMYK dùng công thức chung, chưa theo hồ sơ màu (ICC) của nhà in. Nếu cần màu",
    "chính xác (màu thương hiệu, Pantone), hãy ghi kèm mã màu và yêu cầu in thử (proof) trước khi in loạt.",
    "",
  ].join("\r\n");
}

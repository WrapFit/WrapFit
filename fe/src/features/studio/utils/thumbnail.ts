import type { CanvasElement, DielineGeometry } from "@wrapfit/shared";

/** Paper colour of each look of the editor (BoxMaterialTheme). */
const PAPER_FILL: Record<string, string> = {
  ivory: "#FDFBF7",
  kraft: "#E3CBB2",
  forest: "#1A362B",
  gold_foil: "#F4E7C1",
};

const WIDTH_PX = 640;
const PAD_MM = 6;

const escapeXml = (text: string) =>
  text.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" })[c]!);

const isFileUrl = (content: string) => /^(https?:\/\/|\/)/.test(content);

/**
 * Reads an image as a data URL, so the SVG drawn on the canvas has no outside reference: an image of another origin
 * (object storage) would taint the canvas and `toBlob` would throw. `null` when it cannot be read.
 */
async function inlineImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: "cors", credentials: "omit" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Preview of a design for the dashboard: the flat dieline in the paper colour with its artwork, as a PNG of 640 px
 * width (upload purpose THUMBNAIL, ≤ 2 MB). Web fonts are not available to an SVG drawn as an image, so text falls
 * back to the closest system font.
 */
export async function renderThumbnail(
  dieline: DielineGeometry,
  elements: CanvasElement[],
  materialTheme: string
): Promise<Blob> {
  const { width: totalW, height: totalH } = dieline.totalBoundingBox;
  const viewW = totalW + 2 * PAD_MM;
  const viewH = totalH + 2 * PAD_MM;
  const heightPx = Math.max(1, Math.round((WIDTH_PX * viewH) / viewW));
  const paper = PAPER_FILL[materialTheme] ?? PAPER_FILL.ivory;
  const ink = materialTheme === "forest" ? "#F7F5F0" : "#1C1917";

  // Panels carry the outline: the generators only list crease lines and curved cuts as segments.
  const panels = dieline.panels
    .map((p) => `<rect x="${p.bounds.x}" y="${p.bounds.y}" width="${p.bounds.width}" height="${p.bounds.height}" fill="${paper}" stroke="${ink}" stroke-opacity="0.55" stroke-width="0.5"/>`)
    .join("");
  const segments = dieline.segments
    .map((s) => {
      const stroke = s.type === "cut" ? `stroke="${ink}" stroke-width="0.6"` : `stroke="${ink}" stroke-opacity="0.35" stroke-width="0.4" stroke-dasharray="2 2"`;
      return s.pathString
        ? `<path d="${s.pathString}" fill="none" ${stroke}/>`
        : `<line x1="${s.start.x}" y1="${s.start.y}" x2="${s.end.x}" y2="${s.end.y}" ${stroke}/>`;
    })
    .join("");

  const images = new Map<string, string | null>();
  await Promise.all(
    elements
      .filter((el) => (el.type === "image" || el.type === "logo") && isFileUrl(el.content))
      .map(async (el) => {
        if (!images.has(el.content)) images.set(el.content, await inlineImage(new URL(el.content, location.href).href));
      })
  );

  const artwork = elements
    .map((el) => {
      const panel = dieline.panels.find((p) => p.id === el.panelId || p.id === `panel_${el.panelId}`);
      if (!panel) return "";
      const x = panel.bounds.x + el.x;
      const y = panel.bounds.y + el.y;
      const rotate = el.rotation ? ` transform="rotate(${el.rotation} ${x + el.width / 2} ${y + el.height / 2})"` : "";
      if ((el.type === "image" || el.type === "logo") && isFileUrl(el.content)) {
        const href = images.get(el.content);
        return href
          ? `<image href="${href}" x="${x}" y="${y}" width="${el.width}" height="${el.height}" preserveAspectRatio="xMidYMid meet"${rotate}/>`
          : `<rect x="${x}" y="${y}" width="${el.width}" height="${el.height}" fill="${ink}" fill-opacity="0.08"${rotate}/>`;
      }
      const size = el.style?.fontSize ? el.style.fontSize * 0.42 : 5;
      return `<text x="${x + el.width / 2}" y="${y + el.height / 2 + 1.5}" text-anchor="middle" font-size="${size}" font-weight="bold" font-family="${escapeXml(el.style?.fontFamily ?? "sans-serif")}" fill="${escapeXml(el.style?.color ?? ink)}"${rotate}>${escapeXml(el.content)}</text>`;
    })
    .join("");

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH_PX}" height="${heightPx}" viewBox="0 0 ${viewW} ${viewH}">` +
    `<rect width="100%" height="100%" fill="#F7F5F0"/>` +
    `<g transform="translate(${PAD_MM} ${PAD_MM})">${panels}${artwork}${segments}</g></svg>`;

  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = WIDTH_PX;
    canvas.height = heightPx;
    canvas.getContext("2d")!.drawImage(image, 0, 0);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Thumbnail encoding failed"))), "image/png")
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

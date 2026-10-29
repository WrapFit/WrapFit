import { PACKAGE_README, packageFileNames, printPackageReadme, type BoxDimensions, type CanvasElement } from "@wrapfit/shared";
import { strToU8, zipSync, type Zippable } from "fflate";
import type { ExportFileType } from "@/types/api";
import { buildPrintLayout } from "./printLayout";
import { imageResolutions, loadPrintAssets, renderDxf, renderPdf, renderProofJpeg, renderSvg } from "./renderers";

/**
 * Print files without a backend: the Vercel deployment has no API, and the demo project (`/editor/demo`) has nothing
 * saved on the server. Vercel sets NEXT_PUBLIC_VERCEL_ENV on every build; NEXT_PUBLIC_OFFLINE_DEMO=1 turns it on
 * elsewhere. When the API is there but cannot be reached, the dialog falls back to these files too.
 */
export const OFFLINE_DEMO = !!process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NEXT_PUBLIC_OFFLINE_DEMO === "1";

export const isDemoProjectId = (id: string | undefined) => !id || id === "demo" || id === "demo-project" || id.startsWith("demo-");

/** What the studio knows of the design: enough to build the same sheet as the export worker. */
export interface ExportDesign {
  title: string;
  structure: string;
  formulaVersion?: number;
  dimensions: BoxDimensions;
  elements: CanvasElement[];
}

const EXTENSIONS: Record<ExportFileType, string> = {
  PDF_CMYK: "pdf",
  PDF_A4_PRINT: "pdf",
  SVG: "svg",
  DXF: "dxf",
  PRINT_PACKAGE: "zip",
};

/** Ascii slug of a title, like the server's `titleSlug`. */
export function titleSlug(title: string): string {
  return (
    title
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "wrapfit"
  );
}

/** File name like the server's `fileNameFor`: ascii slug of the title + format. */
export function fileNameFor(title: string, fileType: ExportFileType): string {
  return `${titleSlug(title)}-${fileType.toLowerCase().replace("_", "-")}.${EXTENSIONS[fileType]}`;
}

/** Builds one print file in the browser. */
export async function buildPrintFile(design: ExportDesign, fileType: ExportFileType): Promise<{ blob: Blob; fileName: string }> {
  const layout = buildPrintLayout(design);
  const fileName = fileNameFor(design.title, fileType);
  if (fileType === "DXF") return { blob: new Blob([renderDxf(layout)], { type: "application/dxf" }), fileName };
  const assets = await loadPrintAssets(layout);
  if (fileType === "SVG") return { blob: new Blob([renderSvg(layout, assets)], { type: "image/svg+xml" }), fileName };
  if (fileType !== "PRINT_PACKAGE") {
    return { blob: await renderPdf(layout, assets, { homePrint: fileType === "PDF_A4_PRINT" }), fileName };
  }

  // Package for the print shop: .ai source (the PDF, which Illustrator opens with its layers), PDF, JPG proof, SVG,
  // DXF and the checklist.
  const base = titleSlug(design.title);
  const names = packageFileNames(base);
  const svg = renderSvg(layout, assets);
  const pdf = new Uint8Array(await (await renderPdf(layout, assets)).arrayBuffer());
  const proof = await renderProofJpeg(svg);
  const stored = { level: 0 } as const;
  const files: Zippable = {
    [names.source]: [pdf, stored],
    [names.pdf]: [pdf, stored],
    [names.svg]: strToU8(svg),
    [names.dxf]: strToU8(renderDxf(layout)),
    [PACKAGE_README]: strToU8(
      printPackageReadme({
        title: design.title,
        structure: design.structure,
        dimensions: design.dimensions,
        base,
        images: imageResolutions(layout, assets),
        withProof: Boolean(proof),
      }),
    ),
  };
  if (proof) files[names.proof] = [new Uint8Array(await proof.arrayBuffer()), stored];
  return { blob: new Blob([zipSync(files, { level: 6 }) as BlobPart], { type: "application/zip" }), fileName };
}

/** Saves a file through a temporary link (the page stays open). */
export function saveFile(url: string, fileName: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

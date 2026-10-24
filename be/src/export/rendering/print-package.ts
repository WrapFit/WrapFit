// Delivery package for the print shop (prepress rule 7): the editable source with a PDF and a JPG to check it against,
// in one ZIP. The `.ai` file is the print PDF saved under the Illustrator extension: Illustrator files are PDF based
// and Illustrator opens this one with its layers (Artwork, Crease, CutContour, Dimensions) and outlined texts intact.
import { PACKAGE_README, packageFileNames, printPackageReadme, PROOF_DPI } from '@wrapfit/shared';
import { strToU8, zipSync, type Zippable } from 'fflate';
import sharp from 'sharp';
import type { PrintLayout } from './print-layout';
import { imageResolutions, renderDxf, renderPdf, renderSvg, type Artwork } from './print-renderers';

/** The SVG of the sheet as a JPG on white paper, for checking the print file against. */
export async function renderProofJpeg(svg: string, dpi = PROOF_DPI): Promise<Buffer> {
  return sharp(Buffer.from(svg), { density: dpi }).flatten({ background: '#FFFFFF' }).jpeg({ quality: 90 }).toBuffer();
}

/** ZIP with the `.ai` source, the print PDF, the JPG proof, SVG, DXF and the checklist. */
export async function renderPrintPackage(layout: PrintLayout, artwork: Artwork, base: string): Promise<Buffer> {
  const pdf = await renderPdf(layout, artwork);
  const svg = renderSvg(layout, artwork);
  const proof = await renderProofJpeg(svg);
  const names = packageFileNames(base);
  const { title, structure, dimensions } = layout;
  const readme = printPackageReadme({ title, structure, dimensions, base, images: await imageResolutions(layout, artwork) });
  // PDF and JPG are compressed already: stored as they are.
  const stored = { level: 0 } as const;
  const files: Zippable = {
    [names.source]: [pdf, stored],
    [names.pdf]: [pdf, stored],
    [names.proof]: [proof, stored],
    [names.svg]: strToU8(svg),
    [names.dxf]: strToU8(renderDxf(layout)),
    [PACKAGE_README]: strToU8(readme),
  };
  return Buffer.from(zipSync(files, { level: 6 }));
}

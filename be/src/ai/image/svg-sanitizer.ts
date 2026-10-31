import { optimize, type XastChild, type XastParent } from 'svgo';

/**
 * Elements an AI vector image may keep: shapes, groups, paint servers, clipping and simple filters. Anything else is
 * dropped with its children: scripts, `foreignObject` (HTML inside SVG), `style` (CSS can load remote files),
 * raster `image`, links, animations, `feImage`.
 */
const ALLOWED_ELEMENTS = new Set([
  'svg', 'g', 'defs', 'symbol', 'use', 'title', 'desc',
  'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'text', 'tspan',
  'linearGradient', 'radialGradient', 'stop', 'pattern', 'clipPath', 'mask',
  'filter', 'feGaussianBlur', 'feOffset', 'feBlend', 'feColorMatrix', 'feFlood', 'feComposite', 'feMerge', 'feMergeNode',
]);

/** `url(#id)` points inside the document; any other `url(...)` may load a remote resource. */
const OUTSIDE_URL = /url\(\s*['"]?\s*(?!#)/i;

function cleanAttributes(attributes: Record<string, string>): void {
  for (const [name, value] of Object.entries(attributes)) {
    const lower = name.toLowerCase();
    const isLink = lower === 'href' || lower.endsWith(':href');
    if (
      lower.startsWith('on') || // event handlers run scripts
      (isLink && !value.trim().startsWith('#')) || // only links to elements of the same document
      /javascript:|data:text|expression\(/i.test(value) ||
      OUTSIDE_URL.test(value)
    ) {
      delete attributes[name];
    }
  }
}

function clean(parent: XastParent): void {
  parent.children = parent.children.filter((child: XastChild) => {
    if (child.type === 'text') return parent.type === 'element' && (parent.name === 'text' || parent.name === 'tspan' || parent.name === 'title' || parent.name === 'desc');
    if (child.type !== 'element' || !ALLOWED_ELEMENTS.has(child.name)) return false; // comments, doctype, CDATA, instructions
    cleanAttributes(child.attributes);
    clean(child);
    return true;
  });
}

/** Thrown when the input is not an SVG document svgo can parse, or has no `<svg>` root left. */
export class InvalidSvgError extends Error {}

/**
 * Keeps only the drawing of an SVG made by an AI provider, so it is safe to serve from our CDN, to show on a canvas
 * and to embed in print exports: an allowlist of elements, no event handlers, no links or `url(...)` leaving the
 * document. Geometry is left as it is (no other svgo optimization).
 */
export function sanitizeSvg(svg: string): string {
  let result: string;
  try {
    result = optimize(svg, {
      multipass: false,
      plugins: [
        {
          name: 'wrapfitAllowlist',
          fn: (root) => {
            clean(root);
            return null;
          },
        },
      ],
    }).data;
  } catch (error) {
    throw new InvalidSvgError(`Not a valid SVG: ${(error as Error).message}`);
  }
  if (!/^<svg[\s>]/.test(result.trim())) throw new InvalidSvgError('The SVG has no <svg> root element');
  return result;
}

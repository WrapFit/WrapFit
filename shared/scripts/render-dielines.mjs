#!/usr/bin/env node
/**
 * Draws the dieline pieces of every box structure at 4 sizes (wide, tall, flat, smallest) as one SVG per structure and
 * formula version, then turns each into a PNG with headless Chrome. Used for the formula audit (docs/14).
 *
 *   npm run build:shared
 *   node shared/scripts/render-dielines.mjs <out dir> [--versions=1,2,3] [--t=0.42]
 *
 * Red: cut lines. Blue dashed: creases. Grey: printable panels, with their id.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const shared = require('../dist/index.js');

const args = process.argv.slice(2);
const outDir = path.resolve(args.find((a) => !a.startsWith('--')) ?? 'dieline-renders');
const option = (name, fallback) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? fallback;
const versions = option('versions', String(shared.CURRENT_FORMULA_VERSION)).split(',').map(Number);
const t = Number(option('t', '0.42'));

const STRUCTURES = ['tuck-top', 'pillow', 'lid-base', 'sleeve-drawer'];
const SIZES = [
  ['rộng', 120, 80, 60],
  ['cao', 60, 60, 150],
  ['dẹt', 200, 150, 40],
  ['nhỏ nhất', 40, 30, 20],
];
const GAP = 20; // mm between pieces
const LABEL = 14; // mm above each size

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].find((p) => fs.existsSync(p));

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const n = (v) => Number(v.toFixed(2));

function pieceSvg(geometry, dx, dy) {
  const parts = [`<g transform="translate(${n(dx)} ${n(dy)})">`];
  for (const p of geometry.panels) {
    const b = p.bounds;
    parts.push(
      `<rect x="${n(b.x)}" y="${n(b.y)}" width="${n(b.width)}" height="${n(b.height)}" fill="#e7e5e4" fill-opacity="0.6"/>`,
      `<text x="${n(b.x + b.width / 2)}" y="${n(b.y + b.height / 2)}" font-size="${Math.min(5, b.width / 9, b.height / 3)}" text-anchor="middle" dominant-baseline="middle" fill="#57534e">${esc(p.id)}</text>`,
    );
  }
  for (const s of geometry.segments) {
    const style = s.type === 'cut' ? 'stroke="#E53E3E" stroke-width="0.5"' : 'stroke="#3182CE" stroke-width="0.4" stroke-dasharray="2,1.5"';
    const d = s.pathString ?? `M ${s.start.x} ${s.start.y} L ${s.end.x} ${s.end.y}`;
    parts.push(`<path d="${d}" fill="none" ${style}/>`);
  }
  parts.push('</g>');
  return parts.join('');
}

fs.mkdirSync(outDir, { recursive: true });
for (const version of versions) {
  for (const structure of STRUCTURES) {
    let x = GAP;
    let height = 0;
    const body = [];
    for (const [label, length, width, h] of SIZES) {
      const dims = { length, width, height: h, paperThickness: t };
      const pieces = shared.generateDielinePieces(structure, dims, version);
      const blockW = pieces.reduce((sum, p) => sum + p.geometry.totalBoundingBox.width, 0) + GAP * (pieces.length - 1);
      const sheet = pieces.map((p) => `${n(p.geometry.totalBoundingBox.width)} × ${n(p.geometry.totalBoundingBox.height)}`).join(' + ');
      body.push(`<text x="${x}" y="${GAP}" font-size="6" fill="#1c1917">${esc(`${label} ${length} × ${width} × ${h} — phôi ${sheet} mm`)}</text>`);
      let px = x;
      for (const piece of pieces) {
        body.push(pieceSvg(piece.geometry, px, GAP + LABEL));
        px += piece.geometry.totalBoundingBox.width + GAP;
        height = Math.max(height, piece.geometry.totalBoundingBox.height);
      }
      x += Math.max(blockW, 150) + GAP * 2;
    }
    const W = x;
    const H = height + GAP * 2 + LABEL;
    const scale = Math.min(3, 3000 / W);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(W * scale)}" height="${Math.ceil(H * scale)}" viewBox="0 0 ${n(W)} ${n(H)}" font-family="Segoe UI, Arial, sans-serif"><rect width="100%" height="100%" fill="#ffffff"/>${body.join('')}</svg>`;
    const file = path.join(outDir, `${structure}.v${version}.svg`);
    fs.writeFileSync(file, svg);
    if (!CHROME) continue;
    const png = file.replace(/\.svg$/, '.png');
    spawnSync(CHROME, [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      `--screenshot=${png}`,
      `--window-size=${Math.ceil(W * scale)},${Math.ceil(H * scale)}`,
      pathToFileURL(file).href,
    ]);
    console.log(fs.existsSync(png) ? png : `${file} (PNG failed)`);
  }
}
if (!CHROME) console.log(`SVG written to ${outDir}; Chrome not found, no PNG.`);

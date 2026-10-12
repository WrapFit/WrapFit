#!/usr/bin/env node
/**
 * Visual parity check: renders each Stitch export and its app route in headless Chrome
 * at the Stitch viewport, then counts differing pixels.
 *
 * Usage (dev server running):
 *   npm run stitch:parity                     all screens with a source HTML
 *   npm run stitch:parity -- admin pricing    only slugs containing these words
 * Options: --base-url=http://localhost:3000  --threshold=1 (max % differing pixels)
 *          --include-wired (also compare "wired" screens, whose views show live API data)
 * Screens whose route next.config.mjs redirects (e.g. /editor → /editor/new) are skipped.
 *
 * Output: .visual-parity/<slug>.png = Stitch | app | diff, and report.json.
 * Exits 1 when a screen differs by more than the threshold.
 */
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { FE_ROOT, SOURCE_DIR } from './lib/paths.mjs';
import { readManifest } from './lib/source.mjs';

const run = promisify(execFile);

const options = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((a) => a.startsWith('--'))
    .map((a) => a.slice(2).split('=')),
);
const filters = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const baseUrl = options['base-url'] ?? 'http://localhost:3000';
const threshold = Number(options.threshold ?? 1);
const outDir = path.join(FE_ROOT, '.visual-parity');

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);

const chrome = CHROME_CANDIDATES.find((p) => fs.existsSync(p));
if (!chrome) {
  console.error('No Chrome/Edge found. Set CHROME_PATH.');
  process.exit(2);
}

async function screenshot(url, { width, height }, file, profile) {
  await run(
    chrome,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      `--window-size=${width},${height}`,
      '--virtual-time-budget=15000',
      `--user-data-dir=${path.join(outDir, `.profile-${profile}`)}`,
      `--screenshot=${file}`,
      url,
    ],
    { timeout: 120_000 },
  );
  return PNG.sync.read(fs.readFileSync(file));
}

function sideBySide(images, width, height) {
  const gap = 8;
  const out = new PNG({ width: width * images.length + gap * (images.length - 1), height });
  out.data.fill(0xff);
  images.forEach((img, i) => PNG.bitblt(img, out, 0, 0, width, height, i * (width + gap), 0));
  return out;
}

/** Routes that next.config.mjs redirects elsewhere: their screenshot would show the destination page. */
async function redirectedRoutes() {
  const { default: config } = await import(pathToFileURL(path.join(FE_ROOT, 'next.config.mjs')).href);
  const redirects = (await config.redirects?.()) ?? [];
  return new Map(redirects.map((r) => [r.source, r.destination]));
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const redirected = await redirectedRoutes();
  const candidates = readManifest().screens.filter(
    (s) =>
      fs.existsSync(path.join(SOURCE_DIR, `${s.id}.html`)) &&
      (s.status !== 'wired' || 'include-wired' in options) &&
      (!filters.length || filters.some((f) => s.slug.includes(f))),
  );
  for (const screen of candidates.filter((s) => redirected.has(s.route))) {
    console.log(`skip           ${screen.route} (redirects to ${redirected.get(screen.route)})`);
  }
  const screens = candidates.filter((s) => !redirected.has(s.route));

  const report = [];
  for (const screen of screens) {
    const { width, height } = screen.viewport;
    const route = screen.route === 'not-found' ? '/__stitch-not-found' : screen.route;
    const [expected, actual] = await Promise.all([
      screenshot(pathToFileURL(path.join(SOURCE_DIR, `${screen.id}.html`)).href, screen.viewport, path.join(outDir, `${screen.slug}.stitch.png`), 'a'),
      screenshot(baseUrl + route, screen.viewport, path.join(outDir, `${screen.slug}.app.png`), 'b'),
    ]);
    const diff = new PNG({ width, height });
    const differing = pixelmatch(expected.data, actual.data, diff.data, width, height, { threshold: 0.1 });
    const percent = (differing / (width * height)) * 100;
    fs.writeFileSync(path.join(outDir, `${screen.slug}.png`), PNG.sync.write(sideBySide([expected, actual, diff], width, height)));
    for (const suffix of ['stitch', 'app']) fs.rmSync(path.join(outDir, `${screen.slug}.${suffix}.png`));

    report.push({ slug: screen.slug, route: screen.route, status: screen.status, percent: Number(percent.toFixed(2)) });
    const flag = percent > threshold ? 'FAIL' : 'ok  ';
    console.log(`${flag} ${percent.toFixed(2).padStart(6)}%  ${screen.route}`);
  }

  fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  const failed = report.filter((r) => r.percent > threshold);
  console.log(`\n${report.length - failed.length}/${report.length} within ${threshold}% — images in ${path.relative(FE_ROOT, outDir)}/`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(2);
});

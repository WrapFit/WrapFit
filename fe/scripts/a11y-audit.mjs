#!/usr/bin/env node
/**
 * Accessibility audit of app pages in headless Chrome (docs/15_DESIGN_SYSTEM.md §4):
 *   - axe-core with the WCAG 2.0/2.1/2.2 A and AA rules;
 *   - reflow: no sideways scroll at 640 px (200 % zoom of a 1280 px screen) and 320 px (400 %, WCAG 1.4.10);
 *   - the same axe run with data-theme="dark" on /design-system (both themes of the components).
 * Motion is reduced during the run so reveal animations do not leave half-transparent text behind.
 *
 * Usage (frontend running; backend too for signed-in pages):
 *   npm --workspace=fe run a11y                       # default page list, guest and signed-in admin
 *   npm --workspace=fe run a11y -- / /templates       # given pages, as a guest
 *   npm --workspace=fe run a11y -- --json             # also writes fe/.page-shots/a11y.json
 * Exit code 1 when a page has a serious or critical axe violation or scrolls sideways.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { AppSession, SHOTS_DIR, seedAdmin } from './lib/app-session.mjs';
import { evaluate, goto, openChrome } from './lib/chrome.mjs';

const require = createRequire(import.meta.url);
const AXE_SOURCE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const BASE = process.env.BASE_URL ?? 'http://localhost:3000';

const GUEST = ['/', '/templates', '/search?q=hop', '/pricing', '/about', '/contact', '/blog', '/legal/privacy', '/support', '/waitlist', '/auth/login', '/auth/register', '/design-system', '/design-system#dark'];
const SIGNED_IN = ['/dashboard', '/dashboard/projects', '/dashboard/orders', '/dashboard/brand-kit', '/dashboard/profile', '/dashboard/settings', '/admin/accounts'];

const args = process.argv.slice(2);
const given = args.filter((a) => a.startsWith('/'));
const pages = given.length ? given.map((p) => ({ path: p, role: 'guest' })) : [...GUEST.map((p) => ({ path: p, role: 'guest' })), ...SIGNED_IN.map((p) => ({ path: p, role: 'admin' }))];

const RUN_AXE = `(async () => {
  const result = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }, resultTypes: ['violations'] });
  // Logotypes ([data-logo]) have no contrast requirement (WCAG 1.4.3 exception); every other rule still applies to them.
  const inLogo = (n) => n.target.length === 1 && Boolean(document.querySelector(n.target[0])?.closest('[data-logo]'));
  return result.violations
    .map((v) => ({ ...v, nodes: v.id === 'color-contrast' ? v.nodes.filter((n) => !inLogo(n)) : v.nodes }))
    .filter((v) => v.nodes.length)
    .map((v) => ({ id: v.id, impact: v.impact, help: v.help, count: v.nodes.length,
      nodes: v.nodes.slice(0, 3).map((n) => ({ target: n.target.join(' '), summary: (n.failureSummary || '').split('\\n').slice(1, 2).join(' ').trim() })) }));
})()`;

const overflowAt = async (chrome, width) => {
  await chrome.send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 });
  await new Promise((r) => setTimeout(r, 600));
  return evaluate(chrome, `document.documentElement.scrollWidth - window.innerWidth`);
};

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'wf-a11y-'));
const chrome = await openChrome(profile);
await chrome.send('Page.enable');
await chrome.send('Runtime.enable');
await chrome.send('Network.enable');
await chrome.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });

let signedIn = false;
const results = [];
for (const page of pages) {
  if (page.role === 'admin' && !signedIn) {
    const { email, password } = seedAdmin();
    const session = new AppSession(BASE);
    try {
      await session.signIn(email, password);
      for (const cookie of session.cookies()) await chrome.send('Network.setCookie', cookie);
      signedIn = true;
    } catch (error) {
      console.error(`Sign-in failed (${error.message}); signed-in pages skipped.`);
      break;
    }
  }
  const dark = page.path.endsWith('#dark');
  const url = BASE + page.path.replace('#dark', '');
  await chrome.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await goto(chrome, url);
  if (dark) await evaluate(chrome, `document.querySelector('[role=switch]')?.click(), new Promise((r) => setTimeout(r, 500))`);
  const finalPath = await evaluate(chrome, 'location.pathname');
  await evaluate(chrome, AXE_SOURCE + ';0');
  const violations = await evaluate(chrome, RUN_AXE);
  const overflow640 = await overflowAt(chrome, 640);
  const overflow320 = await overflowAt(chrome, 320);
  const entry = { page: page.path, role: page.role, finalPath, violations, overflow640, overflow320 };
  results.push(entry);
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  const flag = serious.length || overflow640 > 1 || overflow320 > 1 ? '✗' : '✓';
  console.log(`${flag} ${page.path.padEnd(28)} ${page.role.padEnd(6)} axe: ${violations.length ? violations.map((v) => `${v.id}(${v.impact},${v.count})`).join(' ') : 'không lỗi'} · tràn 640: ${overflow640}px · 320: ${overflow320}px${finalPath !== page.path.split(/[?#]/)[0] ? ` · → ${finalPath}` : ''}`);
  for (const v of serious) for (const n of v.nodes) console.log(`    ${v.id}: ${n.target} — ${n.summary}`);
}
chrome.close();

if (args.includes('--json')) {
  fs.mkdirSync(SHOTS_DIR, { recursive: true });
  fs.writeFileSync(path.join(SHOTS_DIR, 'a11y.json'), JSON.stringify({ at: new Date().toISOString(), results }, null, 2));
}
const failed = results.filter((r) => r.violations.some((v) => v.impact === 'serious' || v.impact === 'critical') || r.overflow640 > 1 || r.overflow320 > 1);
console.log(`\n${results.length - failed.length}/${results.length} trang đạt (axe WCAG 2.2 AA serious/critical + reflow 640/320 px).`);
process.exit(failed.length ? 1 : 0);

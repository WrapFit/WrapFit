#!/usr/bin/env node
/**
 * Full-resolution screenshots of app pages in headless Chrome, at real desktop and phone widths, with layout checks.
 * The in-app browser pane is narrower than a desktop screen and scales its screenshots down, so check layouts here.
 *
 * Usage (frontend and backend running):
 *   npm --workspace=fe run shots -- /dashboard /templates                      # ad hoc pages, as a guest
 *   npm --workspace=fe run shots -- /dashboard --sizes=X+,W,M --login=admin@wrapfit.vn
 *   npm --workspace=fe run shots -- --routes --group=G1,G4 --sizes=M,X+      # audit list of page-shots.routes.json
 *   npm --workspace=fe run shots -- --routes --only=projects --table          # also print the route × size table
 *
 * Options:
 *   --sizes=M,T,L,X,X+,W      viewport codes of docs/12 Phase 7 (default X+,W; all six with --routes), or --widths=1440x900,375x812
 *   --routes[=file]           audit routes (default scripts/page-shots.routes.json); --group=, --only=<name part>,
 *                             --role=guest|maker|admin filter them. Placeholders like {projects.public.slug} come from
 *                             fe/.page-shots/fixtures.json (node fe/scripts/ui-fixtures.mjs)
 *   --login=<email>           ad hoc pages signed in; password from SHOT_PASSWORD, else SEED_ADMIN_PASSWORD of be/.env
 *   --shots=2                 viewport screenshots per page from the top; the bottom of the page is always added
 *   --base-url=http://localhost:3000   --table   prints the markdown table of the run
 *
 * Checks per page and size (each one fails the run):
 *   overflow   the page scrolls sideways
 *   offscreen  an element sticks out of the viewport, fixed and sticky ones included (an element clipped or scrolled
 *              by an ancestor, and off-canvas panels moved out with a transform, do not count)
 *   image      an <img> failed to load
 *   request    a response ≥ 400 or a failed request not listed as expected for the route / role
 *   console    a console error or uncaught exception not listed in knownConsole
 *   text       a label spills out of its button / link, or is cut with an ellipsis but has no title
 *   overlap    two fixed bars painted over each other (a screen's dock under the bottom navigation); a route
 *              whose action opens a drawer over the header sets allowOverlap
 *   covered    text at the very end of the page hidden under a fixed bar
 * Reported, not failing: wrap (a short button label on two lines), small tap targets under 44 px (size M).
 *
 * Output: .page-shots/<name>-<role>-<size>-<n>.png and .page-shots/report.json (merged across runs by route, role and
 * size). Exits 1 when a failing check fires.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { FE_ROOT } from './stitch/lib/paths.mjs';
import { AppSession, SHOTS_DIR, readFixtures, seedAdmin } from './lib/app-session.mjs';

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const arg = args.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!arg) return fallback;
  return arg.includes('=') ? arg.split('=').slice(1).join('=') : true;
};
const list = (value) => (typeof value === 'string' ? value.split(',').map((s) => s.trim()).filter(Boolean) : null);
const baseUrl = String(option('base-url', 'http://localhost:3000')).replace(/\/+$/, '');
const shotsPerPage = Number(option('shots', '2'));
const printTable = Boolean(option('table', false));

/** Viewport matrix of docs/12 Phase 7. */
const SIZES = {
  M: { width: 375, height: 812, mobile: true },
  T: { width: 768, height: 1024 },
  L: { width: 1024, height: 768 },
  X: { width: 1280, height: 800 },
  'X+': { width: 1440, height: 900 },
  W: { width: 1920, height: 1080 },
};
const MOBILE_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36';

function pickSizes() {
  const widths = list(option('widths'));
  if (widths) {
    return widths.map((size) => {
      const [width, height] = size.split('x').map(Number);
      const code = Object.keys(SIZES).find((k) => SIZES[k].width === width && SIZES[k].height === height) ?? String(width);
      return { code, width, height, mobile: width < 768 };
    });
  }
  return (list(option('sizes')) ?? (option('routes') ? Object.keys(SIZES) : ['X+', 'W'])).map((code) => {
    if (!SIZES[code]) throw new Error(`Unknown size ${code}; use ${Object.keys(SIZES).join(', ')}`);
    return { code, ...SIZES[code] };
  });
}

// ---------------------------------------------------------------- routes

const fixtures = readFixtures();
/** `{projects.public.slug}` → value in fixtures.json. */
function fill(value) {
  if (typeof value !== 'string') return value;
  return value.replace(/\{([\w.]+)\}/g, (_, key) => {
    const found = key.split('.').reduce((node, part) => node?.[part], fixtures);
    if (found === undefined) throw new Error(`No fixture value for {${key}}: run node fe/scripts/ui-fixtures.mjs`);
    return found;
  });
}

function loadRoutes() {
  const sizes = pickSizes();
  const routesOption = option('routes');
  if (!routesOption) {
    const pages = args.filter((a) => !a.startsWith('--'));
    if (!pages.length) {
      console.error('Give page paths, e.g. /dashboard, or --routes');
      process.exit(2);
    }
    const login = option('login');
    const role = typeof login === 'string' ? login : 'guest';
    return {
      sizes,
      config: { expectedRequests: [], knownConsole: [] },
      routes: pages.map((page) => ({ name: page.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'home', path: page, roles: [role] })),
    };
  }
  const file = routesOption === true ? path.join(FE_ROOT, 'scripts', 'page-shots.routes.json') : path.resolve(routesOption);
  const config = JSON.parse(fs.readFileSync(file, 'utf8'));
  const groups = list(option('group'));
  const only = list(option('only'));
  const roleFilter = list(option('role'));
  const routes = config.routes
    .filter((r) => !groups || groups.includes(r.group))
    .filter((r) => !only || only.some((part) => r.name.includes(part)))
    .map((r) => ({ ...r, roles: r.roles.filter((role) => !roleFilter || roleFilter.includes(role)) }))
    .filter((r) => r.roles.length);
  return { sizes, config, routes };
}

const { sizes, config, routes } = loadRoutes();

// ---------------------------------------------------------------- Chrome

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);
const chromePath = CHROME_CANDIDATES.find((p) => fs.existsSync(p));
if (!chromePath) {
  console.error('No Chrome/Edge found. Set CHROME_PATH.');
  process.exit(2);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Minimal Chrome DevTools Protocol client on the first page target. */
async function openChrome(profile) {
  const port = 9300 + Math.floor(Math.random() * 600);
  const child = spawn(chromePath, [
    '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run',
    '--no-default-browser-check', '--hide-scrollbars', '--force-device-scale-factor=1', 'about:blank',
  ], { stdio: 'ignore' });
  let target;
  for (let i = 0; i < 50 && !target; i++) {
    try {
      target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page');
    } catch {}
    if (!target) await sleep(200);
  }
  if (!target) throw new Error('Chrome did not start');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve) => ws.addEventListener('open', resolve, { once: true }));
  let nextId = 0;
  const pending = new Map();
  const listeners = new Set();
  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
    } else listeners.forEach((listener) => listener(message));
  });
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++nextId;
      pending.set(id, (m) => (m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result)));
      ws.send(JSON.stringify({ id, method, params }));
    });
  const close = () => {
    ws.close();
    child.kill();
  };
  return { send, listeners, close };
}

async function evaluate(chrome, expression) {
  const { result, exceptionDetails } = await chrome.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (exceptionDetails) throw new Error(exceptionDetails.exception?.description?.split('\n')[0] ?? exceptionDetails.text);
  return result.value;
}

// ---------------------------------------------------------------- page actions

/** Finds the first visible element by CSS selector or by its text, scrolls it into view, returns its centre. */
const LOCATE = `(step) => {
  const visible = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
  const scope = step.in ? document.querySelector(step.in) : document;
  if (!scope) return null;
  let candidates;
  if (step.selector) candidates = [...scope.querySelectorAll(step.selector)];
  else {
    const text = step.text.toLowerCase();
    candidates = [...scope.querySelectorAll('button, a, [role=button], [role=menuitem], [role=tab], [role=option], summary, label')]
      .filter((el) => el.textContent.replace(/\\s+/g, ' ').trim().toLowerCase().includes(text))
      .sort((a, b) => a.textContent.length - b.textContent.length);
  }
  const el = candidates.find(visible);
  if (!el) return null;
  el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
  const r = el.getBoundingClientRect();
  if (step.focus) el.focus();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}`;

async function runStep(chrome, step) {
  if (step.waitFor) {
    // Data that arrives late (a slow dev server): poll up to 20 s for the element.
    for (let i = 0; i < 80; i++) {
      if (await evaluate(chrome, `Boolean(document.querySelector(${JSON.stringify(step.waitFor)}))`)) break;
      if (i === 79) throw new Error(`timed out waiting for ${step.waitFor}`);
      await sleep(250);
    }
  }
  const target = step.click ?? step.hover ?? step.into;
  const textTarget = step.clickText ?? step.hoverText;
  if (target !== undefined || textTarget !== undefined) {
    const query = { selector: target, text: textTarget, in: step.in, focus: step.into !== undefined };
    const point = await evaluate(chrome, `(${LOCATE})(${JSON.stringify(query)})`);
    if (!point) throw new Error(`not found: ${target ?? `text "${textTarget}"`}`);
    await chrome.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x, y: point.y });
    if (step.click !== undefined || step.clickText !== undefined || step.into !== undefined) {
      for (const type of ['mousePressed', 'mouseReleased']) {
        await chrome.send('Input.dispatchMouseEvent', { type, x: point.x, y: point.y, button: 'left', clickCount: 1 });
      }
    }
    if (step.into !== undefined) await chrome.send('Input.insertText', { text: step.type });
  } else if (step.key) {
    for (const type of ['keyDown', 'keyUp']) await chrome.send('Input.dispatchKeyEvent', { type, key: step.key, code: step.key });
  } else if (step.scroll !== undefined) {
    await evaluate(chrome, step.scroll === 'bottom' ? 'window.scrollTo(0, document.documentElement.scrollHeight)' : `window.scrollTo(0, ${step.scroll})`);
  } else if (step.eval) {
    await evaluate(chrome, step.eval);
  }
  await sleep(step.wait ?? 450);
}

// ---------------------------------------------------------------- layout checks (run in the page)

const INSPECT = `(mobile) => {
  const vw = document.documentElement.clientWidth;
  const label = (el) => {
    const id = el.id ? '#' + el.id : '';
    const aria = el.getAttribute('aria-label');
    const clone = el.cloneNode(true);
    clone.querySelectorAll('[class*="material-symbols"], svg').forEach((icon) => icon.remove());
    const text = (aria || clone.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 40);
    const cls = typeof el.className === 'string' ? el.className.split(/\\s+/).filter(Boolean).slice(0, 2).join('.') : '';
    return el.tagName.toLowerCase() + id + (cls ? '.' + cls : '') + (text ? ' "' + text + '"' : '');
  };
  const hiddenStyle = (s) => s.visibility === 'hidden' || s.display === 'none' || Number(s.opacity) === 0;
  const srOnly = (r, s) => (r.width <= 1 && r.height <= 1) || s.clipPath === 'inset(50%)' || s.clip === 'rect(0px, 0px, 0px, 0px)';
  const offscreen = [];
  const reported = new Set();
  for (const el of document.body.querySelectorAll('*')) {
    if (el.closest('svg') && el.tagName.toLowerCase() !== 'svg') continue;
    if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'NEXTJS-PORTAL'].includes(el.tagName)) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.left >= -1 && r.right <= vw + 1) continue;
    const s = getComputedStyle(el);
    if (hiddenStyle(s) || srOnly(r, s) || !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
    // A decorative shape (glow, blur blob): nothing to read or press.
    if (s.pointerEvents === 'none' && !el.textContent.trim() && !el.querySelector('img, canvas, video')) continue;
    let skip = false;
    for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) {
      if (reported.has(a)) { skip = true; break; }
      const as = getComputedStyle(a);
      if (hiddenStyle(as) || a.getAttribute('aria-hidden') === 'true' || a.inert) { skip = true; break; }
      // Clipped or scrolled by an ancestor that itself fits the viewport: carousels, tab strips, tables.
      if (as.overflowX !== 'visible') {
        const ar = a.getBoundingClientRect();
        if (ar.left >= -1 && ar.right <= vw + 1) { skip = true; break; }
      }
      // An off-canvas panel parked outside the viewport with a transform (closed drawer).
      if ((as.transform !== 'none' || as.translate !== 'none') && (r.right <= 0 || r.left >= vw)) { skip = true; break; }
    }
    if (skip) continue;
    reported.add(el);
    offscreen.push(label(el) + ' [' + Math.round(r.left) + '..' + Math.round(r.right) + (s.position === 'fixed' || s.position === 'sticky' ? ' ' + s.position : '') + ']');
  }

  const images = [...document.images]
    .filter((img) => img.complete && img.naturalWidth === 0 && (img.currentSrc || img.src))
    .map((img) => (img.currentSrc || img.src).slice(0, 120));

  const controls = [...document.querySelectorAll('button, a, [role=button], [role=tab], [role=menuitem]')].filter((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && el.checkVisibility({ opacityProperty: true, visibilityProperty: true }) && !el.closest('[aria-hidden=true]');
  });
  const text = [];
  const wrap = [];
  let small = 0;
  const smallSamples = [];
  const isIcon = (node) => Boolean(node.parentElement?.closest('[class*="material-symbols"], svg'));
  for (const el of controls) {
    const s = getComputedStyle(el);
    const box = el.getBoundingClientRect();
    const titled = el.title || el.getAttribute('aria-label');
    // Text cut with an ellipsis (on the control or inside it) needs the full text in a title.
    for (const node of [el, ...el.querySelectorAll('*')]) {
      const ns = node === el ? s : getComputedStyle(node);
      if (ns.textOverflow === 'ellipsis' && node.scrollWidth > node.clientWidth + 1 && !node.title && !titled) {
        text.push(label(el) + ' cut without title');
        break;
      }
    }
    // Each visible text run: spilling out of the control, or a short label on two lines.
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const value = node.textContent.trim();
      if (!value || isIcon(node)) continue;
      const parent = node.parentElement;
      const ps = getComputedStyle(parent);
      if (hiddenStyle(ps) || ps.position === 'absolute' && srOnly(parent.getBoundingClientRect(), ps)) continue;
      range.selectNodeContents(node);
      const rects = [...range.getClientRects()].filter((rect) => rect.width > 1);
      if (!rects.length) continue;
      const left = Math.min(...rects.map((rect) => rect.left));
      const right = Math.max(...rects.map((rect) => rect.right));
      let clipped = false;
      for (let a = parent; a && a !== el; a = a.parentElement) if (getComputedStyle(a).overflowX !== 'visible') clipped = true;
      if (!clipped && s.overflow === 'visible' && (right > box.right + 2 || left < box.left - 2)) {
        text.push(label(el) + ' spills ' + Math.round(Math.max(right - box.right, box.left - left)) + 'px');
      }
      const lines = new Set(rects.map((rect) => Math.round(rect.top / 4))).size;
      if (lines > 1 && value.length <= 32 && ps.textOverflow !== 'ellipsis') wrap.push(label(el) + ' (' + value + ')');
    }
    if (mobile && (box.width < 44 || box.height < 44) && s.display !== 'inline') {
      small++;
      if (smallSamples.length < 5) smallSamples.push(label(el) + ' ' + Math.round(box.width) + 'x' + Math.round(box.height));
    }
  }
  return {
    client: vw, scroll: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight,
    at: location.pathname + location.search,
    offscreen: offscreen.slice(0, 8), images, text: [...new Set(text)].slice(0, 8), wrap: wrap.slice(0, 8),
    small, smallSamples,
  };
}`;

/**
 * Floating elements at the current scroll: fixed bars painted over each other (a screen's dock under the bottom
 * navigation), and, with `covered`, text at the end of the page that a fixed bar hides (nothing to scroll it out).
 */
const FLOATING = `(covered) => {
  const vw = innerWidth, vh = innerHeight;
  const shown = (el) => el.checkVisibility({ opacityProperty: true, visibilityProperty: true });
  const name = (el) => {
    const aria = el.getAttribute('aria-label');
    const cls = typeof el.className === 'string' ? el.className.split(/\\s+/).filter(Boolean).slice(0, 3).join('.') : '';
    return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (aria ? '[' + aria.slice(0, 30) + ']' : cls ? '.' + cls : '');
  };
  const fixedRoot = (el) => {
    let root = null;
    for (let a = el; a && a !== document.body; a = a.parentElement) if (getComputedStyle(a).position === 'fixed') root = a;
    return root;
  };
  const painted = (el) => {
    const s = getComputedStyle(el);
    const alpha = Number((s.backgroundColor.match(/[\\d.]+(?=\\))/) || ['1'])[0]);
    return (s.backgroundColor !== 'rgba(0, 0, 0, 0)' && alpha > 0.1) || s.backgroundImage !== 'none' || s.backdropFilter !== 'none';
  };
  // Box of what a fixed element paints: the element, or its first painted descendants (a wrapper that only places).
  const paintedBox = (el) => {
    if (painted(el)) return el.getBoundingClientRect();
    let level = [...el.children];
    for (let depth = 0; depth < 4 && level.length; depth++) {
      const boxes = level.filter((c) => shown(c) && painted(c)).map((c) => c.getBoundingClientRect()).filter((r) => r.width > 1 && r.height > 1);
      if (boxes.length) return boxes.reduce((a, b) => new DOMRect(Math.min(a.left, b.left), Math.min(a.top, b.top), Math.max(a.right, b.right) - Math.min(a.left, b.left), Math.max(a.bottom, b.bottom) - Math.min(a.top, b.top)));
      level = level.flatMap((c) => [...c.children]);
    }
    return null;
  };
  const bars = [];
  for (const el of document.body.querySelectorAll('*')) {
    const es = getComputedStyle(el);
    if (es.position !== 'fixed' || fixedRoot(el) !== el || !shown(el)) continue;
    if (es.pointerEvents === 'none' && !el.textContent.trim() && !el.querySelector('img, canvas, video')) continue;
    const box = paintedBox(el);
    if (!box || box.width * box.height > vw * vh * 0.5 || box.bottom <= 0 || box.top >= vh) continue;
    bars.push({ el, box });
  }
  const overlap = [];
  for (let i = 0; i < bars.length; i++) for (let j = i + 1; j < bars.length; j++) {
    const a = bars[i].box, b = bars[j].box;
    const w = Math.min(a.right, b.right) - Math.max(a.left, b.left), h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    // A small control placed on a bar on purpose (a menu button on the header) is not a collision.
    const inside = (p, q) => p.left >= q.left - 1 && p.right <= q.right + 1 && p.top >= q.top - 1 && p.bottom <= q.bottom + 1;
    const small = (p) => p.width <= 64 && p.height <= 64;
    if ((small(a) && inside(a, b)) || (small(b) && inside(b, a))) continue;
    if (w > 4 && h > 4) overlap.push(name(bars[i].el) + ' × ' + name(bars[j].el) + ' (' + Math.round(w) + 'x' + Math.round(h) + ')');
  }
  const hidden = [];
  if (covered) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    for (let node = walker.nextNode(); node && hidden.length < 5; node = walker.nextNode()) {
      const value = node.textContent.trim();
      const parent = node.parentElement;
      if (!value || !parent || fixedRoot(parent) || parent.closest('[class*="material-symbols"], svg') || !shown(parent)) continue;
      range.selectNodeContents(node);
      const r = range.getBoundingClientRect();
      if (r.width < 2 || r.top < vh * 0.5 || r.bottom > vh || r.left < 0 || r.right > vw) continue;
      // Text cut off by a clipping ancestor (overflow hidden / auto) is not on screen at all.
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      let clipped = false;
      for (let a = parent.parentElement; a && a !== document.body; a = a.parentElement) {
        const cs = getComputedStyle(a);
        if (cs.overflowX === 'visible' && cs.overflowY === 'visible') continue;
        const ar = a.getBoundingClientRect();
        if (cx < ar.left || cx > ar.right || cy < ar.top || cy > ar.bottom) { clipped = true; break; }
      }
      if (clipped) continue;
      const hit = document.elementFromPoint(cx, cy);
      if (!hit || hit.tagName === 'NEXTJS-PORTAL' || parent.contains(hit) || hit.contains(parent)) continue;
      const bar = fixedRoot(hit);
      if (bar) hidden.push('"' + value.slice(0, 30) + '" under ' + name(bar));
    }
  }
  return { overlap, covered: hidden };
}`;

// ---------------------------------------------------------------- run

const ROLE_ACCOUNTS = {
  admin: () => seedAdmin(),
  maker: () => {
    if (!fixtures?.maker) throw new Error('Role maker needs fixtures: run node fe/scripts/ui-fixtures.mjs');
    return fixtures.maker;
  },
};

function matches(rule, { role, path: at, url, status }) {
  if (rule.role && rule.role !== role) return false;
  if (rule.route && !new RegExp(rule.route).test(at)) return false;
  if (rule.status && rule.status !== status) return false;
  return new RegExp(rule.url).test(url);
}

const reportFile = path.join(SHOTS_DIR, 'report.json');
const runRows = [];

fs.mkdirSync(SHOTS_DIR, { recursive: true });
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'wrapfit-shots-'));
const chrome = await openChrome(profile);
let failed = false;
try {
  await chrome.send('Page.enable');
  await chrome.send('Runtime.enable');
  await chrome.send('Network.enable');

  // Console errors, failed responses and requests in flight of the page being checked.
  const page = { errors: [], responses: [], inflight: new Set(), lastActivity: Date.now() };
  chrome.listeners.add((m) => {
    const p = m.params;
    if (m.method === 'Runtime.exceptionThrown') {
      page.errors.push(p.exceptionDetails.exception?.description?.split('\n')[0] ?? p.exceptionDetails.text);
    } else if (m.method === 'Runtime.consoleAPICalled' && p.type === 'error') {
      page.errors.push(p.args.map((a) => a.value ?? a.description ?? '').join(' ').replace(/\s+/g, ' ').slice(0, 200));
    } else if (m.method === 'Network.requestWillBeSent') {
      page.inflight.add(p.requestId);
      page.lastActivity = Date.now();
    } else if (m.method === 'Network.responseReceived') {
      if (p.response.status >= 400) page.responses.push({ url: p.response.url, status: p.response.status });
    } else if (m.method === 'Network.loadingFinished' || m.method === 'Network.loadingFailed') {
      page.inflight.delete(p.requestId);
      page.lastActivity = Date.now();
      if (m.method === 'Network.loadingFailed' && !p.canceled && p.errorText !== 'net::ERR_ABORTED') {
        page.responses.push({ url: p.requestId, status: 0, error: p.errorText });
      }
    }
  });
  const urls = new Map();
  chrome.listeners.add((m) => {
    if (m.method === 'Network.requestWillBeSent') urls.set(m.params.requestId, m.params.request.url);
  });

  /** Network idle for 600 ms (React Query data, the 3D canvas), between 1.5 and 9 seconds after load. */
  async function settle() {
    const start = Date.now();
    await sleep(1500);
    while (Date.now() - start < 9000 && (page.inflight.size > 0 || Date.now() - page.lastActivity < 600)) await sleep(150);
    await sleep(400);
  }

  const roles = [...new Set(routes.flatMap((r) => r.roles))];
  for (const role of roles) {
    await chrome.send('Network.clearBrowserCookies');
    if (role !== 'guest') {
      const session = new AppSession(baseUrl);
      const account = ROLE_ACCOUNTS[role]?.() ?? { email: role, password: seedAdmin().password };
      await session.signIn(account.email, account.password);
      for (const cookie of session.cookies()) await chrome.send('Network.setCookie', cookie);
    }
    for (const size of sizes) {
      await chrome.send('Emulation.setDeviceMetricsOverride', { width: size.width, height: size.height, deviceScaleFactor: 1, mobile: Boolean(size.mobile) });
      await chrome.send('Emulation.setTouchEmulationEnabled', { enabled: Boolean(size.mobile), maxTouchPoints: size.mobile ? 5 : 1 });
      await chrome.send('Emulation.setUserAgentOverride', { userAgent: size.mobile ? MOBILE_UA : '' });
      for (const route of routes) {
        if (!route.roles.includes(role) || (route.sizes && !route.sizes.includes(size.code))) continue;
        const routePath = fill(route.path);
        await chrome.send('Network.setBlockedURLs', { urls: route.offline ? ['*/api/*'] : [] });
        page.errors = [];
        page.responses = [];
        page.inflight.clear();
        urls.clear();
        const loaded = new Promise((resolve) => {
          const listener = (m) => {
            if (m.method === 'Page.loadEventFired') {
              chrome.listeners.delete(listener);
              resolve();
            }
          };
          chrome.listeners.add(listener);
        });
        await chrome.send('Page.navigate', { url: baseUrl + routePath });
        await Promise.race([loaded, sleep(30000)]);
        await settle();

        const actionErrors = [];
        for (const step of route.actions ?? []) {
          try {
            await runStep(chrome, Object.fromEntries(Object.entries(step).map(([k, v]) => [k, fill(v)])));
          } catch (error) {
            actionErrors.push(error.message);
            break;
          }
        }
        if (route.actions?.length) await settle();

        const info = await evaluate(chrome, `(${INSPECT})(${Boolean(size.mobile)})`);
        const fileName = `${route.name}-${role.replace(/[^a-z0-9]+/gi, '_')}-${size.code.replace('+', 'p')}`;
        const keep = route.actions?.length ? 1 : (route.shots ?? shotsPerPage);
        const viewports = Math.ceil(info.height / size.height);
        const offsets = route.actions?.length ? [null] : [...new Set([...Array(Math.min(keep, viewports)).keys(), viewports - 1])];
        for (const [i, index] of offsets.entries()) {
          if (index !== null) {
            await evaluate(chrome, `window.scrollTo(0, ${index === viewports - 1 ? 'document.documentElement.scrollHeight' : index * size.height})`);
            await sleep(700);
          }
          const { data } = await chrome.send('Page.captureScreenshot', { format: 'png' });
          fs.writeFileSync(path.join(SHOTS_DIR, `${fileName}-${i}.png`), Buffer.from(data, 'base64'));
        }
        // At the end of the page (the last screenshot), or in the opened state of an action route.
        const floating = await evaluate(chrome, `(${FLOATING})(${!route.actions?.length})`);

        const context = { role, path: info.at };
        const unexpected = page.responses
          .map((r) => ({ ...r, url: urls.get(r.url) ?? r.url }))
          .map((r) => ({ ...r, url: r.url.replace(baseUrl, '') }))
          .filter((r) => !route.offline || !/\/api\//.test(r.url))
          .filter((r) => ![...(config.expectedRequests ?? []), ...(route.expect ?? [])].some((rule) => matches(rule, { ...context, ...r })));
        const known = [...(config.knownConsole ?? []), ...(route.knownConsole ?? [])].map((pattern) => new RegExp(pattern));
        const errors = [...new Set(page.errors)].filter((e) => !known.some((re) => re.test(e)));
        const expectedAt = route.endsAt ? new RegExp(route.endsAt) : null;
        const issues = {
          overflow: info.scroll > info.client ? info.scroll - info.client : 0,
          offscreen: info.offscreen,
          image: info.images,
          request: [...new Set(unexpected.map((r) => `${r.status || r.error} ${r.url.slice(0, 110)}`))],
          console: errors.slice(0, 5),
          text: info.text,
          overlap: route.allowOverlap ? [] : floating.overlap,
          covered: floating.covered,
          action: actionErrors,
          redirect: (expectedAt ? !expectedAt.test(info.at) : info.at.split('?')[0] !== routePath.split('?')[0]) ? [info.at] : [],
        };
        const failing = ['overflow', 'offscreen', 'image', 'request', 'console', 'text', 'overlap', 'covered', 'action', 'redirect'].filter((k) =>
          Array.isArray(issues[k]) ? issues[k].length : issues[k],
        );
        failed ||= failing.length > 0;
        const row = {
          name: route.name, group: route.group ?? '', role, size: size.code, path: routePath, at: info.at, height: info.height,
          failing, issues, wrap: info.wrap, small: info.small, smallSamples: info.smallSamples, checkedAt: new Date().toISOString(),
        };
        runRows.push(row);
        const notes = failing.map((k) => `${k.toUpperCase()}: ${Array.isArray(issues[k]) ? issues[k].join(' | ') : `${issues[k]}px`}`);
        if (info.wrap.length) notes.push(`wrap: ${info.wrap.join(' | ')}`);
        console.log(`${size.code.padEnd(3)} ${role.padEnd(6)} ${route.name.padEnd(30)} h=${String(info.height).padEnd(5)} ${failing.length ? 'FAIL' : 'ok'}  ${notes.join('  ')}`);
      }
    }
  }
} finally {
  chrome.close();
  await sleep(500);
  fs.rmSync(profile, { recursive: true, force: true });
  // Re-read first: runs of other groups may have written since this one started.
  const latest = fs.existsSync(reportFile) ? JSON.parse(fs.readFileSync(reportFile, 'utf8')) : {};
  for (const row of runRows) latest[`${row.name}|${row.role}|${row.size}`] = row;
  fs.writeFileSync(reportFile, JSON.stringify(latest, null, 2));
}

if (printTable) {
  const codes = Object.keys(SIZES);
  const keys = [...new Set(runRows.map((r) => `${r.name}|${r.role}`))];
  console.log(`\n| Route | Vai trò | ${codes.join(' | ')} |\n|---|---|${codes.map(() => '---|').join('')}`);
  for (const key of keys) {
    const [name, role] = key.split('|');
    const cells = codes.map((code) => {
      const row = runRows.find((r) => r.name === name && r.role === role && r.size === code);
      return !row ? '—' : row.failing.length ? row.failing.join(', ') : 'ok';
    });
    console.log(`| ${name} | ${role} | ${cells.join(' | ')} |`);
  }
}
console.log(`Screenshots and report.json in ${path.relative(process.cwd(), SHOTS_DIR) || SHOTS_DIR}`);
process.exit(failed ? 1 : 0);

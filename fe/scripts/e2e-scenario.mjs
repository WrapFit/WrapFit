#!/usr/bin/env node
/**
 * The end-to-end scenario of docs/12 §7, clicked through in headless Chrome at real phone and desktop sizes, with a
 * screenshot of every checkpoint. Each size runs the whole story with its own new account. Steps 16–18 are the paid part
 * of the CP4 demo (docs/17 §5): the backend must run with PAYMENT_SIMULATION=true.
 *
 * Needs the frontend, the backend, the worker (mail, exports) and Mailpit (http://localhost:8025).
 *   node fe/scripts/e2e-scenario.mjs                         steps 1–14 and 16–18 at M and X+
 *   node fe/scripts/e2e-scenario.mjs --sizes=X+ --steps=4-7  some steps (step 4 creates the project the later ones use)
 *   node fe/scripts/e2e-scenario.mjs --steps=15 --backend-down   step 15, with the backend stopped
 * Options: --base-url=http://localhost:3000  --mailpit=http://localhost:8025  --keep (keep the accounts it made)
 *
 * Output: fe/.page-shots/e2e/<size>-<step>-<name>.png and report.json. Exits 1 when a step fails.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PNG } from 'pngjs';
import { AppSession, SHOTS_DIR, backendEnv, seedAdmin } from './lib/app-session.mjs';

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const arg = args.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!arg) return fallback;
  return arg.includes('=') ? arg.split('=').slice(1).join('=') : true;
};
const baseUrl = String(option('base-url', 'http://localhost:3000')).replace(/\/+$/, '');
const mailpitUrl = String(option('mailpit', 'http://localhost:8025')).replace(/\/+$/, '');
const backendDown = Boolean(option('backend-down', false));
const keep = Boolean(option('keep', false));

const SIZES = {
  M: { width: 375, height: 812, mobile: true },
  'X+': { width: 1440, height: 900 },
};
const sizes = String(option('sizes', 'M,X+')).split(',').map((code) => {
  if (!SIZES[code]) throw new Error(`Unknown size ${code}; use ${Object.keys(SIZES).join(', ')}`);
  return { code, ...SIZES[code] };
});
const steps = (() => {
  const value = String(option('steps', backendDown ? '15' : '1-14,16-18'));
  const picked = new Set();
  for (const part of value.split(',')) {
    const [from, to = from] = part.split('-').map(Number);
    for (let n = from; n <= to; n++) picked.add(n);
  }
  return picked;
})();

const OUT_DIR = path.join(SHOTS_DIR, 'e2e');
const MOBILE_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36';
const PASSWORD = 'S8-test-2026';
const NEW_PASSWORD = 'S8-reset-2026';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const DIALOG = '[role="dialog"], [role="alertdialog"]';
/** Ids of the guided tours of the app (`<TourReplayButton tourId>`, `*_TOUR_ID` constants). */
const TOURS = [
  'home-v1', 'dashboard-v1', 'editor-new-v1', 'library-v1', 'studio-intro-v1', 'design-system-demo',
  ...[1, 2, 3, 4, 5, 6].map((step) => `studio-step-${step}-v1`),
];

// ---------------------------------------------------------------- Chrome (DevTools Protocol, one socket, many tabs)

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);

class Browser {
  static async launch() {
    const chromePath = CHROME_CANDIDATES.find((p) => fs.existsSync(p));
    if (!chromePath) throw new Error('No Chrome/Edge found. Set CHROME_PATH.');
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'wrapfit-e2e-'));
    // Port 0: Chrome picks a free port and writes it to DevToolsActivePort (as in page-shots.mjs). A fixed range
    // collides with the ports Windows reserves for Hyper-V / Docker.
    const portFile = path.join(profile, 'DevToolsActivePort');
    const child = spawn(chromePath, [
      '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run',
      '--no-default-browser-check', '--hide-scrollbars', '--force-device-scale-factor=1',
      // Every tab paints and runs its timers, as a foreground one does.
      '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
      'about:blank',
    ], { stdio: 'ignore' });
    let endpoint;
    for (let i = 0; i < 50 && !endpoint; i++) {
      try {
        const port = fs.readFileSync(portFile, 'utf8').split(/\r?\n/)[0].trim();
        endpoint = (await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()).webSocketDebuggerUrl;
      } catch {}
      if (!endpoint) await sleep(200);
    }
    if (!endpoint) throw new Error('Chrome did not start');
    const ws = new WebSocket(endpoint);
    await new Promise((resolve) => ws.addEventListener('open', resolve, { once: true }));
    return new Browser(ws, child, profile);
  }

  constructor(ws, child, profile) {
    this.ws = ws;
    this.child = child;
    this.profile = profile;
    this.nextId = 0;
    this.pending = new Map();
    /** sessionId → listener */
    this.sessions = new Map();
    /** Elements found over a control the scenario wanted to click (reported per step). */
    this.covered = [];
    ws.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        this.pending.get(message.id)(message);
        this.pending.delete(message.id);
      } else if (message.sessionId) this.sessions.get(message.sessionId)?.(message);
    });
  }

  send(method, params = {}, sessionId) {
    return new Promise((resolve, reject) => {
      const id = ++this.nextId;
      this.pending.set(id, (m) => (m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result)));
      this.ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }

  /** A context has its own cookies and storage, like an incognito window. */
  async newContext() {
    const { browserContextId } = await this.send('Target.createBrowserContext', { disposeOnDetach: true });
    return new Context(this, browserContextId);
  }

  async close() {
    this.ws.close();
    this.child.kill();
    await sleep(500);
    fs.rmSync(this.profile, { recursive: true, force: true });
  }
}

class Context {
  constructor(browser, id) {
    this.browser = browser;
    this.id = id;
  }

  async newPage(size) {
    const { targetId } = await this.browser.send('Target.createTarget', { url: 'about:blank', browserContextId: this.id });
    const { sessionId } = await this.browser.send('Target.attachToTarget', { targetId, flatten: true });
    const page = new Page(this, targetId, sessionId, size);
    await page.init();
    return page;
  }

  async cookies() {
    return (await this.browser.send('Storage.getCookies', { browserContextId: this.id })).cookies;
  }

  /** API calls with this context's cookies (also when they were set by the page). */
  async api() {
    const session = new AppSession(baseUrl);
    for (const c of await this.cookies()) session.jar.set(c.name, { value: c.value, path: c.path });
    return session;
  }

  async signIn(email, password) {
    const session = new AppSession(baseUrl);
    await session.signIn(email, password);
    await this.browser.send('Storage.setCookies', {
      browserContextId: this.id,
      cookies: session.cookies().map(({ url, ...c }) => ({ ...c, domain: new URL(url).hostname })),
    });
    return session;
  }

  async close() {
    await this.browser.send('Target.disposeBrowserContext', { browserContextId: this.id }).catch(() => {});
  }
}

/** Finds the first visible element by CSS selector, or by its text / aria-label / title among controls. */
const LOCATE = `(q) => {
  const visible = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && el.checkVisibility(); };
  const scope = q.in ? [...document.querySelectorAll(q.in)].filter(visible).pop() : document;
  if (!scope) return null;
  let found;
  if (q.selector) found = [...scope.querySelectorAll(q.selector)].filter(visible)[q.nth ?? 0];
  else {
    const text = q.text.toLowerCase();
    const name = (el) => [el.textContent, el.getAttribute('aria-label'), el.getAttribute('title')]
      .map((t) => (t ?? '').replace(/\\s+/g, ' ').trim().toLowerCase());
    const controls = [...scope.querySelectorAll('button, a, [role=button], [role=menuitem], [role=tab], [role=option], [role=radio], summary, label')]
      .filter(visible).filter((el) => name(el).some((t) => t.includes(text)));
    // Visible text before aria-label before title; exact before partial; then the shortest.
    const rank = (el) => { const names = name(el); const at = names.findIndex((t) => t.includes(text));
      return at * 2 + (names[at] === text ? 0 : 1); };
    controls.sort((a, b) => rank(a) - rank(b) || a.textContent.length - b.textContent.length);
    found = controls[q.nth ?? 0];
  }
  if (!found) return null;
  found.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
  const r = found.getBoundingClientRect();
  const x = r.left + r.width / 2;
  const y = r.top + r.height / 2;
  const top = document.elementFromPoint(x, y);
  const covered = top && !found.contains(top) && !top.contains(found)
    ? top.tagName.toLowerCase() + '.' + String(top.className).split(' ').slice(0, 3).join('.') : null;
  return { x, y, covered, disabled: Boolean(found.disabled || found.getAttribute('aria-disabled') === 'true') };
}`;

class Page {
  constructor(context, targetId, sessionId, size) {
    this.context = context;
    this.browser = context.browser;
    this.targetId = targetId;
    this.sessionId = sessionId;
    this.size = size;
    this.inflight = new Set();
    this.lastActivity = Date.now();
    this.responses = [];
    this.errors = [];
    this.listeners = new Set();
    this.browser.sessions.set(sessionId, (m) => this.onEvent(m));
  }

  send(method, params) {
    // The page a failing step touched last gets the failure screenshot.
    this.browser.lastPage = this;
    return this.browser.send(method, params, this.sessionId);
  }

  onEvent({ method, params: p }) {
    if (method === 'Network.requestWillBeSent') {
      this.inflight.add(p.requestId);
      this.lastActivity = Date.now();
    } else if (method === 'Network.responseReceived') {
      this.responses.push({ url: p.response.url.replace(baseUrl, ''), status: p.response.status, at: Date.now() });
    } else if (method === 'Network.loadingFinished' || method === 'Network.loadingFailed') {
      this.inflight.delete(p.requestId);
      this.lastActivity = Date.now();
    } else if (method === 'Runtime.exceptionThrown') {
      this.errors.push(p.exceptionDetails.exception?.description?.split('\n')[0] ?? p.exceptionDetails.text);
    } else if (method === 'Runtime.consoleAPICalled' && p.type === 'error') {
      this.errors.push(p.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 200));
    }
    this.listeners.forEach((listener) => listener(method, p));
  }

  async init() {
    for (const domain of ['Page', 'Runtime', 'Network', 'DOM']) await this.send(`${domain}.enable`);
    const { width, height, mobile } = this.size;
    await this.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: Boolean(mobile) });
    await this.send('Emulation.setTouchEmulationEnabled', { enabled: Boolean(mobile), maxTouchPoints: mobile ? 5 : 1 });
    if (mobile) await this.send('Emulation.setUserAgentOverride', { userAgent: MOBILE_UA });
    await this.send('Emulation.setFocusEmulationEnabled', { enabled: true });
    // The guided tours (components/ui/tour.tsx) would cover the controls: mark them all as seen.
    await this.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `try { for (const id of ${JSON.stringify(TOURS)}) localStorage.setItem('wrapfit.tour.' + id, 'skipped'); } catch {}`,
    });
  }

  async front() {
    await this.send('Page.bringToFront');
  }

  async goto(pathOrUrl) {
    const loaded = new Promise((resolve) => {
      const listener = (method) => {
        if (method === 'Page.loadEventFired') {
          this.listeners.delete(listener);
          resolve();
        }
      };
      this.listeners.add(listener);
    });
    await this.send('Page.navigate', { url: pathOrUrl.startsWith('http') ? pathOrUrl : baseUrl + pathOrUrl });
    await Promise.race([loaded, sleep(30000)]);
    await this.settle();
  }

  async reload() {
    await this.goto(await this.url());
  }

  /** Network idle for 600 ms, at most 12 seconds. */
  async settle(min = 800) {
    const start = Date.now();
    await sleep(min);
    while (Date.now() - start < 12000 && (this.inflight.size > 0 || Date.now() - this.lastActivity < 600)) await sleep(150);
  }

  async eval(expression) {
    const { result, exceptionDetails } = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (exceptionDetails) throw new Error(exceptionDetails.exception?.description?.split('\n')[0] ?? exceptionDetails.text);
    return result.value;
  }

  async url() {
    return this.eval('location.href');
  }

  async text() {
    return this.eval('document.body.innerText');
  }

  /** Polls until `check` (a page expression) is truthy; returns its value. */
  async waitFor(check, what, timeout = 20000) {
    const start = Date.now();
    for (;;) {
      const value = await this.eval(check).catch(() => null);
      if (value) return value;
      if (Date.now() - start > timeout) throw new Error(`timed out waiting for ${what ?? check}`);
      await sleep(250);
    }
  }

  waitText(text, timeout) {
    const texts = [].concat(text);
    return this.waitFor(
      `(() => { const t = document.body.innerText.toLowerCase(); return ${JSON.stringify(texts.map((s) => s.toLowerCase()))}.find((s) => t.includes(s)); })()`,
      `text "${texts.join('" | "')}"`,
      timeout,
    );
  }

  waitUrl(pattern, timeout) {
    return this.waitFor(`new RegExp(${JSON.stringify(pattern.source)}).test(location.href) && location.href`, `URL ${pattern}`, timeout);
  }

  waitSelector(selector, timeout) {
    return this.waitFor(`Boolean(document.querySelector(${JSON.stringify(selector)}))`, selector, timeout);
  }

  /** Clicks a control: `{ text }`, `{ selector }`, optional `in` (container selector) and `nth`. Waits until enabled. */
  async click(target, { wait = 500, timeout = 15000 } = {}) {
    const query = typeof target === 'string' ? { text: target } : target;
    const start = Date.now();
    let point;
    for (;;) {
      point = await this.eval(`(${LOCATE})(${JSON.stringify(query)})`);
      if (point?.covered && !this.browser.covered.some((c) => c.startsWith(point.covered))) {
        this.browser.covered.push(`${point.covered} over ${query.text ?? query.selector}`);
      }
      if (point && !point.disabled && !point.covered) {
        // Still moving (a bottom sheet sliding in, a dialog springing open): measure twice more until it stands still.
        let still = true;
        for (let i = 0; i < 2 && still; i++) {
          await sleep(200);
          const again = await this.eval(`(${LOCATE})(${JSON.stringify(query)})`);
          still = Boolean(again) && Math.abs(again.x - point.x) < 0.5 && Math.abs(again.y - point.y) < 0.5;
        }
        if (still) break;
        continue;
      }
      if (Date.now() - start > timeout) {
        const controls = await this.controls();
        const why = !point ? 'not found' : point.disabled ? 'disabled' : `covered by ${point.covered}`;
        throw new Error(`${why}: ${JSON.stringify(query)}. Visible controls: ${controls}`);
      }
      await sleep(250);
    }
    await this.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x, y: point.y });
    for (const type of ['mousePressed', 'mouseReleased']) {
      await this.send('Input.dispatchMouseEvent', { type, x: point.x, y: point.y, button: 'left', clickCount: 1 });
    }
    await sleep(wait);
  }

  /** Visible control names, for error messages. */
  controls() {
    return this.eval(`[...document.querySelectorAll('button, a, [role=button], [role=tab]')]
      .filter((el) => el.checkVisibility() && el.getBoundingClientRect().width > 0)
      .map((el) => (el.getAttribute('aria-label') || el.textContent).replace(/\\s+/g, ' ').trim().slice(0, 40))
      .filter(Boolean).slice(0, 60).join(' · ')`);
  }

  /** Replaces the value of an input / textarea by typing, as a user does (React sees every key). */
  async type(selector, text, { nth = 0, enter = false } = {}) {
    const found = await this.eval(`(() => {
      const el = [...document.querySelectorAll(${JSON.stringify(selector)})].filter((e) => e.checkVisibility())[${nth}];
      if (!el) return false;
      el.scrollIntoView({ block: 'center', behavior: 'instant' });
      el.focus();
      el.select?.();
      return true;
    })()`);
    if (!found) throw new Error(`no input ${selector}. Visible controls: ${await this.controls()}`);
    await this.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Delete', code: 'Delete', windowsVirtualKeyCode: 46 });
    await this.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Delete', code: 'Delete', windowsVirtualKeyCode: 46 });
    if (text) await this.send('Input.insertText', { text });
    if (enter) await this.key('Enter');
    await sleep(200);
  }

  /** Sets a value the way React's onChange sees it, for inputs that cannot be typed into (color, select). */
  async setValue(selector, value, nth = 0) {
    const done = await this.eval(`(() => {
      const el = [...document.querySelectorAll(${JSON.stringify(selector)})][${nth}];
      if (!el) return false;
      const proto = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(value)});
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()`);
    if (!done) throw new Error(`no element ${selector}`);
    await sleep(300);
  }

  async key(key) {
    const codes = { Enter: 13, Escape: 27, Tab: 9 };
    for (const type of ['keyDown', 'keyUp']) {
      await this.send('Input.dispatchKeyEvent', { type, key, code: key, windowsVirtualKeyCode: codes[key], text: key === 'Enter' ? '\r' : undefined });
    }
    await sleep(300);
  }

  /** Closes the open dialog: Escape, then its "Đóng" button when Escape did not (focus inside a field). */
  async closeDialog() {
    const open = () => this.eval(`Boolean([...document.querySelectorAll(${JSON.stringify(DIALOG)})].some((el) => el.checkVisibility()))`);
    await this.key('Escape');
    await sleep(400);
    if (await open()) await this.click({ selector: '[aria-label="Đóng"]', in: DIALOG });
    await this.waitFor(`!(${'[...document.querySelectorAll(' + JSON.stringify(DIALOG) + ')].some((el) => el.checkVisibility())'})`, 'the dialog to close', 10000);
  }

  async upload(selector, file) {
    const { root } = await this.send('DOM.getDocument', { depth: 0 });
    const { nodeId } = await this.send('DOM.querySelector', { nodeId: root.nodeId, selector });
    if (!nodeId) throw new Error(`no file input ${selector}`);
    await this.send('DOM.setFileInputFiles', { nodeId, files: [file] });
  }

  async shot(name) {
    await sleep(400);
    const { data } = await this.send('Page.captureScreenshot', { format: 'png' });
    const file = path.join(OUT_DIR, `${this.size.code.replace('+', 'p')}-${name}.png`);
    fs.writeFileSync(file, Buffer.from(data, 'base64'));
    return path.relative(SHOTS_DIR, file);
  }

  async close() {
    await this.browser.send('Target.closeTarget', { targetId: this.targetId }).catch(() => {});
    this.browser.sessions.delete(this.sessionId);
  }
}

// ---------------------------------------------------------------- Mailpit

async function mailsTo(email) {
  const res = await fetch(`${mailpitUrl}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`);
  return (await res.json()).messages ?? [];
}

/** Waits for mail number `count` to `email` (oldest first) and returns the first app link in it. */
async function mailLink(email, count, linkPath) {
  for (let i = 0; i < 80; i++) {
    const messages = await mailsTo(email);
    if (messages.length >= count) {
      const newest = [...messages].sort((a, b) => a.Created.localeCompare(b.Created))[count - 1];
      const message = await (await fetch(`${mailpitUrl}/api/v1/message/${newest.ID}`)).json();
      const link = (message.Text + message.HTML).match(new RegExp(`https?://[^\\s"'<>]*${linkPath}\\?token=[\\w-]+`))?.[0];
      if (!link) throw new Error(`no ${linkPath} link in "${newest.Subject}"`);
      return link.replace(/^https?:\/\/[^/]+/, baseUrl);
    }
    await sleep(500);
  }
  throw new Error(`mail ${count} to ${email} did not arrive (is the worker running?)`);
}

// ---------------------------------------------------------------- the scenario

/** A small PNG logo, made once. */
function pngFile() {
  const file = path.join(OUT_DIR, 'logo.png');
  if (!fs.existsSync(file)) {
    const png = new PNG({ width: 240, height: 240 });
    for (let y = 0; y < 240; y++) {
      for (let x = 0; x < 240; x++) {
        const i = (y * 240 + x) * 4;
        const ring = Math.hypot(x - 120, y - 120);
        const inside = ring < 100;
        png.data[i] = inside ? 26 : 212;
        png.data[i + 1] = inside ? 54 : 175;
        png.data[i + 2] = inside ? 43 : 55;
        png.data[i + 3] = ring < 112 ? 255 : 0;
      }
    }
    fs.writeFileSync(file, PNG.sync.write(png));
  }
  return file;
}

async function projectOf(api, id) {
  return api.request(`/projects/${id}`);
}

/** Adds a text through the studio's "Chèn Vào Mặt Hộp" form. */
async function addText(page, text) {
  const open = await page.eval(`[...document.querySelectorAll('textarea[placeholder^="Ví dụ"]')].some((el) => el.checkVisibility())`);
  if (!open) await page.click('Thêm chữ');
  await page.type('textarea[placeholder^="Ví dụ"]', text);
  await page.click('Chèn Vào Mặt Hộp');
}

/**
 * Checks that the old session is gone: the API answers 401 with the page's cookies, and the page shows the login page
 * or the guest workspace that workspace pages give visitors without a session (features/auth/RequireAuth.tsx), never
 * the account's name. Returns which page.
 */
async function signedOut(page, name) {
  const status = await (await page.context.api()).request('/auth/me').then(() => 200, (error) => error.status);
  if (status !== 401) throw new Error(`the old session still answers ${status} on /auth/me`);
  return page.waitFor(
    `location.pathname.startsWith('/auth/login') ? 'login page'
      : document.body.innerText.includes('Không gian làm việc khách') ? 'guest workspace'
      : document.readyState === 'complete' && document.querySelector('main h1') && !document.body.innerHTML.includes(${JSON.stringify(name)}) && 'guest workspace (example projects)'`,
    'the signed-out page',
    30000,
  );
}

/** Waits until the studio says the canvas is saved. */
async function saved(page, timeout = 20000) {
  await page.waitText('Đã lưu trên Cloud', timeout);
  await page.settle(300);
}

function scenario(size, browser, report) {
  const stamp = Date.now().toString(36);
  const sizeTag = size.code === 'M' ? 'm' : 'x';
  const user = { name: `Thử S8 ${size.code}`, email: `s8-${sizeTag}-${stamp}@wrapfit.test`, password: PASSWORD };
  const admin = seedAdmin();
  const state = {};
  const contexts = [];
  const newContext = async () => {
    const context = await browser.newContext();
    contexts.push(context);
    return context;
  };

  const all = {
    /** 1 + 2: register, unverified login, resend, the old link is dead, verify, sign in. */
    1: async (log) => {
      state.owner = await newContext();
      const page = (state.ownerPage = await state.owner.newPage(size));
      await page.goto('/auth/register');
      await page.type('#input-name', user.name);
      await page.type('#input-email', user.email);
      await page.type('#input-password', user.password);
      await page.click({ selector: 'form button[type="submit"]' });
      await page.waitUrl(/\/check-email/);
      await page.waitText('Gửi lại email');
      log.shots.push(await page.shot('01-check-email'));
      state.firstLink = await mailLink(user.email, 1, '/verify-email');
      state.firstMailAt = Date.now();
      log.notes.push(`verification email to ${user.email}`);
    },
    2: async (log) => {
      const page = state.ownerPage;
      await page.goto(`/auth/login?email=${encodeURIComponent(user.email)}`);
      await page.type('#input-password', user.password);
      await page.click({ selector: 'form button[type="submit"]' });
      await page.waitUrl(/\/check-email/);
      log.shots.push(await page.shot('02-login-unverified'));
      // The backend sends one email of each kind per user per minute.
      await sleep(Math.max(0, state.firstMailAt + 61000 - Date.now()));
      await page.click('Gửi lại email');
      const secondLink = await mailLink(user.email, 2, '/verify-email');
      await page.settle(300);
      log.shots.push(await page.shot('02-resent'));
      await page.goto(state.firstLink);
      const verdict = await page.waitText(['Link không còn hiệu lực', 'Link đã hết hạn', 'Chưa xác nhận được email']);
      log.notes.push(`old link: "${verdict}"`);
      log.shots.push(await page.shot('02-old-link'));
      await page.goto(secondLink);
      await page.waitText('Email đã được xác nhận');
      log.shots.push(await page.shot('01-verified'));
      await page.click('Đăng nhập');
      await page.waitUrl(/\/auth\/login/);
      await page.type('#input-email', user.email);
      await page.type('#input-password', user.password);
      await page.click({ selector: 'form button[type="submit"]' });
      await page.waitFor(`!location.pathname.startsWith('/auth') && location.pathname`, 'leaving the login page');
      await page.settle();
      const named = await page.eval(`document.body.innerHTML.includes(${JSON.stringify(user.name)})`);
      if (!named) throw new Error(`the header does not show "${user.name}"`);
      log.shots.push(await page.shot('01-signed-in-header'));
    },
    /** 3: forgot / reset password in another window; the first window's session ends. */
    3: async (log) => {
      const owner = state.ownerPage;
      await owner.goto('/dashboard');
      await owner.waitText('Dự án');
      const guest = await (await newContext()).newPage(size);
      await guest.goto('/forgot-password');
      await guest.type('input[name="email"]', user.email);
      const before = (await mailsTo(user.email)).length;
      await guest.click({ selector: 'button[type="submit"]' });
      const resetLink = await mailLink(user.email, before + 1, '/reset-password');
      log.shots.push(await guest.shot('03-forgot-sent'));
      await guest.goto(resetLink);
      await guest.type('input[name="password"]', NEW_PASSWORD);
      await guest.type('input[name="confirmPassword"]', NEW_PASSWORD);
      await guest.click({ selector: 'button[type="submit"]' });
      await guest.waitUrl(/notice=password_reset/);
      log.shots.push(await guest.shot('03-reset-done'));
      user.password = NEW_PASSWORD;
      await owner.front();
      await owner.goto('/dashboard/projects');
      log.notes.push(`old window → ${await signedOut(owner, user.name)}`);
      log.shots.push(await owner.shot('03-old-session-out'));
      // The workspace may still be handling the expired session (toast, guest data): sign in from a fresh login page.
      await owner.goto('/auth/login');
      await owner.waitSelector('#input-email', 30000);
      await owner.type('#input-email', user.email);
      await owner.type('#input-password', user.password);
      await owner.click({ selector: 'form button[type="submit"]' });
      await owner.waitFor(`!location.pathname.startsWith('/auth') && location.pathname`, 'leaving the login page');
      await owner.goto('/dashboard/projects');
      await owner.waitFor(`document.body.innerHTML.includes(${JSON.stringify(user.name)})`, 'the account in the header');
    },
    /** 4: new tuck-top 120 × 80 × 60, a text and a PNG, still there after F5. */
    4: async (log) => {
      if (!state.owner) await signedInOwner();
      const page = state.ownerPage;
      // Step 18 checks that the global block of /dashboard grew after this account's exports.
      state.globalBefore = await (await state.owner.api())
        .request('/analytics/summary', { query: { scope: 'global', days: 30 } })
        .catch(() => null);
      await page.goto('/editor/new');
      await page.click({ text: 'nắp gài' });
      for (const [nth, value] of [120, 80, 60].entries()) await page.type('input[aria-label$="(mm)"]', String(value), { nth, enter: true });
      log.shots.push(await page.shot('04-new-dimensions'));
      await page.click('Tạo dự án & mở studio');
      const url = await page.waitUrl(/\/editor\/[0-9a-f-]{36}/, 30000);
      state.projectId = url.match(/\/editor\/([0-9a-f-]{36})/)[1];
      await page.settle();
      await page.upload('input[type="file"][accept*="image"]', pngFile());
      await page.waitFor(`document.querySelectorAll('image, img[src*="wrapfit"]').length > 0`, 'the uploaded image on the canvas', 30000);
      // After the image, so the text is placed in the free space beside it.
      await addText(page, 'Chúc mừng sinh nhật');
      await saved(page);
      log.shots.push(await page.shot('04-text-and-image'));
      await page.reload();
      await saved(page);
      const project = await projectOf(await state.owner.api(), state.projectId);
      const types = project.canvasState.elements.map((e) => e.type).sort().join(',');
      if (types !== 'image,text') throw new Error(`after F5 the canvas has [${types}], expected image + text`);
      log.notes.push(`project ${state.projectId} v${project.version}: ${types}`);
      log.shots.push(await page.shot('04-after-reload'));
    },
    /** 5: two tabs on one project, both edit: the second gets the conflict dialog and loads the newer version. */
    5: async (log) => {
      const first = state.ownerPage;
      const second = await state.owner.newPage(size);
      await second.goto(`/editor/${state.projectId}`);
      await saved(second);
      await first.front();
      await addText(first, 'Từ tab 1');
      await saved(first);
      await second.front();
      await addText(second, 'Từ tab 2');
      await second.waitText('Tải bản mới', 30000);
      log.shots.push(await second.shot('05-conflict-dialog'));
      await second.click({ text: 'Tải bản mới', in: DIALOG });
      await saved(second);
      const texts = await elementTexts();
      if (!texts.includes('Từ tab 1') || texts.includes('Từ tab 2')) throw new Error(`canvas after reload: ${texts.join(' | ')}`);
      log.notes.push(`saved canvas: ${texts.join(' | ')}`);
      log.shots.push(await second.shot('05-newer-version-loaded'));
      await second.close();
      await first.front();
      await first.reload();
      await saved(first);
    },
    /** 6: save a snapshot, edit, restore it, undo the restore. */
    6: async (log) => {
      const page = state.ownerPage;
      await page.click('Mốc phiên bản');
      await page.type('input[placeholder^="Tên mốc"]', 'Mốc S8');
      await page.click({ text: 'Lưu mốc', in: DIALOG });
      await page.waitSelector('[aria-label="Khôi phục mốc Mốc S8"]');
      log.shots.push(await page.shot('06-snapshot-saved'));
      await page.closeDialog();
      await addText(page, 'Sau mốc');
      await saved(page);
      await page.click('Mốc phiên bản');
      await page.click({ selector: '[aria-label="Khôi phục mốc Mốc S8"]' });
      await page.click({ text: 'Khôi phục', in: DIALOG }, { wait: 300 });
      await page.waitText('Hoàn tác', 30000);
      await saved(page);
      const restored = await elementTexts();
      if (restored.includes('Sau mốc')) throw new Error(`restore kept "Sau mốc": ${restored.join(' | ')}`);
      log.shots.push(await page.shot('06-restored'));
      await page.click('Hoàn tác');
      await page.waitFor(`!document.body.innerText.includes('Đã khôi phục mốc')`, 'the undo bar to close', 30000);
      await saved(page);
      const undone = await elementTexts();
      if (!undone.includes('Sau mốc')) throw new Error(`undo did not bring back "Sau mốc": ${undone.join(' | ')}`);
      log.notes.push(`restore → ${restored.length} texts, undo → ${undone.length}`);
      log.shots.push(await page.shot('06-undone'));
    },
    /** 7: a text on the cut line blocks the PDF (422 → FitCheck), the auto-fix clears it, then PDF, SVG and DXF. */
    7: async (log) => {
      const page = state.ownerPage;
      const api = await state.owner.api();
      const project = await projectOf(api, state.projectId);
      // Stands in for dragging on the canvas: the first text goes to the panel's left edge.
      const elements = project.canvasState.elements.map((e) => (e.type === 'text' && e.content === 'Chúc mừng sinh nhật' ? { ...e, x: 0 } : e));
      await api.request(`/projects/${state.projectId}`, { method: 'PATCH', json: { version: project.version, canvasState: { ...project.canvasState, elements } } });
      await page.reload();
      await saved(page);
      await openExportDialog(page);
      await page.click({ text: 'PDF in CMYK nhiều lớp', in: DIALOG });
      await page.waitText('Mở FitCheck để sửa', 30000);
      log.shots.push(await page.shot('07-export-blocked'));
      await page.click('Mở FitCheck để sửa');
      await page.click('Tự sửa lề an toàn');
      await saved(page);
      log.shots.push(await page.shot('07-fitcheck-fixed'));
      // A new account is Free (docs/16 §5.2): the home-print PDF is free with a watermark on the glue flap, the clean
      // formats need a credit. Step 16 buys it; here the free file only.
      await openExportDialog(page);
      await page.waitText('Có watermark');
      log.shots.push(await page.shot('07-export-dialog-free'));
      const a4 = await exportFile(page, api, state.projectId, 'PDF_A4_PRINT', 'PDF A4/A3 In Thủ Công');
      if (!a4.job.watermarked) throw new Error('the Free PDF A4 is not watermarked');
      log.notes.push(`PDF_A4_PRINT ${a4.bytes} B, watermarked`);
      log.shots.push(await page.shot('07-export-pdf-a4-watermarked'));
      await page.closeDialog();
    },
    /** 8: unlisted link opened by a guest (noindex), then liked and remixed by another account. */
    8: async (log) => {
      const page = state.ownerPage;
      // Step 7 ends on the print step; on a phone the share button sits in the design step's toolbar.
      await page.click({ selector: '[aria-label="Bước 4: Thiết kế"]' });
      await page.click('Chia sẻ');
      await page.click({ text: 'Có link', in: DIALOG });
      const ownerApi = await state.owner.api();
      await waitFor(async () => (await projectOf(ownerApi, state.projectId)).visibility === 'UNLISTED', 'the unlisted link');
      await page.waitText('/p/', 20000);
      log.shots.push(await page.shot('08-share-unlisted'));
      await page.closeDialog();
      const { slug, visibility } = await projectOf(await state.owner.api(), state.projectId);
      if (visibility !== 'UNLISTED') throw new Error(`visibility is ${visibility}`);
      const visitor = await newContext();
      const guest = await visitor.newPage(size);
      await guest.goto(`/p/${slug}`);
      await guest.waitText('Thả tim');
      const robots = await guest.eval(`document.querySelector('meta[name="robots"]')?.content ?? ''`);
      if (!/noindex/.test(robots)) throw new Error(`robots meta is "${robots}"`);
      log.notes.push(`robots "${robots}"`);
      log.shots.push(await guest.shot('08-guest-view'));
      // A maker likes and remixes: a signed-in admin is kept inside /admin (WorkspaceShell).
      const other = backendEnv('SEED_DEMO_PASSWORD')
        ? { email: backendEnv('SEED_DEMO_EMAIL') || 'demo@wrapfit.vn', password: backendEnv('SEED_DEMO_PASSWORD') }
        : null;
      if (!other) throw new Error('step 8 needs a second maker: set SEED_DEMO_PASSWORD in be/.env and seed the demo account');
      await visitor.signIn(other.email, other.password);
      await guest.reload();
      await guest.click('Thả tim');
      await guest.waitText('Đã thích');
      log.shots.push(await guest.shot('08-liked'));
      await guest.click('Phối lại thiết kế này');
      const remix = await guest.waitUrl(/\/editor\/[0-9a-f-]{36}/, 30000);
      const remixId = remix.match(/\/editor\/([0-9a-f-]{36})/)[1];
      await saved(guest);
      log.notes.push(`remix ${remixId}`);
      log.shots.push(await guest.shot('08-remix-opened'));
      // The remix belongs to the other account: remove it for good.
      const adminApi = await visitor.api();
      await adminApi.request(`/projects/${remixId}/status`, { method: 'PATCH', json: { status: 'DELETED' } }).catch(() => {});
      await adminApi.request(`/projects/${remixId}`, { method: 'DELETE' }).catch(() => {});
    },
    /** 9: QR unboxing page, opened by a guest. */
    9: async (log) => {
      const page = state.ownerPage;
      await page.click({ selector: '[aria-label="Bước 5: Quà & mở hộp"]' });
      await page.click('Viết lời chúc & tạo mã QR');
      await page.waitSelector('input[placeholder="Mẹ yêu"]');
      await page.settle(800);
      await page.type('input[placeholder="Mẹ yêu"]', 'Mai Anh');
      await page.type('textarea[placeholder^="Chúc mẹ"]', 'Chúc Mai Anh tuổi mới thật rực rỡ!');
      await page.click({ text: 'Trái tim', in: DIALOG });
      await page.click({ text: 'Tạo mã QR', in: DIALOG });
      await page.waitText('Sửa lời chúc', 30000);
      await page.settle();
      log.shots.push(await page.shot('09-qr-created'));
      await page.closeDialog();
      const unboxing = await (await state.owner.api()).request(`/projects/${state.projectId}/unboxing`);
      const guest = await (await newContext()).newPage(size);
      await guest.goto(unboxing.unboxUrl.replace(/^https?:\/\/[^/]+/, baseUrl));
      await guest.waitText('Mai Anh', 30000);
      await guest.settle(1500);
      log.notes.push(`${unboxing.unboxUrl}, effect ${unboxing.particleEffect}`);
      log.shots.push(await guest.shot('09-unbox-guest'));
    },
    /** 10: duplicate, archive, trash, restore, delete for good, folders. */
    10: async (log) => {
      const page = state.ownerPage;
      const api = await state.owner.api();
      const { title } = await projectOf(api, state.projectId);
      const menu = async (projectTitle, action) => {
        await page.click({ selector: `[aria-label="Thao tác khác với “${projectTitle}”"]` });
        await page.click({ text: action, in: '[role="menu"]' });
      };
      const tab = async (label) => {
        const active = `document.querySelector('[aria-label="Trạng thái dự án"] [aria-checked="true"]')?.textContent.includes(${JSON.stringify(label)})`;
        for (let attempt = 0; attempt < 3 && !(await page.eval(active)); attempt++) {
          await page.click({ text: label, in: '[aria-label="Trạng thái dự án"]' }, { wait: 800 });
        }
        await page.waitFor(active, `the "${label}" tab`);
      };
      // A toast also names the project: wait for its card instead of its title.
      const card = (projectTitle) => page.waitSelector(`[aria-label="Thao tác khác với “${projectTitle}”"], [aria-label="Xoá vĩnh viễn “${projectTitle}”"]`);
      await page.goto('/dashboard/projects');
      await page.waitText(title);
      const ids = async () => (await api.request('/projects', { query: { limit: 50 } })).items;
      const before = new Set((await ids()).map((p) => p.id));
      await menu(title, 'Nhân bản');
      const copy = await waitFor(async () => (await ids()).find((p) => !before.has(p.id)), 'the copy');
      await page.waitText(copy.title);
      log.shots.push(await page.shot('10-duplicated'));
      await menu(copy.title, 'Lưu trữ');
      await waitFor(async () => (await api.request(`/projects/${copy.id}`)).status === 'ARCHIVED', 'the archived copy');
      await tab('Lưu trữ');
      await card(copy.title);
      log.shots.push(await page.shot('10-archived'));
      await menu(copy.title, 'Chuyển vào thùng rác');
      await waitFor(async () => (await api.request(`/projects/${copy.id}`)).status === 'DELETED', 'the trashed copy');
      await tab('Thùng rác');
      await card(copy.title);
      log.shots.push(await page.shot('10-trash'));
      await page.click({ text: 'Khôi phục', in: 'main' });
      await waitFor(async () => (await api.request(`/projects/${copy.id}`)).status === 'ACTIVE', 'the restored copy');
      await tab('Đang thiết kế');
      await card(copy.title);
      await menu(copy.title, 'Chuyển vào thùng rác');
      await tab('Thùng rác');
      await page.click({ selector: `[aria-label="Xoá vĩnh viễn “${copy.title}”"]` });
      await page.click({ text: 'Xoá vĩnh viễn', in: DIALOG });
      await waitFor(async () => api.request(`/projects/${copy.id}`).then(() => false, (error) => error.status === 404), 'the copy to be gone');
      log.shots.push(await page.shot('10-deleted-for-good'));
      await tab('Đang thiết kế');
      await page.click({ selector: '[aria-label="Tạo thư mục mới"]' });
      await page.type('[role="dialog"] input', 'Quà Tết S8');
      await page.click({ text: 'Tạo thư mục', in: DIALOG });
      await page.waitText('Quà Tết S8');
      // The new folder becomes the filter: show every project again to find this one.
      await page.click({ text: 'Tất cả', in: '[aria-label="Lọc theo thư mục"]' });
      await menu(title, 'Chuyển thư mục');
      await page.click({ text: 'Quà Tết S8', in: DIALOG });
      await page.click({ text: 'Chuyển', in: DIALOG });
      await waitFor(async () => (await api.request(`/projects/${state.projectId}`)).collection?.title === 'Quà Tết S8', 'the move');
      await page.click({ text: 'Quà Tết S8' });
      await page.waitText(title);
      log.notes.push('copy: archived, trashed, restored, deleted for good; project moved into a new folder');
      log.shots.push(await page.shot('10-folder'));
    },
    /** 11: Brand Kit logo and three colours survive F5. */
    11: async (log) => {
      const page = state.ownerPage;
      await page.goto('/dashboard/brand-kit');
      await page.waitText('Lưu bộ nhận diện');
      await page.upload('input[type="file"]', pngFile());
      await page.waitText('có logo', 30000);
      const colors = ['#1a362b', '#d4af37', '#ff6b6b'];
      for (const [nth, color] of colors.entries()) await page.setValue('input[type="color"]', color, nth);
      await page.click('Lưu bộ nhận diện');
      await page.settle();
      await page.reload();
      await page.waitText('có logo');
      const kept = await page.eval(`[...document.querySelectorAll('input[type="color"]')].slice(0, 3).map((el) => el.value.toLowerCase())`);
      if (kept.join() !== colors.join()) throw new Error(`after F5 the colours are ${kept.join(', ')}`);
      log.notes.push(`colours ${kept.join(' ')} and the logo kept`);
      log.shots.push(await page.shot('11-brand-kit-after-reload'));
    },
    /** 12: "Dùng mẫu này" → a new project with the template's canvas. */
    12: async (log) => {
      const page = state.ownerPage;
      await page.goto('/templates');
      await page.click({ selector: '[aria-label^="Dùng mẫu "]' });
      const url = await page.waitUrl(/template=/, 20000);
      const templateId = new URL(url).searchParams.get('template');
      await page.settle();
      log.shots.push(await page.shot('12-template-start'));
      await page.click('Tạo dự án & mở studio');
      const studio = await page.waitUrl(/\/editor\/[0-9a-f-]{36}/, 30000);
      const projectId = studio.match(/\/editor\/([0-9a-f-]{36})/)[1];
      await saved(page);
      const api = await state.owner.api();
      const [template, project] = await Promise.all([api.request(`/templates/${templateId}`), projectOf(api, projectId)]);
      const want = template.canvasState?.elements?.length ?? 0;
      const got = project.canvasState.elements.length;
      if (!want || got !== want) throw new Error(`template has ${want} elements, the new project ${got}`);
      log.notes.push(`"${template.title}": ${got} elements`);
      log.shots.push(await page.shot('12-template-project'));
    },
    /** 13: a MAKER gets 403 on /admin/accounts; the admin locks the account and its session ends. */
    13: async (log) => {
      const page = state.ownerPage;
      await page.goto('/admin/accounts');
      await page.waitText('Không có quyền truy cập');
      log.shots.push(await page.shot('13-maker-403'));
      const adminContext = await newContext();
      await adminContext.signIn(admin.email, admin.password);
      const adminPage = await adminContext.newPage(size);
      await adminPage.goto('/admin/accounts');
      await adminPage.type('input[aria-label^="Lọc tài khoản"]', user.email);
      await adminPage.click({ selector: `[aria-label="Khoá tài khoản ${user.name}"]` });
      await adminPage.click({ text: 'Khoá tài khoản', in: DIALOG });
      await adminPage.waitSelector(`[aria-label="Mở khoá tài khoản ${user.name}"]`);
      log.shots.push(await adminPage.shot('13-admin-locked'));
      await page.front();
      await page.goto('/dashboard/projects');
      log.notes.push(`maker → 403 page; locked account → ${await signedOut(page, user.name)}; unlocked again`);
      log.shots.push(await page.shot('13-locked-user-out'));
      await adminPage.front();
      await adminPage.click({ selector: `[aria-label="Mở khoá tài khoản ${user.name}"]` });
      await adminPage.waitSelector(`[aria-label="Khoá tài khoản ${user.name}"]`);
      await state.owner.signIn(user.email, user.password);
      await adminContext.close();
    },
    /** 14: the access cookie disappears mid-session: the next call refreshes it and the page carries on. */
    14: async (log) => {
      const page = state.ownerPage;
      await page.goto('/dashboard');
      await page.waitText('Dự án');
      await page.send('Network.deleteCookies', { name: 'wf_access', url: baseUrl });
      const mark = Date.now();
      await page.goto('/dashboard/projects');
      const refresh = page.responses.find((r) => r.at >= mark && r.url.startsWith('/api/auth/refresh'));
      if (refresh?.status !== 200) throw new Error(`refresh answered ${refresh?.status ?? 'nothing'}`);
      if (/\/auth\/login/.test(await page.url())) throw new Error('signed out');
      log.notes.push('refresh 200, still signed in');
      log.shots.push(await page.shot('14-after-refresh'));
    },
    /**
     * 16 (docs/17 §5): a clean SVG needs a credit (402), one is bought through the VietQR checkout in simulation
     * mode, the SVG comes out clean; PDF CMYK and DXF of the same version cost nothing more.
     */
    16: async (log) => {
      const page = state.ownerPage;
      const api = await state.owner.api();
      await openStudio(page, api);
      const before = await api.request(`/projects/${state.projectId}/exports/access`);
      if (before.unlocked || before.balance !== 0) throw new Error(`expected a locked design and no credit, got ${JSON.stringify(before)}`);
      await openExportDialog(page);
      await page.waitText('Cần 1 lượt xuất');
      await page.click({ text: 'SVG nhiều lớp', in: DIALOG });
      await page.waitText('Bạn đã hết lượt xuất', 30000);
      log.shots.push(await page.shot('16-export-402'));
      const known = new Set((await api.request(`/projects/${state.projectId}/exports`)).map((job) => job.id));
      await page.click({ text: 'Mua 1 lượt', in: DIALOG });
      await page.waitText('Giả lập đã thanh toán', 30000);
      const reference = await page.eval(`document.body.innerText.match(/WF[A-Z2-9]{6}/)?.[0] ?? null`);
      if (!reference) throw new Error('the checkout shows no WF reference');
      log.shots.push(await page.shot('16-checkout-vietqr'));
      await page.click({ text: 'Giả lập đã thanh toán', in: DIALOG });
      await page.waitText('Thanh toán thành công', 30000);
      log.shots.push(await page.shot('16-checkout-paid'));
      await page.click({ text: 'Xuất SVG ngay', in: DIALOG });
      const svg = await downloadJob(await waitForJob(api, state.projectId, 'SVG', known), 'SVG');
      if (svg.job.watermarked) throw new Error('the SVG paid with a credit is watermarked');
      await page.waitText('Tải về', 30000);
      log.shots.push(await page.shot('16-export-svg-clean'));
      const after = await api.request(`/projects/${state.projectId}/exports/access`);
      if (!after.unlocked || after.balance !== 0) throw new Error(`after paying: ${JSON.stringify(after)}`);
      const notes = [`paid ${reference}`, `SVG ${svg.bytes} B clean`];
      for (const [format, title] of [['PDF_CMYK', 'PDF in CMYK nhiều lớp'], ['DXF', 'DXF']]) {
        const { job, bytes } = await exportFile(page, api, state.projectId, format, title);
        if (job.watermarked) throw new Error(`${format} of the unlocked design is watermarked`);
        notes.push(`${format} ${bytes} B`);
        log.shots.push(await page.shot(`16-export-${format.toLowerCase()}`));
      }
      const balance = (await api.request(`/projects/${state.projectId}/exports/access`)).balance;
      if (balance !== 0) throw new Error(`balance ${balance} after the free re-exports`);
      log.notes.push(...notes, 'same version: no second credit');
      await page.closeDialog();
    },
    /** 17 (docs/17 §5 step 5): a 49.000đ sample order from the export dialog, paid by VietQR simulation → PAID. */
    17: async (log) => {
      const page = state.ownerPage;
      const api = await state.owner.api();
      await openStudio(page, api);
      await openExportDialog(page);
      await page.click({ text: 'Đặt in mẫu 1 hộp', in: DIALOG });
      await page.waitUrl(/\/cart/);
      await page.waitText('Đặt in mẫu ·', 30000);
      await page.type('input[autocomplete="name"]', 'Nguyễn Mai Anh');
      await page.type('input[autocomplete="tel"]', '0901234567');
      await page.type('input[autocomplete="street-address"]', '12 Lê Lợi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh');
      log.shots.push(await page.shot('17-cart'));
      await page.click({ selector: 'form button[type="submit"]' });
      await page.waitText('Giả lập đã thanh toán', 30000);
      const amount = await page.eval(`document.querySelector('[role="dialog"]')?.innerText.match(/[\\d.]+\\s?đ/)?.[0] ?? null`);
      log.shots.push(await page.shot('17-checkout-vietqr'));
      await page.click({ text: 'Giả lập đã thanh toán', in: DIALOG });
      await page.waitText('Thanh toán thành công', 30000);
      log.shots.push(await page.shot('17-checkout-paid'));
      await page.click({ text: 'Xong', in: DIALOG });
      const orders = (await api.request('/orders/my-orders')).filter((o) => o.projectId === state.projectId);
      const order = orders.find((o) => o.orderStatus === 'PAID');
      if (!order) throw new Error(`orders of the project: ${orders.map((o) => `${o.orderCode} ${o.orderStatus}`).join(', ') || 'none'}`);
      await page.goto('/dashboard/orders');
      await page.waitText(order.orderCode, 30000);
      log.notes.push(`order ${order.orderCode} ${amount ?? ''} PAID`);
      log.shots.push(await page.shot('17-orders-paid'));
    },
    /** 18 (docs/17 §5 step 7): /dashboard counts what this account just did; the global block grew too. */
    18: async (log) => {
      const page = state.ownerPage;
      const api = await state.owner.api();
      const me = await api.request('/analytics/summary', { query: { scope: 'me', days: 30 } });
      const exported = Object.fromEntries(me.exports.byFormat.map((f) => [f.fileType, f.count]));
      const problems = [
        me.boxes.total < 1 && `boxes ${me.boxes.total}`,
        me.fitcheck.prevented < 1 && `FitCheck prevented ${me.fitcheck.prevented}`,
        !(exported.SVG >= 1 && exported.PDF_A4_PRINT >= 1) && `exports ${JSON.stringify(exported)}`,
      ].filter(Boolean);
      if (problems.length) throw new Error(`analytics of this account: ${problems.join(', ')}`);
      if (state.globalBefore) {
        const global = await waitFor(async () => {
          const now = await api.request('/analytics/summary', { query: { scope: 'global', days: 30 } });
          // The global block is cached for 60 s.
          return now.exports.total > state.globalBefore.exports.total && now;
        }, 'the global export count to grow');
        log.notes.push(`global exports ${state.globalBefore.exports.total} → ${global.exports.total}`);
      }
      await page.goto('/dashboard');
      await page.waitText('Hộp đã tạo', 30000);
      await page.eval(`[...document.querySelectorAll('h2, h3')].find((el) => /Số liệu thiết kế/.test(el.textContent))?.scrollIntoView({ block: 'start', behavior: 'instant' })`);
      await page.settle(1500);
      log.notes.push(`me: ${me.boxes.total} boxes, ${me.fitcheck.prevented} FitCheck errors stopped, ${me.exports.total} exports`);
      log.shots.push(await page.shot('18-dashboard-stats'));
    },
    /** 15 (backend stopped): pages show an error with a retry, never fake data. */
    15: async (log) => {
      const page = await (await newContext()).newPage(size);
      for (const [name, route] of [['dashboard', '/dashboard/projects'], ['templates', '/templates'], ['login', '/auth/login']]) {
        await page.goto(route);
        await page.settle(2500);
        const text = await page.text();
        const message = text.match(/(Máy chủ[^\n]{0,60}|Mất kết nối[^\n]{0,60}|Không kết nối[^\n]{0,60}|Mã lỗi[^\n]{0,40})/i)?.[0];
        log.notes.push(`${route}: ${message ?? 'no error message'}`);
        if (message) {
          await page.eval(`[...document.querySelectorAll('main *')].reverse()
            .find((el) => el.children.length === 0 && el.textContent.includes(${JSON.stringify(message.slice(0, 20))}))
            ?.scrollIntoView({ block: 'center', behavior: 'instant' })`);
        }
        log.shots.push(await page.shot(`15-backend-down-${name}`));
      }
    },
  };

  /** The studio of the scenario's project (with --user and no step 4: the account's newest project). */
  async function openStudio(page, api) {
    state.projectId ??= (await api.request('/projects', { query: { limit: 1 } })).items[0]?.id;
    if (!state.projectId) throw new Error('the account has no project: include step 4');
    await page.goto(`/editor/${state.projectId}`);
    await saved(page);
  }

  /** Texts on the saved canvas. */
  async function elementTexts() {
    const project = await projectOf(await state.owner.api(), state.projectId);
    return project.canvasState.elements.filter((e) => e.type === 'text').map((e) => e.content);
  }

  async function signedInOwner() {
    const email = option('user');
    if (typeof email !== 'string') throw new Error('steps 1–3 make the account the later steps use: include them, or pass --user= and --password=');
    user.email = email;
    user.name = String(option('name', user.name));
    user.password = String(option('password', PASSWORD));
    state.owner = await newContext();
    await state.owner.signIn(user.email, user.password);
    state.ownerPage = await state.owner.newPage(size);
  }

  async function cleanup() {
    for (const context of contexts) await context.close();
    if (keep || !state.owner || option('user')) return;
    try {
      const adminApi = new AppSession(baseUrl);
      await adminApi.signIn(admin.email, admin.password);
      const account = await findAccount(adminApi, user.email);
      if (account) await adminApi.request(`/users/${account.id}`, { method: 'DELETE' });
    } catch (error) {
      report.push({ size: size.code, step: 'cleanup', ok: false, error: error.message });
    }
  }

  /** With --user, a step after 4 can run alone: sign in and take the account's newest project. */
  async function prepare(step) {
    if (step <= 4 || state.owner || typeof option('user') !== 'string') return;
    await signedInOwner();
    state.projectId = (await (await state.owner.api()).request('/projects', { query: { limit: 1 } })).items[0]?.id;
    if (state.projectId) {
      await state.ownerPage.goto(`/editor/${state.projectId}`);
      await saved(state.ownerPage);
    }
  }

  return { all, cleanup, user, prepare };
}

async function findAccount(api, email) {
  for (let page = 1; page <= 20; page++) {
    const { items, meta } = await api.request('/users', { query: { page, limit: 50 } });
    const found = items.find((account) => account.email === email);
    if (found || page >= (meta?.totalPages ?? 1)) return found ?? null;
  }
  return null;
}

/** Polls an async check (a value or true) every 500 ms, up to 60 s. */
async function waitFor(check, what) {
  for (let i = 0; i < 120; i++) {
    const value = await check().catch((error) => {
      if (error.fatal) throw error;
      return null;
    });
    if (value) return value;
    await sleep(500);
  }
  throw new Error(`timed out waiting for ${what}`);
}

async function openExportDialog(page) {
  if (!(await page.eval(`Boolean(document.querySelector('[role="dialog"]'))`))) await page.click({ selector: '[aria-label="Xuất file in"]' });
  await page.waitText('Lần xuất gần đây');
  // The panel springs in (anime.js): a click during the animation lands on a moving button and is lost.
  await page.settle(1200);
}

/** Clicks a format of the export dialog, waits for its job and downloads the file. */
async function exportFile(page, api, projectId, format, title) {
  await openExportDialog(page);
  const known = new Set((await api.request(`/projects/${projectId}/exports`)).map((job) => job.id));
  await page.click({ text: title, in: DIALOG });
  const result = await downloadJob(await waitForJob(api, projectId, format, known), format);
  await page.waitText('Tải về', 30000);
  return result;
}

async function downloadJob(job, format) {
  const file = await fetch(job.downloadUrl.startsWith('http') ? job.downloadUrl : baseUrl + job.downloadUrl);
  const bytes = Buffer.from(await file.arrayBuffer()).length;
  if (!file.ok || bytes < 200) throw new Error(`${format} download: HTTP ${file.status}, ${bytes} bytes`);
  return { job, bytes };
}

/** The export job of `format` that is not in `known`, once COMPLETED (throws on FAILED). */
async function waitForJob(api, projectId, format, known) {
  const started = await waitFor(
    async () => (await api.request(`/projects/${projectId}/exports`)).find((job) => !known.has(job.id) && job.fileType === format),
    `the ${format} export to start`,
  );
  return waitFor(async () => {
    const job = await api.request(`/exports/${started.id}`);
    if (job.status === 'FAILED') throw Object.assign(new Error(`${format} export failed: ${job.error}`), { fatal: true });
    return job.status === 'COMPLETED' && job;
  }, `the ${format} export to finish`);
}

// ---------------------------------------------------------------- run

fs.mkdirSync(OUT_DIR, { recursive: true });
const reportFile = path.join(OUT_DIR, 'report.json');
const report = [];
const browser = await Browser.launch();
let failed = false;
try {
  for (const size of sizes) {
    const { all, cleanup, user, prepare } = scenario(size, browser, report);
    console.log(`\n${size.code} (${size.width}×${size.height})`);
    for (const step of Object.keys(all).map(Number).sort((a, b) => a - b)) {
      if (!steps.has(step)) continue;
      const log = { size: size.code, step, ok: true, notes: [], shots: [] };
      const start = Date.now();
      try {
        await prepare(step);
        await all[step](log);
      } catch (error) {
        log.ok = false;
        log.error = error.message;
        // What the page saw last: failed API calls and console errors.
        const seen = browser.lastPage;
        const failedCalls = (seen?.responses ?? []).filter((r) => r.status >= 400).slice(-4).map((r) => `${r.status} ${r.url}`);
        if (failedCalls.length) log.notes.push(`last failed calls: ${failedCalls.join(', ')}`);
        if (seen?.errors.length) log.notes.push(`console: ${seen.errors.slice(-3).join(' | ')}`);
        failed = true;
        const shot = await browser.lastPage?.shot(`${String(step).padStart(2, '0')}-FAILED`).catch(() => null);
        if (shot) log.shots.push(shot);
      }
      if (browser.covered.length) log.notes.push(`waited for: ${browser.covered.splice(0).join('; ')}`);
      log.seconds = Math.round((Date.now() - start) / 100) / 10;
      report.push(log);
      console.log(`${log.ok ? 'ok  ' : 'FAIL'} ${String(step).padStart(2)}  ${log.seconds}s  ${[...log.notes, log.error ?? ''].filter(Boolean).join(' · ')}`);
      if (!log.ok) break;
    }
    await cleanup();
  }
} finally {
  await browser.close();
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
}
console.log(`\nScreenshots and report.json in ${path.relative(process.cwd(), OUT_DIR)}`);
process.exit(failed ? 1 : 0);

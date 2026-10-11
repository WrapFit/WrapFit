#!/usr/bin/env node
/**
 * Full-resolution screenshots of app pages in headless Chrome, at real desktop and phone widths, optionally signed in.
 * The in-app browser pane is narrower than a desktop screen and scales its screenshots down, so check layouts here.
 *
 * Usage (dev server and backend running):
 *   npm --workspace=fe run shots -- /dashboard /templates
 *   npm --workspace=fe run shots -- /dashboard --widths=1280x800,1440x900,1920x1080,375x812 --login=admin@wrapfit.vn
 * Options: --base-url=http://localhost:3000  --shots=2 (screenshots per page, scrolling one viewport each)
 *          --login=<email> signs in first; the password comes from SHOT_PASSWORD
 *
 * Output: .page-shots/<page>-<width>-<n>.png. Prints, per page, where it ended up (a redirect to the login page shows
 * here), the page height and any horizontal overflow or console error; exits 1 when a page scrolls sideways.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { FE_ROOT } from './stitch/lib/paths.mjs';

const args = process.argv.slice(2);
const option = (name, fallback) => args.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=') ?? fallback;
const pages = args.filter((a) => !a.startsWith('--'));
const baseUrl = option('base-url', 'http://localhost:3000').replace(/\/+$/, '');
const shotsPerPage = Number(option('shots', '2'));
const widths = option('widths', '1440x900,1920x1080').split(',').map((size) => size.split('x').map(Number));
const login = option('login');
const outDir = path.join(FE_ROOT, '.page-shots');

if (!pages.length) {
  console.error('Give at least one page path, e.g. /dashboard');
  process.exit(2);
}

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

/** Session cookies of a fresh sign-in (a new one each run: refresh tokens rotate, an old jar would be revoked). */
async function signIn(email) {
  const password = process.env.SHOT_PASSWORD;
  if (!password) throw new Error('--login needs the password in SHOT_PASSWORD');
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: baseUrl },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Sign-in failed: HTTP ${res.status}`);
  return res.headers.getSetCookie().map((header) => {
    const [pair, ...attributes] = header.split(';').map((part) => part.trim());
    const [name, ...value] = pair.split('=');
    const cookiePath = attributes.find((a) => a.toLowerCase().startsWith('path='))?.slice(5) ?? '/';
    return { name, value: value.join('='), url: baseUrl, path: cookiePath, httpOnly: true };
  });
}

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
  const once = (method) =>
    new Promise((resolve) => {
      const listener = (m) => {
        if (m.method === method) {
          listeners.delete(listener);
          resolve(m);
        }
      };
      listeners.add(listener);
    });
  const close = () => {
    ws.close();
    child.kill();
  };
  return { send, once, listeners, close };
}

fs.mkdirSync(outDir, { recursive: true });
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'wrapfit-shots-'));
const chrome = await openChrome(profile);
let overflow = false;
try {
  await chrome.send('Page.enable');
  await chrome.send('Runtime.enable');
  await chrome.send('Network.enable');
  if (login) for (const cookie of await signIn(login)) await chrome.send('Network.setCookie', cookie);

  const errors = [];
  chrome.listeners.add((m) => {
    if (m.method === 'Runtime.exceptionThrown') {
      errors.push(m.params.exceptionDetails.exception?.description?.split('\n')[0] ?? m.params.exceptionDetails.text);
    }
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      errors.push(m.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 160));
    }
  });

  for (const [width, height] of widths) {
    await chrome.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 768 });
    for (const page of pages) {
      errors.length = 0;
      const loaded = chrome.once('Page.loadEventFired');
      await chrome.send('Page.navigate', { url: baseUrl + page });
      await loaded;
      await sleep(4500); // client data (React Query) and the 3D canvas
      const { result } = await chrome.send('Runtime.evaluate', {
        returnByValue: true,
        expression: `({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth,
          height: document.documentElement.scrollHeight, at: location.pathname + location.search })`,
      });
      const info = result.value;
      const name = page.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'home';
      const count = Math.min(shotsPerPage, Math.ceil(info.height / height));
      for (let i = 0; i < count; i++) {
        await chrome.send('Runtime.evaluate', { expression: `window.scrollTo(0, ${i * height})` });
        await sleep(800);
        const { data } = await chrome.send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(outDir, `${name}-${width}-${i}.png`), Buffer.from(data, 'base64'));
      }
      const sideways = info.scroll > info.client;
      overflow ||= sideways;
      const notes = [
        info.at !== page ? `ended at ${info.at}` : '',
        sideways ? `OVERFLOW ${info.scroll - info.client}px` : '',
        errors.length ? `errors: ${[...new Set(errors)].slice(0, 3).join(' | ')}` : '',
      ].filter(Boolean);
      console.log(`${String(width).padStart(4)}  ${page.padEnd(28)} h=${info.height}  ${notes.join('  ')}`);
    }
  }
} finally {
  chrome.close();
  await sleep(500);
  fs.rmSync(profile, { recursive: true, force: true });
}
console.log(`Screenshots in ${path.relative(process.cwd(), outDir) || outDir}`);
process.exit(overflow ? 1 : 0);

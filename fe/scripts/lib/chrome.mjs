/**
 * Headless Chrome/Edge driven over the DevTools Protocol, for the audit scripts (no Playwright needed).
 * page-shots.mjs has its own copy with more page actions.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Starts Chrome with a throwaway profile and attaches to its first tab: { send, listeners, close }. */
export async function openChrome(profile) {
  const chromePath = CHROME_CANDIDATES.find((p) => fs.existsSync(p));
  if (!chromePath) throw new Error('No Chrome/Edge found. Set CHROME_PATH.');
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

/** Evaluates an expression in the page and returns its JSON value; page exceptions are thrown. */
export async function evaluate(chrome, expression) {
  const { result, exceptionDetails } = await chrome.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (exceptionDetails) throw new Error(exceptionDetails.exception?.description?.split('\n')[0] ?? exceptionDetails.text);
  return result.value;
}

/** Navigates and waits for the load event plus `settleMs` for client data. */
export async function goto(chrome, url, settleMs = 2500) {
  const loaded = new Promise((resolve) => {
    const onEvent = (m) => {
      if (m.method === 'Page.loadEventFired') {
        chrome.listeners.delete(onEvent);
        resolve();
      }
    };
    chrome.listeners.add(onEvent);
  });
  await chrome.send('Page.navigate', { url });
  await Promise.race([loaded, sleep(30000)]);
  await sleep(settleMs);
}

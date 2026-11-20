import type { CanvasElement } from "@wrapfit/shared";

/**
 * Files the user uploads in the offline demo (/editor/demo) are `blob:` URLs, which die with the tab. The demo draft
 * keeps them in IndexedDB of this browser, keyed by the blob URL the draft refers to, so a reload brings them back.
 */
const DB_NAME = "wrapfit-studio-demo";
const STORE = "assets";

/** Only uploaded assets need a replacement. Vector shapes store their geometry outside of content. */
export function remapDraftElements(elements: CanvasElement[], assets: ReadonlyMap<string, string | null>): CanvasElement[] {
  return elements.flatMap((element) => {
    if (!element.content.startsWith("blob:")) return [element];
    const url = assets.get(element.content);
    return url ? [{ ...element, content: url }] : [];
  });
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = tx.onabort = () => reject(tx.error);
  });
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Stores the blobs of `urls` not stored yet and drops the ones the design no longer uses. */
export async function syncDemoAssets(urls: string[]): Promise<void> {
  const wanted = new Set(urls.filter((u) => u.startsWith("blob:")));
  const db = await openDb();
  try {
    const keys = (await request(db.transaction(STORE).objectStore(STORE).getAllKeys())) as string[];
    const missing: [string, Blob][] = [];
    for (const url of wanted) {
      if (keys.includes(url)) continue;
      try {
        missing.push([url, await (await fetch(url)).blob()]);
      } catch {
        // The blob is gone already (an old tab's URL): nothing to keep.
      }
    }
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    for (const [url, blob] of missing) store.put(blob, url);
    for (const key of keys) if (!wanted.has(key)) store.delete(key);
    await done(tx);
  } finally {
    db.close();
  }
}

/** New blob URLs for the stored files: stored URL → URL valid in this tab. Files not found are left out. */
export async function restoreDemoAssets(urls: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const wanted = [...new Set(urls.filter((u) => u.startsWith("blob:")))];
  if (!wanted.length) return result;
  const db = await openDb();
  try {
    const store = db.transaction(STORE).objectStore(STORE);
    for (const url of wanted) {
      const blob = (await request(store.get(url))) as Blob | undefined;
      if (blob) result.set(url, URL.createObjectURL(blob));
    }
  } finally {
    db.close();
  }
  return result;
}

export async function clearDemoAssets(): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).clear();
    await done(tx);
  } finally {
    db.close();
  }
}

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { FE_ROOT, LOCK_FILE } from './paths.mjs';

// Git on Windows checks files out with CRLF: compare and hash content with LF line endings.
const normalize = (text) => text.replace(/\r\n/g, '\n');
const hash = (text) => crypto.createHash('sha1').update(normalize(text)).digest('hex');
const keyOf = (file) => path.relative(FE_ROOT, file).replace(/\\/g, '/');

/**
 * Keeps hand edits in generated files. The hash of every file the generator writes is recorded in
 * `stitch/generated.lock.json`; a later run replaces or deletes a file only while it still has that content.
 * A file edited since (or found without a recorded hash) is left as is and reported, unless `force`.
 */
export function createOutputGuard({ force = false } = {}) {
  const previous = fs.existsSync(LOCK_FILE) ? JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8')) : {};
  const next = {};
  const kept = [];

  /** True when the generator may replace the file: missing, or unchanged since the generator wrote it. */
  function replaceable(file, key) {
    if (force || !fs.existsSync(file)) return true;
    return previous[key] === hash(fs.readFileSync(file, 'utf8'));
  }

  function keep(key) {
    kept.push(key);
    if (key in previous) next[key] = previous[key];
  }

  return {
    write(file, content) {
      const key = keyOf(file);
      if (fs.existsSync(file) && normalize(fs.readFileSync(file, 'utf8')) === normalize(content)) {
        next[key] = hash(content);
        return;
      }
      if (!replaceable(file, key)) return keep(key);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, content);
      next[key] = hash(content);
    },

    remove(file) {
      const key = keyOf(file);
      if (!replaceable(file, key)) return keep(key);
      fs.rmSync(file);
    },

    /** Saves the lock file and returns the files kept because they were edited by hand. */
    finish() {
      const sorted = Object.fromEntries(Object.entries(next).sort(([a], [b]) => a.localeCompare(b)));
      fs.writeFileSync(LOCK_FILE, JSON.stringify(sorted, null, 2) + '\n');
      return kept;
    },
  };
}

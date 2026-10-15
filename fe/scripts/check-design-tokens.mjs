#!/usr/bin/env node
// Lists hard-coded design values in className strings (raw hex colours, arbitrary radii, arbitrary font sizes, text
// below the 11 px floor) so they are replaced by tokens (docs/15_DESIGN_SYSTEM.md §2).
//
// Allowed on purpose, reported apart and never counted against --max:
//   - a file whose first lines hold a `ds-artwork: <reason>` comment (illustrations, logo, sticker art);
//   - a line with a `ds-allow: <reason>` comment on it or on the line above.
// Generated Stitch views, the Stitch runtime and the redirected /editor screens are skipped.
//
// `--max N` exits 1 when the values not allowed grow past N (`npm run lint` runs it with 0).
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../src/", import.meta.url));
const SKIP = /^(views\/editor\/(index|step-\d)|features\/stitch\/|assets\/styles\/tokens\.ts$|views\/design-system\/)/;
const RULES = [
  { id: "hex", re: /\b(?:bg|text|border(?:-[trblxy])?|ring|from|to|via|fill|stroke|outline|divide|accent|shadow|decoration|caret|placeholder)-\[#[0-9a-fA-F]{3,8}\]/g },
  { id: "radius", re: /\brounded(?:-[trbl]{1,2})?-\[[0-9.]+(?:px|rem)\]/g },
  { id: "font-size", re: /\btext-\[[0-9.]+px\]/g },
  { id: "below-floor", re: /\btext-\[(?:[0-9]|10)(?:\.\d+)?px\]/g },
];

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)]));

const zero = () => Object.fromEntries(RULES.map((rule) => [rule.id, 0]));
const totals = { open: zero(), allowed: zero() };
const perFile = [];
for (const file of walk(ROOT).filter((f) => /\.(tsx?|jsx?)$/.test(f))) {
  const rel = relative(ROOT, file).replace(/\\/g, "/");
  const text = readFileSync(file, "utf8");
  if (SKIP.test(rel) || text.startsWith("/* AUTO-GENERATED")) continue;
  const artwork = /ds-artwork:/.test(text.slice(0, 800));
  const lines = text.split(/\r?\n/);
  const counts = zero();
  lines.forEach((line, i) => {
    const allowed = artwork || /ds-allow:/.test(line) || (i > 0 && /ds-allow:/.test(lines[i - 1]));
    for (const rule of RULES) {
      const n = (line.match(rule.re) ?? []).length;
      if (!n) continue;
      totals[allowed ? "allowed" : "open"][rule.id] += n;
      if (!allowed) counts[rule.id] += n;
    }
  });
  const sum = counts.hex + counts.radius + counts["font-size"];
  if (sum) perFile.push({ rel, sum, counts });
}

perFile.sort((a, b) => b.sum - a.sum);
for (const { rel, counts } of perFile.slice(0, 40)) {
  const parts = Object.entries(counts).filter(([, v]) => v).map(([k, v]) => `${k}:${v}`);
  console.log(`${rel.padEnd(70)} ${parts.join("  ")}`);
}
const line = (t) => RULES.map((rule) => `${rule.id} ${t[rule.id]}`).join(" · ");
const open = totals.open.hex + totals.open.radius + totals.open["font-size"];
console.log(`\nNot allowed: ${line(totals.open)} (files: ${perFile.length})`);
console.log(`Allowed (ds-artwork / ds-allow): ${line(totals.allowed)}`);

const maxIndex = process.argv.indexOf("--max");
if (maxIndex > 0) {
  const max = Number(process.argv[maxIndex + 1]);
  if (open > max) {
    console.error(`Hard-coded design values: ${open} > ${max}. Use tokens, or mark artwork with ds-artwork / ds-allow and a reason (docs/15_DESIGN_SYSTEM.md §2).`);
    process.exit(1);
  }
}

#!/usr/bin/env node
// Writes fe/design-tokens.json from src/assets/styles/tokens.ts in the W3C Design Tokens format (DTCG), so design
// tools use the same names as the code: Tokens Studio imports it as is, and its "light"/"dark" sets map to Figma
// variable modes. Semantic colours are aliases of the palette ({color.palette.neutral.800}) where a step matches.
// Run: npm run tokens:export (needs Node ≥ 22.18 to load the .ts file). `--check` fails when the file is stale.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const tokens = await import(new URL("../src/assets/styles/tokens.ts", import.meta.url).href);
const { PALETTE, SEMANTIC_COLORS, TYPE_SCALE, SPACING, RADII, BREAKPOINTS, ICON_STROKE, TOKENS_VERSION } = tokens;

const alias = (hex) => {
  for (const [ramp, steps] of Object.entries(PALETTE)) {
    for (const [step, value] of Object.entries(steps)) if (value.toUpperCase() === hex.toUpperCase()) return `{color.palette.${ramp}.${step}}`;
  }
  return hex;
};

const color = (value, description) => ({ $type: "color", $value: value, ...(description ? { $description: description } : {}) });
const semantic = (mode) =>
  Object.fromEntries(SEMANTIC_COLORS.map((t) => [t.name, color(alias(mode === "dark" ? t.dark : t.value), t.use + (t.avoid ? ` Không dùng: ${t.avoid}` : ""))]));

const out = {
  $description: `WrapFit design tokens ${TOKENS_VERSION}. Generated from fe/src/assets/styles/tokens.ts; do not edit by hand.`,
  color: {
    palette: Object.fromEntries(Object.entries(PALETTE).map(([ramp, steps]) => [ramp, Object.fromEntries(Object.entries(steps).map(([s, v]) => [s, color(v)]))])),
    light: semantic("light"),
    dark: semantic("dark"),
  },
  typography: Object.fromEntries(
    TYPE_SCALE.map((s) => [
      s.name,
      {
        $type: "typography",
        $value: {
          fontFamily: s.name.startsWith("cad") ? "JetBrains Mono" : /^(display|heading|title)/.test(s.name) ? "Be Vietnam Pro" : "Inter",
          fontSize: s.size,
          lineHeight: s.lineHeight,
          ...(s.weight ? { fontWeight: Number(s.weight) } : {}),
          ...(s.letterSpacing ? { letterSpacing: s.letterSpacing } : {}),
        },
        $description: s.use,
      },
    ]),
  ),
  spacing: Object.fromEntries(Object.entries(SPACING).map(([k, t]) => [k, { $type: "dimension", $value: t.value, $description: t.use }])),
  radius: Object.fromEntries(Object.entries(RADII).map(([k, t]) => [k, { $type: "dimension", $value: t.value, $description: t.use }])),
  breakpoint: Object.fromEntries(Object.entries(BREAKPOINTS).map(([k, v]) => [k, { $type: "dimension", $value: `${v}px` }])),
  iconStroke: Object.fromEntries(Object.entries(ICON_STROKE).map(([k, t]) => [k, { $type: "number", $value: t.value, $description: t.use }])),
};

const target = fileURLToPath(new URL("../design-tokens.json", import.meta.url));
const json = JSON.stringify(out, null, 2) + "\n";
if (process.argv.includes("--check")) {
  let current = "";
  try {
    current = readFileSync(target, "utf8");
  } catch {}
  if (current.replace(/\r\n/g, "\n") !== json) {
    console.error("design-tokens.json is out of date: run npm run tokens:export.");
    process.exit(1);
  }
  console.log("design-tokens.json is up to date.");
} else {
  writeFileSync(target, json);
  console.log(`Wrote ${target} (${SEMANTIC_COLORS.length} semantic colours × 2 themes, ${TYPE_SCALE.length} text styles).`);
}

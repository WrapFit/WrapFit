#!/usr/bin/env node
/**
 * Stitch → Next.js generator.
 *
 * Reads the exported screens in `stitch/source/` (listed in `stitch/screens.json`) and
 * writes, for every screen with status "converted":
 *   src/views/<route>/index.tsx                 Server Component with the screen markup
 *   src/app/<route>/page.tsx                    route metadata + the view above
 *   src/assets/styles/stitch/screens/<slug>.css scoped <style> blocks + token variables
 *   src/features/stitch/behaviors/<slug>.ts     the screen's scripts and inline handlers
 * plus the shared indexes (styles, behavior registry, theme tokens, route list).
 *
 * A screen with status "wired" has a hand-written view connected to the API: it keeps its
 * CSS, tokens and behavior module, but its view and page are never written.
 *
 * Generated files edited by hand since the last run are kept and listed (see lib/guard.mjs).
 *
 * Usage: npm run stitch:sync [-- --refresh-fonts] [--force (overwrite hand edits too)]
 */
import fs from 'node:fs';
import path from 'node:path';
import { vendorRemoteImages } from './lib/assets.mjs';
import { buildBehaviorModule } from './lib/behavior.mjs';
import { buildScreenCss } from './lib/css.mjs';
import { vendorFonts } from './lib/fonts.mjs';
import { createOutputGuard } from './lib/guard.mjs';
import { bodyToJsx, rootProps } from './lib/jsx.mjs';
import { buildPageModule, buildViewModule } from './lib/page.mjs';
import {
  BEHAVIOR_DIR,
  FEATURE_DIR,
  FE_ROOT,
  SCREEN_STYLES_DIR,
  STYLES_DIR,
  generatedBanner,
  pageFileFor,
  viewFileFor,
} from './lib/paths.mjs';
import { loadScreen, readManifest, readOverrides } from './lib/source.mjs';
import { buildTokenTheme } from './lib/tokens.mjs';

const args = new Set(process.argv.slice(2));

/** Statuses the generator reads the Stitch source of (see the header comment). */
const GENERATED_STATUSES = new Set(['converted', 'wired']);

const guard = createOutputGuard({ force: args.has('--force') });
const written = new Set();

function write(file, content) {
  written.add(path.resolve(file));
  guard.write(file, content);
}

/** Removes the generated files of screens that are no longer generated. */
function removeStale(dir) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    const file = path.join(dir, name);
    if (written.has(path.resolve(file)) || !fs.statSync(file).isFile()) continue;
    if (fs.readFileSync(file, 'utf8').includes('AUTO-GENERATED')) guard.remove(file);
  }
}

async function main() {
  const manifest = readManifest();
  const overrides = readOverrides();
  const rewriteHtml = await vendorRemoteImages();
  await vendorFonts({ refresh: args.has('--refresh-fonts') });

  const screens = manifest.screens
    .filter((s) => GENERATED_STATUSES.has(s.status))
    .map((s) => loadScreen(s, { textFixes: overrides.textFixes, sourcePatches: overrides.sourcePatches, rewriteHtml }));

  const { theme, cssVariablesFor, colorsFor } = buildTokenTheme(screens);
  write(path.join(FEATURE_DIR, 'theme.generated.json'), JSON.stringify(theme, null, 2) + '\n');

  const behaviorScreens = [];
  for (const screen of screens) {
    const banner = generatedBanner(screen.file);
    const warnings = [];
    const warn = (message) => warnings.push(message);

    const handlers = [];
    const registerHandler = (event, code) => {
      const id = String(handlers.length);
      handlers.push({ id, event, code });
      return id;
    };
    const { jsx, usesLink } = bodyToJsx(screen.$, { links: overrides.links, registerHandler, warn });

    const hasBehavior = screen.inlineScripts.length > 0 || handlers.length > 0;
    if (hasBehavior) {
      write(path.join(BEHAVIOR_DIR, `${screen.slug}.ts`), buildBehaviorModule(screen, handlers, { banner }));
      behaviorScreens.push(screen.slug);
    }

    write(
      path.join(SCREEN_STYLES_DIR, `${screen.slug}.css`),
      buildScreenCss(screen, { cssVariables: cssVariablesFor(screen), colors: colorsFor(screen.slug), banner, warn }),
    );

    if (screen.status === 'converted') {
      write(
        viewFileFor(screen.route),
        buildViewModule(screen, { jsx, rootProps: rootProps(screen.bodyAttributes, screen.slug), usesLink, hasBehavior, banner }),
      );
      write(pageFileFor(screen.route), buildPageModule(screen, { banner }));
    }

    const summary = `${screen.slug.padEnd(28)} handlers=${String(handlers.length).padStart(2)} scripts=${screen.inlineScripts.length}${screen.status === 'wired' ? '  wired: view kept' : ''}`;
    console.log(warnings.length ? `${summary}  ⚠ ${warnings.join('; ')}` : summary);
  }

  const banner = generatedBanner('stitch/screens.json');
  write(
    path.join(STYLES_DIR, 'index.css'),
    [`/* ${banner} */`, "@import './fonts.css';", "@import './base.css';", ...screens.map((s) => `@import './screens/${s.slug}.css';`), ''].join('\n'),
  );

  write(
    path.join(BEHAVIOR_DIR, 'registry.generated.ts'),
    [
      `/* ${banner} */`,
      "import type { StitchBehavior } from '../runtime/types';",
      '',
      '/** Lazy imports, so each screen downloads only its own scripts. */',
      'export const stitchBehaviors = {',
      ...behaviorScreens.map((slug) => `  '${slug}': () => import('./${slug}'),`),
      '} satisfies Record<string, () => Promise<{ default: StitchBehavior }>>;',
      '',
      'export type StitchBehaviorScreen = keyof typeof stitchBehaviors;',
      '',
    ].join('\n'),
  );

  write(
    path.join(FEATURE_DIR, 'routes.generated.ts'),
    [
      `/* ${banner} */`,
      '',
      '/** Routes rendered from Stitch screens. They bring their own navigation chrome. */',
      'export const STITCH_ROUTES: readonly string[] = [',
      ...manifest.screens.filter((s) => s.status !== 'manual' && s.route.startsWith('/')).map((s) => `  '${s.route}',`),
      '];',
      '',
    ].join('\n'),
  );

  removeStale(SCREEN_STYLES_DIR);
  removeStale(BEHAVIOR_DIR);

  console.log(`\n${screens.length} screens generated into ${path.relative(FE_ROOT, path.join(FE_ROOT, 'src'))}/`);
  const kept = guard.finish();
  if (kept.length) {
    console.warn(`\n⚠ ${kept.length} generated files edited by hand were kept (--force overwrites them):`);
    for (const file of kept) console.warn(`  ${file}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

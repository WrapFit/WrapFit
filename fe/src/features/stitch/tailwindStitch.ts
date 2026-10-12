import forms from '@tailwindcss/forms';
import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';
import stitchTheme from './theme.generated.json';

/**
 * Tailwind side of the Stitch token layer (see scripts/stitch/lib/tokens.mjs).
 *
 * Every token a Stitch screen defines resolves to a CSS variable. `:root` gets the app's
 * own value (or Tailwind's default), and each `[data-stitch]` root overrides it with the
 * screen's value from its generated stylesheet. Pages outside Stitch keep their colours.
 */

type ThemeExtend = NonNullable<NonNullable<Config['theme']>['extend']>;
type CssValue = string | number;
type FontSizeValue = string | [string, string | { lineHeight?: CssValue; letterSpacing?: CssValue; fontWeight?: CssValue }];

interface Token {
  var: string;
  fallback: string | null;
}

const theme = stitchTheme as {
  colors: Record<string, Token & { channels: boolean }>;
  fontFamily: Record<string, Token>;
  borderRadius: Record<string, Token>;
  spacing: Record<string, Token>;
  boxShadow: Record<string, Token>;
  fontSize: Record<string, Record<'size' | 'lineHeight' | 'letterSpacing' | 'fontWeight', Token>>;
  formsScreens: string[];
};

function flattenColors(colors: unknown, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries((colors ?? {}) as Record<string, unknown>)) {
    const name = key === 'DEFAULT' ? prefix.replace(/-$/, '') : `${prefix}${key}`;
    if (value && typeof value === 'object') Object.assign(out, flattenColors(value, `${name}-`));
    else out[name] = String(value);
  }
  return out;
}

function toChannels(value: string): string | null {
  const hex = value.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!hex) return null;
  const full = hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join('') : hex[1];
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)).join(' ');
}

const fontFamilyValue = (value: unknown) => (Array.isArray(value) ? value.join(', ') : String(value));

function fontSizeParts(value: FontSizeValue): Partial<Record<'size' | 'lineHeight' | 'letterSpacing' | 'fontWeight', string>> {
  if (typeof value === 'string') return { size: value };
  const [size, extra] = value;
  if (typeof extra === 'string') return { size, lineHeight: extra };
  return Object.fromEntries(Object.entries({ size, ...extra }).map(([k, v]) => [k, String(v)]));
}

/** Merges the app's theme with the Stitch tokens and returns the extension plus the `:root` defaults. */
function mergeTheme(base: ThemeExtend) {
  const rootVariables: Record<string, string> = {};
  const setRoot = (name: string, value: string | null | undefined) => {
    rootVariables[name] = value ?? 'initial';
  };

  const baseColors = flattenColors(base.colors);
  const colors: Record<string, string> = { ...baseColors };
  for (const [key, token] of Object.entries(theme.colors)) {
    colors[key] = token.channels ? `rgb(var(${token.var}) / <alpha-value>)` : `var(${token.var})`;
    const own = baseColors[key];
    setRoot(token.var, own !== undefined ? (token.channels ? toChannels(own) : own) ?? token.fallback : token.fallback);
  }

  const simple = (section: 'fontFamily' | 'borderRadius' | 'spacing' | 'boxShadow') => {
    const own = (base[section] ?? {}) as Record<string, unknown>;
    const merged: Record<string, unknown> = { ...own };
    for (const [key, token] of Object.entries(theme[section])) {
      merged[key] = `var(${token.var})`;
      const value = own[key];
      setRoot(token.var, value !== undefined ? (section === 'fontFamily' ? fontFamilyValue(value) : String(value)) : token.fallback);
    }
    return merged;
  };

  const ownSizes = (base.fontSize ?? {}) as Record<string, FontSizeValue>;
  const fontSize: Record<string, unknown> = { ...ownSizes };
  for (const [key, parts] of Object.entries(theme.fontSize)) {
    fontSize[key] = [
      `var(${parts.size.var})`,
      { lineHeight: `var(${parts.lineHeight.var})`, letterSpacing: `var(${parts.letterSpacing.var})`, fontWeight: `var(${parts.fontWeight.var})` },
    ];
    const own = ownSizes[key] ? fontSizeParts(ownSizes[key]) : undefined;
    for (const [part, token] of Object.entries(parts)) {
      setRoot(token.var, own ? own[part as keyof typeof own] : token.fallback);
    }
  }

  return {
    extend: {
      ...base,
      colors,
      fontFamily: simple('fontFamily'),
      borderRadius: simple('borderRadius'),
      spacing: simple('spacing'),
      boxShadow: simple('boxShadow'),
      fontSize,
    } as ThemeExtend,
    rootVariables,
  };
}

type CssInJs = { [selector: string]: CssInJs | string | number };

/** Prefixes every selector of a CSS-in-JS rule set with `scope`, recursing into at-rules. */
function scopeRules(rules: CssInJs | CssInJs[], scope: string): CssInJs[] {
  const list = Array.isArray(rules) ? rules : [rules];
  return list.map((ruleSet) =>
    Object.fromEntries(
      Object.entries(ruleSet).map(([selector, body]) => {
        if (selector.startsWith('@')) return [selector, scopeRules(body as CssInJs, scope)[0]];
        const scoped = selector
          .split(',')
          .map((part) => `${scope} ${part.trim()}`)
          .join(', ');
        return [scoped, body];
      }),
    ),
  );
}

/** `@tailwindcss/forms` base styles, applied only inside the Stitch screens that loaded the plugin. */
const scopedForms = plugin((api) => {
  if (!theme.formsScreens.length) return;
  const scope = `:where(${theme.formsScreens.map((slug) => `[data-stitch="${slug}"]`).join(', ')})`;
  const formsPlugin = forms({ strategy: 'base' }) as unknown as { handler: (api: unknown) => void };
  formsPlugin.handler({
    ...api,
    addBase: (rules: CssInJs | CssInJs[]) => api.addBase(scopeRules(rules, scope) as Parameters<typeof api.addBase>[0]),
    addComponents: () => {},
  });
});

/**
 * Put on an app component rendered inside a Stitch screen (`wired` views): it gets the app's token values back
 * instead of the screen's, where a token the screen never defined is `initial` (no colour, no font).
 */
export const APP_TOKENS_ATTRIBUTE = 'data-app-tokens';

export function withStitchTheme(base: ThemeExtend) {
  const { extend, rootVariables } = mergeTheme(base);
  const rootDefaults = plugin(({ addBase }) => addBase({ [`:root, [${APP_TOKENS_ATTRIBUTE}]`]: rootVariables }));
  return { extend, plugins: [rootDefaults, scopedForms] };
}

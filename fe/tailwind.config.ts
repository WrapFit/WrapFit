import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";
import { withStitchTheme } from "./src/features/stitch/tailwindStitch";
import { paletteTheme, radiusTheme, semanticColorTheme, semanticColorVariables, spacingTheme, typeScaleTheme } from "./src/assets/styles/tokens";

type ThemeExtend = NonNullable<NonNullable<Config["theme"]>["extend"]>;

/**
 * WrapFit's own tokens. Semantic tokens (fg, canvas, action, success…), the type scale, spacing and radii come from
 * src/assets/styles/tokens.ts; the primitive ramps stay here. Stitch screens override the shared names per screen
 * (see withStitchTheme).
 */
const appTheme: ThemeExtend = {
  colors: {
    // Semantic tier (tokens.ts): use these in components.
    ...semanticColorTheme(),
    // Primitive ramps (tokens.ts PALETTE): wf-neutral-100… for illustrations and the catalogue.
    ...paletteTheme(),

    // Stitch Surface & Container Tokens
    surface: "#faf8f5",
    "on-surface": "#1b1c18",
    "on-surface-variant": "#525a54",
    "surface-container": "#f2ece5",
    "surface-container-low": "#f8f3ec",
    "surface-container-lowest": "#ffffff",
    "surface-container-high": "#ede6de",
    "surface-container-highest": "#e7dfd6",
    background: "#faf8f5",
    "on-background": "#1b1c18",
    outline: "#79747e",
    "outline-variant": "#c4c7c5",

    // Stitch Primary Tokens
    primary: "#122e20",
    "on-primary": "#ffffff",
    "primary-container": "#122e20",
    "on-primary-container": "#ffffff",

    // Stitch Secondary Tokens
    secondary: "#1a362b",
    "on-secondary": "#ffffff",
    "secondary-container": "#d1e7dd",
    "on-secondary-container": "#0f291e",

    // Stitch Tertiary Tokens
    tertiary: "#d4af37",
    "on-tertiary": "#ffffff",
    "tertiary-container": "#faecc1",
    "on-tertiary-container": "#3d3005",

    stitch: {
      bg: "#fff8f5",
      primary: "#004ac6",
      blue: "#2563eb",
      forest: "#486458",
      gold: "#cca72f",
    },
    paper: {
      ivory: "#FDFBF7",
      cotton: "#FAF6EE",
      linen: "#F4EFE6",
      kraft: "#E8D8C8",
      "kraft-raw": "#D4A373",
      cardboard: "#C8A882",
    },
    brand: {
      forest: "#1A362B",
      /** Logo and avatar green of the older app chrome. */
      "forest-deep": "#122E20",
      "forest-dark": "#10241C",
      "forest-light": "#2D5A27",
      sage: "#52796F",
      gold: "#D4AF37",
      "gold-light": "#F5E7B2",
      terracotta: "#BC6C25",
      espresso: "#2B1E16",
    },
    // FPT University Brand Frames (EXE101 Project Colors)
    fpt: {
      blue: "#005CA9",
      "blue-dark": "#004785",
      "blue-light": "#E8F2FA",
      orange: "#F26522",
      "orange-dark": "#D85314",
      "orange-light": "#FEF1EA",
      green: "#6DB33F",
      /** Orange for text and thin icons on light backgrounds (5.6:1); the brand orange itself is 3.2:1. */
      "orange-ink": "#B93F0A",
      "green-dark": "#559130",
      "green-light": "#EFF8EA",
    },
    vibrant: {
      cobalt: "#2563EB",
      "cobalt-dark": "#1D4ED8",
      "cobalt-light": "#3B82F6",
      coral: "#FF6B6B",
      "coral-dark": "#EE5253",
      "coral-light": "#FF8787",
      emerald: "#10B981",
      amber: "#F59E0B",
    },
    // Warm greys of the checkout, account and studio canvases.
    mist: {
      50: "#FAFBFC",
      100: "#F5F6F4",
      150: "#F4F6F2",
      200: "#EBEDEF",
    },
    dieline: {
      cut: "#E53E3E",
      crease: "#3182CE",
      bleed: "#38A169",
      safe: "#ECC94B",
    },
    ink: {
      primary: "#1F2421",
      secondary: "#4A5568",
      muted: "#718096",
      subtle: "#A0AEC0",
    },
    // Home page (views/home): slate ink, lime call-to-action and deep green, after the pack.ly home page.
    landing: {
      ink: "#1D293D",
      muted: "#53647D",
      canvas: "#F1F5F9",
      tile: "#E9EFF5",
      accent: "#D6DFE9",
      line: "#CAD5E2",
      lime: "#98E665",
      "lime-soft": "#C7F1AB",
      "lime-mist": "#EAFAE0",
      green: "#458C17",
      "green-deep": "#2D5C0F",
      "green-night": "#152B07",
      indigo: "#432DD7",
      star: "#FFD230",
    },
    // Template library and shared design page (views/templates, views/public-project): the layout of pacdora.com,
    // with the green accents of the pack.ly palette (landing-*) in place of Pacdora's violet.
    library: {
      ink: "#191919",
      text: "#333333",
      sub: "#4C4C4C",
      muted: "#6B6B6B",
      tile: "#F2F2F2",
      panel: "#F7F7F7",
      line: "#E6E6E6",
      canvas: "#D9D9D9",
      /** Green for text and icons on white and on accent-mist (7.3:1); was #458C17 (3.8:1 on mist). */
      accent: "#2D5C0F",
      "accent-mist": "#EAFAE0",
      lime: "#98E665",
      "lime-ink": "#152B07",
    },
  },
  fontFamily: {
    // One type system on every page: Be Vietnam Pro for headings, Inter for the rest (print fonts live in assets/fonts/print).
    serif: ["var(--font-landing-heading)", "Be Vietnam Pro", "sans-serif"],
    sans: ["var(--font-landing-body)", "Inter", "sans-serif"],
    // Numbers (mm, sizes, codes) use the body font with even-width digits, like the dimension panel of the studio.
    mono: ["var(--font-landing-body)", "Inter", "var(--font-jakarta)", "system-ui", "sans-serif"],
    "headline-lg": ["var(--font-landing-heading)", "Be Vietnam Pro", "sans-serif"],
    "headline-md": ["var(--font-landing-heading)", "Be Vietnam Pro", "sans-serif"],
    "headline-sm": ["var(--font-landing-heading)", "Be Vietnam Pro", "sans-serif"],
    "display-hero": ["var(--font-landing-heading)", "Be Vietnam Pro", "sans-serif"],
    "body-lg": ["var(--font-landing-body)", "Inter", "sans-serif"],
    "body-md": ["var(--font-landing-body)", "Inter", "sans-serif"],
    "body-sm": ["var(--font-landing-body)", "Inter", "sans-serif"],
    "label-ui": ["var(--font-landing-body)", "Inter", "sans-serif"],
    "cad-dimension": ["var(--font-landing-body)", "Inter", "sans-serif"],
    "cad-spec-micro": ["var(--font-landing-body)", "Inter", "sans-serif"],
    // Marketing, library and workspace pages (assets/fonts/landing.ts, put on the page root by SitePage and the shells).
    "landing-heading": ["var(--font-landing-heading)", "Be Vietnam Pro", "sans-serif"],
    "landing-body": ["var(--font-landing-body)", "Inter", "sans-serif"],
  },
  // Type scale and semantic text styles (tokens.ts): text-display-xl … text-caption, text-cad-*.
  fontSize: typeScaleTheme(),
  // Purposeful spacing on top of Tailwind's 4 px scale (tokens.ts): h-control, p-card, py-section, gap-stack…
  spacing: spacingTheme(),
  borderRadius: {
    // Role radii (tokens.ts): rounded-control, rounded-panel, rounded-sheet, rounded-card, rounded-card-lg.
    ...radiusTheme(),
    squircle: "16px",
    "squircle-md": "20px",
    "squircle-lg": "28px",
    "squircle-xl": "36px",
    "stitch-30": "30px",
    "stitch-32": "32px",
  },
  boxShadow: {
    tactile: "0 4px 20px -2px rgba(31, 36, 33, 0.08), 0 2px 6px -1px rgba(31, 36, 33, 0.04)",
    "tactile-lg": "0 12px 36px -4px rgba(31, 36, 33, 0.12), 0 4px 14px -2px rgba(31, 36, 33, 0.05)",
    "tactile-inner": "inset 0 2px 4px 0 rgba(0, 0, 0, 0.04)",
    "gold-glow": "0 0 24px rgba(212, 175, 55, 0.25)",
    "cobalt-glow": "0 8px 24px rgba(37, 99, 235, 0.28)",
    "coral-glow": "0 8px 24px rgba(255, 107, 107, 0.28)",
    // Tailwind v4 names some pages were written with: keep them working in v3.
    "2xs": "0 1px 0 0 rgba(29, 41, 61, 0.05)",
    xs: "0 1px 2px 0 rgba(29, 41, 61, 0.06)",
    "soft-4": "0 0 4px 0 rgba(29, 41, 61, 0.1)",
    "soft-8": "0 0 8px 0 rgba(29, 41, 61, 0.08)",
    "soft-16": "0 0 16px 0 rgba(29, 41, 61, 0.08)",
    hard: "4px 4px 0 0 #191919",
    "hard-sm": "3px 3px 0 0 #191919",
    panel: "0 0 10px 0 rgba(0, 0, 0, 0.1)",
    /** Popovers, menus, tooltips. */
    popover: "0 12px 32px -8px rgba(29, 41, 61, 0.18), 0 2px 6px rgba(29, 41, 61, 0.06)",
  },
  keyframes: {
    aurora: {
      "0%": { backgroundPosition: "0% 50%" },
      "100%": { backgroundPosition: "100% 50%" },
    },
    "slow-move": {
      "0%": { backgroundPosition: "50% 0%" },
      "100%": { backgroundPosition: "0% 50%" },
    },
    marquee: {
      "0%": { transform: "translateX(0)" },
      "100%": { transform: "translateX(-50%)" },
    },
    "fade-in": {
      "0%": { opacity: "0" },
      "100%": { opacity: "1" },
    },
    "pop-in": {
      "0%": { opacity: "0", transform: "scale(0.96)" },
      "100%": { opacity: "1", transform: "scale(1)" },
    },
  },
  animation: {
    aurora: "aurora 5s ease-in-out infinite alternate",
    "slow-move": "slow-move 16s ease infinite alternate",
    marquee: "marquee 40s linear infinite",
    "fade-in": "fade-in 200ms ease-out both",
    /** Old name used by StudioDialog. */
    fadeIn: "fade-in 200ms ease-out both",
    "pop-in": "pop-in 160ms ease-out both",
  },
};

const stitch = withStitchTheme(appTheme);

/**
 * CSS variables of the semantic colours: light on :root and app islands inside Stitch screens, dark under
 * data-theme="dark" (set on <html> before the first paint, or on any element to preview one area). A
 * data-theme="light" element keeps its subtree light inside a dark page (studio canvas, print previews).
 */
const semanticVariables = plugin(({ addBase }) =>
  addBase({
    ':root, [data-app-tokens], [data-theme="light"]': { ...semanticColorVariables("light"), colorScheme: "light" },
    '[data-theme="dark"], [data-theme="dark"] [data-app-tokens]': { ...semanticColorVariables("dark"), colorScheme: "dark" },
  }),
);

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  // Stitch screens use `dark:` variants under the class strategy; keep them off unless `.dark` is set.
  darkMode: "class",
  theme: {
    extend: stitch.extend,
  },
  plugins: [...stitch.plugins, semanticVariables],
};

export default config;

import type { Config } from "tailwindcss";
import { withStitchTheme } from "./src/features/stitch/tailwindStitch";

type ThemeExtend = NonNullable<NonNullable<Config["theme"]>["extend"]>;

/** WrapFit's own tokens. Stitch screens override the shared names per screen (see withStitchTheme). */
const appTheme: ThemeExtend = {
  colors: {
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
      "forest-dark": "#10241C",
      "forest-light": "#2D5A27",
      sage: "#52796F",
      gold: "#D4AF37",
      "gold-light": "#F5E7B2",
      terracotta: "#BC6C25",
      espresso: "#2B1E16",
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
      muted: "#7F7F7F",
      tile: "#F2F2F2",
      panel: "#F7F7F7",
      line: "#E6E6E6",
      canvas: "#D9D9D9",
      accent: "#458C17",
      "accent-mist": "#EAFAE0",
      lime: "#98E665",
      "lime-ink": "#152B07",
    },
  },
  fontFamily: {
    serif: ["var(--font-playfair)", "Playfair Display", "Cormorant Garamond", "serif"],
    sans: ["var(--font-jakarta)", "Plus Jakarta Sans", "DM Sans", "-apple-system", "sans-serif"],
    mono: ["var(--font-jetbrains)", "JetBrains Mono", "Menlo", "monospace"],
    "headline-lg": ["var(--font-playfair)", "Playfair Display", "serif"],
    "headline-md": ["var(--font-playfair)", "Playfair Display", "serif"],
    "headline-sm": ["var(--font-jakarta)", "Plus Jakarta Sans", "sans-serif"],
    "display-hero": ["var(--font-playfair)", "Playfair Display", "serif"],
    "body-lg": ["var(--font-jakarta)", "Plus Jakarta Sans", "sans-serif"],
    "body-md": ["var(--font-jakarta)", "Plus Jakarta Sans", "sans-serif"],
    "body-sm": ["var(--font-jakarta)", "Plus Jakarta Sans", "sans-serif"],
    "label-ui": ["var(--font-jakarta)", "Plus Jakarta Sans", "sans-serif"],
    "cad-dimension": ["var(--font-jetbrains)", "JetBrains Mono", "monospace"],
    "cad-spec-micro": ["var(--font-jetbrains)", "JetBrains Mono", "monospace"],
    // Loaded by the home page only (views/home/fonts.ts).
    "landing-heading": ["var(--font-landing-heading)", "Be Vietnam Pro", "sans-serif"],
    "landing-body": ["var(--font-landing-body)", "Inter", "sans-serif"],
  },
  fontSize: {
    "display-hero": ["48px", { lineHeight: "56px", letterSpacing: "-0.02em", fontWeight: "600" }],
    "headline-lg": ["36px", { lineHeight: "44px", letterSpacing: "-0.015em", fontWeight: "500" }],
    "headline-md": ["24px", { lineHeight: "32px", fontWeight: "500" }],
    "headline-sm": ["18px", { lineHeight: "26px", fontWeight: "600" }],
    "body-lg": ["16px", { lineHeight: "26px", fontWeight: "400" }],
    "body-md": ["14px", { lineHeight: "22px", fontWeight: "400" }],
    "body-sm": ["12px", { lineHeight: "18px", fontWeight: "400" }],
    "label-ui": ["13px", { lineHeight: "16px", letterSpacing: "0.01em", fontWeight: "600" }],
    "cad-dimension": ["12px", { lineHeight: "16px", letterSpacing: "0.02em", fontWeight: "500" }],
    "cad-spec-micro": ["10px", { lineHeight: "14px", letterSpacing: "0.04em", fontWeight: "400" }],
  },
  spacing: {
    "space-xs": "0.25rem",
    "space-sm": "0.5rem",
    "space-md": "1rem",
    "space-lg": "1.5rem",
    "space-xl": "2.5rem",
    "gutter-sm": "1rem",
    gutter: "1.5rem",
    "gutter-lg": "2rem",
    margin: "2rem",
    "margin-mobile": "1rem",
  },
  borderRadius: {
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
    "soft-8": "0 0 8px 0 rgba(29, 41, 61, 0.08)",
    "soft-16": "0 0 16px 0 rgba(29, 41, 61, 0.08)",
    hard: "4px 4px 0 0 #191919",
    "hard-sm": "3px 3px 0 0 #191919",
    panel: "0 0 10px 0 rgba(0, 0, 0, 0.1)",
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
  },
  animation: {
    aurora: "aurora 5s ease-in-out infinite alternate",
    "slow-move": "slow-move 16s ease infinite alternate",
    marquee: "marquee 40s linear infinite",
  },
};

const stitch = withStitchTheme(appTheme);

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  // Stitch screens use `dark:` variants under the class strategy; keep them off unless `.dark` is set.
  darkMode: "class",
  theme: {
    extend: stitch.extend,
  },
  plugins: stitch.plugins,
};

export default config;

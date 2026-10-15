/**
 * WrapFit design tokens: the one source for Tailwind (tailwind.config.ts), the CSS variables (globals.css) and the
 * /design-system page. The look follows pack.ly (slate ink, lime call to action, white cards with 2–3 rem corners) for
 * the marketing pages and pacdora.com (grey tiles, black hairlines) for the workspace and the template library.
 *
 * Three tiers:
 *   1. primitives  — raw ramps (`landing-*`, `library-*`, `paper-*`, `fpt-*` in tailwind.config.ts);
 *   2. semantic    — what a colour is for (`fg`, `canvas`, `action`, `success`…), below;
 *   3. component   — decisions of one component (`components/ui/*.tsx`, e.g. BUTTON_VARIANTS).
 *
 * Rules: a component uses semantic tokens; a page uses components. A raw hex, `rounded-[…]` or `text-[Npx]` in a
 * className needs a reason in a comment (`npm run tokens:check` lists them). Every change here goes to
 * TOKEN_CHANGELOG with the date.
 *
 * No path alias in this file: tailwind.config.ts imports it directly.
 */

export const TOKENS_VERSION = "1.1.0";

export const TOKEN_CHANGELOG: { version: string; date: string; changes: string[] }[] = [
  {
    version: "1.1.0",
    date: "2026-10-15",
    changes: [
      "Dải primitive 50–950 (neutral, green, orange, red, amber, blue); token ngữ nghĩa trỏ vào các bước của dải.",
      "Chế độ tối: mọi token ngữ nghĩa có giá trị tối, bật bằng data-theme=\"dark\"; component trong components/ui chỉ dùng token ngữ nghĩa.",
      "Token mới: accent, accent-contrast, accent-bg, accent-fg (ô đã chọn) và success/warning/danger/info-solid (badge đặc chữ trắng).",
      "Style body/caption không ép độ đậm; text-[11px] đổi thành text-caption 12 px (chữ đọc) hoặc text-cad-spec-micro 11 px (mono).",
      "Bảng màu mặc định của Tailwind (stone, red, amber, emerald…) trong trang đổi sang token; npm run tokens:check chặn giá trị tay trong CI.",
    ],
  },
  {
    version: "1.0.0",
    date: "2026-10-15",
    changes: [
      "Tầng token ngữ nghĩa: fg, canvas, surface-raised, line, action, focus và 4 nhóm feedback.",
      "Nút chính đổi từ cam FPT chữ trắng (3.15:1) sang lime pack.ly chữ xanh đậm (10:1).",
      "Thang chữ tỉ lệ ~1.25 với style theo vai trò, cỡ display co giãn bằng clamp(); sàn 11px.",
      "library-muted #7F7F7F → #6B6B6B (5.3:1); token khoảng cách section/card/stack; bo góc control/panel/card.",
    ],
  },
];

/** Tailwind's default breakpoints, named here so scripts use the same values (`mediaUp("md")`). */
export const BREAKPOINTS = { sm: 640, md: 768, lg: 1024, xl: 1280, "2xl": 1536 } as const;
export type Breakpoint = keyof typeof BREAKPOINTS;
export const mediaUp = (bp: Breakpoint) => `(min-width: ${BREAKPOINTS[bp]}px)`;

/** Column grid of the pages: columns, gutter and side margin per breakpoint. `Container` applies the margin. */
export const GRID = [
  { at: "< md", columns: 4, gutter: "16px", margin: "16px" },
  { at: "md", columns: 8, gutter: "24px", margin: "24px" },
  { at: "lg+", columns: 12, gutter: "24px", margin: "32px", max: "1280px (1536px từ 2xl)" },
] as const;

/**
 * Primitive ramps, 50 (lightest) → 950 (darkest). Semantic tokens point at a step of these; pages never use them
 * directly (Tailwind exposes them as `wf-neutral-100`… for illustrations and the catalogue). The neutral ramp is the
 * slate of pack.ly, green its lime, orange the FPT orange (500 = #F26522), red/amber/blue the feedback hues.
 */
export const PALETTE = {
  neutral: { 50: "#F8FAFC", 100: "#F1F5F9", 150: "#E9EFF5", 200: "#E2E8F0", 300: "#CAD5E2", 400: "#90A1B9", 500: "#7C8BA1", 600: "#53647D", 700: "#314158", 800: "#1D293D", 850: "#1B2638", 900: "#131C2E", 950: "#0B1220" },
  green: { 50: "#F3FCEC", 100: "#EAFAE0", 200: "#C7F1AB", 300: "#AFEC88", 400: "#98E665", 500: "#86D652", 600: "#458C17", 700: "#2D5C0F", 800: "#1F420A", 900: "#152B07", 950: "#0C1A04" },
  orange: { 50: "#FEF1EA", 100: "#FDE0CF", 200: "#FBC09F", 300: "#F89A68", 400: "#F57E42", 500: "#F26522", 600: "#D85314", 700: "#B93F0A", 800: "#8F310B", 900: "#6B250A", 950: "#3A1405" },
  red: { 50: "#FEF3F2", 100: "#FEE4E2", 200: "#FECDCA", 300: "#FDA29B", 400: "#F97066", 500: "#F04438", 600: "#D92D20", 700: "#B42318", 800: "#912018", 900: "#7A271A", 950: "#55160C" },
  amber: { 50: "#FFFBEB", 100: "#FEF3C7", 200: "#FDE68A", 300: "#FCD34D", 400: "#FBBF24", 500: "#F59E0B", 600: "#D97706", 700: "#B45309", 800: "#92400E", 900: "#78350F", 950: "#451A03" },
  blue: { 50: "#EFF6FF", 100: "#E8F0FE", 200: "#BFDBFE", 300: "#93C5FD", 400: "#60A5FA", 500: "#3B82F6", 600: "#2563EB", 700: "#1E4FB8", 800: "#1E3A8A", 900: "#172554", 950: "#0F1A3D" },
} as const;

const { neutral: N, green: G, red: R, amber: A, blue: B } = PALETTE;

export type ThemeMode = "light" | "dark";

export interface ColorToken {
  /** Tailwind name: `text-fg-muted`, `bg-action`… */
  name: string;
  /** CSS variable holding "R G B" channels. */
  cssVar: string;
  /** Light theme value. */
  value: string;
  /** Dark theme value (`data-theme="dark"`). */
  dark: string;
  use: string;
  /** Where it must not be used. */
  avoid?: string;
}

const token = (name: string, value: string, dark: string, use: string, avoid?: string): ColorToken => ({ name, cssVar: `--ds-${name}`, value, dark, use, ...(avoid ? { avoid } : {}) });

/** Semantic colours, light and dark. Contrast figures are against the raised surface of the same theme. */
export const SEMANTIC_COLORS: ColorToken[] = [
  token("fg", N[800], N[100], "Chữ chính, tiêu đề, icon (14.6:1 sáng · 15.5:1 tối)."),
  token("fg-muted", N[600], N[400], "Chữ phụ, mô tả, nhãn (6.0:1 sáng · 6.5:1 tối; 5.5 / 7.1 trên canvas).", "Chữ trên nền tối cố định (dải xanh đêm)."),
  token("fg-inverse", "#FFFFFF", N[950], "Chữ trên nền fg (nút tối, tab đang chọn kiểu Pacdora)."),
  token("canvas", N[100], N[950], "Nền trang."),
  token("surface-raised", "#FFFFFF", N[900], "Thẻ, panel, popover, dialog."),
  token("surface-sunken", N[150], N[850], "Ô nền xám, skeleton, chip icon."),
  token("line", N[300], N[700], "Đường kẻ trang trí, viền thẻ.", "Viền duy nhất của input (chỉ 1.5:1)."),
  token("line-strong", N[500], N[500], "Viền input, checkbox, toggle tắt (3.5:1 sáng · 4.9:1 tối, đạt 1.4.11)."),
  token("action", G[400], G[400], "Nền nút chính (lime pack.ly), luôn đi với action-fg.", "Chữ hoặc icon trên nền sáng (1.5:1)."),
  token("action-hover", G[300], G[300], "Hover của nút chính."),
  token("action-pressed", G[500], G[500], "Nhấn giữ nút chính."),
  token("action-fg", G[900], G[900], "Chữ trên action (10:1), giữ nguyên ở cả hai theme."),
  token("accent", G[700], G[400], "Ô đã chọn: checkbox, radio, ngày được chọn, switch bật."),
  token("accent-contrast", "#FFFFFF", G[900], "Dấu tích, chữ trên accent (7.9:1 sáng · 10:1 tối)."),
  token("accent-bg", G[100], G[900], "Nền hàng/thẻ đang chọn."),
  token("accent-fg", G[700], G[200], "Chữ trên accent-bg (7.3:1 sáng · 12:1 tối)."),
  token("focus", B[600], B[400], "Vòng focus của mọi phần tử tương tác (5.2:1 sáng · 6.7:1 tối)."),
  token("success", G[600], G[500], "Icon, chấm trạng thái thành công."),
  token("success-fg", G[700], G[200], "Chữ trên success-bg (7.3:1 sáng · 12:1 tối)."),
  token("success-bg", G[100], G[900], "Nền alert/badge thành công."),
  token("success-solid", G[700], G[700], "Badge đặc, chữ trắng (7.9:1)."),
  token("warning", A[600], A[500], "Icon cảnh báo."),
  token("warning-fg", A[800], A[200], "Chữ trên warning-bg (6.4:1 sáng · 12:1 tối)."),
  token("warning-bg", A[100], A[950], "Nền alert/badge cảnh báo."),
  token("warning-solid", A[800], A[800], "Badge đặc, chữ trắng (7.1:1)."),
  token("danger", R[600], R[600], "Icon lỗi, nút xoá (chữ trắng 4.8:1)."),
  token("danger-fg", R[700], R[300], "Chữ lỗi, chữ trên danger-bg (5.5:1 sáng · 7.2:1 tối)."),
  token("danger-bg", R[100], R[950], "Nền alert/badge lỗi."),
  token("danger-solid", R[600], R[600], "Badge đặc, chữ trắng (4.8:1)."),
  token("info", B[600], B[400], "Icon thông tin."),
  token("info-fg", B[700], B[300], "Chữ trên info-bg (6.4:1 sáng · 9.4:1 tối)."),
  token("info-bg", B[100], B[950], "Nền alert/badge thông tin."),
  token("info-solid", B[600], B[600], "Badge đặc, chữ trắng (5.2:1)."),
];

/** Feedback tones shared by Alert, Banner, Badge, Toast and form messages. */
export type Tone = "neutral" | "info" | "success" | "warning" | "danger";

export interface TypeStyle {
  /** Tailwind class suffix: `text-${name}`. */
  name: string;
  size: string;
  lineHeight: string;
  letterSpacing?: string;
  /** Set by the style (headings, labels). Body and caption styles leave it out and inherit the weight around them. */
  weight?: string;
  use: string;
}

/**
 * Type scale, ratio ~1.25 from 16 px (12 · 14 · 16 · 18 · 20 · 24 · 30 · 36–48 · 40–60). Display and heading sizes
 * grow with the viewport between their two values (clamp), so pages need no `sm:`/`lg:` size overrides.
 * Headings use font-landing-heading (Be Vietnam Pro), the rest font-landing-body (Inter) on marketing pages.
 */
export const TYPE_SCALE: TypeStyle[] = [
  { name: "display-xl", size: "clamp(2.5rem, 1.75rem + 3vw, 3.75rem)", lineHeight: "1.08", letterSpacing: "-0.025em", weight: "700", use: "H1 của hero (40 → 60 px)." },
  { name: "display", size: "clamp(2rem, 1.5rem + 2vw, 3rem)", lineHeight: "1.1", letterSpacing: "-0.02em", weight: "700", use: "Tiêu đề dải CTA, số liệu lớn (32 → 48 px)." },
  { name: "heading-lg", size: "clamp(1.875rem, 1.65rem + 0.9vw, 2.25rem)", lineHeight: "1.2", letterSpacing: "-0.015em", weight: "700", use: "H2 của section (30 → 36 px)." },
  { name: "heading-md", size: "1.5rem", lineHeight: "1.25", letterSpacing: "-0.01em", weight: "700", use: "H2 trong trang con, tiêu đề dialog lớn (24 px)." },
  { name: "heading-sm", size: "1.25rem", lineHeight: "1.3", weight: "600", use: "H3, tiêu đề panel (20 px)." },
  { name: "title", size: "1.125rem", lineHeight: "1.4", weight: "600", use: "Tiêu đề thẻ, eyebrow lớn (18 px)." },
  { name: "body-lg", size: "1.125rem", lineHeight: "1.6", use: "Đoạn dẫn (lead) (18 px)." },
  { name: "body", size: "1rem", lineHeight: "1.6", use: "Đoạn văn (16 px)." },
  { name: "body-sm", size: "0.875rem", lineHeight: "1.55", use: "Mô tả trong thẻ, bảng (14 px)." },
  { name: "label", size: "0.875rem", lineHeight: "1.25", weight: "500", use: "Chữ trên nút, nhãn field (14 px)." },
  { name: "label-sm", size: "0.75rem", lineHeight: "1.3", letterSpacing: "0.01em", weight: "600", use: "Badge, tab nhỏ (12 px)." },
  { name: "caption", size: "0.75rem", lineHeight: "1.45", use: "Chú thích, hint, thời gian (12 px). Cỡ nhỏ nhất cho chữ đọc." },
  { name: "overline", size: "0.75rem", lineHeight: "1.3", letterSpacing: "0.12em", weight: "700", use: "Nhãn VIẾT HOA trên tiêu đề (12 px)." },
  { name: "cad-dimension", size: "0.75rem", lineHeight: "1rem", letterSpacing: "0.02em", weight: "500", use: "Số đo mm L·W·H·t, JetBrains Mono (12 px)." },
  { name: "cad-spec-micro", size: "0.6875rem", lineHeight: "0.875rem", letterSpacing: "0.04em", weight: "500", use: "Nhãn kỹ thuật mono trên canvas (11 px). Sàn của cả hệ." },
];

/** Smallest text in the product: 12 px for reading, 11 px for monospace technical labels. */
export const MIN_TEXT_PX = { reading: 12, monoLabel: 11 } as const;

/** Spacing with a purpose. The 4 px Tailwind scale stays the base for everything else. */
export const SPACING = {
  "control-sm": { value: "2.25rem", use: "Chiều cao control nhỏ (36 px)." },
  control: { value: "2.5rem", use: "Chiều cao control chuẩn (40 px)." },
  "control-lg": { value: "2.75rem", use: "Control lớn, vùng chạm tối thiểu (44 px)." },
  "stack-xs": { value: "0.25rem", use: "Nhãn ↔ field, icon ↔ chữ (4 px)." },
  "stack-sm": { value: "0.5rem", use: "Các dòng trong một khối (8 px)." },
  stack: { value: "1rem", use: "Các khối trong thẻ (16 px)." },
  "stack-lg": { value: "1.5rem", use: "Các nhóm trong section (24 px)." },
  "card-sm": { value: "1.25rem", use: "Padding thẻ nhỏ, panel workspace mobile (20 px)." },
  card: { value: "1.5rem", use: "Padding thẻ (24 px)." },
  "card-lg": { value: "2rem", use: "Padding thẻ lớn từ sm (32 px)." },
  section: { value: "2.5rem", use: "Khoảng dọc section trên mobile (40 px)." },
  "section-lg": { value: "3.5rem", use: "Khoảng dọc section từ lg (56 px)." },
  "section-xl": { value: "6rem", use: "Dải CTA, hero (96 px)." },
} as const;

/** Corner radii by role. */
export const RADII = {
  control: { value: "0.75rem", use: "Input, select, nút workspace (12 px)." },
  panel: { value: "1rem", use: "Panel workspace, menu, toast (16 px)." },
  sheet: { value: "1.75rem", use: "Dialog, bottom sheet (28 px)." },
  card: { value: "2rem", use: "Thẻ marketing pack.ly (32 px)." },
  "card-lg": { value: "3rem", use: "Thẻ lớn / ảnh từ lg (48 px)." },
} as const;

/** lucide-react stroke widths: one icon style across the app. Filled shapes (stars) and artwork are exempt. */
export const ICON_STROKE = {
  small: { value: 2, use: "Icon ≤ 16 px trong nút, badge, field (mặc định của lucide)." },
  large: { value: 1.75, use: "Icon ≥ 20 px: tiêu đề thẻ, mũi tên lớn, minh hoạ trạng thái." },
  mark: { value: 3, use: "Dấu tích/gạch trong ô 12–16 px (checkbox, bảng so sánh) để không nhoè." },
} as const;

/** Minimum time a request runs before a loading indicator shows, so fast answers do not flash a spinner. */
export const LOADING_DELAY_MS = 300;

/** Tailwind `colors` entries for the semantic tokens, read from their CSS variables (alpha modifiers work). */
export function semanticColorTheme(): Record<string, string> {
  return Object.fromEntries(SEMANTIC_COLORS.map((token) => [token.name, `rgb(var(${token.cssVar}) / <alpha-value>)`]));
}

/** Declarations of the semantic colour variables for one theme, as "R G B" channels. */
export function semanticColorVariables(mode: ThemeMode = "light"): Record<string, string> {
  const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(" ");
  return Object.fromEntries(SEMANTIC_COLORS.map((token) => [token.cssVar, channels(mode === "dark" ? token.dark : token.value)]));
}

/** Tailwind `colors` entries of the primitive ramps: `wf-neutral-100`, `wf-green-400`… */
export function paletteTheme(): Record<string, Record<string, string>> {
  return Object.fromEntries(Object.entries(PALETTE).map(([name, ramp]) => [`wf-${name}`, { ...ramp }]));
}

/** WCAG 2.x contrast ratio of two #RRGGBB colours. */
export function contrastRatio(a: string, b: string): number {
  const luminance = (hex: string) => {
    const [r, g, bl] = [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

/** localStorage key of the theme choice ("light" | "dark" | "system"), read before the first paint. */
export const THEME_STORAGE_KEY = "wf-theme";

/** Tailwind `fontSize` entries of the type scale. */
export function typeScaleTheme(): Record<string, [string, { lineHeight: string; letterSpacing?: string; fontWeight?: string }]> {
  return Object.fromEntries(
    TYPE_SCALE.map((style) => [
      style.name,
      [
        style.size,
        { lineHeight: style.lineHeight, ...(style.weight ? { fontWeight: style.weight } : {}), ...(style.letterSpacing ? { letterSpacing: style.letterSpacing } : {}) },
      ],
    ]),
  );
}

export const spacingTheme = () => Object.fromEntries(Object.entries(SPACING).map(([key, token]) => [key, token.value]));
export const radiusTheme = () => Object.fromEntries(Object.entries(RADII).map(([key, token]) => [key, token.value]));

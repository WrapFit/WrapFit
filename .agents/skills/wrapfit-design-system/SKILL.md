---
name: wrapfit-design-system
description: >-
  Enforces WrapFit packaging design system tokens, typography, luxury craft styling, and anti-AI-slop UI guidelines. Use when creating or refining UI/UX components, CSS, Tailwind styles, or packaging visual editors.
---

# WrapFit Packaging Design System & Heuristic Review

This skill guides the agent in crafting high-craft, tactile, and intentional user interfaces for the WrapFit platform, adhering to the principles of `open-design` and `impeccable`.

## 1. Design Tokens & Palette

Read `fe/src/assets/styles/tokens.ts` (semantic colours, type scale, spacing, radii, breakpoints, changelog) and `docs/15_DESIGN_SYSTEM.md` before styling anything. Live catalogue: `/design-system`.

### Semantic colours (use these in components)
```
fg #1D293D · fg-muted #53647D · fg-inverse #FFFFFF
canvas #F1F5F9 · surface-raised #FFFFFF · surface-sunken #E9EFF5
line #CAD5E2 (decorative) · line-strong #7C8BA1 (input borders)
action #98E665 + action-fg #152B07 (primary button) · focus #2563EB
success / warning / danger / info  (+ -fg, -bg)
```
Primitives stay in `fe/tailwind.config.ts`: `landing-*` (pack.ly), `library-*` (Pacdora), `paper-*`, `brand-*`, `fpt-*`, `dieline-*` (cut #E53E3E, crease #3182CE dashed 4 4, bleed #38A169 dotted, safe #ECC94B).

## 2. Anti-AI-Slop & Craftsmanship Rules

1. **Look**: pack.ly on marketing pages (slate ink, lime pill CTA, white cards `rounded-card` with a hairline ring), Pacdora in library and workspace (grey tiles, `border-library-ink` hairline, `shadow-hard-sm` on hover).
2. **Components first**: import from `@/components/ui`. No new button/card/badge class strings in pages, no raw hex, `rounded-[…]` or `text-[Npx]` without a comment (`npm run tokens:check` in `fe/`).
3. **Typography**: headings `font-landing-heading` (Be Vietnam Pro) with `text-display-xl` / `text-heading-*`; body `font-landing-body` (Inter) with `text-body*`; mm values `font-mono` with `text-cad-dimension`. Never below 12 px for reading text (11 px mono labels).
4. **Tactile elevation**: soft ambient shadows (`shadow-soft-8/16`, `shadow-popover`), never `shadow-2xl`.

## 3. Heuristic Critique Checkpoints

Before finalizing any frontend view, review against these criteria:
- **Clarity of Dimension Entry**: Is it obvious whether inputs are in `mm` or `cm`?
- **Hierarchy of Actions**: Is the primary CTA ("FitCheck™ kiểm tra" or "Xuất file in PDF") distinctly prioritized over secondary tools?
- **Touch Targets**: Are all toolbar icons and canvas handles at least $44 \times 44\text{px}$?
- **Color Contrast**: Does all text meet WCAG AA (4.5:1; 3:1 for large text and control borders)? The primary button is lime with dark text, never white on orange.
- **Keyboard & Focus**: Can every control be reached and used with the keyboard, with the cobalt focus ring visible?

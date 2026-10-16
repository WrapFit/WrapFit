// No "use client": buttonClass() and <ButtonLink> work in Server Components too.
import { Loader2 } from "lucide-react";
import Link from "next/link";
import React from "react";
import { cn } from "@/utils/helpers";

/**
 * Buttons of the whole app (pack.ly look: lime pill call to action, white secondary pill; pacdora look in the
 * workspace with `shape="rounded"`). Use `<Button>` for actions, `<ButtonLink>` for navigation and `buttonClass()` when
 * another element must look like a button (a `<label>` around a file input…).
 *
 * States: hover, pressed (scale), keyboard focus (cobalt ring), disabled (50 %, not-allowed) and loading (spinner,
 * aria-busy, keeps its width).
 */

export const BUTTON_VARIANTS = {
  /** Main call to action of the library and workspace (Pacdora look): lime with dark green text (10:1). */
  primary: "bg-action text-action-fg hover:bg-action-hover active:bg-action-pressed",
  /**
   * Main call to action of the marketing pages: FPT orange with white text (brand choice). White on #F26522 is 3.2:1,
   * enough for large text only; keep the label semibold and the button ≥ 40 px tall.
   */
  brand: "bg-fpt-orange font-semibold text-white hover:bg-fpt-orange-dark active:bg-fpt-orange-ink",
  /** White button with a hairline ring (pack.ly secondary). */
  secondary: "bg-surface-raised text-fg ring-1 ring-inset ring-line hover:bg-surface-sunken",
  /** White button with a black hairline (pacdora secondary, workspace and library). */
  outline: "border border-fg bg-surface-raised text-fg hover:bg-surface-sunken",
  /** Dark solid button for light pages that need a strong neutral action. */
  dark: "bg-fg text-fg-inverse hover:bg-fg/90",
  /** No fill until hovered: toolbars, secondary actions in a row. */
  ghost: "bg-transparent text-fg hover:bg-surface-sunken",
  /** Outline pill on dark green sections. */
  "ghost-dark": "border border-white/35 bg-transparent text-white hover:border-fpt-orange hover:bg-fpt-orange/15",
  /** White pill on lime or photo backgrounds. */
  white: "bg-surface-raised text-fg shadow-soft-8 hover:bg-accent-bg",
  /** Actions that delete or cannot be undone (white on red 4.8:1). */
  danger: "bg-danger-solid text-white hover:bg-danger-solid/90",
  /** Looks like a link: inline "Xem thêm", "Huỷ". */
  link: "h-auto px-0 bg-transparent text-accent-fg underline-offset-4 hover:underline",
} as const;

export const BUTTON_SIZES = {
  sm: "h-control-sm px-3.5 text-label gap-1.5",
  md: "h-control px-5 text-label gap-1.5",
  lg: "h-control-lg px-6 text-body font-semibold gap-2",
  /** 48 px: the main action of a step or a form (studio, account pages). */
  xl: "h-12 px-6 text-body gap-2",
  /** Square icon buttons: 36 / 40 / 44 px. */
  "icon-sm": "size-control-sm p-0",
  icon: "size-control p-0",
  "icon-lg": "size-control-lg p-0",
} as const;

export const BUTTON_SHAPES = {
  /** pack.ly pill (marketing pages, studio). */
  pill: "rounded-full",
  /** pacdora 12 px corners (workspace, library, admin). */
  rounded: "rounded-control",
} as const;

export type ButtonVariant = keyof typeof BUTTON_VARIANTS;
export type ButtonSize = keyof typeof BUTTON_SIZES;
export type ButtonShape = keyof typeof BUTTON_SHAPES;

export interface ButtonStyleProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  shape?: ButtonShape;
  /** Stretch to the width of the container. */
  block?: boolean;
  className?: string;
}

const BASE =
  "inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-semibold transition-[background-color,color,box-shadow,transform] duration-150 active:scale-[0.98] outline-none focus-visible:ring-[3px] focus-visible:ring-focus/40 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 motion-reduce:active:scale-100 [&_svg]:size-4 [&_svg]:shrink-0";

/** Class names of a button, for elements that are not `<Button>` (links, labels). */
export function buttonClass({ variant = "primary", size = "md", shape = "pill", block = false, className }: ButtonStyleProps = {}) {
  return cn(BASE, BUTTON_SHAPES[shape], BUTTON_SIZES[size], BUTTON_VARIANTS[variant], block && "w-full", className);
}

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className">, ButtonStyleProps {
  /** Shows a spinner, disables the button and announces it as busy. */
  loading?: boolean;
  /** Text read while loading, e.g. "Đang lưu…"; the label stays otherwise. */
  loadingLabel?: string;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  ref?: React.Ref<HTMLButtonElement>;
}

export function Button({
  variant,
  size,
  shape,
  block,
  className,
  loading = false,
  loadingLabel,
  leadingIcon,
  trailingIcon,
  disabled,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClass({ variant, size, shape, block, className })}
      {...rest}
    >
      {loading ? <Loader2 className="animate-spin" aria-hidden /> : leadingIcon}
      {loading && loadingLabel ? loadingLabel : children}
      {!loading && trailingIcon}
    </button>
  );
}

export interface ButtonLinkProps extends Omit<React.ComponentProps<typeof Link>, "className">, ButtonStyleProps {
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}

/** A link that looks like a button (navigation, not an action). */
export function ButtonLink({ variant, size, shape, block, className, leadingIcon, trailingIcon, children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={buttonClass({ variant, size, shape, block, className })} {...rest}>
      {leadingIcon}
      {children}
      {trailingIcon}
    </Link>
  );
}

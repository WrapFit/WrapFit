import React from "react";
import { cn } from "@/utils/helpers";

/**
 * One card for the whole app. Pick the variant by where it sits:
 * - `soft`    white, hairline ring, 32 px corners (48 px from lg with `size="lg"`): pack.ly marketing cards;
 * - `outline` grey tile with a black hairline: pacdora library / showcase;
 * - `panel`   white with a light border and 16 px corners: workspace and admin panels;
 * - `tile`    sunken grey, no border: stats, nested blocks.
 * Padding follows the spacing tokens (card-sm 20 · card 24 · card-lg 32).
 */
export const CARD_VARIANTS = {
  soft: "rounded-card bg-surface-raised ring-1 ring-fg/10",
  outline: "rounded-panel border border-fg bg-surface-sunken",
  panel: "rounded-panel border border-line bg-surface-raised",
  tile: "rounded-panel bg-surface-sunken",
} as const;

export const CARD_PADDING = {
  none: "",
  sm: "p-card-sm",
  md: "p-card-sm sm:p-card",
  lg: "p-card sm:p-card-lg",
} as const;

export type CardVariant = keyof typeof CARD_VARIANTS;

export function cardClass({
  variant = "soft",
  padding = "md",
  interactive = false,
  className,
}: { variant?: CardVariant; padding?: keyof typeof CARD_PADDING; interactive?: boolean; className?: string } = {}) {
  return cn(
    CARD_VARIANTS[variant],
    CARD_PADDING[padding],
    variant === "soft" && padding === "lg" && "lg:rounded-card-lg",
    interactive &&
      "transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-soft-16 focus-within:shadow-soft-16 motion-reduce:transition-none motion-reduce:hover:translate-y-0",
    className,
  );
}

type CardTag = "div" | "article" | "section" | "li" | "aside";

export interface CardProps extends React.HTMLAttributes<HTMLElement> {
  as?: CardTag;
  variant?: CardVariant;
  padding?: keyof typeof CARD_PADDING;
  /** Lifts on hover: the whole card is a link or a button. */
  interactive?: boolean;
}

export function Card({ as: Tag = "div", variant, padding, interactive, className, children, ...rest }: CardProps) {
  return (
    <Tag className={cardClass({ variant, padding, interactive, className })} {...rest}>
      {children}
    </Tag>
  );
}

/** Title row of a card or panel, with an optional action on the right. */
export function CardHeader({
  title,
  description,
  action,
  id,
  as: Heading = "h2",
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  id?: string;
  as?: "h2" | "h3";
  className?: string;
}) {
  return (
    <div className={cn("mb-stack flex flex-wrap items-start justify-between gap-2", className)}>
      <div className="flex min-w-0 flex-col gap-stack-xs">
        <Heading id={id} className="text-title text-fg">
          {title}
        </Heading>
        {description && <p className="text-body-sm text-fg-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

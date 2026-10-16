"use client";

import { Check, Minus } from "lucide-react";
import React, { useEffect, useId, useRef } from "react";
import { cn } from "@/utils/helpers";

/**
 * Checkbox, radio group and switch. Each keeps the native input (keyboard, forms and screen readers work as usual)
 * and draws its own box on top. The whole row is the click target, at least 44 px tall.
 */

const ROW = "group flex min-h-control-lg cursor-pointer items-start gap-3 py-2 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50";
const FOCUS = "peer-focus-visible:ring-[3px] peer-focus-visible:ring-focus/40";

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  label: React.ReactNode;
  description?: React.ReactNode;
  /** Some but not all children are checked. */
  indeterminate?: boolean;
  /** Smaller box for dense toolbars; the row keeps a 36 px target. */
  compact?: boolean;
}

export function Checkbox({ label, description, indeterminate = false, compact = false, className, id: givenId, ...rest }: CheckboxProps) {
  const autoId = useId();
  const id = givenId ?? autoId;
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <label htmlFor={id} className={cn(ROW, compact && "min-h-control-sm items-center py-1", className)}>
      <span className="relative mt-0.5 flex shrink-0">
        <input ref={ref} id={id} type="checkbox" className="peer sr-only" {...rest} />
        <span
          className={cn(
            "flex items-center justify-center rounded-md border-[1.5px] border-line-strong bg-surface-raised text-accent-contrast transition-colors group-hover:border-fg peer-checked:border-accent peer-checked:bg-accent peer-indeterminate:border-accent peer-indeterminate:bg-accent [&>svg]:hidden peer-checked:[&>.check]:block peer-indeterminate:[&>.dash]:block",
            compact ? "size-4" : "size-5",
            FOCUS,
          )}
          aria-hidden
        >
          <Check className="check size-3.5" strokeWidth={3} />
          <Minus className="dash size-3.5" strokeWidth={3} />
        </span>
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className={cn("text-fg", compact ? "text-caption" : "text-body-sm font-medium")}>{label}</span>
        {description && <span className="text-caption text-fg-muted">{description}</span>}
      </span>
    </label>
  );
}

export interface RadioOption<T extends string> {
  value: T;
  label: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface RadioGroupProps<T extends string> {
  /** Names the group for screen readers (and shows above it unless `hideLabel`). */
  label: string;
  hideLabel?: boolean;
  value: T;
  onChange(value: T): void;
  options: RadioOption<T>[];
  /** `list` round radios, `card` bordered cards (the whole card selects). */
  variant?: "list" | "card";
  /** Lay options in a row from sm. */
  inline?: boolean;
  name?: string;
  className?: string;
}

/** A choice of one among several. Start with one option selected (pass `value`). Arrow keys move between options. */
export function RadioGroup<T extends string>({ label, hideLabel, value, onChange, options, variant = "list", inline, name, className }: RadioGroupProps<T>) {
  const autoName = useId();
  const groupName = name ?? autoName;
  return (
    <fieldset className={cn("flex min-w-0 flex-col gap-2", className)}>
      <legend className={cn("mb-1 text-label text-fg", hideLabel && "sr-only")}>{label}</legend>
      <div className={cn("flex flex-col", variant === "card" ? "gap-2" : "gap-0", inline && "sm:flex-row sm:flex-wrap sm:gap-3")}>
        {options.map((option) => {
          const checked = option.value === value;
          return (
            <label
              key={option.value}
              className={cn(
                ROW,
                variant === "card" &&
                  "rounded-panel border border-line bg-surface-raised px-3.5 py-3 transition-colors hover:border-fg/40 has-[:checked]:border-accent has-[:checked]:bg-accent-bg has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-focus/40",
              )}
            >
              <span className="relative mt-0.5 flex shrink-0">
                <input
                  type="radio"
                  name={groupName}
                  value={option.value}
                  checked={checked}
                  disabled={option.disabled}
                  onChange={() => onChange(option.value)}
                  className="peer sr-only"
                />
                <span
                  className={cn(
                    "flex size-5 items-center justify-center rounded-full border-[1.5px] border-line-strong bg-surface-raised transition-colors group-hover:border-fg peer-checked:border-accent peer-checked:[&>span]:scale-100",
                    variant === "list" && FOCUS,
                  )}
                  aria-hidden
                >
                  <span className="size-2.5 scale-0 rounded-full bg-accent transition-transform" />
                </span>
              </span>
              {option.icon && <span className="mt-0.5 flex text-fg-muted [&_svg]:size-5">{option.icon}</span>}
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-body-sm font-medium text-fg">{option.label}</span>
                {option.description && <span className="text-caption text-fg-muted">{option.description}</span>}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export interface SwitchProps {
  /** Colour when on: orange accent (default) or black ink. */
  tone?: "brand" | "ink";
  checked: boolean;
  onChange(value: boolean): void;
  /** Says what turns on. Shown next to the switch unless `hideLabel` (then still read). */
  label: React.ReactNode;
  description?: React.ReactNode;
  hideLabel?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
}

/** On / off setting that applies at once (no Save button). */
export function Switch({ tone = "brand", checked, onChange, label, description, hideLabel = false, disabled = false, id: givenId, className }: SwitchProps) {
  const autoId = useId();
  const id = givenId ?? autoId;
  const descriptionId = description ? `${id}-desc` : undefined;
  const control = (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-describedby={descriptionId}
      aria-label={hideLabel && typeof label === "string" ? label : undefined}
      aria-labelledby={hideLabel ? undefined : `${id}-label`}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-[1.5px] p-0.5 outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-focus/40 disabled:cursor-not-allowed disabled:opacity-50",
        checked ? (tone === "ink" ? "border-fg bg-fg" : "border-accent bg-accent") : "border-line-strong bg-surface-sunken",
      )}
    >
      <span
        className={cn(
          "size-4 rounded-full shadow transition-transform motion-reduce:transition-none",
          checked ? "translate-x-5 bg-surface-raised" : "translate-x-0 bg-fg-muted",
        )}
      />
    </button>
  );
  if (hideLabel) return <span className={className}>{control}</span>;
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span id={`${id}-label`} className="text-body-sm font-medium text-fg">
          {label}
        </span>
        {description && (
          <span id={descriptionId} className="text-caption text-fg-muted">
            {description}
          </span>
        )}
      </div>
      {control}
    </div>
  );
}

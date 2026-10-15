"use client";

import { AlertCircle, ChevronDown } from "lucide-react";
import React, { useId } from "react";
import { cn } from "@/utils/helpers";
import { INPUT_BASE, INPUT_SIZES } from "./field-styles";


/**
 * Form fields. `<Field>` lays out label, control, hint and error and wires their ids; the control comes from the
 * render prop so any input fits (Input, Textarea, Select, NumberStepper, DatePicker…).
 *
 *   <Field label="Email" hint="Dùng để nhận hoá đơn" error={errors.email}>
 *     {(props) => <Input type="email" autoComplete="email" {...props} />}
 *   </Field>
 */


export interface FieldControlProps {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  "aria-required"?: boolean;
}

export interface FieldProps {
  label: React.ReactNode;
  /** Explains what to enter; stays visible while typing (unlike a placeholder). */
  hint?: React.ReactNode;
  /** Validation message; replaces nothing, shows under the hint in danger colour with an icon. */
  error?: React.ReactNode;
  required?: boolean;
  /** Visually hide the label (it is still read). Only when the context names the field already. */
  hideLabel?: boolean;
  /** Right of the label: "Quên mật khẩu?", a counter… */
  labelAction?: React.ReactNode;
  id?: string;
  className?: string;
  children: (props: FieldControlProps) => React.ReactNode;
}

export function Field({ label, hint, error, required, hideLabel, labelAction, id: givenId, className, children }: FieldProps) {
  const autoId = useId();
  const id = givenId ?? `field-${autoId}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className={cn("flex items-baseline justify-between gap-2", hideLabel && "sr-only")}>
        <label htmlFor={id} className="text-label text-fg">
          {label}
          {required && (
            <span className="ml-0.5 text-danger-fg" aria-hidden>
              *
            </span>
          )}
        </label>
        {labelAction}
      </div>
      {children({ id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined, "aria-required": required || undefined })}
      {hint && (
        <p id={hintId} className="text-caption text-fg-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="flex items-start gap-1 text-caption font-medium text-danger-fg">
          <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
}

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  inputSize?: keyof typeof INPUT_SIZES;
  /** Icon inside the field on the left (search, mail…). */
  leadingIcon?: React.ReactNode;
  /** Text or element inside on the right ("mm", a clear button…). */
  trailing?: React.ReactNode;
  ref?: React.Ref<HTMLInputElement>;
}

export function Input({ inputSize = "md", leadingIcon, trailing, className, ...rest }: InputProps) {
  if (!leadingIcon && !trailing) return <input className={cn(INPUT_BASE, INPUT_SIZES[inputSize], className)} {...rest} />;
  return (
    <div className="relative flex w-full items-center">
      {leadingIcon && (
        <span className="pointer-events-none absolute left-3 flex text-fg-muted [&_svg]:size-4" aria-hidden>
          {leadingIcon}
        </span>
      )}
      <input className={cn(INPUT_BASE, INPUT_SIZES[inputSize], leadingIcon && "pl-9", trailing && "pr-12", className)} {...rest} />
      {trailing && <span className="absolute right-2 flex items-center text-caption text-fg-muted">{trailing}</span>}
    </div>
  );
}

export function Textarea({ className, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { ref?: React.Ref<HTMLTextAreaElement> }) {
  return <textarea className={cn(INPUT_BASE, "min-h-24 px-3.5 py-2.5 leading-relaxed", className)} {...rest} />;
}

export function Select({
  inputSize = "md",
  className,
  children,
  ...rest
}: Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size"> & { inputSize?: keyof typeof INPUT_SIZES; ref?: React.Ref<HTMLSelectElement> }) {
  // The chevron is an icon over the field (a background-image class would be split by cn() and lose the fill).
  return (
    <div className="relative w-full">
      <select className={cn(INPUT_BASE, INPUT_SIZES[inputSize], "appearance-none pr-9", className)} {...rest}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-fg-muted" aria-hidden />
    </div>
  );
}

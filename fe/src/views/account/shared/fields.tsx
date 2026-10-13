"use client";

import { Eye, EyeOff } from "lucide-react";
import React, { useState } from "react";
import { cn } from "@/utils/helpers";

/** Same grey field as the login screen: 48 px high, white with a green ring on focus, red ring when invalid. */
export const INPUT_CLASS =
  "h-12 w-full rounded-lg border-0 bg-[#EBEDEF] px-4 text-base text-landing-ink outline-none ring-1 ring-transparent transition-shadow placeholder:text-landing-muted/70 focus:bg-white focus:ring-landing-green/60 disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:ring-red-400";

interface TextFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "id"> {
  id: string;
  label: string;
  error?: string;
  /** Shown under the field while there is no error. */
  hint?: string;
  /** Element placed over the right end of the input (the password eye). */
  trailing?: React.ReactNode;
}

export function TextField({ id, label, error, hint, trailing, className = "", ...input }: TextFieldProps) {
  const noteId = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-landing-ink">
        {label}
      </label>
      <div className="relative">
        <input id={id} aria-invalid={error ? true : undefined} aria-describedby={noteId} className={cn(INPUT_CLASS, trailing && "pr-12")} {...input} />
        {trailing}
      </div>
      {error ? (
        <p id={noteId} className="mt-1.5 text-sm text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={noteId} className="mt-1.5 text-sm text-landing-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Password input with a show / hide toggle. */
export function PasswordField(props: Omit<TextFieldProps, "type" | "trailing">) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;
  return (
    <TextField
      {...props}
      type={visible ? "text" : "password"}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          aria-pressed={visible}
          aria-controls={props.id}
          className="absolute right-0.5 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-lg text-landing-muted transition-colors hover:text-landing-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-landing-green/40"
        >
          <Icon className="size-5" aria-hidden />
        </button>
      }
    />
  );
}

/** Busy-aware primary submit of the account forms: the lime pill of the login screen. */
export function SubmitButton({
  busy,
  busyLabel,
  children,
  disabled,
  className = "",
}: {
  busy: boolean;
  busyLabel: string;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="submit"
      disabled={busy || disabled}
      aria-busy={busy || undefined}
      className={cn(
        "inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-landing-lime px-6 text-base font-semibold text-landing-green-night transition-colors hover:bg-[#AFEC88] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-landing-green/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
    >
      {busy && <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-landing-green-night/30 border-t-landing-green-night motion-reduce:animate-none" />}
      <span>{busy ? busyLabel : children}</span>
    </button>
  );
}

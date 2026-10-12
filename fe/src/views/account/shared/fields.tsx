"use client";

import { Eye, EyeOff } from "lucide-react";
import React, { useState } from "react";

/** Same input as the login screen, with the 44 px touch height and an invalid state. */
export const INPUT_CLASS =
  "min-h-[44px] w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-800 shadow-[0_1px_2px_rgba(28,25,23,0.04)] outline-none transition-all placeholder:text-stone-400 focus:border-vibrant-cobalt focus:ring-2 focus:ring-vibrant-cobalt/20 disabled:cursor-not-allowed disabled:bg-stone-50 aria-[invalid=true]:border-vibrant-coral-dark aria-[invalid=true]:focus:ring-vibrant-coral/25";

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
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-stone-700">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={noteId}
          className={`${INPUT_CLASS} ${trailing ? "pr-12" : ""}`}
          {...input}
        />
        {trailing}
      </div>
      {error ? (
        <p id={noteId} className="mt-1.5 text-xs text-rose-700">
          {error}
        </p>
      ) : hint ? (
        <p id={noteId} className="mt-1.5 text-xs text-stone-500">
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
          className="absolute right-0.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl text-stone-400 transition-colors hover:text-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vibrant-cobalt/30"
        >
          <Icon className="h-[18px] w-[18px]" aria-hidden />
        </button>
      }
    />
  );
}

/** Busy-aware primary submit of the account forms. */
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
      className={`inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full bg-brand-forest px-6 text-sm font-semibold text-white transition hover:bg-brand-forest-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-forest/40 focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100 ${className}`}
    >
      {busy && (
        <span
          aria-hidden
          className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white motion-reduce:animate-none"
        />
      )}
      <span>{busy ? busyLabel : children}</span>
    </button>
  );
}

"use client";

import React from "react";
import type { Role } from "@/types/api";
import { ROLE_LABELS, ROLE_TONES, ROLES } from "./accountFormat";

interface RoleSelectProps {
  value: Role;
  onChange(role: Role): void;
  disabled?: boolean;
  id?: string;
  /** Accessible name when no <label> points at the select. */
  label?: string;
  title?: string;
  /** "badge": the role pill of a table row; "field": full-width select of the drawer. */
  variant: "badge" | "field";
}

/** Role picker drawn like the screen's role badge. It only picks: the caller decides when to save. */
export function RoleSelect({ value, onChange, disabled, id, label, title, variant }: RoleSelectProps) {
  const tone = ROLE_TONES[value];
  const wrapper =
    variant === "badge"
      ? `rounded-full ${tone.badge}`
      : "w-full rounded-xl bg-white text-library-ink shadow-sm focus-within:ring-1 focus-within:ring-library-accent";
  const select =
    variant === "badge"
      ? "pl-6 pr-7 py-1 rounded-full font-mono text-[11px] font-semibold uppercase focus-visible:ring-2 focus-visible:ring-library-accent"
      : "w-full pl-8 pr-9 py-2.5 rounded-xl font-medium text-sm";

  return (
    <span className={`relative inline-flex items-center ${wrapper}`} title={title}>
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute ${variant === "badge" ? "left-3" : "left-3.5"} w-1.5 h-1.5 rounded-full ${tone.dot}`}
      />
      <select
        id={id}
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as Role)}
        className={`appearance-none bg-transparent cursor-pointer focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 ${select}`}
      >
        {ROLES.map((role) => (
          <option key={role} value={role}>
            {ROLE_LABELS[role]}
          </option>
        ))}
      </select>
      <span
        aria-hidden="true"
        className={`material-symbols-outlined pointer-events-none absolute ${variant === "badge" ? "right-2 text-sm" : "right-3 text-lg text-library-sub"}`}
      >
        expand_more
      </span>
    </span>
  );
}

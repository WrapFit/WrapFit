"use client";

import React, { useState } from "react";
import type { SafeUser } from "@/types/api";
import { initials, ROLE_TONES } from "./accountFormat";

/** Profile photo of the account, or its initials on the role colour when there is none (or it fails to load). */
export function AccountAvatar({ user, className }: { user: SafeUser; className: string }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  if (user.avatarUrl && user.avatarUrl !== failedUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt=""
        referrerPolicy="no-referrer"
        loading="lazy"
        decoding="async"
        onError={() => setFailedUrl(user.avatarUrl)}
        className={`${className} object-cover`}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`${className} ${ROLE_TONES[user.role].avatar} flex items-center justify-center`}
    >
      {initials(user)}
    </span>
  );
}

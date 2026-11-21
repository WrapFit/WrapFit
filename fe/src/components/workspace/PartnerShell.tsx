"use client";

import { ClipboardList, Settings } from "lucide-react";
import React from "react";
import { ShellLayout, type NavGroup } from "./WorkspaceShell";

/** Sidebar of the partner portal of a print shop (docs/19 G.1). */
export const PARTNER_NAV: NavGroup[] = [
  {
    title: "Xưởng in",
    items: [
      { href: "/partner", label: "Đơn cần làm", icon: ClipboardList },
      { href: "/partner/settings", label: "Thông tin xưởng", icon: Settings },
    ],
  },
];

interface PartnerShellProps {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

/** A page of the partner portal: same chrome as the workspace, with the shop's own menu. */
export function PartnerShell(props: PartnerShellProps) {
  return <ShellLayout {...props} nav={PARTNER_NAV} root={{ label: "Xưởng in", href: "/partner" }} />;
}

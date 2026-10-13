"use client";

import {
  Activity,
  BadgeDollarSign,
  ClipboardCheck,
  Cpu,
  Factory,
  FolderArchive,
  HardDrive,
  Images,
  LayoutDashboard,
  ReceiptText,
  ShieldCheck,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import React from "react";
import { useHealthDetails } from "@/features/admin";
import { cn } from "@/utils/helpers";
import { ShellLayout, type NavGroup } from "./WorkspaceShell";

// Admin console in the workspace layout (pacdora.com style, WrapFit greens).

export const ADMIN_NAV: NavGroup[] = [
  {
    title: "Vận hành",
    items: [
      { href: "/admin", label: "Tổng quan", icon: LayoutDashboard },
      { href: "/admin/studio-monitoring", label: "Giám sát studio", icon: Activity },
      { href: "/admin/gpu-cluster", label: "Máy chủ render", icon: Cpu },
    ],
  },
  {
    title: "Bản vẽ & tài sản",
    items: [
      { href: "/admin/dieline-vault", label: "Kho khuôn bế", icon: FolderArchive },
      { href: "/admin/appraisal", label: "Thẩm định mẫu", icon: ClipboardCheck },
      { href: "/admin/media", label: "Thư viện media", icon: Images },
    ],
  },
  {
    title: "Tài chính & đối tác",
    items: [
      { href: "/admin/revenue", label: "Doanh thu", icon: BadgeDollarSign },
      { href: "/admin/ledger", label: "Sổ giao dịch", icon: ReceiptText },
      { href: "/admin/print-shops", label: "Xưởng in", icon: Factory },
    ],
  },
  {
    title: "Hệ thống",
    items: [
      { href: "/admin/accounts", label: "Tài khoản", icon: Users },
      { href: "/admin/vault-quotas", label: "Hạn mức lưu trữ", icon: HardDrive },
      { href: "/admin/security", label: "Bảo mật", icon: ShieldCheck },
      { href: "/admin/system-config", label: "Cấu hình", icon: SlidersHorizontal },
    ],
  },
];

interface AdminShellProps {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function AdminShell(props: AdminShellProps) {
  return <ShellLayout {...props} nav={ADMIN_NAV} root={{ label: "Quản trị", href: "/admin" }} sidebarBottom={<HealthCard />} />;
}

const DOT: Record<string, string> = { up: "bg-library-accent", down: "bg-red-500", unknown: "bg-library-muted" };

/** Database, Redis and export worker at a glance (`GET /health/details`). */
function HealthCard() {
  const health = useHealthDetails();
  const services = health.data
    ? [
        { label: "Cơ sở dữ liệu", state: health.data.database },
        { label: "Redis", state: health.data.redis },
        { label: "Worker xuất file", state: health.data.worker as string },
      ]
    : [];
  return (
    <div className="rounded-2xl border border-library-line bg-library-tile p-4">
      <p className="text-xs text-library-muted">Hệ thống</p>
      <p className="text-base font-medium text-library-ink">
        {health.isError ? "Không kiểm tra được" : !health.data ? "Đang kiểm tra…" : health.data.status === "ok" ? "Hoạt động bình thường" : "Đang suy giảm"}
      </p>
      {services.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1.5 text-sm text-library-sub">
          {services.map((service) => (
            <li key={service.label} className="flex items-center justify-between gap-2">
              {service.label}
              <span className="flex items-center gap-1.5 text-xs">
                <span aria-hidden className={cn("size-2 rounded-full", DOT[service.state] ?? DOT.unknown)} />
                {service.state === "up" ? "Chạy" : service.state === "down" ? "Lỗi" : "Không rõ"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

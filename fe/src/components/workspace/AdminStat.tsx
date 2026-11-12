"use client";

import React from "react";
import {
  Activity,
  Share2,
  Archive,
  FolderOpen,
  Timer,
  Trash2,
  AlertTriangle,
  BadgeCheck,
  BarChart3,
  Box,
  Boxes,
  Clock,
  Coins,
  Cpu,
  CreditCard,
  Eye,
  Factory,
  FileDown,
  FileStack,
  GitBranch,
  Hash,
  HardDrive,
  Heart,
  Hourglass,
  LayoutTemplate,
  Lock,
  MailWarning,
  PackageCheck,
  Percent,
  ReceiptText,
  RotateCcw,
  ServerCog,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  Truck,
  Upload,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/utils/helpers";

/** Optional state of a figure: a small dot and word next to the label, never a coloured card. */
export type AdminStatStatus = "ok" | "attention" | "critical";

const STATUS: Record<AdminStatStatus, { dot: string; text: string; label: string }> = {
  ok: { dot: "bg-success", text: "text-success-fg", label: "Ổn định" },
  attention: { dot: "bg-warning", text: "text-warning-fg", label: "Cần xem" },
  critical: { dot: "bg-danger-solid", text: "text-danger-fg", label: "Cần xử lý" },
};

/**
 * Icon of a figure from its label (lucide-react, already the icon set of the whole site), so every cell gets a
 * fitting icon without each page wiring one. First match wins; an explicit `icon` prop overrides it.
 */
/** Icon tile colours: one hue per kind of figure, so a figure is recognised at a glance (the label still names it). */
const TONES = {
  orange: "bg-orange-50 text-orange-600 ring-orange-200/70",
  blue: "bg-blue-50 text-blue-600 ring-blue-200/70",
  green: "bg-green-50 text-green-600 ring-green-200/70",
  violet: "bg-violet-50 text-violet-600 ring-violet-200/70",
  red: "bg-rose-50 text-rose-600 ring-rose-200/70",
  amber: "bg-yellow-50 text-yellow-700 ring-yellow-200/70",
  teal: "bg-teal-50 text-teal-600 ring-teal-200/70",
  pink: "bg-pink-50 text-pink-600 ring-pink-200/70",
  indigo: "bg-indigo-50 text-indigo-600 ring-indigo-200/70",
} as const;
type Tone = keyof typeof TONES;

const ICON_RULES: [RegExp, LucideIcon, Tone][] = [
  [/thành viên/i, Users, "blue"],
  [/chia sẻ/i, Share2, "teal"],
  [/đang làm/i, FolderOpen, "blue"],
  [/lưu trữ/i, Archive, "indigo"],
  [/thùng rác/i, Trash2, "red"],
  [/hết hạn/i, Hourglass, "amber"],
  [/thời gian tạo/i, Timer, "teal"],
  [/lỗi/i, AlertTriangle, "red"],
  [/khoá|khóa/i, Lock, "red"],
  [/xác minh/i, MailWarning, "amber"],
  [/tài khoản/i, Users, "blue"],
  [/xưởng/i, Factory, "teal"],
  [/cấu trúc/i, Boxes, "pink"],
  [/mẫu|curated/i, LayoutTemplate, "pink"],
  [/công thức|phiên bản/i, GitBranch, "indigo"],
  [/ngưỡng/i, SlidersHorizontal, "indigo"],
  [/thích/i, Heart, "pink"],
  [/hiển thị/i, Eye, "blue"],
  [/đang chờ|chờ/i, Hourglass, "amber"],
  [/đang xuất|file in|xuất/i, FileDown, "orange"],
  [/thời gian chạy/i, ServerCog, "teal"],
  [/kiểm tra/i, Clock, "indigo"],
  [/trạng thái/i, Activity, "green"],
  [/chi phí|model/i, Cpu, "violet"],
  [/biên/i, Percent, "green"],
  [/xu/i, Coins, "violet"],
  [/doanh thu/i, TrendingUp, "green"],
  [/tăng/i, BarChart3, "green"],
  [/thanh toán/i, CreditCard, "blue"],
  [/đối soát/i, ReceiptText, "amber"],
  [/hoàn tiền/i, RotateCcw, "red"],
  [/thành công/i, BadgeCheck, "green"],
  [/giao dịch|gói/i, Wallet, "blue"],
  [/đã giao/i, PackageCheck, "green"],
  [/đang in|giao/i, Truck, "teal"],
  [/tải lên/i, Upload, "orange"],
  [/dung lượng/i, HardDrive, "indigo"],
  [/tệp/i, FileStack, "orange"],
  [/máy|dựng|tải trung bình/i, Cpu, "teal"],
  [/ai/i, Sparkles, "violet"],
  [/hộp/i, Box, "orange"],
];
const ruleFor = (label: string) => ICON_RULES.find(([re]) => re.test(label));

/**
 * One strip for all the key figures of an admin page (Stripe / Linear style): a single white card split into cells by
 * hairlines, instead of a row of separate floating cards. Put AdminStat cells inside; the grid columns are passed in.
 */
export const ADMIN_STAT_GROUP =
  "grid gap-px overflow-hidden rounded-3xl bg-line/60 ring-1 ring-line/60 shadow-[0_1px_2px_rgba(29,41,61,0.04),0_12px_32px_-18px_rgba(29,41,61,0.22)]";

export interface AdminStatProps {
  label: string;
  value: React.ReactNode;
  /** Scope or detail under the value, e.g. "Toàn hệ thống". */
  hint?: React.ReactNode;
  /** Overrides the icon picked from the label. */
  icon?: LucideIcon;
  status?: AdminStatStatus;
  /** Replaces the default status word. */
  statusLabel?: string;
}

/** A cell of ADMIN_STAT_GROUP: icon and label (with a status dot when one is given), the number, a short hint. */
export function AdminStat({ label, value, hint, icon, status, statusLabel }: AdminStatProps) {
  const s = status ? STATUS[status] : null;
  const rule = ruleFor(label);
  const Icon = icon ?? rule?.[1] ?? Hash;
  const tone = TONES[rule?.[2] ?? "orange"];
  return (
    <div className="group flex min-w-0 flex-col bg-white px-5 py-4 transition-colors hover:bg-landing-canvas/40 sm:px-6 sm:py-5">
      <div className="flex items-center gap-2.5">
        <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg ring-1", tone)}>
          <Icon className="size-4" strokeWidth={2} aria-hidden />
        </span>
        <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] font-medium text-fg-muted">
          <span className="truncate">{label}</span>
          {s && (
            <span className={cn("inline-flex items-center gap-1 text-xs font-semibold", s.text)}>
              <span aria-hidden className={cn("size-1.5 rounded-full", s.dot)} />
              {statusLabel ?? s.label}
            </span>
          )}
        </p>
      </div>
      <p className="mt-3 truncate font-landing-heading text-[1.75rem] font-bold leading-tight tracking-tight tabular-nums text-landing-ink">{value}</p>
      {hint && <p className="mt-1 truncate text-xs text-fg-muted">{hint}</p>}
    </div>
  );
}

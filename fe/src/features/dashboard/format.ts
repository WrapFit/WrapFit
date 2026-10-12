/** Labels, numbers and dates shown on the dashboard, project and settings screens (Vietnamese locale). */

import type { MaterialType, ProjectStatus } from "@wrapfit/shared";
import type { ProjectListQuery, ProjectSummary } from "@/types/api";

const COUNT = new Intl.NumberFormat("vi-VN");
const DECIMAL = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });
const DATE = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
const RELATIVE = new Intl.RelativeTimeFormat("vi", { numeric: "auto" });

const DAY_MS = 24 * 60 * 60 * 1000;

/** Projects in the trash are purged this many days after they were moved there (`be/src/projects/domain`). */
export const TRASH_RETENTION_DAYS = 30;

/** `POST /collections` refuses a new one past this (409). */
export const MAX_COLLECTIONS = 100;

export const formatCount = (value: number) => COUNT.format(value);
export const formatDate = (iso: string) => DATE.format(new Date(iso));

/** 1024-based, one decimal: "14,2 MB". */
export function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = Math.max(0, bytes);
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${unit === 0 ? COUNT.format(value) : DECIMAL.format(value)} ${units[unit]}`;
}

/** "3 giờ trước", "hôm qua"… for an ISO date in the past. */
export function formatRelative(iso: string, now = Date.now()): string {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ["second", 60],
    ["minute", 60],
    ["hour", 24],
    ["day", 30],
    ["month", 12],
  ];
  let value = seconds;
  for (const [unit, size] of steps) {
    if (Math.abs(value) < size) return unit === "second" ? "vừa xong" : RELATIVE.format(value, unit);
    value = Math.round(value / size);
  }
  return RELATIVE.format(value, "year");
}

/** Whole days left before the trash purge of a project moved there at `deletedAt` (0 = purged at the next run). */
export function daysUntilPurge(deletedAt: string, now = Date.now()): number {
  const purgeAt = new Date(deletedAt).getTime() + TRASH_RETENTION_DAYS * DAY_MS;
  return Math.max(0, Math.ceil((purgeAt - now) / DAY_MS));
}

export function purgeLabel(deletedAt: string | null): string {
  if (!deletedAt) return "Trong thùng rác";
  const days = daysUntilPurge(deletedAt);
  return days > 0 ? `Tự xoá sau ${days} ngày` : "Sắp bị xoá vĩnh viễn";
}

/** "120 × 80 × 60 mm" (L × W × H). */
export function dimensionsLabel({ dimensions }: Pick<ProjectSummary, "dimensions">): string {
  const mm = (value: number) => DECIMAL.format(value);
  return `${mm(dimensions.length)} × ${mm(dimensions.width)} × ${mm(dimensions.height)} mm`;
}

const MATERIAL_LABELS: Record<MaterialType, string> = { ivory: "Ivory", kraft: "Kraft", duplex: "Duplex" };

/** "Ivory 300 GSM". */
export function materialLabel({ materialSpec }: Pick<ProjectSummary, "materialSpec">): string {
  return `${MATERIAL_LABELS[materialSpec.type] ?? materialSpec.type} ${materialSpec.gsm} GSM`;
}

export type FitCheckTone = "pass" | "warn" | "fail" | "unchecked";

/** ≥ 90 is what the community library asks for (docs/12, Phase 3b); below 70 the file is unlikely to print well. */
export function fitCheckTone(score: number | null): FitCheckTone {
  if (score === null) return "unchecked";
  if (score >= 90) return "pass";
  return score >= 70 ? "warn" : "fail";
}

export function fitCheckLabel(score: number | null): string {
  return score === null ? "Chưa kiểm FitCheck™" : `FitCheck™ ${score}/100`;
}

// ---------------------------------------------------------------- project list controls

export const STATUS_TABS: readonly { status: ProjectStatus; label: string }[] = [
  { status: "ACTIVE", label: "Đang thiết kế" },
  { status: "ARCHIVED", label: "Lưu trữ" },
  { status: "DELETED", label: "Thùng rác" },
];

export type SortOption = Required<Pick<ProjectListQuery, "sortBy" | "order">> & { id: string; label: string };

export const SORT_OPTIONS: readonly SortOption[] = [
  { id: "updated", label: "Sửa gần nhất", sortBy: "updatedAt", order: "desc" },
  { id: "created", label: "Tạo gần nhất", sortBy: "createdAt", order: "desc" },
  { id: "created-asc", label: "Tạo cũ nhất", sortBy: "createdAt", order: "asc" },
  { id: "title", label: "Tên A → Z", sortBy: "title", order: "asc" },
  { id: "title-desc", label: "Tên Z → A", sortBy: "title", order: "desc" },
];

/** Folder colours offered first; any `#RRGGBB` is accepted. The first one is the backend's default (kraft). */
export const COLLECTION_COLORS: readonly { value: string; name: string }[] = [
  { value: "#D4A373", name: "Kraft" },
  { value: "#1A362B", name: "Xanh rừng" },
  { value: "#D4AF37", name: "Vàng nhũ" },
  { value: "#2563EB", name: "Xanh cobalt" },
  { value: "#FF6B6B", name: "San hô" },
  { value: "#FFD93D", name: "Vàng chanh" },
  { value: "#52796F", name: "Xanh xô thơm" },
  { value: "#BC6C25", name: "Đất nung" },
];

export const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

/** Relative luminance (WCAG) of a `#RRGGBB` colour. */
function luminance(hex: string): number {
  const channel = (offset: number) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

/** Espresso ink or white, whichever reads better on `hex`. */
export function readableInk(hex: string): "#1C1917" | "#FFFFFF" {
  if (!HEX_COLOR.test(hex)) return "#1C1917";
  const background = luminance(hex);
  const onDark = 1.05 / (background + 0.05);
  const onLight = (background + 0.05) / (luminance("#1C1917") + 0.05);
  return onDark >= onLight ? "#FFFFFF" : "#1C1917";
}

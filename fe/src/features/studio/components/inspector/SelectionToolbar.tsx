"use client";

import React, { useEffect, useState } from "react";
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalDistributeCenter,
  ArrowDownToLine,
  ArrowUpToLine,
  Copy,
  FlipHorizontal2,
  Group,
  Lock,
  SlidersHorizontal,
  Trash2,
  Ungroup,
  Unlock,
  type LucideIcon,
} from "lucide-react";
import {
  alignElements,
  canGroup,
  canMoveLayer,
  distributeElements,
  duplicateElements,
  groupElements,
  isBackground,
  moveLayer,
  newElementId,
  ungroupElements,
  type AlignMode,
  type CanvasElement,
} from "@wrapfit/shared";
import { buttonClass } from "@/components/ui";
import { cn } from "@/utils/helpers";
import { elementLabel } from "@/features/studio/utils/elementLabel";

interface SelectionToolbarProps {
  elements: CanvasElement[];
  selectedIds: string[];
  onChange(elements: CanvasElement[]): void;
  onSelect(ids: string[], primary?: string | null): void;
  /** Width and height of a face, for aligning one layer to its face. */
  faceSize(panelId: string): { width: number; height: number } | null;
  /** Opens the full settings of the layer (the "Lớp" rail). */
  onOpenSettings(): void;
}

const tool = buttonClass({ variant: "ghost", size: "icon-sm", shape: "rounded", className: "text-fg-muted hover:text-fg disabled:opacity-40" });

const ALIGN: { mode: AlignMode; icon: LucideIcon; label: string }[] = [
  { mode: "left", icon: AlignStartVertical, label: "Căn trái" },
  { mode: "center", icon: AlignCenterVertical, label: "Căn giữa theo chiều ngang" },
  { mode: "right", icon: AlignEndVertical, label: "Căn phải" },
  { mode: "top", icon: AlignStartHorizontal, label: "Căn trên" },
  { mode: "middle", icon: AlignCenterHorizontal, label: "Căn giữa theo chiều dọc" },
  { mode: "bottom", icon: AlignEndHorizontal, label: "Căn dưới" },
];

/** A number field in mm or degrees that commits on blur / Enter (typing "12," keeps working). */
function NumberCell({ label, unit, value, onCommit, disabled }: { label: string; unit: string; value: number; onCommit(value: number): void; disabled?: boolean }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const commit = () => {
    const next = Number(draft.replace(",", "."));
    if (Number.isFinite(next) && next !== value) onCommit(Math.round(next * 10) / 10);
    else setDraft(String(value));
  };
  return (
    <label className="flex h-9 items-center gap-1 rounded-control bg-surface-sunken px-2 text-caption text-fg-muted focus-within:ring-[3px] focus-within:ring-focus/40">
      <span className="font-semibold text-fg">{label}</span>
      <input
        type="text"
        inputMode="decimal"
        value={draft}
        disabled={disabled}
        aria-label={`${label} (${unit})`}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") setDraft(String(value));
        }}
        className="w-12 bg-transparent text-right font-mono tabular-nums text-fg outline-none disabled:opacity-50"
      />
      <span>{unit}</span>
    </label>
  );
}

/**
 * Toolbar of the selection, over the design (docs/23 S8, S12): the exact place, size and turn of one layer, or
 * aligning, spacing and grouping several. The full settings stay in the "Lớp" rail.
 */
export function SelectionToolbar({ elements, selectedIds, onChange, onSelect, faceSize, onOpenSettings }: SelectionToolbarProps) {
  const selected = elements.filter((el) => selectedIds.includes(el.id) && !isBackground(el));
  if (!selected.length) return null;
  const one = selected.length === 1 ? selected[0] : null;
  const ids = selected.map((el) => el.id);
  const face = faceSize(selected[0].panelId) ?? { width: 0, height: 0 };
  const sameFace = selected.every((el) => el.panelId === selected[0].panelId);
  const grouped = selected.some((el) => el.groupId);
  const update = (patch: Partial<CanvasElement>) => one && onChange(elements.map((el) => (el.id === one.id ? { ...el, ...patch } : el)));

  return (
    <div role="toolbar" aria-label="Lớp đang chọn" className="flex flex-wrap items-center gap-1.5 border-b border-line bg-surface-raised px-3 py-1.5">
      <span className="mr-1 max-w-[160px] truncate text-label font-semibold text-fg">{one ? elementLabel(one) : `${selected.length} lớp`}</span>

      {one && (
        <>
          <NumberCell label="X" unit="mm" value={one.x} disabled={one.locked} onCommit={(x) => update({ x })} />
          <NumberCell label="Y" unit="mm" value={one.y} disabled={one.locked} onCommit={(y) => update({ y })} />
          <NumberCell
            label="R"
            unit="mm"
            value={one.width}
            disabled={one.locked}
            onCommit={(width) => update({ width: Math.max(1, width), ...(one.dpi ? { dpi: Math.round((one.dpi * one.width) / Math.max(1, width)) } : {}) })}
          />
          <NumberCell
            label="C"
            unit="mm"
            value={one.height}
            disabled={one.locked}
            onCommit={(height) => update({ height: Math.max(1, height) })}
          />
          <NumberCell label="Xoay" unit="°" value={one.rotation || 0} disabled={one.locked} onCommit={(rotation) => update({ rotation: ((((rotation + 180) % 360) + 360) % 360) - 180 })} />
          <span className="mx-1 h-6 w-px bg-line" aria-hidden />
        </>
      )}

      {sameFace && (
        <div role="group" aria-label={selected.length > 1 ? "Căn các lớp với nhau" : "Căn với mặt hộp"} className="flex items-center">
          {ALIGN.map(({ mode, icon: Icon, label }) => (
            <button key={mode} type="button" className={tool} aria-label={label} title={selected.length > 1 ? label : `${label} mặt hộp`} onClick={() => onChange(alignElements(elements, ids, mode, face))}>
              <Icon className="size-4" aria-hidden />
            </button>
          ))}
          {selected.length > 2 && (
            <>
              <button type="button" className={tool} aria-label="Phân bố đều theo chiều ngang" title="Phân bố đều theo chiều ngang" onClick={() => onChange(distributeElements(elements, ids, "x"))}>
                <AlignHorizontalDistributeCenter className="size-4" aria-hidden />
              </button>
              <button type="button" className={tool} aria-label="Phân bố đều theo chiều dọc" title="Phân bố đều theo chiều dọc" onClick={() => onChange(distributeElements(elements, ids, "y"))}>
                <AlignVerticalDistributeCenter className="size-4" aria-hidden />
              </button>
            </>
          )}
        </div>
      )}
      <span className="mx-1 h-6 w-px bg-line" aria-hidden />

      {selected.length > 1 && (
        <>
          {canGroup(elements, ids) && !selected.every((el) => el.groupId && el.groupId === selected[0].groupId) && (
            <button type="button" className={buttonClass({ variant: "ghost", size: "sm", shape: "rounded" })} title="Nhóm · Ctrl+G" onClick={() => onChange(groupElements(elements, ids, newElementId("group")))}>
              <Group className="size-4" aria-hidden />
              Nhóm
            </button>
          )}
          {grouped && (
            <button type="button" className={buttonClass({ variant: "ghost", size: "sm", shape: "rounded" })} title="Bỏ nhóm · Ctrl+Shift+G" onClick={() => onChange(ungroupElements(elements, ids))}>
              <Ungroup className="size-4" aria-hidden />
              Bỏ nhóm
            </button>
          )}
        </>
      )}

      {one && (
        <>
          <button type="button" className={tool} aria-label="Lên trên cùng" title="Lên trên cùng · Ctrl+Shift+]" disabled={!canMoveLayer(elements, one.id, "front")} onClick={() => onChange(moveLayer(elements, one.id, "front"))}>
            <ArrowUpToLine className="size-4" aria-hidden />
          </button>
          <button type="button" className={tool} aria-label="Xuống dưới cùng" title="Xuống dưới cùng · Ctrl+Shift+[" disabled={!canMoveLayer(elements, one.id, "back")} onClick={() => onChange(moveLayer(elements, one.id, "back"))}>
            <ArrowDownToLine className="size-4" aria-hidden />
          </button>
          <button type="button" className={cn(tool, one.flipX && "text-accent-fg")} aria-pressed={!!one.flipX} aria-label="Lật ngang" title="Lật ngang" onClick={() => update({ flipX: !one.flipX || undefined })}>
            <FlipHorizontal2 className="size-4" aria-hidden />
          </button>
          <button type="button" className={cn(tool, one.locked && "text-accent-fg")} aria-pressed={!!one.locked} aria-label={one.locked ? "Mở khóa" : "Khóa lớp"} title={one.locked ? "Mở khóa" : "Khóa lớp"} onClick={() => update({ locked: !one.locked || undefined })}>
            {one.locked ? <Lock className="size-4" aria-hidden /> : <Unlock className="size-4" aria-hidden />}
          </button>
        </>
      )}
      <button
        type="button"
        className={tool}
        aria-label="Nhân bản (Ctrl+D)"
        title="Nhân bản · Ctrl+D"
        onClick={() => {
          const result = duplicateElements(elements, ids, (el) => newElementId(el.type));
          onChange(result.elements);
          onSelect(result.ids);
        }}
      >
        <Copy className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        className={tool}
        aria-label="Xóa (Delete)"
        title="Xóa · Delete"
        disabled={selected.every((el) => el.locked)}
        onClick={() => {
          onChange(elements.filter((el) => !ids.includes(el.id) || el.locked));
          onSelect([], null);
        }}
      >
        <Trash2 className="size-4" aria-hidden />
      </button>
      {one && (
        <button type="button" className={buttonClass({ variant: "ghost", size: "sm", shape: "rounded", className: "ml-auto" })} onClick={onOpenSettings}>
          <SlidersHorizontal className="size-4" aria-hidden />
          Thuộc tính
        </button>
      )}
    </div>
  );
}

"use client";

import React, { useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpToLine,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  Image as ImageIcon,
  Lock,
  QrCode,
  Shapes,
  Sticker,
  Trash2,
  Type,
  Unlock,
  type LucideIcon,
} from "lucide-react";
import {
  canMoveLayer,
  duplicateElements,
  isBackground,
  layerStack,
  moveLayer,
  newElementId,
  parseLibraryArt,
  reorderLayers,
  type CanvasElement,
  type LayerMove,
  type PrintSide,
} from "@wrapfit/shared";
import { buttonClass } from "@/components/ui";
import { cn } from "@/utils/helpers";
import { elementLabel } from "@/features/studio/utils/elementLabel";

export interface LayerFace {
  id: string;
  name: string;
}

interface LayersPanelProps {
  elements: CanvasElement[];
  onChange(elements: CanvasElement[]): void;
  selectedId: string | null;
  onSelect(id: string | null): void;
  /** Faces of the box (every piece), in dieline order. */
  faces: LayerFace[];
  /** Face whose layers are listed. */
  faceId: string;
  onFaceChange(id: string): void;
  side?: PrintSide;
  readOnly?: boolean;
}

const ICONS: Record<CanvasElement["type"], LucideIcon> = {
  text: Type,
  image: ImageIcon,
  logo: ImageIcon,
  pattern: ImageIcon,
  barcode: QrCode,
  shape: Shapes,
};

const iconOf = (el: CanvasElement): LucideIcon => (parseLibraryArt(el.content) ? Sticker : ICONS[el.type] ?? ImageIcon);

/** New id for a copy, unique within the design. */
export const copyId = (el: CanvasElement) => newElementId(el.type);

const toolButton = buttonClass({ variant: "ghost", size: "icon-sm", shape: "rounded", className: "text-fg-muted hover:text-fg disabled:opacity-40" });

/**
 * Layers of one face (docs/23 S2), top layer first like Canva: select, drag to reorder, show / hide, lock, rename,
 * move up or down, duplicate, delete. Backgrounds stay at the bottom: they can be hidden, never moved.
 */
export function LayersPanel({ elements, onChange, selectedId, onSelect, faces, faceId, onFaceChange, side = "outside", readOnly }: LayersPanelProps) {
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [dragging, setDragging] = useState<string | null>(null);

  const face = faces.find((f) => f.id === faceId) ?? faces[0];
  const stack = useMemo(() => (face ? layerStack(elements, face.id, side) : []), [elements, face, side]);
  const artwork = stack.filter((el) => !isBackground(el)).reverse(); // top first
  const backgrounds = stack.filter(isBackground);
  const selected = elements.find((el) => el.id === selectedId) ?? null;

  const update = (id: string, patch: Partial<CanvasElement>) => onChange(elements.map((el) => (el.id === id ? { ...el, ...patch } : el)));
  const move = (id: string, how: LayerMove) => onChange(moveLayer(elements, id, how));
  const commitRename = () => {
    if (renaming) update(renaming, { name: draft.trim() || undefined });
    setRenaming(null);
  };

  const dropOn = (targetId: string) => {
    if (!dragging || dragging === targetId) return;
    // Rows are listed top first; the stack is painted bottom first.
    const order = artwork.map((el) => el.id).filter((id) => id !== dragging);
    order.splice(order.indexOf(targetId), 0, dragging);
    onChange(reorderLayers(elements, [...order].reverse()));
    setDragging(null);
  };

  const row = (el: CanvasElement, background: boolean) => {
    const Icon = iconOf(el);
    const isSelected = el.id === selectedId;
    const label = background ? `Nền · ${elementLabel(el)}` : elementLabel(el);
    return (
      <li
        key={el.id}
        draggable={!background && !readOnly && renaming !== el.id}
        onDragStart={(e) => {
          setDragging(el.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragOver={(e) => {
          if (dragging && !background) e.preventDefault();
        }}
        onDrop={(e) => {
          e.preventDefault();
          dropOn(el.id);
        }}
        onDragEnd={() => setDragging(null)}
        className={cn(
          "group flex min-h-11 items-center gap-1 rounded-control pr-1 ring-1 ring-inset transition-colors",
          isSelected ? "bg-accent-bg ring-accent" : "ring-transparent hover:bg-surface-sunken",
          dragging === el.id && "opacity-50",
          el.hidden && "text-fg-muted"
        )}
      >
        {!background && !readOnly ? (
          <GripVertical className="ml-1 size-4 shrink-0 cursor-grab text-fg-muted" aria-hidden />
        ) : (
          <span className="ml-1 size-4 shrink-0" aria-hidden />
        )}
        {renaming === el.id ? (
          <input
            autoFocus
            value={draft}
            maxLength={80}
            aria-label="Tên lớp"
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") setRenaming(null);
            }}
            className="min-w-0 flex-1 rounded-control border border-line-strong bg-surface-raised px-2 py-1 text-body-sm text-fg outline-none focus-visible:ring-[3px] focus-visible:ring-focus/40"
          />
        ) : (
          <button
            type="button"
            onClick={() => onSelect(background ? null : el.id)}
            onDoubleClick={() => {
              if (readOnly || background) return;
              setDraft(el.name ?? "");
              setRenaming(el.id);
            }}
            aria-pressed={isSelected}
            title={background ? "Nền gắn với mặt: chỉnh ở “Màu & nền”" : "Bấm để chọn, bấm đúp để đổi tên"}
            className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-control px-1 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-focus/40"
          >
            <Icon className="size-4 shrink-0 text-fg-muted" aria-hidden />
            <span className={cn("truncate text-body-sm", el.hidden && "line-through")}>{label}</span>
            {el.finish && <span className="shrink-0 rounded-full bg-warning-bg px-1.5 text-caption text-warning-fg">Hoàn thiện</span>}
          </button>
        )}
        {!readOnly && (
          <>
            <button
              type="button"
              className={toolButton}
              aria-pressed={!el.hidden}
              aria-label={el.hidden ? `Hiện ${label}` : `Ẩn ${label}`}
              title={el.hidden ? "Hiện lớp" : "Ẩn lớp (không in)"}
              onClick={() => update(el.id, { hidden: !el.hidden || undefined })}
            >
              {el.hidden ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
            </button>
            {!background && (
              <button
                type="button"
                className={toolButton}
                aria-pressed={!!el.locked}
                aria-label={el.locked ? `Mở khóa ${label}` : `Khóa ${label}`}
                title={el.locked ? "Mở khóa" : "Khóa: không kéo, không xóa nhầm"}
                onClick={() => update(el.id, { locked: !el.locked || undefined })}
              >
                {el.locked ? <Lock className="size-4" aria-hidden /> : <Unlock className="size-4" aria-hidden />}
              </button>
            )}
          </>
        )}
      </li>
    );
  };

  return (
    <div className="space-y-4">
      <label className="block space-y-1.5">
        <span className="text-label text-fg">Mặt hộp</span>
        <select
          value={face?.id ?? ""}
          onChange={(e) => onFaceChange(e.target.value)}
          className="h-control w-full rounded-control border border-line-strong bg-surface-raised px-3 text-body-sm text-fg outline-none focus-visible:ring-[3px] focus-visible:ring-focus/40"
        >
          {faces.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </label>

      {artwork.length + backgrounds.length === 0 ? (
        <p className="rounded-panel bg-surface-sunken px-4 py-3 text-caption leading-5 text-fg-muted">
          Mặt này chưa có lớp nào. Thêm chữ, hình khối, tem hoặc ảnh từ thanh bên trái.
        </p>
      ) : (
        <ul aria-label={`Các lớp của ${face?.name ?? "mặt"}, lớp trên cùng đầu tiên`} className="space-y-1">
          {artwork.map((el) => row(el, false))}
          {backgrounds.map((el) => row(el, true))}
        </ul>
      )}

      {selected && !isBackground(selected) && !readOnly && (
        <div role="toolbar" aria-label="Thứ tự và thao tác lớp đang chọn" className="flex flex-wrap items-center gap-1 rounded-panel bg-surface-sunken p-1.5">
          {(
            [
              ["front", ArrowUpToLine, "Lên trên cùng", "Ctrl+Shift+]"],
              ["forward", ChevronUp, "Lên một lớp", "Ctrl+]"],
              ["backward", ChevronDown, "Xuống một lớp", "Ctrl+["],
              ["back", ArrowDownToLine, "Xuống dưới cùng", "Ctrl+Shift+["],
            ] as const
          ).map(([how, Icon, label, keys]) => (
            <button
              key={how}
              type="button"
              className={toolButton}
              disabled={!canMoveLayer(elements, selected.id, how)}
              onClick={() => move(selected.id, how)}
              aria-label={`${label} (${keys})`}
              title={`${label} · ${keys}`}
            >
              <Icon className="size-4" aria-hidden />
            </button>
          ))}
          <span className="mx-1 h-5 w-px bg-line" aria-hidden />
          <button
            type="button"
            className={toolButton}
            onClick={() => {
              const result = duplicateElements(elements, [selected.id], copyId);
              onChange(result.elements);
              onSelect(result.ids[0] ?? null);
            }}
            aria-label="Nhân bản (Ctrl+D)"
            title="Nhân bản · Ctrl+D"
          >
            <Copy className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            className={toolButton}
            disabled={!!selected.locked}
            onClick={() => {
              onChange(elements.filter((el) => el.id !== selected.id));
              onSelect(null);
            }}
            aria-label="Xóa lớp (Delete)"
            title={selected.locked ? "Lớp đang khóa" : "Xóa · Delete"}
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        </div>
      )}

      <p className="text-caption leading-5 text-fg-muted">
        Kéo lớp để đổi thứ tự trước/sau. Alt + bấm trên khung thiết kế để chọn lớp nằm dưới. Lớp ẩn không được in.
      </p>
    </div>
  );
}

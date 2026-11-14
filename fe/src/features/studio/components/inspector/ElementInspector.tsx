"use client";

import React, { createContext, useContext } from "react";
import { SvgColors } from "./SvgColors";
import { ImageAiTools, takesImageTools } from "../ai-image/ImageAiTools";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowRight,
  Bold,
  Circle,
  FlipHorizontal2,
  FlipVertical2,
  Hexagon,
  ImageUp,
  Pipette,
  Italic,
  Minus,
  Square,
  Star,
  Underline,
  type LucideIcon,
} from "lucide-react";
import {
  cmykToHex,
  DEFAULT_SHAPE_FILL,
  ELEMENT_FINISHES,
  FINISH_SPOTS,
  hexToCmyk,
  outOfPrintGamut,
  printSafeColor,
  DEFAULT_SHAPE_STROKE,
  hasItalic,
  imageDraw,
  parseLibraryArt,
  PRINT_FONTS,
  PRODUCT_LABEL_LINES,
  printFontOf,
  safeMarginsOf,
  SHAPE_KINDS,
  type CanvasElement,
  type CanvasElementStyle,
  type CustomFont,
  type Cmyk,
  type ElementFinish,
  type DielineGeometry,
  type PanelFace,
  type PrintFontId,
  type ShapeKind,
} from "@wrapfit/shared";
import { buttonClass, NumberStepper } from "@/components/ui";
import { cn } from "@/utils/helpers";
import { useImageSize } from "../canvas/elementVisuals";

/** Fonts uploaded for the design (docs/23 S13), offered in the font menu after the built-in ones. */
export const CustomFontsContext = createContext<CustomFont[]>([]);

/** Colours already used in the design, offered as swatches in every colour field (docs/23 S11). */
export const DesignColorsContext = createContext<string[]>([]);

/** The colours of a design: texts, fills, borders and gradient stops, most used first. */
export function designColorsOf(elements: CanvasElement[]): string[] {
  const counts = new Map<string, number>();
  const add = (color: string | undefined) => {
    if (!color || !/^#[0-9a-f]{6}/i.test(color)) return;
    const key = color.slice(0, 7).toUpperCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  };
  for (const el of elements) {
    add(el.style?.color);
    add(el.style?.fillColor);
    add(el.style?.strokeColor);
    el.style?.gradient?.stops.forEach((stop) => add(stop.color));
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([color]) => color).slice(0, 12);
}

type EyeDropperApi = { open(): Promise<{ sRGBHex: string }> };

const SHAPE_ICONS: Record<ShapeKind, LucideIcon> = {
  rect: Square,
  ellipse: Circle,
  line: Minus,
  arrow: ArrowRight,
  star: Star,
  polygon: Hexagon,
  frame: Square,
};

const FONT_CHOICES: { id: PrintFontId; css: string }[] = (Object.keys(PRINT_FONTS) as PrintFontId[]).map((id) => ({
  id,
  css: `'${PRINT_FONTS[id]}', ${id === "playfair-display" || id === "cormorant-garamond" ? "serif" : "sans-serif"}`,
}));

const toggle = (on: boolean) =>
  buttonClass({ variant: on ? "outline" : "ghost", size: "icon", shape: "rounded", className: cn(on && "bg-accent-bg text-accent-fg") });
const fieldClass =
  "h-control w-full rounded-control border border-line-strong bg-surface-raised px-3 text-body-sm text-fg outline-none focus-visible:ring-[3px] focus-visible:ring-focus/40";

interface PrintColor {
  cmyk?: Cmyk;
  pantone?: string;
  /** CMYK typed by the user (undefined clears it), with the screen colour it displays as. */
  onCmyk(cmyk: Cmyk | undefined, hex?: string): void;
  onPantone(note: string | undefined): void;
}

const CMYK_INKS = ["C", "M", "Y", "K"] as const;

function ColorField({ label, value, onChange, print }: { label: string; value: string; onChange(value: string): void; print?: PrintColor }) {
  const vivid = !!print && !print.cmyk && outOfPrintGamut(value);
  const swatches = useContext(DesignColorsContext);
  const cmyk = print?.cmyk ?? hexToCmyk(value);
  return (
    <div className="space-y-2">
      <label className="flex items-center justify-between gap-3">
        <span className="text-label text-fg">{label}</span>
        <span className="flex items-center gap-2">
          <span className="font-mono text-caption uppercase tabular-nums text-fg-muted">{print?.cmyk ? `CMYK ${print.cmyk.join("/")}` : value}</span>
          {typeof window !== "undefined" && "EyeDropper" in window && (
            <button
              type="button"
              className={buttonClass({ variant: "ghost", size: "icon-sm", shape: "rounded" })}
              aria-label={`${label}: lấy màu trên màn hình`}
              title="Ống hút màu: lấy một màu bất kỳ trên màn hình"
              onClick={async () => {
                try {
                  const Picker = (window as unknown as { EyeDropper: new () => EyeDropperApi }).EyeDropper;
                  const result = await new Picker().open();
                  onChange(result.sRGBHex.slice(0, 7).toUpperCase());
                } catch {
                  // closed without picking
                }
              }}
            >
              <Pipette className="size-4" aria-hidden />
            </button>
          )}
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            aria-label={label}
            className="size-10 cursor-pointer rounded-control border border-line-strong bg-surface-raised p-1"
          />
        </span>
      </label>
      {swatches.length > 0 && (
        <div role="group" aria-label={`${label}: màu trong thiết kế`} className="flex flex-wrap gap-1.5">
          {swatches.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={`Dùng màu ${color}`}
              aria-pressed={color === value.toUpperCase()}
              title={color}
              onClick={() => onChange(color)}
              className={cn("size-7 rounded-full ring-1 ring-inset ring-line-strong focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-focus/40", color === value.toUpperCase() && "ring-2 ring-fg")}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      )}
      {vivid && (
        <p role="status" className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-control bg-warning-bg px-3 py-2 text-caption text-warning-fg">
          Màu này nằm ngoài dải màu in CMYK, khi in sẽ xỉn hơn màn hình.
          <button type="button" className={buttonClass({ variant: "link", className: "text-caption" })} onClick={() => onChange(printSafeColor(value))}>
            Dùng màu in gần nhất
          </button>
        </p>
      )}
      {print && (
        <details className="group rounded-control bg-surface-raised px-3 py-2 ring-1 ring-inset ring-line">
          <summary className="cursor-pointer text-caption font-semibold text-fg">Màu in (CMYK, Pantone)</summary>
          <div className="mt-2 space-y-2">
            <div className="grid grid-cols-4 gap-2">
              {CMYK_INKS.map((ink, index) => (
                <label key={ink} className="space-y-1 text-center">
                  <span className="block text-caption font-semibold text-fg-muted">{ink}</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    inputMode="numeric"
                    value={cmyk[index]}
                    aria-label={`${label}: mực ${ink} (%)`}
                    onChange={(e) => {
                      const next = [...cmyk] as Cmyk;
                      next[index] = Math.min(100, Math.max(0, Math.round(Number(e.target.value) || 0)));
                      print.onCmyk(next, cmykToHex(next));
                    }}
                    className="h-control w-full rounded-control border border-line-strong bg-surface-raised px-1 text-center font-mono text-body-sm tabular-nums text-fg outline-none focus-visible:ring-[3px] focus-visible:ring-focus/40"
                  />
                </label>
              ))}
            </div>
            {print.cmyk && (
              <button type="button" className={buttonClass({ variant: "link", className: "text-caption" })} onClick={() => print.onCmyk(undefined)}>
                Bỏ CMYK, in theo màu màn hình
              </button>
            )}
            <label className="block space-y-1">
              <span className="text-caption text-fg-muted">Mã Pantone (ghi chú cho xưởng in)</span>
              <input
                type="text"
                maxLength={40}
                placeholder="VD: 7406 C"
                value={print.pantone ?? ""}
                onChange={(e) => print.onPantone(e.target.value.replace(/[^\p{L}\p{N} ._-]/gu, "") || undefined)}
                className="h-control w-full rounded-control border border-line-strong bg-surface-raised px-3 text-body-sm text-fg outline-none focus-visible:ring-[3px] focus-visible:ring-focus/40"
              />
            </label>
            <p className="text-caption leading-5 text-fg-muted">
              WrapFit không có bảng màu Pantone: mã này chỉ là ghi chú để xưởng pha mực đúng màu bạn cần.
            </p>
          </div>
        </details>
      )}
    </div>
  );
}

/** A stepper with its name shown on the left (NumberStepper only reads it to screen readers). */
function Stepper(props: React.ComponentProps<typeof NumberStepper>) {
  return (
    <div className="space-y-1.5">
      <span className="block text-label text-fg">{props.label}</span>
      <NumberStepper {...props} className="w-full" />
    </div>
  );
}

/**
 * A new shape for the "Hình khối" rail: centred on the face, inside its safe area, 40 % of the smaller side.
 */
export function newShape(kind: ShapeKind, panel: PanelFace, geometry: DielineGeometry, id: string): CanvasElement {
  const m = safeMarginsOf(panel, geometry);
  const roomW = Math.max(10, panel.bounds.width - m.left - m.right);
  const roomH = Math.max(10, panel.bounds.height - m.top - m.bottom);
  const side = Math.round(Math.min(roomW, roomH) * 0.4);
  const width = kind === "line" || kind === "arrow" ? Math.round(Math.min(roomW * 0.6, side * 1.8)) : side;
  const height = kind === "line" ? 4 : kind === "arrow" ? Math.round(side * 0.5) : side;
  const style: CanvasElementStyle =
    kind === "line" || kind === "frame" ? { strokeColor: DEFAULT_SHAPE_STROKE, strokeWidth: kind === "line" ? 1 : 1.5 } : { fillColor: DEFAULT_SHAPE_FILL };
  return {
    id,
    type: "shape",
    panelId: panel.id,
    x: Math.round(m.left + (roomW - width) / 2),
    y: Math.round(m.top + (roomH - height) / 2),
    width,
    height,
    rotation: 0,
    content: "",
    shape: { kind, ...(kind === "star" ? { points: 5, innerRatio: 0.45 } : kind === "polygon" ? { points: 6 } : {}) },
    style,
  };
}

/** The 7 shapes of the rail: each button adds one to the face that receives new elements. */
export function ShapePicker({ onPick, disabled }: { onPick(kind: ShapeKind): void; disabled?: boolean }) {
  return (
    <ul className="grid grid-cols-3 gap-2" aria-label="Hình khối">
      {SHAPE_KINDS.map(({ kind, name }) => {
        const Icon = SHAPE_ICONS[kind];
        return (
          <li key={kind}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onPick(kind)}
              className="flex min-h-20 w-full flex-col items-center justify-center gap-1.5 rounded-panel bg-surface-sunken text-caption text-fg ring-1 ring-inset ring-transparent transition hover:ring-fg disabled:opacity-50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-focus/40"
            >
              <Icon className={cn("size-7", kind === "frame" ? "text-fg" : "fill-fpt-orange text-fpt-orange-ink")} strokeWidth={kind === "frame" ? 2.5 : 1.5} aria-hidden />
              {name}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

interface InspectorProps {
  element: CanvasElement;
  onChange(element: CanvasElement): void;
  /** Applies the font of this text to every text of the design. */
  onApplyFontToAll?(fontFamily: string): void;
  /** Picks another file for this photo, keeping its frame (docs/23 S10). */
  onReplaceImage?(elementId: string): void;
}

/** Common settings of every element: opacity, mirror. */
function CommonControls({ element, onChange }: InspectorProps) {
  const opacity = Math.round((element.style?.opacity ?? 1) * 100);
  return (
    <div className="space-y-3">
      {element.type !== "barcode" && (
        <label className="block space-y-1.5">
          <span className="text-label text-fg">Hoàn thiện in</span>
          <select
            value={element.finish ?? ""}
            onChange={(e) => onChange({ ...element, finish: (e.target.value || undefined) as ElementFinish | undefined })}
            className={fieldClass}
          >
            <option value="">Không (in màu thường)</option>
            {ELEMENT_FINISHES.map((finish) => (
              <option key={finish} value={finish}>
                {FINISH_SPOTS[finish].label}
              </option>
            ))}
          </select>
          {element.finish && (
            <span className="block text-caption leading-5 text-fg-muted">
              Xuất thành lớp riêng “{FINISH_SPOTS[element.finish].name}” trong file in; báo giá tự cộng tiền làm khuôn.
            </span>
          )}
        </label>
      )}
      <Stepper
        label="Độ trong suốt"
        unit="%"
        min={5}
        max={100}
        step={5}
        value={opacity}
        onChange={(value) => onChange({ ...element, style: { ...element.style, opacity: value >= 100 ? undefined : value / 100 } })}
      />
      <div className="flex items-center gap-1" role="group" aria-label="Lật">
        <span className="mr-auto text-label text-fg">Lật</span>
        <button type="button" className={toggle(!!element.flipX)} aria-pressed={!!element.flipX} aria-label="Lật ngang" title="Lật ngang" onClick={() => onChange({ ...element, flipX: !element.flipX || undefined })}>
          <FlipHorizontal2 className="size-4" aria-hidden />
        </button>
        <button type="button" className={toggle(!!element.flipY)} aria-pressed={!!element.flipY} aria-label="Lật dọc" title="Lật dọc" onClick={() => onChange({ ...element, flipY: !element.flipY || undefined })}>
          <FlipVertical2 className="size-4" aria-hidden />
        </button>
      </div>
      <AnchorField element={element} onChange={onChange} />
    </div>
  );
}

const ANCHOR_H = { left: "Trái", center: "Giữa", right: "Phải", stretch: "Giãn theo mặt" } as const;
const ANCHOR_V = { top: "Trên", middle: "Giữa", bottom: "Dưới", stretch: "Giãn theo mặt" } as const;

/**
 * "Neo khi đổi kích thước" (docs/23 S20): where the element stays on its face when the box is resized. Automatic
 * (no anchor) follows the third of the face the element sits in.
 */
function AnchorField({ element, onChange }: Pick<InspectorProps, "element" | "onChange">) {
  const anchor = element.anchor;
  const set = (h: string, v: string) =>
    onChange({
      ...element,
      anchor: !h && !v ? undefined : { h: (h || "center") as keyof typeof ANCHOR_H, v: (v || "middle") as keyof typeof ANCHOR_V },
    });
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-label text-fg">Neo khi đổi kích thước hộp</legend>
      <div className="grid grid-cols-2 gap-2">
        <select aria-label="Neo ngang" value={anchor?.h ?? ""} onChange={(e) => set(e.target.value, anchor?.v ?? "")} className={fieldClass}>
          <option value="">Ngang: tự động</option>
          {Object.entries(ANCHOR_H).map(([value, label]) => (
            <option key={value} value={value}>
              Ngang: {label}
            </option>
          ))}
        </select>
        <select aria-label="Neo dọc" value={anchor?.v ?? ""} onChange={(e) => set(anchor?.h ?? "", e.target.value)} className={fieldClass}>
          <option value="">Dọc: tự động</option>
          {Object.entries(ANCHOR_V).map(([value, label]) => (
            <option key={value} value={value}>
              Dọc: {label}
            </option>
          ))}
        </select>
      </div>
    </fieldset>
  );
}

/** Settings of one text (docs/23 S4): font, size, weight, slant, underline, alignment, line height, case, colour. */
export function TextInspector({ element, onChange, onApplyFontToAll }: InspectorProps) {
  const style = element.style ?? {};
  const font = printFontOf(style.fontFamily);
  const set = (patch: Partial<CanvasElementStyle>) => onChange({ ...element, style: { ...style, ...patch } });
  const customFonts = useContext(CustomFontsContext);
  // An uploaded font is one face: no bold / italic switches (docs/23 S13).
  const uploaded = !!style.fontUrl;
  const bold = !uploaded && style.fontWeight !== 400;
  const italic = !uploaded && style.fontStyle === "italic";
  const underline = style.textDecoration === "underline";
  const align = style.textAlign ?? "center";
  return (
    <div className="space-y-4">
      <label className="block space-y-1.5">
        <span className="text-label text-fg">Phông chữ</span>
        <select
          value={style.fontUrl ? `url:${style.fontUrl}` : font}
          onChange={(e) => {
            if (e.target.value.startsWith("url:")) {
              const url = e.target.value.slice(4);
              const custom = customFonts.find((f) => f.url === url);
              if (custom) set({ fontFamily: `'${custom.family}', sans-serif`, fontUrl: url, fontWeight: undefined, fontStyle: undefined });
              return;
            }
            const next = FONT_CHOICES.find((f) => f.id === e.target.value)!;
            set({ fontFamily: next.css, fontUrl: undefined, ...(hasItalic(next.id) ? {} : { fontStyle: undefined }) });
          }}
          className={fieldClass}
        >
          <optgroup label="Phông in sẵn">
            {FONT_CHOICES.map((f) => (
              <option key={f.id} value={f.id}>
                {PRINT_FONTS[f.id]}
              </option>
            ))}
          </optgroup>
          {customFonts.length > 0 && (
            <optgroup label="Phông của bạn">
              {customFonts.map((f) => (
                <option key={f.url} value={`url:${f.url}`}>
                  {f.family}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </label>
      {onApplyFontToAll && (
        <button type="button" className={buttonClass({ variant: "link", className: "text-caption" })} onClick={() => onApplyFontToAll(FONT_CHOICES.find((f) => f.id === font)!.css)}>
          Dùng phông này cho mọi chữ trong thiết kế
        </button>
      )}
      <Stepper
        label="Cỡ chữ"
        unit="pt"
        min={4}
        max={200}
        step={1}
        value={Math.round(style.fontSize ?? 12)}
        onChange={(fontSize) => {
          // The box grows or shrinks with the text around its centre, so the lines break where they did (like Canva).
          const ratio = fontSize / (style.fontSize ?? 12);
          const width = Math.round(element.width * ratio * 10) / 10;
          const height = Math.round(element.height * ratio * 10) / 10;
          onChange({
            ...element,
            x: Math.round((element.x + (element.width - width) / 2) * 10) / 10,
            y: Math.round((element.y + (element.height - height) / 2) * 10) / 10,
            width,
            height,
            style: { ...style, fontSize },
          });
        }}
      />
      <div className="flex flex-wrap items-center gap-1" role="toolbar" aria-label="Kiểu chữ">
        <button type="button" className={toggle(bold)} aria-pressed={bold} disabled={uploaded} aria-label="Chữ đậm" title={uploaded ? "Phông tải lên chỉ có một kiểu" : "Đậm"} onClick={() => set({ fontWeight: bold ? 400 : undefined })}>
          <Bold className="size-4" aria-hidden />
        </button>
        <button
          type="button"
          className={toggle(italic)}
          aria-pressed={italic}
          disabled={uploaded || !hasItalic(font)}
          aria-label="Chữ nghiêng"
          title={hasItalic(font) ? "Nghiêng" : "Phông này không có kiểu nghiêng"}
          onClick={() => set({ fontStyle: italic ? undefined : "italic" })}
        >
          <Italic className="size-4" aria-hidden />
        </button>
        <button type="button" className={toggle(underline)} aria-pressed={underline} aria-label="Gạch chân" title="Gạch chân" onClick={() => set({ textDecoration: underline ? undefined : "underline" })}>
          <Underline className="size-4" aria-hidden />
        </button>
        <span className="mx-1 h-6 w-px bg-line" aria-hidden />
        {(
          [
            ["left", AlignLeft, "Căn trái"],
            ["center", AlignCenter, "Căn giữa"],
            ["right", AlignRight, "Căn phải"],
          ] as const
        ).map(([value, Icon, label]) => (
          <button key={value} type="button" className={toggle(align === value)} aria-pressed={align === value} aria-label={label} title={label} onClick={() => set({ textAlign: value === "center" ? undefined : value })}>
            <Icon className="size-4" aria-hidden />
          </button>
        ))}
      </div>
      <Stepper
        label="Giãn dòng"
        unit="×"
        min={0.8}
        max={3}
        step={0.1}
        value={Number((style.lineHeight ?? 1.2).toFixed(1))}
        onChange={(lineHeight) => set({ lineHeight })}
      />
      <Stepper
        label="Giãn chữ"
        unit="‰"
        min={-100}
        max={800}
        step={10}
        value={Math.round(style.letterSpacing ?? 0)}
        onChange={(letterSpacing) => set({ letterSpacing: letterSpacing || undefined })}
      />
      <Stepper
        label="Uốn cong (0 = thẳng, âm = võng xuống)"
        unit="°"
        min={-360}
        max={360}
        step={15}
        value={Math.round(style.curve ?? 0)}
        onChange={(curve) => set({ curve: curve || undefined })}
      />
      <label className="block space-y-1.5">
        <span className="text-label text-fg">Chữ hoa / thường</span>
        <select
          value={style.textTransform ?? "none"}
          onChange={(e) => set({ textTransform: e.target.value === "none" ? undefined : (e.target.value as "uppercase" | "lowercase") })}
          className={fieldClass}
        >
          <option value="none">Giữ nguyên</option>
          <option value="uppercase">VIẾT HOA</option>
          <option value="lowercase">viết thường</option>
        </select>
      </label>
      <ColorField
        label="Màu chữ"
        value={(style.color ?? "#1C1917").slice(0, 7)}
        onChange={(color) => set({ color, cmyk: undefined })}
        print={{
          cmyk: style.cmyk,
          pantone: style.pantoneNote,
          onCmyk: (cmyk, hex) => set({ cmyk, ...(hex ? { color: hex } : {}) }),
          onPantone: (pantoneNote) => set({ pantoneNote }),
        }}
      />
      <ColorField
        label="Viền chữ"
        value={(style.strokeColor ?? "#FFFFFF").slice(0, 7)}
        onChange={(strokeColor) => set({ strokeColor, strokeWidth: style.strokeWidth || 0.3 })}
      />
      <Stepper
        label="Độ dày viền chữ (0 = không viền)"
        unit="mm"
        min={0}
        max={3}
        step={0.1}
        value={Number((style.strokeWidth ?? 0).toFixed(1))}
        onChange={(strokeWidth) => set({ strokeWidth: strokeWidth || undefined, ...(strokeWidth && !style.strokeColor ? { strokeColor: "#FFFFFF" } : {}) })}
      />
      <CommonControls element={element} onChange={onChange} />
    </div>
  );
}

/** Settings of one shape: fill, border, corner radius or number of points. */
export function ShapeInspector({ element, onChange }: InspectorProps) {
  const style = element.style ?? {};
  const shape = element.shape ?? { kind: "rect" as ShapeKind };
  const set = (patch: Partial<CanvasElementStyle>) => onChange({ ...element, style: { ...style, ...patch } });
  const stroked = shape.kind === "line" || shape.kind === "frame";
  return (
    <div className="space-y-4">
      {!stroked && (
        <ColorField
          label="Màu nền"
          value={(style.fillColor ?? DEFAULT_SHAPE_FILL).slice(0, 7)}
          onChange={(fillColor) =>
            set({
              fillColor,
              cmyk: undefined,
              ...(style.gradient ? { gradient: { ...style.gradient, stops: [{ offset: 0, color: fillColor }, ...style.gradient.stops.slice(1)] } } : {}),
            })
          }
          print={{
            cmyk: style.cmyk,
            pantone: style.pantoneNote,
            onCmyk: (cmyk, hex) => set({ cmyk, ...(hex ? { fillColor: hex } : {}) }),
            onPantone: (pantoneNote) => set({ pantoneNote }),
          }}
        />
      )}
      {!stroked && (
        <div className="space-y-2">
          <label className="flex items-center justify-between gap-3">
            <span className="text-label text-fg">Màu chuyển</span>
            <input
              type="checkbox"
              checked={!!style.gradient}
              onChange={(e) =>
                set({
                  gradient: e.target.checked
                    ? { type: "linear", angle: 90, stops: [{ offset: 0, color: (style.fillColor ?? DEFAULT_SHAPE_FILL).slice(0, 7) }, { offset: 1, color: "#FFFFFF" }] }
                    : undefined,
                })
              }
              className="size-5 accent-accent"
            />
          </label>
          {style.gradient && (
            <>
              <ColorField
                label="Màu cuối"
                value={style.gradient.stops[style.gradient.stops.length - 1].color}
                onChange={(color) => set({ gradient: { ...style.gradient!, stops: [style.gradient!.stops[0], { offset: 1, color }] } })}
              />
              <Stepper
                label="Hướng"
                unit="°"
                min={0}
                max={345}
                step={15}
                value={style.gradient.angle ?? 0}
                onChange={(angle) => set({ gradient: { ...style.gradient!, angle } })}
              />
            </>
          )}
        </div>
      )}
      <ColorField
        label={stroked ? "Màu nét" : "Màu viền"}
        value={(style.strokeColor ?? DEFAULT_SHAPE_STROKE).slice(0, 7)}
        onChange={(strokeColor) => set({ strokeColor, ...(stroked || style.strokeWidth ? {} : { strokeWidth: 0.5 }) })}
      />
      <Stepper
        label={stroked ? "Độ dày nét" : "Độ dày viền (0 = không viền)"}
        unit="mm"
        min={stroked ? 0.2 : 0}
        max={20}
        step={0.1}
        value={Number((style.strokeWidth ?? (stroked ? 1 : 0)).toFixed(1))}
        onChange={(strokeWidth) => set({ strokeWidth: strokeWidth || undefined })}
      />
      {(shape.kind === "rect" || shape.kind === "frame") && (
        <Stepper
          label="Bo góc"
          unit="mm"
          min={0}
          max={Math.floor(Math.min(element.width, element.height) / 2)}
          step={0.5}
          value={shape.cornerRadius ?? 0}
          onChange={(cornerRadius) => onChange({ ...element, shape: { ...shape, cornerRadius: cornerRadius || undefined } })}
        />
      )}
      {(shape.kind === "star" || shape.kind === "polygon") && (
        <Stepper
          label={shape.kind === "star" ? "Số cánh" : "Số cạnh"}
          min={3}
          max={12}
          step={1}
          value={shape.points ?? (shape.kind === "star" ? 5 : 6)}
          onChange={(points) => onChange({ ...element, shape: { ...shape, points } })}
        />
      )}
      <CommonControls element={element} onChange={onChange} />
    </div>
  );
}

/** Settings of a sticker or barcode: finish, opacity and mirror. */
export function BasicInspector({ element, onChange }: InspectorProps) {
  return <CommonControls element={element} onChange={onChange} />;
}

/**
 * Crop of a photo as zoom (1..5) and the centre of the part shown (0..1), the part keeping the proportions of the box.
 */
function cropOf(element: CanvasElement, size: { width: number; height: number } | null) {
  const crop = element.crop ?? { x: 0, y: 0, width: 1, height: 1 };
  const base = baseCrop(element, size);
  return { zoom: Math.max(1, Math.round((base.width / crop.width) * 10) / 10), cx: crop.x + crop.width / 2, cy: crop.y + crop.height / 2 };
}

/** Largest part of the image with the proportions of the box (fractions of the image). */
function baseCrop(element: CanvasElement, size: { width: number; height: number } | null) {
  const imageRatio = size ? size.width / size.height : element.width / element.height;
  const boxRatio = element.width / element.height;
  return imageRatio > boxRatio ? { width: boxRatio / imageRatio, height: 1 } : { width: 1, height: imageRatio / boxRatio };
}

function cropFrom(element: CanvasElement, size: { width: number; height: number } | null, zoom: number, cx: number, cy: number) {
  const base = baseCrop(element, size);
  const width = base.width / zoom;
  const height = base.height / zoom;
  const clamp = (v: number, span: number) => Math.min(1 - span, Math.max(0, v - span / 2));
  return { x: Math.round(clamp(cx, width) * 1000) / 1000, y: Math.round(clamp(cy, height) * 1000) / 1000, width: Math.round(width * 1000) / 1000, height: Math.round(height * 1000) / 1000 };
}

/** Settings of a photo or logo file: frame, crop, fill, adjustments, replacement (docs/23 S10). */
export function ImageInspector({ element, onChange, onReplaceImage }: InspectorProps) {
  const size = useImageSize(element.content);
  const filters = element.style?.filters ?? {};
  const crop = cropOf(element, size);
  // Print resolution of the part shown, at the size of the box.
  const dpi = size ? Math.round(imageDraw(element, size).sw / (imageDraw(element, size).dw / 25.4)) : element.dpi;
  const setCrop = (zoom: number, cx: number, cy: number) => {
    const next = zoom <= 1 && cx === 0.5 && cy === 0.5 ? undefined : cropFrom(element, size, zoom, cx, cy);
    const updated: CanvasElement = { ...element, crop: next, fit: next ? "fill" : element.fit };
    const draw = size ? imageDraw(updated, size) : null;
    onChange({ ...updated, ...(draw && element.type !== "logo" ? { dpi: Math.round(draw.sw / (draw.dw / 25.4)) } : {}) });
  };
  const setFilter = (key: "brightness" | "contrast" | "saturation", value: number) =>
    onChange({ ...element, style: { ...element.style, filters: { ...filters, [key]: value || undefined } } });
  return (
    <div className="space-y-4">
      {onReplaceImage && (
        <button type="button" className={buttonClass({ variant: "secondary", size: "sm", block: true })} onClick={() => onReplaceImage(element.id)}>
          <ImageUp className="size-4" aria-hidden />
          Thay ảnh, giữ khung
        </button>
      )}
      {typeof dpi === "number" && element.type !== "logo" && (
        <p className={cn("rounded-control px-3 py-2 text-caption", dpi < 300 ? "bg-warning-bg text-warning-fg" : "bg-success-bg text-success-fg")}>
          Độ phân giải khi in: <strong className="tabular-nums">{dpi} DPI</strong> {dpi < 300 ? "(cần ≥ 300 để in nét)" : "(đủ nét)"}
        </p>
      )}
      {takesImageTools(element) && <ImageAiTools element={element} onChange={onChange} lowDpi={typeof dpi === "number" && dpi < 300 && element.type !== "logo"} />}
      <label className="block space-y-1.5">
        <span className="text-label text-fg">Khung ảnh</span>
        <select value={element.mask ?? "rect"} onChange={(e) => onChange({ ...element, mask: e.target.value === "rect" ? undefined : (e.target.value as CanvasElement["mask"]) })} className={fieldClass}>
          <option value="rect">Chữ nhật</option>
          <option value="rounded">Bo góc</option>
          <option value="circle">Tròn / bầu dục</option>
          <option value="arch">Vòm</option>
        </select>
      </label>
      <label className="block space-y-1.5">
        <span className="text-label text-fg">Cách đặt ảnh vào khung</span>
        <select
          value={element.fit === "fill" || element.fit === "tile" ? "fill" : "fit"}
          onChange={(e) => onChange({ ...element, fit: e.target.value === "fill" ? "fill" : undefined, ...(e.target.value === "fit" ? { crop: undefined } : {}) })}
          className={fieldClass}
        >
          <option value="fit">Vừa khung (thấy cả ảnh)</option>
          <option value="fill">Phủ kín khung (cắt phần thừa)</option>
        </select>
      </label>
      <fieldset className="space-y-3 rounded-panel bg-surface-raised p-3 ring-1 ring-inset ring-line">
        <legend className="px-1 text-label font-semibold text-fg">Cắt ảnh</legend>
        <Stepper label="Phóng to" unit="×" min={1} max={5} step={0.1} value={crop.zoom} onChange={(zoom) => setCrop(zoom, crop.cx, crop.cy)} />
        <Stepper label="Dịch ngang" unit="%" min={0} max={100} step={5} value={Math.round(crop.cx * 100)} onChange={(cx) => setCrop(crop.zoom, cx / 100, crop.cy)} />
        <Stepper label="Dịch dọc" unit="%" min={0} max={100} step={5} value={Math.round(crop.cy * 100)} onChange={(cy) => setCrop(crop.zoom, crop.cx, cy / 100)} />
        {element.crop && (
          <button type="button" className={buttonClass({ variant: "link", className: "text-caption" })} onClick={() => onChange({ ...element, crop: undefined })}>
            Bỏ cắt, dùng cả ảnh
          </button>
        )}
      </fieldset>
      {(element.type === "logo" || element.type === "image") && <SvgColors element={element} onChange={onChange} />}
      <fieldset className="space-y-3 rounded-panel bg-surface-raised p-3 ring-1 ring-inset ring-line">
        <legend className="px-1 text-label font-semibold text-fg">Chỉnh màu ảnh</legend>
        <Stepper label="Độ sáng" unit="" min={-100} max={100} step={5} value={filters.brightness ?? 0} onChange={(v) => setFilter("brightness", v)} />
        <Stepper label="Tương phản" unit="" min={-100} max={100} step={5} value={filters.contrast ?? 0} onChange={(v) => setFilter("contrast", v)} />
        <Stepper label="Độ bão hòa" unit="" min={-100} max={100} step={5} value={filters.saturation ?? 0} onChange={(v) => setFilter("saturation", v)} />
        <p className="text-caption leading-5 text-fg-muted">Chỉnh màu được áp thẳng vào ảnh trong file in.</p>
      </fieldset>
      <CommonControls element={element} onChange={onChange} />
    </div>
  );
}

/** A new text with a ready-made style (heading, subheading, body), centred on the face (docs/23 S9). */
export const TEXT_PRESETS: { id: string; label: string; content: string; style: CanvasElementStyle }[] = [
  { id: "heading", label: "Tiêu đề", content: "Tiêu đề", style: { fontSize: 28, fontWeight: 700 } },
  { id: "subheading", label: "Tiêu đề phụ", content: "Tiêu đề phụ", style: { fontSize: 16, fontWeight: 700, letterSpacing: 60, textTransform: "uppercase" } },
  { id: "body", label: "Đoạn văn", content: "Thêm đoạn văn của bạn", style: { fontSize: 10, fontWeight: 400 } },
  // docs/23 S21: fill-in fields of a product label, 7 pt (FitCheck asks ≥ 6 pt); the rail shows the disclaimer.
  { id: "product-label", label: "Khối thông tin nhãn hàng hóa", content: PRODUCT_LABEL_LINES.join("\n"), style: { fontSize: 7, fontWeight: 400 } },
];

/** The inspector for any element. */
export function ElementInspector(props: InspectorProps) {
  if (props.element.type === "text") return <TextInspector {...props} />;
  if (props.element.type === "shape") return <ShapeInspector {...props} />;
  const file = props.element.type === "image" || props.element.type === "logo" || props.element.type === "pattern";
  if (file && !parseLibraryArt(props.element.content)) return <ImageInspector {...props} />;
  return <BasicInspector {...props} />;
}

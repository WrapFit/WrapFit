"use client";
/* ds-artwork: previews of printed artwork (stickers, labels, palettes) keep their own colours (docs/15_DESIGN_SYSTEM.md §2). */

import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, ShieldCheck } from "lucide-react";
import {
  ART_PALETTES,
  BLEED_BOX_MM,
  cutSidesOf,
  LIBRARY_CATEGORIES,
  LIBRARY_OCCASIONS,
  libraryArt,
  libraryArtContent,
  parseLibraryArt,
  artDesignOf,
  PRINT_FONTS,
  safeMarginsOf,
  searchLibrary,
  type CanvasElement,
  type DielineGeometry,
  type LibraryCategory,
  type LibraryItem,
  type LibraryOccasion,
  type PanelFace,
  type PrintFontId,
  artPaletteOf,
  dressWithKit,
  STYLE_KITS,
  TEMPLATE_LAYOUTS,
  type BoxDimensions,
} from "@wrapfit/shared";
import { listLibraryAssets } from "@/api";
import { buttonClass, Field, Input } from "@/components/ui";
import { queryKeys } from "@/hooks/data";
import type { LibraryAsset } from "@/types/api";
import { useBoxFonts } from "../canvas/boxText";
import { ArtShapes, elementArt } from "./elementArt";

const ALL_FONTS = Object.keys(PRINT_FONTS) as PrintFontId[];
const PAGE = 36;

interface LibraryPanelProps {
  /** Panel new elements go on, and the dieline it belongs to (backgrounds cover it with bleed past its cut lines). */
  panel: PanelFace;
  geometry: DielineGeometry;
  onAddElement: (element: CanvasElement) => void;
  /** The element selected on the canvas: library art can be recoloured and reworded here. */
  selectedElement?: CanvasElement | null;
  onUpdateElement?: (element: CanvasElement) => void;
  /** The box being designed: style kits dress all of it. */
  box?: { structure: string; dimensions: BoxDimensions; formulaVersion?: number; title: string };
  /** Replaces the elements of the last kit applied (ids starting with KIT_PREFIX) with these; the user's own stay. */
  onApplyKit?: (elements: CanvasElement[]) => void;
}

/** Ids of the elements a style kit placed: the next kit replaces them, never the user's own. */
export const KIT_PREFIX = "kit_";

const newId = () => `lib_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

/** Element of an item on `panel`: backgrounds over the whole panel, the rest centred in its safe area. */
function placeItem(
  item: { elementType: CanvasElement["type"]; content: string; widthMm: number; heightMm: number; dpi?: number },
  panel: PanelFace,
  geometry: DielineGeometry
): CanvasElement {
  const { width: pw, height: ph } = panel.bounds;
  if (item.elementType === "pattern") {
    const cut = cutSidesOf(panel, geometry);
    const bleed = (side: "top" | "right" | "bottom" | "left") => (cut.has(side) ? BLEED_BOX_MM : 0);
    return {
      id: newId(),
      type: "pattern",
      panelId: panel.id,
      x: -bleed("left"),
      y: -bleed("top"),
      width: pw + bleed("left") + bleed("right"),
      height: ph + bleed("top") + bleed("bottom"),
      rotation: 0,
      content: item.content,
    };
  }
  const m = safeMarginsOf(panel, geometry);
  const room = { width: pw - m.left - m.right - 2, height: ph - m.top - m.bottom - 2 };
  const scale = Math.min(1, room.width / item.widthMm, room.height / item.heightMm);
  const width = Math.round(item.widthMm * Math.max(scale, 0.2) * 10) / 10;
  const height = Math.round(item.heightMm * Math.max(scale, 0.2) * 10) / 10;
  return {
    id: newId(),
    type: item.elementType,
    panelId: panel.id,
    x: Math.round((m.left + (pw - m.left - m.right - width) / 2) * 10) / 10,
    y: Math.round((m.top + (ph - m.top - m.bottom - height) / 2) * 10) / 10,
    width,
    height,
    rotation: 0,
    content: item.content,
    // A raster printed smaller has more pixels per inch.
    ...(item.dpi ? { dpi: Math.round((item.dpi * item.widthMm) / width) } : {}),
  };
}

/** An imported asset as a library item (size: 40 mm wide, or its 300 DPI limit). */
function assetItem(asset: LibraryAsset): (LibraryItem & { attribution: string | null }) | null {
  if (!asset.url) return null;
  const ratio = asset.widthPx && asset.heightPx ? asset.heightPx / asset.widthPx : 1;
  const width = Math.min(asset.category === "BACKGROUND" ? 60 : 40, asset.maxPrintMm ?? 40);
  return {
    id: asset.id,
    name: asset.title,
    category: asset.category === "BACKGROUND" ? "background" : asset.category === "LABEL" ? "label" : "sticker",
    elementType: asset.category === "BACKGROUND" ? "pattern" : asset.isVector ? "logo" : "image",
    content: asset.url,
    widthMm: width,
    heightMm: Math.round(width * ratio * 10) / 10,
    occasions: asset.occasions,
    keywords: asset.tags,
    editable: false,
    rank: 0,
    dpi: asset.widthPx ? Math.round(asset.widthPx / (width / 25.4)) : undefined,
    attribution: asset.attribution,
  };
}

function Preview({ item }: { item: Pick<LibraryItem, "elementType" | "content" | "widthMm" | "heightMm" | "name"> }) {
  const art = elementArt({ type: item.elementType, content: item.content, width: item.widthMm, height: item.heightMm });
  if (art) {
    return (
      <svg viewBox={`0 0 ${item.widthMm} ${item.heightMm}`} className="max-h-full max-w-full" aria-hidden>
        <ArtShapes art={art} />
      </svg>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element -- library files of any size, drawn as they are
  return <img src={item.content} alt="" className="max-h-full max-w-full object-contain" loading="lazy" />;
}

/**
 * The studio's library: stickers, labels, backgrounds, Gói and barcodes of the built-in catalogue (vector, recolour and
 * reword them), plus the assets admins imported from licensed sources. Search ignores Vietnamese accents.
 */
export function LibraryPanel({ panel, geometry, onAddElement, selectedElement, onUpdateElement, box, onApplyKit }: LibraryPanelProps) {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<LibraryCategory | null>(null);
  const [occasion, setOccasion] = useState<LibraryOccasion | null>(null);
  const [shown, setShown] = useState(PAGE);
  // The kit last applied and its layout (index of TEMPLATE_LAYOUTS): a second click on the same kit moves on.
  const [applied, setApplied] = useState<{ kit: string; layout: number } | null>(null);
  useBoxFonts([], ALL_FONTS);

  const applyKit = (kitId: string) => {
    if (!box || !onApplyKit) return;
    const start = applied?.kit === kitId ? applied.layout + 1 : 0;
    for (let step = 0; step < TEMPLATE_LAYOUTS.length; step++) {
      const layout = (start + step) % TEMPLATE_LAYOUTS.length;
      const elements = dressWithKit({ ...box, kitId, layout: TEMPLATE_LAYOUTS[layout].id });
      // dressWithKit falls back to another layout when this one does not pass FitCheck: keep the one it chose.
      if (elements.length) {
        onApplyKit(elements.map((element) => ({ ...element, id: `${KIT_PREFIX}${element.id}` })));
        setApplied({ kit: kitId, layout });
        return;
      }
    }
  };

  const items = useMemo(() => searchLibrary({ q, category, occasion }), [q, category, occasion]);
  const imported = useQuery({
    queryKey: queryKeys.library.assets({ q, occasion }),
    queryFn: () => listLibraryAssets({ q: q || undefined, occasion: occasion ?? undefined, limit: 24 }),
    staleTime: 60_000,
  });
  const importedItems = (imported.data?.items ?? [])
    .map(assetItem)
    .filter((item): item is NonNullable<ReturnType<typeof assetItem>> => !!item && (!category || item.category === category));

  // The selected element, when it is library art: its design, palette and words.
  const selectedRef = selectedElement ? parseLibraryArt(selectedElement.content) : null;
  const selectedDesign = selectedRef ? artDesignOf(selectedRef.design) : null;
  const update = (patch: { palette?: string; texts?: string[] }) => {
    if (!selectedElement || !selectedRef || !onUpdateElement) return;
    const content = libraryArtContent({ design: selectedRef.design, palette: patch.palette ?? selectedRef.palette, texts: patch.texts ?? selectedRef.texts });
    if (libraryArt(content, selectedElement.width, selectedElement.height)) onUpdateElement({ ...selectedElement, content });
  };

  const chip = (active: boolean) => buttonClass({ variant: active ? "dark" : "secondary", size: "md", className: "min-h-11 shrink-0" });

  return (
    <div className="space-y-4">
      {selectedElement && selectedRef && selectedDesign && (
        <section aria-labelledby="library-edit" className="space-y-3 rounded-panel border border-line bg-surface-raised p-3">
          <h3 id="library-edit" className="text-label font-semibold text-fg">
            Tùy chỉnh “{selectedDesign.name}”
          </h3>
          <div role="radiogroup" aria-label="Bảng màu" className="flex flex-wrap gap-1.5">
            {ART_PALETTES.map((palette) => (
              <button
                key={palette.id}
                type="button"
                role="radio"
                aria-checked={palette.id === selectedRef.palette}
                aria-label={palette.name}
                title={palette.name}
                onClick={() => update({ palette: palette.id })}
                className="relative size-11 overflow-hidden rounded-full ring-1 ring-line aria-checked:ring-2 aria-checked:ring-fg focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-focus"
                style={{ background: `linear-gradient(135deg, ${palette.base} 0 50%, ${palette.accent} 50% 100%)` }}
              />
            ))}
          </div>
          {selectedDesign.lines.map((fallback, index) => (
            <Field key={index} label={`Dòng chữ ${index + 1}`}>
              {(control) => (
                <Input
                  {...control}
                  inputSize="md"
                  value={selectedRef.texts[index] ?? ""}
                  placeholder={fallback}
                  maxLength={60}
                  onChange={(event) => {
                    const texts = [...selectedRef.texts];
                    texts[index] = event.target.value;
                    update({ texts });
                  }}
                />
              )}
            </Field>
          ))}
        </section>
      )}

      {box && onApplyKit && (
        <section aria-labelledby="library-kits" className="space-y-2">
          <h3 id="library-kits" className="text-label font-semibold text-fg">
            Phong cách cả hộp <span className="font-normal text-fg-muted">· bấm lần nữa để đổi bố cục</span>
          </h3>
          <ul className="flex gap-2 overflow-x-auto pb-1">
            {STYLE_KITS.map((kit) => {
              const colors = [kit.background?.palette ?? kit.label.palette, kit.sticker.palette, kit.label.palette].map((id) => artPaletteOf(id)!);
              const active = applied?.kit === kit.id;
              return (
                <li key={kit.id} className="shrink-0">
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => applyKit(kit.id)}
                    className="flex min-h-11 w-28 flex-col items-start gap-1.5 rounded-panel border border-line bg-surface-raised p-2 text-left transition hover:border-fg/40 aria-pressed:border-fg aria-pressed:bg-accent-bg focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-focus/40"
                  >
                    <span className="flex h-7 w-full overflow-hidden rounded-control" aria-hidden>
                      {colors.map((palette, i) => (
                        <span key={i} className="flex-1" style={{ background: i === 0 ? palette.base : palette.accent }} />
                      ))}
                    </span>
                    <span className="line-clamp-2 text-caption font-semibold text-fg">{kit.name}</span>
                    {active && <span className="text-caption text-fg-muted">{TEMPLATE_LAYOUTS[applied.layout].name}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <Input
        inputSize="md"
        leadingIcon={<Search className="size-4" aria-hidden />}
        value={q}
        onChange={(event) => {
          setQ(event.target.value);
          setShown(PAGE);
        }}
        placeholder="Tìm: tết, cảm ơn, handmade, nền…"
        aria-label="Tìm trong thư viện"
      />

      <div className="flex gap-1.5 overflow-x-auto pb-1" role="group" aria-label="Loại">
        <button type="button" className={chip(!category)} aria-pressed={!category} onClick={() => setCategory(null)}>
          Tất cả
        </button>
        {LIBRARY_CATEGORIES.map((c) => (
          <button key={c.id} type="button" className={chip(category === c.id)} aria-pressed={category === c.id} onClick={() => setCategory(category === c.id ? null : c.id)}>
            {c.label}
          </button>
        ))}
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1" role="group" aria-label="Dịp">
        {LIBRARY_OCCASIONS.map((o) => (
          <button key={o.id} type="button" className={chip(occasion === o.id)} aria-pressed={occasion === o.id} onClick={() => setOccasion(occasion === o.id ? null : o.id)}>
            {o.label}
          </button>
        ))}
      </div>

      {importedItems.length > 0 && (
        <section aria-labelledby="library-imported" className="space-y-2">
          <h3 id="library-imported" className="flex items-center gap-1.5 text-label font-semibold text-fg">
            <ShieldCheck className="size-4 text-success-fg" aria-hidden /> Thư viện đã kiểm duyệt bản quyền
          </h3>
          <ItemGrid items={importedItems} onPick={(item) => onAddElement(placeItem(item, panel, geometry))} />
        </section>
      )}

      <section aria-labelledby="library-builtin" className="space-y-2">
        <h3 id="library-builtin" className="text-label font-semibold text-fg">
          Mẫu dựng sẵn <span className="font-normal text-fg-muted">· {items.length} mẫu, đổi màu và chữ sau khi thêm</span>
        </h3>
        {items.length === 0 ? (
          <p className="text-body-sm text-fg-muted">Không có mẫu khớp. Thử từ khác, hoặc bỏ bớt bộ lọc.</p>
        ) : (
          <ItemGrid items={items.slice(0, shown)} onPick={(item) => onAddElement(placeItem(item, panel, geometry))} />
        )}
        {shown < items.length && (
          <button type="button" className={buttonClass({ variant: "secondary", size: "md", block: true, className: "min-h-11" })} onClick={() => setShown(shown + PAGE)}>
            Xem thêm {Math.min(PAGE, items.length - shown)} mẫu
          </button>
        )}
      </section>
    </div>
  );
}

function ItemGrid({ items, onPick }: { items: (LibraryItem & { attribution?: string | null })[]; onPick: (item: LibraryItem) => void }) {
  return (
    <ul className="grid grid-cols-2 gap-2">
      {items.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            onClick={() => onPick(item)}
            title={item.attribution ? `${item.name} — ${item.attribution}` : item.name}
            className="group flex min-h-[44px] w-full flex-col items-center gap-1.5 rounded-panel border border-line bg-surface-raised p-2 text-center transition hover:border-fg/40 hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-focus/40"
          >
            <span className="flex h-16 w-full items-center justify-center overflow-hidden rounded-control bg-canvas p-1">
              <Preview item={item} />
            </span>
            <span className="line-clamp-2 text-caption font-semibold text-fg">{item.name}</span>
            <span className="text-caption tabular-nums text-fg-muted">
              {item.category === "background" ? "phủ cả mặt" : `${item.widthMm} × ${item.heightMm} mm`}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

"use client";
/* ds-artwork: previews of printed artwork (stickers, labels, palettes) keep their own colours (docs/13_DESIGN_SYSTEM.md §2). */

import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Search, ShieldCheck, Shuffle, Star } from "lucide-react";
import {
  ART_PALETTES,
  BLEED_BOX_MM,
  cutSidesOf,
  industriesOf,
  LIBRARY_CATEGORIES,
  LIBRARY_INDUSTRIES,
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
  type LibraryIndustry,
  type LibraryItem,
  type LibraryOccasion,
  type PanelFace,
  type PrintFontId,
  dressWithKit,
  STYLE_KITS,
  TEMPLATE_LAYOUTS,
  type BoxDimensions,
} from "@wrapfit/shared";
import { errorMessage, importStockPhoto, listLibraryAssets, searchStockPhotos } from "@/api";
import { useToast } from "@/components/common/Toast";
import { buttonClass, Field, Input, Select } from "@/components/ui";
import { cn } from "@/utils/helpers";
import { queryKeys } from "@/hooks/data";
import type { LibraryAsset } from "@/types/api";
import { useBoxFonts } from "../canvas/boxText";
import { ArtShapes, elementArt } from "./elementArt";
import { FacePreview } from "./FacePreview";
import { type ShelfItem, useLibraryShelves } from "./libraryShelves";

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
  /** Elements of the whole design: its images and logos make the "Của tôi" shelf (docs-old/23 S15). */
  designElements?: CanvasElement[];
}

/** Shelves of the library: the catalogue, the user's favourites, recent items, own files and stock photos. */
type Shelf = "all" | "favorites" | "recent" | "mine" | "stock";

/** Files of the design (uploads, AI images, stock photos) as items to place again. */
function designFiles(elements: CanvasElement[]): ShelfItem[] {
  const seen = new Set<string>();
  const items: ShelfItem[] = [];
  for (const el of elements) {
    if ((el.type !== "image" && el.type !== "logo") || !/^(https?:|blob:|data:image\/|\/)/.test(el.content) || seen.has(el.content)) continue;
    seen.add(el.content);
    const width = Math.min(60, el.width);
    items.push({
      // A stock photo placed again stays a stock photo (STOCK_PHOTO_ALONE): `pick` reads the prefix.
      id: `${el.source === "pexels" ? "stock" : "mine"}:${el.content}`,
      name: el.name ?? (el.type === "logo" ? "Logo của bạn" : "Ảnh của bạn"),
      category: "sticker",
      elementType: el.type,
      content: el.content,
      widthMm: Math.round(width * 10) / 10,
      heightMm: Math.round(((width * el.height) / Math.max(el.width, 0.1)) * 10) / 10,
      occasions: [],
      keywords: [],
      editable: false,
      rank: 0,
      industries: [],
      ...(el.dpi ? { dpi: Math.round((el.dpi * el.width) / width) } : {}),
    });
  }
  return items;
}

/** Width of a stock photo on the box: 60 mm, or less when the photo would print under 300 DPI. */
const stockWidthMm = (widthPx: number) => Math.round(Math.min(60, (widthPx / 300) * 25.4) * 10) / 10;

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
    industries: industriesOf([asset.title, ...asset.tags]),
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
export function LibraryPanel({ panel, geometry, onAddElement, selectedElement, onUpdateElement, box, onApplyKit, designElements = [] }: LibraryPanelProps) {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<LibraryCategory | null>(null);
  const [occasion, setOccasion] = useState<LibraryOccasion | null>(null);
  const [industry, setIndustry] = useState<LibraryIndustry | null>(null);
  const [shelf, setShelf] = useState<Shelf>("all");
  const shelves = useLibraryShelves();
  const toast = useToast();
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

  const items = useMemo(() => searchLibrary({ q, category, occasion, industry }), [q, category, occasion, industry]);
  const imported = useQuery({
    queryKey: queryKeys.library.assets({ q, occasion }),
    queryFn: () => listLibraryAssets({ q: q || undefined, occasion: occasion ?? undefined, limit: 24 }),
    staleTime: 60_000,
  });
  const importedItems = (imported.data?.items ?? [])
    .map(assetItem)
    .filter(
      (item): item is NonNullable<ReturnType<typeof assetItem>> =>
        !!item && (!category || item.category === category) && (!industry || !item.industries.length || item.industries.includes(industry))
    );

  /** Places an item on the face and remembers it as used. */
  const pick = (item: ShelfItem) => {
    const element = placeItem(item, panel, geometry);
    // Stock photos placed again from the recent or design-files shelves keep their source.
    onAddElement(item.id.startsWith("stock:") ? { ...element, source: "pexels" } : element);
    shelves.markUsed(item);
  };
  const favorite = { isFavorite: shelves.isFavorite, onToggle: shelves.toggleFavorite };
  // The user's own shelves, narrowed by the search words.
  const matches = (item: ShelfItem) => !q.trim() || searchLibrary({ q }).some((found) => found.id === item.id) || item.name.toLowerCase().includes(q.trim().toLowerCase());
  const mine = useMemo(() => designFiles(designElements), [designElements]);

  // Stock photos (docs-old/23 S15, D10): searched through the backend, copied into the user's files when placed.
  const [stockQ, setStockQ] = useState("");
  const [stockPage, setStockPage] = useState(1);
  const [importing, setImporting] = useState<number | null>(null);
  const stock = useQuery({
    queryKey: ["library", "stock", stockQ, stockPage],
    queryFn: () => searchStockPhotos({ q: stockQ || undefined, page: stockPage }),
    enabled: shelf === "stock",
    staleTime: 5 * 60_000,
    retry: false,
  });
  const placeStock = async (photo: { id: number; width: number; height: number; alt: string; photographer: string }) => {
    setImporting(photo.id);
    try {
      const copy = await importStockPhoto(photo.id);
      const widthMm = stockWidthMm(copy.width);
      const item: ShelfItem = {
        id: `stock:${copy.url}`,
        name: photo.alt || `Ảnh của ${photo.photographer}`,
        category: "sticker",
        elementType: "image",
        content: copy.url,
        widthMm,
        heightMm: Math.round(((widthMm * copy.height) / copy.width) * 10) / 10,
        occasions: [],
        keywords: [],
        editable: false,
        rank: 0,
        industries: [],
        dpi: Math.round(copy.width / (widthMm / 25.4)),
        attribution: copy.attribution,
      };
      // The credit stays with the photo as its layer name; `source` lets FitCheck refuse a box of stock photos alone.
      onAddElement({ ...placeItem(item, panel, geometry), name: copy.attribution, source: "pexels" });
      shelves.markUsed(item);
    } catch (error) {
      toast.show({ tone: "error", title: "Chưa chèn được ảnh kho", description: errorMessage(error) });
    } finally {
      setImporting(null);
    }
  };

  // The selected element, when it is library art: its design, palette and words.
  const selectedRef = selectedElement ? parseLibraryArt(selectedElement.content) : null;
  const selectedDesign = selectedRef ? artDesignOf(selectedRef.design) : null;
  const update = (patch: { palette?: string; texts?: string[] }) => {
    if (!selectedElement || !selectedRef || !onUpdateElement) return;
    const content = libraryArtContent({ design: selectedRef.design, palette: patch.palette ?? selectedRef.palette, texts: patch.texts ?? selectedRef.texts });
    if (libraryArt(content, selectedElement.width, selectedElement.height)) onUpdateElement({ ...selectedElement, content });
  };

  /** Compact filter chip: orange tint when on (the studio's selected state), grey hairline otherwise. */
  const chip = (active: boolean) =>
    cn(
      "inline-flex h-8 shrink-0 items-center rounded-full px-3 text-[13px] outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-focus/40",
      active ? "bg-fpt-orange-light font-semibold text-accent ring-1 ring-fpt-orange/30" : "bg-surface-raised font-medium text-fg-muted ring-1 ring-line hover:text-fg hover:ring-line-strong"
    );

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

      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]" role="group" aria-label="Bộ sưu tập">
        {(
          [
            ["all", "Thư viện"],
            ["favorites", `Yêu thích${shelves.favorites.length ? ` · ${shelves.favorites.length}` : ""}`],
            ["recent", "Gần đây"],
            ["mine", "Của tôi"],
            ["stock", "Ảnh kho"],
          ] as [Shelf, string][]
        ).map(([id, label]) => (
          <button key={id} type="button" className={chip(shelf === id)} aria-pressed={shelf === id} onClick={() => setShelf(id)}>
            {label}
          </button>
        ))}
      </div>

      {shelf === "favorites" && (
        <ShelfSection title="Yêu thích" empty="Bấm ngôi sao trên một mẫu để giữ nó ở đây.">
          {shelves.favorites.filter(matches).length > 0 && <ItemGrid items={shelves.favorites.filter(matches)} onPick={pick} favorite={favorite} />}
        </ShelfSection>
      )}
      {shelf === "recent" && (
        <ShelfSection
          title="Dùng gần đây"
          empty="Các mẫu bạn vừa thêm vào hộp sẽ hiện ở đây."
          action={
            shelves.recent.length > 0 ? (
              <button type="button" className={buttonClass({ variant: "link", className: "text-caption" })} onClick={shelves.clearRecent}>
                Xóa lịch sử
              </button>
            ) : null
          }
        >
          {shelves.recent.filter(matches).length > 0 && <ItemGrid items={shelves.recent.filter(matches)} onPick={pick} favorite={favorite} />}
        </ShelfSection>
      )}
      {shelf === "mine" && (
        <ShelfSection title="Ảnh và logo trong thiết kế" empty="Ảnh bạn tải lên, ảnh AI và ảnh kho đã dùng trong thiết kế sẽ hiện ở đây để đặt lại lên mặt khác.">
          {mine.filter(matches).length > 0 && <ItemGrid items={mine.filter(matches)} onPick={pick} favorite={favorite} />}
        </ShelfSection>
      )}
      {shelf === "stock" && (
        <section aria-labelledby="library-stock" className="space-y-3">
          <h3 id="library-stock" className="text-label font-semibold text-fg">
            Ảnh kho miễn phí <span className="font-normal text-fg-muted">· Pexels, dùng thương mại được</span>
          </h3>
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              setStockQ(q.trim());
              setStockPage(1);
            }}
          >
            <p className="min-w-0 flex-1 self-center text-caption text-fg-muted">{stockQ ? `Kết quả cho “${stockQ}”` : "Ảnh chọn lọc. Gõ từ ở ô tìm rồi bấm Tìm ảnh."}</p>
            <button type="submit" className={buttonClass({ variant: "secondary", size: "sm" })}>
              Tìm ảnh
            </button>
          </form>
          {stock.isPending ? (
            <p className="text-body-sm text-fg-muted">Đang tải ảnh…</p>
          ) : stock.isError ? (
            <p className="text-body-sm text-fg-muted">{errorMessage(stock.error)}</p>
          ) : !stock.data?.enabled ? (
            <p className="rounded-control bg-surface-sunken px-3 py-2 text-body-sm text-fg-muted">Ảnh kho chưa được bật trên máy chủ này.</p>
          ) : stock.data.items.length === 0 ? (
            <p className="text-body-sm text-fg-muted">Không có ảnh khớp. Thử từ tiếng Anh, ví dụ “cookie”, “flower”.</p>
          ) : (
            <>
              <ul className="grid grid-cols-2 gap-2">
                {stock.data.items.map((photo) => (
                  <li key={photo.id} className="space-y-1">
                    <button
                      type="button"
                      disabled={importing !== null}
                      onClick={() => void placeStock(photo)}
                      title={photo.alt || photo.photographer}
                      className="block h-24 w-full overflow-hidden rounded-panel bg-canvas ring-1 ring-line transition hover:ring-fg disabled:opacity-60 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-focus/40"
                      aria-label={`Chèn ảnh ${photo.alt || `của ${photo.photographer}`}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- previews from the Pexels CDN */}
                      <img src={photo.thumbUrl} alt="" className="size-full object-cover" loading="lazy" />
                      {importing === photo.id && <span className="sr-only">Đang chèn…</span>}
                    </button>
                    <a href={photo.photographerUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 truncate text-caption text-fg-muted hover:text-fg">
                      {photo.photographer}
                      <ExternalLink className="size-3 shrink-0" aria-hidden />
                    </a>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between gap-2">
                <button type="button" className={buttonClass({ variant: "ghost", size: "sm" })} disabled={stockPage <= 1} onClick={() => setStockPage(stockPage - 1)}>
                  Trang trước
                </button>
                <span className="text-caption tabular-nums text-fg-muted">Trang {stockPage}</span>
                <button type="button" className={buttonClass({ variant: "ghost", size: "sm" })} disabled={!stock.data.hasMore} onClick={() => setStockPage(stockPage + 1)}>
                  Trang sau
                </button>
              </div>
              <p className="text-caption leading-5 text-fg-muted">
                Ảnh được chép vào tệp của bạn khi chèn, nên file in không phụ thuộc link ngoài. Tên tác giả được ghi ở tên lớp.{" "}
                <a href="https://www.pexels.com" target="_blank" rel="noreferrer" className="underline">
                  Ảnh từ Pexels
                </a>
              </p>
            </>
          )}
        </section>
      )}

      {shelf === "all" && (
      <>
      {/* One row of occasions drives everything below: whole-box designs and single pieces. */}
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]" role="group" aria-label="Dịp">
        <button type="button" className={chip(!occasion)} aria-pressed={!occasion} onClick={() => setOccasion(null)}>
          Mọi dịp
        </button>
        {LIBRARY_OCCASIONS.map((o) => (
          <button key={o.id} type="button" className={chip(occasion === o.id)} aria-pressed={occasion === o.id} onClick={() => setOccasion(occasion === o.id ? null : o.id)}>
            {o.label}
          </button>
        ))}
      </div>

      {box && onApplyKit && (
        <KitGallery box={box} occasion={occasion} q={q} industry={industry} applied={applied} onApply={applyKit} />
      )}

      <div className="flex items-center justify-between gap-2 border-t border-line/70 pt-3">
        <h3 id="library-builtin" className="text-label font-semibold text-fg">
          Thành phần <span className="font-normal tabular-nums text-fg-muted">· {items.length}</span>
        </h3>
        <div className="w-36">
          <Select
            inputSize="sm"
            aria-label="Ngành hàng"
            value={industry ?? ""}
            onChange={(event) => {
              setIndustry((event.target.value || null) as LibraryIndustry | null);
              setShown(PAGE);
            }}
          >
            <option value="">Mọi ngành</option>
            {LIBRARY_INDUSTRIES.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]" role="group" aria-label="Loại">
        <button type="button" className={chip(!category)} aria-pressed={!category} onClick={() => setCategory(null)}>
          Tất cả
        </button>
        {LIBRARY_CATEGORIES.map((c) => (
          <button key={c.id} type="button" className={chip(category === c.id)} aria-pressed={category === c.id} onClick={() => setCategory(category === c.id ? null : c.id)}>
            {c.label}
          </button>
        ))}
      </div>

      {importedItems.length > 0 && (
        <section aria-labelledby="library-imported" className="space-y-2">
          <h3 id="library-imported" className="flex items-center gap-1.5 text-label font-semibold text-fg">
            <ShieldCheck className="size-4 text-success-fg" aria-hidden /> Thư viện đã kiểm duyệt bản quyền
          </h3>
          <ItemGrid items={importedItems} onPick={pick} favorite={favorite} />
        </section>
      )}

      <section aria-labelledby="library-builtin" className="space-y-2">
        {items.length === 0 ? (
          <p className="text-body-sm text-fg-muted">Không có mẫu khớp.</p>
        ) : (
          <ItemGrid items={items.slice(0, shown)} onPick={pick} favorite={favorite} />
        )}
        {shown < items.length && (
          <button type="button" className={buttonClass({ variant: "secondary", size: "md", block: true, className: "min-h-11" })} onClick={() => setShown(shown + PAGE)}>
            Xem thêm {Math.min(PAGE, items.length - shown)} mẫu
          </button>
        )}
      </section>
      </>
      )}
    </div>
  );
}

/** Colour of the printed side of each paper a kit is made for, for its preview. */
const KIT_PAPER: Record<string, string> = { ivory: "#FAF6EE", kraft: "#D9B897", duplex: "#F7F7F3" };
const KITS_SHOWN = 4;

/**
 * Whole-box designs, each shown as it would look on the front of this very box: the user picks by sight, not by name.
 * Filtered by the occasion row, the search words and the industry above; a second click on the applied one changes its
 * layout.
 */
function KitGallery({
  box,
  occasion,
  q,
  industry,
  applied,
  onApply,
}: {
  box: NonNullable<LibraryPanelProps["box"]>;
  occasion: LibraryOccasion | null;
  q: string;
  industry: LibraryIndustry | null;
  applied: { kit: string; layout: number } | null;
  onApply(kitId: string): void;
}) {
  const [all, setAll] = useState(false);
  const words = q.trim().toLowerCase();
  const kits = STYLE_KITS.filter(
    (kit) =>
      (!occasion || kit.occasion === occasion) &&
      (!industry || (kit.industries as string[]).includes(industry)) &&
      (!words || kit.name.toLowerCase().includes(words) || kit.tags.some((tag) => tag.includes(words)))
  );
  // The front of the box dressed by each kit, once per box size (dressWithKit lays out the whole dieline).
  const previews = useMemo(
    () =>
      Object.fromEntries(
        STYLE_KITS.map((kit) => {
          try {
            return [kit.id, dressWithKit({ ...box, kitId: kit.id, layout: TEMPLATE_LAYOUTS[0].id })];
          } catch {
            return [kit.id, [] as CanvasElement[]];
          }
        })
      ),
    // The box object is rebuilt each render; its shape is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [box.structure, box.dimensions.length, box.dimensions.width, box.dimensions.height, box.formulaVersion]
  );
  if (kits.length === 0) return null;
  const shown = all ? kits : kits.slice(0, KITS_SHOWN);

  return (
    <section aria-labelledby="library-kits" className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <h3 id="library-kits" className="text-label font-semibold text-fg">
          Mẫu cả hộp <span className="font-normal tabular-nums text-fg-muted">· {kits.length}</span>
        </h3>
        {kits.length > KITS_SHOWN && (
          <button type="button" onClick={() => setAll((v) => !v)} className={buttonClass({ variant: "link", className: "text-caption" })}>
            {all ? "Thu gọn" : "Xem tất cả"}
          </button>
        )}
      </div>
      <ul className="grid grid-cols-2 gap-2">
        {shown.map((kit) => {
          const active = applied?.kit === kit.id;
          return (
            <li key={kit.id}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onApply(kit.id)}
                title={active ? "Bấm lần nữa để đổi bố cục" : kit.name}
                className={cn(
                  "group relative flex w-full flex-col overflow-hidden rounded-panel border-2 bg-surface-raised text-left transition focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-focus/40",
                  active ? "border-fpt-orange-ink" : "border-transparent ring-1 ring-line hover:ring-fg/40"
                )}
              >
                <span className="flex aspect-[4/3] items-center justify-center bg-canvas p-2">
                  <FacePreview
                    structure={box.structure}
                    dimensions={box.dimensions}
                    formulaVersion={box.formulaVersion}
                    elements={previews[kit.id] ?? []}
                    paper={KIT_PAPER[kit.material] ?? KIT_PAPER.ivory}
                    className="h-full w-full drop-shadow-sm"
                  />
                </span>
                <span className="truncate px-2 py-1.5 text-caption font-semibold text-fg">{kit.name}</span>
                {active && (
                  <span className="absolute right-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-fpt-orange-ink px-2 py-0.5 text-[11px] font-semibold text-white">
                    <Shuffle className="size-3" aria-hidden />
                    Đổi bố cục
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ShelfSection({ title, empty, action, children }: { title: string; empty: string; action?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <section className="space-y-2" aria-label={title}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-label font-semibold text-fg">{title}</h3>
        {action}
      </div>
      {children || <p className="rounded-control bg-surface-sunken px-3 py-2 text-body-sm text-fg-muted">{empty}</p>}
    </section>
  );
}

function ItemGrid({
  items,
  onPick,
  favorite,
}: {
  items: ShelfItem[];
  onPick: (item: ShelfItem) => void;
  favorite?: { isFavorite(id: string): boolean; onToggle(item: ShelfItem): void };
}) {
  return (
    <ul className="grid grid-cols-3 gap-1.5">
      {items.map((item) => (
        <li key={item.id} className="group/item relative">
          {favorite && (
            <button
              type="button"
              aria-pressed={favorite.isFavorite(item.id)}
              aria-label={favorite.isFavorite(item.id) ? `Bỏ yêu thích ${item.name}` : `Yêu thích ${item.name}`}
              title={favorite.isFavorite(item.id) ? "Bỏ yêu thích" : "Yêu thích"}
              onClick={() => favorite.onToggle(item)}
              // Shown on hover or focus, and always once starred: the tiles stay clean.
              className={cn(
                "absolute right-1 top-1 z-10 grid size-7 place-items-center rounded-full bg-surface-raised/90 text-fg-muted ring-1 ring-line transition hover:text-fg aria-pressed:text-accent focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-focus/40 group-hover/item:opacity-100 [@media(hover:none)]:opacity-100",
                favorite.isFavorite(item.id) ? "opacity-100" : "opacity-0"
              )}
            >
              <Star className={cn("size-3.5", favorite.isFavorite(item.id) && "fill-current")} aria-hidden />
            </button>
          )}
          {/* The picture is the label: the name stays one short line (full name on hover). */}
          <button
            type="button"
            onClick={() => onPick(item)}
            title={item.attribution ? `${item.name} — ${item.attribution}` : item.name}
            aria-label={`Thêm ${item.name}`}
            className="flex w-full flex-col items-center gap-1 rounded-panel border border-line bg-surface-raised p-1.5 text-center transition hover:border-fg/40 hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-focus/40"
          >
            <span className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-control bg-canvas p-1">
              <Preview item={item} />
            </span>
            <span className="w-full truncate text-[11px] font-medium leading-4 text-fg-muted">{item.name}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

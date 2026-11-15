"use client";

import React from "react";
import { ArrowRight, Box, Check, FileText, Grid3x3, Hand, Layers, Scissors } from "lucide-react";
import { Box3DView } from "@/features/studio/components/three/Box3DView";
import { PRIMARY_PILL, StepHeader, StudioCard, ViewToggle } from "@/features/studio/components/studioUi";
import { continueTo, studioStep } from "@/features/studio/components/StudioStepper";
import { StructureArt } from "@/components/home/StructureArt";
import { DielineSketch } from "@/features/templates/components/DielineSketch";
import { BoxStructureType, caliperOf, type CanvasElement, CURRENT_FORMULA_VERSION, generateDielinePieces, UnsupportedStructureError } from "@wrapfit/shared";
import type { BoxStructure } from "@/types/api";
import { BOX_STRUCTURES, type BoxStructureOption } from "@/features/studio/utils/boxStructures";

export { BOX_STRUCTURES, type BoxStructureOption } from "@/features/studio/utils/boxStructures";

/** Presentation of a structure: name and description from the API, the rest from BOX_STRUCTURES. */
interface StructureCard extends BoxStructureOption {
  apiName: string;
}

const GENERIC_STRUCTURE: Omit<BoxStructureOption, "id" | "name" | "vietnameseName" | "description"> = {
  subtitle: "",
  badge: "Cấu trúc mới",
  badgeColor: "bg-landing-canvas text-landing-ink border-landing-line",
  recommendedGifts: [],
  recommendedPaper: "Ivory 300 GSM",
  foldDifficulty: "Trung bình",
  defaultDims: { length: 120, width: 80, height: 60, paperThickness: caliperOf(300) },
  svgPath: "M15 25 L85 25 L85 75 L15 75 Z",
};

/** Crease lines of the box at its default size, counted on the dieline of the current formulas (every piece). */
function creaseCountOf(item: BoxStructureOption): number {
  try {
    return generateDielinePieces(item.id, item.defaultDims, CURRENT_FORMULA_VERSION).reduce(
      (sum, piece) => sum + piece.geometry.segments.filter((segment) => segment.type === "crease").length,
      0
    );
  } catch (error) {
    if (error instanceof UnsupportedStructureError) return 0;
    throw error;
  }
}

/** Families of structures: one tap narrows twelve pictures to the few that fit. */
type StructureGroup = "box" | "tray" | "flat";
const GROUP_ORDER: StructureGroup[] = ["box", "tray", "flat"];
const GROUP_LABELS: Record<StructureGroup, string> = { box: "Hộp", tray: "Khay", flat: "Thẻ, thiệp, đai" };
const GROUP_OF: Partial<Record<string, StructureGroup>> = {
  "cup-carrier": "tray",
  insert: "tray",
  "hang-tag": "flat",
  "folded-card": "flat",
  "belly-band": "flat",
  "sticker-label": "flat",
};
const groupOf = (id: string): StructureGroup => GROUP_OF[id] ?? "box";

const orderOf = (id: string) => {
  const index = BOX_STRUCTURES.findIndex((s) => s.id === id);
  return index < 0 ? BOX_STRUCTURES.length : index;
};

/**
 * Cards of the structures the API offers (`GET /templates/structures`), most common first (order of BOX_STRUCTURES,
 * new structures last); offline demo: the 4 built in.
 */
/** Shared empty list: a new `[]` each render would make the 3D box rebuild its model on every fold step. */
const NO_ELEMENTS: CanvasElement[] = [];

function structureCards(structures: BoxStructure[] | undefined): StructureCard[] {
  if (!structures) return BOX_STRUCTURES.map((s) => ({ ...s, apiName: s.vietnameseName }));
  return [...structures].sort((a, b) => orderOf(a.id) - orderOf(b.id)).map((api) => {
    const local = BOX_STRUCTURES.find((s) => s.id === api.id);
    const base = local ?? { ...GENERIC_STRUCTURE, id: api.id, name: api.name, vietnameseName: api.name, description: "" };
    return { ...base, apiName: api.name, description: api.description ?? base.description };
  });
}

interface Step1BoxTemplatePickerProps {
  selectedStructure: BoxStructureType;
  onSelectStructure: (type: BoxStructureType) => void;
  onNext: () => void;
  /** Structures of the API; omitted in the offline demo. */
  structures?: BoxStructure[];
}

export const Step1BoxTemplatePicker: React.FC<Step1BoxTemplatePickerProps> = ({
  selectedStructure,
  onSelectStructure,
  onNext,
  structures,
}) => {
  const cards = structureCards(structures);
  const current = cards.find((s) => s.id === selectedStructure) || cards[0];
  const [group, setGroup] = React.useState<StructureGroup | "all">("all");
  // A tag, a card or a sticker sheet is a flat sheet: its 3D model is a thin plate off to one side, the dieline shows
  // it better. Every new structure opens in the view that suits it.
  const flatPick = groupOf(current.id) === "flat";
  const [view, setView] = React.useState<"3d" | "2d">(flatPick ? "2d" : "3d");
  React.useEffect(() => setView(flatPick ? "2d" : "3d"), [current.id, flatPick]);
  const pieces = React.useMemo(() => {
    try {
      return generateDielinePieces(current.id, current.defaultDims, CURRENT_FORMULA_VERSION);
    } catch {
      return [];
    }
  }, [current.id, current.defaultDims]);
  const dims = current.defaultDims;
  const shown = group === "all" ? cards : cards.filter((card) => groupOf(card.id) === group);

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 pb-10 pt-6 sm:px-6">
      <StepHeader title={studioStep(1).title} />

      {/* The groups above both columns: the grid of boxes and the preview card start on the same line. */}
          <div role="group" aria-label="Nhóm kiểu hộp" className="mt-5 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
            {(["all", ...GROUP_ORDER] as const).map((id) => {
              const count = id === "all" ? cards.length : cards.filter((card) => groupOf(card.id) === id).length;
              if (count === 0) return null;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={group === id}
                  onClick={() => setGroup(id)}
                  className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm transition-colors ${
                    group === id ? "bg-landing-ink font-semibold text-white" : "bg-white font-medium text-landing-ink ring-1 ring-landing-line hover:ring-landing-ink/40"
                  }`}
                >
                  {id === "all" ? "Tất cả" : GROUP_LABELS[id]}
                  <span className={`text-xs tabular-nums ${group === id ? "text-white/70" : "text-landing-muted"}`}>{count}</span>
                </button>
              );
            })}
          </div>

      <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* The structures, as pictures: a grid the eye can scan. */}
        <div className="min-w-0">
          <ul aria-label="Cấu trúc hộp" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {shown.map((item) => {
              const isSelected = item.id === selectedStructure;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => onSelectStructure(item.id)}
                    className={`group relative flex w-full flex-col overflow-hidden rounded-2xl bg-white text-left transition ${
                      isSelected ? "ring-2 ring-fpt-orange" : "ring-1 ring-landing-line hover:ring-landing-ink/30"
                    }`}
                  >
                    <span className={`flex aspect-square items-center justify-center p-3 transition-colors ${isSelected ? "bg-orange-50" : "bg-landing-canvas group-hover:bg-landing-tile"}`}>
                      <StructureArt structure={item.id} className="h-full w-full" />
                    </span>
                    <span className="block px-3 py-2.5">
                      <span className="block truncate text-sm font-semibold text-landing-ink">{item.apiName}</span>
                      <span className="block truncate text-xs text-landing-muted">{item.badge}</span>
                    </span>
                    {isSelected && (
                      <span className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-fpt-orange text-white">
                        <Check className="size-3.5" strokeWidth={3} aria-hidden />
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* The chosen one: a turnable preview, four facts as icons, then go. */}
        <StudioCard as="aside" aria-label={`Xem trước ${current.apiName}`} className="flex flex-col gap-4 p-4 lg:sticky lg:top-[88px] lg:self-start">
          <div className="relative h-[280px] overflow-hidden rounded-squircle-md bg-landing-canvas" data-tour="s1-preview">
            {view === "3d" ? (
              <div className="absolute inset-0">
                <Box3DView
                  dimensions={dims}
                  foldProgress={1}
                  boxType={current.id}
                  theme="ivory"
                  elements={NO_ELEMENTS}
                  showHud={false}
                  showStatusBar={false}
                  enableMacroZoom={false}
                  viewControls={false}
                  frameless
                  minHeight={false}
                  className="h-full w-full"
                />
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-mist-150 bg-[radial-gradient(#D5DCCF_1px,transparent_1px)] p-6 [background-size:14px_14px]">
                <DielineSketch structure={current.id} dimensions={dims} label={`Khuôn bế ${current.apiName}`} className="h-full w-full" />
              </div>
            )}
            <div className="absolute left-2 top-2">
              <ViewToggle<"3d" | "2d">
                label="Chế độ xem"
                value={view}
                onChange={setView}
                options={[
                  { value: "3d", label: "3D", icon: Box },
                  { value: "2d", label: "Khuôn", icon: Grid3x3 },
                ]}
              />
            </div>
          </div>

          <div>
            <h2 className="font-landing-heading text-xl font-bold text-landing-ink">{current.apiName}</h2>
            {current.description && <p className="mt-1 line-clamp-2 text-sm text-landing-muted">{current.description}</p>}
          </div>

          <ul className="grid grid-cols-2 gap-2 text-sm">
            {[
              { icon: Layers, text: pieces.length > 1 ? `${pieces.length} mảnh` : "1 mảnh liền", label: "Số mảnh phôi" },
              { icon: Scissors, text: `${creaseCountOf(current)} nếp gấp`, label: "Nếp gấp trên khuôn" },
              { icon: FileText, text: current.recommendedPaper.replace(" GSM", ""), label: "Giấy gợi ý" },
              { icon: Hand, text: `Gấp ${current.foldDifficulty.toLowerCase()}`, label: "Độ khó khi gấp" },
            ].map(({ icon: Icon, text, label }) => (
              <li key={label} title={label} className="flex min-w-0 items-center gap-2 rounded-xl bg-landing-canvas px-2.5 py-2">
                <Icon className="size-4 shrink-0 text-fpt-orange" strokeWidth={1.75} aria-hidden />
                <span className="sr-only">{label}: </span>
                <span className="truncate font-medium text-landing-ink">{text}</span>
              </li>
            ))}
          </ul>

          {current.recommendedGifts.length > 0 && (
            <ul aria-label="Hợp với" className="flex flex-wrap gap-1.5">
              {current.recommendedGifts.map((gift) => (
                <li key={gift} className="rounded-full bg-landing-canvas px-2.5 py-1 text-xs text-landing-ink">
                  {gift}
                </li>
              ))}
            </ul>
          )}

          <button type="button" data-tour="studio-next" onClick={onNext} className={`${PRIMARY_PILL} self-start`}>
            {continueTo(2)}
            <ArrowRight className="size-4" aria-hidden />
          </button>
        </StudioCard>
      </div>
    </div>
  );
};

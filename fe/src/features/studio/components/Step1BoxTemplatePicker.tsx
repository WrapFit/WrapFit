"use client";

import React from "react";
import { ArrowRight, Box, Check, FileText, Grid3x3, Hand, Layers, Scissors } from "lucide-react";
import { Box3DView } from "@/features/studio/components/three/Box3DView";
import { CardTitle, MetricRow, PRIMARY_PILL, StepHeader, StudioCard, ViewToggle } from "@/features/studio/components/studioUi";
import { BoxPreview } from "@/features/templates/components/BoxPreview";
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

  const [view, setView] = React.useState<"3d" | "2d">("3d");
  const [fold, setFold] = React.useState(100);
  const pieces = React.useMemo(() => {
    try {
      return generateDielinePieces(current.id, current.defaultDims, CURRENT_FORMULA_VERSION);
    } catch {
      return [];
    }
  }, [current.id, current.defaultDims]);
  const dims = current.defaultDims;

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 pb-10 pt-6 sm:px-6">
      <StepHeader
        title="Chọn cấu trúc hộp"
        subtitle="Mỗi cấu trúc là một bộ công thức khuôn bế. Xem hộp gấp và khuôn trải phẳng trước khi nhập kích thước."
      />

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)_320px]">
        {/* Structures */}
        <StudioCard as="aside" aria-label="Cấu trúc hộp" className="h-fit p-3">
          <p className="px-2 pb-2 pt-1 text-xs font-medium text-landing-muted">{cards.length} cấu trúc</p>
          <ul className="flex flex-col gap-2">
            {cards.map((item) => {
              const isSelected = item.id === selectedStructure;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => onSelectStructure(item.id)}
                    className={`flex w-full items-center gap-3 rounded-2xl p-2 text-left transition-colors ${
                      isSelected ? "bg-orange-50 ring-2 ring-fpt-orange" : "hover:bg-landing-canvas"
                    }`}
                  >
                    <span className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-white p-1.5 ring-1 ring-landing-line/60">
                      <BoxPreview structure={item.id} dimensions={item.defaultDims} className="h-full w-full" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-landing-ink">{item.apiName}</span>
                      <span className="block truncate text-xs text-landing-muted">{item.badge}</span>
                    </span>
                    {isSelected && (
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-fpt-orange text-white">
                        <Check className="size-3.5" strokeWidth={3} aria-hidden />
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </StudioCard>

        {/* Stage */}
        <StudioCard aria-label={`Xem trước ${current.apiName}`} className="relative flex min-h-[560px] flex-col overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <ViewToggle<"3d" | "2d">
              label="Chế độ xem"
              value={view}
              onChange={setView}
              options={[
                { value: "3d", label: "Hộp 3D", icon: Box },
                { value: "2d", label: "Khuôn bế 2D", icon: Grid3x3 },
              ]}
            />
          </div>

          <div className={`relative mx-4 flex-1 overflow-hidden rounded-squircle-md ${view === "3d" ? "bg-landing-canvas" : "bg-mist-150 bg-[radial-gradient(#D5DCCF_1px,transparent_1px)] [background-size:14px_14px]"}`}>
            {view === "3d" ? (
              <div className="absolute inset-0">
                <Box3DView
                  dimensions={dims}
                  foldProgress={fold / 100}
                  boxType={current.id}
                  theme="ivory"
                  elements={NO_ELEMENTS}
                  showHud={false}
                  showStatusBar={false}
                  enableMacroZoom={false}
                  chrome="bar"
                  frameless
                  minHeight={false}
                  className="h-full w-full"
                />
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center p-8">
                <DielineSketch structure={current.id} dimensions={dims} label={`Khuôn bế ${current.apiName}`} className="h-full w-full" />
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            {view === "3d" ? (
              <label className="flex w-full items-center gap-3 text-sm text-landing-muted sm:w-auto">
                <span className="shrink-0 font-medium text-landing-ink">Gấp hộp</span>
                <input type="range" min={0} max={100} value={fold} onChange={(e) => setFold(Number(e.target.value))} aria-label="Mức gấp hộp" className="w-full accent-fpt-orange sm:w-64" />
                <span className="w-10 font-mono text-xs">{fold}%</span>
              </label>
            ) : (
              <span className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-landing-muted">
                <span className="inline-flex items-center gap-2">
                  <span aria-hidden className="h-0.5 w-6 bg-dieline-cut" />
                  Đường cắt
                </span>
                <span className="inline-flex items-center gap-2">
                  <span aria-hidden className="h-0 w-6 border-t-2 border-dashed border-dieline-crease" />
                  Đường gấp
                </span>
              </span>
            )}
            <span className="text-xs text-landing-muted">Kéo để xoay · kích thước mẫu, đổi ở bước 2</span>
          </div>
        </StudioCard>

        {/* Specs */}
        <div className="flex flex-col gap-4 lg:col-span-2 xl:col-span-1">
          <StudioCard className="p-5">
            <CardTitle>{current.apiName}</CardTitle>
            <p className="mt-1.5 text-sm leading-6 text-landing-muted">{current.description}</p>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1">
              <MetricRow icon={Scissors} label="Đường gấp trên khuôn" value={`${creaseCountOf(current)} nếp`} />
              <MetricRow icon={Layers} label="Số mảnh phôi" value={pieces.length > 1 ? `${pieces.length} mảnh (${pieces.map((p) => p.name).join(" + ")})` : "1 mảnh liền"} />
              <MetricRow icon={FileText} label="Giấy gợi ý" value={current.recommendedPaper} />
              <MetricRow icon={Hand} label="Độ khó khi gấp" value={current.foldDifficulty} />
            </div>
          </StudioCard>

          {current.recommendedGifts.length > 0 && (
            <StudioCard className="p-5">
              <CardTitle>Hợp với</CardTitle>
              <ul className="mt-3 flex flex-wrap gap-2">
                {current.recommendedGifts.map((gift) => (
                  <li key={gift} className="rounded-full bg-landing-canvas px-3 py-1.5 text-sm text-landing-ink">
                    {gift}
                  </li>
                ))}
              </ul>
            </StudioCard>
          )}

          <button type="button" onClick={onNext} className={`${PRIMARY_PILL} w-full`}>
            Tiếp tục: kích thước
            <ArrowRight className="size-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
};

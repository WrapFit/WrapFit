"use client";

import React from "react";
import { Check, ArrowRight, Layers } from "lucide-react";
import { DielineSketch } from "@/features/templates/components/DielineSketch";
import { BoxStructureType, caliperOf, CURRENT_FORMULA_VERSION, generateDielinePieces, UnsupportedStructureError } from "@wrapfit/shared";
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
  badgeColor: "bg-stone-50 text-stone-700 border-stone-200",
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

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-8 sm:px-6 lg:px-10">
      <div className="max-w-2xl">
        <p className="text-sm font-medium text-library-accent">Bước 1 · Cấu trúc hộp</p>
        <h1 className="mt-1 font-landing-heading text-2xl font-medium text-library-ink sm:text-[32px] sm:leading-tight">Chọn cấu trúc hộp</h1>
        <p className="mt-1.5 text-base leading-[1.6] text-library-sub">
          Mỗi cấu trúc là một bộ công thức khuôn bế: kích thước bạn nhập ở bước sau được tính thẳng ra đường cắt và đường gấp.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((item) => {
          const isSelected = item.id === selectedStructure;
          return (
            <button
              type="button"
              key={item.id}
              aria-pressed={isSelected}
              onClick={() => onSelectStructure(item.id)}
              className="group flex flex-col gap-3 text-left outline-none"
            >
              <span
                className={`relative block aspect-[321/201] w-full overflow-hidden rounded-2xl border bg-library-tile transition-shadow ${
                  isSelected ? "border-[1.5px] border-library-ink shadow-hard" : "border-library-ink group-hover:shadow-hard-sm group-focus-visible:shadow-hard-sm"
                }`}
              >
                <span className="absolute inset-0 flex items-center justify-center p-6">
                  <DielineSketch structure={item.id} dimensions={item.defaultDims} className="h-full w-full" />
                </span>
                <span className={`absolute left-3 top-3 rounded-md px-1.5 py-1 text-xs ${isSelected ? "bg-library-lime text-library-lime-ink" : "bg-white text-library-sub"}`}>
                  {item.badge}
                </span>
                <span className="absolute right-3 top-3 rounded-md bg-white px-1.5 py-1 font-mono text-[11px] text-library-sub">{creaseCountOf(item)} nếp gấp</span>
                {isSelected && (
                  <span className="absolute bottom-3 right-3 flex size-7 items-center justify-center rounded-full bg-library-lime-ink text-white">
                    <Check className="size-4" strokeWidth={3} aria-hidden />
                  </span>
                )}
              </span>
              <span>
                <span className="block text-base font-medium text-library-ink">{item.apiName}</span>
                <span className="mt-0.5 line-clamp-2 block text-sm leading-[1.5] text-library-sub">{item.description}</span>
                <span className="mt-2 flex items-center gap-1.5 text-xs text-library-muted">
                  <Layers className="size-3.5 shrink-0" aria-hidden />
                  <span className="truncate">{item.recommendedPaper}</span>
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col items-stretch justify-between gap-4 rounded-2xl border border-library-line bg-white p-4 sm:flex-row sm:items-center sm:p-5">
        <div className="min-w-0">
          <span className="block text-xs text-library-muted">Cấu trúc đã chọn</span>
          <span className="block truncate text-base font-medium text-library-ink">{current.apiName}</span>
        </div>
        <button
          type="button"
          onClick={onNext}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-library-lime px-5 text-base font-medium text-library-lime-ink transition-colors hover:bg-[#AFEC88]"
        >
          Tiếp tục: nhập kích thước
          <ArrowRight className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
};

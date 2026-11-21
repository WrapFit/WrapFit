"use client";

import { ChevronDown, LockKeyhole } from "lucide-react";
import { StructureArt } from "@/components/home/StructureArt";
import { BOX_STRUCTURES } from "@/features/studio/utils/boxStructures";
import type { BoxStructure } from "@/types/api";
import type { BoxStructureType } from "@wrapfit/shared";

export function Step1BoxTemplatePicker({ selectedStructure, structures, onSelectStructure }: {
  selectedStructure: BoxStructureType;
  structures?: BoxStructure[];
  /** Saved projects keep the structure their dieline was created with. */
  onSelectStructure?: (type: BoxStructureType) => void;
}) {
  const options = structures?.length ? structures : BOX_STRUCTURES.map((box) => ({ id: box.id, name: box.vietnameseName }));
  const selected = options.find((box) => box.id === selectedStructure);
  return (
    <div className="flex items-center gap-3 rounded-panel border border-line bg-surface-raised p-3">
      <div className="flex size-14 shrink-0 items-center justify-center rounded-control bg-accent-bg p-1">
        <StructureArt structure={selectedStructure} className="size-full" />
      </div>
      <div className="min-w-0 flex-1">
        <span id="studio-structure-label" className="text-caption font-medium text-fg-muted">Kiểu hộp</span>
        {onSelectStructure ? (
          <div className="relative">
            <select id="studio-structure" aria-labelledby="studio-structure-label" value={selectedStructure} onChange={(e) => onSelectStructure(e.target.value as BoxStructureType)}
              className="min-h-11 w-full appearance-none rounded-control border-0 bg-transparent bg-none py-1 pl-0 pr-6 text-label font-semibold text-fg">
              {options.map((box) => <option key={box.id} value={box.id}>{box.name}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-1 top-1/2 size-4 -translate-y-1/2 text-fg-muted" aria-hidden />
          </div>
        ) : (
          <p className="flex items-center gap-2 text-label font-semibold text-fg" title="Kiểu hộp được cố định khi lưu dự án">
            {selected?.name ?? selectedStructure}<LockKeyhole className="size-3.5" aria-label="Đã cố định" />
          </p>
        )}
      </div>
    </div>
  );
}

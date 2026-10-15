"use client";

import React, { useState } from "react";
import { RefreshCw, Ruler } from "lucide-react";
import { FORMULA_CHANGES } from "@wrapfit/shared";
import { upgradeProjectFormula } from "@/api";
import { useToast } from "@/components/common/Toast";
import { UnsavedChangesError } from "@/features/studio/hooks/useProjectSync";
import type { ProjectDetail, SnapshotSummary } from "@/types/api";
import { StudioDialog } from "../dialog/StudioDialog";

/** What the versions after `from` changed for this box structure, oldest first. */
export function formulaChangesOf(structure: string, from: number, to: number): string[] {
  const changes: string[] = [];
  for (let version = from + 1; version <= to; version++) {
    const change = FORMULA_CHANGES[version]?.[structure];
    if (change) changes.push(`bản ${version}: ${change}`);
  }
  return changes;
}

interface FormulaUpgradeProps {
  project: ProjectDetail;
  /** Runs the upgrade in the save queue (pending changes saved first) with the version last saved. */
  replace: (task: (version: number | undefined) => Promise<ProjectDetail>) => Promise<ProjectDetail>;
  /** The project moved to the new formulas: mount the editor again, offer to undo with `backup`. */
  onUpgraded: (project: ProjectDetail, backup: SnapshotSummary) => void;
}

/**
 * Banner of a project whose dieline uses older formulas than its box structure (docs/12 Phase 8, 8.10b), with a
 * confirmation before the upgrade. Projects in the trash do not show it (the studio is read-only there).
 */
export function FormulaUpgrade({ project, replace, onUpgraded }: FormulaUpgradeProps) {
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [running, setRunning] = useState(false);
  const from = project.formulaVersion;
  const to = project.latestFormulaVersion;
  if (from >= to) return null;
  const changes = formulaChangesOf(project.template.id, from, to);

  const upgrade = async () => {
    setRunning(true);
    let backup: SnapshotSummary | null = null;
    try {
      const upgraded = await replace(async (version) => {
        const result = await upgradeProjectFormula(project.id, version ?? project.version);
        backup = result.backup;
        return result.project;
      });
      setConfirming(false);
      toast.show({ tone: "success", title: `Phôi đã lên công thức bản ${upgraded.formulaVersion}`, description: "Chữ và ảnh giữ nguyên trên từng mặt." });
      if (backup) onUpgraded(upgraded, backup);
    } catch (err) {
      if (err instanceof UnsavedChangesError) toast.show({ tone: "error", title: "Chưa cập nhật được", description: err.message });
      else toast.error(err, "Chưa cập nhật được công thức");
      setRunning(false);
    }
  };

  return (
    <>
      <div className="w-full max-w-7xl 2xl:max-w-[1720px] mx-auto px-4 sm:px-6 pt-4">
        <div
          role="status"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-3xl bg-white border border-warning/30 shadow-none"
        >
          <div className="flex items-start sm:items-center gap-3 text-sm text-landing-ink min-w-0">
            <span className="w-9 h-9 flex-shrink-0 rounded-full bg-warning-bg text-warning-fg flex items-center justify-center">
              <Ruler className="w-4 h-4" aria-hidden />
            </span>
            <span className="min-w-0">
              Phôi của dự án dùng công thức cũ (bản {from}).{" "}
              {changes.length > 0 ? `Bản mới: ${changes.join("; ")}.` : `Đã có công thức bản ${to}.`}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="min-h-[40px] px-4 rounded-full bg-landing-green-night hover:bg-black text-white text-xs font-semibold transition flex-shrink-0 self-end sm:self-auto"
          >
            Cập nhật lên công thức mới
          </button>
        </div>
      </div>

      {confirming && (
        <StudioDialog
          title="Cập nhật công thức phôi?"
          subtitle={`Bản ${from} → bản ${to}`}
          icon={<RefreshCw className="w-5 h-5" aria-hidden />}
          onClose={() => setConfirming(false)}
          busy={running}
        >
          <div className="space-y-3 text-sm text-landing-ink">
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Hình phôi sẽ đổi theo công thức mới{changes.length > 0 ? `: ${changes.join("; ")}` : ""}.</li>
              <li>Chữ, ảnh, hoa văn giữ nguyên vị trí trên từng mặt; kích thước mặt có thể đổi vài phần mm.</li>
              <li>Điểm FitCheck được tính lại và có thể thay đổi.</li>
              <li>Nếu đã gửi file in cũ cho xưởng, file mới sẽ khác file đó.</li>
            </ul>
            <p className="text-xs text-landing-muted">
              Bản hiện tại được lưu thành mốc tự động; bấm “Hoàn tác” ngay sau đó, hoặc khôi phục mốc này trong “Mốc phiên
              bản”, để quay lại công thức cũ.
            </p>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={running}
                className="min-h-[44px] px-4 rounded-full border border-landing-line bg-white hover:bg-landing-canvas text-sm font-semibold text-landing-ink transition disabled:opacity-50"
              >
                Để sau
              </button>
              <button
                type="button"
                onClick={() => void upgrade()}
                disabled={running}
                className="min-h-[44px] px-5 rounded-full bg-landing-green-night hover:bg-black text-white text-sm font-semibold transition disabled:opacity-60 disabled:cursor-wait"
              >
                {running ? "Đang cập nhật…" : "Cập nhật công thức"}
              </button>
            </div>
          </div>
        </StudioDialog>
      )}
    </>
  );
}

"use client";

import { BLEED_MM, HARD_MIN_DPI, MIN_DPI, MIN_LINE_MM, SAFE_MARGIN_CREASE_MM, SAFE_MARGIN_CUT_MM, type BoxDimensions, type CanvasElement, type DielinePiece, type FitCheckErrorCode, type FitCheckReport, type QuoteFinish } from "@wrapfit/shared";
import { AlertTriangle, ArrowLeft, Box, Check, Download, Gift, Grid3x3, Sparkles, Wand2 } from "lucide-react";
import React, { useState } from "react";
import { DielineCanvas2D } from "@/features/studio/components/canvas/DielineCanvas2D";
import { Box3DView } from "@/features/studio/components/three/Box3DView";
import type { BoxMaterialTheme, BoxStructureType } from "@/features/studio/components/three/InteractiveFoldingBox3D";
import { CardTitle, PRIMARY_PILL, SECONDARY_PILL, StepActionBar, StepHeader, StudioCard, ViewToggle } from "@/features/studio/components/studioUi";
import { formatNumber, innerVolumeMl, sheetFits } from "@/features/studio/utils/boxMetrics";
import { paperStockOf } from "@/features/studio/utils/paperStocks";
import { cn } from "@/utils/helpers";
import { QuoteCard } from "./QuoteCard";



/** The rules of the shared FitCheck, grouped as a print shop reads them. */
const RULES: { title: string; detail: string; codes: FitCheckErrorCode[] }[] = [
  { title: "Vùng an toàn", detail: `Chữ, logo, mã vạch cách đường cắt ≥ ${SAFE_MARGIN_CUT_MM} mm, nếp gấp ≥ ${SAFE_MARGIN_CREASE_MM} mm`, codes: ["CUT_OVERLAP", "CREASE_OVERLAP"] },
  { title: "Tràn lề", detail: `Nền phủ ra ngoài đường cắt ${BLEED_MM}–3 mm`, codes: ["BLEED_INSUFFICIENT"] },
  { title: "Mép dán keo", detail: "Không có mực trên mép dán", codes: ["GLUE_CONTAMINATED"] },
  { title: "Độ phân giải ảnh", detail: `Ảnh ≥ ${MIN_DPI} DPI ở kích thước in (dưới ${HARD_MIN_DPI} DPI chặn xuất)`, codes: ["LOW_DPI"] },
  { title: "Độ dày nét", detail: `Nét chữ mảnh nhất ≥ ${MIN_LINE_MM} mm`, codes: ["LINE_TOO_THIN"] },
  { title: "Mã vạch & QR", detail: "Đủ lớn để quét, đúng số kiểm tra; in đen K100 trên nền trắng", codes: ["BARCODE_UNREADABLE"] },
  { title: "Khổ phôi", detail: "Phôi trải phẳng vừa khổ B1 1020 × 720 mm", codes: ["DIMENSION_OUT_OF_BOUNDS"] },
  { title: "Phần tử trên mặt hộp", detail: "Mọi phần tử nằm trên một mặt của khuôn", codes: ["NO_PANEL"] },
];

interface Step6ReviewExportProps {
  structureName: string;
  boxType: BoxStructureType;
  dimensions: BoxDimensions;
  activeMaterial: BoxMaterialTheme;
  finishes: QuoteFinish[];
  elements: CanvasElement[];
  backgroundPatternSvg: string | null;
  formulaVersion?: number;
  pieces: DielinePiece[];
  report: FitCheckReport;
  /** The server refused the last export with this report. */
  blocked: boolean;
  /** Title of the design (quote summary) and its project (null: offline demo). */
  title: string;
  projectId: string | null;
  onBack(): void;
  onAutoFix(): void;
  onExport(): void;
  /** Back to the design step with the library open (an empty box). */
  onDesign(): void;
}

/** Step 6: the print file as the shop gets it, the FitCheck™ certificate, the quote and the sample order, the export. */
export function Step6ReviewExport({
  structureName,
  boxType,
  dimensions,
  activeMaterial,
  finishes,
  elements,
  backgroundPatternSvg,
  formulaVersion,
  pieces,
  report,
  blocked,
  title,
  projectId,
  onBack,
  onAutoFix,
  onExport,
  onDesign,
}: Step6ReviewExportProps) {
  const [view, setView] = useState<"2d" | "3d">("2d");
  const [pieceIndex, setPieceIndex] = useState(0);
  const [fold, setFold] = useState(100);
  const [open, setOpen] = useState(false);
  const paper = paperStockOf(activeMaterial);
  const fits = sheetFits(pieces);
  const errors = report.violations.filter((v) => v.severity === "error").length;
  const warnings = report.violations.filter((v) => v.severity === "warning").length;
  const passed = errors === 0;
  // No artwork: a plain box can be printed, but it is not "print-ready art".
  const empty = report.violations.some((v) => v.code === "EMPTY_DESIGN");
  const fixable = report.violations.some((v) => ["CUT_OVERLAP", "CREASE_OVERLAP", "BLEED_INSUFFICIENT"].includes(v.code));
  const piece = pieces[pieceIndex] ?? pieces[0];

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 pb-6 pt-6 sm:px-6">
      <StepHeader
        title="Kiểm tra & đặt in"
        subtitle={`${structureName} · ${dimensions.length} × ${dimensions.width} × ${dimensions.height} mm · ${paper.name}`}
      />

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* Stage */}
        <StudioCard className="flex min-h-[600px] flex-col overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <ViewToggle<"2d" | "3d">
              label="Chế độ xem"
              value={view}
              onChange={setView}
              options={[
                { value: "2d", label: "Khuôn bế 1:1", icon: Grid3x3 },
                { value: "3d", label: "Hộp 3D", icon: Box },
              ]}
            />
            {view === "2d" && pieces.length > 1 && (
              <ViewToggle<string>
                label="Mảnh phôi"
                value={String(pieceIndex)}
                onChange={(value) => setPieceIndex(Number(value))}
                options={pieces.map((p, index) => ({ value: String(index), label: p.name }))}
              />
            )}
          </div>

          <div className="relative mx-4 flex-1 overflow-hidden rounded-squircle-md bg-landing-canvas">
            {view === "2d" && piece ? (
              // Read-only: no onElementsChange, nothing moves here.
              <DielineCanvas2D dieline={piece.geometry} elements={elements} backgroundPatternSvg={backgroundPatternSvg} activePanelId="all" showRulers className="h-full !min-h-[520px] !rounded-squircle-md" />
            ) : (
              <div className="absolute inset-0">
                <Box3DView
                  dimensions={dimensions}
                  foldProgress={fold / 100}
                  boxType={boxType}
                  theme={activeMaterial}
                  elements={elements}
                  backgroundPatternSvg={backgroundPatternSvg}
                  formulaVersion={formulaVersion}
                  interactiveOpenState={open}
                  showHud={false}
                  showStatusBar={false}
                  frameless
                  minHeight={false}
                  className="h-full w-full"
                />
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm text-landing-muted">
            {view === "3d" ? (
              <>
                <label className="flex w-full items-center gap-3 sm:w-auto">
                  <span className="shrink-0 font-medium text-landing-ink">Gấp hộp</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={fold}
                    onChange={(e) => {
                      setFold(Number(e.target.value));
                      if (Number(e.target.value) < 90) setOpen(false);
                    }}
                    aria-label="Mức gấp hộp"
                    className="w-full accent-fpt-orange sm:w-64"
                  />
                  <span className="w-10 font-mono text-xs">{fold}%</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setOpen((value) => !value);
                    setFold(100);
                  }}
                  aria-pressed={open}
                  className={cn("inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors", open ? "bg-stone-900 text-white" : "bg-fpt-orange text-white hover:bg-fpt-orange-dark shadow-xs")}
                >
                  <Gift className="size-4" aria-hidden />
                  {open ? "Đóng nắp" : "Mở nắp"}
                </button>
              </>
            ) : (
              <span>
                Khuôn {fits.map((fit) => `${fit.width} × ${fit.height}`).join(" + ")} mm · {fits.length ? Math.min(...fits.map((fit) => fit.perSheet)) : "–"} hộp / tờ B1 · thể tích {formatNumber(innerVolumeMl(dimensions))} ml
              </span>
            )}
          </div>
        </StudioCard>

        {/* Report */}
        <div className="flex flex-col gap-4">
          <StudioCard data-tour="s6-status" className={cn("p-5", empty ? "bg-surface-sunken" : passed ? "bg-orange-50 border border-orange-200" : "bg-danger-bg")}>
            {empty ? (
              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-xs font-semibold text-fpt-orange-ink">FitCheck™</p>
                  <p className="mt-1 font-landing-heading text-xl font-bold text-landing-ink">Hộp trơn, chưa có hình in</p>
                  <p className="mt-1 text-sm text-landing-muted">In được như một hộp màu giấy. Thêm chữ, tem hoặc áp một phong cách để FitCheck kiểm tra hình in.</p>
                </div>
                <button type="button" onClick={onDesign} className={`${SECONDARY_PILL} w-full bg-surface-raised`}>
                  <Sparkles className="size-4" aria-hidden />
                  Áp phong cách cho hộp
                </button>
              </div>
            ) : (
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-fpt-orange-ink">FitCheck™</p>
                <p className="mt-1 font-landing-heading text-xl font-bold text-landing-ink">{passed ? (warnings ? "Xuất được, nên sửa cảnh báo" : "Đạt chuẩn in") : "Còn lỗi chặn xuất file"}</p>
                <p className="mt-1 text-sm text-landing-muted">
                  {errors} lỗi · {warnings} cảnh báo
                </p>
              </div>
              <p className="font-landing-heading text-5xl font-bold leading-none text-landing-ink">
                {report.score}
                <span className="text-base font-semibold text-landing-muted">/100</span>
              </p>
            </div>
            )}
            {blocked && (
              <p role="alert" className="mt-3 flex gap-2 rounded-2xl bg-white p-3 text-sm text-danger-fg">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                Máy chủ đã chặn lần xuất file trước vì các lỗi dưới đây.
              </p>
            )}
          </StudioCard>

          <StudioCard data-tour="s6-checks" className="p-5">
            <CardTitle action={<span className="text-xs text-landing-muted">{RULES.filter((rule) => !report.violations.some((v) => rule.codes.includes(v.code) && v.severity !== "info")).length}/{RULES.length} đạt</span>}>
              Quy tắc sản xuất
            </CardTitle>
            <ul className="mt-3 flex flex-col gap-2">
              {RULES.map((rule) => {
                // Notes (info) do not fail a rule.
                const hits = report.violations.filter((v) => rule.codes.includes(v.code) && v.severity !== "info");
                const error = hits.some((v) => v.severity === "error");
                return (
                  <li key={rule.title} className="flex items-start gap-3 rounded-2xl bg-landing-canvas p-3">
                    <span
                      className={cn(
                        "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full",
                        hits.length === 0 ? "bg-fpt-orange text-white" : error ? "bg-danger-bg text-danger-fg" : "bg-warning-bg text-warning-fg",
                      )}
                    >
                      {hits.length === 0 ? <Check className="size-3.5" strokeWidth={3} aria-hidden /> : <AlertTriangle className="size-3.5" aria-hidden />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-landing-ink">
                        {rule.title}
                        {hits.length > 0 && <span className="ml-1.5 font-normal text-landing-muted">· {hits.length} chỗ</span>}
                      </span>
                      <span className="block text-xs leading-5 text-landing-muted">{hits[0]?.message ?? rule.detail}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
            {fixable && (
              <button type="button" onClick={onAutoFix} className={`${SECONDARY_PILL} mt-3 w-full bg-landing-canvas`}>
                <Wand2 className="size-4" aria-hidden />
                Tự sửa lề an toàn & tràn lề
              </button>
            )}
          </StudioCard>

          <QuoteCard
            structure={boxType}
            pieces={pieces}
            dimensions={dimensions}
            formulaVersion={formulaVersion}
            material={activeMaterial}
            finishes={finishes}
            title={title}
            projectId={projectId}
            blocked={!passed}
          />
        </div>
      </div>

      <StepActionBar
        back={
          <button type="button" onClick={onBack} className={SECONDARY_PILL}>
            <ArrowLeft className="size-4" aria-hidden />
            Quà & mở hộp
          </button>
        }
        summary={
          <>
            <span className="block text-xs">Gói file in</span>
            <span className="text-landing-ink">.ai · PDF CMYK · JPG đối chiếu · SVG · DXF</span>
          </>
        }
        next={
          <button type="button" data-tour="s6-export" onClick={onExport} disabled={!passed} title={passed ? undefined : "Sửa các lỗi FitCheck trước khi xuất"} className={PRIMARY_PILL}>
            <Download className="size-4" aria-hidden />
            Tải gói file in
          </button>
        }
      />
    </div>
  );
}

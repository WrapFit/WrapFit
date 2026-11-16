"use client";

import { BLEED_MM, FINISH_LABELS, HARD_MIN_DPI, MIN_DPI, MIN_LINE_MM, SAFE_MARGIN_CREASE_MM, SAFE_MARGIN_CUT_MM, type BoxDimensions, type CanvasElement, type DielinePiece, type FitCheckErrorCode, type FitCheckReport, type QuoteFinish } from "@wrapfit/shared";
import { AlertTriangle, ArrowLeft, Box, Check, Gift, Grid3x3, Palette, ShieldCheck, Wand2 } from "lucide-react";
import React, { useMemo, useState } from "react";
import { DielineCanvas2D } from "@/features/studio/components/canvas/DielineCanvas2D";
import { Box3DView } from "@/features/studio/components/three/Box3DView";
import type { BoxMaterialTheme, BoxStructureType } from "@/features/studio/components/three/InteractiveFoldingBox3D";
import { PRIMARY_PILL, SECONDARY_PILL, SectionCard, StepActionBar, StepHeader, StudioCard, ViewToggle } from "@/features/studio/components/studioUi";
import { studioStep } from "@/features/studio/components/StudioStepper";
import { ReviewPanel } from "@/features/studio/components/review/ReviewPanel";
import { Dialog } from "@/components/ui";
import { formatNumber, innerVolumeMl, sheetFits } from "@/features/studio/utils/boxMetrics";
import { paperStockOf } from "@/features/studio/utils/paperStocks";
import { cn } from "@/utils/helpers";
import { ExportPurchaseCard } from "./export/ExportPurchaseCard";
import { QuoteBreakdown } from "./QuoteBreakdown";
import { QuoteCard } from "./QuoteCard";



/** The rules of the shared FitCheck, grouped as a print shop reads them. */
const RULES: { title: string; detail: string; codes: FitCheckErrorCode[] }[] = [
  { title: "Vùng an toàn", detail: `Chữ, logo, mã vạch cách đường cắt ≥ ${SAFE_MARGIN_CUT_MM} mm, nếp gấp ≥ ${SAFE_MARGIN_CREASE_MM} mm`, codes: ["CUT_OVERLAP", "CREASE_OVERLAP"] },
  { title: "Tràn lề", detail: `Nền phủ ra ngoài đường cắt ${BLEED_MM}–3 mm`, codes: ["BLEED_INSUFFICIENT"] },
  { title: "Mép dán keo", detail: "Không có mực trên mép dán", codes: ["GLUE_CONTAMINATED"] },
  { title: "Độ phân giải ảnh", detail: `Ảnh ≥ ${MIN_DPI} DPI ở kích thước in (dưới ${HARD_MIN_DPI} DPI chặn xuất)`, codes: ["LOW_DPI"] },
  { title: "Độ dày nét", detail: `Nét chữ mảnh nhất ≥ ${MIN_LINE_MM} mm`, codes: ["LINE_TOO_THIN"] },
  { title: "Mã vạch & QR", detail: "Đủ lớn, quét được", codes: ["BARCODE_UNREADABLE"] },
  { title: "Khổ phôi", detail: "Phôi trải phẳng vừa khổ B1 1020 × 720 mm", codes: ["DIMENSION_OUT_OF_BOUNDS"] },
  { title: "Phần tử trên mặt hộp", detail: "Mọi phần tử nằm trên một mặt của khuôn", codes: ["NO_PANEL"] },
  { title: "Hướng đọc", detail: "Chữ đứng xuôi khi hộp đã gấp", codes: ["READING_DIRECTION"] },
  { title: "Chữ dễ đọc", detail: "≥ 6 pt, rõ nền, tránh nếp gấp", codes: ["TEXT_TOO_SMALL", "LOW_CONTRAST", "TEXT_ON_CREASE"] },
  { title: "Cửa sổ & lỗ khoét", detail: "Hình chính tránh lỗ khoét", codes: ["UNDER_OPENING"] },
];

interface Step6ReviewExportProps {
  structureName: string;
  boxType: BoxStructureType;
  dimensions: BoxDimensions;
  activeMaterial: BoxMaterialTheme;
  finishes: QuoteFinish[];
  /** The design prints on the inside of the sheet too (priced as a second pass). */
  insidePrint?: boolean;
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
  /** Opens the export dialog: only reachable once a package covers this design (ExportPurchaseCard). */
  onExport(): void;
  /** Demo of a signed-in user: saves it as a project to export. */
  signedIn?: boolean;
  onSaveProject?(): void;
  saving?: boolean;
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
  insidePrint = false,
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
  signedIn,
  onSaveProject,
  saving,
}: Step6ReviewExportProps) {
  const [view, setView] = useState<"2d" | "3d">("2d");
  const [pieceIndex, setPieceIndex] = useState(0);
  const [fold, setFold] = useState(100);
  const [open, setOpen] = useState(false);
  /** Boxes of the quote: the card and the breakdown below follow the same number. */
  const [quantity, setQuantity] = useState(50);
  const [showRulesModal, setShowRulesModal] = useState(false);
  /** Default scale of the dieline in Step 6 is fixed at 111% (1.11) on initial open */
  const [scale, setScale] = useState<number>(1.11);
  const paper = paperStockOf(activeMaterial);
  const fits = sheetFits(pieces);
  const errors = report.violations.filter((v) => v.severity === "error").length;
  const warnings = report.violations.filter((v) => v.severity === "warning").length;
  const passed = errors === 0;
  // No artwork: a plain box can be printed, but it is not "print-ready art".
  const empty = report.violations.some((v) => v.code === "EMPTY_DESIGN");
  const fixable = report.violations.some((v) => (["CUT_OVERLAP", "CREASE_OVERLAP", "BLEED_INSUFFICIENT"].includes(v.code) || (v.code === "READING_DIRECTION" && v.severity === "warning")));
  const piece = pieces[pieceIndex] ?? pieces[0];
  // Notes (info) do not fail a rule.
  const ruleStates = RULES.map((rule) => {
    const hits = report.violations.filter((v) => rule.codes.includes(v.code) && v.severity !== "info");
    return { rule, hits, error: hits.some((v) => v.severity === "error") };
  });
  const failingRules = ruleStates.filter((r) => r.hits.length > 0);
  const passingRules = ruleStates.filter((r) => r.hits.length === 0);

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 pb-6 pt-4 sm:px-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-stretch">
        {/* Stage */}
        <StudioCard className="flex flex-col overflow-hidden h-full">
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

          {/* A definite height: the dieline fits inside it instead of growing with the width and sinking to the bottom. */}
          <div className="relative mx-4 h-[560px] overflow-hidden rounded-squircle-md bg-landing-canvas lg:h-[calc(100dvh-240px)] lg:min-h-[440px]">
            {view === "2d" && piece ? (
              // Read-only: no onElementsChange, nothing moves here.
              <div className="absolute inset-0 flex">
                <DielineCanvas2D
                  dieline={piece.geometry}
                  scale={scale}
                  onScaleChange={setScale}
                  elements={elements}
                  backgroundPatternSvg={backgroundPatternSvg}
                  activePanelId="all"
                  showRulers
                  className="!min-h-0 h-full w-full !rounded-squircle-md"
                />
              </div>
            ) : (
              <div className="absolute inset-0">
                <Box3DView
                  dimensions={dimensions}
                  foldProgress={fold / 100}
                  faceLabels
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

          {view === "3d" && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm text-landing-muted">
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
            </div>
          )}
        </StudioCard>

        {/* Right Column: Unified FitCheck Status & Export File In */}
        <div className="flex flex-col gap-4 h-full">
          {/* FitCheck Status Card */}
          {empty ? (
            <StudioCard data-tour="s6-status" className="border border-line bg-surface-raised p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-7 items-center justify-center rounded-full bg-orange-100 text-fpt-orange shrink-0">
                    <Palette className="size-3.5" aria-hidden />
                  </span>
                  <div>
                    <p className="font-bold text-sm text-fg">Hộp chưa có hình in</p>
                    <p className="text-xs text-fg-muted">Hộp trơn vẫn đặt in được chuẩn khuôn bế.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onDesign}
                  className="rounded-lg bg-orange-50 px-3 py-1.5 text-xs font-semibold text-fpt-orange-ink hover:bg-orange-100 transition-colors shrink-0"
                >
                  Thêm hình →
                </button>
              </div>
            </StudioCard>
          ) : passed && !warnings ? (
            /* Giữ nguyên thiết kế đạt chuẩn hiện tại theo yêu cầu người dùng */
            <StudioCard data-tour="s6-status" className="border border-emerald-200 bg-emerald-50/70 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow-2xs shrink-0">
                    <Check className="size-4 stroke-[3]" aria-hidden />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-emerald-950">FitCheck™: Đạt chuẩn in</p>
                      <button
                        type="button"
                        onClick={() => setShowRulesModal(true)}
                        className="text-[11px] font-medium text-emerald-700 hover:underline cursor-pointer"
                      >
                        (11/11 tiêu chuẩn ↗)
                      </button>
                    </div>
                    <p className="text-xs text-emerald-700">Đạt mọi yêu cầu kỹ thuật cho gia công bế và in ấn.</p>
                  </div>
                </div>
                <span className="font-landing-heading text-2xl font-bold text-emerald-700 tabular-nums">100<span className="text-xs font-normal text-emerald-600">/100</span></span>
              </div>
            </StudioCard>
          ) : (
            /* Khi bị lỗi: hiển thị thông báo lỗi ngắn gọn, người dùng BẤM ĐƯỢC để mở modal chi tiết */
            <button
              type="button"
              onClick={() => setShowRulesModal(true)}
              className={cn(
                "w-full text-left rounded-2xl border p-4 transition-all hover:shadow-xs group cursor-pointer",
                errors > 0 ? "border-red-200 bg-red-50/80 hover:bg-red-50 hover:border-red-300" : "border-amber-200 bg-amber-50/80 hover:bg-amber-50 hover:border-amber-300"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <span className={cn(
                    "flex size-7 items-center justify-center rounded-full text-white shadow-2xs shrink-0 mt-0.5",
                    errors > 0 ? "bg-red-500" : "bg-amber-500"
                  )}>
                    <AlertTriangle className="size-3.5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={cn("font-bold text-sm", errors > 0 ? "text-red-950" : "text-amber-950")}>
                        {errors > 0 ? `FitCheck™: ${errors} lỗi cần sửa` : `FitCheck™: ${warnings} cảnh báo in`}
                      </p>
                      <span className="text-[11px] font-semibold text-fpt-orange underline group-hover:text-fpt-orange-dark">
                        Bấm xem chi tiết ↗
                      </span>
                    </div>
                    {/* Danh sách lỗi súc tích, ngắn gọn */}
                    <div className="mt-1 space-y-0.5 text-xs text-slate-700">
                      {report.violations.filter((v) => v.severity !== "info").slice(0, 2).map((v, i) => (
                        <p key={v.id ?? i} className="truncate">
                          • <strong className="text-fg">{v.title}:</strong> {v.message}
                        </p>
                      ))}
                      {report.violations.filter((v) => v.severity !== "info").length > 2 && (
                        <p className="text-[11px] text-fg-muted font-medium">
                          + thêm {report.violations.filter((v) => v.severity !== "info").length - 2} điểm khác (bấm để xem)...
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <span className={cn(
                  "font-landing-heading text-2xl font-bold tabular-nums shrink-0",
                  errors > 0 ? "text-red-700" : "text-amber-700"
                )}>
                  {report.score}<span className="text-xs font-normal text-slate-400">/100</span>
                </span>
              </div>
            </button>
          )}

          {/* Card File in & Thanh toán - Cân bằng chiều cao với file thiết kế bên trái */}
          <ExportPurchaseCard
            projectId={projectId}
            blocked={!passed}
            onExport={onExport}
            signedIn={signedIn}
            onSaveProject={onSaveProject}
            saving={saving}
            className="flex-1"
            specSummary={{
              structureName,
              dimensions,
              paperName: paper.name,
              finishesText: finishes.length ? finishes.map((f) => FINISH_LABELS[f] ?? f).join(", ") : undefined,
            }}
          />

          {/* Comments and the print approval of customers / print shops (docs/23 S23); saved projects only. */}
          {projectId && (
            <StudioCard data-tour="s6-review" className="p-5">
              <ReviewPanel projectId={projectId} pieces={pieces} />
            </StudioCard>
          )}
        </div>
      </div>

      {/* Modal báo cáo kiểm định sản xuất: Hiển thị cả lỗi và tất cả điểm FitCheck đã đạt */}
      {showRulesModal && (
        <Dialog
          title="Báo cáo kiểm định sản xuất (FitCheck™)"
          description="Đánh giá chi tiết 11 tiêu chuẩn kỹ thuật in ấn và gia công khuôn bế."
          size="lg"
          onClose={() => setShowRulesModal(false)}
        >
          <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
            {/* Phân vùng 1: Các lỗi & cảnh báo cần khắc phục (nếu có) */}
            {failingRules.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-danger-fg flex items-center gap-1.5">
                    <AlertTriangle className="size-3.5 text-red-600" />
                    Cần khắc phục ({failingRules.reduce((sum, r) => sum + r.hits.length, 0)} vị trí)
                  </h4>
                  {fixable && (
                    <button
                      type="button"
                      onClick={() => {
                        onAutoFix();
                        setShowRulesModal(false);
                      }}
                      className="inline-flex items-center gap-1 rounded-md bg-orange-100 px-2.5 py-1 text-xs font-semibold text-fpt-orange-ink hover:bg-orange-200 transition-colors"
                    >
                      <Wand2 className="size-3" />
                      Tự sửa lề nhanh
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {failingRules.map(({ rule, hits, error }) => (
                    <div
                      key={rule.title}
                      className={cn(
                        "rounded-xl border p-3 text-xs",
                        error ? "border-red-200 bg-red-50/70" : "border-amber-200 bg-amber-50/70"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-black/5 pb-1.5">
                        <span className="font-bold text-sm text-fg">{rule.title}</span>
                        <span className={cn(
                          "rounded px-2 py-0.5 text-[10px] font-bold uppercase",
                          error ? "bg-red-200 text-red-800" : "bg-amber-200 text-amber-800"
                        )}>
                          {error ? "Lỗi chặn xuất file" : "Cảnh báo"}
                        </span>
                      </div>

                      <div className="mt-2 space-y-2">
                        {hits.map((hit, idx) => (
                          <div key={hit.id ?? idx} className="rounded-lg bg-white/95 p-2.5 border border-black/5">
                            <p className="font-medium text-fg leading-relaxed">• {hit.message}</p>
                            {hit.suggestion && (
                              <p className="mt-1 text-[11px] text-amber-900 bg-amber-50/90 rounded p-1.5 border border-amber-200/80">
                                💡 <strong>Hướng khắc phục:</strong> {hit.suggestion}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="mt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setShowRulesModal(false);
                            onDesign();
                          }}
                          className="text-xs font-semibold text-fpt-orange hover:underline inline-flex items-center gap-1"
                        >
                          <Palette className="size-3" /> Mở bước Thiết kế để sửa →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Phân vùng 2: TẤT CẢ các điểm FitCheck đã đạt */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                <Check className="size-3.5 text-emerald-600 stroke-[3]" />
                Các tiêu chuẩn đã đạt chuẩn ({passingRules.length}/{RULES.length})
              </h4>

              <div className="space-y-1.5">
                {passingRules.map(({ rule }) => (
                  <div
                    key={rule.title}
                    className="flex items-start gap-2.5 rounded-xl border border-line/60 bg-surface-sunken/40 px-3 py-2 text-xs"
                  >
                    <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                      <Check className="size-2.5" strokeWidth={3.5} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-fg text-body-sm">{rule.title}</span>
                        <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/60 rounded px-1.5 py-0.2">
                          Đạt chuẩn
                        </span>
                      </div>
                      <p className="mt-0.5 text-caption text-fg-muted">{rule.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Dialog>
      )}

      {/* The print quote as one wide row under the dieline, then its detail. */}
      <div className="mt-4">
        <QuoteCard
          structure={boxType}
          pieces={pieces}
          dimensions={dimensions}
          formulaVersion={formulaVersion}
          material={activeMaterial}
          finishes={finishes}
          insidePrint={insidePrint}
          title={title}
          projectId={projectId}
          blocked={!passed}
          quantity={quantity}
          onQuantityChange={setQuantity}
        />
      </div>

      <div className="mt-4">
        <QuoteBreakdown
          structure={boxType}
          pieces={pieces}
          material={activeMaterial}
          finishes={finishes}
          insidePrint={insidePrint}
          quantity={quantity}
        />
      </div>

      <StepActionBar
        back={
          <button type="button" onClick={onBack} className={SECONDARY_PILL}>
            <ArrowLeft className="size-4" aria-hidden />
            {studioStep(5).label}
          </button>
        }
        summary={
          <>
            <span className="block text-xs">Gói file in (sau khi thanh toán)</span>
            <span className="text-landing-ink">.ai · PDF CMYK · JPG đối chiếu · SVG · DXF</span>
          </>
        }
      />
    </div>
  );
}

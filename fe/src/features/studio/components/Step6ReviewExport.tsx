"use client";

import { BLEED_MM, FINISH_LABELS, HARD_MIN_DPI, MIN_DPI, MIN_LINE_MM, SAFE_MARGIN_CREASE_MM, SAFE_MARGIN_CUT_MM, type BoxDimensions, type CanvasElement, type DielinePiece, type FitCheckErrorCode, type FitCheckReport, type QuoteFinish } from "@wrapfit/shared";
import { AlertTriangle, ArrowLeft, Box, Check, CreditCard, Download, Grid3x3, LogIn, PackageOpen, Palette, Plus, Save, ShieldCheck, Wand2 } from "lucide-react";
import React, { useMemo, useState } from "react";
import Link from "next/link";
import { DielineCanvas2D } from "@/features/studio/components/canvas/DielineCanvas2D";
import { Box3DView } from "@/features/studio/components/three/Box3DView";
import type { BoxMaterialTheme, BoxStructureType } from "@/features/studio/components/three/InteractiveFoldingBox3D";
import { PRIMARY_PILL, SECONDARY_PILL, SectionCard, StepActionBar, StepHeader, StudioCard, ViewToggle } from "@/features/studio/components/studioUi";
import { studioStep } from "@/features/studio/components/StudioStepper";
import { ReviewPanel } from "@/features/studio/components/review/ReviewPanel";
import { Dialog } from "@/components/ui";
import { ROUTES } from "@/constants";
import { formatNumber, innerVolumeMl, sheetFits } from "@/features/studio/utils/boxMetrics";
import { paperStockOf } from "@/features/studio/utils/paperStocks";
import { cn } from "@/utils/helpers";
import { ExportPurchaseCard } from "./export/ExportPurchaseCard";
import { QuoteBreakdown } from "./QuoteBreakdown";
import { QuoteCard } from "./QuoteCard";
import { PrePressColorCard } from "./imposition/PrePressColorCard";
import { type IccProfileId, ICC_PROFILES } from "../types/imposition";



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
  { title: "Ảnh kho", detail: "Ảnh Pexels đi kèm chữ, logo, hoa văn hoặc ảnh của bạn", codes: ["STOCK_PHOTO_ALONE"] },
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
  const [selectedIccProfile, setSelectedIccProfile] = useState<IccProfileId>(() => {
    if (activeMaterial === "kraft") return "FOGRA47";
    return "FOGRA39";
  });

  const [pieceIndex, setPieceIndex] = useState(0);
  const [fold, setFold] = useState(100);
  const [open, setOpen] = useState(false);
  /** Boxes of the quote: the card and the breakdown below follow the same number. */
  const [quantity, setQuantity] = useState(50);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
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
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_400px] lg:items-stretch">
        {/* Stage */}
        <div className="flex flex-col h-full min-h-[520px]">
          <StudioCard className="flex flex-col overflow-hidden h-full shadow-xs border border-line/60">
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 shrink-0">
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

            {/* Canvas fills the entire card body with flex-1, leaving zero white space */}
            <div className={cn("relative mx-4 flex-1 overflow-hidden rounded-squircle-md bg-landing-canvas", view === "3d" ? "mb-0" : "mb-4")}>
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
                    showCups={dimensions.showCups !== false}
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
              <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 p-4 border-t border-line/60 text-sm text-landing-muted">
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
                  <span className="w-10 font-sans text-xs font-semibold tabular-nums text-fg">{fold}%</span>
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
                  <PackageOpen className="size-4" aria-hidden />
                  {open ? "Đóng nắp" : "Mở nắp"}
                </button>
              </div>
            )}
          </StudioCard>
        </div>

        {/* Right Column: Unified FitCheck Status & Export File In */}
        <div className="flex flex-col gap-4 h-full">
          {/* FitCheck Status Card */}
          {empty ? (
            <StudioCard data-tour="s6-status" className="border border-emerald-200 bg-emerald-50/70 p-4 rounded-2xl shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <span className="flex size-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow-2xs shrink-0 mt-0.5">
                    <Check className="size-4 stroke-[3]" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-emerald-950">FitCheck™: Khuôn bế đạt chuẩn in</p>
                    <p className="text-xs text-emerald-700/90 leading-relaxed mt-0.5">
                      Hộp trơn không in · Tỷ lệ khuôn 1:1 sẵn sàng sản xuất dao bế.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end shrink-0 pl-2">
                  <span className="font-landing-heading text-2xl font-bold text-emerald-700 tabular-nums leading-none">
                    {report.score}<span className="text-xs font-normal text-emerald-600">/100</span>
                  </span>
                  <span className="text-caption font-medium text-emerald-600 uppercase tracking-wider mt-1">Xuất sắc</span>
                </div>
              </div>

              {/* Dedicated action bar for adding graphics & viewing standards */}
              <div className="mt-3 pt-2.5 border-t border-emerald-200/60 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setShowRulesModal(true)}
                  className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 underline underline-offset-2 cursor-pointer whitespace-nowrap inline-flex items-center gap-1"
                >
                  <span>11/11 tiêu chí đạt chuẩn</span>
                  <span>↗</span>
                </button>
                <button
                  type="button"
                  onClick={onDesign}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-300 hover:bg-emerald-100/70 transition-all shadow-2xs cursor-pointer whitespace-nowrap"
                >
                  <Plus className="size-3.5 text-emerald-700" />
                  <span>Thêm hình in</span>
                </button>
              </div>
            </StudioCard>
          ) : passed && !warnings ? (
            <StudioCard data-tour="s6-status" className="border border-emerald-200 bg-emerald-50/70 p-4 rounded-2xl shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <span className="flex size-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow-2xs shrink-0 mt-0.5">
                    <Check className="size-4 stroke-[3]" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-emerald-950">FitCheck™: Đạt chuẩn in 100%</p>
                    <p className="text-xs text-emerald-700/90 leading-relaxed mt-0.5">
                      Đạt mọi yêu cầu kỹ thuật cho gia công bế và in ấn.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end shrink-0 pl-2">
                  <span className="font-landing-heading text-2xl font-bold text-emerald-700 tabular-nums leading-none">
                    {report.score}<span className="text-xs font-normal text-emerald-600">/100</span>
                  </span>
                  <span className="text-caption font-medium text-emerald-600 uppercase tracking-wider mt-1">Xuất sắc</span>
                </div>
              </div>

              {/* Dedicated action bar for editing graphics & viewing standards */}
              <div className="mt-3 pt-2.5 border-t border-emerald-200/60 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setShowRulesModal(true)}
                  className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 underline underline-offset-2 cursor-pointer whitespace-nowrap inline-flex items-center gap-1"
                >
                  <span>11/11 tiêu chí đạt chuẩn</span>
                  <span>↗</span>
                </button>
                <button
                  type="button"
                  onClick={onDesign}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-300 hover:bg-emerald-100/70 transition-all shadow-2xs cursor-pointer whitespace-nowrap"
                >
                  <Palette className="size-3.5 text-emerald-700" />
                  <span>Sửa hình in</span>
                </button>
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
                <div className="flex items-start gap-2.5 min-w-0">
                  <span className={cn(
                    "flex size-7 items-center justify-center rounded-full text-white shadow-2xs shrink-0 mt-0.5",
                    errors > 0 ? "bg-red-500" : "bg-amber-500"
                  )}>
                    <AlertTriangle className="size-3.5" aria-hidden />
                  </span>
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <p className={cn("font-bold text-sm", errors > 0 ? "text-red-950" : "text-amber-950")}>
                        {errors > 0 ? `FitCheck™: ${errors} lỗi cần sửa` : `FitCheck™: ${warnings} cảnh báo in`}
                      </p>
                      <span className="text-xs font-semibold text-fpt-orange underline group-hover:text-fpt-orange-dark whitespace-nowrap">
                        Bấm xem chi tiết ↗
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end shrink-0 pl-2">
                  <span className={cn(
                    "font-landing-heading text-2xl font-bold tabular-nums leading-none",
                    errors > 0 ? "text-red-700" : "text-amber-700"
                  )}>
                    {report.score}<span className="text-xs font-normal text-slate-400">/100</span>
                  </span>
                  <span className={cn(
                    "text-caption font-medium uppercase tracking-wider mt-1",
                    errors > 0 ? "text-red-600" : "text-amber-600"
                  )}>
                    {errors > 0 ? "Cần sửa" : "Cần lưu ý"}
                  </span>
                </div>
              </div>
            </button>
          )}

          {/* Thiết lập chế bản xưởng & Quản trị màu ICC */}
          <PrePressColorCard
            activeMaterial={activeMaterial}
            selectedIccProfile={selectedIccProfile}
            onIccProfileChange={setSelectedIccProfile}
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
          size="lg"
          onClose={() => setShowRulesModal(false)}
        >
          <div className="space-y-4 pr-1">
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
                          "rounded px-2 py-0.5 text-label-sm font-bold uppercase",
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
                              <p className="mt-1 text-caption text-amber-900 bg-amber-50/90 rounded p-1.5 border border-amber-200/80">
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
                        <span className="text-label-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/60 rounded px-1.5 py-0.2">
                          Đạt chuẩn
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Dialog>
      )}

      {/* Báo giá in & Gói file xuất xưởng đặt cùng hàng/khu vực bên dưới khuôn bế để cân đối hoàn hảo */}
      <div className="mt-5 space-y-4">
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
          showBreakdown={showBreakdown}
          onToggleBreakdown={() => setShowBreakdown((prev) => !prev)}
        />

        {showBreakdown && (
          <div className="animate-pop-in motion-reduce:animate-none">
            <QuoteBreakdown
              structure={boxType}
              pieces={pieces}
              material={activeMaterial}
              finishes={finishes}
              insidePrint={insidePrint}
              quantity={quantity}
            />
          </div>
        )}

        {/* Card Gói File Xuất Xưởng & Thanh Toán - Đặt ngay bên dưới Báo giá in */}
        <ExportPurchaseCard
          projectId={projectId}
          blocked={!passed}
          onExport={onExport}
          signedIn={signedIn}
          onSaveProject={onSaveProject}
          saving={saving}
          specSummary={{
            structureName,
            dimensions,
            paperName: `${paper.name} • ${ICC_PROFILES.find((p) => p.id === selectedIccProfile)?.name ?? selectedIccProfile}`,
            finishesText: finishes.length ? finishes.map((f) => FINISH_LABELS[f] ?? f).join(", ") : undefined,
          }}
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
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 font-sans text-xs font-semibold tabular-nums",
                passed && !warnings
                  ? "bg-emerald-100 text-emerald-800"
                  : errors > 0
                    ? "bg-red-100 text-red-800"
                    : "bg-amber-100 text-amber-800"
              )}
            >
              FitCheck {report.score}/100
            </span>
            <div className="text-left font-sans">
              <span className="block text-xs text-fg-muted">Gói file in xuất xưởng</span>
              <span className="font-semibold text-fg">PDF CMYK 300 DPI · DXF dao bế · SVG</span>
            </div>
          </div>
        }
        next={
          !projectId && !signedIn ? (
            <Link href={ROUTES.login} className={PRIMARY_PILL}>
              <LogIn className="size-4" aria-hidden />
              <span>Đăng nhập đặt in</span>
            </Link>
          ) : !projectId ? (
            <button
              type="button"
              onClick={onSaveProject}
              disabled={saving || !onSaveProject}
              className={PRIMARY_PILL}
            >
              <Save className="size-4" aria-hidden />
              <span>{saving ? "Đang lưu…" : "Lưu dự án & Đặt in"}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onExport}
              disabled={!passed}
              className={PRIMARY_PILL}
            >
              <Download className="size-4" aria-hidden />
              <span>Xuất file in ngay</span>
            </button>
          )
        }
      />
    </div>
  );
}

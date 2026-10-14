"use client";

import { BLEED_MM, MIN_DPI, SAFE_MARGIN_MM, type BoxDimensions, type CanvasElement, type DielinePiece, type FitCheckErrorCode, type FitCheckReport } from "@wrapfit/shared";
import { AlertTriangle, ArrowLeft, Box, Check, Download, Gift, Grid3x3, QrCode, Sparkles, Wand2 } from "lucide-react";
import React, { useState } from "react";
import { DielineCanvas2D } from "@/features/studio/components/canvas/DielineCanvas2D";
import { Box3DView } from "@/features/studio/components/three/Box3DView";
import type { BoxMaterialTheme, BoxStructureType } from "@/features/studio/components/three/InteractiveFoldingBox3D";
import { CardTitle, PRIMARY_PILL, SECONDARY_PILL, StepActionBar, StepHeader, StudioCard, ViewToggle } from "@/features/studio/components/studioUi";
import { formatNumber, innerVolumeMl, sheetFits } from "@/features/studio/utils/boxMetrics";
import { PAPER_STOCKS } from "@/features/studio/utils/paperStocks";
import { cn } from "@/utils/helpers";

type Environment = "studio" | "marble" | "kraft_wood" | "forest_velvet" | "festive_glow";

const ENVIRONMENTS: { id: Environment; name: string; color: string }[] = [
  { id: "studio", name: "Studio", color: "#ECE8E1" },
  { id: "marble", name: "Đá cẩm thạch", color: "#F8FAFC" },
  { id: "kraft_wood", name: "Gỗ mộc", color: "#C29B61" },
  { id: "forest_velvet", name: "Nhung xanh", color: "#064E3B" },
  { id: "festive_glow", name: "Không khí Tết", color: "#FED7AA" },
];

/** The rules of the shared FitCheck, grouped as a print shop reads them. */
const RULES: { title: string; detail: string; codes: FitCheckErrorCode[] }[] = [
  { title: "Vùng an toàn", detail: `Chữ, logo cách đường cắt và nếp gấp ≥ ${SAFE_MARGIN_MM} mm`, codes: ["CUT_OVERLAP", "CREASE_OVERLAP"] },
  { title: "Tràn lề", detail: `Nền phủ ra ngoài đường cắt ≥ ${BLEED_MM} mm`, codes: ["BLEED_INSUFFICIENT"] },
  { title: "Mép dán keo", detail: "Không có mực trên mép dán", codes: ["GLUE_CONTAMINATED"] },
  { title: "Độ phân giải ảnh", detail: `Ảnh ≥ ${MIN_DPI} DPI ở kích thước in`, codes: ["LOW_DPI"] },
  { title: "Khổ phôi", detail: "Phôi trải phẳng vừa khổ B1 1020 × 720 mm", codes: ["DIMENSION_OUT_OF_BOUNDS"] },
  { title: "Phần tử trên mặt hộp", detail: "Mọi phần tử nằm trên một mặt của khuôn", codes: ["NO_PANEL"] },
];

interface Step6ReviewExportProps {
  structureName: string;
  boxType: BoxStructureType;
  dimensions: BoxDimensions;
  activeMaterial: BoxMaterialTheme;
  elements: CanvasElement[];
  backgroundPatternSvg: string | null;
  formulaVersion?: number;
  pieces: DielinePiece[];
  report: FitCheckReport;
  /** The server refused the last export with this report. */
  blocked: boolean;
  onBack(): void;
  onAutoFix(): void;
  onExport(): void;
  onOpenQr(): void;
}

/** Step 6: the print file as the shop gets it, the FitCheck™ certificate, then the export. */
export function Step6ReviewExport({
  structureName,
  boxType,
  dimensions,
  activeMaterial,
  elements,
  backgroundPatternSvg,
  formulaVersion,
  pieces,
  report,
  blocked,
  onBack,
  onAutoFix,
  onExport,
  onOpenQr,
}: Step6ReviewExportProps) {
  const [view, setView] = useState<"2d" | "3d">("2d");
  const [pieceIndex, setPieceIndex] = useState(0);
  const [env, setEnv] = useState<Environment>("studio");
  const [fold, setFold] = useState(100);
  const [open, setOpen] = useState(false);
  const paper = PAPER_STOCKS.find((item) => item.theme === activeMaterial) ?? PAPER_STOCKS[0];
  const fits = sheetFits(pieces);
  const errors = report.violations.filter((v) => v.severity === "error").length;
  const warnings = report.violations.length - errors;
  const passed = errors === 0;
  const fixable = report.violations.some((v) => ["CUT_OVERLAP", "CREASE_OVERLAP", "BLEED_INSUFFICIENT"].includes(v.code));
  const piece = pieces[pieceIndex] ?? pieces[0];

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 pb-6 pt-6 sm:px-6">
      <StepHeader
        step="Bước 6 / 6 · Kiểm tra & xuất file"
        title="Sẵn sàng gửi xưởng in"
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
            {view === "3d" && (
              <div role="radiogroup" aria-label="Bối cảnh" className="flex flex-wrap gap-1.5">
                {ENVIRONMENTS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="radio"
                    aria-checked={env === item.id}
                    onClick={() => setEnv(item.id)}
                    className={cn(
                      "inline-flex h-9 items-center gap-2 rounded-full px-3 text-xs font-medium transition-colors",
                      env === item.id ? "bg-landing-green-night text-white" : "bg-landing-canvas text-landing-ink hover:bg-landing-tile",
                    )}
                  >
                    <span aria-hidden className="size-3.5 rounded-full ring-1 ring-black/15" style={{ backgroundColor: item.color }} />
                    {item.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative mx-4 flex-1 overflow-hidden rounded-[20px] bg-landing-canvas">
            {view === "2d" && piece ? (
              // Read-only: no onElementsChange, nothing moves here.
              <DielineCanvas2D dieline={piece.geometry} elements={elements} backgroundPatternSvg={backgroundPatternSvg} activePanelId="all" showRulers className="h-full !min-h-[520px] !rounded-[20px]" />
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
                  environment={env}
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
                    className="w-full accent-landing-green sm:w-64"
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
                  className={cn("inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors", open ? "bg-landing-green-night text-white" : "bg-landing-lime text-landing-green-night hover:bg-[#AFEC88]")}
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
          <StudioCard className={cn("p-5", passed ? "bg-landing-lime-mist" : "bg-red-50")}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-landing-green-deep">FitCheck™</p>
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
            {blocked && (
              <p role="alert" className="mt-3 flex gap-2 rounded-2xl bg-white p-3 text-sm text-red-800">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                Máy chủ đã chặn lần xuất file trước vì các lỗi dưới đây.
              </p>
            )}
          </StudioCard>

          <StudioCard className="p-5">
            <CardTitle action={<span className="text-xs text-landing-muted">{RULES.filter((rule) => !report.violations.some((v) => rule.codes.includes(v.code))).length}/{RULES.length} đạt</span>}>
              Quy tắc sản xuất
            </CardTitle>
            <ul className="mt-3 flex flex-col gap-2">
              {RULES.map((rule) => {
                const hits = report.violations.filter((v) => rule.codes.includes(v.code));
                const error = hits.some((v) => v.severity === "error");
                return (
                  <li key={rule.title} className="flex items-start gap-3 rounded-2xl bg-landing-canvas p-3">
                    <span
                      className={cn(
                        "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full",
                        hits.length === 0 ? "bg-landing-lime text-landing-green-night" : error ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800",
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

          <StudioCard className="bg-landing-green-night p-5 text-white">
            <p className="flex items-center gap-2 font-landing-heading text-lg font-bold">
              <QrCode className="size-5 text-landing-lime" aria-hidden />
              Mã QR mở hộp
            </p>
            <p className="mt-1.5 text-sm leading-6 text-landing-lime-mist/80">In mã lên hộp: người nhận quét để mở hộp 3D cùng lời chúc của bạn.</p>
            <button type="button" onClick={onOpenQr} className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-landing-lime text-sm font-semibold text-landing-green-night transition-colors hover:bg-[#AFEC88]">
              <Sparkles className="size-4" aria-hidden />
              Tạo lời chúc & mã QR
            </button>
          </StudioCard>
        </div>
      </div>

      <StepActionBar
        back={
          <button type="button" onClick={onBack} className={SECONDARY_PILL}>
            <ArrowLeft className="size-4" aria-hidden />
            Sửa thiết kế
          </button>
        }
        summary={
          <>
            <span className="block text-xs">Định dạng file in</span>
            <span className="text-landing-ink">PDF CMYK 300 DPI · SVG · DXF</span>
          </>
        }
        next={
          <button type="button" onClick={onExport} disabled={!passed} title={passed ? undefined : "Sửa các lỗi FitCheck trước khi xuất"} className={PRIMARY_PILL}>
            <Download className="size-4" aria-hidden />
            Xuất file in
          </button>
        }
      />
    </div>
  );
}

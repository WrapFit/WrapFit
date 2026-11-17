"use client";

import React, { useMemo, useState } from "react";
import {
  type DielinePiece,
  type CanvasElement,
} from "@wrapfit/shared";
import {
  CopyCheck,
  Maximize2,
  Printer,
  Sparkles,
  ZoomIn,
  ZoomOut,
  Target,
  Palette,
  CheckCircle2,
} from "lucide-react";
import {
  type IccProfileId,
  type PressSheetId,
  PRESS_SHEET_FORMATS,
  type PrinterMarksConfig,
  DEFAULT_PRINTER_MARKS,
  ICC_PROFILES,
} from "../../types/imposition";
import { calculateImposition } from "../../utils/imposition";
import { cn } from "@/utils/helpers";

interface ImpositionCanvas2DProps {
  piece: DielinePiece;
  allPieces?: DielinePiece[];
  projectTitle?: string;
  selectedSheetId: PressSheetId;
  onSheetChange: (sheetId: PressSheetId) => void;
  selectedIccProfile: IccProfileId;
  paperName?: string;
  marksConfig?: PrinterMarksConfig;
  onMarksConfigChange?: (marks: PrinterMarksConfig) => void;
  className?: string;
}

export function ImpositionCanvas2D({
  piece,
  projectTitle = "Hộp quà WrapFit",
  selectedSheetId,
  onSheetChange,
  selectedIccProfile,
  paperName = "Giấy Ivory 300 GSM",
  marksConfig,
  onMarksConfigChange,
  className,
}: ImpositionCanvas2DProps) {
  const [scale, setScale] = useState<number>(1);
  const [knifeGutter, setKnifeGutter] = useState<number>(4);
  const [internalMarks, setInternalMarks] = useState<PrinterMarksConfig>(DEFAULT_PRINTER_MARKS);
  const marks = marksConfig ?? internalMarks;
  const setMarks = onMarksConfigChange ?? setInternalMarks;

  const b = piece.geometry.totalBoundingBox;
  const pw = Math.round(b.width);
  const ph = Math.round(b.height);

  const imposition = useMemo(() => {
    return calculateImposition({
      pieceWidth: pw,
      pieceHeight: ph,
      sheetId: selectedSheetId,
      knifeGutter,
    });
  }, [pw, ph, selectedSheetId, knifeGutter]);

  const icc = ICC_PROFILES.find((p) => p.id === selectedIccProfile) ?? ICC_PROFILES[0];
  const { sheet, items, totalUps, paperEfficiencyPercent, wastePercent } = imposition;

  // ViewBox coordinates for the full press sheet with outer bleed margin for registration marks
  const MARGIN_OUTER = 30; // mm margin outside sheet for crop and registration marks
  const vbX = -MARGIN_OUTER;
  const vbY = -MARGIN_OUTER;
  const vbW = sheet.width + MARGIN_OUTER * 2;
  const vbH = sheet.height + MARGIN_OUTER * 2;

  return (
    <div className={cn("flex flex-col h-full bg-slate-900 text-white select-none overflow-hidden", className)}>
      {/* Top Toolbar: Quick Sheet Selector & Imposition Metrics */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/80 px-4 py-2.5 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
            <Printer className="size-4 text-fpt-orange" aria-hidden />
            <span>Khổ tờ in:</span>
          </div>

          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => onSheetChange("AUTO_OPTIMAL")}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs font-medium transition-all flex items-center gap-1",
                selectedSheetId === "AUTO_OPTIMAL"
                  ? "border-fpt-orange bg-fpt-orange text-white font-semibold shadow-xs"
                  : "border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500 hover:text-white"
              )}
            >
              <Sparkles className="size-3" />
              <span>Tự động tối ưu</span>
            </button>

            {PRESS_SHEET_FORMATS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => onSheetChange(f.id)}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-xs font-medium transition-all",
                  selectedSheetId === f.id
                    ? "border-fpt-orange bg-fpt-orange text-white font-semibold shadow-xs"
                    : "border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500 hover:text-white"
                )}
              >
                {f.id === "B1" ? "Khổ B1 (79×109)" : f.id === "SHEET_65X86" ? "Khổ 65×86" : f.id === "SHEET_70X100" ? "Khổ 70×100" : "A3+ KTS"}
              </button>
            ))}
          </div>
        </div>

        {/* Live Metrics Pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="rounded-md bg-slate-800/90 border border-slate-700 px-2.5 py-1 flex items-center gap-1.5 text-slate-200">
            <CopyCheck className="size-3.5 text-emerald-400" />
            <span>Số con:</span>
            <strong className="text-white font-bold">{totalUps} con/tờ</strong>
            <span className="text-caption text-slate-400">({imposition.cols}×{imposition.rows})</span>
          </div>

          <div className="rounded-md bg-slate-800/90 border border-slate-700 px-2.5 py-1 flex items-center gap-1.5 text-slate-200">
            <CheckCircle2 className="size-3.5 text-blue-400" />
            <span>Tận dụng giấy:</span>
            <strong className={cn("font-bold", paperEfficiencyPercent >= 75 ? "text-emerald-400" : "text-amber-400")}>
              {paperEfficiencyPercent}%
            </strong>
            <span className="text-caption text-slate-400">(Hao hụt: {wastePercent}%)</span>
          </div>
        </div>
      </div>

      {/* SVG Canvas Stage */}
      <div className="relative flex-1 min-h-[360px] w-full overflow-hidden flex items-center justify-center p-4 bg-radial from-slate-900 to-slate-950">
        <svg
          viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
          className="max-h-full max-w-full drop-shadow-2xl transition-transform duration-200 ease-out"
          style={{ transform: `scale(${scale})` }}
        >
          <defs>
            {/* Striped pattern for gripper margin */}
            <pattern id="gripper-hatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="8" stroke="#f59e0b" strokeWidth="2.5" opacity="0.25" />
            </pattern>

            {/* Registration Mark crosshair reticle symbol */}
            <g id="reg-mark">
              <circle cx="0" cy="0" r="4.5" fill="none" stroke="#ffffff" strokeWidth="0.4" />
              <circle cx="0" cy="0" r="2.5" fill="none" stroke="#ffffff" strokeWidth="0.4" />
              <line x1="-7" y1="0" x2="7" y2="0" stroke="#ffffff" strokeWidth="0.35" />
              <line x1="0" y1="-7" x2="0" y2="7" stroke="#ffffff" strokeWidth="0.35" />
              <path d="M 0 0 L 2.5 0 A 2.5 2.5 0 0 0 0 -2.5 Z" fill="#ffffff" opacity="0.8" />
              <path d="M 0 0 L -2.5 0 A 2.5 2.5 0 0 0 0 2.5 Z" fill="#ffffff" opacity="0.8" />
            </g>
          </defs>

          {/* 1. Base Press Sheet Substrate (Tờ giấy in thô) */}
          <rect
            x={0}
            y={0}
            width={sheet.width}
            height={sheet.height}
            fill="#ffffff"
            stroke="#64748b"
            strokeWidth={0.8}
            rx={1}
          />

          {/* 2. Technical Information Slug Line (Mép trên cùng ngoài bản in) */}
          {marks.jobSlug && (
            <text
              x={14}
              y={-12}
              fill="#94a3b8"
              fontSize={7}
              fontFamily="sans-serif"
              fontWeight="600"
            >
              WrapFit Pre-Press Imposition • Dự án: {projectTitle} • Khổ tờ: {sheet.width}×{sheet.height} mm • Số lượng: {totalUps} con/tờ • ICC: {icc.name} • {paperName}
            </text>
          )}

          {/* 3. Color Control Bars (Thước đo dải thang màu CMYK & đĩa tram ở mép trên) */}
          {marks.colorBars && (
            <g transform="translate(20, 4)">
              {/* Cyan Steps */}
              <rect x={0} y={0} width={12} height={5} fill="#00ffff" stroke="#000" strokeWidth={0.15} />
              <rect x={12} y={0} width={10} height={5} fill="#40ffff" stroke="#000" strokeWidth={0.15} />
              <rect x={22} y={0} width={10} height={5} fill="#80ffff" stroke="#000" strokeWidth={0.15} />
              <rect x={32} y={0} width={10} height={5} fill="#bffff" stroke="#000" strokeWidth={0.15} />

              {/* Magenta Steps */}
              <rect x={46} y={0} width={12} height={5} fill="#ff00ff" stroke="#000" strokeWidth={0.15} />
              <rect x={58} y={0} width={10} height={5} fill="#ff40ff" stroke="#000" strokeWidth={0.15} />
              <rect x={68} y={0} width={10} height={5} fill="#ff80ff" stroke="#000" strokeWidth={0.15} />
              <rect x={78} y={0} width={10} height={5} fill="#ffbfff" stroke="#000" strokeWidth={0.15} />

              {/* Yellow Steps */}
              <rect x={92} y={0} width={12} height={5} fill="#ffff00" stroke="#000" strokeWidth={0.15} />
              <rect x={104} y={0} width={10} height={5} fill="#ffff40" stroke="#000" strokeWidth={0.15} />
              <rect x={114} y={0} width={10} height={5} fill="#ffff80" stroke="#000" strokeWidth={0.15} />
              <rect x={124} y={0} width={10} height={5} fill="#ffffbf" stroke="#000" strokeWidth={0.15} />

              {/* Black Steps */}
              <rect x={138} y={0} width={12} height={5} fill="#000000" stroke="#000" strokeWidth={0.15} />
              <rect x={150} y={0} width={10} height={5} fill="#404040" stroke="#000" strokeWidth={0.15} />
              <rect x={160} y={0} width={10} height={5} fill="#808080" stroke="#000" strokeWidth={0.15} />
              <rect x={170} y={0} width={10} height={5} fill="#c0c0c0" stroke="#000" strokeWidth={0.15} />

              {/* Overprint Trapping Pairs: Blue, Red, Green, 3-Color */}
              <rect x={184} y={0} width={12} height={5} fill="#0000ff" stroke="#000" strokeWidth={0.15} />
              <rect x={196} y={0} width={12} height={5} fill="#ff0000" stroke="#000" strokeWidth={0.15} />
              <rect x={208} y={0} width={12} height={5} fill="#00ff00" stroke="#000" strokeWidth={0.15} />
              <rect x={220} y={0} width={12} height={5} fill="#4a3b32" stroke="#000" strokeWidth={0.15} />

              {/* Gray Balance Patch (50C / 40M / 40Y) */}
              <rect x={236} y={0} width={16} height={5} fill="#7b7774" stroke="#000" strokeWidth={0.15} />
              <text x={256} y={4.2} fill="#64748b" fontSize={4} fontFamily="monospace" fontWeight="bold">
                CMYK COLOR CONTROL BAR • FOGRA39 / ISO 12647-2
              </text>
            </g>
          )}

          {/* 4. Gripper Margin Area (Mép kẹp nhíp máy in offset ở mép đáy) */}
          <g>
            <rect
              x={0}
              y={sheet.height - imposition.gripperMargin}
              width={sheet.width}
              height={imposition.gripperMargin}
              fill="url(#gripper-hatch)"
              stroke="#e2e8f0"
              strokeWidth={0.5}
            />
            <line
              x1={0}
              y1={sheet.height - imposition.gripperMargin}
              x2={sheet.width}
              y2={sheet.height - imposition.gripperMargin}
              stroke="#f59e0b"
              strokeWidth={0.6}
              strokeDasharray="4 2"
            />
            <text
              x={sheet.width / 2}
              y={sheet.height - imposition.gripperMargin / 2 + 1.5}
              textAnchor="middle"
              fill="#b45309"
              fontSize={4.5}
              fontFamily="sans-serif"
              fontWeight="bold"
            >
              ▲ MÉP KẸP NHÍP MÁY IN OFFSET (GRIPPER MARGIN: {imposition.gripperMargin} MM) - KHÔNG ĐƯỢC CHỨA HÌNH IN
            </text>
          </g>

          {/* 5. Nested Die-cut Blank Items (Các con phôi được dàn đều trên tờ in) */}
          {items.map((item, index) => {
            return (
              <g key={item.id} transform={`translate(${item.x}, ${item.y})`}>
                {/* Outer bounding box / Cut clearance */}
                <rect
                  x={0}
                  y={0}
                  width={item.width}
                  height={item.height}
                  fill="#f8fafc"
                  stroke="#cbd5e1"
                  strokeWidth={0.4}
                  strokeDasharray="2 2"
                />

                {/* Simulated inner dieline wireframe representation */}
                <rect
                  x={2}
                  y={2}
                  width={item.width - 4}
                  height={item.height - 4}
                  fill="#ffffff"
                  stroke="#e53e3e"
                  strokeWidth={0.6}
                  rx={item.rotated ? 4 : 2}
                />

                {/* Inner crease fold guide lines */}
                <line
                  x1={2}
                  y1={item.height * 0.35}
                  x2={item.width - 2}
                  y2={item.height * 0.35}
                  stroke="#3182ce"
                  strokeWidth={0.4}
                  strokeDasharray="2 2"
                />
                <line
                  x1={2}
                  y1={item.height * 0.65}
                  x2={item.width - 2}
                  y2={item.height * 0.65}
                  stroke="#3182ce"
                  strokeWidth={0.4}
                  strokeDasharray="2 2"
                />

                {/* Center Badge showing Up Number and Size */}
                <g transform={`translate(${item.width / 2}, ${item.height / 2})`}>
                  <rect
                    x={-24}
                    y={-10}
                    width={48}
                    height={20}
                    rx={3}
                    fill="#1e293b"
                    opacity={0.88}
                  />
                  <text
                    x={0}
                    y={-1.5}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize={6}
                    fontFamily="sans-serif"
                    fontWeight="bold"
                  >
                    Con #{index + 1}
                  </text>
                  <text
                    x={0}
                    y={6}
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize={4.2}
                    fontFamily="monospace"
                  >
                    {Math.round(item.width)} × {Math.round(item.height)} mm
                  </text>
                </g>

                {/* Orientation tag */}
                <text
                  x={4}
                  y={8}
                  fill="#64748b"
                  fontSize={4}
                  fontFamily="sans-serif"
                  fontWeight="600"
                >
                  {item.rotated ? "⤾ Xoay 90°" : "→ Xuôi 0°"}
                </text>
              </g>
            );
          })}

          {/* 6. Registration Marks (Dấu chữ thập canh 4 bản kẽm CMYK xung quanh tờ in) */}
          {marks.registrationMarks && (
            <g>
              {/* 4 Corners outside sheet */}
              <use href="#reg-mark" x={-12} y={-12} />
              <use href="#reg-mark" x={sheet.width + 12} y={-12} />
              <use href="#reg-mark" x={-12} y={sheet.height + 12} />
              <use href="#reg-mark" x={sheet.width + 12} y={sheet.height + 12} />

              {/* 4 Center Edge Marks */}
              <use href="#reg-mark" x={sheet.width / 2} y={-12} />
              <use href="#reg-mark" x={sheet.width / 2} y={sheet.height + 12} />
              <use href="#reg-mark" x={-12} y={sheet.height / 2} />
              <use href="#reg-mark" x={sheet.width + 12} y={sheet.height / 2} />
            </g>
          )}

          {/* 7. Sheet Outer Crop Marks (Dấu dao xén 4 góc khổ giấy) */}
          {marks.cropMarks && (
            <g stroke="#ffffff" strokeWidth={0.4}>
              {/* Top-Left */}
              <line x1={-6} y1={0} x2={-1} y2={0} />
              <line x1={0} y1={-6} x2={0} y2={-1} />

              {/* Top-Right */}
              <line x1={sheet.width + 1} y1={0} x2={sheet.width + 6} y2={0} />
              <line x1={sheet.width} y1={-6} x2={sheet.width} y2={-1} />

              {/* Bottom-Left */}
              <line x1={-6} y1={sheet.height} x2={-1} y2={sheet.height} />
              <line x1={0} y1={sheet.height + 1} x2={0} y2={sheet.height + 6} />

              {/* Bottom-Right */}
              <line x1={sheet.width + 1} y1={sheet.height} x2={sheet.width + 6} y2={sheet.height} />
              <line x1={sheet.width} y1={sheet.height + 1} x2={sheet.width} y2={sheet.height + 6} />
            </g>
          )}
        </svg>

        {/* Floating Zoom & Preset Controls */}
        <div className="absolute bottom-4 right-4 flex items-center gap-1 rounded-full bg-slate-950/80 p-1 border border-slate-700/80 shadow-lg backdrop-blur-md">
          <button
            type="button"
            onClick={() => setScale((s) => Math.max(0.6, +(s - 0.15).toFixed(2)))}
            className="rounded-full p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white"
            title="Thu nhỏ"
          >
            <ZoomOut className="size-4" />
          </button>
          <span className="w-12 text-center text-xs font-mono font-semibold text-slate-200">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setScale((s) => Math.min(2.0, +(s + 0.15).toFixed(2)))}
            className="rounded-full p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white"
            title="Phóng to"
          >
            <ZoomIn className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setScale(1)}
            className="rounded-full p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white"
            title="Vừa màn hình (100%)"
          >
            <Maximize2 className="size-4" />
          </button>
        </div>
      </div>

      {/* Bottom Technical Spec Bar */}
      <div className="border-t border-slate-800 bg-slate-950 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={marks.registrationMarks}
              onChange={(e) => setMarks({ ...marks, registrationMarks: e.target.checked })}
              className="rounded accent-fpt-orange"
            />
            <Target className="size-3.5 text-slate-300" />
            <span className="text-slate-300">Dấu chữ thập canh kẽm</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={marks.colorBars}
              onChange={(e) => setMarks({ ...marks, colorBars: e.target.checked })}
              className="rounded accent-fpt-orange"
            />
            <Palette className="size-3.5 text-slate-300" />
            <span className="text-slate-300">Thước đo thang màu CMYK</span>
          </label>

          <div className="flex items-center gap-1.5">
            <span>Khoảng hở dao bế:</span>
            <select
              value={knifeGutter}
              onChange={(e) => setKnifeGutter(Number(e.target.value))}
              className="rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-slate-200 text-xs"
            >
              <option value={3}>3 mm (Tiết kiệm phôi)</option>
              <option value={4}>4 mm (Chuẩn công nghiệp)</option>
              <option value={5}>5 mm (Khuôn bế dày)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 text-slate-300">
          <span>Kích thước phôi trải:</span>
          <strong className="text-white font-mono">{pw} × {ph} mm</strong>
          <span className="text-slate-600">•</span>
          <span>Khổ tờ in offset:</span>
          <strong className="text-fpt-orange font-mono">{sheet.width} × {sheet.height} mm</strong>
        </div>
      </div>
    </div>
  );
}

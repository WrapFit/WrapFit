"use client";

import React, { useState } from "react";
import { ArrowLeft, ArrowRight, Box, Gift, Palette, QrCode, Sliders } from "lucide-react";
import { PRIMARY_PILL, SECONDARY_PILL, StepActionBar } from "@/features/studio/components/studioUi";
import { BoxDimensions, CanvasElement } from "@wrapfit/shared";
import { Box3DView } from "@/features/studio/components/three/Box3DView";

import { GoiMascot } from "@/components/common/GoiMascot";

export type EnvironmentType =
  | "studio"
  | "marble"
  | "kraft_wood"
  | "forest_velvet"
  | "festive_glow";

interface EnvironmentOption {
  id: EnvironmentType;
  name: string;
  category: string;
  badge: string;
  dotColor: string;
}

const ENVIRONMENTS: EnvironmentOption[] = [
  {
    id: "studio",
    name: "Studio tối giản",
    category: "Nền trơn chụp sản phẩm",
    badge: "Tiêu Chuẩn",
    dotColor: "#ECE8E1",
  },
  {
    id: "marble",
    name: "Bàn đá cẩm thạch",
    category: "Đá trắng bóng",
    badge: "Bóng Bẩy",
    dotColor: "#F8FAFC",
  },
  {
    id: "kraft_wood",
    name: "Bàn gỗ mộc",
    category: "Gỗ sồi thủ công",
    badge: "Thủ Công",
    dotColor: "#C29B61",
  },
  {
    id: "forest_velvet",
    name: "Nhung xanh rừng",
    category: "Xanh ngọc sang trọng",
    badge: "Quý Tộc",
    dotColor: "#064E3B",
  },
  {
    id: "festive_glow",
    name: "Không khí Tết",
    category: "Ánh vàng ấm",
    badge: "Tết 2026",
    dotColor: "#FED7AA",
  },
];

interface Step5Model3DWithEnvironmentsProps {
  dimensions: BoxDimensions;
  boxType?: string;
  activeMaterial?: string;
  backgroundPatternSvg?: string | null;
  elements?: CanvasElement[];
  /** Dieline formulas of the project: the 3D box is folded from the same dieline. */
  formulaVersion?: number;
  onBack: () => void;
  onNext: () => void;
  onOpenQrModal?: () => void;
}

export const Step5Model3DWithEnvironments: React.FC<Step5Model3DWithEnvironmentsProps> = ({
  dimensions,
  boxType = "tuck-top",
  activeMaterial = "ivory",
  backgroundPatternSvg,
  elements = [],
  formulaVersion,
  onBack,
  onNext,
  onOpenQrModal,
}) => {
  const [foldProgress, setFoldProgress] = useState<number>(0.85);
  const [selectedEnv, setSelectedEnv] = useState<EnvironmentType>("studio");
  const [isLidOpen, setIsLidOpen] = useState<boolean>(false);

  const handleFoldChange = (val: number) => {
    if (Math.abs(val - foldProgress) > 0.08) {
      
    }
    setFoldProgress(val);
    if (val < 0.9) {
      setIsLidOpen(false);
    }
  };

  const handleToggleLid = () => {
    
    const next = !isLidOpen;
    setIsLidOpen(next);
    if (next) {
      setFoldProgress(1.0);
    }
  };

  const structureName =
    boxType === "sleeve-drawer" ? "Hộp bao diêm" : boxType === "lid-base" ? "Hộp âm dương" : boxType === "pillow" ? "Hộp gối" : "Hộp nắp gài";
  const lidLabel =
    boxType === "sleeve-drawer"
      ? isLidOpen
        ? "Đóng khay"
        : "Rút khay ra"
      : boxType === "lid-base"
        ? isLidOpen
          ? "Đậy nắp"
          : "Nhấc nắp lên"
        : isLidOpen
          ? "Đóng nắp"
          : "Mở nắp";
  const foldPercent = Math.round(foldProgress * 100);

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-8 sm:px-6 lg:px-10">
      {/* Step header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-landing-green">Bước 5 / 6 · Xem 3D & quà tặng</p>
          <h1 className="mt-1 font-landing-heading text-3xl font-bold tracking-tight text-landing-ink sm:text-4xl">Hộp quà hoàn chỉnh</h1>
          <p className="mt-1.5 text-sm text-landing-muted">
            {structureName} · {dimensions.length} × {dimensions.width} × {dimensions.height} mm · giấy {activeMaterial === "gold_foil" ? "carton bồi" : activeMaterial === "forest" ? "duplex" : activeMaterial}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* 3D stage */}
        <div className="relative flex flex-col overflow-hidden rounded-sheet bg-white lg:col-span-9">
          <div className="absolute left-4 top-4 z-20 flex items-center gap-2">
            <span className="inline-flex h-9 items-center gap-2 rounded-full bg-white/95 px-4 text-sm font-semibold text-landing-ink shadow-sm">
              <Box className="h-4 w-4 text-landing-green" aria-hidden />
              {structureName}
            </span>
            <button
              type="button"
              onClick={handleToggleLid}
              aria-pressed={isLidOpen}
              className={`inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors ${
                isLidOpen ? "bg-landing-green-night text-white" : "bg-landing-lime text-landing-green-night hover:bg-action-hover"
              }`}
            >
              <Gift className="h-4 w-4" aria-hidden />
              {lidLabel}
            </button>
          </div>

          <div className="relative h-[540px] w-full overflow-hidden bg-landing-canvas">
            <Box3DView
              dimensions={dimensions}
              foldProgress={foldProgress}
              boxType={boxType as any}
              theme={activeMaterial as any}
              elements={elements}
              formulaVersion={formulaVersion}
              backgroundPatternSvg={backgroundPatternSvg}
              environment={selectedEnv}
              interactiveOpenState={isLidOpen}
              showHud={false}
              showStatusBar={false}
              frameless
              className="h-full w-full"
            />
          </div>

          {/* Fold scrubber */}
          <label className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-center gap-3 text-sm font-semibold text-landing-ink">
              <Sliders className="h-4 w-4 text-landing-green" aria-hidden />
              Gấp hộp
              <span className="rounded-full bg-landing-lime-mist px-2.5 py-0.5 font-mono text-xs text-landing-green-deep">{foldPercent}%</span>
              <span className="hidden text-xs font-normal text-landing-muted sm:inline">
                {foldProgress === 0 ? "Khuôn bế trải phẳng" : foldProgress === 1 ? "Đã gấp xong" : "Đang gấp theo nếp"}
              </span>
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={foldProgress}
              onChange={(e) => handleFoldChange(Number(e.target.value))}
              aria-label="Mức gấp hộp"
              className="w-full cursor-pointer accent-landing-green sm:w-80"
            />
          </label>
        </div>

        {/* Right panel */}
        <div className="space-y-5 lg:col-span-3">
          <section aria-labelledby="step4-scenes" className="space-y-3 rounded-sheet bg-white p-5">
            <h2 id="step4-scenes" className="flex items-center gap-2 font-landing-heading text-base font-bold text-landing-ink">
              <Palette className="h-4 w-4 text-landing-green" aria-hidden />
              Bối cảnh
            </h2>
            <div className="space-y-2">
              {ENVIRONMENTS.map((item) => {
                const isSelected = selectedEnv === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedEnv(item.id)}
                    className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-colors ${
                      isSelected ? "bg-landing-lime-mist ring-2 ring-landing-green" : "bg-landing-canvas hover:bg-landing-tile"
                    }`}
                  >
                    <span aria-hidden className="h-6 w-6 shrink-0 rounded-full ring-1 ring-landing-ink/15" style={{ backgroundColor: item.dotColor }} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-landing-ink">{item.name}</span>
                      <span className="block truncate text-xs text-landing-muted">{item.category}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section aria-labelledby="step4-qr" className="space-y-3 rounded-sheet bg-landing-green-night p-5 text-white">
            <h2 id="step4-qr" className="flex items-center gap-2 font-landing-heading text-base font-bold">
              <QrCode className="h-4 w-4 text-landing-lime" aria-hidden />
              Mã QR mở hộp
            </h2>
            <p className="text-sm leading-6 text-landing-lime-mist/80">In mã lên hộp: người nhận quét bằng điện thoại để mở hộp 3D cùng lời chúc của bạn.</p>
            <button
              type="button"
              onClick={() => onOpenQrModal?.()}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-landing-lime text-sm font-semibold text-landing-green-night transition-colors hover:bg-action-hover"
            >
              <QrCode className="h-4 w-4" aria-hidden />
              Tạo mã QR
            </button>
          </section>

          <section className="flex items-center gap-3 rounded-sheet bg-white p-4">
            <GoiMascot pose="celebration" size={48} />
            <p className="text-sm leading-6 text-landing-muted">
              <span className="block font-semibold text-landing-ink">Sẵn sàng in</span>
              Bước cuối kiểm tra FitCheck™ rồi xuất PDF CMYK, SVG hoặc DXF.
            </p>
          </section>
        </div>
      </div>
      <StepActionBar
        back={
          <button type="button" onClick={onBack} className={SECONDARY_PILL}>
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Sửa thiết kế
          </button>
        }
        next={
          <button type="button" onClick={onNext} className={PRIMARY_PILL}>
            Kiểm tra & xuất file
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        }
      />
    </div>
  );
};

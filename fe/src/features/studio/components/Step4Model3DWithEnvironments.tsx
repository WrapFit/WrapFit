"use client";

import React, { useState } from "react";
import {
  Box,
  Eye,
  Sliders,
  Sparkles,
  Download,
  QrCode,
  ArrowLeft,
  Gift,
  Palette,
} from "lucide-react";
import { BoxDimensions, CanvasElement } from "@wrapfit/shared";
import { InteractiveFoldingBox3D } from "@/features/studio/components/three/InteractiveFoldingBox3D";

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
    name: "Studio Tối Giản",
    category: "Chụp ảnh sản phẩm",
    badge: "Tiêu Chuẩn",
    dotColor: "#ECE8E1",
  },
  {
    id: "marble",
    name: "Bàn Đá Cẩm Thạch",
    category: "Luxury White Carrara",
    badge: "Bóng Bẩy",
    dotColor: "#F8FAFC",
  },
  {
    id: "kraft_wood",
    name: "Bàn Gỗ Mộc Kraft",
    category: "Artisan Oak Boutique",
    badge: "Thủ Công",
    dotColor: "#C29B61",
  },
  {
    id: "forest_velvet",
    name: "Nền Nhung Xanh Forest",
    category: "Deep Emerald Luxury",
    badge: "Quý Tộc",
    dotColor: "#064E3B",
  },
  {
    id: "festive_glow",
    name: "Không Gian Lễ Hội Tết",
    category: "Warm Amber Holiday",
    badge: "Tết 2026",
    dotColor: "#FED7AA",
  },
];

interface Step4Model3DWithEnvironmentsProps {
  dimensions: BoxDimensions;
  boxType?: string;
  activeMaterial?: string;
  backgroundPatternSvg?: string | null;
  elements?: CanvasElement[];
  /** Dieline formulas of the project: the 3D box is folded from the same dieline. */
  formulaVersion?: number;
  onBack: () => void;
  onOpenExportModal: () => void;
  onOpenQrModal?: () => void;
}

export const Step4Model3DWithEnvironments: React.FC<Step4Model3DWithEnvironmentsProps> = ({
  dimensions,
  boxType = "tuck-top",
  activeMaterial = "ivory",
  backgroundPatternSvg,
  elements = [],
  formulaVersion,
  onBack,
  onOpenExportModal,
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

  return (
    <div className="w-full max-w-7xl 2xl:max-w-[1720px] mx-auto px-4 py-6 space-y-6 animate-fadeIn font-sans">
      {/* Step Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-semibold text-vibrant-cobalt">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Bước 4: Sân Khấu Mô Phỏng 3D & Phối Cảnh Thực Tế</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-brand-forest mt-1">
            Trực Quan Hóa Hộp Quà Hoàn Chỉnh
          </h1>
          <p className="text-xs text-stone-500 font-mono mt-0.5">
            {dimensions.length}×{dimensions.width}×{dimensions.height} mm • Giấy:{" "}
            {activeMaterial.toUpperCase()} • Tỉ lệ 1:1
          </p>
        </div>

        {/* Action CTAs */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              
              onBack();
            }}
            className="px-4 py-2 rounded-full border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-semibold transition flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Sửa Bản Vẽ 2D (Bước 3)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              
              onOpenExportModal();
            }}
            className="px-5 py-2.5 rounded-full bg-brand-forest hover:bg-brand-forest-dark text-white text-xs font-semibold shadow-tactile transition flex items-center gap-2 hover:scale-105 active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất File In (PDF/SVG 300 DPI)</span>
          </button>
        </div>
      </div>

      {/* Main 3D Viewport Box */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 3D WebGL Canvas Stage (9 cols) */}
        <div className="lg:col-span-9 bg-white rounded-squircle-lg border border-stone-200 shadow-tactile overflow-hidden flex flex-col relative">
          {/* Top Bar on 3D Stage */}
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
            {/* Box Type Badge */}
            <div className="flex items-center gap-2 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-stone-200 shadow-tactile text-xs">
              <Box className="w-3.5 h-3.5 text-vibrant-cobalt" />
              <span className="font-serif font-bold text-stone-800">
                {boxType === "tuck-top"
                  ? "Hộp Nắp Gài Đáy Khóa"
                  : boxType === "sleeve-drawer"
                  ? "Hộp Bao Diêm"
                  : boxType === "lid-base"
                  ? "Hộp Âm Dương"
                  : "Hộp Gối Cánh Cung"}
              </span>
            </div>

            {/* Interactive Unboxing Trigger Button */}
            <button
              type="button"
              onClick={handleToggleLid}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-tactile flex items-center gap-1.5 transition ${
                isLidOpen
                  ? "bg-amber-500 hover:bg-amber-600 text-white animate-pulse"
                  : "bg-white/95 hover:bg-white text-stone-800 border border-stone-200"
              }`}
            >
              <Gift className="w-3.5 h-3.5" />
              <span>{isLidOpen ? "Đóng Nắp Hộp" : "Mở Nắp Trải Nghiệm"}</span>
            </button>
          </div>

          {/* Dedicated 3D Canvas Box */}
          <div className="w-full h-[540px] relative overflow-hidden bg-stone-100">
            <InteractiveFoldingBox3D
              dimensions={dimensions}
              foldProgress={foldProgress}
              boxType={boxType as any}
              theme={activeMaterial as any}
              elements={elements}
              formulaVersion={formulaVersion}
              backgroundPatternSvg={backgroundPatternSvg}
              environment={selectedEnv}
              interactiveOpenState={isLidOpen}
              className="w-full h-full"
            />
          </div>

          {/* Bottom Fold Progress Scrubber */}
          <div className="p-4 bg-white border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5 whitespace-nowrap">
                <Sliders className="w-3.5 h-3.5 text-vibrant-cobalt" />
                Tiến Trình Gập 3D:
              </span>
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-vibrant-cobalt border border-blue-200">
                {Math.round(foldProgress * 100)}%
              </span>
              <span className="text-[11px] text-stone-500 hidden sm:inline">
                {foldProgress === 0
                  ? "(Bản bế 2D phẳng)"
                  : foldProgress === 1
                  ? "(Đóng hộp hoàn chỉnh)"
                  : "(Đang gập nếp cấn)"}
              </span>
            </div>

            {/* Slider */}
            <div className="w-full sm:w-80 flex items-center gap-2">
              <span className="text-[10px] font-mono text-stone-400">0%</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={foldProgress}
                onChange={(e) => handleFoldChange(Number(e.target.value))}
                className="w-full accent-vibrant-cobalt cursor-pointer"
              />
              <span className="text-[10px] font-mono text-stone-400">100%</span>
            </div>
          </div>
        </div>

        {/* Right Environment & Settings Panel (3 cols) */}
        <div className="lg:col-span-3 space-y-5">
          {/* Environment Presets Switcher */}
          <div className="bg-white p-5 rounded-squircle-lg border border-stone-200 shadow-tactile space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-vibrant-cobalt" />
                Phối Cảnh Môi Trường (5 Nền)
              </span>
              <span className="text-[10px] text-stone-400 font-mono">3D Scene</span>
            </div>

            <div className="space-y-2.5">
              {ENVIRONMENTS.map((item) => {
                const isSelected = selectedEnv === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      
                      setSelectedEnv(item.id);
                    }}
                    className={`w-full p-3 rounded-squircle text-left border transition-all flex items-center justify-between ${
                      isSelected
                        ? "border-vibrant-cobalt bg-blue-50/70 shadow-sm ring-2 ring-blue-500/20"
                        : "border-stone-200 hover:border-stone-300 bg-stone-50/50 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-4 h-4 rounded-full border border-stone-300 shadow-xs"
                        style={{ backgroundColor: item.dotColor }}
                      />
                      <div>
                        <span className="text-xs font-semibold text-stone-800 block">
                          {item.name}
                        </span>
                        <span className="text-[10px] text-stone-400 block">{item.category}</span>
                      </div>
                    </div>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        isSelected
                          ? "bg-vibrant-cobalt text-white"
                          : "bg-stone-100 text-stone-600"
                      }`}
                    >
                      {item.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Virtual 3D QR Unboxing Card */}
          <div className="bg-white p-5 rounded-squircle-lg border border-stone-200 shadow-tactile space-y-3">
            <div className="flex items-center gap-2 text-brand-forest">
              <QrCode className="w-4 h-4 text-vibrant-cobalt" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Mã QR Mở Hộp Ảo 3D
              </span>
            </div>
            <p className="text-[11px] text-stone-600 leading-relaxed">
              In mã QR này lên nắp hộp để người nhận quà có thể quét điện thoại và trải nghiệm bóc
              hộp 3D kèm lời chúc âm thanh tương tác.
            </p>
            <button
              type="button"
              onClick={() => {
                
                if (onOpenQrModal) onOpenQrModal();
              }}
              className="w-full py-2 rounded-squircle bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold text-xs transition flex items-center justify-center gap-1.5"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Xem & Tải Mã QR In Ấn</span>
            </button>
          </div>

          {/* Mascot Greeting */}
          <div className="p-4 rounded-squircle-lg bg-[#FDFBF7] border border-[#E8D8C8] flex items-center gap-3">
            <GoiMascot pose="celebration" size={48} />
            <div className="text-xs text-stone-600">
              <span className="font-serif font-bold text-brand-forest block">
                Bé Gói chúc mừng!
              </span>
              <span className="text-[11px] leading-snug block mt-0.5">
                Thiết kế đã hoàn thiện 100% tiêu chuẩn in ấn. Bấm nút Xuất File để tải file vector
                PDF sẵn sàng gửi nhà in!
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

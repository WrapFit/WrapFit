"use client";

import React, { useState, useEffect, useRef } from "react";
import { animate } from "animejs";
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  Wand2,
  AlertTriangle,
  CheckCircle2,
  Send,
  HelpCircle,
  Scissors,
  Layers,
  Volume2,
  VolumeX,
} from "lucide-react";
import { BoxDimensions, FitCheckReport } from "@wrapfit/shared";
import { GoiMascot, MascotPose } from "@/components/common/GoiMascot";


export interface GiftPreset {
  id: string;
  name: string;
  category: string;
  dimensions: BoxDimensions;
  boxType: "tuck-top" | "sleeve-drawer" | "lid-base" | "pillow";
  boxTypeName: string;
  recommendedGsm: string;
  tip: string;
}

export const POPULAR_GIFT_PRESETS: GiftPreset[] = [
  {
    id: "candle",
    name: "Hũ Nến Thơm (200g)",
    category: "Home Living",
    dimensions: { length: 85, width: 85, height: 105, paperThickness: 0.45 },
    boxType: "tuck-top",
    boxTypeName: "Hộp nắp gài đáy khóa",
    recommendedGsm: "350 GSM Ivory",
    tip: "Đáy khóa chịu lực tốt cho lọ thủy tinh nặng.",
  },
  {
    id: "lipstick",
    name: "Son Môi Cao Cấp / Serum",
    category: "Cosmetics",
    dimensions: { length: 25, width: 25, height: 85, paperThickness: 0.38 },
    boxType: "tuck-top",
    boxTypeName: "Hộp nắp gài đáy khóa",
    recommendedGsm: "300 GSM Kraft",
    tip: "Khít thân son, thêm tai gài mở êm tay.",
  },
  {
    id: "perfume",
    name: "Chai Nước Hoa (50ml)",
    category: "Fragrance",
    dimensions: { length: 65, width: 40, height: 120, paperThickness: 0.45 },
    boxType: "sleeve-drawer",
    boxTypeName: "Hộp bao diêm (Sleeve & Drawer)",
    recommendedGsm: "350 GSM Ivory Cán Màng Mờ",
    tip: "Khay trượt êm ái tăng trải nghiệm unboxing sang trọng.",
  },
  {
    id: "watch",
    name: "Đồng Hồ Đeo Tay / Vòng",
    category: "Jewelry",
    dimensions: { length: 100, width: 100, height: 60, paperThickness: 0.5 },
    boxType: "lid-base",
    boxTypeName: "Hộp âm dương (Lid & Base)",
    recommendedGsm: "Rigid Box Carton Lạnh",
    tip: "Kết cấu hai mảnh đẳng cấp, giữ gối đệm êm ái.",
  },
  {
    id: "scarf",
    name: "Khăn Lụa Tơ Tằm / Cà Vạt",
    category: "Fashion",
    dimensions: { length: 160, width: 110, height: 35, paperThickness: 0.3 },
    boxType: "pillow",
    boxTypeName: "Hộp gối (Pillow Box)",
    recommendedGsm: "250 GSM Kraft Tự Nhiên",
    tip: "Đường cong thanh lịch, gấp mở không cần keo dán.",
  },
  {
    id: "tea",
    name: "Hộp Trà Thảo Mộc / Bánh Thủ Công",
    category: "Gourmet",
    dimensions: { length: 120, width: 80, height: 60, paperThickness: 0.38 },
    boxType: "tuck-top",
    boxTypeName: "Hộp nắp gài đáy khóa",
    recommendedGsm: "300 GSM Kraft",
    tip: "Kích thước tiêu chuẩn phù hợp đựng túi trà hoặc bánh nhỏ.",
  },
];

interface AiCopilotAssistantProps {
  currentDimensions?: BoxDimensions;
  onApplyDimensions?: (dims: BoxDimensions) => void;
  fitCheckReport?: FitCheckReport;
  onAutoFixFitCheck?: () => void;
  activeTab?: string;
  onSwitchTab?: (tab: "2d" | "3d") => void;
  className?: string;
}

export const AiCopilotAssistant: React.FC<AiCopilotAssistantProps> = ({
  currentDimensions,
  onApplyDimensions,
  fitCheckReport,
  onAutoFixFitCheck,
  activeTab,
  onSwitchTab,
  className = "",
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [pose, setPose] = useState<MascotPose>("waving");
  const [headline, setHeadline] = useState<string>("Chào bạn, mình là Gói!");
  const [message, setMessage] = useState<string>(
    "Trợ lý AI đóng gói bao bì thông minh. Bạn định đựng món quà gì hôm nay?"
  );
  const [userQuery, setUserQuery] = useState<string>("");
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);

  const islandRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Toggle sound
  const toggleAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextMuted = !isAudioMuted;
    setIsAudioMuted(nextMuted);
    
    if (!nextMuted) {
      
    }
  };

  // Watch FitCheck Report and proactively warn user
  useEffect(() => {
    if (!fitCheckReport) return;

    if (!fitCheckReport.isValidForProduction && fitCheckReport.violations.length > 0) {
      setPose("measuring");
      const firstV = fitCheckReport.violations[0];
      setHeadline("FitCheck™ Phát hiện cảnh báo!");
      setMessage(
        `Cảnh báo: ${firstV.title}. ${firstV.suggestion} Nhấn nút bên dưới để mình tự động sửa chuẩn mm ngay.`
      );
    } else if (fitCheckReport.score === 100) {
      setPose("celebration");
      setHeadline("Thiết kế hoàn hảo 100/100!");
      setMessage("Bản vẽ đạt 100% tiêu chuẩn in ấn không lỗi mép dao hay nếp gập!");
    }
  }, [fitCheckReport]);

  // Spring animation when expanding/collapsing using Anime.js
  const toggleExpanded = () => {
    
    const nextState = !isExpanded;
    setIsExpanded(nextState);

    if (islandRef.current) {
      animate(islandRef.current, {
        scale: [0.96, 1],
        duration: 320,
        ease: "outBack",
      });
    }

    if (nextState) {
      setPose("presenting");
    } else {
      setPose("chilling");
    }
  };

  // Apply gift preset
  const handleSelectPreset = (preset: GiftPreset) => {
    
    setPose("folding");
    setHeadline(`Đã tối ưu cho ${preset.name}!`);
    setMessage(
      `Đã áp dụng kích thước ${preset.dimensions.length}x${preset.dimensions.width}x${preset.dimensions.height}mm. ${preset.tip}`
    );

    if (onApplyDimensions) {
      onApplyDimensions(preset.dimensions);
    }
  };

  // Handle user custom query
  const handleSendQuery = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userQuery.trim()) return;

    
    const q = userQuery.toLowerCase();
    setUserQuery("");

    if (q.includes("nến") || q.includes("candle")) {
      handleSelectPreset(POPULAR_GIFT_PRESETS[0]);
    } else if (q.includes("son") || q.includes("mỹ phẩm")) {
      handleSelectPreset(POPULAR_GIFT_PRESETS[1]);
    } else if (q.includes("nước hoa") || q.includes("perfume")) {
      handleSelectPreset(POPULAR_GIFT_PRESETS[2]);
    } else if (q.includes("đồng hồ") || q.includes("nhẫn") || q.includes("trang sức")) {
      handleSelectPreset(POPULAR_GIFT_PRESETS[3]);
    } else if (q.includes("khăn") || q.includes("vải") || q.includes("cà vạt")) {
      handleSelectPreset(POPULAR_GIFT_PRESETS[4]);
    } else if (q.includes("sửa") || q.includes("fitcheck") || q.includes("lỗi")) {
      if (onAutoFixFitCheck) {
        onAutoFixFitCheck();
        
        setPose("celebration");
        setHeadline("Đã tự động căn chỉnh!");
        setMessage("Đã thụt lề an toàn 3mm và mở rộng bleed 2mm cho toàn bộ bản vẽ.");
      }
    } else {
      setPose("thumbs_up");
      setHeadline("Gợi ý thiết kế thông minh");
      setMessage(
        `Với món quà "${userQuery}", Gói khuyên bạn dùng hộp Ivory 300 GSM với dung sai bù trừ nếp gập 0.38mm để hộp đóng êm ái.`
      );
    }
  };

  // Listen for mobile dock trigger
  useEffect(() => {
    const handleToggleEvent = () => {
      setIsExpanded((prev) => {
        const next = !prev;
        setPose(next ? "presenting" : "chilling");
        return next;
      });
    };
    if (typeof window !== "undefined") {
      window.addEventListener("wrapfit_toggle_copilot", handleToggleEvent);
      return () => window.removeEventListener("wrapfit_toggle_copilot", handleToggleEvent);
    }
  }, []);

  return (
    <div
      ref={islandRef}
      className={`fixed z-50 transition-all duration-300 font-sans ${
        isExpanded
          ? "bottom-16 right-4 md:bottom-6 md:right-6 w-[94vw] sm:w-[410px]"
          : "bottom-16 right-4 md:bottom-6 md:right-6 w-auto"
      } ${className}`}
    >
      {/* Floating Dynamic Island Container */}
      <div className="relative rounded-squircle-lg bg-white/95 backdrop-blur-md border border-[#E8D8C8] shadow-tactile-lg overflow-hidden transition-all duration-300">
        {/* Top Header Pill Bar */}
        <div
          onClick={toggleExpanded}
          className="px-3.5 py-2.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-stone-50/80 transition select-none"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Mascot Avatar with lively pose */}
            <GoiMascot pose={pose} size={36} />

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-brand-forest tracking-tight font-landing-heading truncate">
                  Gói — AI Packaging Copilot
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-library-accent/10 text-library-accent">
                  BETA
                </span>
              </div>
              <p className="text-[11px] text-stone-500 truncate max-w-[190px] sm:max-w-[240px]">
                {headline}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Audio Toggle Button */}
            <button
              type="button"
              onClick={toggleAudio}
              className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition"
              title={isAudioMuted ? "Bật âm thanh tactile" : "Tắt âm thanh tactile"}
            >
              {isAudioMuted ? (
                <VolumeX className="w-3.5 h-3.5" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-brand-forest" />
              )}
            </button>

            {/* Expand / Collapse Icon */}
            <div className="w-6 h-6 rounded-full bg-stone-100 flex items-center justify-center text-stone-600">
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronUp className="w-3.5 h-3.5" />
              )}
            </div>
          </div>
        </div>

        {/* Expanded Intelligence Body */}
        {isExpanded && (
          <div ref={contentRef} className="px-4 pb-4 pt-1 space-y-3.5 border-t border-[#F2ECE3]">
            {/* AI Speech Bubble */}
            <div className="bg-[#FAF6EE] p-3 rounded-2xl border border-[#E8D8C8] relative">
              <div className="flex items-start gap-2.5">
                <div className="w-2 h-2 rounded-full bg-library-accent mt-1.5 flex-shrink-0 animate-ping" />
                <p className="text-xs leading-relaxed text-stone-700">{message}</p>
              </div>

              {/* 1-Click Auto Fix Button if violations exist */}
              {fitCheckReport &&
                !fitCheckReport.isValidForProduction &&
                onAutoFixFitCheck && (
                  <button
                    type="button"
                    onClick={() => {
                      onAutoFixFitCheck();
                      
                      setPose("celebration");
                      setHeadline("Đã tự động sửa lỗi!");
                      setMessage(
                        "Đã thụt lề toàn bộ logo, chữ vào trong nếp cấn 3mm và mở rộng nền phủ tràn lề."
                      );
                    }}
                    className="mt-2.5 w-full py-2 px-3 rounded-xl bg-vibrant-coral hover:bg-vibrant-coral-dark text-white text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-coral-glow"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>1-Click: Tự động sửa lỗi nếp gấp & tràn lề</span>
                  </button>
                )}
            </div>

            {/* Quick Gift Heuristics Carousel / Chips */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-stone-700 uppercase tracking-wider font-mono">
                  Gợi Ý Kích Thước Theo Quà Tặng
                </span>
                <span className="text-[10px] text-stone-400">Chuẩn mm</span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                {POPULAR_GIFT_PRESETS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectPreset(item)}
                    className="text-left p-2 rounded-xl border border-stone-200 hover:border-brand-forest hover:bg-stone-50 transition group flex flex-col justify-between"
                  >
                    <span className="text-xs font-semibold text-stone-900 group-hover:text-brand-forest line-clamp-1">
                      {item.name}
                    </span>
                    <span className="text-[10px] font-mono text-stone-500">
                      {item.dimensions.length}x{item.dimensions.width}x
                      {item.dimensions.height}mm
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Query Input Bar */}
            <form onSubmit={handleSendQuery} className="relative flex items-center">
              <input
                type="text"
                placeholder="Hỏi Gói: 'Hộp đựng ly sứ', 'Hộp quà cưới'..."
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                className="w-full pl-3 pr-9 py-2 text-xs rounded-xl bg-stone-100 border border-stone-200 focus:outline-none focus:border-library-accent focus:bg-white text-stone-800 placeholder-stone-400 transition"
              />
              <button
                type="submit"
                disabled={!userQuery.trim()}
                className="absolute right-1.5 p-1 rounded-lg bg-library-accent text-white disabled:opacity-30 transition"
              >
                <Send className="w-3 h-3" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

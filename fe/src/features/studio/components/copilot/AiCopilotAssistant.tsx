"use client";

import React, { useState, useEffect, useRef } from "react";
import { animate } from "animejs";
import {
  Sparkles,
  ChevronDown,
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
    name: "Hũ Nến Thơm (380g)",
    category: "Home Living",
    dimensions: { length: 85, width: 85, height: 105, paperThickness: 0.45, giftWeight: 380, bottomType: "lock" },
    boxType: "tuck-top",
    boxTypeName: "Hộp nắp gài đáy khóa FEFCO 0215",
    recommendedGsm: "350 GSM Ivory",
    tip: "Quà > 300g: Đáy khóa FEFCO 0215 chịu lực chống bục khi giao hàng.",
  },
  {
    id: "lipstick",
    name: "Son môi cao cấp / serum",
    category: "Cosmetics",
    dimensions: { length: 25, width: 25, height: 85, paperThickness: 0.38, giftWeight: 35, bottomType: "tuck" },
    boxType: "tuck-top",
    boxTypeName: "Hộp nắp gài đáy khóa",
    recommendedGsm: "300 GSM Kraft",
    tip: "Khít thân son, thêm tai gài mở êm tay.",
  },
  {
    id: "sticker",
    name: "Tem Decal / Đai Giấy (Chị Linh DIY)",
    category: "Handmade DIY",
    dimensions: { length: 150, width: 50, height: 2, paperThickness: 0.15 },
    boxType: "tuck-top",
    boxTypeName: "Tem nhãn & Đai giấy",
    recommendedGsm: "Decal bóc dán 130 GSM",
    tip: "Dán lên hộp có sẵn: in A4 tại nhà kèm dấu xén chuẩn xác, tiết kiệm 80% chi phí.",
  },
  {
    id: "perfume",
    name: "Chai nước hoa (50ml)",
    category: "Fragrance",
    dimensions: { length: 65, width: 40, height: 120, paperThickness: 0.45 },
    boxType: "sleeve-drawer",
    boxTypeName: "Hộp bao diêm (Sleeve & Drawer)",
    recommendedGsm: "350 GSM Ivory cán màng mờ",
    tip: "Khay trượt êm ái tăng trải nghiệm unboxing sang trọng.",
  },
  {
    id: "watch",
    name: "Đồng hồ đeo tay / vòng",
    category: "Jewelry",
    dimensions: { length: 100, width: 100, height: 60, paperThickness: 0.5 },
    boxType: "lid-base",
    boxTypeName: "Hộp âm dương (lid & base)",
    recommendedGsm: "Rigid box carton lạnh",
    tip: "Kết cấu hai mảnh đẳng cấp, giữ gối đệm êm ái.",
  },
  {
    id: "scarf",
    name: "Khăn lụa tơ tằm / cà vạt",
    category: "Fashion",
    dimensions: { length: 160, width: 110, height: 35, paperThickness: 0.3 },
    boxType: "pillow",
    boxTypeName: "Hộp gối (Pillow Box)",
    recommendedGsm: "250 GSM Kraft tự nhiên",
    tip: "Đường cong thanh lịch, gấp mở không cần keo dán.",
  },
  {
    id: "tea",
    name: "Hộp trà thảo mộc / bánh thủ công",
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
  /** Open on first render (the "Trò chuyện với Gói" link of the home page adds `?copilot=open`). */
  defaultExpanded?: boolean;
  className?: string;
}

export const AiCopilotAssistant: React.FC<AiCopilotAssistantProps> = ({
  currentDimensions,
  onApplyDimensions,
  fitCheckReport,
  onAutoFixFitCheck,
  activeTab,
  onSwitchTab,
  defaultExpanded = false,
  className = "",
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);
  const [pose, setPose] = useState<MascotPose>(defaultExpanded ? "presenting" : "waving");
  const [headline, setHeadline] = useState<string>("Chào bạn, mình là Gói!");
  const [message, setMessage] = useState<string>(
    "Trợ lý AI đóng gói bao bì thông minh. Bạn định đựng món quà gì hôm nay?"
  );
  const [userQuery, setUserQuery] = useState<string>("");
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  /** Gói said something new while folded: a dot on the button instead of a bar over the page. */
  const [unread, setUnread] = useState<boolean>(false);
  const expandedRef = useRef(isExpanded);
  expandedRef.current = isExpanded;
  const firstHeadline = useRef(true);
  useEffect(() => {
    if (firstHeadline.current) {
      firstHeadline.current = false;
      return;
    }
    if (!expandedRef.current) setUnread(true);
  }, [headline]);
  // Escape folds the open panel back into its button.
  useEffect(() => {
    if (!isExpanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsExpanded(false);
        setPose("chilling");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isExpanded]);

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

  // Watch Gift Weight and advise heavy load reinforcement
  useEffect(() => {
    if (currentDimensions?.giftWeight && currentDimensions.giftWeight > 300) {
      setPose("measuring");
      setHeadline("Quà nặng > 300g cần gia cố!");
      setMessage(
        `Món quà nặng ${currentDimensions.giftWeight}g (> 300g). Gói khuyên bạn dùng Đáy khóa FEFCO 0215 (Crash-lock) hoặc Hộp Âm Dương và giấy Ivory/Kraft ≥ 350 GSM để không bị bục đáy khi vận chuyển.`
      );
    }
  }, [currentDimensions?.giftWeight]);

  // Spring animation when expanding/collapsing using Anime.js
  const toggleExpanded = () => {
    
    const nextState = !isExpanded;
    setIsExpanded(nextState);
    if (nextState) setUnread(false);

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
      setUnread(false);
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

  // Folded: one round button in the corner (the step bars leave room for it), never a bar over the page's buttons.
  if (!isExpanded) {
    return (
      <div ref={islandRef} className={`fixed bottom-6 right-6 z-50 hidden md:block ${className}`}>
        <button
          type="button"
          onClick={toggleExpanded}
          aria-expanded={false}
          aria-label={unread ? `Mở trợ lý Bé Gói: ${headline}` : "Mở trợ lý Bé Gói"}
          title={headline}
          className="relative flex size-14 items-center justify-center rounded-full border border-landing-line bg-white/95 shadow-soft-16 backdrop-blur-md transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-focus/40 motion-reduce:transition-none"
        >
          <GoiMascot pose={pose} size={40} interactive={false} />
          {unread && (
            <span aria-hidden className="absolute right-0.5 top-0.5 size-3.5 rounded-full border-2 border-white bg-fpt-orange" />
          )}
        </button>
      </div>
    );
  }

  return (
    <div
      ref={islandRef}
      role="dialog"
      aria-label="Trợ lý Bé Gói"
      className={`fixed bottom-16 right-4 z-50 w-[94vw] font-sans md:bottom-6 md:right-6 sm:w-[410px] ${className}`}
    >
      {/* Floating Dynamic Island Container */}
      <div className="relative overflow-hidden rounded-3xl border border-landing-line bg-white/95 shadow-soft-16 backdrop-blur-md">
        <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <GoiMascot pose={pose} size={36} interactive={false} className="shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="truncate font-landing-heading text-xs font-bold tracking-tight text-landing-ink">Bé Gói — trợ lý thiết kế</span>
                <span className="inline-flex items-center rounded-full bg-fpt-orange/10 px-1.5 py-0.5 text-caption font-bold text-fpt-orange-ink">Thử nghiệm</span>
              </div>
              <p className="max-w-[190px] truncate text-caption text-landing-muted sm:max-w-[240px]">{headline}</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={toggleAudio}
              aria-pressed={!isAudioMuted}
              aria-label={isAudioMuted ? "Bật âm thanh" : "Tắt âm thanh"}
              className="flex size-9 items-center justify-center rounded-lg text-landing-muted transition hover:bg-landing-canvas hover:text-landing-ink"
            >
              {isAudioMuted ? <VolumeX className="size-4" aria-hidden /> : <Volume2 className="size-4 text-landing-ink" aria-hidden />}
            </button>
            <button
              type="button"
              onClick={toggleExpanded}
              aria-expanded
              aria-label="Thu gọn trợ lý"
              className="flex size-9 items-center justify-center rounded-full bg-landing-canvas text-landing-muted transition hover:text-landing-ink"
            >
              <ChevronDown className="size-4" aria-hidden />
            </button>
          </div>
        </div>

        {/* Expanded Intelligence Body */}
        <div ref={contentRef} className="px-4 pb-4 pt-1 space-y-3.5 border-t border-paper-linen">
            {/* AI Speech Bubble */}
            <div className="bg-paper-cotton p-3 rounded-3xl border border-landing-line relative">
              <div className="flex items-start gap-2.5">
                <div className="w-2 h-2 rounded-full bg-fpt-orange mt-1.5 flex-shrink-0 animate-ping" />
                <p className="text-xs leading-relaxed text-landing-ink">{message}</p>
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
                <span className="text-cad-spec-micro font-bold text-landing-ink uppercase tracking-wider font-mono">
                  Gợi ý kích thước theo quà tặng
                </span>
                <span className="text-caption text-landing-muted">Chuẩn mm</span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                {POPULAR_GIFT_PRESETS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectPreset(item)}
                    className="text-left p-2 rounded-xl border border-landing-line hover:border-landing-ink hover:bg-landing-canvas transition group flex flex-col justify-between"
                  >
                    <span className="text-xs font-semibold text-landing-ink group-hover:text-landing-ink line-clamp-1">
                      {item.name}
                    </span>
                    <span className="text-cad-spec-micro font-mono text-landing-muted">
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
                placeholder="Hỏi Gói: 'hộp đựng ly sứ', 'hộp quà cưới'..."
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                className="w-full pl-3 pr-9 py-2 text-xs rounded-xl bg-landing-canvas border border-landing-line focus:outline-none focus:border-fpt-orange focus:bg-white text-landing-ink placeholder-landing-muted transition"
              />
              <button
                type="submit"
                disabled={!userQuery.trim()}
                className="absolute right-1.5 p-1 rounded-lg bg-fpt-orange text-white disabled:opacity-30 transition"
              >
                <Send className="w-3 h-3" />
              </button>
            </form>
        </div>
      </div>
    </div>
  );
};

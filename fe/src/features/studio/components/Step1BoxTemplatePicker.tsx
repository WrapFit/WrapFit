"use client";

import React from "react";
import { Box, Sparkles, Check, ArrowRight, ShieldCheck, Layers, Gift, Feather } from "lucide-react";
import { BoxStructureType, caliperOf, CURRENT_FORMULA_VERSION, generateDielinePieces, UnsupportedStructureError } from "@wrapfit/shared";
import type { BoxStructure } from "@/types/api";


export interface BoxStructureOption {
  id: BoxStructureType;
  name: string;
  vietnameseName: string;
  subtitle: string;
  description: string;
  badge: string;
  badgeColor: string;
  recommendedGifts: string[];
  recommendedPaper: string;
  foldDifficulty: "Dễ" | "Trung bình" | "Cao cấp";
  defaultDims: { length: number; width: number; height: number; paperThickness: number };
  svgPath: string; // SVG visual icon
}

export const BOX_STRUCTURES: BoxStructureOption[] = [
  {
    id: "tuck-top",
    name: "Tuck Top Box",
    vietnameseName: "Hộp Nắp Gài Đáy Khóa",
    subtitle: "Mẫu hộp bán lẻ & quà tặng quốc dân",
    description: "Cấu trúc một mảnh tích hợp nắp gài trên và khóa đáy đan chéo chịu lực cao. Tiết kiệm keo dán, sản xuất nhanh, cực kỳ chắc chắn.",
    badge: "Phổ Biến Nhất",
    badgeColor: "bg-blue-50 text-vibrant-cobalt border-blue-200",
    recommendedGifts: ["Hũ nến thơm", "Chai nước hoa", "Mỹ phẩm dưỡng da", "Cốc gốm sứ"],
    recommendedPaper: "Ivory 300 – 350 GSM",
    foldDifficulty: "Dễ",
    defaultDims: { length: 120, width: 80, height: 60, paperThickness: caliperOf(300) },
    svgPath: "M10 20 L50 5 L90 20 L90 70 L50 85 L10 70 Z M50 5 L50 85 M10 20 L50 35 L90 20",
  },
  {
    id: "sleeve-drawer",
    name: "Sleeve & Drawer Box",
    vietnameseName: "Hộp Bao Diêm (Khay Rút)",
    subtitle: "Trải nghiệm mở quà trượt tinh tế",
    description: "Gồm bao vỏ ngoài trượt kết hợp khay kéo bên trong. Tạo cảm giác tò mò và bất ngờ khi người nhận từ từ rút món quà ra khỏi vỏ bọc.",
    badge: "Sang Trọng",
    badgeColor: "bg-emerald-50 text-brand-forest border-emerald-200",
    recommendedGifts: ["Socola thủ công", "Macaron", "Trang sức cao cấp", "Bộ tinh dầu"],
    recommendedPaper: "Duplex cán mờ 350 GSM hoặc Carton lạnh",
    foldDifficulty: "Trung bình",
    defaultDims: { length: 140, width: 90, height: 45, paperThickness: caliperOf(300) },
    svgPath: "M15 25 L85 25 L85 65 L15 65 Z M30 35 L70 35 L70 55 L30 55 Z",
  },
  {
    id: "lid-base",
    name: "Lid & Base Box",
    vietnameseName: "Hộp Âm Dương (Nắp Rời)",
    subtitle: "Đẳng cấp quà tặng cao cấp & VIP",
    description: "Hai cấu trúc độc lập: Thân hộp âm và nắp hộp dương chụp khít bên ngoài. Tạo ấn tượng bề thế, vững chãi và sang trọng bậc nhất.",
    badge: "Luxury & VIP",
    badgeColor: "bg-amber-50 text-amber-800 border-amber-200",
    recommendedGifts: ["Đồng hồ cao cấp", "Vòng tay bạc", "Kỷ niệm chương", "Set quà tết"],
    recommendedPaper: "Carton lạnh bồi giấy mỹ thuật ép kim vàng",
    foldDifficulty: "Cao cấp",
    defaultDims: { length: 130, width: 130, height: 55, paperThickness: caliperOf(300) },
    svgPath: "M10 25 L50 10 L90 25 L50 40 Z M10 32 L50 47 L90 32 L90 75 L50 90 L10 75 Z",
  },
  {
    id: "pillow",
    name: "Pillow Box",
    vietnameseName: "Hộp Gối Cánh Cung",
    subtitle: "Đường cong mềm mại, đóng gói siêu tốc",
    description: "Hình dáng chiếc gối duyên dáng với hai đầu uốn cong bán nguyệt. Không cần keo dán phức tạp, gấp lại trong 3 giây.",
    badge: "Thủ Công & Duyên Dáng",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    recommendedGifts: ["Khăn lụa tơ tằm", "Cà vạt", "Trang sức nhỏ", "Kẹo cưới thủ công"],
    recommendedPaper: "Kraft mộc 250 – 300 GSM",
    foldDifficulty: "Dễ",
    defaultDims: { length: 160, width: 110, height: 35, paperThickness: caliperOf(300) },
    svgPath: "M15 50 Q50 15 85 50 Q50 85 15 50 Z",
  },
];

/** Presentation of a structure: name and description from the API, the rest from BOX_STRUCTURES. */
interface StructureCard extends BoxStructureOption {
  apiName: string;
}

const GENERIC_STRUCTURE: Omit<BoxStructureOption, "id" | "name" | "vietnameseName" | "description"> = {
  subtitle: "",
  badge: "Cấu trúc mới",
  badgeColor: "bg-stone-50 text-stone-700 border-stone-200",
  recommendedGifts: [],
  recommendedPaper: "Ivory 300 GSM",
  foldDifficulty: "Trung bình",
  defaultDims: { length: 120, width: 80, height: 60, paperThickness: caliperOf(300) },
  svgPath: "M15 25 L85 25 L85 75 L15 75 Z",
};

/** Crease lines of the box at its default size, counted on the dieline of the current formulas (every piece). */
function creaseCountOf(item: BoxStructureOption): number {
  try {
    return generateDielinePieces(item.id, item.defaultDims, CURRENT_FORMULA_VERSION).reduce(
      (sum, piece) => sum + piece.geometry.segments.filter((segment) => segment.type === "crease").length,
      0
    );
  } catch (error) {
    if (error instanceof UnsupportedStructureError) return 0;
    throw error;
  }
}

const orderOf = (id: string) => {
  const index = BOX_STRUCTURES.findIndex((s) => s.id === id);
  return index < 0 ? BOX_STRUCTURES.length : index;
};

/**
 * Cards of the structures the API offers (`GET /templates/structures`), most common first (order of BOX_STRUCTURES,
 * new structures last); offline demo: the 4 built in.
 */
function structureCards(structures: BoxStructure[] | undefined): StructureCard[] {
  if (!structures) return BOX_STRUCTURES.map((s) => ({ ...s, apiName: s.vietnameseName }));
  return [...structures].sort((a, b) => orderOf(a.id) - orderOf(b.id)).map((api) => {
    const local = BOX_STRUCTURES.find((s) => s.id === api.id);
    const base = local ?? { ...GENERIC_STRUCTURE, id: api.id, name: api.name, vietnameseName: api.name, description: "" };
    return { ...base, apiName: api.name, description: api.description ?? base.description };
  });
}

interface Step1BoxTemplatePickerProps {
  selectedStructure: BoxStructureType;
  onSelectStructure: (type: BoxStructureType) => void;
  onNext: () => void;
  /** Structures of the API; omitted in the offline demo. */
  structures?: BoxStructure[];
}

export const Step1BoxTemplatePicker: React.FC<Step1BoxTemplatePickerProps> = ({
  selectedStructure,
  onSelectStructure,
  onNext,
  structures,
}) => {
  const cards = structureCards(structures);
  const current = cards.find((s) => s.id === selectedStructure) || cards[0];

  return (
    <div className="w-full max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 py-8 space-y-8 animate-fadeIn font-sans">
      {/* Step Heading */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-semibold text-vibrant-cobalt">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Bước 1: Khởi Tạo Cấu Trúc Bao Bì</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-brand-forest">
          Chọn Cấu Trúc Hộp Quà Chuẩn Vật Lý
        </h1>
        <p className="text-sm text-stone-600 leading-relaxed">
          Mỗi dòng hộp tại WrapFit đều được xây dựng dựa trên công thức hình học CAD chính xác,
          đảm bảo khả năng bế dán thực tế 100% tại xưởng in.
        </p>
      </div>

      {/* Grid 4 Box Structure Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((item) => {
          const isSelected = item.id === selectedStructure;

          return (
            <button
              type="button"
              key={item.id}
              aria-pressed={isSelected}
              onClick={() => onSelectStructure(item.id)}
              className={`rounded-squircle-lg border-2 p-5 flex flex-col justify-between text-left transition-all cursor-pointer relative bg-white ${
                isSelected
                  ? "border-vibrant-cobalt shadow-tactile-lg ring-4 ring-blue-500/10 scale-[1.02]"
                  : "border-stone-200 hover:border-stone-300 hover:shadow-tactile hover:scale-[1.01]"
              }`}
            >
              {/* Active Checkmark Badge */}
              {isSelected && (
                <div className="absolute top-4 right-4 w-7 h-7 rounded-full bg-vibrant-cobalt text-white flex items-center justify-center shadow-md animate-scaleUp">
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
              )}

              {/* Card Header & Badge */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${item.badgeColor}`}
                  >
                    {item.badge}
                  </span>
                  <span className="text-[11px] font-mono text-stone-400">
                    {creaseCountOf(item)} Nếp gấp
                  </span>
                </div>

                {/* 3D Blueprint Illustration Box */}
                <div
                  className={`h-36 rounded-squircle flex items-center justify-center p-4 relative overflow-hidden transition-colors ${
                    isSelected
                      ? "bg-gradient-to-br from-blue-50/70 to-indigo-50/40 border border-blue-100"
                      : "bg-[#FDFBF7] border border-stone-100"
                  }`}
                >
                  {/* Subtle Grid */}
                  <div className="absolute inset-0 opacity-30 bg-[radial-gradient(#C8A882_1px,transparent_1px)] [background-size:8px_8px]" />

                  {/* SVG Isometric Box Wireframe */}
                  <svg
                    viewBox="0 0 100 100"
                    className={`w-24 h-24 transition-transform group-hover:scale-105 ${
                      isSelected ? "text-vibrant-cobalt drop-shadow-md" : "text-stone-400"
                    }`}
                  >
                    <path
                      d={item.svgPath}
                      fill={isSelected ? "rgba(37, 99, 235, 0.12)" : "rgba(230, 230, 230, 0.2)"}
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                {/* Title & Description */}
                <div>
                  <h3 className="font-serif font-bold text-stone-900 text-lg group-hover:text-vibrant-cobalt transition-colors">
                    {item.apiName}
                  </h3>
                  <p className="text-[11px] text-stone-500 font-mono mt-0.5">
                    {item.name}
                  </p>
                  <p className="text-xs text-stone-600 mt-2 line-clamp-3 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>

              {/* Card Footer: Recommendations */}
              <div className="mt-5 pt-4 border-t border-stone-100 space-y-2.5">
                {item.recommendedGifts.length > 0 && (
                  <div className="text-[11px] text-stone-500 flex items-center gap-1.5">
                    <Gift className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" />
                    <span className="truncate" title={item.recommendedGifts.join(", ")}>
                      {item.recommendedGifts.slice(0, 2).join(", ")}...
                    </span>
                  </div>
                )}
                <div className="text-[11px] text-stone-500 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" />
                  <span className="truncate font-mono" title={item.recommendedPaper}>{item.recommendedPaper}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-squircle-lg bg-white border border-stone-200 shadow-tactile">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-50 text-vibrant-cobalt flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-stone-500 block">Mẫu đã chọn:</span>
            <span className="font-serif font-bold text-stone-900 text-base">
              {current.apiName} ({current.name})
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onNext}
          className="w-full sm:w-auto px-7 py-3 rounded-full bg-brand-forest hover:bg-brand-forest-dark text-white font-semibold text-sm shadow-tactile flex items-center justify-center gap-2 transition hover:scale-105 active:scale-95"
        >
          <span>Tiếp Tục Sang Nhập Kích Thước (Bước 2)</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

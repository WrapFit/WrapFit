/* ds-artwork: 3D Studio Mockup color themes & palette definitions (Pacdora & pack.ly inspired) */

export type StudioPaletteId = "monochrome" | "sage" | "rose" | "terracotta" | "midnight";

export interface StudioPalette {
  id: StudioPaletteId;
  name: string;
  desc: string;
  /** 3 representative preview swatch colors for the UI picker pill: [curtain, wall, table] */
  swatch: [string, string, string];
  // Detailed 3D material colors:
  wallColor: string;
  curtainColor: string;
  tableTopColor: string;
  tableTopGrainColor: string;
  frameColor: string;
  vaseColor: string;
  leavesColor: string;
  cupColor: string;
  stirrerColor: string;
  slingColor: string;
  floorColor: string;
  lightingKey: string;
  lightingRim: string;
}

export const STUDIO_PALETTES: Record<StudioPaletteId, StudioPalette> = {
  monochrome: {
    id: "monochrome",
    name: "Studio Xám Chuẩn (Pacdora)",
    desc: "Tường xám studio trung tính, rèm than chì và hoa cỏ khô",
    swatch: ["#FFFFFF", "#6B7280", "#374151"],
    wallColor: "#3E4246",
    curtainColor: "#2D3035",
    tableTopColor: "#5C4033",
    tableTopGrainColor: "#3D281E",
    frameColor: "#18181B",
    vaseColor: "#4A1E22",
    leavesColor: "#C4A076",
    cupColor: "#27272A",
    stirrerColor: "#D4A373",
    slingColor: "#2E3134",
    floorColor: "#25282B",
    lightingKey: "#FFFFFF",
    lightingRim: "#CBD5E1",
  },
  sage: {
    id: "sage",
    name: "Xanh xô thơm (Sage Green)",
    desc: "Tự nhiên, thanh lịch với tông xanh olive dịu và gỗ óc chó",
    swatch: ["#CAD8CE", "#2D3A32", "#4A3525"],
    wallColor: "#2D3A32",
    curtainColor: "#CAD8CE",
    tableTopColor: "#5C4033",
    tableTopGrainColor: "#3D281E",
    frameColor: "#18181B",
    vaseColor: "#223326",
    leavesColor: "#4B6B50",
    cupColor: "#27272A",
    stirrerColor: "#D4A373",
    slingColor: "#333E35",
    floorColor: "#28302A",
    lightingKey: "#FFFFFF",
    lightingRim: "#86EFAC",
  },
  rose: {
    id: "rose",
    name: "Hồng phấn (Pastel Rose)",
    desc: "Ngọt ngào lãng mạn với tường rượu mận và rèm hồng pastel",
    swatch: ["#FCE7F3", "#831843", "#D4A373"],
    wallColor: "#831843",
    curtainColor: "#FCE7F3",
    tableTopColor: "#D4A373",
    tableTopGrainColor: "#A66D42",
    frameColor: "#27272A",
    vaseColor: "#9D174D",
    leavesColor: "#4A6B53",
    cupColor: "#BE185D",
    stirrerColor: "#FBCFE8",
    slingColor: "#500724",
    floorColor: "#FDF2F8",
    lightingKey: "#FFF0F5",
    lightingRim: "#F472B6",
  },
  terracotta: {
    id: "terracotta",
    name: "Cam đất (Warm Terracotta)",
    desc: "Ấm cúng thủ công với gốm nung, rèm lanh kem và gỗ teak",
    swatch: ["#FEF3C7", "#7C2D12", "#78350F"],
    wallColor: "#7C2D12",
    curtainColor: "#FEF3C7",
    tableTopColor: "#78350F",
    tableTopGrainColor: "#451A03",
    frameColor: "#1C1917",
    vaseColor: "#9A3412",
    leavesColor: "#3D5A45",
    cupColor: "#451A03",
    stirrerColor: "#FDE68A",
    slingColor: "#44281D",
    floorColor: "#FEF3C7",
    lightingKey: "#FFFBEB",
    lightingRim: "#F97316",
  },
  midnight: {
    id: "midnight",
    name: "Đêm huyền bí (Midnight Luxury)",
    desc: "Sang trọng cao cấp với xanh bóng đêm, rèm vàng champagne và bàn đen mun",
    swatch: ["#FEF9C3", "#0F172A", "#1E293B"],
    wallColor: "#0F172A",
    curtainColor: "#FEF9C3",
    tableTopColor: "#1E293B",
    tableTopGrainColor: "#0F172A",
    frameColor: "#09090B",
    vaseColor: "#050505",
    leavesColor: "#2D4F3E",
    cupColor: "#334155",
    stirrerColor: "#FACC15",
    slingColor: "#1E293B",
    floorColor: "#CBD5E1",
    lightingKey: "#F8FAFC",
    lightingRim: "#FCD34D",
  },
};

export const STUDIO_PALETTE_IDS: StudioPaletteId[] = ["monochrome", "sage", "rose", "terracotta", "midnight"];

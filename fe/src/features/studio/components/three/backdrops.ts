/* ds-artwork: photo backdrops of the 3D stage and its mockups (docs/15_DESIGN_SYSTEM.md §2). */

/**
 * Scenes of the 3D stage, kept apart from the WebGL code so pages can show them (thumbnails, pickers) without loading
 * three.js. The CSS is painted behind the transparent canvas; `mockup` is the same light as three canvas colours
 * (centre, middle, edge of a radial gradient) for the downloadable mockup images.
 */
export type BoxEnvironment =
  | "studio"
  | "marble"
  | "kraft_wood"
  | "forest_velvet"
  | "festive_glow"
  | "valentine"
  | "birthday"
  | "christmas"
  | "transparent";

export interface Backdrop {
  name: string;
  /** What the scene is, in a few words. */
  hint: string;
  /** CSS background of the stage, painted behind the transparent WebGL canvas. */
  css: string;
  /** Radial gradient of the mockup image: centre, middle, edge. */
  mockup: [string, string, string];
  /** Opacity of the contact shadow under the box and of the cast shadow. */
  shadow: number;
  key: string;
  rim: string;
  rimIntensity: number;
  dark?: boolean;
  /** The tabletop the box stands on in the studio set (sceneSet.ts): its look and colours. */
  surface: { kind: SurfaceKind; base: string; accent: string; name: string };
  /** What stands around the box (sceneSet.ts), in words; null: nothing, a clean product shot. */
  props: string | null;
}

export type SurfaceKind = "sweep" | "marble" | "wood" | "velvet" | "linen" | "silk" | "paper";

export type SceneId = Exclude<BoxEnvironment, "transparent">;

export const BACKDROPS: Record<SceneId, Backdrop> = {
  studio: {
    name: "Studio tối giản",
    hint: "Nền trơn chụp sản phẩm",
    css: "radial-gradient(120% 85% at 50% 28%, #FFFFFF 0%, #F4F6F2 52%, #E3E8E0 100%)",
    mockup: ["#FFFFFF", "#F4F6F2", "#E3E8E0"],
    shadow: 0.34,
    key: "#FFFFFF",
    rim: "#FFFFFF",
    rimIntensity: 0.45,
    surface: { kind: "sweep", base: "#F1F3EF", accent: "#DDE3D8", name: "Phông giấy liền" },
    props: null,
  },
  marble: {
    name: "Đá cẩm thạch",
    hint: "Mặt đá trắng bóng",
    css: [
      "linear-gradient(118deg, transparent 44%, rgba(148,163,184,0.16) 46%, transparent 49%)",
      "linear-gradient(28deg, transparent 62%, rgba(148,163,184,0.12) 63.5%, transparent 66%)",
      "radial-gradient(110% 80% at 35% 20%, #FFFFFF 0%, #F1F3F6 50%, #DCE1E8 100%)",
    ].join(", "),
    mockup: ["#FFFFFF", "#F1F3F6", "#DCE1E8"],
    shadow: 0.3,
    key: "#F4F8FF",
    rim: "#FFFFFF",
    rimIntensity: 0.5,
    surface: { kind: "marble", base: "#F6F7F9", accent: "#9AA4B2", name: "Mặt đá cẩm thạch" },
    props: "Bình gốm, cành bạch đàn, sỏi",
  },
  kraft_wood: {
    name: "Bàn gỗ mộc",
    hint: "Gỗ sồi thủ công",
    css: [
      "repeating-linear-gradient(90deg, rgba(120,72,30,0.05) 0 2px, transparent 2px 26px)",
      "radial-gradient(120% 90% at 50% 25%, #F8EAD3 0%, #EBD3AE 55%, #D6B385 100%)",
    ].join(", "),
    mockup: ["#F8EAD3", "#EBD3AE", "#D6B385"],
    shadow: 0.36,
    key: "#FFF1DE",
    rim: "#FFD9A8",
    rimIntensity: 0.4,
    surface: { kind: "wood", base: "#C9955E", accent: "#8A5A2E", name: "Mặt bàn gỗ sồi" },
    props: "Cuộn dây gai, lá khô, thanh quế",
  },
  forest_velvet: {
    name: "Nhung xanh rừng",
    hint: "Sang trọng, tối",
    css: "radial-gradient(110% 85% at 50% 28%, #2F6B52 0%, #183D2E 55%, #0B2017 100%)",
    mockup: ["#2F6B52", "#183D2E", "#0B2017"],
    shadow: 0.55,
    key: "#F1FFF6",
    rim: "#98E665",
    rimIntensity: 0.9,
    dark: true,
    surface: { kind: "velvet", base: "#1E4A37", accent: "#0F2A1F", name: "Vải nhung xanh" },
    props: "Chuỗi ngọc trai, nhẫn vàng",
  },
  festive_glow: {
    name: "Không khí Tết",
    hint: "Ánh vàng ấm",
    css: [
      "radial-gradient(55% 45% at 50% 38%, rgba(255,214,140,0.7) 0%, transparent 70%)",
      "radial-gradient(120% 90% at 50% 30%, #FFF6E8 0%, #FDE3C0 60%, #F4C38A 100%)",
    ].join(", "),
    mockup: ["#FFF1D6", "#FDE3C0", "#F4C38A"],
    shadow: 0.34,
    key: "#FFE9C9",
    rim: "#FF9F5A",
    rimIntensity: 0.8,
    surface: { kind: "linen", base: "#F3D9B1", accent: "#D9A86C", name: "Khăn lanh vàng ấm" },
    props: "Bao lì xì, quả quýt, cánh mai",
  },
  valentine: {
    name: "Valentine",
    hint: "Hồng phấn dịu",
    css: [
      "radial-gradient(50% 40% at 50% 36%, rgba(255,228,236,0.9) 0%, transparent 70%)",
      "radial-gradient(120% 90% at 50% 30%, #FFF1F5 0%, #FBCFDC 60%, #F29BB5 100%)",
    ].join(", "),
    mockup: ["#FFF1F5", "#FBCFDC", "#F29BB5"],
    shadow: 0.32,
    key: "#FFF0F5",
    rim: "#FF8FB1",
    rimIntensity: 0.7,
    surface: { kind: "silk", base: "#F7C9D6", accent: "#E48AA6", name: "Lụa hồng" },
    props: "Trái tim, cánh hoa hồng",
  },
  birthday: {
    name: "Sinh nhật",
    hint: "Pastel vui tươi",
    css: [
      "radial-gradient(4px 4px at 18% 22%, #F472B6 98%, transparent)",
      "radial-gradient(4px 4px at 78% 18%, #60A5FA 98%, transparent)",
      "radial-gradient(3px 3px at 64% 30%, #FBBF24 98%, transparent)",
      "radial-gradient(3px 3px at 30% 12%, #34D399 98%, transparent)",
      "radial-gradient(120% 90% at 50% 30%, #FFFDF5 0%, #FDF0D5 60%, #F6D7B0 100%)",
    ].join(", "),
    mockup: ["#FFFDF5", "#FDF0D5", "#F6D7B0"],
    shadow: 0.32,
    key: "#FFFFFF",
    rim: "#FFC27A",
    rimIntensity: 0.6,
    surface: { kind: "paper", base: "#FBEFD9", accent: "#EBCB9E", name: "Giấy kem" },
    props: "Nến sinh nhật, giấy kim tuyến",
  },
  christmas: {
    name: "Giáng Sinh",
    hint: "Đỏ rượu, ánh đèn",
    css: [
      "radial-gradient(45% 35% at 50% 36%, rgba(255,210,150,0.35) 0%, transparent 70%)",
      "radial-gradient(110% 85% at 50% 28%, #8E2A2A 0%, #5C1717 55%, #2E0A0A 100%)",
    ].join(", "),
    mockup: ["#8E2A2A", "#5C1717", "#2E0A0A"],
    shadow: 0.55,
    key: "#FFF4E6",
    rim: "#FFC46B",
    rimIntensity: 0.9,
    dark: true,
    surface: { kind: "velvet", base: "#6E1D1D", accent: "#3A0C0C", name: "Nhung đỏ rượu" },
    props: "Quả châu, cành thông, quả thông",
  },
};

export const SCENE_IDS = Object.keys(BACKDROPS) as SceneId[];

/** Scene that suits the occasion of a design (the occasions of the library). */
export function sceneForOccasion(occasion: string | null | undefined): SceneId {
  switch (occasion) {
    case "TET":
      return "festive_glow";
    case "CHRISTMAS":
      return "christmas";
    case "VALENTINE":
      return "valentine";
    case "BIRTHDAY":
      return "birthday";
    case "WEDDING":
      return "marble";
    default:
      return "studio";
  }
}

/** The tabletop of a scene in CSS: the scene thumbnails show what the box will stand on. */
export function surfaceCss({ kind, base, accent }: Backdrop["surface"]): string {
  switch (kind) {
    case "marble":
      return `linear-gradient(118deg, transparent 38%, ${accent}66 40%, transparent 43%), linear-gradient(30deg, transparent 62%, ${accent}44 63.5%, transparent 66%), ${base}`;
    case "wood":
      return `repeating-linear-gradient(0deg, ${accent}55 0 1px, transparent 1px 6px), linear-gradient(0deg, ${accent}33 0 2px, transparent 2px) 0 0 / 100% 14px, ${base}`;
    case "velvet":
      return `radial-gradient(120% 90% at 30% 20%, rgba(255,255,255,0.16), transparent 60%), ${base}`;
    case "linen":
    case "paper":
      return `repeating-linear-gradient(90deg, ${accent}40 0 1px, transparent 1px 4px), repeating-linear-gradient(0deg, ${accent}40 0 1px, transparent 1px 4px), ${base}`;
    case "silk":
      return `linear-gradient(100deg, ${base} 0%, rgba(255,255,255,0.45) 38%, ${base} 55%, ${accent}88 100%)`;
    case "sweep":
    default:
      return base;
  }
}

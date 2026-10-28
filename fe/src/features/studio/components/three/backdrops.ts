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
}

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

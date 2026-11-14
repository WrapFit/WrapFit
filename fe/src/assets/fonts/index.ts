import localFont from "next/font/local";
import { JetBrains_Mono, Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import type { PrintFontId } from "@wrapfit/shared";

/** Editorial display serif for headings and hero copy. */
export const playfair = Playfair_Display({
  subsets: ["latin", "vietnamese"],
  variable: "--font-playfair",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

/** UI controls and labels. */
export const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin", "vietnamese"],
  variable: "--font-jakarta",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

/** CAD dimension readouts (L, W, H, t in mm). */
export const jetbrains = JetBrains_Mono({
  subsets: ["latin", "vietnamese"],
  variable: "--font-jetbrains",
  display: "swap",
  weight: ["400", "500", "700"],
});

// Fonts of the texts on a box: the very files the print PDF embeds (./print/README.md), four faces each (regular,
// italic, bold, bold italic), so a text measures and wraps the same on screen and on paper. Not preloaded: only pages that draw box texts download them.
// (next/font only accepts literal options, hence the repetition.)
const beVietnam = localFont({
  src: [
    { path: "./print/BeVietnamPro_400Regular.ttf", weight: "400", style: "normal" },
    { path: "./print/BeVietnamPro_400Regular_Italic.ttf", weight: "400", style: "italic" },
    { path: "./print/BeVietnamPro_700Bold.ttf", weight: "700", style: "normal" },
    { path: "./print/BeVietnamPro_700Bold_Italic.ttf", weight: "700", style: "italic" },
  ],
  variable: "--font-print-be-vietnam",
  preload: false,
});
const playfairPrint = localFont({
  src: [
    { path: "./print/PlayfairDisplay_400Regular.ttf", weight: "400", style: "normal" },
    { path: "./print/PlayfairDisplay_400Regular_Italic.ttf", weight: "400", style: "italic" },
    { path: "./print/PlayfairDisplay_700Bold.ttf", weight: "700", style: "normal" },
    { path: "./print/PlayfairDisplay_700Bold_Italic.ttf", weight: "700", style: "italic" },
  ],
  variable: "--font-print-playfair",
  preload: false,
});
const cormorant = localFont({
  src: [
    { path: "./print/CormorantGaramond_400Regular.ttf", weight: "400", style: "normal" },
    { path: "./print/CormorantGaramond_400Regular_Italic.ttf", weight: "400", style: "italic" },
    { path: "./print/CormorantGaramond_700Bold.ttf", weight: "700", style: "normal" },
    { path: "./print/CormorantGaramond_700Bold_Italic.ttf", weight: "700", style: "italic" },
  ],
  variable: "--font-print-cormorant",
  preload: false,
});
// No italic file: italic texts in this family print upright (printedFace of @wrapfit/shared).
const bigShoulders = localFont({
  src: [
    { path: "./print/BigShouldersDisplay_400Regular.ttf", weight: "400", style: "normal" },
    { path: "./print/BigShouldersDisplay_700Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-print-big-shoulders",
  preload: false,
});
const inter = localFont({
  src: [
    { path: "./print/Inter_400Regular.ttf", weight: "400", style: "normal" },
    { path: "./print/Inter_400Regular_Italic.ttf", weight: "400", style: "italic" },
    { path: "./print/Inter_700Bold.ttf", weight: "700", style: "normal" },
    { path: "./print/Inter_700Bold_Italic.ttf", weight: "700", style: "italic" },
  ],
  variable: "--font-print-inter",
  preload: false,
});

/** CSS variable holding the loaded family of each print font. */
export const PRINT_FONT_VARIABLES: Record<PrintFontId, string> = {
  "be-vietnam-pro": "--font-print-be-vietnam",
  "playfair-display": "--font-print-playfair",
  "cormorant-garamond": "--font-print-cormorant",
  "big-shoulders-display": "--font-print-big-shoulders",
  inter: "--font-print-inter",
};

/** Class names that expose the font variables; put them on `<html>`. */
export const fontVariables = [playfair, jakarta, jetbrains, beVietnam, playfairPrint, cormorant, bigShoulders, inter]
  .map((font) => font.variable)
  .join(" ");

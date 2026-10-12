import { Be_Vietnam_Pro, Inter } from "next/font/google";

// Fonts of the marketing pages, kept out of ./index.ts so that only the routes using them preload them.
// pack.ly sets its headings in Poppins, which has no Vietnamese glyphs: Be Vietnam Pro is the geometric sans
// closest to it that does.

/** Headings of the home page; the whole text of the template library and shared design pages. */
const landingHeading = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  variable: "--font-landing-heading",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

/** Body text and controls of the home page. */
const landingBody = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-landing-body",
  display: "swap",
});

/** Class names that expose the variables; put them on the root element of the home page. */
export const landingFontVariables = `${landingHeading.variable} ${landingBody.variable}`;

import React from "react";
import { fontVariables } from "@/assets/fonts";
import { landingFontVariables } from "@/assets/fonts/landing";
import { AppProviders, MainLayout } from "@/layouts/main";
import "@/assets/styles/globals.css";

export const metadata = {
  title: "WrapFit",
  description: "Make Every Present, Present. Thiết kế chiếc hộp bao quanh món quà với 100% khả thi sản xuất.",
  // Favicon: the orange hexagon mark (same drawing as components/layout/WrapFitMark.tsx). `?v=` busts the old W icon in browser caches.
  icons: {
    icon: [
      { url: "/branding/wrapfit-mark.svg?v=2", type: "image/svg+xml" },
      { url: "/favicon.ico?v=2", sizes: "48x48" },
    ],
    apple: "/apple-touch-icon.png?v=2",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={`${fontVariables} ${landingFontVariables}`}>
      <body className="antialiased min-h-screen bg-paper-ivory text-ink-primary font-sans selection:bg-brand-gold/30 selection:text-brand-forest">
        <AppProviders>
          <MainLayout>{children}</MainLayout>
        </AppProviders>
      </body>
    </html>
  );
}

import React from "react";
import { fontVariables } from "@/assets/fonts";
import { AppProviders, MainLayout } from "@/layouts/main";
import "@/assets/styles/globals.css";

export const metadata = {
  title: "WrapFit",
  description: "Make Every Present, Present. Thiết kế chiếc hộp bao quanh món quà với 100% khả thi sản xuất.",
  // Clean favicon using the 3D box logo with FPT colors
  icons: { icon: "/branding/wrapfit-box-icon.svg" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={fontVariables}>
      <body className="antialiased min-h-screen bg-paper-ivory text-ink-primary font-sans selection:bg-brand-gold/30 selection:text-brand-forest">
        <AppProviders>
          <MainLayout>{children}</MainLayout>
        </AppProviders>
      </body>
    </html>
  );
}

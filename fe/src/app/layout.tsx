import React from "react";
import { fontVariables } from "@/assets/fonts";
import { AppProviders, MainLayout } from "@/layouts/main";
import "@/assets/styles/globals.css";

export const metadata = {
  title: "WrapFit — Packaging Personalization & Intelligence Platform",
  description: "Make Every Present, Present. Thiết kế chiếc hộp bao quanh món quà với 100% khả thi sản xuất.",
  // Without a declared icon every first page load asks for /favicon.ico and gets 404.
  icons: { icon: "/branding/wrapfit-logo.png" },
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

"use client";

import { useSearchParams } from "next/navigation";
import React, { Suspense } from "react";
import { landingFontVariables } from "@/assets/fonts/landing";
import {
  BoxCatalog,
  CustomerVoices,
  HomeHero,
  MainFlowSection,
  PlansAndCopilot,
} from "@/components/home";
import { MainFooter, MainHeader } from "@/components/layout";
import { continueTourOnNextPage, ProductTour, type TourStep } from "@/components/ui";
import { ONBOARDING_TOUR_ID } from "@/features/auth";

/**
 * Onboarding of a new account: after the first sign-in the user lands here (features/auth/redirect.ts) and Bé Gói
 * walks from what WrapFit does to where to start. Visitors who are not signed in are not interrupted.
 */
const HOME_TOUR: TourStep[] = [
  {
    title: "Chào mừng bạn đến với WrapFit!",
    body: "Mình là Bé Gói, trợ lý gói quà của bạn. Mình dẫn bạn đi một vòng: WrapFit làm được gì và bắt đầu từ đâu.",
    mascot: "waving",
  },
  {
    target: '[data-tour="home-features"]',
    title: "WrapFit làm được gì",
    body: "Hộp may đo theo món quà, khuôn bế đạt chuẩn in, hoa văn AI và xem hộp 3D trước khi in.",
    mascot: "presenting",
  },
  {
    target: '[data-tour="home-industries"]',
    title: "Chọn theo ngành hàng",
    body: "Mỹ phẩm, nến thơm, bánh kẹo, trang sức… Mỗi thẻ mở các mẫu hộp hợp với loại quà đó.",
    mascot: "presenting",
  },
  {
    target: '[data-tour="home-copilot"]',
    title: "Bé Gói luôn ở cạnh bạn",
    body: "Trong Studio, mình nhắc khi chữ sát lề an toàn 3 mm hay ảnh thiếu độ phân giải, và sửa giúp bằng 1 cú bấm.",
    mascot: "measuring",
  },
  {
    target: '[data-tour="header-start"]',
    title: "Sẵn sàng làm chiếc hộp đầu tiên?",
    body: "Bấm “Bắt đầu” để mở trang tạo hộp. Ở đó mình sẽ hướng dẫn tiếp từng bước: chọn kiểu hộp, nhập kích thước món quà, chọn giấy.",
    mascot: "celebration",
    clickTarget: true,
  },
];

/**
 * `/`: the home page, laid out after the pack.ly home page (slate ink on a cool grey canvas, lime calls to action,
 * Be Vietnam Pro headings over Inter). The site header and footer stay the app's own.
 */
export default function HomePage() {
  return (
    <>
      <MainHeader />
      {/* useSearchParams needs a Suspense boundary on a static page. */}
      <Suspense fallback={null}>
        <WelcomeTour />
      </Suspense>
      <main className={`${landingFontVariables} w-full bg-landing-canvas font-landing-body text-landing-ink antialiased`}>
        <HomeHero />
        <MainFlowSection />
        <BoxCatalog />
        <PlansAndCopilot />
        <CustomerVoices />
      </main>
      <MainFooter />
    </>
  );
}

/**
 * The onboarding tour, when the address carries `?welcome=1` (set by the sign-in page for a first sign-in).
 * useSearchParams follows client navigations, so it also works when the sign-in page routes here without a reload.
 */
function WelcomeTour() {
  const welcome = useSearchParams().get("welcome") === "1";
  if (!welcome) return null;
  return (
    <ProductTour
      id={ONBOARDING_TOUR_ID}
      steps={HOME_TOUR}
      startDelayMs={900}
      // Drop `?welcome=1` from the address without a navigation, so a reload does not look like a first visit.
      onClose={(completed) => {
        window.history.replaceState(window.history.state, "", window.location.pathname);
        // Finished on "Bắt đầu": the page it opens continues the guide at once.
        if (completed) continueTourOnNextPage();
      }}
    />
  );
}

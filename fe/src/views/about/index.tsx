"use client";

import React from "react";
import { landingFontVariables } from "@/assets/fonts/landing";
import {
  AboutBackers,
  AboutCta,
  AboutHero,
  AboutMilestones,
  AboutMissionValues,
  AboutTeam,
} from "@/components/about";
import { MainFooter, MainHeader } from "@/components/layout";

/**
 * `/about`: The official About Us page for WrapFit Platform.
 * Implements the 6-item startup checklist:
 * 1. Origin story (Vấn đề và lý do sáng lập)
 * 2. Mission or values (Sứ mệnh "Make Every Present, Present" & 4 Giá trị cốt lõi)
 * 3. Team (Đội ngũ 6 sáng lập viên Đại học FPT & Mascot Bé Gói)
 * 4. Milestones or traction (Chặng đường phát triển & số liệu 427+ Waitlist, Zero MOQ)
 * 5. Investors or backers (FPT University, EXE101, ECMA/FEFCO, Mạng lưới xưởng cắt phẳng)
 * 6. CTA (Studio 3D, Waitlist, Liên hệ đối tác)
 */
export default function AboutPage() {
  return (
    <>
      <MainHeader />
      <main
        className={`${landingFontVariables} w-full bg-landing-canvas font-landing-body text-landing-ink antialiased`}
      >
        <AboutHero />
        <AboutMissionValues />
        <AboutMilestones />
        <AboutTeam />
        <AboutBackers />
        <AboutCta />
      </main>
      <MainFooter />
    </>
  );
}

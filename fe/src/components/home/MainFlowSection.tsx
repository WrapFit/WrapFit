"use client";

import React, { useState } from "react";
import { ChevronRight, Maximize2 } from "lucide-react";
import { GoiMascot } from "@/components/common/GoiMascot";
import { Container, Reveal } from "@/components/landing";
import { tactileAudio } from "@/services/audio/tactileAudio";
import { FlowStepModal } from "./FlowStepModal";

export function MainFlowSection() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStepIndex, setSelectedStepIndex] = useState(0);

  const handleCardClick = (stepIndex: number) => {
    setSelectedStepIndex(stepIndex);
    setModalOpen(true);
    try {
      tactileAudio.playUnboxPop();
    } catch {
      // Ignored if audio context is not yet primed
    }
  };

  return (
    <>
      <section id="quy-trinh" className="relative scroll-mt-24 border-b border-line/60 bg-canvas py-14 lg:py-24">
        <Container>
          {/* Section Header */}
          <Reveal variant="text" className="mx-auto max-w-3xl text-center mb-12 lg:mb-16">
            {/* Orange pill badge */}
            <div className="inline-flex items-center rounded-full bg-fpt-orange px-4 py-1.5 shadow-soft-8 mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-white">
                QUY TRÌNH HOẠT ĐỘNG
              </span>
            </div>

            {/* Heading */}
            <h2 className="font-landing-heading text-2xl font-bold tracking-tight text-landing-ink sm:text-4xl lg:text-5xl leading-tight text-balance">
              Thiết kế & sản xuất bao bì vừa khít{" "}
              <span className="text-landing-ink">món quà chỉ với 4 bước</span>
            </h2>

            {/* Subtitle */}
            <p className="mt-3 text-sm sm:text-base text-fg-muted font-landing-body leading-relaxed max-w-2xl mx-auto">
              Sử dụng công nghệ may đo bao bì thông minh, biến kích thước món quà thành sản phẩm thực tế mà không cần kinh nghiệm thiết kế.
            </p>
          </Reveal>

          {/* 4 Cards Row */}
          <div className="relative grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4 items-stretch">
            {/* ================= CARD 01 ================= */}
            <div
              onClick={() => handleCardClick(0)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") handleCardClick(0);
              }}
              title="Nhấn để phóng to xem giao diện & tính năng Đo kích thước quà"
              className="group relative flex flex-col justify-between rounded-sheet border border-line/70 bg-white p-6 sm:p-7 shadow-soft-8 transition-all duration-300 hover:-translate-y-1.5 hover:border-fpt-orange/60 hover:shadow-soft-16 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-fpt-orange"
            >
              {/* Zoom pill badge on hover */}
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-200">
                <span className="flex size-7 items-center justify-center rounded-full bg-surface-sunken border border-line/80 text-fg-muted shadow-2xs group-hover:bg-fpt-orange group-hover:text-white">
                  <Maximize2 className="size-3.5" />
                </span>
              </div>

              <div>
                <span className="font-mono text-xs font-semibold text-fg-muted">Bước 01</span>
                <h3 className="font-landing-heading text-xl font-bold text-landing-ink mt-1">
                  Đo kích thước quà
                </h3>

                {/* Dimension Inputs (L x W x H) */}
                <div className="mt-3">
                  <p className="text-xs font-medium text-fg-muted mb-1.5">Kích thước món quà (mm)</p>
                  <div className="flex items-center justify-between gap-1.5 text-center font-landing-body text-xs">
                    <div className="flex-1 rounded-xl border border-line/80 bg-white py-1.5 shadow-2xs">
                      <span className="font-semibold text-fg">L</span>
                      <span className="block text-caption text-fg-muted">mm</span>
                    </div>
                    <span className="text-fg-muted text-xs">×</span>
                    <div className="flex-1 rounded-xl border border-line/80 bg-white py-1.5 shadow-2xs">
                      <span className="font-semibold text-fg">W</span>
                      <span className="block text-caption text-fg-muted">mm</span>
                    </div>
                    <span className="text-fg-muted text-xs">×</span>
                    <div className="flex-1 rounded-xl border border-line/80 bg-white py-1.5 shadow-2xs">
                      <span className="font-semibold text-fg">H</span>
                      <span className="block text-caption text-fg-muted">mm</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3D Box on CAD Ruler Artwork */}
              <div className="my-5 flex h-[160px] w-full items-center justify-center">
                <img
                  src="/branding/flow-art-1.png"
                  alt="Đo kích thước quà"
                  className="max-h-[148px] w-auto object-contain transition-transform duration-300 group-hover:scale-105"
                />
              </div>

              {/* Bottom Label */}
              <div className="text-center pt-2">
                <p className="font-landing-heading text-base font-bold text-landing-ink">
                  Đo kích thước quà
                </p>
                <span className="inline-block mt-1 text-caption font-semibold text-fpt-orange opacity-0 group-hover:opacity-100 transition-opacity">
                  Xem chi tiết tính năng ↗
                </span>
              </div>
            </div>

            {/* Connector Arrow 1 -> 2 (Desktop) */}
            <div className="hidden xl:flex absolute top-1/2 left-[24.3%] -translate-y-1/2 -translate-x-1/2 z-10 pointer-events-none text-line-strong/60">
              <span className="flex size-9 items-center justify-center rounded-full border border-line bg-surface-raised text-accent shadow-soft-8"><ChevronRight className="size-4" strokeWidth={2.5} aria-hidden /></span>
            </div>

            {/* ================= CARD 02 ================= */}
            <div
              onClick={() => handleCardClick(1)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") handleCardClick(1);
              }}
              title="Nhấn để phóng to xem giao diện & tính năng Thiết kế 2D & Mô phỏng 3D"
              className="group relative flex flex-col justify-between rounded-sheet border border-line/70 bg-white p-6 sm:p-7 shadow-soft-8 transition-all duration-300 hover:-translate-y-1.5 hover:border-fpt-orange/60 hover:shadow-soft-16 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-fpt-orange"
            >
              {/* Zoom pill badge on hover */}
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-200">
                <span className="flex size-7 items-center justify-center rounded-full bg-surface-sunken border border-line/80 text-fg-muted shadow-2xs group-hover:bg-fpt-orange group-hover:text-white">
                  <Maximize2 className="size-3.5" />
                </span>
              </div>

              <div>
                <span className="font-mono text-xs font-semibold text-fg-muted">Bước 02</span>
                <h3 className="font-landing-heading text-xl font-bold text-landing-ink mt-1 leading-snug">
                  Thiết kế 2D &<br className="hidden sm:inline" /> Mô phỏng 3D
                </h3>
                <div className="h-[46px]" /> {/* Spacer to align with Card 1 inputs */}
              </div>

              {/* Inset Container: 2D Dieline -> 3D Open Box */}
              <div className="my-5 flex h-[160px] w-full items-center justify-center">
                <img
                  src="/branding/flow-art-2.png"
                  alt="Thiết kế 2D & Mô phỏng 3D"
                  className="max-h-[155px] w-auto object-contain rounded-2xl shadow-2xs border border-line/60 transition-transform duration-300 group-hover:scale-105"
                />
              </div>

              {/* Bottom Label */}
              <div className="text-center pt-2">
                <p className="font-landing-heading text-base font-bold text-landing-ink">
                  Thiết kế 2D & Mô phỏng 3D
                </p>
                <span className="inline-block mt-1 text-caption font-semibold text-fpt-orange opacity-0 group-hover:opacity-100 transition-opacity">
                  Xem chi tiết tính năng ↗
                </span>
              </div>
            </div>

            {/* Connector Arrow 2 -> 3 (Desktop) */}
            <div className="hidden xl:flex absolute top-1/2 left-[49.5%] -translate-y-1/2 -translate-x-1/2 z-10 pointer-events-none text-line-strong/60">
              <span className="flex size-9 items-center justify-center rounded-full border border-line bg-surface-raised text-accent shadow-soft-8"><ChevronRight className="size-4" strokeWidth={2.5} aria-hidden /></span>
            </div>

            {/* ================= CARD 03 ================= */}
            <div
              onClick={() => handleCardClick(2)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") handleCardClick(2);
              }}
              title="Nhấn để xem giao diện kiểm tra FitCheck™"
              className="group relative flex flex-col justify-between rounded-sheet border border-line/70 bg-white p-6 sm:p-7 shadow-soft-8 transition-all duration-300 hover:-translate-y-1.5 hover:border-fpt-orange/60 hover:shadow-soft-16 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-fpt-orange"
            >
              {/* Zoom pill badge on hover */}
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-200">
                <span className="flex size-7 items-center justify-center rounded-full bg-surface-sunken border border-line/80 text-fg-muted shadow-2xs group-hover:bg-fpt-orange group-hover:text-white">
                  <Maximize2 className="size-3.5" />
                </span>
              </div>

              <div>
                <span className="font-mono text-xs font-semibold text-fg-muted">Bước 03</span>
                <h3 className="font-landing-heading text-xl font-bold text-landing-ink mt-1">
                  Kiểm tra in FitCheck™
                </h3>

                {/* Pre-press Chips */}
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <span className="rounded-full border border-success/40 bg-success-bg/80 px-2.5 py-0.5 text-caption font-medium text-success-fg">
                    Lề an toàn 3 mm
                  </span>
                  <span className="rounded-full border border-success/40 bg-success-bg/80 px-2.5 py-0.5 text-caption font-medium text-success-fg">
                    Bleed 2mm
                  </span>
                </div>
              </div>

              {/* Bé Gói measuring the margins; not interactive: the whole card opens the step. */}
              <div className="my-5 flex h-[160px] w-full items-center justify-center transition-transform duration-300 group-hover:scale-105">
                <GoiMascot pose="measuring" size={150} interactive={false} showPhotoBadge={false} enableTracking={false} label="Bé Gói kiểm tra lề an toàn" />
              </div>

              {/* Bottom Label */}
              <div className="text-center pt-2">
                <p className="font-landing-heading text-base font-bold text-landing-ink leading-tight">
                  Bé Gói soát lỗi<br />trước khi in
                </p>
                <span className="inline-block mt-1 text-caption font-semibold text-fpt-orange opacity-0 group-hover:opacity-100 transition-opacity">
                  Xem chi tiết tính năng ↗
                </span>
              </div>
            </div>

            {/* Connector Arrow 3 -> 4 (Desktop) */}
            <div className="hidden xl:flex absolute top-1/2 left-[74.7%] -translate-y-1/2 -translate-x-1/2 z-10 pointer-events-none text-line-strong/60">
              <span className="flex size-9 items-center justify-center rounded-full border border-line bg-surface-raised text-accent shadow-soft-8"><ChevronRight className="size-4" strokeWidth={2.5} aria-hidden /></span>
            </div>

            {/* ================= CARD 04 ================= */}
            <div
              onClick={() => handleCardClick(3)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") handleCardClick(3);
              }}
              title="Nhấn để phóng to xem giao diện & tính năng Xuất file in & Cắt bế"
              className="group relative flex flex-col justify-between rounded-sheet border border-line/70 bg-white p-6 sm:p-7 shadow-soft-8 transition-all duration-300 hover:-translate-y-1.5 hover:border-fpt-orange/60 hover:shadow-soft-16 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-fpt-orange"
            >
              {/* Zoom pill badge on hover */}
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-200">
                <span className="flex size-7 items-center justify-center rounded-full bg-surface-sunken border border-line/80 text-fg-muted shadow-2xs group-hover:bg-fpt-orange group-hover:text-white">
                  <Maximize2 className="size-3.5" />
                </span>
              </div>

              <div>
                <span className="font-mono text-xs font-semibold text-fg-muted">Bước 04</span>
                <h3 className="font-landing-heading text-xl font-bold text-landing-ink mt-1">
                  Xuất file in & Cắt bế
                </h3>

                {/* Vector PDF Chip */}
                <div className="flex items-center gap-2 mt-3">
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-line/70 bg-surface-sunken/60 px-2.5 py-1 text-xs font-medium text-fg">
                    <span className="rounded bg-red-600 px-1 py-0.5 text-cad-spec-micro font-bold text-white uppercase leading-none">
                      PDF
                    </span>
                    <span>PDF vector 300 DPI</span>
                  </span>
                </div>
              </div>

              {/* Digital Flatbed Cutter Machine Artwork */}
              <div className="my-5 flex h-[160px] w-full items-center justify-center">
                <img
                  src="/branding/flow-art-4.png"
                  alt="Xuất file in & Cắt bế"
                  className="max-h-[155px] w-auto object-contain transition-transform duration-300 group-hover:scale-105"
                />
              </div>

              {/* Bottom Label */}
              <div className="text-center pt-2">
                <p className="font-landing-heading text-base font-bold text-landing-ink">
                  Xuất file in & Cắt bế
                </p>
                <span className="inline-block mt-1 text-caption font-semibold text-fpt-orange opacity-0 group-hover:opacity-100 transition-opacity">
                  Xem chi tiết tính năng ↗
                </span>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Interactive Zoom-to-Popup Modal */}
      <FlowStepModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        stepIndex={selectedStepIndex}
      />
    </>
  );
}

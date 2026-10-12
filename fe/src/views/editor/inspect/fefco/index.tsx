'use client';

import React from 'react';
import Link from 'next/link';
import { MainHeader, MainFooter } from '@/components/layout';

export default function EditorInspectFefcoPage() {
  return (
    <div data-stitch="editor-inspect-fefco" className="min-h-screen bg-background font-body-md text-on-surface antialiased flex flex-col justify-between select-none">
      <MainHeader />

      <main className="w-full max-w-[1720px] mx-auto pt-24 pb-8 px-4 sm:px-6 lg:px-8 flex-1 flex flex-col gap-4">
        {/* Seamless Sub-Bar */}
        <div className="h-14 shrink-0 px-5 flex items-center justify-between bg-surface/90 backdrop-blur-md rounded-2xl z-30 border border-surface-container-high/60 shadow-xs">
          <div className="flex items-center gap-4">
            <Link
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 hover:bg-white text-on-surface-variant hover:text-on-surface shadow-xs transition-all font-label-ui text-xs font-semibold"
              href="/editor/step-1"
            >
              <span className="material-symbols-outlined text-[17px]">arrow_back</span>
              <span>Bước 1: Chọn mẫu</span>
            </Link>
            <div className="flex items-center gap-2.5">
              <h1 className="font-headline-sm text-base font-bold tracking-tight text-on-surface">
                Hộp Nắp Gài Đáy Khóa
              </h1>
              <div className="flex items-center gap-1.5">
                <span className="font-cad-dimension text-[11px] px-2 py-0.5 rounded-full bg-secondary-container/70 text-secondary font-semibold">
                  ECMA A20
                </span>
                <span className="font-cad-dimension text-[11px] px-2 py-0.5 rounded-full bg-primary-fixed/60 text-primary font-semibold">
                  FEFCO 0215
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/editor/export"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/80 hover:bg-white text-on-surface-variant hover:text-on-surface font-label-ui text-xs font-medium shadow-xs transition-all border border-outline-variant/30"
            >
              <span className="material-symbols-outlined text-[16px]">file_download</span>
              <span>Xuất DXF / PDF CAD</span>
            </Link>
            <Link
              href="/editor/step-2"
              className="h-9 px-5 rounded-full bg-primary hover:bg-primary-container text-on-primary font-label-ui text-xs font-semibold shadow-sm hover:shadow transition-all flex items-center gap-2 active:scale-95"
            >
              <span>Tiếp Tục Kích Thước</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>
        </div>

        {/* Master Viewport Canvas */}
        <div className="flex-1 flex min-h-[560px] w-full gap-5">
          {/* Central Stage: Industrial Packaging Exploded CAD Blueprint */}
          <section className="flex-1 h-full flex flex-col relative rounded-3xl bg-gradient-to-b from-white/95 via-surface-container-low/80 to-surface-container/60 shadow-sm overflow-hidden backdrop-blur-md cad-grid-pattern border border-surface-container-highest/60 p-4">
            {/* Top Control Row */}
            <div className="flex items-center justify-between pb-3 pointer-events-none">
              <div className="inline-flex p-1 rounded-full bg-white/90 backdrop-blur-md shadow-xs pointer-events-auto font-label-ui text-xs border border-outline-variant/30">
                <button className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary text-on-primary font-semibold shadow-xs transition-all">
                  <span className="material-symbols-outlined text-[15px]">all_out</span>
                  <span>Giải Phẫu Bóc Tách 3D</span>
                </button>
                <Link
                  href="/editor/step-3"
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-on-surface-variant hover:text-on-surface transition-all font-medium"
                >
                  <span className="material-symbols-outlined text-[15px]">grid_4x4</span>
                  <span>Bản Vẽ Rập Bế 2D Dieline</span>
                </Link>
                <Link
                  href="/editor/materials/backdrop"
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-on-surface-variant hover:text-on-surface transition-all font-medium"
                >
                  <span className="material-symbols-outlined text-[15px]">texture</span>
                  <span>Vật Liệu Cảm Quan PBR</span>
                </Link>
              </div>

              <div className="flex items-center gap-2.5 pointer-events-auto">
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 backdrop-blur-md shadow-xs text-on-surface-variant font-cad-dimension text-xs font-semibold border border-outline-variant/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>150 × 65 × 65 mm (T: 0.45mm)</span>
                </div>
              </div>
            </div>

            {/* 3D Isometric Exploded CAD SVG Stage */}
            <div className="flex-1 w-full h-full flex items-center justify-center relative p-4 select-none">
              <div className="absolute w-[500px] h-[500px] rounded-full bg-primary-fixed/25 blur-3xl -z-10 pointer-events-none" />
              <svg className="w-full max-w-[820px] h-auto max-h-[88%] drop-shadow-xl" fill="none" viewBox="0 0 860 620" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern height="6" id="glueHatch" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse" width="6">
                    <line opacity="0.65" stroke="#0ea5e9" strokeWidth="1.2" x1="0" x2="0" y1="0" y2="6" />
                    <line opacity="0.4" stroke="#0284c7" strokeWidth="0.8" x1="0" x2="6" y1="0" y2="0" />
                  </pattern>
                  <linearGradient id="bodyFrontGrad" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="60%" stopColor="#fdfcfc" />
                    <stop offset="100%" stopColor="#f1f5f9" />
                  </linearGradient>
                  <linearGradient id="bodySideGrad" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0%" stopColor="#f8fafc" />
                    <stop offset="100%" stopColor="#e2e8f0" />
                  </linearGradient>
                  <linearGradient id="interiorCavityGrad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#dbe3ea" />
                    <stop offset="100%" stopColor="#94a3b8" />
                  </linearGradient>
                  <linearGradient id="tuckLidGrad" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="70%" stopColor="#f0f7ff" />
                    <stop offset="100%" stopColor="#dbeafe" />
                  </linearGradient>
                  <linearGradient id="dustFlapGradL" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0%" stopColor="#fffbeb" />
                    <stop offset="100%" stopColor="#fef3c7" />
                  </linearGradient>
                  <linearGradient id="dustFlapGradR" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0%" stopColor="#fffbeb" />
                    <stop offset="100%" stopColor="#fde68a" />
                  </linearGradient>
                  <linearGradient id="snapBottomGrad1" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0%" stopColor="#ecfdf5" />
                    <stop offset="100%" stopColor="#d1fae5" />
                  </linearGradient>
                  <linearGradient id="snapBottomGrad2" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0%" stopColor="#f0fdf4" />
                    <stop offset="100%" stopColor="#bbf7d0" />
                  </linearGradient>
                  <filter height="125%" id="cadShadow" width="120%" x="-10%" y="-10%">
                    <feDropShadow dx="0" dy="16" floodColor="#0f172a" floodOpacity="0.09" stdDeviation="20" />
                  </filter>
                  <filter height="130%" id="partGlow" width="130%" x="-15%" y="-15%">
                    <feDropShadow dx="0" dy="8" floodColor="#2563eb" floodOpacity="0.08" stdDeviation="10" />
                  </filter>
                </defs>
                <ellipse cx="430" cy="565" fill="#0f172a" filter="blur(10px)" opacity="0.07" rx="210" ry="24" />
                <ellipse cx="430" cy="565" fill="#1e293b" filter="blur(5px)" opacity="0.05" rx="140" ry="14" />
                <g opacity="0.35">
                  <line stroke="#94a3b8" strokeDasharray="3 3" strokeWidth="1" x1="430" x2="430" y1="565" y2="70" />
                  <line stroke="#cbd5e1" strokeDasharray="2 4" strokeWidth="0.9" x1="160" x2="430" y1="330" y2="175" />
                  <line stroke="#cbd5e1" strokeDasharray="2 4" strokeWidth="0.9" x1="700" x2="430" y1="330" y2="175" />
                </g>
                <g className="floating-top" filter="url(#partGlow)">
                  <path d="M 360,38 Q 380,30 430,30 Q 480,30 500,38 L 485,62 L 375,62 Z" fill="#e0f2fe" stroke="#2563eb" strokeLinejoin="round" strokeWidth="1.6" />
                  <text fill="#0369a1" fontFamily="JetBrains Mono" fontSize="7.5" fontWeight="600" letterSpacing="0.08em" textAnchor="middle" x="430" y="47">OPEN WITH CARE • KHÓA ÂM DƯƠNG R:6</text>
                  <polygon fill="url(#tuckLidGrad)" points="320,95 430,55 540,95 430,135" stroke="#2563eb" strokeLinejoin="round" strokeWidth="2" />
                  <line stroke="#ef4444" strokeDasharray="4 3" strokeWidth="1.6" x1="375" x2="485" y1="62" y2="62" />
                  <text fill="#475569" fontFamily="Plus Jakarta Sans" fontSize="8.5" fontWeight="600" letterSpacing="0.05em" textAnchor="middle" x="430" y="93">WRAPFIT PRECISION CLOSURE</text>
                  <text fill="#64748b" fontFamily="JetBrains Mono" fontSize="7" textAnchor="middle" x="430" y="105">DEPTH: 18.00 mm • DIE CUT A-GRADE</text>
                  <line stroke="#ef4444" strokeDasharray="5 3" strokeWidth="2" x1="320" x2="430" y1="95" y2="135" />
                  <g>
                    <polygon fill="url(#dustFlapGradL)" points="310,185 240,150 230,190 310,210" stroke="#2563eb" strokeLinejoin="round" strokeWidth="1.6" />
                    <line stroke="#ef4444" strokeDasharray="3 3" strokeWidth="1.8" x1="310" x2="310" y1="185" y2="210" />
                    <line stroke="#f59e0b" strokeDasharray="2 2" strokeWidth="1.2" x1="240" x2="255" y1="150" y2="185" />
                    <text fill="#b45309" fontFamily="JetBrains Mono" fontSize="7" fontWeight="600" transform="rotate(-20 268 180)" x="268" y="180">DUST FLAP 45°</text>
                  </g>
                  <g>
                    <polygon fill="url(#dustFlapGradR)" points="550,185 620,150 630,190 550,210" stroke="#2563eb" strokeLinejoin="round" strokeWidth="1.6" />
                    <line stroke="#ef4444" strokeDasharray="3 3" strokeWidth="1.8" x1="550" x2="550" y1="185" y2="210" />
                    <line stroke="#f59e0b" strokeDasharray="2 2" strokeWidth="1.2" x1="620" x2="605" y1="150" y2="185" />
                    <text fill="#b45309" fontFamily="JetBrains Mono" fontSize="7" fontWeight="600" transform="rotate(20 565 172)" x="565" y="172">DUST FLAP 45°</text>
                  </g>
                </g>
                <g filter="url(#cadShadow)">
                  <polygon fill="url(#interiorCavityGrad)" points="310,190 430,145 550,190 430,235" stroke="#94a3b8" strokeWidth="1.4" />
                  <polygon fill="#cbd5e1" opacity="0.6" points="314,192 430,149 546,192 430,231" />
                  <polygon fill="url(#bodySideGrad)" points="310,190 430,235 430,425 310,380" stroke="#2563eb" strokeLinejoin="round" strokeWidth="1.8" />
                  <polygon fill="url(#glueHatch)" points="310,190 282,202 282,368 310,380" stroke="#0284c7" strokeLinejoin="round" strokeWidth="1.6" />
                  <line stroke="#ef4444" strokeDasharray="4 3" strokeWidth="1.8" x1="310" x2="310" y1="190" y2="380" />
                  <text fill="#0369a1" fontFamily="JetBrains Mono" fontSize="8" fontWeight="700" letterSpacing="0.1em" transform="rotate(-90 290 295)" x="290" y="295">GLUE TAB 15mm</text>
                  <polygon fill="url(#bodyFrontGrad)" points="430,235 550,190 550,380 430,425" stroke="#2563eb" strokeLinejoin="round" strokeWidth="2" />
                  <line stroke="#ef4444" strokeDasharray="5 3" strokeWidth="2.2" x1="430" x2="430" y1="235" y2="425" />
                  <g transform="matrix(0.866 0.38 -0.15 0.95 440 230)">
                    <text fill="#004ac6" fontFamily="Plus Jakarta Sans" fontSize="7" fontWeight="700" letterSpacing="0.18em" x="18" y="24">WRAPFIT ATELIER</text>
                    <text fill="#0f172a" fontFamily="Playfair Display" fontSize="14" fontWeight="600" letterSpacing="-0.02em" x="18" y="42">High Precision</text>
                    <text fill="#475569" fontFamily="Playfair Display" fontSize="10.5" fontStyle="italic" x="18" y="55">Packaging CAD Series</text>
                    <line stroke="#e2e8f0" strokeWidth="0.8" x1="18" x2="100" y1="62" y2="62" />
                    <text fill="#64748b" fontFamily="JetBrains Mono" fontSize="5.8" x="18" y="74">SPEC: ECMA A20 / AUTO-BOTTOM</text>
                    <text fill="#64748b" fontFamily="JetBrains Mono" fontSize="5.8" x="18" y="83">CALIPER TOLERANCE: ±0.12 mm</text>
                    <text fill="#64748b" fontFamily="JetBrains Mono" fontSize="5.8" x="18" y="92">SUBSTRATE: 350 GSM C1S IVORY</text>
                  </g>
                </g>
                <g className="floating-bottom" filter="url(#partGlow)">
                  <polygon fill="url(#snapBottomGrad1)" points="340,460 430,495 390,535 320,490" stroke="#059669" strokeLinejoin="round" strokeWidth="1.8" />
                  <line stroke="#ef4444" strokeDasharray="3 3" strokeWidth="1.5" x1="340" x2="390" y1="460" y2="535" />
                  <polygon fill="url(#snapBottomGrad2)" points="430,495 520,460 540,490 470,535" stroke="#059669" strokeLinejoin="round" strokeWidth="1.8" />
                  <line stroke="#ef4444" strokeDasharray="3 3" strokeWidth="1.5" x1="520" x2="470" y1="460" y2="535" />
                  <path d="M 390,535 L 430,550 L 470,535" fill="none" stroke="#047857" strokeLinejoin="round" strokeWidth="2.4" />
                </g>
              </svg>
            </div>

            {/* Bottom Floating Legend */}
            <div className="p-2.5 px-4 flex items-center justify-between bg-white/80 backdrop-blur-md rounded-2xl border border-outline-variant/30 shadow-xs">
              <div className="flex items-center gap-4 text-xs font-medium text-on-surface-variant flex-wrap">
                <span className="flex items-center gap-1.5">
                  <span className="w-3.5 h-[2.5px] bg-[#2563eb] rounded-full" />
                  <span className="font-cad-dimension text-[11px]">Đường Cắt (Cut Line)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3.5 h-[2px] border-b-2 border-dashed border-[#ef4444]" />
                  <span className="font-cad-dimension text-[11px]">Đường Cấn (Crease)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-sky-200 border border-sky-400 flex items-center justify-center text-[7px] text-sky-800 font-bold">///</span>
                  <span className="font-cad-dimension text-[11px]">Vùng Keo Dán</span>
                </span>
              </div>
            </div>
          </section>

          {/* Right Specs Column */}
          <aside className="w-[310px] shrink-0 h-full flex flex-col justify-between gap-3">
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between px-1">
                <span className="font-headline-sm text-xs font-bold tracking-wider text-on-surface-variant uppercase">
                  Chỉ số định hình
                </span>
                <span className="text-[11px] font-semibold text-secondary bg-secondary-container/80 px-2.5 py-0.5 rounded-full">
                  Tối ưu đóng gói
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-white shadow-sm flex items-center justify-between border border-surface-container-high/60">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-blue-50 text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[24px]">layers</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide block">Định lượng giấy</span>
                    <span className="font-headline-sm text-lg font-bold text-slate-900 leading-tight">300 — 400</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">GSM</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-white shadow-sm flex items-center justify-between border border-surface-container-high/60">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[24px]">weight</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide block">Tải trọng đáy</span>
                    <span className="font-headline-sm text-lg font-bold text-slate-900 leading-tight">1.50</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg">kg Max</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-white shadow-sm flex items-center justify-between border border-surface-container-high/60">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[24px]">lock_open</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide block">Công nghệ khóa</span>
                    <span className="font-headline-sm text-lg font-bold text-slate-900 leading-tight">Zero-Glue</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-lg">Tự Chốt</span>
              </div>
            </div>

            {/* Bé Gói Advisor Card */}
            <div className="p-3.5 rounded-3xl bg-gradient-to-br from-secondary-container/40 via-white to-surface-container-low shadow-sm flex items-center gap-3 border border-secondary/20">
              <div className="w-12 h-12 rounded-2xl bg-white shadow-xs overflow-hidden flex items-center justify-center shrink-0">
                <img alt="Bé Gói" className="w-full h-full object-contain p-1" src="/mascots/goi.webp" />
              </div>
              <div className="flex flex-col pr-1">
                <span className="text-xs font-bold text-secondary flex items-center gap-1">
                  <span>Bé Gói CAD Advisor</span>
                  <span className="material-symbols-outlined text-[14px]">verified</span>
                </span>
                <p className="text-[11px] text-on-surface-variant font-medium leading-snug mt-0.5">
                  Dung sai dao bế tự động bù trừ caliper ±0.12mm.
                </p>
              </div>
            </div>

            {/* Bottom Action Step 2 Button */}
            <Link
              href="/editor/step-2"
              className="w-full h-12 rounded-2xl bg-primary hover:bg-primary-container text-on-primary font-label-ui text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-98"
            >
              <span>Tiếp Tục Bước 2: Kích Thước</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </aside>
        </div>
      </main>

      <MainFooter />
    </div>
  );
}

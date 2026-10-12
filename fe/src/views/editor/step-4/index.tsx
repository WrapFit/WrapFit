'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function Step4FitCheckPage() {
  const [activeInspectMode, setActiveInspectMode] = useState<'dieline' | '3d' | 'fea'>('dieline');
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#1C1917] flex flex-col justify-between font-['Plus_Jakarta_Sans'] select-none">
      {/* ================= 1. IMAGE 4 TOP HEADER BAR ================= */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-stone-200">
        <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          {/* Left: Back Link & Studio Version */}
          <div className="flex items-center gap-3">
            <Link
              href="/editor/step-3"
              className="flex items-center gap-1.5 text-xs font-semibold text-stone-700 hover:text-stone-900 group"
            >
              <span className="material-symbols-outlined text-[16px] group-hover:-translate-x-0.5 transition-transform">
                arrow_back
              </span>
              <span>Quay lại</span>
            </Link>
            <span className="text-neutral-300">|</span>
            <span className="font-['Playfair_Display'] font-bold text-sm text-neutral-900">
              WRAPFIT Studio v4.2
            </span>
          </div>

          {/* Center: Stepper Breadcrumbs with Active Step 4 */}
          <nav className="flex items-center gap-1.5 p-1 bg-stone-100/90 rounded-full border border-stone-200 text-xs font-semibold">
            <Link
              href="/editor/step-1"
              className="px-3 py-1 rounded-full text-stone-500 hover:text-stone-900 flex items-center gap-1"
            >
              <span className="text-emerald-600 font-bold">✓</span>
              <span>1. Mẫu Hộp</span>
            </Link>
            <Link
              href="/editor/step-2"
              className="px-3 py-1 rounded-full text-stone-500 hover:text-stone-900 flex items-center gap-1"
            >
              <span className="text-emerald-600 font-bold">✓</span>
              <span>2. Kích Thước</span>
            </Link>
            <Link
              href="/editor/step-3"
              className="px-3 py-1 rounded-full text-stone-500 hover:text-stone-900 flex items-center gap-1"
            >
              <span className="text-emerald-600 font-bold">✓</span>
              <span>3. Phối Cảnh 3D</span>
            </Link>
            <span className="px-4 py-1 rounded-full bg-blue-600 text-white font-bold shadow-xs flex items-center gap-1">
              <span>●</span>
              <span>4. FitCheck™ &amp; Xuất File</span>
            </span>
          </nav>

          {/* Right: Certified 100/100 Pass & BOBST Die Spec */}
          <div className="flex items-center gap-2.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold font-['JetBrains_Mono']">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>✓ 100/100 PASS</span>
            </div>

            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 border border-stone-200 text-stone-600 font-['JetBrains_Mono'] text-[11px] font-semibold">
              <span>BOBST 106-PER | MM</span>
            </div>
          </div>
        </div>
      </header>

      {/* ================= 2. IMAGE 4 SUB-BAR (MODES, ECMA STANDARD & SPECS) ================= */}
      <section className="bg-white/90 backdrop-blur-md border-b border-stone-200 px-4 sm:px-6 py-2.5 z-40">
        <div className="w-full max-w-[1720px] mx-auto flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          {/* Left: 3 Inspection Mode Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveInspectMode('dieline')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activeInspectMode === 'dieline'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              Bản Vẽ Dieline 1:1
            </button>
            <button
              type="button"
              onClick={() => setActiveInspectMode('3d')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activeInspectMode === '3d'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              Mô Phỏng Gập 3D
            </button>
            <button
              type="button"
              onClick={() => setActiveInspectMode('fea')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activeInspectMode === 'fea'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              Kiểm Tra Nén Lực FEA
            </button>
          </div>

          {/* Center: Standard Lock Code */}
          <div className="flex items-center gap-2 font-['JetBrains_Mono'] text-xs font-bold text-neutral-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>• ECMA A20.20 Standard Locked 360 × 240 × 80 mm</span>
          </div>

          {/* Right: Technical Paper Specs & Dieline Legend */}
          <div className="flex items-center gap-3 overflow-x-auto text-[11px] font-['JetBrains_Mono'] text-stone-600">
            <span className="px-2 py-0.5 rounded bg-stone-100 font-semibold">Ivory FBB 350 GSM</span>
            <span className="px-2 py-0.5 rounded bg-stone-100 font-semibold">Caliper 0.45mm</span>
            <span className="px-2 py-0.5 rounded bg-stone-100 font-semibold">Dung sai ±0.12</span>

            <div className="flex items-center gap-2.5 pl-2 border-l border-stone-200">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-0.5 bg-red-500 rounded" />
                <span>Cắt (Cut)</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-0.5 border-t border-dashed border-blue-600" />
                <span>Cấn (Crease)</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-1 bg-emerald-500/30 border border-emerald-500 rounded-2xs" />
                <span>Mép Keo (15mm)</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-0.5 border-t border-dotted border-emerald-600" />
                <span>Tràn Lề (2mm)</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 3. CENTRAL CAD INSPECTION CANVAS & RIGHT SIDEBAR ================= */}
      <main className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 py-5 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch min-h-[580px]">
        {/* LEFT/CENTER (8 COLS): 1:1 CAD DIELINE INSPECTION STAGE */}
        <section className="lg:col-span-8 bg-white rounded-3xl border border-stone-200/90 shadow-[0_4px_24px_rgba(28,25,23,0.03)] p-6 flex flex-col justify-between relative overflow-hidden bg-[#FAF8F5]">
          {/* Subtle CAD Background Grid */}
          <div
            className="absolute inset-0 opacity-[0.05] pointer-events-none"
            style={{
              backgroundSize: '24px 24px',
              backgroundImage:
                'linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)',
            }}
          />

          {/* CAD Technical Annotation Callouts */}
          <div className="absolute top-4 left-6 z-10 flex flex-wrap gap-2">
            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 font-['JetBrains_Mono'] text-[10px] font-bold shadow-2xs">
              ✓ DAO BẾ CHUẨN ±0.125mm PASS
            </span>
            <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-900 border border-blue-300 font-['JetBrains_Mono'] text-[10px] font-bold shadow-2xs">
              ✓ GÂN CẤN 1.5pt 100% GẬP MƯỢT
            </span>
            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 font-['JetBrains_Mono'] text-[10px] font-bold shadow-2xs">
              ✓ MÉP KEO 15.0mm (PASS)
            </span>
            <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-['JetBrains_Mono'] text-[10px] font-bold shadow-2xs">
              ✓ SAFE INSET 3.2mm OK
            </span>
          </div>

          {/* Master 1:1 Vector CAD Inspection Graphic */}
          <div
            className="flex-1 w-full flex items-center justify-center my-6 relative transition-transform duration-200"
            style={{ transform: `scale(${zoomLevel / 100})` }}
          >
            <svg
              width="640"
              height="380"
              viewBox="0 0 640 380"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="drop-shadow-md select-none"
            >
              {/* Outer Bleed Margin */}
              <rect
                x="30"
                y="30"
                width="580"
                height="320"
                rx="4"
                stroke="#10B981"
                strokeWidth="1.2"
                strokeDasharray="3 3"
                opacity="0.75"
              />

              {/* Main Knife Cut Line */}
              <path
                d="M 60 60 L 200 60 L 210 35 L 430 35 L 440 60 L 580 60 L 580 170 L 595 180 L 595 200 L 580 210 L 580 320 L 440 320 L 430 345 L 210 345 L 200 320 L 60 320 L 60 210 L 45 200 L 45 180 L 60 170 Z"
                fill="#FFFFFF"
                stroke="#EF4444"
                strokeWidth="2"
              />

              {/* Crease Lines */}
              <g stroke="#2563EB" strokeWidth="1.6" strokeDasharray="5 4">
                <line x1="200" y1="60" x2="200" y2="320" />
                <line x1="440" y1="60" x2="440" y2="320" />
                <line x1="200" y1="140" x2="440" y2="140" />
                <line x1="200" y1="240" x2="440" y2="240" />
              </g>

              {/* Safe Margin Inset Area */}
              <rect
                x="215"
                y="155"
                width="210"
                height="70"
                rx="6"
                fill="#F59E0B"
                fillOpacity="0.08"
                stroke="#F59E0B"
                strokeWidth="1.2"
                strokeDasharray="3 2"
              />

              {/* Glue Tab with Cross Hatch */}
              <g id="glue-tab">
                <rect x="45" y="170" width="15" height="40" fill="#059669" fillOpacity="0.15" />
                <text x="52" y="193" textAnchor="middle" fill="#059669" fontFamily="JetBrains Mono" fontSize="7" fontWeight="bold" transform="rotate(-90 52 193)">
                  GLUE 15mm
                </text>
              </g>

              {/* Central Text Spec */}
              <text x="320" y="185" textAnchor="middle" fill="#1C1917" fontFamily="Playfair Display" fontSize="12" fontWeight="bold">
                ECMA A20.20 INDUSTRIAL STANDARD
              </text>
              <text x="320" y="202" textAnchor="middle" fill="#2563EB" fontFamily="JetBrains Mono" fontSize="8" fontWeight="bold">
                DIE COMPLIANCE: 100% OFFSET PROOF READY
              </text>

              {/* Dynamic Dimension Callipers */}
              <g id="dimension-callipers" stroke="#94A3B8" strokeWidth="1">
                <line x1="200" y1="50" x2="440" y2="50" />
                <line x1="200" y1="46" x2="200" y2="54" />
                <line x1="440" y1="46" x2="440" y2="54" />
                <text x="320" y="47" textAnchor="middle" fill="#64748B" fontFamily="JetBrains Mono" fontSize="8">
                  Length: 240.00 mm
                </text>
              </g>
            </svg>
          </div>

          {/* Floating Zoom & Scale Bar on Bottom Left */}
          <div className="flex items-center justify-between z-10 pt-2 border-t border-stone-200">
            <div className="flex items-center gap-2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full border border-stone-200 shadow-2xs text-xs font-['JetBrains_Mono']">
              <button
                type="button"
                onClick={() => setZoomLevel((prev) => Math.max(50, prev - 10))}
                className="hover:text-blue-600 font-bold px-1"
              >
                −
              </button>
              <span className="font-semibold text-stone-700">{zoomLevel}%</span>
              <button
                type="button"
                onClick={() => setZoomLevel((prev) => Math.min(200, prev + 10))}
                className="hover:text-blue-600 font-bold px-1"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(100)}
                className="text-stone-400 hover:text-stone-700 text-[10px] pl-2 border-l border-stone-200"
              >
                Fit to Screen
              </button>
            </div>

            <span className="font-['JetBrains_Mono'] text-xs text-stone-500">
              X: 360.00 mm | Y: 240.00 mm | Z: 80.00 mm (Caliper: 0.45mm)
            </span>
          </div>
        </section>

        {/* RIGHT SIDEBAR (4 COLS): FITCHECK™ CERTIFIED INSPECTION REPORT */}
        <aside className="lg:col-span-4 bg-white rounded-3xl border border-stone-200/90 shadow-[0_4px_24px_rgba(28,25,23,0.04)] p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-5">
            {/* Certificate Header with Gold Medal */}
            <div className="flex items-center justify-between pb-4 border-b border-stone-200">
              <div>
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-['JetBrains_Mono'] text-xs font-bold">
                  FITCHECK™ CERTIFIED
                </span>
                <h3 className="font-['Playfair_Display'] text-xl font-bold text-neutral-900 mt-2">
                  Chứng Chỉ Xuất Xưởng
                </h3>
                <p className="text-xs text-emerald-700 font-semibold font-['JetBrains_Mono'] mt-0.5">
                  100/100 PASS • SẴN SÀNG CHẾ BẢN
                </p>
              </div>

              {/* Gold Medal Icon */}
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-amber-400 to-amber-200 text-neutral-900 flex items-center justify-center font-bold shadow-md shrink-0 border border-amber-300">
                <span className="material-symbols-outlined text-3xl text-amber-900">verified</span>
              </div>
            </div>

            {/* Mascot Approval Card */}
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-start gap-3">
              <img
                src="/mascots/goi.webp"
                alt="Bé Gói"
                className="w-10 h-10 object-contain rounded-full bg-white p-1 border border-emerald-300 shrink-0"
              />
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-emerald-950">Bé Gói Đã Duyệt!</span>
                <p className="text-[11px] text-emerald-900 leading-snug">
                  &ldquo;Tất cả 12 thông số cơ khí đạt chuẩn ISO 12647-2. Không có va chạm nếp gấp hoặc cắt phạm vùng an toàn!&rdquo;
                </p>
              </div>
            </div>

            {/* 3 Detailed Technical Criteria Cards */}
            <div className="space-y-3">
              {/* Criterion 1: Khớp mộng & mép keo */}
              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/90 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-xs text-neutral-900">
                    Khớp Mộng &amp; Mép Keo (Glue Tab)
                  </p>
                  <p className="text-[11px] text-stone-500">Độ rộng đạt chuẩn máy dán tự động</p>
                </div>
                <span className="font-['JetBrains_Mono'] text-xs font-bold text-emerald-700">
                  15.0 mm • PASS
                </span>
              </div>

              {/* Criterion 2: Vùng an toàn & tràn lề */}
              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/90 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-xs text-neutral-900">
                    Vùng An Toàn &amp; Tràn Lề (Safe/Bleed)
                  </p>
                  <p className="text-[11px] text-stone-500">Bleed 2.0mm • Safe Inset 3.5mm</p>
                </div>
                <span className="font-['JetBrains_Mono'] text-xs font-bold text-emerald-700">
                  PASS
                </span>
              </div>

              {/* Criterion 3: Độ chịu tải đáy */}
              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/90 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-xs text-neutral-900">
                    Độ Chịu Tải Đáy (Load Capacity)
                  </p>
                  <p className="text-[11px] text-stone-500">Mục tiêu &gt;2.0kg an toàn</p>
                </div>
                <span className="font-['JetBrains_Mono'] text-xs font-bold text-emerald-700">
                  2.8 kg • PASS
                </span>
              </div>
            </div>
          </div>

          {/* Audit Hash & Certification Tag */}
          <div className="p-3 rounded-2xl bg-stone-100 border border-stone-200 flex items-center justify-between text-[11px] font-['JetBrains_Mono'] text-stone-600">
            <span>Mã: WPF-2026-ECMA-A20</span>
            <span className="font-bold text-emerald-800">ISO 12647-2</span>
          </div>
        </aside>
      </main>

      {/* ================= 4. IMAGE 4 BOTTOM NAVIGATION DOCK ================= */}
      <footer className="sticky bottom-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200 p-4 px-6 shadow-sm">
        <div className="w-full max-w-[1720px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Left: Cryptographic Verification Stamp */}
          <div className="flex items-center gap-2 font-['JetBrains_Mono'] text-xs text-stone-500">
            <span className="material-symbols-outlined text-[16px] text-emerald-600">lock</span>
            <span>SHA-256 Verified Signature: e82f3a...91b0c</span>
          </div>

          {/* Center & Right Actions */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="px-4 py-2 rounded-full border border-stone-300 hover:bg-stone-50 text-neutral-800 text-xs font-semibold transition-all shadow-2xs"
            >
              Tải File .DXF / CAD
            </button>

            <button
              type="button"
              className="px-4 py-2 rounded-full border border-stone-300 hover:bg-stone-50 text-neutral-800 text-xs font-semibold transition-all shadow-2xs"
            >
              Tải PDF Chế Bản Offset
            </button>

            <Link
              href="/editor/export"
              className="px-6 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 active:scale-95"
            >
              <span>Chuyển Sang Xưởng In &amp; Mẫu Thật</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

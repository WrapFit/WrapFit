'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function EditorExportPage() {
  const [activeLayer, setActiveLayer] = useState<'all' | 'cut' | 'crease'>('all');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText('https://wrapfit.vn/unbox/WF-2024-C92');
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleDownload = (formatName: string) => {
    const element = document.createElement('a');
    const file = new Blob([`WrapFit CAD Export: ${formatName} for WF-2024-C92`], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `WF-2024-C92_Dieline.${formatName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#1C1917] font-['Plus_Jakarta_Sans'] flex flex-col justify-between relative overflow-x-hidden select-none">
      {/* Ambient Gradient Background Glows */}
      <div className="fixed -top-40 -left-40 w-96 h-96 bg-amber-200/20 rounded-full blur-3xl pointer-events-none z-0" />
      <div className="fixed -bottom-32 -right-32 w-[32rem] h-[32rem] bg-blue-100/30 rounded-full blur-3xl pointer-events-none z-0" />

      {/* ================= 1. IMAGE 5 STUDIO FLOATING HEADER ================= */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-stone-200">
        <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          {/* Left: Back Button & Project ID / Ready Status */}
          <div className="flex items-center gap-3">
            <Link
              href="/editor/step-4"
              className="w-8 h-8 rounded-full border border-stone-200 hover:bg-stone-100 flex items-center justify-center text-stone-700 transition-colors"
              title="Quay lại Bước 4: Kiểm Định FitCheck™"
            >
              <span className="material-symbols-outlined text-[17px]">arrow_back</span>
            </Link>

            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-7 h-7 rounded-lg bg-[#122e20] text-white flex items-center justify-center font-bold text-xs tracking-wider group-hover:bg-[#1a3f2c] transition-colors">
                W
              </div>
              <span className="font-['Playfair_Display'] font-bold text-base text-neutral-900 tracking-tight">
                WrapFit
              </span>
            </Link>

            <span className="text-neutral-300">|</span>

            <div className="flex items-center gap-2">
              <span className="font-['JetBrains_Mono'] text-xs text-stone-500 font-semibold">
                WF-2024-C92
              </span>
              <span className="text-xs font-bold text-neutral-900 hidden sm:inline">
                Hộp Quà Nam Châm 22K
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-['JetBrains_Mono'] text-[10px] font-bold border border-emerald-200">
                Ready
              </span>
            </div>
          </div>

          {/* Center: Layer Selector Pills [Toàn bộ] [Dao bế] [Nếp cấn] */}
          <div className="flex items-center gap-1 p-1 bg-stone-100/90 rounded-full border border-stone-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveLayer('all')}
              className={`px-3 py-1 rounded-full text-xs transition-all ${
                activeLayer === 'all'
                  ? 'bg-neutral-900 text-white font-bold shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Toàn bộ
            </button>
            <button
              type="button"
              onClick={() => setActiveLayer('cut')}
              className={`px-3 py-1 rounded-full text-xs transition-all ${
                activeLayer === 'cut'
                  ? 'bg-neutral-900 text-white font-bold shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Dao bế
            </button>
            <button
              type="button"
              onClick={() => setActiveLayer('crease')}
              className={`px-3 py-1 rounded-full text-xs transition-all ${
                activeLayer === 'crease'
                  ? 'bg-neutral-900 text-white font-bold shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Nếp cấn
            </button>
          </div>

          {/* Right: Notifications & Pro User Avatar */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="w-8 h-8 rounded-full border border-stone-200 hover:bg-stone-100 flex items-center justify-center text-stone-600 transition-colors"
              title="Thông báo"
            >
              <span className="material-symbols-outlined text-[18px]">notifications</span>
            </button>

            <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-900 font-bold text-xs flex items-center justify-center">
              PRO
            </div>
          </div>
        </div>
      </header>

      {/* ================= 2. TWO BALANCED BENTO CARDS (IMAGE 5) ================= */}
      <main className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 py-6 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch min-h-[520px] z-10">
        {/* LEFT CARD (7 COLS): BẢN VẼ DIELINE CƠ KHÍ */}
        <section className="lg:col-span-7 bg-white/90 backdrop-blur-xl rounded-[32px] shadow-[0_16px_48px_rgba(0,0,0,0.03)] p-6 flex flex-col justify-between relative overflow-hidden border border-[#e8ded0]">
          {/* Card Header Row */}
          <div className="flex items-center justify-between z-10 pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
              <span className="text-xs font-bold tracking-tight text-neutral-900">
                Bản Vẽ Dieline Cơ Khí
              </span>
              <span className="text-neutral-300 text-xs">/</span>
              <span className="font-['JetBrains_Mono'] text-[11px] text-stone-500 font-semibold">
                420.00 × 297.00mm
              </span>
            </div>

            <div className="flex items-center gap-2 font-['JetBrains_Mono'] text-[11px] text-stone-600">
              <span className="bg-stone-100 px-2.5 py-1 rounded-full">Caliper: 0.42mm</span>
              <span className="bg-stone-100 px-2.5 py-1 rounded-full font-bold text-neutral-900">
                Tỉ lệ 1:1 CAD
              </span>
            </div>
          </div>

          {/* Central Technical CAD Dieline SVG Canvas */}
          <div className="flex-1 w-full relative flex items-center justify-center my-4 min-h-[340px]">
            {/* Fine Grid Background */}
            <div
              className="absolute inset-0 opacity-[0.04] pointer-events-none"
              style={{
                backgroundSize: '24px 24px',
                backgroundImage:
                  'linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)',
              }}
            />

            <svg
              className="w-full h-full max-h-[360px] drop-shadow-sm select-none"
              fill="none"
              viewBox="0 0 500 300"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Bleed Guide */}
              {(activeLayer === 'all' || activeLayer === 'cut') && (
                <rect
                  x="40"
                  y="30"
                  width="420"
                  height="240"
                  rx="3"
                  stroke="#10B981"
                  strokeWidth="1.2"
                  strokeDasharray="2 3"
                  opacity="0.75"
                />
              )}

              {/* Red Outer Cut Contour Line */}
              {(activeLayer === 'all' || activeLayer === 'cut') && (
                <path
                  d="M 60 50 L 160 50 L 170 35 L 330 35 L 340 50 L 440 50 L 440 130 L 455 140 L 455 160 L 440 170 L 440 250 L 340 250 L 330 265 L 170 265 L 160 250 L 60 250 L 60 170 L 45 160 L 45 140 L 60 130 Z"
                  fill="#FAFAF9"
                  fillOpacity="0.4"
                  stroke="#EF4444"
                  strokeWidth="1.6"
                />
              )}

              {/* Blue Crease Score Lines */}
              {(activeLayer === 'all' || activeLayer === 'crease') && (
                <g stroke="#2563EB" strokeWidth="1.4" strokeDasharray="5 4">
                  <line x1="160" y1="50" x2="160" y2="250" />
                  <line x1="340" y1="50" x2="340" y2="250" />
                  <line x1="160" y1="110" x2="340" y2="110" />
                  <line x1="160" y1="190" x2="340" y2="190" />
                </g>
              )}

              {/* Hot Foil Safe Zone */}
              <rect
                x="200"
                y="130"
                width="100"
                height="40"
                rx="4"
                fill="#D97706"
                fillOpacity="0.12"
                stroke="#F59E0B"
                strokeWidth="1"
              />
              <text
                x="217"
                y="154"
                fill="#B45309"
                fontFamily="'JetBrains Mono', monospace"
                fontSize="9"
                fontWeight="500"
                letterSpacing="0.05em"
              >
                HOT FOIL 22K
              </text>
              <text
                x="70"
                y="153"
                fill="#A8A29E"
                fontFamily="'JetBrains Mono', monospace"
                fontSize="8"
              >
                Flap 15mm
              </text>
            </svg>

            <span className="absolute bottom-1 right-2 font-['JetBrains_Mono'] text-[10px] text-stone-400">
              X: 420.00 / Y: 297.00mm
            </span>
            <span className="absolute top-1 left-2 font-['JetBrains_Mono'] text-[10px] text-stone-400">
              OFFSET +3.0mm BLEED
            </span>
          </div>

          {/* Dieline Legend Footer */}
          <div className="flex items-center justify-between pt-3 text-[11px] font-['JetBrains_Mono'] text-stone-500 border-t border-stone-200">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 bg-red-500 rounded" />
                <span>Dao bế (Cut)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 border-t border-dashed border-blue-600" />
                <span>Nếp cấn (Crease)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-2xs bg-amber-500/20 border border-amber-500/50" />
                <span>Ép kim Safe</span>
              </span>
            </div>
            <span className="text-stone-400 hidden sm:inline">FOGRA39 100%</span>
          </div>
        </section>

        {/* RIGHT CARD (5 COLS): PHYGITAL QR UNBOXING */}
        <section className="lg:col-span-5 bg-white/90 backdrop-blur-xl rounded-[32px] shadow-[0_16px_48px_rgba(0,0,0,0.03)] p-6 flex flex-col justify-between relative overflow-hidden border border-[#e8ded0]">
          {/* Card Header */}
          <div className="flex items-center justify-between z-10 pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-xs font-bold tracking-tight text-neutral-900">
                Phygital QR Unboxing
              </span>
            </div>
            <span className="font-['JetBrains_Mono'] text-[11px] text-stone-400">
              Mặt trong nắp hộp
            </span>
          </div>

          {/* QR Unbox Widget */}
          <div className="flex-1 flex items-center justify-center py-4">
            <div className="w-full max-w-[320px] bg-gradient-to-b from-white to-[#F9F7F4] rounded-[28px] p-6 shadow-[0_16px_40px_rgba(0,0,0,0.04)] flex flex-col items-center text-center relative border border-stone-200/60">
              <div className="absolute -top-10 -right-10 w-28 h-28 bg-amber-200/25 rounded-full blur-2xl pointer-events-none" />

              <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-3 text-neutral-800 border border-stone-100">
                <span className="material-symbols-outlined text-2xl text-emerald-800">package_2</span>
              </div>

              <h3 className="font-serif font-bold text-sm text-neutral-900 leading-tight">
                Mở Hộp Độc Quyền
              </h3>
              <p className="text-xs text-stone-400 mt-0.5 font-['JetBrains_Mono']">
                Maison Royale • 2024
              </p>

              {/* QR Code Container */}
              <div className="my-4 p-4 bg-white rounded-2xl shadow-sm flex flex-col items-center border border-stone-100">
                <div className="w-24 h-24 flex items-center justify-center">
                  <svg className="w-full h-full text-neutral-900" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm10-2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm14 0h4v2h-4v-2zm-4 0h2v4h-2v-4zm2 2h2v4h-2v-4zm2 2h2v2h-2v-2zm-6-4h2v2h-2v-2z" />
                  </svg>
                </div>
                <span className="font-['JetBrains_Mono'] text-[9px] text-stone-400 mt-2 uppercase tracking-wider">
                  Quét xem AR &amp; Lời chúc
                </span>
              </div>

              {/* Copy QR Link Button */}
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-neutral-900 text-white text-[11px] font-semibold hover:bg-neutral-800 active:scale-95 transition-all shadow-sm"
              >
                <span className="material-symbols-outlined text-[14px]">
                  {copiedLink ? 'check' : 'link'}
                </span>
                <span>{copiedLink ? 'Đã sao chép Link!' : 'Sao chép Link Mở Hộp'}</span>
              </button>
            </div>
          </div>

          {/* Mascot Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-stone-200">
            <div className="flex items-center gap-2.5">
              <img
                src="/mascots/goi.webp"
                alt="Mascot Bé Gói"
                className="w-7 h-7 object-contain rounded-full bg-emerald-50 p-0.5 border border-emerald-200"
              />
              <span className="text-xs text-stone-600 font-medium">
                Bé Gói: Dung sai chuẩn 100%
              </span>
            </div>
            <span className="font-['JetBrains_Mono'] text-[10px] text-stone-400">#89X-CAD</span>
          </div>
        </section>
      </main>

      {/* ================= 3. IMAGE 5 BOTTOM ACTION DOCK ================= */}
      <footer className="sticky bottom-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200 p-4 px-6 shadow-sm">
        <div className="w-full max-w-[1720px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Left: Download Action & Format Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => handleDownload('ZIP')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#122e20] hover:bg-[#1a3f2c] text-white text-xs font-semibold active:scale-95 transition-all shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              <span>Xuất File Nhà In (.ZIP)</span>
            </button>

            <button
              type="button"
              onClick={() => handleDownload('PDF')}
              className="px-3.5 py-1.5 rounded-full text-xs font-['JetBrains_Mono'] font-medium text-neutral-700 hover:bg-stone-100 border border-stone-200 transition-all"
            >
              PDF/X-4
            </button>

            <button
              type="button"
              onClick={() => handleDownload('DXF')}
              className="px-3.5 py-1.5 rounded-full text-xs font-['JetBrains_Mono'] font-medium text-neutral-700 hover:bg-stone-100 border border-stone-200 transition-all"
            >
              DXF 1:1
            </button>

            <button
              type="button"
              onClick={() => handleDownload('USDZ')}
              className="px-3.5 py-1.5 rounded-full text-xs font-['JetBrains_Mono'] font-medium text-neutral-700 hover:bg-stone-100 border border-stone-200 transition-all"
            >
              USDZ / 3D
            </button>
          </div>

          {/* Right: Proceed to Checkout / Print Shop */}
          <Link
            href="/checkout/step-1"
            className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold active:scale-95 transition-all shadow-md hover:shadow-lg"
          >
            <span>Tiến Hành Đặt In Gia Công</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
        </div>
      </footer>
    </div>
  );
}

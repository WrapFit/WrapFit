'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { MainFooter } from '@/components/layout';
import { InteractiveFoldingBox3D, BoxMaterialTheme } from '@/features/studio/components/three/InteractiveFoldingBox3D';

export default function Step2DimensionsPage() {
  // Parametric Dimensions in mm
  const [length, setLength] = useState<number>(180);
  const [width, setWidth] = useState<number>(120);
  const [height, setHeight] = useState<number>(65);
  const [weight, setWeight] = useState<number>(350);

  // Mode: Core Product vs Finished Outer Box
  const [measurementMode, setMeasurementMode] = useState<'product' | 'box'>('product');

  // Paper selection
  const [selectedPaper, setSelectedPaper] = useState<'ivory' | 'kraft' | 'carton'>('kraft');
  const [foldProgress, setFoldProgress] = useState<number>(0.95);

  // Camera view angle presets
  const [cameraAngle, setCameraAngle] = useState<'iso' | 'top' | 'front'>('iso');

  // Caliper & K-Factor compensation math
  const paperSpec = useMemo(() => {
    switch (selectedPaper) {
      case 'ivory':
        return { name: 'Ivory 300g', caliper: 0.38, compensation: 1.8, theme: 'ivory' as BoxMaterialTheme };
      case 'carton':
        return { name: 'E-Flute Carton', caliper: 1.50, compensation: 3.2, theme: 'gold_foil' as BoxMaterialTheme };
      case 'kraft':
      default:
        return { name: 'Kraft 350g', caliper: 0.45, compensation: 2.5, theme: 'kraft' as BoxMaterialTheme };
    }
  }, [selectedPaper]);

  // Derived calculations
  const effectiveLength = measurementMode === 'product' ? length + paperSpec.compensation : length;
  const effectiveWidth = measurementMode === 'product' ? width + paperSpec.compensation : width;
  const effectiveHeight = measurementMode === 'product' ? height + paperSpec.compensation : height;

  const volumeMl = Math.round((length * width * height) / 1000);
  const dielineAreaCm2 = Math.round(((length * 2 + width * 2 + 15) * (height + width * 2 + 30)) / 100);

  const handleStep = (field: 'length' | 'width' | 'height', delta: number) => {
    if (field === 'length') setLength((prev) => Math.max(50, Math.min(450, prev + delta)));
    if (field === 'width') setWidth((prev) => Math.max(40, Math.min(350, prev + delta)));
    if (field === 'height') setHeight((prev) => Math.max(25, Math.min(250, prev + delta)));
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#1C1917] flex flex-col justify-between font-['Plus_Jakarta_Sans'] select-none">
      {/* ================= 1. LUXURY EDITORIAL TOP NAV HEADER ================= */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-stone-200">
        <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Left: Brand Identity & FitCheck Calibrated Pill */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-xl bg-[#122e20] text-white flex items-center justify-center font-bold text-sm tracking-wider shadow-xs group-hover:bg-[#1a3f2c] transition-colors">
                W
              </div>
              <span className="font-['Playfair_Display'] font-bold text-lg text-neutral-900 tracking-tight">
                WRAPFIT
              </span>
            </Link>

            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-['JetBrains_Mono'] font-bold text-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>FITCHECK™ CALIBRATED</span>
            </div>
          </div>

          {/* Center: Workflow Stage Breadcrumb Navigation Pills */}
          <nav className="hidden md:flex items-center gap-1 bg-stone-100/80 p-1 rounded-full border border-stone-200/90 text-xs font-semibold">
            <Link
              href="/dashboard/projects"
              className="px-3 py-1.5 rounded-full text-stone-600 hover:text-stone-900 transition-colors"
            >
              Dự Án
            </Link>
            <Link
              href="/dashboard/brand-kit"
              className="px-3 py-1.5 rounded-full text-stone-600 hover:text-stone-900 transition-colors"
            >
              Brand Kit
            </Link>
            <Link
              href="/editor/step-1"
              className="px-3 py-1.5 rounded-full text-stone-600 hover:text-stone-900 transition-colors"
            >
              1. Mẫu Hộp
            </Link>
            <span className="px-4 py-1.5 rounded-full bg-[#122e20] text-white font-bold shadow-xs">
              2. Kích Thước
            </span>
            <Link
              href="/editor/step-3"
              className="px-3 py-1.5 rounded-full text-stone-600 hover:text-stone-900 transition-colors"
            >
              3. 3D Studio
            </Link>
            <Link
              href="/editor/step-4"
              className="px-3 py-1.5 rounded-full text-stone-600 hover:text-stone-900 transition-colors"
            >
              4. Kiểm Định FitCheck
            </Link>
          </nav>

          {/* Right: Technical Scale Badge & Atelier Pro Avatar */}
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 border border-stone-200 text-[11px] font-['JetBrains_Mono'] text-stone-600">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>SCALE 1:1 mm</span>
            </div>

            <div className="flex items-center gap-2 pl-2 border-l border-stone-200">
              <div className="text-right hidden sm:block">
                <p className="text-[11px] font-bold text-neutral-900 leading-tight">Studio PACKAGING</p>
                <p className="text-[10px] font-['JetBrains_Mono'] text-emerald-700">ATELIER PRO</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-900 font-bold text-xs flex items-center justify-center border border-emerald-300">
                PRO
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ================= 2. TITLE BAR & STEPPER PROGRESS ================= */}
      <section className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 pt-6 pb-2">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-stone-200/80">
          <div>
            <div className="flex items-center gap-2 text-xs font-['JetBrains_Mono'] font-bold text-emerald-700 uppercase tracking-wider mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>• PARAMETRIC REAL-TIME 3D STUDIO</span>
            </div>
            <h1 className="font-['Playfair_Display'] text-2xl sm:text-3xl lg:text-4xl font-bold text-neutral-900 tracking-tight">
              Kích Thước &amp; Dung Sai Bao Bì
            </h1>
          </div>

          {/* Stepper Progress Badges */}
          <div className="flex items-center gap-2 overflow-x-auto text-xs font-semibold">
            <Link
              href="/editor/step-1"
              className="px-3.5 py-1.5 rounded-full bg-stone-100 text-stone-600 hover:text-stone-900 flex items-center gap-1.5 border border-stone-200/60"
            >
              <span className="text-emerald-600 font-bold">✓</span>
              <span>1. Mẫu Hộp</span>
            </Link>
            <span className="px-4 py-1.5 rounded-full bg-blue-600 text-white font-bold shadow-xs flex items-center gap-1.5">
              <span>•</span>
              <span>2. Kích Thước</span>
            </span>
            <Link
              href="/editor/step-3"
              className="px-3.5 py-1.5 rounded-full bg-stone-100/80 text-stone-400 hover:text-stone-700 border border-stone-200/60"
            >
              3. Phối Cảnh 3D
            </Link>
            <Link
              href="/editor/step-4"
              className="px-3.5 py-1.5 rounded-full bg-stone-100/80 text-stone-400 hover:text-stone-700 border border-stone-200/60"
            >
              4. FitCheck™
            </Link>
          </div>
        </div>
      </section>

      {/* ================= 3. CENTRAL 2-COLUMN WORKSPACE ================= */}
      <main className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 py-6 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN (5 COLS): PARAMETRIC CONTROLS & CALIPER SWATCHES */}
        <section className="lg:col-span-5 bg-white p-6 sm:p-7 rounded-3xl border border-stone-200/90 shadow-[0_4px_24px_rgba(28,25,23,0.03)] space-y-6">
          {/* Measurement Mode Segmented Switch */}
          <div>
            <div className="bg-stone-100 p-1 rounded-2xl flex items-center text-xs font-semibold border border-stone-200">
              <button
                type="button"
                onClick={() => setMeasurementMode('product')}
                className={`flex-1 py-2 rounded-xl text-center transition-all ${
                  measurementMode === 'product'
                    ? 'bg-white text-neutral-900 shadow-sm font-bold'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                Sản Phẩm Lõi
              </button>
              <button
                type="button"
                onClick={() => setMeasurementMode('box')}
                className={`flex-1 py-2 rounded-xl text-center transition-all ${
                  measurementMode === 'box'
                    ? 'bg-white text-neutral-900 shadow-sm font-bold'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                Hộp Thành Phẩm
              </button>
            </div>
            <p className="text-[11px] text-stone-500 mt-2 leading-relaxed">
              {measurementMode === 'product'
                ? 'Kích thước nhập vào sẽ tự động cộng dung sai cấn gập và bù hao caliper (+2.5mm).'
                : 'Kích thước phủ bì ngoài thực tế sau khi gập hộp hoàn chỉnh.'}
            </p>
          </div>

          {/* 3 Stepper Parameter Rows: L, W, H */}
          <div className="space-y-4 pt-2">
            {/* Chiều Dài (Length / X) */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-neutral-800">Chiều Dài (L) — X-Axis</span>
                <span className="font-['JetBrains_Mono'] text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  {length} mm
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleStep('length', -5)}
                  className="w-10 h-10 rounded-xl bg-stone-100 hover:bg-stone-200 text-neutral-800 font-bold text-lg flex items-center justify-center transition-colors active:scale-95"
                >
                  −
                </button>
                <div className="flex-1 h-10 bg-stone-50 border border-stone-200 rounded-xl flex items-center justify-center font-['JetBrains_Mono'] text-lg font-bold text-neutral-900">
                  {length} <span className="text-xs font-normal text-stone-400 ml-1">mm</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleStep('length', 5)}
                  className="w-10 h-10 rounded-xl bg-stone-100 hover:bg-stone-200 text-neutral-800 font-bold text-lg flex items-center justify-center transition-colors active:scale-95"
                >
                  +
                </button>
              </div>
              <input
                type="range"
                min="50"
                max="400"
                value={length}
                onChange={(e) => setLength(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>

            {/* Chiều Rộng (Width / Y) */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-neutral-800">Chiều Rộng (W) — Y-Axis</span>
                <span className="font-['JetBrains_Mono'] text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  {width} mm
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleStep('width', -5)}
                  className="w-10 h-10 rounded-xl bg-stone-100 hover:bg-stone-200 text-neutral-800 font-bold text-lg flex items-center justify-center transition-colors active:scale-95"
                >
                  −
                </button>
                <div className="flex-1 h-10 bg-stone-50 border border-stone-200 rounded-xl flex items-center justify-center font-['JetBrains_Mono'] text-lg font-bold text-neutral-900">
                  {width} <span className="text-xs font-normal text-stone-400 ml-1">mm</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleStep('width', 5)}
                  className="w-10 h-10 rounded-xl bg-stone-100 hover:bg-stone-200 text-neutral-800 font-bold text-lg flex items-center justify-center transition-colors active:scale-95"
                >
                  +
                </button>
              </div>
              <input
                type="range"
                min="40"
                max="300"
                value={width}
                onChange={(e) => setWidth(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>

            {/* Chiều Cao (Height / Z) */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-neutral-800">Chiều Cao (H) — Z-Axis</span>
                <span className="font-['JetBrains_Mono'] text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  {height} mm
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleStep('height', -5)}
                  className="w-10 h-10 rounded-xl bg-stone-100 hover:bg-stone-200 text-neutral-800 font-bold text-lg flex items-center justify-center transition-colors active:scale-95"
                >
                  −
                </button>
                <div className="flex-1 h-10 bg-stone-50 border border-stone-200 rounded-xl flex items-center justify-center font-['JetBrains_Mono'] text-lg font-bold text-neutral-900">
                  {height} <span className="text-xs font-normal text-stone-400 ml-1">mm</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleStep('height', 5)}
                  className="w-10 h-10 rounded-xl bg-stone-100 hover:bg-stone-200 text-neutral-800 font-bold text-lg flex items-center justify-center transition-colors active:scale-95"
                >
                  +
                </button>
              </div>
              <input
                type="range"
                min="25"
                max="220"
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>

            {/* Khối Lượng Quà Tặng (Weight / Grams) */}
            <div className="space-y-2 pt-2 border-t border-stone-100">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-neutral-800">Khối Lượng Quà (g)</span>
                <span className={`font-['JetBrains_Mono'] text-xs font-bold px-2 py-0.5 rounded ${weight > 300 ? 'text-amber-700 bg-amber-50 border border-amber-200' : 'text-blue-600 bg-blue-50'}`}>
                  {weight} g {weight > 300 ? '• >300g (Khóa Đáy 1-2-3)' : '• Nhẹ (Gài thẳng)'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setWeight((prev) => Math.max(50, prev - 50))}
                  className="w-10 h-10 rounded-xl bg-stone-100 hover:bg-stone-200 text-neutral-800 font-bold text-lg flex items-center justify-center transition-colors active:scale-95"
                >
                  −
                </button>
                <div className="flex-1 h-10 bg-stone-50 border border-stone-200 rounded-xl flex items-center justify-center font-['JetBrains_Mono'] text-lg font-bold text-neutral-900">
                  {weight} <span className="text-xs font-normal text-stone-400 ml-1">g</span>
                </div>
                <button
                  type="button"
                  onClick={() => setWeight((prev) => Math.min(2000, prev + 50))}
                  className="w-10 h-10 rounded-xl bg-stone-100 hover:bg-stone-200 text-neutral-800 font-bold text-lg flex items-center justify-center transition-colors active:scale-95"
                >
                  +
                </button>
              </div>
              <input
                type="range"
                min="50"
                max="1500"
                step="50"
                value={weight}
                onChange={(e) => setWeight(Number(e.target.value))}
                className="w-full accent-amber-600 cursor-pointer"
              />
            </div>
          </div>

          {/* Caliper & Paper Substrate Swatches */}
          <div className="pt-2">
            <label className="block text-[11px] font-['JetBrains_Mono'] font-bold text-stone-500 uppercase tracking-wider mb-2.5">
              ĐỘ DÀY GIẤY CALIPER (+{paperSpec.compensation} mm Bù Co Giãn)
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {/* Swatch 1: Ivory 300g */}
              <button
                type="button"
                onClick={() => setSelectedPaper('ivory')}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  selectedPaper === 'ivory'
                    ? 'border-2 border-blue-600 bg-blue-50/50 shadow-xs'
                    : 'border-stone-200 hover:border-stone-300 bg-white'
                }`}
              >
                <div className="text-xs font-bold text-neutral-900">Ivory 300g</div>
                <div className="text-[10px] text-emerald-700 font-semibold font-['JetBrains_Mono'] mt-0.5">
                  (+1.8mm)
                </div>
                <div className="text-[10px] text-stone-400 mt-1">0.38mm Caliper</div>
              </button>

              {/* Swatch 2: Kraft 350g */}
              <button
                type="button"
                onClick={() => setSelectedPaper('kraft')}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  selectedPaper === 'kraft'
                    ? 'border-2 border-blue-600 bg-blue-50/50 shadow-xs'
                    : 'border-stone-200 hover:border-stone-300 bg-white'
                }`}
              >
                <div className="text-xs font-bold text-neutral-900">Kraft 350g</div>
                <div className="text-[10px] text-blue-700 font-semibold font-['JetBrains_Mono'] mt-0.5">
                  (+2.5mm)
                </div>
                <div className="text-[10px] text-stone-400 mt-1">0.45mm Caliper</div>
              </button>

              {/* Swatch 3: E-Flute Carton */}
              <button
                type="button"
                onClick={() => setSelectedPaper('carton')}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  selectedPaper === 'carton'
                    ? 'border-2 border-blue-600 bg-blue-50/50 shadow-xs'
                    : 'border-stone-200 hover:border-stone-300 bg-white'
                }`}
              >
                <div className="text-xs font-bold text-neutral-900">E-Flute Carton</div>
                <div className="text-[10px] text-amber-700 font-semibold font-['JetBrains_Mono'] mt-0.5">
                  (+3.2mm)
                </div>
                <div className="text-[10px] text-stone-400 mt-1">1.50mm Sóng E</div>
              </button>
            </div>
          </div>

          {/* Technical Info Callout Banner */}
          <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-2xl flex items-start gap-2.5 text-xs">
            <span className="material-symbols-outlined text-blue-600 text-lg shrink-0 mt-0.5">
              info
            </span>
            <div>
              <p className="font-bold text-neutral-900">Tự Động Bù Co Giãn K-Factor</p>
              <p className="text-[11px] text-stone-500 mt-0.5 leading-relaxed font-['JetBrains_Mono']">
                Dung sai khe hở nắp gài: +0.8mm • Mép dán keo tiêu chuẩn: 15.0mm • Góc vát flap: 45°
              </p>
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN (7 COLS): 3D REAL-TIME VIEWPORT & 3 KPI METRICS */}
        <section className="lg:col-span-7 space-y-4">
          {/* 3D Viewport Box with Top Badges & Camera Presets */}
          <div className="relative rounded-3xl bg-gradient-to-b from-white to-[#F5EFE6] border border-stone-200/90 shadow-[0_4px_24px_rgba(28,25,23,0.03)] h-[460px] overflow-hidden flex flex-col justify-between p-4">
            {/* Top Row Overlay: Realtime badge & Camera buttons */}
            <div className="flex items-center justify-between z-10 pointer-events-auto">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-stone-200 shadow-xs text-xs font-bold text-neutral-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>• MÔ HÌNH 3D THỜI GIAN THỰC</span>
                <span className="text-[10px] font-['JetBrains_Mono'] text-stone-400">| {weight > 300 ? 'FEFCO 0215 (Đáy Khóa)' : 'FEFCO 0211 (Đáy Gài)'}</span>
              </div>

              <div className="flex items-center gap-1.5 p-1 bg-white/90 backdrop-blur-md rounded-full border border-stone-200 shadow-xs text-xs">
                <button
                  type="button"
                  onClick={() => setCameraAngle('iso')}
                  className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${
                    cameraAngle === 'iso' ? 'bg-[#122e20] text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Iso 30°
                </button>
                <button
                  type="button"
                  onClick={() => setCameraAngle('top')}
                  className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${
                    cameraAngle === 'top' ? 'bg-[#122e20] text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Top
                </button>
                <button
                  type="button"
                  onClick={() => setCameraAngle('front')}
                  className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${
                    cameraAngle === 'front' ? 'bg-[#122e20] text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Front
                </button>
                <button
                  type="button"
                  onClick={() => setFoldProgress((prev) => (prev > 0.5 ? 0.1 : 0.95))}
                  title="Gập / Mở hộp"
                  className="px-2.5 py-1 rounded-full text-[11px] font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-all"
                >
                  ↻ {foldProgress > 0.5 ? 'Mở Phẳng' : 'Đóng Hộp'}
                </button>
              </div>
            </div>

            {/* Live Interactive Three.js WebGL Folding Box */}
            <div className="absolute inset-0 z-0">
              <InteractiveFoldingBox3D
                dimensions={{
                  length: effectiveLength,
                  width: effectiveWidth,
                  height: effectiveHeight,
                  paperThickness: paperSpec.caliper,
                  giftWeight: weight,
                  bottomType: weight > 300 ? 'lock' : 'tuck',
                }}
                foldProgress={foldProgress}
                theme={paperSpec.theme}
                customLogoText="WRAPFIT"
              />
            </div>

            {/* Bottom-left Mascot Floating Speech Card */}
            <div className="relative z-10 max-w-md bg-white/95 backdrop-blur-md rounded-2xl p-3.5 border border-stone-200/90 shadow-md flex items-start gap-3">
              <img
                src="/mascots/goi.webp"
                alt="Bé Gói Mascot"
                className="w-10 h-10 object-contain rounded-full bg-emerald-50 p-1 border border-emerald-200 shrink-0"
              />
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-neutral-900">Bé Gói AI trợ lý bao bì</span>
                  <span className="text-[9px] font-['JetBrains_Mono'] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">
                    FIT-AUTO REALTIME
                  </span>
                </div>
                <p className="text-[11px] text-stone-600 leading-snug">
                  {weight > 300
                    ? `“Quà nặng ${weight}g (> 300g): Gói đã tự động kích hoạt Đáy khóa FEFCO 0215 (Crash-lock) và khuyên dùng giấy Kraft 350g để chống bục đáy khi vận chuyển nhé!”`
                    : `“Kích thước ${length}×${width}×${height}mm rất chuẩn tỷ lệ vàng cho hộp quà cao cấp! Trọng tâm vững, nắp gài ôm khít.”`}
                </p>
              </div>
            </div>
          </div>

          {/* 3 KPI Specification Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Card 1: Thể tích lọt lòng */}
            <div className="p-4 rounded-2xl bg-white border border-stone-200/90 shadow-xs space-y-1">
              <p className="text-[10px] font-['JetBrains_Mono'] font-bold text-stone-400 uppercase tracking-wider">
                THỂ TÍCH LỌT LÒNG
              </p>
              <p className="font-['JetBrains_Mono'] text-xl font-bold text-neutral-900">
                {volumeMl.toLocaleString('vi-VN')} ml
              </p>
              <p className="text-[11px] text-stone-500">Khối lượng khuyến nghị: ≤ 850g</p>
            </div>

            {/* Card 2: Diện tích trải rập */}
            <div className="p-4 rounded-2xl bg-white border border-stone-200/90 shadow-xs space-y-1">
              <p className="text-[10px] font-['JetBrains_Mono'] font-bold text-stone-400 uppercase tracking-wider">
                DIỆN TÍCH TRẢI RẬP
              </p>
              <p className="font-['JetBrains_Mono'] text-xl font-bold text-neutral-900">
                {dielineAreaCm2.toLocaleString('vi-VN')} cm²
              </p>
              <p className="text-[11px] text-stone-500">Tiêu hao vật tư: Tối ưu 94.2%</p>
            </div>

            {/* Card 3: Khổ in kinh tế */}
            <div className="p-4 rounded-2xl bg-white border border-stone-200/90 shadow-xs space-y-1">
              <p className="text-[10px] font-['JetBrains_Mono'] font-bold text-stone-400 uppercase tracking-wider">
                KHỔ IN KINH TẾ
              </p>
              <p className="font-['JetBrains_Mono'] text-xl font-bold text-neutral-900">
                2 Hộp / Tờ In
              </p>
              <p className="text-[11px] text-stone-500">Khổ 65 × 86 cm • Tiết kiệm 28%</p>
            </div>
          </div>
        </section>
      </main>

      {/* ================= 4. BOTTOM FLOATING ACTION DOCK ================= */}
      <footer className="sticky bottom-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200 p-4 px-6 shadow-sm">
        <div className="w-full max-w-[1720px] mx-auto flex items-center justify-between gap-4">
          <Link
            href="/editor/step-1"
            className="px-5 py-2.5 rounded-full border border-stone-300 hover:bg-stone-50 text-neutral-800 text-xs font-semibold transition-all flex items-center gap-2 active:scale-95"
          >
            <span>←</span>
            <span>Chọn Dáng Khác</span>
          </Link>

          <div className="hidden md:flex items-center gap-2 font-['JetBrains_Mono'] text-xs font-bold text-neutral-800">
            <span>KÍCH THƯỚC CHUẨN ÁP DỤNG:</span>
            <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded">
              {length} × {width} × {height} mm
            </span>
            <span className="text-stone-400 font-normal">
              (Bù Caliper +{paperSpec.compensation}mm • FEFCO 0215)
            </span>
          </div>

          <Link
            href="/editor/step-3"
            className="px-6 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 active:scale-95"
          >
            <span>Bước 3: Phối Cảnh 3D Studio</span>
            <span>→</span>
          </Link>
        </div>
      </footer>
    </div>
  );
}

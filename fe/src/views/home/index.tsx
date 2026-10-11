"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ROUTES } from '@/constants';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { GoiMascot } from '@/components/common/GoiMascot';
import { MainHeader, MainFooter } from '@/components/layout';
import { InteractiveFoldingBox3D, BoxMaterialTheme, BoxStructureType } from '@/features/studio/components/three/InteractiveFoldingBox3D';
import { HomeTemplateDeck } from '@/features/templates';

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export default function Page() {
  const [pipelineStep, setPipelineStep] = useState(3);
  const [heroFoldProgress, setHeroFoldProgress] = useState(0.85);
  const [heroRotationY, setHeroRotationY] = useState(0.45);
  const [heroRotationX, setHeroRotationX] = useState(0.12);
  const [heroTheme, setHeroTheme] = useState<BoxMaterialTheme>("ivory");
  const [heroBoxType, setHeroBoxType] = useState<BoxStructureType>("tuck-top");

  // GSAP ScrollTrigger: Page scroll smoothly steers 3D box yaw rotation, pitch tilt, and fold stages
  useEffect(() => {
    if (typeof window === "undefined") return;

    const heroEl = document.getElementById("hero-section");
    const pipelineEl = document.getElementById("pipeline");

    const st = ScrollTrigger.create({
      trigger: heroEl || document.body,
      start: "top top",
      endTrigger: pipelineEl || document.body,
      end: "bottom center",
      scrub: 1.2, // Smooth interpolation lag
      onUpdate: (self) => {
        const p = self.progress; // 0.0 -> 1.0

        // 1. Continuous smooth 360° rotation driven by scroll
        const rotY = p * Math.PI * 2.5 + 0.45;
        // 2. Subtle organic pitch tilt
        const rotX = Math.sin(p * Math.PI) * 0.22;
        // 3. Dynamic physical folding timeline
        const fold = Math.min(1.0, Math.max(0.15, p * 1.15 + 0.15));

        setHeroRotationY(rotY);
        setHeroRotationX(rotX);
        setHeroFoldProgress(fold);

        // 4. Milestone synchronization with the Precision Pipeline
        if (p >= 0.75) {
          setPipelineStep(3);
        } else if (p >= 0.5) {
          setPipelineStep(2);
        } else if (p >= 0.25) {
          setPipelineStep(1);
        } else {
          setPipelineStep(0);
        }
      },
    });

    return () => {
      st.kill();
    };
  }, []);

  return (
    <>
      <MainHeader />
<main className="w-full pt-24 bg-surface min-h-screen"><div className="flex flex-col w-full">
{/*  HERO SECTION (Matching Reference Model)  */}
<section id="hero-section" className="relative w-full max-w-7xl 2xl:max-w-[1560px] mx-auto px-6 sm:px-10 lg:px-12 pt-8 sm:pt-12 pb-14 lg:pb-20 overflow-hidden flex items-center">
  <div className="relative z-10 w-full py-4 lg:py-8">
    <div className="flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-14">
      {/* Left Column: Editorial Headline & Actions */}
      <div className="w-full lg:w-1/2 max-w-xl flex flex-col items-start">
        <h1 className="font-['Playfair_Display'] text-[46px] sm:text-[58px] lg:text-[68px] 2xl:text-[74px] leading-[1.06] text-[#122e20] tracking-tight font-medium mb-6">
          A better fit<br />
          for every<br />
          thoughtful<br />
          gift.
        </h1>
        <p className="font-['Plus_Jakarta_Sans'] text-[16px] sm:text-[17px] text-[#485950] max-w-lg mb-10 leading-relaxed font-normal">
          WrapFit turns one little object into a considered unboxing moment. Enter the gift, choose a structure, then watch every fold find its place.
        </p>
        <div className="flex flex-wrap items-center gap-4 pt-1">
          <Link
            className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-full bg-[#133020] text-white text-sm font-medium hover:bg-[#1c422d] transition-all shadow-sm active:scale-95 group"
            href={ROUTES.editorNew}
          >
            <span>Khám phá 3D Studio</span>
            <span className="material-symbols-outlined text-base transition-transform group-hover:translate-x-0.5">arrow_forward</span>
          </Link>
          <a
            className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-full bg-white/80 hover:bg-white text-[#152e22] text-sm font-medium border border-[#e3ded6] shadow-xs transition-all active:scale-95"
            href="#thu-vien-mau"
          >
            <span className="material-symbols-outlined text-base text-[#486458]">grid_view</span>
            <span>Xem thư viện mẫu dieline</span>
          </a>
        </div>
      </div>

      {/* Right Column: Considered Packaging Still Artwork */}
      <div className="w-full lg:w-1/2 flex items-center justify-center lg:justify-end select-none">
        <img
          src="/branding/hero-art.png"
          alt="WrapFit Considered Packaging Collection"
          className="w-full max-w-[560px] lg:max-w-[660px] 2xl:max-w-[740px] h-auto object-contain mix-blend-multiply select-none pointer-events-none drop-shadow-xs"
        />
      </div>
    </div>
  </div>
</section>

{/*  RE-ENGINEERED 360° CONTINUOUS CIRCULAR 3D CAROUSEL SECTION  */}
<section className="w-full max-w-7xl 2xl:max-w-[1560px] mx-auto px-gutter pt-8 pb-14 overflow-hidden relative" id="thu-vien-mau">
  <div className="absolute inset-0 pointer-events-none -z-0 overflow-hidden">
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[520px] rounded-full filter blur-[135px] opacity-40 mix-blend-multiply" style={{"background":"radial-gradient(circle, rgba(202, 234, 217, 0.45) 0%, rgba(238, 244, 241, 0.25) 45%, transparent 70%)"}} />
    <div className="absolute -bottom-20 right-[-5%] w-[460px] h-[460px] rounded-full filter blur-[120px] opacity-35" style={{"background":"radial-gradient(circle, rgba(245, 230, 202, 0.5) 0%, rgba(254, 243, 199, 0.1) 50%, transparent 75%)"}} />
  </div>

  <HomeTemplateDeck />
</section>
{/*  REDESIGNED PRECISION PIPELINE: CONTINUOUS CHART LINE & INTERACTIVE 4-STAGE SHOWCASE  */}
<section className="w-full max-w-7xl 2xl:max-w-[1560px] mx-auto px-gutter py-space-xl relative overflow-hidden" id="pipeline"><div className="absolute inset-0 pointer-events-none -z-0 overflow-hidden"><div className="absolute top-12 left-[10%] w-[580px] h-[340px] rounded-full filter blur-[130px] opacity-45" style={{"background":"radial-gradient(circle, rgba(219, 225, 255, 0.4) 0%, rgba(202, 234, 217, 0.2) 50%, transparent 75%)"}}></div><div className="absolute bottom-8 right-[5%] w-[640px] h-[400px] rounded-full filter blur-[140px] opacity-35 mix-blend-multiply" style={{"background":"radial-gradient(circle, rgba(254, 243, 199, 0.5) 0%, rgba(202, 234, 217, 0.3) 45%, transparent 70%)"}}></div></div>
{/*  Minimal Header & Realtime Stage Selector  */}
<div className="flex flex-col lg:flex-row lg:items-end justify-between mb-8 gap-6">
<div className="max-w-xl">
<div className="flex items-center gap-2">
<span className="inline-block w-2 h-2 rounded-full bg-[#2563eb] animate-pulse"></span>
<span className="font-cad-spec-micro text-cad-spec-micro uppercase tracking-widest text-[#4d6657] font-semibold">Continuous CAD Pipeline</span>
</div>
<h2 className="font-headline-lg text-[32px] md:text-[40px] text-[#122e20] mt-1 font-['Playfair_Display'] font-medium">
        Khuôn Số Hóa Tới Bàn Bế
      </h2>
</div>
{/*  Apple-style Interactive Timeline Pills  */}
<div className="inline-flex p-1.5 rounded-full bg-white/70 border border-[#e5decb] shadow-xs backdrop-blur-md overflow-x-auto max-w-full">
<button className={`pipeline-tab px-4 py-2 rounded-full font-cad-dimension text-xs font-medium transition-all flex items-center gap-2 ${pipelineStep === 0 ? "bg-white text-[#133020] shadow-xs" : "text-[#697d71] hover:text-[#133020]"}`} onClick={() => setPipelineStep(0)} id="pipeline-btn-0">
<span className="w-2 h-2 rounded-full bg-[#2563eb]"></span>
<span className="">01 · CAD Dieline</span>
</button>
<button className={`pipeline-tab px-4 py-2 rounded-full font-cad-dimension text-xs font-medium transition-all flex items-center gap-2 ${pipelineStep === 1 ? "bg-white text-[#133020] shadow-xs" : "text-[#697d71] hover:text-[#133020]"}`} onClick={() => setPipelineStep(1)} id="pipeline-btn-1">
<span className="w-2 h-2 rounded-full bg-[#cca72f]"></span>
<span className="">02 · Caliper</span>
</button>
<button className={`pipeline-tab px-4 py-2 rounded-full font-cad-dimension text-xs font-medium transition-all flex items-center gap-2 ${pipelineStep === 2 ? "bg-white text-[#133020] shadow-xs" : "text-[#697d71] hover:text-[#133020]"}`} onClick={() => setPipelineStep(2)} id="pipeline-btn-2">
<span className="w-2 h-2 rounded-full bg-[#486458]"></span>
<span className="">03 · 3D PBR</span>
</button>
<button className={`pipeline-tab px-4 py-2 rounded-full font-cad-dimension text-xs font-medium transition-all flex items-center gap-2 ${pipelineStep === 3 ? "bg-white text-[#133020] shadow-xs" : "text-[#697d71] hover:text-[#133020]"}`} onClick={() => setPipelineStep(3)} id="pipeline-btn-3">
<span className="w-2 h-2 rounded-full bg-[#133020]"></span>
<span className="">04 · CNC Export</span>
</button>
</div>
</div>
{/*  Interactive Continuous Chart Line (Bezier Wave) with moving indicator dot  */}
<div className="relative w-full mb-8 px-2">
<div className="relative w-full h-14 flex items-center">
<svg className="w-full h-12 overflow-visible" preserveAspectRatio="none" viewBox="0 0 1000 60">
<defs>
<linearGradient id="pipelineGradient" x1="0%" x2="100%" y1="0%" y2="0%">
<stop offset="0%" stopColor="#2563eb" stopOpacity="0.9"></stop>
<stop offset="35%" stopColor="#cca72f" stopOpacity="0.9"></stop>
<stop offset="70%" stopColor="#486458" stopOpacity="0.9"></stop>
<stop offset="100%" stopColor="#133020" stopOpacity="0.9"></stop>
</linearGradient>
<filter height="200%" id="glowDot" width="200%" x="-50%" y="-50%">
<feGaussianBlur result="blur" stdDeviation="3"></feGaussianBlur>
<feMerge>
<feMergeNode in="blur"></feMergeNode>
<feMergeNode in="SourceGraphic"></feMergeNode>
</feMerge>
</filter>
</defs>
{/*  Background guide track  */}
<path d="M 0,30 Q 166,10 333,30 T 666,30 T 1000,30" fill="none" stroke="#e0d6c5" strokeDasharray="4 4" strokeWidth="2" />
{/*  Active progressive bezier path  */}
<path d="M 0,30 Q 166,10 333,30 T 666,30 T 1000,30" fill="none" id="pipelineTrack" stroke="url(#pipelineGradient)" strokeLinecap="round" strokeWidth="3.5" />
{/*  Interactive Milestone Anchor Points  */}
<circle className="cursor-pointer fill-white stroke-[#2563eb] stroke-[3px] hover:scale-125 transition-transform" cx="40" cy="27" r="7" onClick={() => setPipelineStep(0)} />
<circle className="cursor-pointer fill-white stroke-[#cca72f] stroke-[3px] hover:scale-125 transition-transform" cx="350" cy="31" r="7" onClick={() => setPipelineStep(1)} />
<circle className="cursor-pointer fill-white stroke-[#486458] stroke-[3px] hover:scale-125 transition-transform" cx="660" cy="29" r="7" onClick={() => setPipelineStep(2)} />
<circle className="cursor-pointer fill-white stroke-[#133020] stroke-[3px] hover:scale-125 transition-transform" cx="960" cy="30" r="7" onClick={() => setPipelineStep(3)} />
</svg>
{/*  Smooth moving indicator puck  */}
<div className="absolute top-1/2 -translate-y-1/2 pointer-events-none transition-all duration-700 ease-out flex items-center justify-center -ml-3" id="puckIndicator" style={{ left: pipelineStep === 0 ? "4%" : pipelineStep === 1 ? "35%" : pipelineStep === 2 ? "66%" : "96%" }}>
<span className="w-6 h-6 rounded-full bg-[#133020] border-2 border-white shadow-md flex items-center justify-center">
<span className="w-2 h-2 rounded-full bg-[#ffe088] animate-ping"></span>
</span>
</div>
</div>
{/*  Micro Pipeline Specs Ribbon  */}
<div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-1 border-t border-[#e8dfcf]">
<div onClick={() => setPipelineStep(0)} className="cursor-pointer group flex items-baseline justify-between pt-2">
<span className={`font-cad-dimension text-xs font-semibold ${pipelineStep === 0 ? "text-[#2563eb] underline" : "text-[#2563eb]"}`}>01. CAD Dieline</span>
<span className="font-cad-spec-micro text-[#697d71] group-hover:text-black">Δ 0.05mm</span>
</div>
<div onClick={() => setPipelineStep(1)} className="cursor-pointer group flex items-baseline justify-between pt-2">
<span className={`font-cad-dimension text-xs font-semibold ${pipelineStep === 1 ? "text-[#735c00] underline" : "text-[#735c00]"}`}>02. Caliper Fix</span>
<span className="font-cad-spec-micro text-[#697d71] group-hover:text-black">Auto Kerf 1:1</span>
</div>
<div onClick={() => setPipelineStep(2)} className="cursor-pointer group flex items-baseline justify-between pt-2">
<span className={`font-cad-dimension text-xs font-semibold ${pipelineStep === 2 ? "text-[#486458] underline" : "text-[#486458]"}`}>03. 3D Studio</span>
<span className="font-cad-spec-micro text-[#697d71] group-hover:text-black">PBR 4K Shader</span>
</div>
<div onClick={() => setPipelineStep(3)} className="cursor-pointer group flex items-baseline justify-between pt-2">
<span className={`font-cad-dimension text-xs font-semibold ${pipelineStep === 3 ? "text-[#133020] underline" : "text-[#133020]"}`}>04. CNC Export</span>
<span className="font-cad-spec-micro text-[#697d71] group-hover:text-black">DXF/DWG/PDF</span>
</div>
</div>
</div>
{/*  HIGH-DENSITY VISUAL HERO CANVAS (Displaying Active State with Mascot & Spec)  */}
<div className="relative w-full rounded-[32px] bg-[#f5efe4]/80 border border-[#e8ded0] p-6 lg:p-9 shadow-xs overflow-hidden">
{/*  Subtle technical grid background  */}
<div className="absolute inset-0 opacity-40 pointer-events-none" style={{"backgroundImage":"linear-gradient(to right, rgba(20,40,25,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(20,40,25,0.06) 1px, transparent 1px)","backgroundSize":"24px 24px"}}></div>
{/*  Active Stage Slide Container  */}
<div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center min-h-[380px]" id="pipelineStageContainer">
{/*  Stage 01: CAD Dieline  */}
<div className={`stage-panel transition-opacity duration-500 ${pipelineStep === 0 ? "contents" : "hidden"}`} id="stage-panel-0">
{/*  Visual Cad Workspace Simulator  */}
<div className="lg:col-span-7 bg-white/95 rounded-2xl border border-[#ded5c5] p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
<div className="flex items-center justify-between pb-3 border-b border-[#f0e8dc]">
<div className="flex items-center gap-2">
<span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
<span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
<span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
<span className="font-cad-dimension text-xs font-medium text-[#486458] ml-2">ECMA-210_FoldCheck.cad</span>
</div>
<span className="font-cad-spec-micro bg-[#eef3ff] text-[#2563eb] font-semibold px-2 py-0.5 rounded">Tự Động Trải Phẳng</span>
</div>
{/*  Dieline Vector Blueprint Graphic  */}
<div className="py-6 flex items-center justify-center relative">
<svg className="w-full max-w-[340px] h-48 text-[#2563eb]" fill="none" viewBox="0 0 340 180">
{/*  Cutting Line (Solid Red)  */}
<rect height="130" rx="4" stroke="#e11d48" strokeDasharray="none" strokeWidth="1.8" width="280" x="30" y="25" />
<rect height="130" stroke="#2563eb" strokeDasharray="4 3" strokeWidth="1.5" width="70" x="70" y="25" />
<rect height="130" stroke="#2563eb" strokeDasharray="4 3" strokeWidth="1.5" width="70" x="140" y="25" />
<rect height="130" stroke="#2563eb" strokeDasharray="4 3" strokeWidth="1.5" width="70" x="210" y="25" />
{/*  Glue Flap  */}
<path d="M 30,35 L 12,45 L 12,135 L 30,145" fill="rgba(37,99,235,0.04)" stroke="#e11d48" strokeWidth="1.8" />
{/*  Top/Bottom Tuck Flaps  */}
<path d="M 70,25 L 85,8 L 125,8 L 140,25" stroke="#e11d48" strokeWidth="1.8" />
<path d="M 70,155 L 85,172 L 125,172 L 140,155" stroke="#e11d48" strokeWidth="1.8" />
{/*  Dimension markers  */}
<line stroke="#737686" strokeWidth="1" x1="70" x2="140" y1="18" y2="18" />
<text fill="#434655" fontFamily="JetBrains Mono" fontSize="9" x="96" y="14">85.0 mm</text>
<line stroke="#737686" strokeWidth="1" x1="318" x2="318" y1="25" y2="155" />
<text fill="#434655" fontFamily="JetBrains Mono" fontSize="9" transform="rotate(90 322,92)" x="322" y="92">130.0 mm</text>
</svg>
</div>
{/*  Quick Metrics Bar  */}
<div className="flex items-center justify-between pt-3 border-t border-[#f0e8dc] font-cad-dimension text-xs text-[#697d71]">
<span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Sai số hình học: ±0.05 mm</span>
<span className="text-[#133020] font-semibold">Tỉ lệ 1:1 Vector</span>
</div>
</div>
{/*  Info & Mascot Callout  */}
<div className="lg:col-span-5 flex flex-col justify-between h-full space-y-5">
<div className="flex items-center gap-4">
<GoiMascot pose="measuring" size={64} />
<div>
<span className="font-cad-dimension text-xs font-semibold text-[#2563eb] uppercase tracking-wider">Bước 01 · Thuật Toán Khung Bế</span>
<h3 className="font-headline-sm text-2xl text-[#122e20] font-semibold">Chọn Khuôn Chuẩn CAD</h3>
</div>
</div>
<p className="font-body-md text-sm text-[#485950] leading-relaxed">
            Hệ thống tự nhận diện thông số hộp thực, dựng ma trận đường cấn gấp (crease) và rãnh dao bế (cut) theo chuẩn quốc tế ECMA &amp; FEFCO mà không cần vẽ tay thủ công.
          </p>
<div className="flex items-center gap-3 pt-2">
<span className="px-3 py-1 rounded-full bg-white text-[#133020] border border-[#ded5c5] font-cad-dimension text-xs">120+ Thư viện khuôn</span>
<span className="px-3 py-1 rounded-full bg-[#2563eb]/10 text-[#2563eb] font-cad-dimension text-xs">Tự dựng 2D</span>
</div>
</div>
</div>
{/*  Stage 02: Caliper Calibration (Initially Hidden)  */}
<div className={`stage-panel transition-opacity duration-500 ${pipelineStep === 1 ? "contents" : "hidden"}`} id="stage-panel-1">
<div className="lg:col-span-7 bg-white/95 rounded-2xl border border-[#ded5c5] p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
<div className="flex items-center justify-between pb-3 border-b border-[#f0e8dc]">
<div className="flex items-center gap-2">
<span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
<span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
<span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
<span className="font-cad-dimension text-xs font-medium text-[#486458] ml-2">Caliper_Kerf_Engine.v4</span>
</div>
<span className="font-cad-spec-micro bg-[#fdf5d6] text-[#735c00] font-semibold px-2 py-0.5 rounded">Tự Cân Bù Nếp Gấp</span>
</div>
{/*  Caliper Diagram Graphic  */}
<div className="py-6 flex items-center justify-center relative">
<svg className="w-full max-w-[340px] h-48" fill="none" viewBox="0 0 340 180">
{/*  Paper cross section folds  */}
<path d="M 40,90 Q 70,90 90,65 L 140,25 Q 160,10 180,10 L 260,10" stroke="#cca72f" strokeLinecap="round" strokeWidth="8" />
<path d="M 40,130 Q 80,130 110,110 L 170,65 Q 190,50 220,50 L 280,50" stroke="#2563eb" strokeDasharray="3 3" strokeLinecap="round" strokeWidth="4" />
{/*  Caliper gauge graphic  */}
<circle cx="160" cy="90" fill="#fff" r="46" stroke="#cca72f" strokeWidth="2.5" />
<line stroke="#b45309" strokeLinecap="round" strokeWidth="2" x1="160" x2="185" y1="90" y2="70" />
<circle cx="160" cy="90" fill="#b45309" r="4" />
<text fill="#133020" fontFamily="JetBrains Mono" fontSize="11" fontWeight="600" x="135" y="115">350 GSM</text>
<text fill="#735c00" fontFamily="JetBrains Mono" fontSize="9" x="140" y="128">+0.42mm</text>
</svg>
</div>
<div className="flex items-center justify-between pt-3 border-t border-[#f0e8dc] font-cad-dimension text-xs text-[#697d71]">
<span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Giấy Ivory / Kraft / Carton sóng</span>
<span className="text-[#735c00] font-semibold">Chống nứt gân 100%</span>
</div>
</div>
<div className="lg:col-span-5 flex flex-col justify-between h-full space-y-5">
<div className="flex items-center gap-4">
<div className="w-16 h-16 rounded-2xl bg-[#fef9eb] border border-[#f0dfb2] p-1.5 shadow-xs shrink-0 flex items-center justify-center">
<span className="material-symbols-outlined text-3xl text-[#735c00]">straighten</span>
</div>
<div>
<span className="font-cad-dimension text-xs font-semibold text-[#735c00] uppercase tracking-wider">Bước 02 · Vi Đo Giấy Thật</span>
<h3 className="font-headline-sm text-2xl text-[#122e20] font-semibold">Khai Báo Caliper Giấy</h3>
</div>
</div>
<p className="font-body-md text-sm text-[#485950] leading-relaxed">
            Mỗi loại giấy có độ giãn cơ học khác biệt. WrapFit tính toán lực cấn và bù rãnh dao bế theo caliper thực tế, đảm bảo nắp hộp cài khít êm ái mà không bị bung gãy mép.
          </p>
<div className="flex items-center gap-3 pt-2">
<span className="px-3 py-1 rounded-full bg-white text-[#133020] border border-[#ded5c5] font-cad-dimension text-xs">Kerf Compensation</span>
<span className="px-3 py-1 rounded-full bg-[#cca72f]/20 text-[#735c00] font-cad-dimension text-xs">200 - 450 gsm</span>
</div>
</div>
</div>
{/*  Stage 03: 3D PBR Studio (Initially Hidden)  */}
<div className={`stage-panel transition-opacity duration-500 ${pipelineStep === 2 ? "contents" : "hidden"}`} id="stage-panel-2">
<div className="lg:col-span-7 bg-[#1c1f24] rounded-2xl border border-[#343a42] p-4 sm:p-5 shadow-xs relative overflow-hidden flex flex-col justify-between text-white">
<div className="flex flex-wrap items-center justify-between pb-3 border-b border-white/10 gap-2">
<div className="flex items-center gap-2">
<span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
<span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
<span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
<span className="font-cad-dimension text-xs font-medium text-slate-300 ml-2">WrapFit_PBR_Viewport.4k</span>
</div>
{/* Material theme selector */}
<div className="flex items-center gap-1">
{([ { id: "ivory", label: "Ivory", color: "#FAF6EE" }, { id: "kraft", label: "Kraft", color: "#D9B897" }, { id: "forest", label: "Rừng Sâu", color: "#162E24" }, { id: "gold_foil", label: "Ép Kim", color: "#D4AF37" } ] as const).map((m) => (
<button key={m.id} type="button" onClick={() => setHeroTheme(m.id)} className={`px-2 py-0.5 rounded-full text-[11px] font-medium border transition flex items-center gap-1 ${heroTheme === m.id ? "bg-white text-stone-900 border-white font-semibold shadow-xs" : "bg-white/10 border-white/20 text-stone-300 hover:bg-white/20"}`}>
<span className="w-2 h-2 rounded-full border border-black/10" style={{ backgroundColor: m.color }} />
<span>{m.label}</span>
</button>
))}
</div>
</div>
{/* Live 3D Folding Box with Cotton Bump Map */}
<div className="py-3 flex items-center justify-center relative">
<div className="w-full aspect-[16/10] min-h-[280px] rounded-xl overflow-hidden bg-[#111315] border border-white/10 shadow-inner relative">
<InteractiveFoldingBox3D
  dimensions={{ length: 180, width: 120, height: 70, paperThickness: 0.35 }}
  foldProgress={heroFoldProgress}
  rotationY={heroRotationY}
  rotationX={heroRotationX}
  theme={heroTheme}
  boxType={heroBoxType}
  autoRotate={false}
  enableMacroZoom={true}
  className="w-full h-full min-h-[280px]"
/>
</div>
</div>
{/* Interactive Fold Slider & Guidance */}
<div className="flex flex-wrap items-center justify-between pt-3 border-t border-white/10 font-cad-dimension text-xs text-slate-300 gap-2">
<div className="flex items-center gap-2">
<span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
<span>Độ gập nắp:</span>
<input type="range" min="0" max="1" step="0.01" value={heroFoldProgress} onChange={(e) => setHeroFoldProgress(parseFloat(e.target.value))} className="w-24 sm:w-32 accent-emerald-400 h-1.5 bg-stone-700 rounded-lg cursor-pointer" aria-label="Điều chỉnh độ gập nắp" />
<span className="font-mono text-emerald-400 min-w-[32px]">{Math.round(heroFoldProgress * 100)}%</span>
</div>
<span className="text-[#ffe088] font-semibold text-[11px]">Sợi Bông Cotton 4K · PBR 60fps</span>
</div>
</div>
<div className="lg:col-span-5 flex flex-col justify-between h-full space-y-5">
<div className="flex items-center gap-4">
<div className="w-16 h-16 rounded-2xl bg-[#eef4f1] border border-[#c4dcce] p-1.5 shadow-xs shrink-0 flex items-center justify-center">
<span className="material-symbols-outlined text-3xl text-[#486458]">view_in_ar</span>
</div>
<div>
<span className="font-cad-dimension text-xs font-semibold text-[#486458] uppercase tracking-wider">Bước 03 · Render Vật Lý Thực</span>
<h3 className="font-headline-sm text-2xl text-[#122e20] font-semibold">Phối Cảnh 3D Studio</h3>
</div>
</div>
<p className="font-body-md text-sm text-[#485950] leading-relaxed">
            Xem trước trải nghiệm mở hộp (unboxing moment) của khách hàng. Trực quan hóa các hiệu ứng gia công đắt giá như dập nổi, ép kim 24K, cán màng nhám dưới nguồn sáng môi trường.
          </p>
<div className="flex items-center gap-3 pt-2">
<span className="px-3 py-1 rounded-full bg-white text-[#133020] border border-[#ded5c5] font-cad-dimension text-xs">PBR Realtime</span>
<span className="px-3 py-1 rounded-full bg-[#486458]/15 text-[#486458] font-cad-dimension text-xs">Ép Kim &amp; UV Định Vị</span>
</div>
</div>
</div>
{/*  Stage 04: CNC Export (Initially Hidden)  */}
<div className={`stage-panel transition-opacity duration-500 ${pipelineStep === 3 ? "contents" : "hidden"}`} id="stage-panel-3">
<div className="lg:col-span-7 bg-white/95 rounded-2xl border border-[#ded5c5] p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
<div className="flex items-center justify-between pb-3 border-b border-[#f0e8dc]">
<div className="flex items-center gap-2">
<span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
<span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
<span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
<span className="font-cad-dimension text-xs font-medium text-[#486458] ml-2">Export_Ready_Bundle_Pass.cnc</span>
</div>
<span className="font-cad-spec-micro bg-[#caead9] text-[#152e22] font-semibold px-2 py-0.5 rounded">Kiểm Định Dao Bế Xong</span>
</div>
{/*  Export Formats & Layers graphic  */}
<div className="py-5 grid grid-cols-3 gap-3">
<div className="rounded-xl border border-[#ded5c5] bg-[#faf6ee] p-3 text-center flex flex-col items-center">
<span className="material-symbols-outlined text-[#2563eb] text-2xl mb-1">architecture</span>
<span className="font-cad-dimension text-xs font-bold text-[#122e20]">DXF / DWG</span>
<span className="font-cad-spec-micro text-[#697d71] mt-1">Máy cắt CNC/Laser</span>
</div>
<div className="rounded-xl border border-[#ded5c5] bg-[#faf6ee] p-3 text-center flex flex-col items-center">
<span className="material-symbols-outlined text-[#ba1a1a] text-2xl mb-1">picture_as_pdf</span>
<span className="font-cad-dimension text-xs font-bold text-[#122e20]">PDF Layers</span>
<span className="font-cad-spec-micro text-[#697d71] mt-1">Tách lớp khuôn bế</span>
</div>
<div className="rounded-xl border border-[#ded5c5] bg-[#faf6ee] p-3 text-center flex flex-col items-center">
<span className="material-symbols-outlined text-[#486458] text-2xl mb-1">view_in_ar</span>
<span className="font-cad-dimension text-xs font-bold text-[#122e20]">GLTF / OBJ</span>
<span className="font-cad-spec-micro text-[#697d71] mt-1">Render 3D Thương mại</span>
</div>
</div>
<div className="flex items-center justify-between pt-3 border-t border-[#f0e8dc] font-cad-dimension text-xs text-[#697d71]">
<span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Đồng bộ mã vạch &amp; bo góc an toàn</span>
<span className="text-[#133020] font-semibold">Sẵn Sàng Cho Xưởng In</span>
</div>
</div>
<div className="lg:col-span-5 flex flex-col justify-between h-full space-y-5">
<div className="flex items-center gap-4">
<GoiMascot pose="delivery" size={64} />
<div>
<span className="font-cad-dimension text-xs font-semibold text-[#133020] uppercase tracking-wider">Bước 04 · Xuất Xưởng Tức Thì</span>
<h3 className="font-headline-sm text-2xl text-[#122e20] font-semibold">Xuất Chế Bản &amp; CNC</h3>
</div>
</div>
<p className="font-body-md text-sm text-[#485950] leading-relaxed">
            Chỉ với một cú click, toàn bộ file khuôn dao sắc bén được tự động định dạng chuẩn xác theo phân lớp màu chuẩn cho nhà xưởng bế dập và xưởng in offset.
          </p>
<div className="flex items-center gap-3 pt-2">
<span className="px-3 py-1 rounded-full bg-white text-[#133020] border border-[#ded5c5] font-cad-dimension text-xs">Vector 1:1</span>
<span className="px-3 py-1 rounded-full bg-[#133020] text-white font-cad-dimension text-xs">Tải Toàn Bộ Gói File</span>
</div>
</div>
</div>
</div>
</div>
</section>
{/*  BOTTOM CALL-TO-ACTION (Apple Aesthetic Minimal Card with Mascot)  */}
<section className="w-full max-w-7xl 2xl:max-w-[1560px] mx-auto px-gutter pt-space-lg pb-space-xl relative overflow-hidden"><div className="absolute inset-0 pointer-events-none -z-0 overflow-hidden"><div className="absolute top-1/2 right-[12%] -translate-y-1/2 w-[480px] h-[480px] rounded-full filter blur-[130px] opacity-40 mix-blend-multiply" style={{"background":"radial-gradient(circle, rgba(202, 234, 217, 0.6) 0%, rgba(72, 100, 88, 0.15) 55%, transparent 75%)"}}></div><div className="absolute top-1/2 left-[5%] -translate-y-1/2 w-[540px] h-[380px] rounded-full filter blur-[135px] opacity-35" style={{"background":"radial-gradient(circle, rgba(254, 240, 215, 0.6) 0%, rgba(245, 239, 228, 0) 70%)"}}></div></div>
<div className="relative w-full rounded-[38px] bg-[#f2ecdf]/50 p-space-xl overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-space-xl">
{/*  Left CTA Text  */}
<div className="flex flex-col items-start max-w-2xl z-10">
<span className="font-cad-spec-micro text-xs uppercase tracking-widest text-[#4d6657] font-semibold mb-3">
        Trực Tuyến · Không Cần Cài Đặt
      </span>
<h2 className="font-headline-lg text-headline-lg lg:text-[44px] lg:leading-[52px] text-[#122e20] font-['Playfair_Display'] font-medium">
        Bắt Đầu Dự Án Bao Bì Hoàn Hảo
      </h2>
<p className="font-body-lg text-[#485950] mt-space-sm max-w-lg leading-relaxed">
        Chuẩn hóa quy trình thiết kế khuôn bế cùng WrapFit ngay hôm nay.
      </p>
<div className="flex flex-wrap items-center gap-space-md mt-space-lg">
<Link className="inline-flex items-center justify-center px-6 py-3 bg-[#133020] text-white text-sm font-medium rounded-full hover:bg-[#1c422d] transition-all active:scale-95 shadow-xs" href={ROUTES.editorNew}>
<span className="">Mở Studio Miễn Phí</span>
<span className="material-symbols-outlined text-base ml-2">arrow_forward</span>
</Link>
<Link className="inline-flex items-center justify-center px-6 py-3 text-[#152e22] text-sm font-medium hover:text-black transition-all" href="/pricing">
          Xem Bảng Giá
        </Link>
</div>
</div>
{/*  Right Visual Mascot  */}
<div className="relative flex items-center justify-center z-10 shrink-0">
<GoiMascot pose="thumbs_up" size={160} />
</div>
</div>
</section>
</div>
</main>
<MainFooter />









    </>
  );
}

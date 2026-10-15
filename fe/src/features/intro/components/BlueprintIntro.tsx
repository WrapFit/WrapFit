"use client";

import React, { useState, useEffect, useRef } from "react";
import { animate, stagger } from "animejs";
import { Sparkles, ArrowRight, SkipForward, Layers } from "lucide-react";
import { InteractiveFoldingBox3D } from "@/features/studio/components/three/InteractiveFoldingBox3D";
import { GoiMascot } from "@/components/common/GoiMascot";


interface BlueprintIntroProps {
  onComplete: () => void;
}

export const BlueprintIntro: React.FC<BlueprintIntroProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<"blueprint" | "folding_3d">("blueprint");
  const [foldProgress, setFoldProgress] = useState<number>(0.1);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSkip = () => {
    
    if (typeof window !== "undefined") {
      sessionStorage.setItem("wrapfit_intro_seen", "true");
    }
    onComplete();
  };

  useEffect(() => {
    // 1. Vector Blueprint Stroke Animation using Anime.js
    if (!svgRef.current) return;

    
    const paths = svgRef.current.querySelectorAll("path, line, rect");
    const pathElements = Array.from(paths) as SVGGeometryElement[];
    pathElements.forEach((pathEl) => {
      if (pathEl.getTotalLength) {
        const len = pathEl.getTotalLength();
        pathEl.style.strokeDasharray = `${len}`;
        pathEl.style.strokeDashoffset = `${len}`;
      }
    });

    animate(pathElements as unknown as HTMLElement[], {
      strokeDashoffset: (el: unknown) => {
        const geo = el as SVGGeometryElement;
        return geo.getTotalLength ? geo.getTotalLength() : 500;
      },
      duration: 1800,
      delay: stagger(45),
      ease: "outCubic",
      onComplete: () => {
        // Transition to 3D folding origami phase
        setTimeout(() => {
          setPhase("folding_3d");
          

          const obj = { val: 0.1 };
          animate(obj, {
            val: 1.0,
            duration: 2200,
            ease: "inOutQuad",
            onUpdate: () => {
              setFoldProgress(obj.val);
            },
            onComplete: () => {
              
            },
          });
        }, 500);
      },
    });
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-blueprint-grid text-white p-6 sm:p-10 select-none overflow-hidden"
    >
      {/* Top Header Bar */}
      <div className="w-full max-w-5xl flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <img
            src="/branding/wrapfit-logo.png"
            alt="WrapFit Logo"
            className="h-10 w-auto object-contain bg-white/95 p-1 rounded-2xl shadow-md"
          />
          <div>
            <span className="font-serif font-bold text-lg tracking-wide text-white">
              WrapFit CAD
            </span>
            <span className="block text-cad-spec-micro font-mono text-cyan-400">
              Parametric Dieline Engine v2.4
            </span>
          </div>
        </div>

        {/* Skip Button */}
        <button
          type="button"
          onClick={handleSkip}
          className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold backdrop-blur-md transition flex items-center gap-2 text-stone-200 hover:text-white"
        >
          <span>Bỏ qua Intro</span>
          <SkipForward className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Center Stage: Blueprint Drawing or 3D Origami */}
      <div className="relative w-full max-w-3xl flex-1 flex items-center justify-center my-4 z-10">
        {phase === "blueprint" ? (
          <div className="relative w-full h-[400px] flex items-center justify-center">
            {/* SVG Blueprint Wireframe */}
            <svg
              ref={svgRef}
              viewBox="0 0 600 420"
              className="w-full h-full max-h-[380px]"
            >
              {/* Technical Grid Accent Circles */}
              <circle
                cx="300"
                cy="210"
                r="180"
                stroke="rgba(49, 130, 206, 0.25)"
                strokeWidth="1"
                fill="none"
                strokeDasharray="4 4"
              />
              <circle
                cx="300"
                cy="210"
                r="90"
                stroke="rgba(49, 130, 206, 0.2)"
                strokeWidth="0.8"
                fill="none"
              />

              {/* Dieline Panels (Center Base + Walls + Flaps) */}
              {/* Base */}
              <rect
                x="220"
                y="150"
                width="160"
                height="120"
                fill="rgba(49, 130, 206, 0.08)"
                stroke="#63B3ED"
                strokeWidth="1.5"
              />

              {/* Front Wall */}
              <rect
                x="220"
                y="270"
                width="160"
                height="80"
                fill="none"
                stroke="#E53E3E"
                strokeWidth="1.5"
              />
              {/* Rear Wall */}
              <rect
                x="220"
                y="70"
                width="160"
                height="80"
                fill="none"
                stroke="#E53E3E"
                strokeWidth="1.5"
              />
              {/* Top Lid */}
              <rect
                x="220"
                y="10"
                width="160"
                height="60"
                fill="none"
                stroke="#E53E3E"
                strokeWidth="1.5"
              />

              {/* Left Wall & Dust Flaps */}
              <rect
                x="140"
                y="150"
                width="80"
                height="120"
                fill="none"
                stroke="#3182CE"
                strokeWidth="1.5"
              />
              <path
                d="M 140 150 L 100 170 L 100 250 L 140 270"
                fill="none"
                stroke="#E53E3E"
                strokeWidth="1.5"
              />

              {/* Right Wall & Dust Flaps */}
              <rect
                x="380"
                y="150"
                width="80"
                height="120"
                fill="none"
                stroke="#3182CE"
                strokeWidth="1.5"
              />
              <path
                d="M 460 150 L 500 170 L 500 250 L 460 270"
                fill="none"
                stroke="#E53E3E"
                strokeWidth="1.5"
              />

              {/* Crease Folding Lines (Dashed Cyan) */}
              <line
                x1="220"
                y1="150"
                x2="380"
                y2="150"
                stroke="#3182CE"
                strokeWidth="1.5"
                strokeDasharray="6 4"
              />
              <line
                x1="220"
                y1="270"
                x2="380"
                y2="270"
                stroke="#3182CE"
                strokeWidth="1.5"
                strokeDasharray="6 4"
              />
              <line
                x1="220"
                y1="70"
                x2="380"
                y2="70"
                stroke="#3182CE"
                strokeWidth="1.5"
                strokeDasharray="6 4"
              />
              <line
                x1="220"
                y1="150"
                x2="220"
                y2="270"
                stroke="#3182CE"
                strokeWidth="1.5"
                strokeDasharray="6 4"
              />
              <line
                x1="380"
                y1="150"
                x2="380"
                y2="270"
                stroke="#3182CE"
                strokeWidth="1.5"
                strokeDasharray="6 4"
              />

              {/* Technical Measurements callout */}
              <text
                x="300"
                y="215"
                textAnchor="middle"
                fill="#90CDF4"
                fontSize="12"
                fontFamily="JetBrains Mono, monospace"
              >
                120 x 80 x 60 mm
              </text>
              <text
                x="300"
                y="235"
                textAnchor="middle"
                fill="#63B3ED"
                fontSize="10"
                fontFamily="sans-serif"
              >
                Tuck Top Box — 300 GSM
              </text>
            </svg>

            <div className="absolute bottom-2 text-center text-xs font-mono text-cyan-300 animate-pulse">
              Đang tính toán vector bản bế tham số...
            </div>
          </div>
        ) : (
          <div className="w-full h-[420px] max-w-xl animate-fadeIn">
            <InteractiveFoldingBox3D
              dimensions={{ length: 120, width: 80, height: 60, paperThickness: 0.38 }}
              foldProgress={foldProgress}
              theme="kraft"
              autoRotate={true}
            />
          </div>
        )}
      </div>

      {/* Bottom Action Footer */}
      <div className="w-full max-w-xl flex flex-col items-center gap-4 z-20">
        {/* Companion Mascot Badge */}
        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/20 shadow-lg">
          <GoiMascot pose={phase === "blueprint" ? "measuring" : "unboxing_pop"} size={44} />
          <div className="text-left">
            <span className="text-xs font-bold text-white block">
              {phase === "blueprint" ? "Bé Gói đang canh dao bế..." : "Tadaaa! Hộp quà đã gập xong!"}
            </span>
            <p className="text-caption text-stone-300">
              {phase === "blueprint"
                ? "Mọi chiếc hộp bắt đầu từ tọa độ dao bế chính xác tuyệt đối."
                : "Chiếc hộp 3D sẵn sàng mở ra bước vào không gian thiết kế."}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSkip}
          className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-vibrant-cobalt hover:bg-vibrant-cobalt-dark text-white font-semibold text-sm transition shadow-cobalt-glow flex items-center justify-center gap-2 group"
        >
          <span>Khám Phá WrapFit Platform</span>
          <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
};

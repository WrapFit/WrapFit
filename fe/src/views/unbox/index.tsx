"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Gift,
  Sparkles,
  Heart,
  Volume2,
  VolumeX,
  Copy,
  Check,
  RotateCcw,
  ArrowRight,
  PackageCheck,
  Share2,
} from "lucide-react";
import { InteractiveFoldingBox3D } from "@/features/studio/components/three/InteractiveFoldingBox3D";
import { GoiMascot } from "@/components/common/GoiMascot";

import { apiClient, PublicUnboxing } from "@/api";

export default function VirtualUnboxingPage() {
  // Next.js 15 passes route params to pages as a Promise; a client component reads them with useParams().
  const params = useParams<{ slug: string }>();
  const [data, setData] = useState<PublicUnboxing | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isOpened, setIsOpened] = useState<boolean>(false);
  const [copiedVoucher, setCopiedVoucher] = useState<boolean>(false);
  const confettiCanvasRef = useRef<HTMLCanvasElement>(null);

  // Fetch unboxing data from NestJS API
  useEffect(() => {
    async function loadData() {
      try {
        const res = await apiClient.getPublicUnboxing(params.slug);
        setData(res);
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [params.slug]);

  // Confetti Particle Explosion
  const fireConfetti = () => {
    const canvas = confettiCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ["#D4AF37", "#FF6B6B", "#2563EB", "#10B981", "#FAF6EE", "#FFD166"];
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      rotation: number;
      rotationSpeed: number;
    }> = [];

    // Emit 150 particles from center
    for (let i = 0; i < 160; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 12;
      particles.push({
        x: canvas.width / 2,
        y: canvas.height * 0.45,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 4,
        size: 5 + Math.random() * 8,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
      });
    }

    let frame = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.22; // gravity
        p.vx *= 0.98; // drag
        p.rotation += p.rotationSpeed;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      });

      frame++;
      if (frame < 220) {
        requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
    animate();
  };

  const handleOpenBox = () => {
    if (isOpened) return;
    
    setIsOpened(true);
    fireConfetti();
  };

  const handleCopyVoucher = () => {
    
    navigator.clipboard.writeText("WRAPFIT-GIFT-2026");
    setCopiedVoucher(true);
    setTimeout(() => setCopiedVoucher(false), 2500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#10241C] via-[#1A362B] to-[#0D1C16] text-white flex flex-col items-center justify-between p-4 sm:p-8 relative overflow-hidden font-sans select-none">
      {/* 360 Confetti Canvas Layer */}
      <canvas
        ref={confettiCanvasRef}
        className="pointer-events-none fixed inset-0 z-40"
      />

      {/* Background Star Ambient Dots */}
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#D4AF37_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

      {/* Top Header */}
      <header className="w-full max-w-6xl 2xl:max-w-7xl flex items-center justify-between z-20 pt-2">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-brand-gold hover:text-white transition"
        >
          <div className="w-8 h-8 rounded-squircle bg-brand-gold/20 border border-brand-gold/40 flex items-center justify-center font-serif font-bold text-brand-gold">
            W
          </div>
          <span className="font-serif text-lg font-bold tracking-wide">
            WrapFit Unboxing 3D
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              
              setIsOpened(false);
            }}
            className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold backdrop-blur-md transition flex items-center gap-1.5 text-stone-200"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Đóng Hộp Lại</span>
          </button>
        </div>
      </header>

      {/* Center 3D Stage & Floating Presentation */}
      <main className="w-full max-w-6xl 2xl:max-w-7xl flex-1 flex flex-col items-center justify-center my-4 sm:my-6 z-10 space-y-6">
        {/* Recipient Ribbon Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-brand-gold/20 border border-brand-gold/40 text-brand-gold text-xs font-semibold animate-pulse">
            <Gift className="w-3.5 h-3.5" />
            <span>Món Quà Dành Riêng Cho Bạn</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-serif font-bold text-white tracking-tight">
            Gửi {data?.recipientName || "Người Bạn Thân Thương"}
          </h1>
          <p className="text-xs sm:text-sm text-stone-300 font-sans max-w-md mx-auto">
            {isOpened
              ? "Chiếc hộp đã được mở! Hãy đón nhận những tình cảm chân thành nhất."
              : "Một món quà đặc biệt được thiết kế và đóng gói độc bản đang chờ bạn mở ra."}
          </p>
        </div>

        {/* 3D Box Model Stage */}
        <div className="relative w-full max-w-2xl h-[360px] sm:h-[460px] lg:h-[500px] flex items-center justify-center">
          <InteractiveFoldingBox3D
            dimensions={
              data?.box.dimensions || { length: 120, width: 80, height: 60, paperThickness: 0.38 }
            }
            foldProgress={isOpened ? 0.6 : 1.0}
            theme="gold_foil"
            customLogoText="Special Present"
            autoRotate={!isOpened}
          />

          {/* Tap to Unbox CTA Overlay (when unopened) */}
          {!isOpened && (
            <div
              onClick={handleOpenBox}
              className="absolute inset-0 z-30 cursor-pointer flex flex-col items-center justify-center bg-black/25 backdrop-blur-[2px] rounded-squircle-lg transition-all hover:bg-black/15 group"
            >
              <div className="p-4 rounded-full bg-vibrant-cobalt hover:bg-vibrant-cobalt-dark text-white shadow-cobalt-glow transform group-hover:scale-110 transition-transform flex items-center justify-center animate-bounce">
                <Sparkles className="w-7 h-7" />
              </div>
              <span className="mt-3 px-4 py-2 rounded-full bg-stone-900/90 text-white font-serif font-bold text-sm tracking-wide border border-white/20 shadow-tactile">
                Chạm Vào Để Mở Hộp Quà 🎁
              </span>
            </div>
          )}
        </div>

        {/* Greeting Card Modal / Reveal (when opened) */}
        {isOpened && (
          <div className="w-full max-w-md bg-[#FAF6EE] text-stone-900 rounded-squircle-xl p-6 border-2 border-brand-gold shadow-tactile-lg space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-[#E8D8C8] pb-3">
              <div className="flex items-center gap-2">
                <GoiMascot pose="celebration" size={38} />
                <div>
                  <span className="font-serif font-bold text-base text-brand-forest block">
                    Lời Chúc Từ Người Gửi
                  </span>
                  <span className="text-[10px] text-stone-500 font-mono">
                    Hộp Quà Kỷ Niệm WrapFit
                  </span>
                </div>
              </div>
              <Heart className="w-5 h-5 text-vibrant-coral fill-vibrant-coral animate-pulse" />
            </div>

            {/* Note text */}
            <p className="text-xs sm:text-sm text-stone-700 leading-relaxed font-serif italic bg-white/70 p-4 rounded-squircle border border-[#E8D8C8]">
              &quot;{data?.giftNote}&quot;
            </p>

            {/* Voucher Card */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-3.5 rounded-squircle border border-amber-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-amber-800 uppercase block">
                  Mã Ưu Đãi Độc Quyền
                </span>
                <span className="font-mono font-bold text-xs text-stone-900">
                  WRAPFIT-GIFT-2026
                </span>
              </div>

              <button
                type="button"
                onClick={handleCopyVoucher}
                className="px-3 py-1.5 rounded-squircle bg-white border border-amber-300 hover:bg-amber-100 text-xs font-semibold text-stone-800 transition flex items-center gap-1 shadow-sm"
              >
                {copiedVoucher ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-green-600" />
                    <span>Đã Chép</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Sao Chép</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Bottom CTA to Create Own Box */}
      <footer className="w-full max-w-xl flex flex-col sm:flex-row items-center justify-center gap-3 z-20 pb-2">
        <Link
          href="/"
          className="w-full sm:w-auto px-6 py-2.5 rounded-squircle bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold text-white transition text-center"
        >
          Khám Phá WrapFit
        </Link>
        <Link
          href="/editor/step-1"
          className="w-full sm:w-auto px-6 py-2.5 rounded-squircle bg-vibrant-cobalt hover:bg-vibrant-cobalt-dark text-white text-xs font-bold transition shadow-cobalt-glow flex items-center justify-center gap-1.5"
        >
          <span>Tự Tay Thiết Kế Hộp Quà</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </footer>
    </div>
  );
}

"use client";

import { ArrowRight, FileDown } from "lucide-react";
import React from "react";
import { DielineSketch } from "@/features/templates";
import { cn } from "@/utils/helpers";

const STEPS = [
  {
    title: "1. Chọn một mẫu hộp",
    body: "Lọc theo cấu trúc, dịp tặng hay ngành hàng và chọn mẫu gần nhất với món quà của bạn.",
    art: "pick",
  },
  {
    title: "2. Đổi kích thước theo món quà",
    body: "Nhập dài, rộng, cao và loại giấy: khuôn bế được dựng lại theo từng milimét, kể cả tai gài và tai dán.",
    art: "size",
  },
  {
    title: "3. Xuất file in",
    body: "FitCheck™ soát lỗi trước, rồi tải PDF CMYK tách lớp, SVG hay DXF cho xưởng in và máy cắt.",
    art: "export",
  },
] as const;

/** Introduction and the three steps, under the grid of the template library. */
export function HowItWorks() {
  return (
    <section className="mt-16 bg-[#F4F7FB] py-16 lg:mt-24 lg:py-20">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-10 px-4 sm:px-6 lg:px-10">
        <div className="grid grid-cols-1 gap-8 rounded-3xl bg-white p-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:p-12">
          <div>
            <span className="text-4xl" aria-hidden>
              👋
            </span>
            <h2 className="mt-4 text-2xl font-medium leading-snug text-library-ink lg:text-[28px]">
              Tạo một chiếc hộp quà ấn tượng thật dễ dàng với WrapFit!
            </h2>
          </div>
          <div className="flex flex-col gap-4 text-base leading-[1.6] text-library-sub">
            <p>
              Mất thời gian tìm một khuôn hộp vừa với món quà? Thư viện WrapFit có các mẫu hộp nắp gài, hộp bao diêm, hộp âm
              dương và hộp gối, cùng thiết kế đã qua FitCheck™ của cộng đồng.
            </p>
            <p>
              Chọn một mẫu, nhập kích thước món quà và tải file in dạng PDF, SVG hay DXF. Thiết kế công khai còn có trang 3D để
              chia sẻ và để người khác remix.
            </p>
          </div>
        </div>

        <h2 className="text-center text-2xl font-medium text-library-ink lg:text-[32px]">Làm một chiếc hộp với WrapFit thế nào?</h2>
        <ol className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {STEPS.map((step) => (
            <li key={step.title} className="flex flex-col gap-4">
              <div className="flex aspect-[4/3] items-center justify-center rounded-2xl border border-[#DCE6F2] bg-[#E8F0FA] p-6">
                <StepArt art={step.art} />
              </div>
              <h3 className="text-lg font-medium text-library-ink">{step.title}</h3>
              <p className="text-base leading-[1.6] text-library-sub">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** A small mock of the app for each step. */
function StepArt({ art }: { art: (typeof STEPS)[number]["art"] }) {
  const panel = "w-full max-w-[280px] rounded-xl bg-white p-4 shadow-panel";
  if (art === "pick") {
    return (
      <div className={panel}>
        <p className="mb-3 w-fit rounded-md bg-library-accent-mist px-2 py-1 text-xs font-medium text-library-accent">Mẫu hộp</p>
        <div className="grid grid-cols-2 gap-2">
          {(["tuck-top", "sleeve-drawer", "lid-base", "pillow"] as const).map((structure, index) => (
            <div key={structure} className={cn("flex aspect-[4/3] items-center justify-center rounded-lg bg-library-tile p-2", index === 0 && "ring-[1.5px] ring-library-accent")}>
              <DielineSketch structure={structure} dimensions={{ length: 80, width: 50, height: 60, paperThickness: 0.42 }} className="max-h-full w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (art === "size") {
    return (
      <div className={panel}>
        <p className="mb-3 w-fit rounded-md bg-library-accent-mist px-2 py-1 text-xs font-medium text-library-accent">Kích thước</p>
        {[
          ["Dài (L)", "120"],
          ["Rộng (W)", "80"],
          ["Cao (H)", "60"],
        ].map(([label, value]) => (
          <div key={label} className="mb-2 flex items-center justify-between rounded-lg border border-library-line px-3 py-2 text-sm">
            <span className="text-library-muted">{label}</span>
            <span className="text-library-ink">
              {value} <span className="text-library-muted">mm</span>
            </span>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className={panel}>
      <p className="mb-3 w-fit rounded-md bg-library-accent-mist px-2 py-1 text-xs font-medium text-library-accent">Xuất file</p>
      {["PDF CMYK", "SVG", "DXF"].map((format) => (
        <div key={format} className="mb-2 flex items-center gap-2 rounded-lg border border-library-line px-3 py-2 text-sm text-library-ink">
          <FileDown className="size-4 text-library-accent" aria-hidden />
          {format}
        </div>
      ))}
    </div>
  );
}

const MARQUEE = ["Hộp nắp gài", "Hộp bao diêm", "Hộp âm dương", "Hộp gối", "In được", "Tải được", "FitCheck™", "WrapFit Curated"];

/** Black band fixed at the bottom while the grid is on screen: running labels and a button back to the grid. */
export function StartBar({ visible, onStart }: { visible: boolean; onStart(): void }) {
  return (
    <div
      aria-hidden={!visible}
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 hidden transition-transform duration-300 md:block motion-reduce:transition-none",
        visible ? "translate-y-0" : "pointer-events-none translate-y-full"
      )}
    >
      <div className="relative h-11 overflow-hidden bg-library-lime-ink">
        <div className="flex w-max animate-marquee items-center gap-10 whitespace-nowrap py-3 text-sm text-white/90 motion-reduce:animate-none">
          {[...MARQUEE, ...MARQUEE, ...MARQUEE, ...MARQUEE].map((label, index) => (
            <span key={index} className="inline-flex items-center gap-10">
              {label}
              <span aria-hidden className="text-library-lime">
                ✱
              </span>
            </span>
          ))}
        </div>
        <button
          type="button"
          tabIndex={visible ? 0 : -1}
          onClick={onStart}
          className="absolute top-1/2 left-1/2 inline-flex h-8 -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-md bg-library-lime px-4 text-sm font-medium text-library-lime-ink shadow-panel"
        >
          Chọn một mẫu hộp để bắt đầu
          <ArrowRight className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}

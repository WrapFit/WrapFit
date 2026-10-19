"use client";

import { ArrowRight, Box, FileDown } from "lucide-react";
import React from "react";
import { DielineSketch } from "@/features/templates";
import { cn } from "@/utils/helpers";
import { PHOTOS } from "@/features/site/photos";

/** The six steps of the studio, with the names of its step bar (Cấu trúc → Xuất file). */
const STEPS = [
  { title: "Cấu trúc", body: "Chọn một mẫu ở thư viện này (WrapFit tuyển chọn hoặc Cộng đồng), hoặc chọn thẳng một cấu trúc hộp: nắp gài, bao diêm, âm dương, hộp gối.", art: "pick" },
  { title: "Kích thước", body: "Nhập dài, rộng, cao lọt lòng của món quà theo mm (hoặc cm, inch); khuôn bế dựng lại theo từng milimét, cộng cả độ dày giấy.", art: "size" },
  { title: "Chất liệu", body: "Chọn giấy Ivory, Kraft, Duplex hay Carton bồi; độ dày giấy đổi thì nếp gấp và tai gài tự tính lại.", art: "paper" },
  { title: "Thiết kế", body: "Thêm chữ, logo, sticker, bảng màu hay hoa văn AI lên từng mặt khuôn bế; FitCheck™ soát vùng an toàn 3 mm ngay khi bạn sửa.", art: "design" },
  { title: "Xem 3D", body: "Gấp thử hộp 3D, mở nắp, đổi bối cảnh và tạo mã QR mở hộp cho người nhận.", art: "view" },
  { title: "Xuất file", body: "Tải PDF CMYK tách lớp, SVG hay DXF cho xưởng in và máy cắt, hoặc đặt in 01 hộp mẫu.", art: "export" },
] as const;

/** Introduction and the six steps of the studio, under the grid of the template library. */
export function HowItWorks() {
  return (
    <section className="mt-16 bg-canvas py-16 lg:mt-24 lg:py-20">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-10 px-4 sm:px-6 lg:px-10">
        <div className="grid grid-cols-1 gap-8 rounded-3xl bg-white p-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:p-12">
          <div>
            <span className="text-4xl" aria-hidden>
              👋
            </span>
            <h2 className="mt-4 text-2xl font-medium leading-snug text-library-ink lg:text-heading-lg">
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
              chia sẻ và để người khác phối lại.
            </p>
          </div>
        </div>

        <h2 className="text-center text-2xl font-medium text-library-ink lg:text-heading-lg">Làm một chiếc hộp với WrapFit thế nào?</h2>
        <ol className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex flex-col gap-4">
              <div className="flex aspect-[4/3] items-center justify-center rounded-2xl border border-line bg-fpt-orange-light/60 p-6">
                <StepArt art={step.art} />
              </div>
              <h3 className="flex items-center gap-2.5 text-lg font-medium text-library-ink">
                <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-fpt-orange text-label-sm text-white tabular-nums">{index + 1}</span>
                {step.title}
              </h3>
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
        <p className="mb-3 w-fit rounded-md bg-fpt-orange-light px-2 py-1 text-xs font-medium text-fpt-orange-ink">Mẫu hộp</p>
        <div className="grid grid-cols-2 gap-2">
          {(["tuck-top", "sleeve-drawer", "lid-base", "pillow"] as const).map((structure, index) => (
            <div key={structure} className={cn("flex aspect-[4/3] items-center justify-center rounded-lg bg-library-tile p-2", index === 0 && "ring-[1.5px] ring-fpt-orange")}>
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
        <p className="mb-3 w-fit rounded-md bg-fpt-orange-light px-2 py-1 text-xs font-medium text-fpt-orange-ink">Kích thước</p>
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
  if (art === "paper") {
    return (
      <div className={panel}>
        <p className="mb-3 w-fit rounded-md bg-fpt-orange-light px-2 py-1 text-xs font-medium text-fpt-orange-ink">Chất liệu</p>
        {[
          ["Ivory 300 GSM", "bg-paper-ivory"],
          ["Kraft 300 GSM", "bg-paper-kraft"],
          ["Duplex 350 GSM", "bg-brand-forest"],
        ].map(([name, swatch], i) => (
          <div key={name} className={cn("mb-2 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-library-ink", i === 0 ? "border-fpt-orange" : "border-library-line")}>
            <span className={cn("size-4 rounded-full ring-1 ring-fg/15", swatch)} aria-hidden />
            {name}
          </div>
        ))}
      </div>
    );
  }
  if (art === "design") {
    return (
      <div className={panel}>
        <p className="mb-3 w-fit rounded-md bg-fpt-orange-light px-2 py-1 text-xs font-medium text-fpt-orange-ink">Thiết kế</p>
        <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-dashed border-dieline-crease bg-library-tile">
          <img src={PHOTOS.candle.src} alt={PHOTOS.candle.alt} loading="lazy" className="size-full object-cover" />
          <span className="absolute bottom-2 right-2 rounded bg-success-bg px-1.5 text-xs text-success-fg">FitCheck™ 100</span>
        </div>
      </div>
    );
  }
  if (art === "view") {
    return (
      <div className={panel}>
        <p className="mb-3 w-fit rounded-md bg-fpt-orange-light px-2 py-1 text-xs font-medium text-fpt-orange-ink">Xem 3D</p>
        <div className="flex aspect-[4/3] items-center justify-center rounded-lg bg-library-tile">
          <Box className="size-14 text-fpt-orange" strokeWidth={1.25} aria-hidden />
        </div>
      </div>
    );
  }
  return (
    <div className={panel}>
      <p className="mb-3 w-fit rounded-md bg-fpt-orange-light px-2 py-1 text-xs font-medium text-fpt-orange-ink">Xuất file</p>
      {["PDF CMYK", "SVG", "DXF"].map((format) => (
        <div key={format} className="mb-2 flex items-center gap-2 rounded-lg border border-library-line px-3 py-2 text-sm text-library-ink">
          <FileDown className="size-4 text-fpt-orange-ink" aria-hidden />
          {format}
        </div>
      ))}
    </div>
  );
}

const MARQUEE = ["Hộp nắp gài", "Hộp bao diêm", "Hộp âm dương", "Hộp gối", "In được", "Tải được", "FitCheck™", "WrapFit tuyển chọn"];

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
      <div className="relative h-11 overflow-hidden bg-fpt-orange">
        <div className="flex w-max animate-marquee items-center gap-10 whitespace-nowrap py-3 text-sm text-white/90 motion-reduce:animate-none">
          {[...MARQUEE, ...MARQUEE, ...MARQUEE, ...MARQUEE].map((label, index) => (
            <span key={index} className="inline-flex items-center gap-10">
              {label}
              <span aria-hidden className="text-fpt-orange">
                ✱
              </span>
            </span>
          ))}
        </div>
        <button
          type="button"
          tabIndex={visible ? 0 : -1}
          onClick={onStart}
          className="absolute top-1/2 left-1/2 inline-flex h-8 -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-md bg-fpt-orange px-4 text-sm font-medium text-white shadow-panel"
        >
          Chọn một mẫu hộp để bắt đầu
          <ArrowRight className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}

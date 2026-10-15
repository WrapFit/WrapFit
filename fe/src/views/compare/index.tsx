"use client";

import { Check, Minus, X } from "lucide-react";
import Link from "next/link";
import React from "react";
import { Reveal } from "@/components/landing";
import { CtaPanel, PageHero, PhotoFrame, PRIMARY_CTA, SECONDARY_CTA, Section, SitePage, WHITE_PILL } from "@/components/site";
import { PHOTOS } from "@/features/site/photos";
import { cn } from "@/utils/helpers";

// /compare: the competitor benchmark of the CP2 report (section 4), from the public websites of each tool in 2026.
// Names only, no logos.

type Mark = "yes" | "partial" | "no";
interface Cell {
  mark: Mark;
  text: string;
}

const COLUMNS = ["WrapFit", "Pacdora", "Templatemaker", "Canva", "Xưởng in offset"] as const;

const ROWS: { label: string; cells: Cell[] }[] = [
  {
    label: "Cách nhập kích thước",
    cells: [
      { mark: "yes", text: "Kích thước món quà; tự cộng độ dày giấy" },
      { mark: "partial", text: "Kích thước hộp hoặc chọn mẫu có sẵn" },
      { mark: "partial", text: "Kích thước hộp L × W × H" },
      { mark: "no", text: "Không tính kích thước hộp" },
      { mark: "partial", text: "Tư vấn trực tiếp" },
    ],
  },
  {
    label: "Khuôn bế",
    cells: [
      { mark: "yes", text: "Tự dựng, khép kín, tách lớp cắt/gấp" },
      { mark: "yes", text: "Có; xuất AI/PDF/DXF ở gói trả phí" },
      { mark: "yes", text: "PDF/DXF/SVG" },
      { mark: "no", text: "Chỉ trang vẽ 2D" },
      { mark: "partial", text: "Khuôn dao thép vật lý" },
    ],
  },
  {
    label: "Xem trước 3D",
    cells: [
      { mark: "yes", text: "Gấp từ phôi thật, mở nắp, mã QR" },
      { mark: "yes", text: "Mockup 3D" },
      { mark: "no", text: "Không quảng cáo" },
      { mark: "no", text: "Không" },
      { mark: "no", text: "Không, chỉ hộp mẫu" },
    ],
  },
  {
    label: "Kiểm tra file trước in",
    cells: [
      { mark: "yes", text: "FitCheck™: an toàn 3 mm, tràn lề 2 mm, 200 DPI, tai dán" },
      { mark: "no", text: "Không thấy kiểm tra độ vừa" },
      { mark: "no", text: "Không" },
      { mark: "no", text: "Không" },
      { mark: "partial", text: "Bản in thử vật lý" },
    ],
  },
  {
    label: "Số lượng tối thiểu",
    cells: [
      { mark: "yes", text: "Từ 1 hộp (tự in hoặc in mẫu)" },
      { mark: "partial", text: "Phần mềm, không in" },
      { mark: "partial", text: "Phần mềm, không in" },
      { mark: "partial", text: "Phần mềm, không in" },
      { mark: "no", text: "Kinh tế từ ~500 hộp" },
    ],
  },
  {
    label: "Giá",
    cells: [
      { mark: "yes", text: "Miễn phí; 19.000đ/lần xuất; 99.000đ/tháng" },
      { mark: "no", text: "Từ $29/tháng (~750.000đ)" },
      { mark: "yes", text: "Miễn phí" },
      { mark: "partial", text: "Pro $12,99/tháng (~330.000đ)" },
      { mark: "no", text: "Khuôn 1,5–2 triệu đồng mỗi kích thước" },
    ],
  },
  {
    label: "Tiếng Việt & thanh toán nội địa",
    cells: [
      { mark: "yes", text: "Giao diện tiếng Việt, VietQR / chuyển khoản" },
      { mark: "no", text: "USD, thẻ quốc tế / PayPal" },
      { mark: "no", text: "21 ngôn ngữ, không có tiếng Việt" },
      { mark: "yes", text: "Có tiếng Việt" },
      { mark: "yes", text: "Tại Việt Nam, phân tán" },
    ],
  },
];

const DIFFERENTIATORS = [
  {
    title: "Bắt đầu từ món quà, không từ chiếc hộp",
    text: "Mọi công cụ quốc tế bắt bạn biết trước kích thước ngoài của hộp. WrapFit tính khuôn từ kích thước lọt lòng của món quà và độ dày giấy.",
    image: PHOTOS.candleTube,
  },
  {
    title: "Kiểm tra lỗi in trước khi đến xưởng",
    text: "FitCheck™ chặn những lỗi khiến khoảng 90% file Canva phải vẽ lại: thiếu tràn lề, chữ sát đường cắt, ảnh một lớp.",
    image: PHOTOS.inspection,
  },
  {
    title: "Giá bằng tiền đồng, cho số lượng nhỏ",
    text: "Từ 19.000đ cho một lần xuất file thay vì $29 mỗi tháng; in mẫu từ 1 hộp thay vì khuôn dao 2 triệu.",
    image: PHOTOS.chocolate,
  },
];

const PRICE_BARS = [
  { name: "WrapFit Gói Tháng", value: 99_000, label: "99.000đ/tháng" },
  { name: "Canva Pro", value: 330_000, label: "~330.000đ/tháng" },
  { name: "Adobe Illustrator", value: 590_000, label: "~590.000đ/tháng" },
  { name: "Pacdora", value: 750_000, label: "~750.000đ/tháng" },
];

export default function ComparePage() {
  const max = Math.max(...PRICE_BARS.map((bar) => bar.value));
  return (
    <SitePage>
      <PageHero
        title="Vì sao chọn WrapFit?"
        subtitle="So với Pacdora, Canva và xưởng in offset."
        lead="Canva giỏi đồ hoạ, Pacdora có kho mockup lớn, xưởng offset rẻ khi in hàng nghìn hộp. WrapFit dành cho người bán cần 20–50 chiếc hộp vừa khít, file in đúng ngay lần đầu."
        actions={
          <>
            <Link href="/editor/demo" className={PRIMARY_CTA}>
              Thử WrapFit miễn phí
            </Link>
            <a href="#bang" className={SECONDARY_CTA}>
              Xem bảng so sánh
            </a>
          </>
        }
        aside={
          <div className="grid grid-cols-2 gap-3">
            <PhotoFrame image={{ ...PHOTOS.pallets, caption: "Xưởng offset: in sẵn hàng nghìn hộp" }} className="aspect-[3/4]" />
            <PhotoFrame image={{ ...PHOTOS.kraftTuck, caption: "Hộp WrapFit: vừa khít món quà" }} className="aspect-[3/4]" />
          </div>
        }
      />

      <Section id="bang" title="So sánh chi tiết" lead="Theo thông tin công khai trên website của từng công cụ, năm 2026.">
        <Reveal>
          <div className="relative -mx-4 overflow-x-auto px-4 pb-2">
            <table className="w-full min-w-[920px] border-separate border-spacing-0 overflow-hidden rounded-card bg-white text-left text-sm ring-1 ring-landing-ink/10">
              <thead>
                <tr>
                  <th scope="col" className="w-44 px-5 py-4 text-xs font-semibold uppercase tracking-wide text-landing-muted">
                    Tiêu chí
                  </th>
                  {COLUMNS.map((column, index) => (
                    <th key={column} scope="col" className={cn("px-4 py-4 font-landing-heading text-base font-bold", index === 0 && "bg-landing-green-night text-white")}>
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr key={row.label}>
                    <th scope="row" className="border-t border-landing-line/60 px-5 py-4 align-top font-semibold">
                      {row.label}
                    </th>
                    {row.cells.map((cell, index) => (
                      <td key={index} className={cn("border-t px-4 py-4 align-top", index === 0 ? "border-white/10 bg-landing-green-night text-landing-lime-mist" : "border-landing-line/60 text-landing-muted")}>
                        <span className="flex gap-2">
                          <MarkIcon mark={cell.mark} dark={index === 0} />
                          <span className="leading-snug">{cell.text}</span>
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
      </Section>

      <Section title="Ba điều chỉ WrapFit làm" href="/features">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {DIFFERENTIATORS.map((item) => (
            <Reveal key={item.title} className="h-full">
              <article className="flex h-full flex-col overflow-hidden rounded-card bg-white ring-1 ring-landing-ink/10 lg:rounded-card-lg">
                <PhotoFrame image={item.image} className="aspect-[4/3] rounded-none lg:rounded-none" />
                <div className="flex flex-col gap-2 p-6 sm:p-7">
                  <h3 className="font-landing-heading text-xl font-bold leading-snug lg:text-2xl">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-landing-muted">{item.text}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section title="Chi phí mỗi tháng" lead="Giá niêm yết, quy đổi khoảng 25.500đ/USD. WrapFit còn có lựa chọn trả theo lần: 19.000đ cho mỗi lần xuất file." band>
        <ul className="flex flex-col gap-5">
          {PRICE_BARS.map((bar, index) => (
            <li key={bar.name} className="grid grid-cols-[120px_minmax(0,1fr)] items-center gap-4 sm:grid-cols-[200px_minmax(0,1fr)]">
              <span className={cn("text-sm font-semibold sm:text-base", index === 0 && "text-landing-green-deep")}>{bar.name}</span>
              <span className="flex items-center gap-3">
                <span className={cn("h-4 rounded-full", index === 0 ? "bg-landing-lime" : "bg-landing-tile")} style={{ width: `${Math.max(8, (bar.value / max) * 100)}%` }} />
                <span className="shrink-0 font-mono text-xs text-landing-muted sm:text-sm">{bar.label}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm text-landing-muted">
          Người bán và chuyên gia ngành in nói gì về bao bì số lượng nhỏ:{" "}
          <Link href="/testimonials" className="font-semibold text-landing-green-deep">
            xem trang khách hàng
          </Link>
          .
        </p>
      </Section>

      <CtaPanel
        title="Thử với món quà thật của bạn"
        body="Nhập kích thước, xem khuôn và hộp 3D trong studio dùng thử. Không cần tài khoản, không cần thẻ."
        actions={
          <>
            <Link href="/editor/demo" className={PRIMARY_CTA}>
              Mở studio dùng thử
            </Link>
            <Link href="/pricing" className={WHITE_PILL}>
              Xem bảng giá
            </Link>
          </>
        }
      />
    </SitePage>
  );
}

function MarkIcon({ mark, dark }: { mark: Mark; dark?: boolean }) {
  const base = "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full";
  if (mark === "yes")
    return (
      <span className={cn(base, "bg-landing-lime text-landing-green-night")} aria-label="Có">
        <Check className="size-3" strokeWidth={3} aria-hidden />
      </span>
    );
  if (mark === "partial")
    return (
      <span className={cn(base, dark ? "bg-white/15 text-white" : "bg-warning-bg text-warning-fg")} aria-label="Một phần">
        <Minus className="size-3" strokeWidth={3} aria-hidden />
      </span>
    );
  return (
    <span className={cn(base, "bg-danger-bg text-danger-fg")} aria-label="Không">
      <X className="size-3" strokeWidth={3} aria-hidden />
    </span>
  );
}

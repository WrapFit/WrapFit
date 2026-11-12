"use client";

import Image from "next/image";
import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import React from "react";
import { BLEED_MM, MIN_DPI, SAFE_MARGIN_CUT_MM } from "@wrapfit/shared";
import { Container, Reveal } from "@/components/landing";
import { CheckList, PageHero, PhotoFrame, PRIMARY_CTA, SECONDARY_CTA, Section, SitePage, StatGrid } from "@/components/site";
import { formatVnd, PLANS, SINGLE_EXPORT_PRICE } from "@/features/pricing";
import { PHOTOS } from "@/features/site/photos";
import { Box3DView } from "@/features/studio/components/three/Box3DView";
import { DielineSketch } from "@/features/templates/components/DielineSketch";
import { cn } from "@/utils/helpers";

// /features: what the studio does, as a pack.ly bento of large tiles, then the two ways sellers use it (the two tracks
// of the CP2 report, 6.2.1: early makers and brand builders). The home page tells the journey of one box; this page
// lists the capabilities. "Useful" shares come from the CP2 survey (N = 109, 4–5 on a 5-point scale).

const SAMPLE = { length: 120, width: 80, height: 60, paperThickness: 0.42 };

function Proof({ value, text }: { value: string; text: string }) {
  return (
    <p className="flex items-baseline gap-2 text-sm text-landing-muted">
      <span className="font-landing-heading text-xl font-bold text-landing-ink">{value}</span>
      {text}
    </p>
  );
}

/** Large white tile with a visual on top (pack.ly feature card). */
function Tile({ title, text, proof, href, cta, visual, className, visualClass }: { title: string; text: string; proof?: { value: string; text: string }; href: string; cta: string; visual: React.ReactNode; className?: string; visualClass?: string }) {
  return (
    <Reveal className={cn("h-full", className)}>
      <article className="flex h-full flex-col overflow-hidden rounded-card bg-white ring-1 ring-landing-ink/10 lg:rounded-card-lg">
        <div className={cn("relative h-64 overflow-hidden bg-landing-tile sm:h-72", visualClass)}>{visual}</div>
        <div className="flex flex-1 flex-col gap-3 p-6 sm:p-8">
          <h3 className="font-landing-heading text-2xl font-bold leading-tight tracking-tight lg:text-3xl">{title}</h3>
          <p className="text-base leading-relaxed text-landing-muted">{text}</p>
          <div className="mt-auto flex flex-col gap-4 pt-3 sm:flex-row sm:items-center sm:justify-between">
            {proof ? <Proof {...proof} /> : <span />}
            <Link href={href} className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-landing-ink">
              {cta}
              <span className="inline-flex size-7 items-center justify-center rounded-full bg-landing-tile transition-transform group-hover:translate-x-0.5">
                <ArrowRight className="size-4" aria-hidden />
              </span>
            </Link>
          </div>
        </div>
      </article>
    </Reveal>
  );
}

const photoFill = (image: { src: string; alt: string }) => <Image src={image.src} alt={image.alt} fill sizes="(min-width: 1024px) 33vw, 100vw" className="object-cover" />;

const TRACKS = [
  {
    title: "Mới bắt đầu bán quà",
    who: "Người bán một mình hoặc chuẩn bị ra mắt — 65% người trả lời khảo sát",
    image: PHOTOS.candle,
    price: `Miễn phí · ${formatVnd(SINGLE_EXPORT_PRICE)} mỗi lượt xuất file`,
    points: ["Nhập kích thước món quà, có khuôn ngay", "Xem hộp 3D trước khi in", "PDF A4/A3 có dấu xén để in và cắt tại nhà", "In 1 hộp mẫu trước khi đặt 20–50 hộp"],
    href: "/editor/demo",
    cta: "Dùng thử không cần tài khoản",
  },
  {
    title: "Thương hiệu đang lớn",
    who: "Nhóm 2–3 người đã có logo — 35% người trả lời khảo sát",
    image: PHOTOS.cosmetics,
    price: `${formatVnd(PLANS.STARTER.price.monthly)}/tháng · xuất file không giới hạn`,
    points: ["Bộ nhận diện: logo, màu, phông chữ dùng lại cho mọi hộp", "FitCheck™ trước mỗi lần gửi xưởng", "PDF CMYK tách lớp, SVG, DXF cho máy cắt", "Đặt in mẫu qua xưởng đối tác"],
    href: "/pricing",
    cta: `Xem gói ${PLANS.STARTER.name}`,
  },
];

export default function FeaturesPage() {
  return (
    <SitePage>
      <PageHero
        title="Mọi thứ để làm một chiếc hộp quà"
        subtitle="từ số đo món quà đến file in chuẩn xưởng."
        lead="Dựng khuôn bế theo milimét, thiết kế từng mặt hộp, kiểm tra lỗi in, xem hộp gấp 3D và xuất file tách lớp — trong một studio, ngay trên trình duyệt."
        actions={
          <>
            <Link href="/editor/demo" className={PRIMARY_CTA}>
              Dùng thử miễn phí <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link href="/pricing" className={SECONDARY_CTA}>
              Xem bảng giá
            </Link>
          </>
        }
        image={{ ...PHOTOS.designer, caption: "Khuôn 2D và hộp 3D cạnh nhau." }}
      />

      <Section title="Tính năng chính" lead="Bốn cấu trúc hộp quà, một quy trình từ đo đến in.">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Tile
            title="Khuôn bế dựng quanh món quà"
            text="Nhập kích thước lọt lòng; khuôn tự cộng độ dày giấy ở mỗi nếp gập, kể cả tai gài và tai dán. Hộp vừa khít ngay lần đầu."
            proof={{ value: "70,6%", text: "thấy tự dựng khuôn hữu ích" }}
            href="/structures/tuck-top"
            cta="Xem 4 cấu trúc"
            visualClass="bg-mist-150 bg-[radial-gradient(#D5DCCF_1px,transparent_1px)] [background-size:14px_14px]"
            visual={<DielineSketch structure="tuck-top" dimensions={SAMPLE} className="absolute inset-6 h-[calc(100%-3rem)] w-[calc(100%-3rem)]" label="Khuôn bế hộp nắp gài 120 × 80 × 60 mm" />}
          />
          <Tile
            title="Hộp gấp 3D, xoay được"
            text="Kéo thanh gấp từ tấm phẳng đến hộp đóng kín, mở nắp, đổi giấy và bối cảnh — thấy chiếc hộp trước khi tốn một tờ giấy."
            proof={{ value: "74,3%", text: "thấy mô phỏng 3D hữu ích" }}
            href="/editor/demo"
            cta="Mở studio"
            visualClass="bg-[radial-gradient(120%_85%_at_50%_28%,#FFFFFF_0%,#F4F6F2_52%,#E3E8E0_100%)]"
            visual={<Box3DView dimensions={SAMPLE} foldProgress={1} boxType="tuck-top" theme="kraft" environment="transparent" showHud={false} showStatusBar={false} enableMacroZoom={false} viewControls={false} autoRotate frameless minHeight={false} className="h-full w-full" />}
          />
        </div>
        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          <Tile
            title="FitCheck™ trước khi in"
            text={`Vùng an toàn ${SAFE_MARGIN_CUT_MM} mm, tràn lề ${BLEED_MM} mm, ảnh ${MIN_DPI} DPI, mép dán sạch mực. Sửa lỗi bằng một cú bấm.`}
            proof={{ value: "74,3%", text: "thấy hữu ích" }}
            href="/support?a=fitcheck-kiem-tra-gi"
            cta="Đọc thêm"
            visualClass="bg-landing-green-night"
            visual={
              <div className="absolute inset-0 flex flex-col justify-center gap-2 p-6">
                {["Vùng an toàn", "Tràn lề", "Mép dán keo", "Độ phân giải ảnh"].map((rule) => (
                  <span key={rule} className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-2.5 text-sm text-white ring-1 ring-white/10">
                    {rule}
                    <span className="inline-flex items-center gap-1 rounded-full bg-fpt-orange px-2 py-0.5 text-xs font-semibold text-white">
                      <Check className="size-3" strokeWidth={3} aria-hidden /> Đạt
                    </span>
                  </span>
                ))}
              </div>
            }
          />
          <Tile
            title="File in chuẩn xưởng"
            text="PDF CMYK 4 lớp (cắt, gấp, hình in, kích thước), SVG và DXF cho máy cắt, PDF A4/A3 để in tại nhà."
            proof={{ value: "73,4%", text: "thấy hữu ích" }}
            href="/support?a=dinh-dang-xuat"
            cta="Mang file đi in"
            visual={photoFill(PHOTOS.offset)}
          />
          <Tile
            title="Hoa văn AI & bộ nhận diện"
            text="Gõ phong cách (Tết, pastel, vintage) để có hoa văn lặp; lưu logo, màu và phông của cửa hàng để dùng lại."
            proof={{ value: "67%", text: "thấy hoa văn AI hữu ích" }}
            href="/templates"
            cta="Xem thư viện mẫu"
            visual={photoFill(PHOTOS.sketching)}
          />
        </div>
        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Tile
            title="Mã QR mở hộp 3D"
            text="In mã dưới đáy hộp: người nhận quét để mở chiếc hộp 3D cùng lời chúc và hiệu ứng bạn chọn."
            href="/unbox"
            cta="Thử mở một hộp"
            visual={photoFill(PHOTOS.giftHands)}
          />
          <Tile
            title="In 1 hộp mẫu qua xưởng đối tác"
            text="Đặt 1–10 hộp mẫu từ dự án để kiểm tra màu giấy và độ vừa, trước khi in số lượng trên máy cắt kỹ thuật số."
            proof={{ value: "90,8%", text: "muốn có hộp mẫu thật" }}
            href="/cart"
            cta="Mở giỏ in mẫu"
            visual={photoFill(PHOTOS.kraftDrawer)}
          />
        </div>
      </Section>

      <Section title="Hai cách dùng WrapFit" lead="Cùng một công cụ khuôn bế, hai nhu cầu khác nhau mà khảo sát 109 người bán cho thấy." band>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {TRACKS.map((track) => (
            <Reveal key={track.title}>
              <article className="grid h-full grid-cols-1 overflow-hidden rounded-card bg-landing-canvas sm:grid-cols-[0.9fr_1.1fr] lg:rounded-card-lg">
                <PhotoFrame image={track.image} className="min-h-56 rounded-none lg:rounded-none" />
                <div className="flex flex-col gap-4 p-6 sm:p-8">
                  <div>
                    <h3 className="font-landing-heading text-2xl font-bold tracking-tight">{track.title}</h3>
                    <p className="mt-1 text-sm text-landing-muted">{track.who}</p>
                  </div>
                  <CheckList items={track.points} />
                  <p className="mt-auto text-sm font-semibold text-fpt-orange-ink">{track.price}</p>
                  <Link href={track.href} className={cn(SECONDARY_CTA, "w-fit")}>
                    {track.cta}
                  </Link>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </Section>

      <Container className="py-10">
        <StatGrid
          stats={[
            { value: "109", label: "người bán quà góp ý xây dựng WrapFit", source: "Khảo sát 10/2026" },
            { value: "67%", label: "chỉ cần 50 hộp trở xuống mỗi lần", source: "Khảo sát 10/2026" },
            { value: "4", label: "cấu trúc hộp quà dựng theo milimét" },
            { value: "1 hộp", label: "là đủ để đặt in mẫu" },
          ]}
        />
      </Container>

    </SitePage>
  );
}

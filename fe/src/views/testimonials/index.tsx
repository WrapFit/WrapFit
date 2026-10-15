"use client";

import { PlayCircle, Quote } from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import { Container, Reveal } from "@/components/landing";
import { CustomerVoices } from "@/components/home/CustomerVoices";
import { CtaPanel, PageHero, PhotoFrame, PRIMARY_CTA, SampleBadge, Section, SitePage, StatGrid, WHITE_PILL } from "@/components/site";
import { PHOTOS, type SitePhoto } from "@/features/site/photos";
import { cn } from "@/utils/helpers";

// /testimonials. Two kinds of voices, kept apart: what sellers and experts told us in the CP2 research (real quotes,
// anonymised like the report), then the trial-session reviews of the home page (its own carousel, labelled as sample).

const USE_CASES: { id: string; label: string; image: SitePhoto }[] = [
  { id: "all", label: "Tất cả", image: PHOTOS.kraftTuck },
  { id: "nen", label: "Nến thơm", image: PHOTOS.candleBox },
  { id: "gom", label: "Gốm sứ & decor", image: PHOTOS.whiteBox },
  { id: "banh", label: "Bánh & trà", image: PHOTOS.chocolate },
  { id: "doanh-nghiep", label: "Quà doanh nghiệp", image: PHOTOS.lacquerBox },
];

const RESEARCH: { quote: string; who: string; detail: string; useCase: string }[] = [
  { quote: "Không biết xưởng nào nhận in vì số lượng quá ít, chưa đến 10 bao bì.", who: "Người bán chuẩn bị ra mắt", detail: "Khảo sát 10/2026 · bánh, trang sức", useCase: "banh" },
  { quote: "Form hộp chưa chuẩn để bỏ vừa sản phẩm, vì là đồ gốm sứ dễ vỡ nên form hộp phải khít.", who: "Nhóm 2–3 người", detail: "Khảo sát 10/2026 · gốm sứ", useCase: "gom" },
  { quote: "Logo trên màn hình màu xanh mint, nhưng khi nhận hàng, cả vỏ hộp ngả sang xanh lá đậm và tối.", who: "Thương hiệu nến thơm", detail: "Khảo sát 10/2026 · nến thơm", useCase: "nen" },
  { quote: "Cần đặt số lượng vừa đủ xài nhưng xưởng không nhận vì số lượng quá ít.", who: "Nhóm 4+ người", detail: "Khảo sát 10/2026 · decor, quà tặng", useCase: "doanh-nghiep" },
  { quote: "Chất lượng bao bì kém, bị bung ra trong quá trình vận chuyển.", who: "Người bán một mình", detail: "Khảo sát 10/2026 · hoa, nến thơm", useCase: "nen" },
  { quote: "Mỗi tuần có cả chục người bán nến, mỹ phẩm handmade hỏi làm 30–50 hộp theo kích thước riêng.", who: "Chuyên gia chế bản, xưởng in kỹ thuật số", detail: "Phỏng vấn chuyên gia 10/2026", useCase: "nen" },
  { quote: "Startup chưa đủ vốn và chưa chắc sản lượng để đặt 10.000 hộp cho mỗi mã hàng.", who: "Nhà sáng lập, tư vấn bao bì OEM/ODM 5 năm", detail: "Phỏng vấn chuyên gia 10/2026", useCase: "doanh-nghiep" },
];

const VIDEOS = [
  { title: "Hộp quà Tết thắt nơ, mở bằng mã QR", image: PHOTOS.tetGift },
  { title: "Khuyên tai bạc trong hộp gối kraft", image: PHOTOS.kraftPillow },
  { title: "Hộp nắp rời ép kim cho set mỹ phẩm", image: PHOTOS.greenLid },
];

export default function TestimonialsPage() {
  const [useCase, setUseCase] = useState("all");
  const research = RESEARCH.filter((item) => useCase === "all" || item.useCase === useCase);

  return (
    <SitePage>
      <PageHero
        title="Người bán quà nói gì"
        subtitle="về chiếc hộp của họ."
        lead="WrapFit bắt đầu từ những câu chuyện thật: hộp không vừa, xưởng không nhận đơn nhỏ, màu in lệch. Đây là tiếng nói đã định hình sản phẩm."
        aside={
          <div className="grid h-[420px] grid-cols-2 grid-rows-2 gap-3 lg:h-[480px]">
            <PhotoFrame image={PHOTOS.candleBox} className="row-span-2" />
            <PhotoFrame image={PHOTOS.kraftPillow} />
            <PhotoFrame image={PHOTOS.teaBags} />
          </div>
        }
      />

      <Container className="pb-4">
        <StatGrid
          stats={[
            { value: "109", label: "người bán quà tham gia khảo sát", source: "4–6/10/2026" },
            { value: "74,3%", label: "thấy mô phỏng gấp 3D hữu ích", source: "Khảo sát CP2" },
            { value: "65,1%", label: "sẵn sàng đặt in qua xưởng của WrapFit", source: "Khảo sát CP2" },
            { value: "2", label: "chuyên gia ngành in & bao bì phỏng vấn sâu", source: "10/2026" },
          ]}
        />
      </Container>

      <Section title="Câu chuyện theo ngành hàng" lead="Trích từ khảo sát và phỏng vấn chuyên gia, ẩn danh như trong báo cáo nghiên cứu.">
        <nav aria-label="Ngành hàng" className="-mx-1 mb-6 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
          {USE_CASES.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={useCase === item.id}
              onClick={() => setUseCase(item.id)}
              className={cn(
                "inline-flex h-11 shrink-0 items-center gap-2 rounded-full py-1 pl-1 pr-4 text-sm font-medium transition-colors",
                useCase === item.id ? "bg-landing-ink text-white" : "bg-white ring-1 ring-landing-line hover:bg-landing-tile/60"
              )}
            >
              <img src={item.image.src} alt="" className="size-9 rounded-full object-cover" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {research.map((item) => (
            <Reveal as="article" key={item.quote} className="h-full">
              <div className="flex h-full flex-col rounded-card bg-white p-6 ring-1 ring-landing-ink/10 sm:p-8">
                <Quote className="size-8 text-landing-lime" aria-hidden />
                <blockquote className="mt-4 flex-1 font-landing-heading text-xl font-semibold leading-snug">{item.quote}</blockquote>
                <p className="mt-6 text-sm font-semibold">{item.who}</p>
                <p className="text-xs text-landing-muted">{item.detail}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <div className="flex justify-center pt-6">
        <SampleBadge />
      </div>
      <CustomerVoices />

      <Section title="Video mở hộp" lead="Video từ người dùng sẽ được đăng khi bản thương mại ra mắt. Trong lúc chờ, hãy tự mở thử một chiếc hộp 3D bằng mã QR.">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {VIDEOS.map((video) => (
            <Link key={video.title} href="/unbox" className="group block">
              <PhotoFrame image={{ ...video.image, caption: video.title }} className="aspect-[4/5]">
                <span className="absolute inset-0 flex items-center justify-center">
                  <PlayCircle className="size-16 text-white drop-shadow-lg transition-transform group-hover:scale-110" aria-hidden />
                </span>
              </PhotoFrame>
            </Link>
          ))}
        </div>
      </Section>

      <CtaPanel
        title="Kể câu chuyện chiếc hộp của bạn"
        body="Dùng WrapFit cho sản phẩm của mình và muốn chia sẻ? Chúng tôi tặng một hộp in mẫu cho mỗi câu chuyện được đăng."
        actions={
          <>
            <Link href="/editor/demo" className={PRIMARY_CTA}>
              Thiết kế hộp ngay
            </Link>
            <Link href="/contact" className={WHITE_PILL}>
              Gửi câu chuyện
            </Link>
          </>
        }
      />
    </SitePage>
  );
}

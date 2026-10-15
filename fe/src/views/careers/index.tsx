"use client";

import { ChevronDown, Clock, Coffee, GraduationCap, Laptop, MapPin, PackageOpen, Rocket, Sprout } from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import { Container, Reveal } from "@/components/landing";
import { CheckList, CtaPanel, IconTile, PageHero, PhotoFrame, PRIMARY_CTA, SECONDARY_CTA, Section, SitePage, StatGrid, WHITE_PILL } from "@/components/site";
import { PHOTOS } from "@/features/site/photos";
import { TEAM_AREAS, type TeamArea } from "@/features/site/company";
import { cn } from "@/utils/helpers";

// /careers: the roles WrapFit needs for its go-to-market (CP2 report 6.2.2: TikTok unboxing content, maker guilds,
// print-shop partners) and its product. Applications go by email.

const UPDATED = "13/10/2026";

interface Job {
  id: string;
  title: string;
  area: TeamArea;
  type: string;
  place: string;
  summary: string;
  tasks: string[];
  needs: string[];
}

const JOBS: Job[] = [
  {
    id: "designer",
    title: "Cộng tác viên thiết kế bao bì",
    area: "khach-hang",
    type: "Bán thời gian · 10–15 giờ/tuần",
    place: "Từ xa",
    summary: "Tạo mẫu hộp WrapFit Curated cho nến, trà, trang sức và mùa Tết 2027.",
    tasks: ["Thiết kế 8–10 mẫu hộp mỗi tháng trên studio WrapFit", "Kiểm tra mẫu đạt FitCheck™ 100 điểm trước khi đăng", "Gấp thử hộp in mẫu và chụp ảnh sản phẩm"],
    needs: ["Có portfolio đồ hoạ hoặc bao bì", "Hiểu tràn lề, vùng an toàn là một lợi thế", "Yêu đồ thủ công"],
  },
  {
    id: "content",
    title: "Nội dung & cộng đồng (TikTok, Reels)",
    area: "khach-hang",
    type: "Bán thời gian",
    place: "Hà Nội hoặc từ xa",
    summary: "Kể câu chuyện “biến hộp carton thành hộp quà sang trong 3 phút” cho người bán nhỏ.",
    tasks: ["Quay và dựng video mở hộp, trước/sau", "Chăm sóc nhóm người bán handmade trên Facebook, Zalo", "Viết bài cho blog WrapFit"],
    needs: ["Đã làm nội dung ngắn có lượt xem thật", "Viết tiếng Việt gọn, rõ", "Thích nói chuyện với chủ shop"],
  },
  {
    id: "3d",
    title: "Thực tập sinh kỹ sư 3D / WebGL",
    area: "cong-nghe",
    type: "Thực tập · 3–6 tháng",
    place: "Đại học FPT Hòa Lạc",
    summary: "Cùng làm studio: gấp hộp từ phôi, vật liệu giấy và hiệu năng trên điện thoại.",
    tasks: ["Thêm cấu trúc hộp mới vào bộ dựng 3D", "Tối ưu khung hình trên máy cấu hình thấp", "Viết kiểm thử cho công thức khuôn bế"],
    needs: ["TypeScript, React", "Đã dùng three.js hoặc rất muốn học", "Không ngại hình học và ma trận"],
  },
  {
    id: "partners",
    title: "Phát triển đối tác xưởng in",
    area: "kinh-doanh",
    type: "Cộng tác · theo hoa hồng",
    place: "Hà Nội, TP.HCM",
    summary: "Kết nối xưởng cắt kỹ thuật số nhận đơn 20–50 hộp vào mạng lưới WrapFit Print.",
    tasks: ["Gặp và giới thiệu WrapFit cho xưởng in", "Thống nhất bảng giá in mẫu và thời gian giao", "Theo dõi chất lượng đơn đầu tiên"],
    needs: ["Đã làm trong ngành in hoặc bao bì", "Giao tiếp tốt, chủ động", "Có xe máy để đi xưởng"],
  },
];

const BENEFITS = [
  { icon: Rocket, title: "Làm sản phẩm thật", text: "Thứ bạn làm được người bán dùng trong tuần, không nằm trong ngăn kéo." },
  { icon: Laptop, title: "Linh hoạt", text: "Làm từ xa, tự chọn giờ; họp nhóm một buổi mỗi tuần." },
  { icon: GraduationCap, title: "Học từ chuyên gia", text: "Gặp kỹ thuật viên xưởng in, học chế bản và máy cắt từ người trong nghề." },
  { icon: PackageOpen, title: "Hộp mẫu miễn phí", text: "In hộp mẫu không giới hạn cho dự án cá nhân của bạn." },
  { icon: Sprout, title: "Cổ phần cho người ở lại", text: "Thành viên gắn bó sau giai đoạn thử nghiệm được bàn chuyện cổ phần." },
  { icon: Coffee, title: "Cà phê đặc sản", text: "Từ cố vấn của chúng tôi, mỗi buổi họp." },
];

export default function CareersPage() {
  const [open, setOpen] = useState<string | null>(JOBS[0].id);
  const [area, setArea] = useState<TeamArea | "all">("all");
  const jobs = JOBS.filter((job) => area === "all" || job.area === area);

  return (
    <SitePage>
      <PageHero
        title="Cùng làm bao bì vừa khít"
        subtitle="cho người bán quà Việt Nam."
        lead="WrapFit ra đời từ một chuyện vô lý: muốn 30 chiếc hộp vừa khít thì xưởng đòi 500 cái và 2 triệu tiền khuôn. Chúng tôi đang sửa chuyện đó bằng phần mềm — và cần thêm người."
        actions={
          <>
            <a href="#vi-tri" className={PRIMARY_CTA}>
              Xem {JOBS.length} vị trí đang mở
            </a>
            <Link href="/about#doi-ngu" className={SECONDARY_CTA}>
              Gặp đội ngũ
            </Link>
          </>
        }
        meta={`Cập nhật ngày ${UPDATED}`}
        image={{ ...PHOTOS.inspection, caption: "Mỗi tuần, cả nhóm cùng soi tờ in và gấp thử hộp mẫu với xưởng đối tác." }}
      />

      <Container className="pb-4">
        <StatGrid
          stats={[
            { value: "6", label: "thành viên sáng lập" },
            { value: "3", label: "nhóm: công nghệ, kinh doanh, khách hàng" },
            { value: "2", label: "nơi làm việc: Hòa Lạc và từ xa" },
            { value: "109", label: "người bán đã kể cho chúng tôi nghe về hộp" },
          ]}
        />
      </Container>

      <Section title="Quyền lợi" band>
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((benefit) => (
            <li key={benefit.title} className="flex gap-4 rounded-3xl bg-landing-canvas p-5">
              <IconTile icon={benefit.icon} />
              <div>
                <p className="font-semibold">{benefit.title}</p>
                <p className="text-sm leading-relaxed text-landing-muted">{benefit.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="vi-tri" title="Vị trí đang mở" lead="Chưa thấy vị trí hợp với bạn? Vẫn gửi email, kể cho chúng tôi bạn muốn làm gì.">
        <nav aria-label="Nhóm" className="-mx-1 mb-5 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
          {(["all", ...Object.keys(TEAM_AREAS)] as (TeamArea | "all")[]).map((id) => (
            <button key={id} type="button" aria-pressed={area === id} onClick={() => setArea(id)} className={cn("h-9 shrink-0 rounded-full px-4 text-sm font-medium", area === id ? "bg-landing-ink text-white" : "bg-white ring-1 ring-landing-line hover:bg-landing-tile/60")}>
              {id === "all" ? "Tất cả" : TEAM_AREAS[id].label}
            </button>
          ))}
        </nav>
        <ul className="flex flex-col gap-3">
          {jobs.map((job) => {
            const expanded = open === job.id;
            return (
              <li key={job.id} className="overflow-hidden rounded-card bg-white ring-1 ring-landing-ink/10">
                <button type="button" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : job.id)} className="flex w-full flex-col gap-3 p-6 text-left sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold text-landing-green-deep">{TEAM_AREAS[job.area].label}</p>
                    <p className="font-landing-heading text-xl font-bold">{job.title}</p>
                    <p className="mt-1 text-sm text-landing-muted">{job.summary}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 rounded-full bg-landing-canvas px-3 py-1">
                      <Clock className="size-3.5" aria-hidden /> {job.type}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-landing-canvas px-3 py-1">
                      <MapPin className="size-3.5" aria-hidden /> {job.place}
                    </span>
                    <ChevronDown className={cn("size-5 transition-transform", expanded && "rotate-180")} aria-hidden />
                  </div>
                </button>
                {expanded && (
                  <div className="grid grid-cols-1 gap-6 border-t border-landing-line/60 p-6 md:grid-cols-[1fr_1fr_auto]">
                    <div>
                      <p className="mb-2 text-sm font-semibold">Bạn sẽ làm</p>
                      <CheckList items={job.tasks} />
                    </div>
                    <div>
                      <p className="mb-2 text-sm font-semibold">Chúng tôi tìm</p>
                      <CheckList items={job.needs} />
                    </div>
                    <a href={`mailto:jobs@wrapfit.vn?subject=${encodeURIComponent(`Ứng tuyển: ${job.title}`)}`} className={cn(PRIMARY_CTA, "self-start")}>
                      Ứng tuyển
                    </a>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Section>

      <Section title="Làm việc ở đâu">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {[
            { image: PHOTOS.offset, title: "Đại học FPT Hòa Lạc & xưởng đối tác", text: "Khu Công nghệ cao Hòa Lạc, Km29 Đại lộ Thăng Long, Hà Nội. Họp nhóm và gấp hộp mẫu mỗi tuần." },
            { image: PHOTOS.designer, title: "Từ xa, trong giờ của bạn", text: "Phần lớn công việc làm qua Zalo, Google Meet và chính studio WrapFit." },
          ].map((place) => (
            <Reveal key={place.title}>
              <article className="overflow-hidden rounded-card bg-white ring-1 ring-landing-ink/10 lg:rounded-card-lg">
                <PhotoFrame image={place.image} className="aspect-[16/9] rounded-none lg:rounded-none" />
                <div className="flex gap-3 p-6 sm:p-8">
                  <MapPin className="mt-1 size-5 shrink-0 text-fpt-orange-ink" aria-hidden />
                  <div>
                    <p className="font-landing-heading text-xl font-bold">{place.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-landing-muted">{place.text}</p>
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section title="Một tuần ở WrapFit">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {[
            { ...PHOTOS.foil, caption: "Thứ Hai: thử ép kim và giấy mới cùng xưởng" },
            { ...PHOTOS.sketching, caption: "Thứ Tư: phác thảo mẫu hộp cho mùa Tết" },
            { ...PHOTOS.delivery, caption: "Thứ Sáu: giao hộp mẫu đến tay người bán" },
          ].map((image) => (
            <Reveal key={image.caption}>
              <PhotoFrame image={image} className="aspect-[4/5]" />
            </Reveal>
          ))}
        </div>
      </Section>

      <CtaPanel
        title="Chưa thấy vị trí hợp với bạn?"
        body="Kể cho chúng tôi bạn muốn làm gì cho người bán quà Việt Nam. Mọi email đều được đọc."
        actions={
          <>
            <a href="mailto:jobs@wrapfit.vn" className={PRIMARY_CTA}>
              jobs@wrapfit.vn
            </a>
            <Link href="/about#doi-ngu" className={WHITE_PILL}>
              Gặp đội ngũ
            </Link>
          </>
        }
      />
    </SitePage>
  );
}

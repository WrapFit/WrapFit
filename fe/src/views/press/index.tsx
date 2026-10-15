"use client";

import { Download, Mail, Megaphone } from "lucide-react";
import Link from "next/link";
import React, { useRef } from "react";
import { LandingLogo } from "@/components/layout/LandingLogo";
import { Card, PageHero, PhotoFrame, PRIMARY_CTA, SECONDARY_CTA, Section, SitePage, StatGrid } from "@/components/site";
import { PHOTOS } from "@/features/site/photos";
import { KEY_STATS } from "@/features/site/company";

// /press: facts for journalists. The releases follow the milestones of docs/04 (progress table); WrapFit has no media
// coverage yet and the page says so.

const RELEASES = [
  { date: "12/10/2026", title: "WrapFit nối xong studio với máy chủ: lưu dự án, xuất file in và chia sẻ 3D chạy trọn vẹn", text: "Kịch bản 15 bước, từ tạo tài khoản đến xuất PDF CMYK, chạy thành công trên điện thoại và máy tính." },
  { date: "09/10/2026", title: "Khảo sát 109 người bán quà: 67% chỉ cần 50 hộp mỗi lần", text: "Rào cản lớn nhất là số lượng tối thiểu của xưởng (53,2%), hộp không vừa (32,1%) và file in lỗi (28,4%)." },
  { date: "02/10/2026", title: "WrapFit chuyển máy chủ sang NestJS 11, sẵn sàng cho xuất file in bất đồng bộ", text: "Hàng đợi BullMQ và máy xuất file riêng giúp file in nặng không làm chậm studio." },
];

const MEDIA = [PHOTOS.kraftTuck, PHOTOS.kraftPillow, PHOTOS.tetGift, PHOTOS.oilsDrawer, PHOTOS.blackMagnet, PHOTOS.candleBox];

const COLORS = [
  { name: "Cam FPT", hex: "#F26522" },
  { name: "Xanh rừng đêm", hex: "#152B07" },
  { name: "Xanh lá", hex: "#458C17" },
  { name: "Lime", hex: "#98E665" },
  { name: "Mực", hex: "#1D293D" },
  { name: "Nền", hex: "#F1F5F9" },
];

export default function PressPage() {
  const logoRef = useRef<HTMLDivElement>(null);

  // The mark as drawn on the site, saved as an SVG file with the wordmark.
  const downloadLogo = () => {
    const icon = logoRef.current?.querySelector("svg");
    if (!icon) return;
    const inner = icon.innerHTML;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="560" height="128" viewBox="0 0 140 32"><g>${inner}</g><text x="40" y="23" font-family="Be Vietnam Pro, Inter, sans-serif" font-size="20" font-weight="700" fill="#1D293D">WrapFit</text></svg>`;
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "wrapfit-logo.svg";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <SitePage>
      <PageHero
        title="Báo chí & truyền thông"
        subtitle="WrapFit trong một trang."
        lead="Nền tảng thiết kế hộp quà theo kích thước món quà cho người bán nhỏ tại Việt Nam: khuôn bế tự dựng, kiểm tra file in FitCheck™, xem hộp gấp 3D và file in chuẩn xưởng từ 1 hộp."
        actions={
          <>
            <a href="mailto:press@wrapfit.vn" className={PRIMARY_CTA}>
              <Mail className="size-4" aria-hidden /> press@wrapfit.vn
            </a>
            <a href="#nhan-dien" className={SECONDARY_CTA}>
              Bộ nhận diện
            </a>
          </>
        }
        image={{ ...PHOTOS.greenLid, caption: "Hộp nắp rời ép kim, dựng khuôn theo kích thước món quà trên WrapFit." }}
      />

      <Section title="Tổng quan">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <Card className="p-6 sm:p-8">
            <dl className="grid grid-cols-1 gap-x-8 gap-y-5 text-sm sm:grid-cols-2">
              {[
                ["Tên", "WrapFit Platform"],
                ["Khẩu hiệu", "Make Every Present, Present."],
                ["Thành lập", "Học kỳ Thu 2026, môn Khởi nghiệp EXE101, Đại học FPT"],
                ["Đội ngũ", "Nhóm FORGE, 6 thành viên"],
                ["Khách hàng", "Người bán quà handmade và thương hiệu nhỏ: nến, mỹ phẩm, trang sức, trà, bánh"],
                ["Mô hình", "Miễn phí · 19.000đ/lần xuất · 99.000đ/tháng · hoa hồng đơn in"],
              ].map(([term, value]) => (
                <div key={term}>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-landing-muted">{term}</dt>
                  <dd className="mt-1 font-medium leading-snug">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <Card className="flex flex-col justify-between bg-landing-green-night p-6 text-white ring-0 sm:p-8">
            <p className="font-landing-heading text-xl font-semibold leading-snug">
              &ldquo;Món quà là thứ mang đậm dấu ấn cá nhân. Tại sao chiếc hộp bên ngoài lại phải rập khuôn công nghiệp?&rdquo;
            </p>
            <p className="mt-6 text-sm text-landing-lime-mist/80">Nhóm sáng lập WrapFit</p>
          </Card>
        </div>
      </Section>

      <Section title="Số liệu chính">
        <StatGrid stats={KEY_STATS} />
      </Section>

      <Section title="Thông cáo gần đây" band>
        <ul className="flex flex-col divide-y divide-landing-line/60">
          {RELEASES.map((release) => (
            <li key={release.title} className="grid grid-cols-1 gap-2 py-5 md:grid-cols-[140px_minmax(0,1fr)] md:gap-6">
              <time className="font-mono text-sm text-landing-muted">{release.date}</time>
              <div>
                <p className="font-landing-heading text-lg font-bold leading-snug">{release.title}</p>
                <p className="mt-1 text-sm text-landing-muted">{release.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="WrapFit trên báo chí">
        <Card className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Megaphone className="mt-0.5 size-5 shrink-0 text-fpt-orange" aria-hidden />
            <p className="text-sm leading-relaxed text-landing-muted">
              Chưa có bài viết nào về WrapFit. Bạn là người đầu tiên? Chúng tôi sẵn sàng phỏng vấn, cho dùng thử bản đầy đủ và gửi hộp mẫu.
            </p>
          </div>
          <Link href="/blog/109-nguoi-ban-qua-noi-gi-ve-bao-bi" className={SECONDARY_CTA}>
            Đọc kết quả khảo sát
          </Link>
        </Card>
      </Section>

      <Section id="nhan-dien" title="Bộ nhận diện" lead="Dùng logo trên nền sáng, giữ khoảng trống quanh logo bằng chiều cao biểu tượng hộp. Không kéo giãn, không đổi màu các mặt hộp.">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card className="flex flex-col gap-5">
            <div ref={logoRef} className="flex h-40 items-center justify-center rounded-3xl bg-landing-canvas">
              <LandingLogo size="lg" />
            </div>
            <div className="flex h-24 items-center justify-center rounded-3xl bg-landing-green-night">
              <LandingLogo size="md" tone="light" />
            </div>
            <button type="button" onClick={downloadLogo} className={SECONDARY_CTA}>
              <Download className="size-4" aria-hidden /> Tải logo (SVG)
            </button>
          </Card>
          <Card>
            <p className="font-semibold">Màu</p>
            <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {COLORS.map((color) => (
                <li key={color.hex} className="overflow-hidden rounded-2xl ring-1 ring-landing-ink/10">
                  <span className="block h-16" style={{ background: color.hex }} />
                  <span className="block px-3 py-2 text-xs">
                    <span className="block font-semibold">{color.name}</span>
                    <span className="font-mono text-landing-muted">{color.hex}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-5 font-semibold">Phông chữ</p>
            <p className="mt-1 text-sm text-landing-muted">
              <span className="font-landing-heading font-bold text-landing-ink">Be Vietnam Pro</span> cho tiêu đề, <span className="font-semibold text-landing-ink">Inter</span> cho nội dung, <span className="font-mono text-landing-ink">JetBrains Mono</span> cho số đo.
            </p>
          </Card>
        </div>
      </Section>

      <Section title="Ảnh sản phẩm" lead="Ảnh độ phân giải cao, dùng tự do khi viết về WrapFit. Ghi nguồn: WrapFit.">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {MEDIA.map((image) => (
            <figure key={image.src} className="group">
              <PhotoFrame image={image} className="aspect-[4/3]">
                <a
                  href={image.src}
                  download
                  className="absolute right-3 top-3 inline-flex h-9 items-center gap-1.5 rounded-full bg-white/90 px-3 text-xs font-semibold text-landing-ink opacity-100 shadow-soft-8 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                >
                  <Download className="size-3.5" aria-hidden /> Tải ảnh
                </a>
              </PhotoFrame>
              <figcaption className="mt-2 text-xs text-landing-muted">{image.alt}</figcaption>
            </figure>
          ))}
        </div>
      </Section>

      <Section title="Liên hệ truyền thông" className="pb-16">
        <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-landing-heading text-xl font-bold">Lê Minh Quốc</p>
            <p className="text-sm text-landing-muted">Khám phá khách hàng & Marketing · trả lời trong 1 ngày làm việc</p>
          </div>
          <a href="mailto:press@wrapfit.vn" className={PRIMARY_CTA}>
            <Mail className="size-4" aria-hidden /> press@wrapfit.vn
          </a>
        </Card>
      </Section>
    </SitePage>
  );
}

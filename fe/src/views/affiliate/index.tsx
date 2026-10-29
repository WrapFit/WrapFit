"use client";

import { BadgePercent, BookOpen, Gift, Image as ImageIcon, Megaphone, Wallet } from "lucide-react";
import Link from "next/link";
import React from "react";
import { Container } from "@/components/landing";
import { Card, CheckList, EmailCapture, IconTile, PageHero, PhotoFrame, PRIMARY_CTA, SECONDARY_CTA, Section, SitePage, StatGrid } from "@/components/site";
import { PHOTOS } from "@/features/site/photos";
import { formatVnd, PLANS } from "@/features/pricing";

// /affiliate: the referral programme of the CP2 go-to-market (agency referral commission of 15%, maker guilds). The
// API has no referral tracking yet: applications are collected by email.

const RATE = 0.15;
const TIERS = [
  { name: `Gói ${PLANS.STARTER.name}`, base: PLANS.STARTER.price.monthly, unit: "/tháng" },
  { name: `Gói ${PLANS.PRO_BUSINESS.name}`, base: PLANS.PRO_BUSINESS.price.monthly, unit: "/tháng" },
  { name: "Đơn in mẫu đầu tiên", base: 49_000, unit: "/đơn" },
];

const STEPS = [
  { title: "Đăng ký", text: "Gửi email và kênh của bạn (nhóm Facebook, TikTok, lớp học, đơn vị thiết kế). Chúng tôi duyệt trong 3 ngày." },
  { title: "Nhận liên kết riêng", text: "Mỗi đối tác có một liên kết và mã giảm 10% cho tháng đầu của người được giới thiệu." },
  { title: "Giới thiệu", text: "Chia sẻ với shop quà, học viên làm nến, khách hàng của đơn vị thiết kế." },
  { title: "Nhận hoa hồng", text: "15% doanh thu trong 12 tháng đầu, chuyển khoản ngày 5 hằng tháng khi đạt từ 200.000đ." },
];

const RESOURCES = [
  { icon: ImageIcon, title: "Ảnh & video mở hộp", text: "Bộ ảnh trước/sau và video gấp hộp để đăng." },
  { icon: BookOpen, title: "Hướng dẫn nhanh", text: "Slide 10 trang giới thiệu WrapFit cho lớp học, nhóm." },
  { icon: Gift, title: "Hộp mẫu miễn phí", text: "Một hộp in mẫu để bạn cầm lên quay review." },
  { icon: Megaphone, title: "Nội dung gợi ý", text: "Bài đăng mẫu cho mùa Tết, Valentine, quà doanh nghiệp." },
];

export default function AffiliatePage() {
  return (
    <SitePage>
      <PageHero
        title="Giới thiệu WrapFit"
        subtitle="nhận 15% hoa hồng trong 12 tháng."
        lead="Dành cho đơn vị thiết kế, người dạy làm nến – xà phòng – gốm, quản trị nhóm người bán handmade và KOC đồ thủ công."
        actions={
          <>
            <a href="#dang-ky" className={PRIMARY_CTA}>
              Đăng ký làm đối tác
            </a>
            <a href="#cach-tinh" className={SECONDARY_CTA}>
              Cách tính hoa hồng
            </a>
          </>
        }
        aside={
          <PhotoFrame image={PHOTOS.kraftTwine} className="aspect-[4/3] lg:aspect-[5/4]">
            <div className="absolute bottom-4 left-4 right-4 rounded-3xl bg-white/95 p-5 shadow-soft-16 backdrop-blur sm:bottom-6 sm:left-6 sm:right-auto sm:w-72">
              <p className="flex items-center gap-2 text-sm font-semibold text-landing-muted">
                <BadgePercent className="size-4 text-fpt-orange-ink" aria-hidden /> Mỗi shop dùng gói {PLANS.STARTER.name}
              </p>
              <p className="mt-1 font-landing-heading text-3xl font-bold">{formatVnd(Math.round(PLANS.STARTER.price.monthly * RATE))}<span className="text-base text-landing-muted">/tháng</span></p>
              <p className="text-xs text-landing-muted">về tài khoản của bạn, 12 tháng liền</p>
            </div>
          </PhotoFrame>
        }
      />

      <Container className="pb-4">
        <StatGrid
          stats={[
            { value: "15%", label: "hoa hồng trên doanh thu được giới thiệu" },
            { value: "12 tháng", label: "nhận hoa hồng cho mỗi khách" },
            { value: "10%", label: "giảm tháng đầu cho người được giới thiệu" },
            { value: "60 ngày", label: "cookie ghi nhận lượt giới thiệu" },
          ]}
        />
      </Container>

      <Section title="Chương trình dành cho ai">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {[
            { image: PHOTOS.kraftTuck, title: "Cộng đồng người bán", text: "Quản trị nhóm Facebook, Zalo của chủ shop handmade, quà tặng." },
            { image: PHOTOS.candleJars, title: "Người dạy nghề", text: "Lớp làm nến, xà phòng, gốm, bánh — học viên nào cũng cần hộp." },
            { image: PHOTOS.designer, title: "Đơn vị thiết kế, người làm tự do", text: "Studio thiết kế nhận làm bao bì cho thương hiệu nhỏ." },
          ].map((item) => (
            <article key={item.title} className="overflow-hidden rounded-card bg-white ring-1 ring-landing-ink/10 lg:rounded-card-lg">
              <PhotoFrame image={item.image} className="aspect-[4/3] rounded-none lg:rounded-none" />
              <div className="p-6 sm:p-7">
                <p className="font-landing-heading text-xl font-bold">{item.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-landing-muted">{item.text}</p>
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section id="cach-tinh" title="Cách tính hoa hồng" band>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="overflow-hidden rounded-card ring-1 ring-landing-ink/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-landing-canvas text-xs uppercase tracking-wide text-landing-muted">
                <tr>
                  <th className="px-5 py-3">Khách được giới thiệu mua</th>
                  <th className="px-5 py-3 text-right">Bạn nhận</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-landing-line/60">
                {TIERS.map((tier) => (
                  <tr key={tier.name}>
                    <td className="px-5 py-4">
                      <p className="font-semibold">{tier.name}</p>
                      <p className="text-xs text-landing-muted">
                        {formatVnd(tier.base)}
                        {tier.unit}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-right font-mono font-semibold text-fpt-orange-ink">
                      {formatVnd(Math.round(tier.base * RATE))}
                      {tier.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Card className="bg-landing-canvas ring-0">
            <Wallet className="size-6 text-fpt-orange-ink" aria-hidden />
            <p className="mt-3 font-landing-heading text-xl font-bold">Ví dụ</p>
            <p className="mt-2 text-sm leading-relaxed text-landing-muted">
              Bạn giới thiệu 20 shop dùng gói {PLANS.STARTER.name}: mỗi tháng nhận 20 × {formatVnd(Math.round(PLANS.STARTER.price.monthly * RATE))} ={" "}
              <strong className="text-landing-ink">{formatVnd(20 * Math.round(PLANS.STARTER.price.monthly * RATE))}</strong>, trong 12 tháng.
            </p>
            <CheckList className="mt-4" items={["Không giới hạn số khách giới thiệu", "Bảng theo dõi lượt nhấp và đơn hằng tháng", "Thanh toán qua chuyển khoản ngân hàng nội địa"]} />
          </Card>
        </div>
      </Section>

      <Section title="Bốn bước">
        <ol className="grid grid-cols-1 gap-5 md:grid-cols-4">
          {STEPS.map((step, index) => (
            <li key={step.title} className="rounded-card bg-white p-6 ring-1 ring-landing-ink/10">
              <span className="inline-flex size-9 items-center justify-center rounded-full bg-fpt-orange font-landing-heading font-bold text-white">{index + 1}</span>
              <p className="mt-4 font-landing-heading text-lg font-bold">{step.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-landing-muted">{step.text}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Chúng tôi chuẩn bị sẵn cho bạn">
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {RESOURCES.map((resource) => (
            <li key={resource.title} className="rounded-3xl bg-white p-5 ring-1 ring-landing-ink/10">
              <IconTile icon={resource.icon} />
              <p className="mt-3 font-semibold">{resource.title}</p>
              <p className="text-sm text-landing-muted">{resource.text}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Vì sao người bán sẽ cảm ơn bạn">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {[
            { value: "53,2%", text: "người bán bị xưởng từ chối vì số lượng quá ít" },
            { value: "69,7%", text: "đang thiết kế bao bì bằng Canva, không gấp thử được" },
            { value: "65,1%", text: "sẵn sàng đặt in qua mạng lưới xưởng của WrapFit" },
          ].map((item) => (
            <Card key={item.value}>
              <p className="font-landing-heading text-4xl font-bold">{item.value}</p>
              <p className="mt-2 text-sm text-landing-muted">{item.text}</p>
            </Card>
          ))}
        </div>
        <p className="mt-4 text-xs text-landing-muted">Khảo sát 109 người bán quà tặng, tháng 10/2026.</p>
      </Section>

      <Section id="dang-ky" title="Đăng ký làm đối tác" className="pb-16">
        <Card className="grid grid-cols-1 gap-6 bg-landing-green-night text-white ring-0 lg:grid-cols-2 lg:items-center lg:p-10">
          <div>
            <p className="font-landing-heading text-2xl font-bold">Để lại email, chúng tôi gửi hồ sơ đối tác</p>
            <p className="mt-2 text-sm text-white/90">
              Kèm điều khoản chương trình và bộ tài nguyên. Muốn trao đổi trước?{" "}
              <Link href="/contact" className="font-semibold text-fpt-orange underline">
                Liên hệ đội ngũ
              </Link>
              .
            </p>
          </div>
          <EmailCapture list="affiliate" cta="Gửi đăng ký" tone="dark" done="Đã ghi nhận đăng ký trên thiết bị này. Để được duyệt ngay, gửi thêm kênh của bạn đến partners@wrapfit.vn." note="Chương trình áp dụng khi WrapFit mở thanh toán gói trả phí." />
        </Card>
      </Section>
    </SitePage>
  );
}

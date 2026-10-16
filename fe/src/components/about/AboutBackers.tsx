"use client";

import { Award, Building2, CheckCircle, ExternalLink, GraduationCap, Handshake, Landmark, ShieldCheck } from "lucide-react";
import React from "react";
import { Container } from "@/components/landing";

interface Backer {
  name: string;
  category: string;
  role: string;
  description: string;
  badge: string;
  icon: typeof Landmark;
  color: string;
}

const BACKERS_LIST: Backer[] = [
  {
    name: "Đại học FPT (FPT University)",
    category: "Academic & Research Incubator",
    role: "Bảo trợ Học thuật & Ươm tạo Công nghệ",
    description:
      "Nơi dự án WrapFit được thai nghén, hỗ trợ phòng lab nghiên cứu đồ họa WebGL, máy chủ tính toán đám mây và cố vấn chuyên môn từ các giảng viên đầu ngành phần mềm.",
    badge: "Đơn vị Ươm tạo",
    icon: GraduationCap,
    color: "from-info to-info text-info-fg bg-info-bg border-info/60",
  },
  {
    name: "Chương trình Khởi nghiệp EXE101",
    category: "Startup Accelerator Program",
    role: "Bệ phóng Khởi nghiệp Thực chiến",
    description:
      "Chương trình rèn luyện tinh thần khởi nghiệp trải nghiệm thực tế (Experiential Entrepreneurship), định hướng mô hình kinh doanh Zero MOQ và chiến lược tiếp cận thị trường boutique.",
    badge: "Bệ phóng Dự án",
    icon: Award,
    color: "from-fpt-orange to-warning text-fpt-orange-ink bg-fpt-orange-light border-fpt-orange/60",
  },
  {
    name: "Tiêu chuẩn Bao bì ECMA & FEFCO",
    category: "Global Packaging Standards",
    role: "Chuẩn mực Kỹ thuật & Hình học Khóa gập",
    description:
      "Toàn bộ thuật toán sinh dieline CAD và dung sai cấn bế của WrapFit tuân thủ nghiêm ngặt theo danh mục tiêu chuẩn của Hiệp hội Bao bì Giấy Châu Âu (ECMA & FEFCO).",
    badge: "Chuẩn Quốc Tế",
    icon: ShieldCheck,
    color: "from-success to-success text-success-fg bg-success-bg border-success/60",
  },
  {
    name: "Mạng lưới Xưởng Cắt Phẳng Kỹ Thuật Số",
    category: "Flatbed Digital Print-Shop Partners",
    role: "Đối tác Sản xuất & Gia công Thành phẩm",
    description:
      "Liên kết với các xưởng in tiên phong trang bị bàn cắt kỹ thuật số phẳng tự động tại Hà Nội và TP.HCM, biến file CAD xuất từ WrapFit thành thành phẩm trong 48h mà không cần làm khuôn sắt.",
    badge: "Đối tác Sản xuất",
    icon: Building2,
    color: "from-purple-600 to-violet-700 text-purple-600 bg-purple-50 border-purple-200/60",
  },
];

const TRUST_FACTS = [
  "Bảo trợ chuyên môn bởi Giảng viên Khởi nghiệp FPT University",
  "Tuân thủ mã tiêu chuẩn kết cấu hộp ECMA Code A/B/D & FEFCO",
  "Kết nối trực tiếp hệ thống máy cắt phẳng Summa / JWEI kỹ thuật số",
  "Hơn 100+ nghệ nhân thủ công Việt Nam tham gia phản hồi trải nghiệm",
];

export function AboutBackers() {
  return (
    <section className="bg-landing-canvas py-14 lg:py-24 border-t border-line/70">
      <Container>
        <div className="mx-auto max-w-4xl text-center mb-12 sm:mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-fpt-orange-ink">
            Đối tác & Đơn vị bảo trợ (Backers & Partners)
          </span>
          <h2 className="font-landing-heading text-2xl sm:text-4xl lg:text-5xl font-bold text-fg mt-2">
            Được Đồng Hành Bởi Các Đơn Vị Uy Tín
          </h2>
          <p className="mt-3 text-sm sm:text-base text-fg-muted max-w-2xl mx-auto leading-relaxed">
            WrapFit không phát triển đơn lẻ. Chúng tôi tự hào được nâng bước bởi các tổ chức giáo dục hàng đầu, tiêu chuẩn công nghiệp bao bì quốc tế và mạng lưới xưởng in kỹ thuật số hiện đại.
          </p>
        </div>

        {/* Backers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-5xl mx-auto">
          {BACKERS_LIST.map((b) => {
            const Icon = b.icon;
            return (
              <div
                key={b.name}
                className="rounded-3xl border border-line/90 bg-white p-7 sm:p-8 shadow-soft-8 transition-all hover:shadow-soft-16 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-surface-sunken text-fg">
                      <Icon className="size-6" />
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold border ${b.color}`}>
                      {b.badge}
                    </span>
                  </div>

                  <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted block">
                    {b.category}
                  </span>

                  <h3 className="font-landing-heading text-xl sm:text-2xl font-bold text-fg mt-1 mb-2">
                    {b.name}
                  </h3>

                  <p className="text-xs font-semibold text-fpt-blue mb-3">
                    {b.role}
                  </p>

                  <p className="text-xs sm:text-sm text-fg-muted leading-relaxed">
                    {b.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Institutional Trust Banner */}
        <div className="mt-12 sm:mt-16 mx-auto max-w-5xl rounded-3xl border border-line/90 bg-white p-6 sm:p-8 shadow-soft-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-fpt-blue/10 text-fpt-blue">
                <Handshake className="size-6" />
              </div>
              <div>
                <h4 className="font-landing-heading text-base sm:text-lg font-bold text-fg">
                  Bạn là xưởng in hoặc nhà cung cấp vật liệu giấy?
                </h4>
                <p className="text-xs sm:text-sm text-fg-muted">
                  Cùng WrapFit mở rộng mạng lưới sản xuất bao bì không cần khuôn bế trên khắp các tỉnh thành.
                </p>
              </div>
            </div>

            <a
              href="/contact?topic=partner"
              className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-fg px-5 py-3 text-xs sm:text-sm font-semibold text-white shadow-soft-8 hover:bg-fg/85 transition-colors"
            >
              Liên hệ đăng ký đối tác
              <ExternalLink className="size-4" />
            </a>
          </div>

          <div className="mt-6 pt-6 border-t border-line/60 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {TRUST_FACTS.map((fact) => (
              <div key={fact} className="flex items-center gap-2 text-caption sm:text-xs text-fg-muted">
                <CheckCircle className="size-3.5 text-fpt-orange shrink-0" />
                <span>{fact}</span>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}

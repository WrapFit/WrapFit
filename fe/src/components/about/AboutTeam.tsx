"use client";

import { Github, Linkedin } from "lucide-react";
import React from "react";
import { Container } from "@/components/landing";

interface TeamMember {
  name: string;
  role: string;
  bio: string;
  avatar: string;
  education: string;
  skills: string[];
  linkedin?: string;
  github?: string;
}

const TEAM_MEMBERS: TeamMember[] = [
  {
    name: "Võ Lê Đức Phát",
    role: "Trưởng nhóm · Kỹ sư thuật toán khuôn bế",
    bio: "Xây dựng thư viện lõi @wrapfit/shared: công thức tham số dựng khuôn bế cho 4 kiểu hộp từ L × W × H, bù độ dày giấy 250–350 GSM, bộ luật FitCheck™ và động cơ xuất file in PDF CMYK, SVG, DXF.",
    avatar: "/team/vo-le-duc-phat.png",
    education: "Công nghệ Thông tin — Đại học FPT",
    skills: ["Thuật toán khuôn bế", "FitCheck™", "Xuất file in", "TypeScript"],
    github: "https://github.com",
    linkedin: "https://linkedin.com",
  },
  {
    name: "Nguyễn Chí Trung",
    role: "Kỹ sư Frontend · Studio 2D/3D",
    bio: "Phát triển toàn bộ giao diện Next.js: Studio chỉnh khuôn bế 2D, mô phỏng gập hộp 3D bằng Three.js, bảng FitCheck™, thư viện mẫu, trang xem 3D công khai và trang mở hộp qua mã QR.",
    avatar: "/team/nguyen-chi-trung.png",
    education: "Công nghệ Thông tin — Đại học FPT",
    skills: ["Next.js & React", "Three.js / R3F", "Studio 2D", "UI/UX"],
    github: "https://github.com",
  },
  {
    name: "Nguyễn Quang Thổ",
    role: "Kỹ sư Backend · Hạ tầng",
    bio: "Xây dựng API NestJS và CSDL PostgreSQL: đăng nhập Google/JWT, quản lý dự án và mốc phiên bản, lưu trữ S3/R2, hàng đợi BullMQ xuất file in, sinh hoa văn AI, mã QR mở hộp và CI/CD.",
    avatar: "/team/nguyen-quang-tho.png",
    education: "Công nghệ Thông tin — Đại học FPT",
    skills: ["NestJS", "PostgreSQL & Prisma", "Redis BullMQ", "CI/CD"],
    github: "https://github.com",
  },
  {
    name: "Lê Minh Quốc",
    role: "Marketing · Nghiên cứu thị trường",
    bio: "Khảo sát nhu cầu của chủ shop handmade và người tặng quà, định vị WrapFit là công cụ bao bì chuyên biệt, xây dựng kênh tiếp cận và chiến dịch lan tỏa qua trải nghiệm mở hộp 3D và Remix mẫu.",
    avatar: "/team/le-minh-quoc.png",
    education: "Quản trị Kinh doanh — Đại học FPT",
    skills: ["Nghiên cứu thị trường", "Định vị thương hiệu", "Tiếp thị số", "Lan tỏa tự nhiên"],
    linkedin: "https://linkedin.com",
  },
  {
    name: "Đỗ Hồng Nghĩa",
    role: "Kinh tế · Mô hình kinh doanh & đối tác in",
    bio: "Thiết kế mô hình doanh thu theo gói (Free, Lượt xuất, Pro, Business) và lượt xuất file, kết nối xưởng in đối tác để chủ shop in số lượng nhỏ, không phải đặt tối thiểu 500–1.000 hộp.",
    avatar: "/team/do-hong-nghia.png",
    education: "Quản trị Kinh doanh — Đại học FPT",
    skills: ["Mô hình kinh doanh", "Chiến lược định giá", "Đối tác xưởng in", "Vận hành"],
    linkedin: "https://linkedin.com",
  },
  {
    name: "Trần Thị Trúc Phương",
    role: "Kinh tế · Tài chính & kế hoạch",
    bio: "Lập dự phóng tài chính và dòng tiền, tính chi phí đơn vị so với phương án in truyền thống (khuôn dao 1,5–2 triệu đồng), xây dựng ngân sách và đánh giá tính khả thi của dự án.",
    avatar: "/team/tran-thi-truc-phuong.png",
    education: "Tài chính — Ngân hàng — Đại học FPT",
    skills: ["Mô hình tài chính", "Dự báo dòng tiền", "Chi phí đơn vị", "Thẩm định dự án"],
    linkedin: "https://linkedin.com",
  },
];

export function AboutTeam() {
  return (
    <section id="doi-ngu" className="scroll-mt-20 bg-landing-canvas py-14 lg:py-24 border-t border-line/70">
      <Container>
        <div className="mx-auto max-w-4xl text-center mb-12 sm:mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-fpt-orange-ink">
            Đội ngũ
          </span>
          <h2 className="font-landing-heading text-2xl sm:text-4xl lg:text-5xl font-bold text-fg mt-2">
            Những người làm nên WrapFit
          </h2>
          <p className="mt-3 text-sm sm:text-base text-fg-muted max-w-2xl mx-auto leading-relaxed">
            Nhóm FORGE, sinh viên Đại học FPT, môn Khởi nghiệp EXE101.
          </p>
        </div>

        {/* Team Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {TEAM_MEMBERS.map((member) => (
            <div
              key={member.name}
              className="group relative rounded-3xl border border-line/90 bg-white p-6 shadow-soft-8 transition-all hover:-translate-y-1 hover:shadow-soft-16 flex flex-col justify-between"
            >
              <div>
                {/* Photo & Badge */}
                <div className="relative mb-5 aspect-square overflow-hidden rounded-2xl border border-line/60 bg-surface-sunken">
                  <img
                    src={member.avatar}
                    alt={member.name}
                    loading="lazy"
                    decoding="async"
                    className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>

                <h3 className="font-landing-heading text-xl font-bold text-fg">
                  {member.name}
                </h3>
                <p className="text-xs font-semibold text-fpt-orange-ink mt-0.5">
                  {member.role}
                </p>

                <p className="text-xs sm:text-sm text-fg-muted mt-3 leading-relaxed">
                  {member.bio}
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-line/60">
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {member.skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-md bg-surface-sunken px-2 py-0.5 font-mono text-cad-spec-micro text-fg-muted font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  {member.linkedin && (
                    <a
                      href={member.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex size-7 items-center justify-center rounded-lg bg-surface-sunken/50 text-fg-muted hover:bg-fg hover:text-white transition-colors"
                      title="LinkedIn"
                    >
                      <Linkedin className="size-3.5" />
                    </a>
                  )}
                  {member.github && (
                    <a
                      href={member.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex size-7 items-center justify-center rounded-lg bg-surface-sunken/50 text-fg-muted hover:bg-fg hover:text-white transition-colors"
                      title="GitHub"
                    >
                      <Github className="size-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}

        </div>
      </Container>
    </section>
  );
}

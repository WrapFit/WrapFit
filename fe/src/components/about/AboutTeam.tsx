"use client";

import { Github, GraduationCap, Linkedin } from "lucide-react";
import React from "react";
import { Container } from "@/components/landing";

interface TeamMember {
  name: string;
  role: string;
  titleEn: string;
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
    role: "Trưởng nhóm & Kỹ thuật Công nghệ (Leader)",
    titleEn: "Team Leader & Tech Architect",
    bio: "Trưởng nhóm dự án WrapFit (Team FORGE). Định hướng kiến trúc công nghệ toàn diện, giải thuật tham số hóa CAD và tích hợp quy trình sản xuất không khuôn.",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop",
    education: "Công nghệ Thông tin — Đại học FPT",
    skills: ["System Architecture", "CAD Parametric", "Fullstack", "Leadership"],
    github: "https://github.com",
    linkedin: "https://linkedin.com",
  },
  {
    name: "Nguyễn Chí Trung",
    role: "Kỹ thuật Công nghệ & Frontend Lead",
    titleEn: "Frontend & CAD Engineer",
    bio: "Phụ trách phát triển giao diện Web Studio trực quan, công cụ Fabric.js 2D dieline và hệ thống rà soát lỗi in ấn tự động FitCheck™ cho xưởng sản xuất.",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=600&auto=format&fit=crop",
    education: "Công nghệ Thông tin — Đại học FPT",
    skills: ["Next.js", "TypeScript", "Canvas Fabric.js", "FitCheck™ Engine"],
    github: "https://github.com",
  },
  {
    name: "Nguyễn Quang Thổ",
    role: "Kỹ thuật Công nghệ & WebGL 3D Specialist",
    titleEn: "3D WebGL & Graphics Engineer",
    bio: "Chuyên gia mô phỏng gập mở hộp 3D tương tác thời gian thực bằng Three.js và tính toán dung sai độ dày vật liệu giấy (caliper t) theo chuẩn ECMA/FEFCO.",
    avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=600&auto=format&fit=crop",
    education: "Công nghệ Thông tin — Đại học FPT",
    skills: ["Three.js / WebGL", "Origami Kinematics", "CMYK Exporter", "BullMQ"],
    github: "https://github.com",
  },
  {
    name: "Lê Minh Quốc",
    role: "Khám phá Khách hàng & Tiếp thị (Marketing)",
    titleEn: "Customer Discovery & Marketing",
    bio: "Chủ trì khảo sát thực nghiệm 109 chủ tiệm thủ công & phỏng vấn chuyên gia ngành bao bì. Xây dựng chiến lược GTM tiếp cận hai phân khúc Linh & Thu.",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=600&auto=format&fit=crop",
    education: "Quản trị Kinh doanh — Đại học FPT",
    skills: ["Customer Discovery", "GTM Strategy", "Artisan Outreach", "Survey Analysis"],
    linkedin: "https://linkedin.com",
  },
  {
    name: "Đỗ Hồng Nghĩa",
    role: "Xây dựng Mô hình Kinh doanh (Business Modeling)",
    titleEn: "Business Modeling & Operations",
    bio: "Thiết kế mô hình doanh thu lai (Hybrid SaaS): 19.000đ/lần xuất và 99.000đ/tháng, kết nối mạng lưới xưởng in đối tác cắt phẳng kỹ thuật số (Zero MOQ).",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=600&auto=format&fit=crop",
    education: "Quản trị Kinh doanh — Đại học FPT",
    skills: ["Business Modeling", "Supply Chain", "Pricing Strategy", "Partner Network"],
    linkedin: "https://linkedin.com",
  },
  {
    name: "Trần Thị Trúc Phương",
    role: "Phân tích Thị trường & Tài chính (Financial Analyst)",
    titleEn: "Financial & Market Analyst",
    bio: "Phân tích tài chính, định lượng thị trường TAM-SAM-SOM (SAM 308,89 tỷ VNĐ) và quản trị dự báo dòng tiền cho dự án khởi nghiệp WrapFit.",
    avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=600&auto=format&fit=crop",
    education: "Tài chính — Ngân hàng — Đại học FPT",
    skills: ["Financial Analysis", "TAM/SAM/SOM", "Unit Economics", "Market Research"],
    linkedin: "https://linkedin.com",
  },
];

export function AboutTeam() {
  return (
    <section id="doi-ngu" className="scroll-mt-20 bg-landing-canvas py-14 lg:py-24 border-t border-line/70">
      <Container>
        <div className="mx-auto max-w-4xl text-center mb-12 sm:mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-fpt-orange-ink">
            Đội ngũ phát triển (Team Behind WrapFit)
          </span>
          <h2 className="font-landing-heading text-2xl sm:text-4xl lg:text-5xl font-bold text-fg mt-2">
            Những Người Thổi Hồn Vào Từng Nếp Gấp
          </h2>
          <p className="mt-3 text-sm sm:text-base text-fg-muted max-w-2xl mx-auto leading-relaxed">
            WrapFit được xây dựng bởi <strong>Team FORGE</strong> (Đại học FPT — Bộ môn Khởi nghiệp EXE101), kết hợp giữa tư duy kỹ thuật CAD khắt khe, giải thuật đồ họa 3D và sự thấu cảm sâu sắc nỗi đau của các nhà sáng tạo thủ công Việt Nam.
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
                    className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                    <span className="text-xs text-white/90 font-medium">
                      {member.titleEn}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-caption font-semibold text-fpt-orange-ink bg-fpt-orange-light px-2.5 py-0.5 rounded-full w-fit border border-fpt-orange/40 mb-2">
                  <GraduationCap className="size-3 text-fpt-orange-ink" />
                  {member.education}
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

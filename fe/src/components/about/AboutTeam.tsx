"use client";

import { Github, GraduationCap, Linkedin } from "lucide-react";
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
    role: "Trưởng nhóm, kiến trúc kỹ thuật",
    bio: "Định hướng công nghệ và thuật toán dựng khuôn bế.",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=800&auto=format&fit=crop",
    education: "Công nghệ Thông tin — Đại học FPT",
    skills: ["Kiến trúc hệ thống", "Khuôn bế", "Toàn bộ hệ thống", "Dẫn dắt nhóm"],
    github: "https://github.com",
    linkedin: "https://linkedin.com",
  },
  {
    name: "Nguyễn Chí Trung",
    role: "Kỹ sư giao diện",
    bio: "Xây Studio thiết kế 2D và công cụ soát lỗi FitCheck™.",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=800&auto=format&fit=crop",
    education: "Công nghệ Thông tin — Đại học FPT",
    skills: ["Next.js", "TypeScript", "Thiết kế 2D", "FitCheck™"],
    github: "https://github.com",
  },
  {
    name: "Nguyễn Quang Thổ",
    role: "Kỹ sư đồ họa 3D",
    bio: "Mô phỏng gập mở hộp 3D và tính độ dày giấy.",
    avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=800&auto=format&fit=crop",
    education: "Công nghệ Thông tin — Đại học FPT",
    skills: ["Three.js", "Gập hộp 3D", "Xuất file in", "Xử lý nền"],
    github: "https://github.com",
  },
  {
    name: "Lê Minh Quốc",
    role: "Nghiên cứu khách hàng, tiếp thị",
    bio: "Khảo sát 109 chủ tiệm thủ công, lên kế hoạch tiếp cận khách hàng.",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=800&auto=format&fit=crop",
    education: "Quản trị Kinh doanh — Đại học FPT",
    skills: ["Khảo sát", "Tiếp thị", "Kết nối nghệ nhân", "Phân tích"],
    linkedin: "https://linkedin.com",
  },
  {
    name: "Đỗ Hồng Nghĩa",
    role: "Mô hình kinh doanh, vận hành",
    bio: "Thiết kế bảng giá và mạng lưới xưởng in đối tác.",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=800&auto=format&fit=crop",
    education: "Quản trị Kinh doanh — Đại học FPT",
    skills: ["Mô hình kinh doanh", "Chuỗi cung ứng", "Định giá", "Đối tác"],
    linkedin: "https://linkedin.com",
  },
  {
    name: "Trần Thị Trúc Phương",
    role: "Phân tích tài chính, thị trường",
    bio: "Phân tích quy mô thị trường và dự báo dòng tiền.",
    avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=800&auto=format&fit=crop",
    education: "Tài chính — Ngân hàng — Đại học FPT",
    skills: ["Tài chính", "Quy mô thị trường", "Chi phí đơn vị", "Nghiên cứu thị trường"],
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
                    className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
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

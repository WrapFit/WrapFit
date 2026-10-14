"use client";

import { ChevronDown, HelpCircle, MessageCircleQuestion, Sparkles } from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import { Container, Eyebrow, FeatureCard, Reveal } from "@/components/landing";
import { cn } from "@/utils/helpers";

interface FaqItem {
  question: string;
  answer: string;
  highlight?: string;
}

const HOME_FAQS: FaqItem[] = [
  {
    question: "Tôi không biết dùng Illustrator hay Photoshop thì có tự thiết kế hộp được không?",
    answer:
      "Hoàn toàn được! WrapFit được thiết kế theo tư duy không cần kinh nghiệm đồ họa: bạn chỉ cần nhập kích thước món quà (Dài × Rộng × Cao theo milimét), hệ thống sẽ tự động tính toán dung sai, sinh bản vẽ khuôn bế và dựng hộp 3D trực quan. Trợ lý AI Bé Gói sẽ tự động cảnh báo nếu chữ hoặc logo bị tràn lề hay đè lên nếp gấp.",
    highlight: "Không cần kinh nghiệm CAD/Design",
  },
  {
    question: "WrapFit có bắt buộc đặt số lượng tối thiểu (MOQ) hàng trăm hộp như các xưởng in truyền thống không?",
    answer:
      "Không. WrapFit ứng dụng công nghệ cắt kỹ thuật số phẳng (Flatbed Digital Cutting), cho phép sản xuất linh hoạt từ 20 – 50 hộp mà không cần tốn 1.5 – 2 triệu VNĐ chi phí làm khuôn dao sắt kim loại. Đây là giải pháp hoàn hảo cho các shop handmade, tiệm bánh, mỹ phẩm làm theo mùa vụ.",
    highlight: "Sản xuất từ 20 hộp · Tiết kiệm tiền khuôn",
  },
  {
    question: "File xuất từ WrapFit mang ra xưởng in bất kỳ thì họ có nhận in và bế được ngay không?",
    answer:
      "Chắc chắn có. File xuất từ WrapFit là file vector chuẩn in công nghiệp đạt chứng nhận kỹ thuật quốc tế: PDF CMYK 300 DPI tách lớp rõ ràng (đường cắt CutContour đỏ #E53E3E, đường cấn Crease xanh #3182CE), kèm định dạng SVG và DXF tương thích với 100% phần mềm máy bế xưởng in tại Việt Nam.",
    highlight: "Chuẩn in công nghiệp CMYK 300 DPI",
  },
  {
    question: "Làm sao để tôi được cầm mẫu hộp thực tế trên tay trước khi quyết định in số lượng lớn?",
    answer:
      "WrapFit liên kết với mạng lưới xưởng in đối tác hỗ trợ in thử đúng 01 hộp mẫu thực tế gửi tận tay bạn kiểm định trước khi in loạt. Ngoài ra, bạn có thể tham gia Danh sách chờ (Waitlist) đợt 1 ngay trên trang để nhận gói tài trợ in 01 hộp mẫu hoàn toàn miễn phí.",
    highlight: "In mẫu thử 01 hộp tận tay",
  },
  {
    question: "Tôi có phải trả phí để thiết kế và xoay lật xem thử hộp 3D không?",
    answer:
      "Hoàn toàn miễn phí. Gói Free của WrapFit cung cấp đầy đủ công cụ Studio: chọn 4 cấu trúc hộp chuẩn, nhập kích thước theo milimét, kéo thả logo, xoay lật 360° mô phỏng gập mở 3D và chạy kiểm định FitCheck™ mà không yêu cầu thẻ tín dụng hay trả trước bất kỳ khoản phí nào.",
    highlight: "Miễn phí 100% Studio 3D cơ bản",
  },
];

export function HomeFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0); // Open first item by default

  const toggleItem = (index: number) => {
    setOpenIndex((current) => (current === index ? null : index));
  };

  return (
    <section id="faq" className="bg-landing-canvas py-14 lg:py-24">
      <Container>
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-10 lg:mb-14">
            <Reveal variant="text" className="flex flex-col items-center">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-stone-200/90 bg-white/90 px-3.5 py-1.5 shadow-soft-8 backdrop-blur-md mb-3">
                <HelpCircle className="size-3.5 text-[#F26522]" />
                <span className="text-xs font-semibold tracking-wide text-stone-700 uppercase">
                  Giải đáp thắc mắc thường gặp
                </span>
              </div>

              <h2 className="font-landing-heading text-3xl font-bold tracking-tight text-landing-ink lg:text-4xl">
                Những Câu Hỏi Phổ Biến Nhất
              </h2>
              <p className="mt-3 max-w-2xl text-base leading-7 text-landing-muted lg:text-lg">
                Mọi điều bạn cần biết về quy trình làm hộp quà, kiểm định FitCheck™ và chuẩn in ấn cùng WrapFit.
              </p>
            </Reveal>
          </div>

          {/* Accordion List */}
          <div className="space-y-3.5">
            {HOME_FAQS.map((faq, index) => {
              const isOpen = openIndex === index;
              return (
                <div
                  key={faq.question}
                  className={cn(
                    "overflow-hidden rounded-2xl border transition-all duration-200",
                    isOpen
                      ? "border-stone-300 bg-white shadow-soft-8"
                      : "border-stone-200/80 bg-white/80 hover:bg-white hover:border-stone-300"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => toggleItem(index)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-4 p-4 sm:p-5 text-left outline-none"
                  >
                    <div className="flex items-center gap-3 pr-2">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-stone-100 font-mono text-xs font-bold text-stone-600">
                        0{index + 1}
                      </span>
                      <span className="font-landing-heading text-base sm:text-lg font-semibold text-landing-ink">
                        {faq.question}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {faq.highlight && (
                        <span className="hidden md:inline-block rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200/60">
                          {faq.highlight}
                        </span>
                      )}
                      <div
                        className={cn(
                          "flex size-7 items-center justify-center rounded-full bg-stone-100 text-stone-500 transition-transform duration-300",
                          isOpen && "rotate-180 bg-stone-900 text-white"
                        )}
                      >
                        <ChevronDown className="size-4" />
                      </div>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-sm sm:text-base leading-relaxed text-landing-muted border-t border-stone-100 mt-1">
                      <p>{faq.answer}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Contact help prompt */}
          <div className="mt-8 text-center text-xs sm:text-sm text-landing-muted flex items-center justify-center gap-2">
            <MessageCircleQuestion className="size-4 text-stone-400" />
            <span>Bạn còn thắc mắc khác? Ghé thăm</span>
            <Link href="/support" className="font-semibold text-stone-900 underline hover:text-[#F26522] transition-colors">
              Trung tâm hỗ trợ
            </Link>
            <span>hoặc nhắn tin trực tiếp với Trợ lý Gói!</span>
          </div>
        </div>
      </Container>
    </section>
  );
}

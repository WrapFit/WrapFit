"use client";

import { HelpCircle, MessageCircleQuestion } from "lucide-react";
import Link from "next/link";
import React from "react";
import { Container, Reveal } from "@/components/landing";
import { Accordion, Badge } from "@/components/ui";

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
      "WrapFit liên kết với mạng lưới xưởng in đối tác hỗ trợ in thử đúng 01 hộp mẫu thực tế gửi tận tay bạn kiểm định trước khi in loạt. Bạn đặt hộp mẫu ngay từ dự án của mình qua Giỏ in mẫu, không cần đặt số lượng tối thiểu.",
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
  return (
    <section id="faq" className="bg-landing-canvas py-14 lg:py-24">
      <Container>
        <div className="mx-auto max-w-4xl">
          <div className="mb-10 flex flex-col items-center text-center lg:mb-14">
            <Reveal variant="text" className="flex flex-col items-center">
              <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-line/80 bg-white/90 px-3.5 py-1.5 shadow-soft-8 backdrop-blur-md">
                <HelpCircle className="size-3.5 text-fpt-orange" aria-hidden />
                <span className="text-overline uppercase text-fg-muted">Giải đáp thắc mắc thường gặp</span>
              </div>
              <h2 className="font-landing-heading text-heading-lg text-fg">Những Câu Hỏi Phổ Biến Nhất</h2>
              <p className="mt-3 max-w-2xl text-body text-fg-muted lg:text-body-lg">
                Mọi điều bạn cần biết về quy trình làm hộp quà, kiểm định FitCheck™ và chuẩn in ấn cùng WrapFit.
              </p>
            </Reveal>
          </div>

          {/* One answer open at a time, the first one to start with. */}
          <Accordion
            type="single"
            defaultOpen={["faq-0"]}
            items={HOME_FAQS.map((faq, index) => ({
              id: `faq-${index}`,
              title: faq.question,
              meta: faq.highlight ? (
                <Badge tone="success" className="hidden md:inline-flex">
                  {faq.highlight}
                </Badge>
              ) : undefined,
              content: <p>{faq.answer}</p>,
            }))}
          />

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-center text-body-sm text-fg-muted">
            <MessageCircleQuestion className="size-4" aria-hidden />
            <span>Bạn còn thắc mắc khác? Ghé thăm</span>
            <Link href="/support" className="font-semibold text-fg underline underline-offset-4 transition-colors hover:text-fpt-orange-ink">
              Trung tâm hỗ trợ
            </Link>
            <span>hoặc nhắn tin trực tiếp với Trợ lý Gói!</span>
          </div>
        </div>
      </Container>
    </section>
  );
}

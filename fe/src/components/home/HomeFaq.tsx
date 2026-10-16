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
    question: "Không biết dùng phần mềm thiết kế thì có làm được hộp không?",
    answer: "Được. Bạn chỉ cần nhập kích thước món quà, WrapFit tự dựng khuôn bế và hộp 3D. Trợ lý Gói nhắc khi chữ hay logo lấn nếp gấp.",
    highlight: "Không cần biết thiết kế",
  },
  {
    question: "Có phải đặt in hàng trăm hộp không?",
    answer: "Không. Máy cắt kỹ thuật số in được từ 20 hộp, không tốn tiền làm khuôn dao.",
    highlight: "In từ 20 hộp",
  },
  {
    question: "Mang file ra xưởng in bất kỳ có in được không?",
    answer: "Được. File PDF CMYK 300 DPI tách lớp đường cắt, đường gấp, kèm SVG và DXF cho máy cắt.",
    highlight: "Chuẩn xưởng in",
  },
  {
    question: "Tôi có thể cầm hộp mẫu trước khi in số lượng lớn không?",
    answer: "Có. Đặt in thử một hộp mẫu ngay trong dự án, xưởng đối tác gửi tận tay bạn.",
    highlight: "In thử 1 hộp",
  },
  {
    question: "Thiết kế và xem hộp 3D có mất phí không?",
    answer: "Không. Gói miễn phí có đủ Studio, xem 3D và FitCheck™, không cần thẻ thanh toán.",
    highlight: "Miễn phí",
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
                <span className="text-overline uppercase text-fg-muted">Hỏi đáp</span>
              </div>
              <h2 className="font-landing-heading text-heading-lg text-fg">Câu hỏi thường gặp</h2>
              <p className="mt-3 max-w-2xl text-body text-fg-muted lg:text-body-lg">
                Những điều bạn hay thắc mắc khi làm hộp cùng WrapFit.
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
            <span>Còn thắc mắc? Ghé</span>
            <Link href="/support" className="font-semibold text-fg underline underline-offset-4 transition-colors hover:text-fpt-orange-ink">
              Trung tâm hỗ trợ
            </Link>
            <span>hoặc hỏi Trợ lý Gói.</span>
          </div>
        </div>
      </Container>
    </section>
  );
}

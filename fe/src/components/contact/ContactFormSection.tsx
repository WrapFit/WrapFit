"use client";

import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Globe,
  GraduationCap,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
  Sparkles,
} from "lucide-react";
import React, { useState } from "react";
import { BRANDS, BrandIcon, type Brand } from "@/components/common/BrandIcon";
import { GoiMascot } from "@/components/common/GoiMascot";
import { Container, Eyebrow, Reveal, limeButton } from "@/components/landing";
import { Field, Input, SelectMenu, Textarea } from "@/components/ui";
import { cn } from "@/utils/helpers";

const SOCIAL_CHANNELS: { brand: Brand; handle: string; href: string }[] = [
  { brand: "zalo", handle: "WrapFit", href: "https://zalo.me" },
  { brand: "facebook", handle: "@wrapfit.platform", href: "https://facebook.com" },
  { brand: "instagram", handle: "@wrapfit.craft", href: "https://instagram.com" },
  { brand: "tiktok", handle: "@wrapfit.packaging", href: "https://tiktok.com" },
];

const TOPICS = [
  { value: "Tư vấn cấu trúc & kích thước hộp", label: "Tư vấn kiểu hộp và kích thước" },
  { value: "Hỗ trợ kỹ thuật in & FitCheck™", label: "Hỗ trợ kỹ thuật in và FitCheck™" },
  { value: "Đăng ký gia nhập mạng lưới Xưởng in", label: "Đăng ký làm xưởng in đối tác" },
  { value: "Đặt in mẫu thử 01 hộp", label: "Đặt in thử một hộp mẫu" },
  { value: "Hợp tác thương mại & Đơn lớn", label: "Hợp tác và đơn hàng lớn" },
  { value: "Khác", label: "Câu hỏi khác" },
];

export function ContactFormSection() {
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    topic: "Tư vấn cấu trúc & kích thước hộp",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
    }, 1000);
  };

  return (
    <section id="contact-form" className="bg-landing-canvas py-12 lg:py-20 border-t border-line/60">
      <Container>
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-14">
          {/* Left Column (5 cols): Office Location, Segmented Contacts, Social Media & Mascot */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div>
              <span className="text-xs font-semibold text-fpt-orange-ink uppercase tracking-wider">
                Kênh liên hệ trực tiếp
              </span>
              <h2 className="font-landing-heading text-2xl sm:text-3xl font-bold text-landing-ink mt-1">
                Ghé thăm hoặc kết nối với chúng tôi
              </h2>
              <p className="mt-2 text-sm text-landing-muted leading-relaxed">
                Gặp chúng tôi tại trường hoặc qua mạng xã hội.
              </p>
            </div>

            {/* Direct Info List */}
            <div className="space-y-4 rounded-3xl border border-line/90 bg-white p-5 sm:p-6 shadow-soft-8">
              {/* Address */}
              <div className="flex items-start gap-3 text-sm">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-fpt-orange-light text-fpt-orange-ink">
                  <MapPin className="size-4" />
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase text-fg-muted block">Trụ sở & văn phòng</span>
                  <span className="font-semibold text-fg block mt-0.5">Đại học FPT</span>
                </div>
              </div>

              {/* Segmented Phone: Support vs Sales */}
              <div className="flex items-start gap-3 text-sm pt-2 border-t border-line/60">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-info-bg text-fpt-blue">
                  <Phone className="size-4" />
                </div>
                <div className="flex flex-col gap-1 w-full">
                  <span className="text-xs font-semibold uppercase text-fg-muted">Đường dây nóng</span>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
                    <span className="text-fg-muted">Tư vấn in ấn, kỹ thuật:</span>
                    <span className="inline-flex min-h-6 items-center text-fg-muted">Đang cập nhật</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
                    <span className="text-fg-muted">Hợp tác xưởng in, báo giá:</span>
                    <span className="inline-flex min-h-6 items-center text-fg-muted">Đang cập nhật</span>
                  </div>
                </div>
              </div>

              {/* Segmented Emails */}
              <div className="flex items-start gap-3 text-sm pt-2 border-t border-line/60">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-success-bg text-success">
                  <Mail className="size-4" />
                </div>
                <div className="flex flex-col gap-1 w-full">
                  <span className="text-xs font-semibold uppercase text-fg-muted">Hòm thư điện tử</span>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
                    <span className="text-fg-muted">Hỗ trợ người dùng:</span>
                    <span className="inline-flex min-h-6 items-center text-fg-muted">Đang cập nhật</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
                    <span className="text-fg-muted">Hợp tác, đối tác:</span>
                    <span className="inline-flex min-h-6 items-center text-fg-muted">Đang cập nhật</span>
                  </div>
                </div>
              </div>

              {/* Working Hours */}
              <div className="flex items-start gap-3 text-sm pt-2 border-t border-line/60">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-sunken text-fg-muted">
                  <Clock className="size-4" />
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase text-fg-muted block">Thời gian làm việc</span>
                  <span className="text-xs text-fg-muted block mt-0.5 font-medium">
                    Thứ 2 – Thứ 7: 08:30 – 18:00
                  </span>
                </div>
              </div>
            </div>

            {/* Social Media Accounts */}
            <div>
              <span className="text-xs font-semibold text-fg-muted uppercase tracking-wider block mb-2.5">
                Kênh mạng xã hội chính thức
              </span>
              <div className="grid grid-cols-2 gap-2">
                {SOCIAL_CHANNELS.map((social) => (
                  <a
                    key={social.brand}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${BRANDS[social.brand].name} ${social.handle}`}
                    className="flex min-h-11 items-center gap-2.5 rounded-xl border border-line bg-white p-2.5 text-xs transition-colors hover:border-line-strong hover:bg-surface-sunken"
                  >
                    <BrandIcon brand={social.brand} className="size-5 shrink-0" />
                    <span className="flex min-w-0 flex-col">
                      <span className="font-semibold text-fg">{BRANDS[social.brand].name}</span>
                      <span className="truncate text-fg-muted">{social.handle}</span>
                    </span>
                  </a>
                ))}
              </div>
            </div>

            {/* Mascot Bé Gói with friendly speech bubble */}
            <div className="flex items-center gap-4 rounded-3xl bg-white/70 p-4 border border-line/80 shadow-soft-8">
              <GoiMascot
                pose="waving"
                size={80}
                bubbleText="Gói sẵn sàng lắng nghe mọi câu hỏi về bao bì của bạn!"
                bubblePlacement="top-right"
                showBubbleOnBoop={true}
                label="Bé Gói chào đón bạn"
              />
              <div className="flex flex-col text-xs text-fg-muted leading-relaxed">
                <span className="font-bold text-fg">Trợ lý Bé Gói</span>
                <span>Cần gấp? Bấm vào Gói để trò chuyện.</span>
              </div>
            </div>
          </div>

          {/* Right Column (7 cols): Interactive Contact Form */}
          <div className="lg:col-span-7">
            <div className="rounded-3xl border border-line/90 bg-white p-6 sm:p-10 shadow-soft-16">
              {submitted ? (
                /* Success Confirmation State */
                <div className="flex flex-col items-center text-center py-10">
                  <div className="flex size-14 items-center justify-center rounded-full bg-success-bg text-success-fg mb-4 animate-bounce">
                    <CheckCircle2 className="size-8" />
                  </div>
                  <h3 className="font-landing-heading text-2xl sm:text-3xl font-bold text-fg">
                    Cảm ơn bạn đã liên hệ!
                  </h3>
                  <p className="mt-3 max-w-md text-sm text-fg-muted leading-relaxed">
                    Lời nhắn của bạn đã được chuyển tới chuyên viên phụ trách bộ phận{" "}
                    <strong className="text-fg">{formData.topic}</strong>. Chúng tôi sẽ phản hồi qua email{" "}
                    <strong className="text-fg">{formData.email}</strong> trong vòng 15 – 30 phút.
                  </p>

                  <button
                    type="button"
                    onClick={() => setSubmitted(false)}
                    className="mt-8 inline-flex items-center gap-2 text-xs font-semibold text-fg-muted hover:text-fg underline transition-colors"
                  >
                    Gửi thêm lời nhắn khác
                  </button>
                </div>
              ) : (
                /* The Contact Form */
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                  <div>
                    <span className="text-xs font-semibold text-fg-muted uppercase tracking-wider block">
                      Gửi tin nhắn trực tiếp
                    </span>
                    <h3 className="font-landing-heading text-2xl font-bold text-fg mt-0.5">
                      Điền thông tin yêu cầu tư vấn
                    </h3>
                    <p className="text-xs sm:text-sm text-fg-muted mt-1">
                      Thông tin của bạn được bảo mật.
                    </p>
                  </div>

                  {/* Name & Phone in 2 cols */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Họ và tên" required>
                      {(props) => (
                        <Input {...props} type="text" required autoComplete="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Nguyễn Văn A" />
                      )}
                    </Field>

                    <Field label="Số điện thoại" required>
                      {(props) => (
                        <Input {...props} type="tel" required autoComplete="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="090 123 4567" />
                      )}
                    </Field>
                  </div>

                  {/* Email */}
                  <Field label="Email nhận phản hồi" required>
                    {(props) => (
                      <Input {...props} type="email" required autoComplete="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="name@example.com" />
                    )}
                  </Field>

                  {/* Segmented Topic Selector */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-label text-fg">Chủ đề bạn cần hỗ trợ</span>
                    <SelectMenu
                      label="Chủ đề bạn cần hỗ trợ"
                      value={formData.topic}
                      onChange={(topic) => setFormData({ ...formData, topic })}
                      options={TOPICS}
                      className="w-full"
                    />
                  </div>

                  {/* Message textarea */}
                  <Field label="Chi tiết lời nhắn hoặc kích thước món quà">
                    {(props) => (
                      <Textarea
                        {...props}
                        rows={4}
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder="Mô tả món quà của bạn (loại quà, kích thước mm dự kiến nếu có, loại giấy yêu thích, số lượng mong muốn)..."
                        className="resize-none"
                      />
                    )}
                  </Field>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={cn(
                      limeButton(),
                      "w-full justify-center shadow-soft-8 font-semibold text-sm mt-1",
                      isSubmitting && "opacity-60 cursor-not-allowed"
                    )}
                  >
                    {isSubmitting ? (
                      <span>Đang gửi thông tin...</span>
                    ) : (
                      <>
                        <span>Gửi lời nhắn ngay</span>
                        <Send className="size-4" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

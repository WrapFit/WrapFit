"use client";

import { Box, Compass, HeartHandshake, Sparkles } from "lucide-react";
import React from "react";
import { Container, Eyebrow, Reveal } from "@/components/landing";

export function AboutHero() {
  return (
    <section className="bg-gradient-to-b from-white via-landing-canvas to-landing-canvas pt-28 sm:pt-36 pb-12 lg:pb-16">
      <Container>
        <div className="mx-auto max-w-4xl text-center">
          <Reveal variant="text" className="flex flex-col items-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success-bg px-3.5 py-1 text-xs font-semibold text-success-fg mb-4 border border-success/60">
              <Sparkles className="size-3.5 text-success-fg" />
              Câu chuyện khởi nghiệp WrapFit
            </span>

            <h1 className="font-landing-heading text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-landing-ink leading-[1.15]">
              Chiếc hộp được thiết kế <br className="hidden sm:inline" />
              <span className="text-fpt-orange-ink">ôm trọn món quà</span> từ milimét.
            </h1>

            <p className="mt-5 text-base sm:text-xl leading-relaxed text-landing-muted max-w-2xl">
              Chúng tôi bắt đầu WrapFit với một niềm tin giản dị:{" "}
              <strong className="text-fg font-semibold">
                &ldquo;Món quà là thứ mang đậm dấu ấn cá nhân. Tại sao chiếc hộp bên ngoài lại phải rập khuôn công nghiệp?&rdquo;
              </strong>
            </p>
          </Reveal>
        </div>

        {/* Origin Story Content Block */}
        <div className="mt-12 sm:mt-16 mx-auto max-w-4xl rounded-3xl border border-line/90 bg-white p-6 sm:p-10 lg:p-12 shadow-soft-16">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-7 flex flex-col gap-4 text-sm sm:text-base leading-relaxed text-fg-muted">
              <span className="text-xs font-bold uppercase tracking-wider text-fpt-orange-ink">
                Khởi nguồn từ thực tế (Origin Story)
              </span>

              <h2 className="font-landing-heading text-2xl sm:text-3xl font-bold text-fg">
                Nỗi niềm của người làm quà tinh tế
              </h2>

              <p>
                Những người sáng tạo đồ thủ công tại Việt Nam — từ tiệm nến thơm, xưởng trang sức bạc, tiệm bánh ngọt hay thương hiệu trà hoa — luôn đặt trọn tâm huyết vào từng chi tiết của sản phẩm. Nhưng khi đến khâu đóng gói, họ đều vấp phải một rào cản vô lý:
              </p>

              <blockquote className="border-l-2 border-fpt-orange pl-4 italic text-fg font-medium">
                Mua hộp carton có sẵn thì rộng thênh thang, phải nhét đầy rơm xốp vụn vừa mất mỹ quan vừa lãng phí; còn muốn đặt hộp riêng thì các xưởng in đòi số lượng tối thiểu từ 500 – 1.000 hộp kèm tiền làm khuôn dao bế 2 triệu VNĐ.
              </blockquote>

              <p>
                Đó là lý do <strong className="text-fg">WrapFit</strong> ra đời tại Đại học FPT (chương trình Khởi nghiệp EXE101). Chúng tôi phát triển một thuật toán CAD tự sinh khuôn bế theo đúng số đo milimét của món quà, mô phỏng 3D thời gian thực và kết nối trực tiếp với bàn cắt phẳng kỹ thuật số — giúp bất kỳ ai cũng có thể đặt in từ 20 chiếc hộp vừa khít mà không tốn tiền làm khuôn.
              </p>
            </div>

            <div className="md:col-span-5 flex flex-col gap-3">
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-line shadow-soft-8">
                <img
                  src="https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=800&auto=format&fit=crop"
                  alt="Nghệ nhân thủ công đóng gói hộp quà"
                  className="size-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-4">
                  <span className="text-xs font-medium text-white">
                    Chiếc hộp vừa vặn là chiếc hộp tôn vinh sự hiện diện của món quà
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-xl bg-surface-sunken/50 p-3 border border-line/60">
                  <span className="block font-mono text-xl font-bold text-fg">100%</span>
                  <span className="text-caption text-fg-muted">Khả thi sản xuất</span>
                </div>
                <div className="rounded-xl bg-surface-sunken/50 p-3 border border-line/60">
                  <span className="block font-mono text-xl font-bold text-success-fg">Zero MOQ</span>
                  <span className="text-caption text-fg-muted">Sản xuất từ 20 hộp</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

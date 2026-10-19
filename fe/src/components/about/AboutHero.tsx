"use client";

import Image from "next/image";
import React from "react";
import { Container, Reveal } from "@/components/landing";
import { PHOTOS } from "@/features/site/photos";

export function AboutHero() {
  return (
    <section className="bg-gradient-to-b from-white via-landing-canvas to-landing-canvas pt-28 sm:pt-36 pb-12 lg:pb-16">
      <Container>
        <div className="mx-auto max-w-4xl text-center">
          <Reveal variant="text" className="flex flex-col items-center">
            <h1 className="font-landing-heading text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-landing-ink leading-[1.15]">
              Chiếc hộp được thiết kế <br className="hidden sm:inline" />
              <span className="text-fpt-orange-ink">ôm trọn món quà</span> từ milimét.
            </h1>

            <p className="mt-5 text-base sm:text-xl leading-relaxed text-landing-muted max-w-2xl">
              Món quà mang dấu ấn riêng, chiếc hộp cũng vậy.
            </p>
          </Reveal>
        </div>

        {/* Origin Story Content Block */}
        <div className="mt-12 sm:mt-16 mx-auto max-w-4xl rounded-3xl border border-line/90 bg-white p-6 sm:p-10 lg:p-12 shadow-soft-16">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-7 flex flex-col gap-4 text-sm sm:text-base leading-relaxed text-fg-muted">
              <span className="text-xs font-bold uppercase tracking-wider text-fpt-orange-ink">
                Câu chuyện khởi đầu
              </span>

              <h2 className="font-landing-heading text-2xl sm:text-3xl font-bold text-fg">
                Vì sao có WrapFit
              </h2>

              <p>
                Người làm quà thủ công chăm chút từng sản phẩm, nhưng lại khó tìm được chiếc hộp vừa ý:
              </p>

              <blockquote className="border-l-2 border-fpt-orange pl-4 italic text-fg font-medium">
                Hộp có sẵn thì rộng, phải nhồi lót. Đặt hộp riêng thì phải in hàng trăm chiếc và trả tiền khuôn dao.
              </blockquote>

              <p>
                <strong className="text-fg">WrapFit</strong> ra đời tại Đại học FPT để ai cũng tự làm được hộp vừa khít món quà, in từ 20 chiếc, không tốn tiền khuôn.
              </p>
            </div>

            <div className="md:col-span-5 flex flex-col gap-3">
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-line shadow-soft-8">
                {/* Above the fold: loaded first (priority), as AVIF/WebP at the column width. */}
                <Image src={PHOTOS.giftHands.src} alt={PHOTOS.giftHands.alt} fill priority sizes="(min-width: 768px) 40vw, 100vw" className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-4">
                  <span className="text-xs font-medium text-white">
                    Hộp vừa khít, món quà trọn vẹn
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-xl bg-surface-sunken/50 p-3 border border-line/60">
                  <span className="block font-mono text-xl font-bold text-fg">100%</span>
                  <span className="text-caption text-fg-muted">Khả thi sản xuất</span>
                </div>
                <div className="rounded-xl bg-surface-sunken/50 p-3 border border-line/60">
                  <span className="block font-mono text-xl font-bold text-fpt-orange-ink">Từ 20 hộp</span>
                  <span className="text-caption text-fg-muted">Không cần khuôn dao</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

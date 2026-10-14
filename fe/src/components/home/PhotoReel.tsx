import React from "react";
import { Carousel } from "@/components/landing";
import { PHOTO_REEL } from "./content";

/** Full-width reel of square product shots. */
export function PhotoReel() {
  return (
    <section aria-label="Hộp quà làm cùng WrapFit" className="overflow-x-clip pt-4 pb-8 lg:pt-6 lg:pb-12">
      <Carousel label="Ảnh hộp quà làm cùng WrapFit" bleed="full" slideClassName="w-[78vw] sm:w-[340px] md:w-[400px] 2xl:w-[520px]">
        {PHOTO_REEL.map((item) => (
          <div key={item.image} className="group relative aspect-square overflow-hidden rounded-2xl bg-landing-tile">
            <img
              src={item.image}
              alt={item.alt}
              loading="lazy"
              className="size-full object-cover transition-[filter] duration-300 group-hover:brightness-[0.95]"
            />
          </div>
        ))}
      </Carousel>
    </section>
  );
}

import React from "react";
import { cn } from "@/utils/helpers";
import { STANDARDS } from "./content";
import { Container } from "@/components/landing";

/** Grey wordmarks of the standards and file formats WrapFit works with, where pack.ly shows its clients' logos. */
export function StandardsStrip() {
  return (
    <section aria-label="Tiêu chuẩn và định dạng tương thích" className="py-5 lg:py-7 border-y border-stone-200/60 bg-stone-50/60 backdrop-blur-xs">
      <Container>
        <ul className="grid grid-cols-4 items-center gap-x-6 gap-y-8 sm:grid-cols-8 sm:gap-10">
          {STANDARDS.map((item) => (
            <li
              key={item.label}
              className={cn(
                "flex items-center justify-center text-lg whitespace-nowrap text-landing-muted/60 select-none lg:text-2xl",
                item.className
              )}
            >
              {item.label}
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

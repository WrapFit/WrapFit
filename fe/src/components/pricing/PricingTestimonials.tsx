"use client";

import { Star } from "lucide-react";
import React from "react";
import { Container, Reveal } from "@/components/landing";

interface Testimonial {
  stars: number;
  quote: string;
  avatar: string;
  name: string;
  role: string;
  company: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    stars: 5,
    quote:
      "Love the simplicity of the service and the prompt customer support. We can’t imagine working without it.",
    avatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=300&auto=format&fit=crop",
    name: "Kelly Williams",
    role: "Head of Design",
    company: "Layers",
  },
  {
    stars: 5,
    quote:
      "Incredibly intuitive platform that works so well for us. Quickly became a must-have tool for everyone in the business.",
    avatar:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=300&auto=format&fit=crop",
    name: "Maxine Bunton",
    role: "Lead Product Designer",
    company: "After",
  },
];

export function PricingTestimonials() {
  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-white">
      <Container>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-5xl mx-auto">
          {TESTIMONIALS.map((t) => (
            <Reveal key={t.name}>
              <div className="flex h-full flex-col justify-between items-center text-center rounded-3xl border border-stone-200/90 bg-white p-8 sm:p-10 shadow-[0_4px_24px_rgba(0,0,0,0.04)] transition-all hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
                <div>
                  {/* 5 Golden Stars */}
                  <div className="flex items-center justify-center gap-1.5 mb-5">
                    {[...Array(t.stars)].map((_, i) => (
                      <Star
                        key={i}
                        className="size-5 fill-amber-400 text-amber-400"
                        aria-hidden="true"
                      />
                    ))}
                  </div>

                  {/* Testimonial Quote */}
                  <blockquote className="font-landing-heading text-lg sm:text-xl font-medium text-stone-900 leading-relaxed max-w-md mx-auto">
                    &ldquo;{t.quote}&rdquo;
                  </blockquote>
                </div>

                {/* Author Info */}
                <div className="mt-8 flex flex-col items-center">
                  <div className="size-14 overflow-hidden rounded-full border-2 border-white shadow-soft-8 mb-3">
                    <img
                      src={t.avatar}
                      alt={t.name}
                      className="size-full object-cover"
                    />
                  </div>
                  <h4 className="font-landing-heading text-base font-bold text-stone-900">
                    {t.name}
                  </h4>
                  <p className="text-xs text-stone-500 font-medium mt-0.5">
                    {t.role}, {t.company}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}

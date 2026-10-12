import Link from "next/link";
import React from "react";
import { cn } from "@/utils/helpers";
import { MADE_IN } from "./content";
import { CardTitle, Container, Eyebrow, FeatureCard, Reveal, limeButton } from "@/components/landing";

/** Last card: who WrapFit is built for, with two photos above a wide one. */
export function MadeInVietnam() {
  const [first, second, wide] = MADE_IN.images;
  return (
    <section className="py-12 lg:py-24">
      <Reveal>
        <Container>
          <FeatureCard>
            <article className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2">
              <div className="flex flex-col gap-4">
                <Reveal variant="text">
                  <Eyebrow>{MADE_IN.eyebrow}</Eyebrow>
                  <CardTitle>{MADE_IN.title}</CardTitle>
                </Reveal>
                <p className="text-base leading-7 text-landing-muted lg:text-lg">{MADE_IN.body}</p>
                <Link href={MADE_IN.cta.href} className={cn(limeButton("sm"), "w-fit")}>
                  {MADE_IN.cta.label}
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3 lg:gap-4">
                {[first, second].map((image) => (
                  <img key={image.src} src={image.src} alt={image.alt} loading="lazy" className="aspect-[245/173] w-full rounded-2xl object-cover" />
                ))}
                <img src={wide.src} alt={wide.alt} loading="lazy" className="col-span-2 aspect-video w-full rounded-2xl object-cover" />
              </div>
            </article>
          </FeatureCard>
        </Container>
      </Reveal>
    </section>
  );
}

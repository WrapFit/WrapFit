import React from "react";
import { MADE_IN } from "./content";
import { CardTitle, Container, Eyebrow, FeatureCard, Reveal } from "@/components/landing";

/** Last card: who WrapFit is built for, with two photos above a wide one. */
export function MadeInVietnam() {
  const [first, second, wide] = MADE_IN.images;
  return (
    <section className="py-10 lg:py-16">
      <Reveal>
        <Container>
          <FeatureCard>
            <article className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-12">
              <div className="flex flex-col gap-4">
                <Reveal variant="text">
                  <Eyebrow>{MADE_IN.eyebrow}</Eyebrow>
                  <CardTitle>{MADE_IN.title}</CardTitle>
                </Reveal>
                <p className="text-base leading-7 text-landing-muted lg:text-lg">{MADE_IN.body}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 lg:gap-4">
                {[first, second].map((image) => (
                  <img key={image.src} src={image.src} alt={image.alt} loading="lazy" className="aspect-[4/3] w-full rounded-2xl object-cover" />
                ))}
                <img src={wide.src} alt={wide.alt} loading="lazy" className="col-span-2 aspect-[2/1] w-full rounded-2xl object-cover" />
              </div>
            </article>
          </FeatureCard>
        </Container>
      </Reveal>
    </section>
  );
}

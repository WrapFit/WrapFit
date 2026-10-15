import { ArrowRight } from "lucide-react";
import Link from "next/link";
import React from "react";
import { cn } from "@/utils/helpers";
import { BANNER } from "./content";
import { Container, Reveal, limeButton } from "@/components/landing";

/** Full-width dark green band over a slowly drifting kraft paper photo. */
export function GreenBanner() {
  return (
    <section
      className="relative isolate overflow-hidden bg-landing-green-night bg-cover bg-center bg-no-repeat py-24 lg:py-48"
      style={{ backgroundImage: `url(${BANNER.image})` }}
    >
      {/* Deep green wash over the paper, darker on the left where the text sits */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-landing-green-night/95 via-landing-green-night/85 to-landing-green-night/70" />
      <Container>
        <Reveal variant="text" className="mx-auto flex max-w-3xl flex-col gap-4 lg:gap-6">
          <div>
            <p className="font-landing-heading text-lg font-semibold text-fpt-green lg:text-xl">{BANNER.eyebrow}</p>
            <h2 className="mt-2 font-landing-heading text-3xl font-bold leading-tight tracking-tight text-landing-lime-mist lg:text-4xl">
              {BANNER.title}
            </h2>
          </div>
          <p className="text-lg leading-7 text-landing-lime-mist lg:text-2xl lg:leading-8">{BANNER.body}</p>
          <Link href={BANNER.cta.href} className={cn(limeButton(), "w-fit")}>
            {BANNER.cta.label}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </Reveal>
      </Container>
    </section>
  );
}

import type { ParticleEffect } from "@/types/api";

/**
 * Particle effects of the unboxing page, drawn on a full-screen 2D canvas (no assets). Each effect plays once, for a
 * few seconds, then clears the canvas. Speeds are per 60 fps frame and scaled
 * by the real frame time, so 120 Hz screens play at the same pace.
 */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  spin: number;
  /** 1 → 0; the particle disappears at 0. */
  life: number;
  decay: number;
  /** Phase of the side-to-side sway (petals, snow, hearts). */
  sway: number;
}

type Shape = "ribbon" | "spark" | "heart" | "petal" | "flake";

interface EffectSpec {
  shape: Shape;
  durationMs: number;
  gravity: number;
  drag: number;
  /** Particles born after `fromMs` and up to `toMs` since the start (`fromMs` is -1 on the first frame). */
  emit(width: number, height: number, fromMs: number, toMs: number): Particle[];
}

const GOLD = "#D4AF37";
const CORAL = "#FF6B6B";
const COBALT = "#2563EB";
const CITRON = "#FFD93D";
const IVORY = "#FDFBF7";
const SAGE = "#52796F";

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T,>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)];

/** How many births of a steady stream (one every `intervalMs` until `untilMs`) fall in (fromMs, toMs]. */
const births = (intervalMs: number, untilMs: number, fromMs: number, toMs: number) =>
  Math.max(0, Math.floor(Math.min(toMs, untilMs) / intervalMs) - Math.floor(Math.min(fromMs, untilMs) / intervalMs));

function particle(partial: Partial<Particle> & Pick<Particle, "x" | "y">): Particle {
  return { vx: 0, vy: 0, size: 6, color: GOLD, rotation: 0, spin: 0, life: 1, decay: 0, sway: Math.random() * Math.PI * 2, ...partial };
}

const FIREWORK_SHELLS_MS = [0, 520, 1040, 1560, 2080];

const EFFECTS: Record<Exclude<ParticleEffect, "none">, EffectSpec> = {
  // One burst of paper ribbons from the box.
  confetti: {
    shape: "ribbon",
    durationMs: 3800,
    gravity: 0.22,
    drag: 0.985,
    emit: (w, h, from) =>
      from >= 0
        ? []
        : Array.from({ length: 160 }, () => {
            const angle = Math.random() * Math.PI * 2;
            const speed = rand(4, 14);
            return particle({
              x: w / 2,
              y: h * 0.45,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed - 5,
              size: rand(6, 12),
              color: pick([GOLD, CORAL, COBALT, CITRON, IVORY, SAGE]),
              rotation: rand(0, 360),
              spin: rand(-10, 10),
            });
          }),
  },
  // Five shells bursting over the upper half of the screen.
  fireworks: {
    shape: "spark",
    durationMs: 4600,
    gravity: 0.05,
    drag: 0.975,
    emit: (w, h, from, to) =>
      FIREWORK_SHELLS_MS.filter((at) => from < at && at <= to).flatMap(() => {
        const cx = rand(w * 0.2, w * 0.8);
        const cy = rand(h * 0.15, h * 0.45);
        const color = pick([GOLD, CORAL, COBALT, CITRON]);
        return Array.from({ length: 70 }, (_, i) => {
          const angle = (i / 70) * Math.PI * 2;
          const speed = rand(2.5, 6.5);
          return particle({ x: cx, y: cy, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, size: rand(1.6, 3), color, decay: rand(0.012, 0.02) });
        });
      }),
  },
  // Hearts rising from the bottom.
  hearts: {
    shape: "heart",
    durationMs: 5200,
    gravity: -0.015,
    drag: 0.998,
    emit: (w, h, from, to) =>
      Array.from({ length: births(70, 2600, from, to) }, () =>
        particle({ x: rand(w * 0.1, w * 0.9), y: h + 20, vy: rand(-3, -1.6), size: rand(10, 20), color: pick([CORAL, "#FF8787", GOLD]), decay: 0.004 }),
      ),
  },
  // Mai / đào petals drifting down.
  petals: {
    shape: "petal",
    durationMs: 6500,
    gravity: 0.01,
    drag: 0.995,
    emit: (w, _h, from, to) =>
      Array.from({ length: births(55, 3600, from, to) }, () =>
        particle({ x: rand(0, w), y: -20, vy: rand(0.8, 1.8), size: rand(7, 12), color: pick([CITRON, GOLD, "#F9A8D4", "#FBCFE8"]), rotation: rand(0, 360), spin: rand(-3, 3), decay: 0.0025 }),
      ),
  },
  snow: {
    shape: "flake",
    durationMs: 6500,
    gravity: 0.004,
    drag: 0.998,
    emit: (w, _h, from, to) =>
      Array.from({ length: births(35, 4000, from, to) }, () =>
        particle({ x: rand(0, w), y: -10, vy: rand(0.6, 1.6), size: rand(1.5, 4), color: IVORY, decay: 0.002 }),
      ),
  },
};

function draw(ctx: CanvasRenderingContext2D, shape: Shape, p: Particle) {
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
  ctx.translate(p.x, p.y);
  ctx.rotate((p.rotation * Math.PI) / 180);
  ctx.fillStyle = p.color;
  switch (shape) {
    case "ribbon":
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size * 0.5);
      break;
    case "spark":
    case "flake":
      ctx.beginPath();
      ctx.arc(0, 0, p.size, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "petal":
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size, p.size * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "heart": {
      const s = p.size / 2;
      ctx.beginPath();
      ctx.moveTo(0, s * 0.6);
      ctx.bezierCurveTo(-s * 1.6, -s * 0.4, -s * 0.6, -s * 1.5, 0, -s * 0.6);
      ctx.bezierCurveTo(s * 0.6, -s * 1.5, s * 1.6, -s * 0.4, 0, s * 0.6);
      ctx.fill();
      break;
    }
  }
  ctx.restore();
}

/**
 * Plays `effect` once on `canvas` (sized to the window, pixel ratio ≤ 2). Returns a function that stops it early.
 * `none` draws nothing.
 */
export function playParticles(canvas: HTMLCanvasElement, effect: ParticleEffect): () => void {
  const ctx = canvas.getContext("2d");
  if (effect === "none" || !ctx) return () => undefined;
  const spec = EFFECTS[effect];

  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  let particles: Particle[] = [];
  let raf = 0;
  const start = performance.now();
  let last = start;
  let emittedUntil = -1;

  const tick = (now: number) => {
    const elapsed = now - start;
    const k = Math.min(3, (now - last) / (1000 / 60));
    last = now;

    particles.push(...spec.emit(width, height, emittedUntil, elapsed));
    emittedUntil = elapsed;
    ctx.clearRect(0, 0, width, height);
    particles = particles.filter((p) => {
      p.vy += spec.gravity * k;
      p.vx *= spec.drag ** k;
      p.vy *= spec.drag ** k;
      p.sway += 0.04 * k;
      const drift = spec.shape === "ribbon" || spec.shape === "spark" ? 0 : Math.sin(p.sway) * 0.6;
      p.x += (p.vx + drift) * k;
      p.y += p.vy * k;
      p.rotation += p.spin * k;
      p.life -= p.decay * k;
      // Fade the last second of the effect.
      const fade = Math.min(1, (spec.durationMs + 1000 - elapsed) / 1000);
      const alive = p.life > 0 && p.y < height + 40 && p.y > -60 && p.x > -60 && p.x < width + 60;
      if (alive) draw(ctx, spec.shape, { ...p, life: p.life * fade });
      return alive;
    });

    if (elapsed < spec.durationMs + 1000 && (particles.length || elapsed < spec.durationMs)) {
      raf = requestAnimationFrame(tick);
    } else {
      ctx.clearRect(0, 0, width, height);
    }
  };
  raf = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(raf);
    ctx.clearRect(0, 0, width, height);
  };
}

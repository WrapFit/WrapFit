/**
 * Public pages of a design: the 3D stage, the unboxing particles and slug helpers. The server-side loader of
 * `/p/[slug]` lives in `./server` (import it by path, from server code only).
 */
export { BoxStage3D } from "./components/BoxStage3D";
export { playParticles } from "./particles";
export { isShareSlug, unboxSlugFrom } from "./slug";
export { usePrefersReducedMotion } from "./usePrefersReducedMotion";

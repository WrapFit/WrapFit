import { StudioSkeleton } from "@/views/editor/studio/StudioSkeleton";

/** Shown by Next.js while the studio route loads; the page keeps the same skeleton until the project is open. */
export default function Loading() {
  return <StudioSkeleton />;
}

import { WorkspaceSkeleton } from "@/components/workspace";

/** Shown by Next.js while a workspace page loads (navigation, code split chunks): the page's shape, not a spinner. */
export default function Loading() {
  return <WorkspaceSkeleton />;
}

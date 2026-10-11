import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadPublicProject } from "@/features/showcase/server";
import { authorName, formatDimensions } from "@/features/templates/labels";
import PublicProjectView from "@/views/public-project";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await loadPublicProject(slug);
  if (result.status === "not-found") notFound();
  if (result.status === "error") {
    // Visibility unknown: never let an UNLISTED page be indexed by accident.
    return { title: "Thiết kế hộp quà — WrapFit", robots: { index: false, follow: false } };
  }

  const { project } = result;
  const title = `${project.title} — WrapFit`;
  const description = `${project.template.name} ${formatDimensions(project.dimensions)} của ${authorName(project.author)}. Xem 3D, thả tim và remix trên WrapFit.`;
  return {
    title,
    description,
    // UNLISTED = anyone with the link, but not search engines (docs/06, section 8).
    robots: project.visibility === "UNLISTED" ? { index: false, follow: false } : undefined,
    openGraph: {
      title,
      description,
      type: "website",
      images: project.thumbnailUrl ? [{ url: project.thumbnailUrl, alt: project.title }] : undefined,
    },
  };
}

/** Public 3D page of a PUBLIC or UNLISTED design; PRIVATE, trashed or unknown slugs are a 404. */
export default async function PublicProjectPage({ params }: PageProps) {
  const { slug } = await params;
  // Same request as generateMetadata (React cache): the visit counts one view.
  const result = await loadPublicProject(slug);
  if (result.status === "not-found") notFound();
  return <PublicProjectView slug={slug} initialProject={result.status === "ok" ? result.project : undefined} />;
}

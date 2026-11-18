import type { Metadata } from "next";
import ReviewView from "@/views/review";

interface PageProps {
  params: Promise<{ token: string }>;
}

/** A secret link: never indexed, never previewed with the design's content. */
export const metadata: Metadata = {
  title: "Duyệt mẫu thiết kế | WrapFit",
  robots: { index: false, follow: false },
};

/** Design review page (docs/23 S23): a customer or a print shop comments on the design and approves it for print. */
export default async function ReviewPage({ params }: PageProps) {
  const { token } = await params;
  return <ReviewView token={token} />;
}

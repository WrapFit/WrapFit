import type { Metadata } from "next";
import UnboxView from "@/views/unbox";

// The slug is the secret of a gift (it works even for a private design): never indexed, never previewed with data.
export const metadata: Metadata = {
  title: "Bạn có một món quà | WrapFit",
  robots: { index: false, follow: false },
};

export default async function UnboxPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <UnboxView slug={slug} />;
}

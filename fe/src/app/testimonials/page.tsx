import type { Metadata } from "next";
import TestimonialsPage from "@/views/testimonials";

export const metadata: Metadata = {
  title: "Khách hàng nói gì — WrapFit",
  description:
    "Tiếng nói của người bán quà và chuyên gia ngành in về bao bì số lượng nhỏ.",
};

export default function Page() {
  return <TestimonialsPage />;
}

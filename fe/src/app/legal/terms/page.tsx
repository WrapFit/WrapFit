import type { Metadata } from "next";
import { TermsPage } from "@/views/legal";

export const metadata: Metadata = {
  title: "Điều khoản sử dụng | WrapFit",
  description:
    "Điều khoản sử dụng WrapFit: tài khoản, nội dung thiết kế, file in, thanh toán và trách nhiệm.",
};

export default function Page() {
  return <TermsPage />;
}

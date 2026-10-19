import type { Metadata } from "next";
import FeaturesPage from "@/views/features";

export const metadata: Metadata = {
  title: "Tính năng | WrapFit",
  description:
    "Khuôn bế theo kích thước món quà, hộp gấp 3D, FitCheck™, file in tách lớp, hoa văn AI và mã QR mở hộp.",
};

export default function Page() {
  return <FeaturesPage />;
}

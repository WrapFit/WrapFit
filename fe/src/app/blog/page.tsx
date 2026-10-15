import type { Metadata } from "next";
import BlogPage from "@/views/blog";

export const metadata: Metadata = {
  title: "Blog — WrapFit",
  description:
    "Kiến thức làm hộp quà: thuật ngữ in, chọn giấy, lỗi thường gặp ở xưởng và số liệu từ 109 người bán quà Việt Nam.",
};

export default function Page() {
  return <BlogPage />;
}

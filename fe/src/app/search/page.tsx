import type { Metadata } from "next";
import SearchPage from "@/views/search";

export const metadata: Metadata = {
  title: "Tìm kiếm — WrapFit",
  description:
    "Tìm mẫu hộp, cấu trúc, bài viết và câu trả lời trong WrapFit.",
};

export default function Page() {
  return <SearchPage />;
}

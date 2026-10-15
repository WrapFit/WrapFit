import type { Metadata } from "next";
import DesignSystemPage from "@/views/design-system";

export const metadata: Metadata = {
  title: "Design system — WrapFit",
  description: "Token màu, chữ, khoảng cách và thư viện thành phần giao diện của WrapFit, kèm ví dụ dùng được.",
};

export default function Page() {
  return <DesignSystemPage />;
}

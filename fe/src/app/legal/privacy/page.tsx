import type { Metadata } from "next";
import { PrivacyPage } from "@/views/legal";

export const metadata: Metadata = {
  title: "Chính sách quyền riêng tư — WrapFit",
  description:
    "WrapFit thu thập, sử dụng và bảo vệ dữ liệu của bạn như thế nào.",
};

export default function Page() {
  return <PrivacyPage />;
}

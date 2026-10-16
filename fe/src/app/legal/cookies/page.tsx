import type { Metadata } from "next";
import { CookiesPage } from "@/views/legal";

export const metadata: Metadata = {
  title: "Chính sách cookie | WrapFit",
  description:
    "Các cookie WrapFit dùng để đăng nhập, ghi nhớ lựa chọn và đo lường.",
};

export default function Page() {
  return <CookiesPage />;
}

import type { Metadata } from "next";
import PressPage from "@/views/press";

export const metadata: Metadata = {
  title: "Báo chí & truyền thông — WrapFit",
  description:
    "Thông tin về WrapFit cho báo chí: tổng quan, số liệu, thông cáo, bộ nhận diện và liên hệ truyền thông.",
};

export default function Page() {
  return <PressPage />;
}

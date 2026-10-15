import type { Metadata } from "next";
import ComparePage from "@/views/compare";

export const metadata: Metadata = {
  title: "So sánh WrapFit với Pacdora, Canva và xưởng offset",
  description:
    "WrapFit khác gì Pacdora, Templatemaker, Canva và xưởng in offset: cách nhập kích thước, kiểm tra file, số lượng tối thiểu và giá.",
};

export default function Page() {
  return <ComparePage />;
}

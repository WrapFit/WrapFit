import type { Metadata } from "next";
import AffiliatePage from "@/views/affiliate";

export const metadata: Metadata = {
  title: "Chương trình đối tác giới thiệu — WrapFit",
  description:
    "Giới thiệu WrapFit cho shop quà, nhận hoa hồng 15% trên gói trả phí và đơn in.",
};

export default function Page() {
  return <AffiliatePage />;
}

import type { Metadata } from "next";
import ContactPage from "@/views/contact";

export const metadata: Metadata = {
  title: "Liên Hệ & Tư Vấn | WrapFit",
  description:
    "Kết nối với đội ngũ kỹ thuật viên bao bì và tư vấn viên WrapFit. Hỗ trợ kích thước mm, kiểm định FitCheck™, xuất file in và kết nối xưởng in.",
};

export default function Page() {
  return <ContactPage />;
}

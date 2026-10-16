import type { Metadata } from "next";
import SecurityPage from "@/views/security";

export const metadata: Metadata = {
  title: "Bảo mật | WrapFit",
  description:
    "Cách WrapFit bảo vệ tài khoản, thiết kế và file in: mã hoá, phân quyền, lưu trữ dữ liệu và báo cáo lỗ hổng.",
};

export default function Page() {
  return <SecurityPage />;
}

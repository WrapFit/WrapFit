import type { Metadata } from "next";
import WaitlistPage from "@/views/waitlist";

export const metadata: Metadata = {
  title: "Danh Sách Chờ WrapFit Beta | Đăng Ký Sớm",
  description:
    "Gia nhập danh sách ưu tiên trải nghiệm WrapFit Studio 3D và nhận gói tài trợ 01 hộp in mẫu thử thực tế miễn phí.",
};

export default function Page() {
  return <WaitlistPage />;
}

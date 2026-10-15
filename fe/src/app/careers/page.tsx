import type { Metadata } from "next";
import CareersPage from "@/views/careers";

export const metadata: Metadata = {
  title: "Tuyển dụng — WrapFit",
  description:
    "Cùng WrapFit làm bao bì vừa khít cho người bán quà Việt Nam: vị trí đang mở, quyền lợi và cách ứng tuyển.",
};

export default function Page() {
  return <CareersPage />;
}

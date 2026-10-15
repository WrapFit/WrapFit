import type { Metadata } from "next";
import StatusPage from "@/views/status";

export const metadata: Metadata = {
  title: "Trạng thái hệ thống — WrapFit",
  description:
    "Tình trạng API, cơ sở dữ liệu, hàng đợi xuất file in và lịch bảo trì của WrapFit.",
};

export default function Page() {
  return <StatusPage />;
}

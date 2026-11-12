import type { Metadata } from "next";
import { PaymentTermsPage } from "@/views/legal";

export const metadata: Metadata = {
  title: "Chính sách thanh toán & hồ sơ pháp lý | WrapFit",
  description:
    "Điều khoản thanh toán, rủi ro khi xuất file in, nạp xu, mua lượt xuất, chính sách hoàn tiền và hồ sơ pháp lý của WrapFit.",
};

export default function Page() {
  return <PaymentTermsPage />;
}

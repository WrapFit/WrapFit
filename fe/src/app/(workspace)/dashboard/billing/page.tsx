import type { Metadata } from "next";
import BillingPage from "@/views/dashboard/billing";

export const metadata: Metadata = {
  title: "Thanh toán & gói cước | WrapFit",
  description:
    "Gói hiện tại, hạn mức, phương thức thanh toán và lịch sử đơn của tài khoản WrapFit.",
};

export default function Page() {
  return <BillingPage />;
}

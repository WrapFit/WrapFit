import type { Metadata } from "next";

// The path is fixed: VNPay sends the browser to VNPAY_RETURN_URL, which defaults to FRONTEND_URL + /payments/vnpay-return.
export const metadata: Metadata = {
  title: "Kết quả thanh toán VNPay | WrapFit",
  description: "Kết quả thanh toán thử nghiệm qua cổng VNPay sandbox của WrapFit.",
  robots: { index: false },
};

export { default } from "@/views/payments/vnpay-return";

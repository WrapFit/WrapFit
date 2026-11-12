import type { Metadata } from "next";
import WalletPage from "@/views/dashboard/wallet";

export const metadata: Metadata = {
  title: "Ví xu Wrap | WrapFit",
  description: "Số dư xu Wrap, nạp xu qua VietQR, xu sắp hết hạn và lịch sử giao dịch của tài khoản WrapFit.",
};

export default function Page() {
  return <WalletPage />;
}

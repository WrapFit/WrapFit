import type { Metadata } from "next";
import CartPage from "@/views/cart";

export const metadata: Metadata = {
  title: "Giỏ in mẫu | WrapFit",
  description:
    "Chọn thiết kế, số lượng và xưởng in để đặt hộp mẫu thử trước khi in số lượng.",
};

export default function Page() {
  return <CartPage />;
}

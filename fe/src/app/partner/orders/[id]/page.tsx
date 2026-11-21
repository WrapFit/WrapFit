import type { Metadata } from "next";
import PartnerOrderPage from "@/views/partner/order";

export const metadata: Metadata = { title: "Đơn in — Xưởng in WrapFit", robots: { index: false } };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PartnerOrderPage orderId={id} />;
}
import type { Metadata } from "next";
import PackingSlipPage from "@/views/partner/slip";

export const metadata: Metadata = { title: "Phiếu đóng gói — Xưởng in WrapFit", robots: { index: false } };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PackingSlipPage orderId={id} />;
}
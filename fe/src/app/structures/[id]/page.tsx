import type { Metadata } from "next";
import StructureDetailPage from "@/views/structures";

export const metadata: Metadata = {
  title: "Cấu trúc hộp & khuôn bế — WrapFit",
  description: "Khuôn bế theo kích thước của bạn: xem hộp 3D, kích thước từng mặt, số hộp trên tờ in và tải khuôn SVG.",
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StructureDetailPage id={id} />;
}

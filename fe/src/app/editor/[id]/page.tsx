import type { Metadata } from "next";
import EditorPage from "@/views/editor/studio";

export const metadata: Metadata = {
  title: "Studio thiết kế | WrapFit",
  description: "Trình thiết kế bao bì 2D & 3D thời gian thực, kiểm định FitCheck™ và xuất file in.",
};

export default function Page() {
  return <EditorPage />;
}

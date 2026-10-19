import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mở hộp quà 3D qua mã QR | WrapFit",
  description: "Nhập mã hoặc dán liên kết in kèm hộp quà để mở hộp 3D và đọc lời chúc của người gửi.",
};

/** Without a code: the code-entry page (no demo gift any more). */
export { default } from "@/views/unbox/code";

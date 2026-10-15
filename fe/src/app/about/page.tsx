import type { Metadata } from "next";
import AboutPage from "@/views/about";

export const metadata: Metadata = {
  title: "Về Chúng Tôi | WrapFit Platform — Make Every Present, Present",
  description:
    "Câu chuyện khởi nghiệp WrapFit tại Đại học FPT (EXE101). Sứ mệnh thiết kế chiếc hộp ôm trọn món quà từ milimét, 100% khả thi sản xuất và không cần khuôn bế từ 20 hộp.",
};

export default function Page() {
  return <AboutPage />;
}

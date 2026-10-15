import type { Metadata } from "next";
import EventPage from "@/views/events";

export const metadata: Metadata = {
  title: "Workshop hộp quà Tết 2027 — WrapFit",
  description:
    "Workshop miễn phí: thiết kế và in 20 hộp quà Tết vừa khít trong một buổi chiều, không cần khuôn bế.",
};

export default function Page() {
  return <EventPage />;
}

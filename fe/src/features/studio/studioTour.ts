import type { TourStep } from "@/components/ui";

export const STUDIO_INTRO_TOUR_ID = "studio-intro-v1";
export const STUDIO_INTRO_TOUR: TourStep[] = [
  {
    target: 'nav[aria-label="Công cụ Studio"]',
    title: "Chọn công cụ",
    body: "**Hộp & giấy** chỉnh quy cách. Mở **Thiết kế** để thêm chữ, ảnh và màu lên hộp.",
    mascot: "presenting",
  },
  {
    target: '[data-tour="studio-inspector"]',
    title: "Bảng thông số",
    body: "Chỉnh quy cách và hình in trong bảng của công cụ đang mở.",
    mascot: "measuring",
  },
  {
    target: '[data-tour="studio-stage"]',
    title: "Xem trực tiếp trên hộp",
    body: "Xem **khuôn bế 2D** hoặc xoay **hộp 3D** để kiểm tra thiết kế.",
    mascot: "folding",
  },
  {
    target: 'nav[aria-label="Công cụ Studio"] [aria-label="Đặt in"]',
    title: "Kiểm tra trước khi in",
    body: "Mở **Đặt in** để xem FitCheck™, báo giá và gói file in.",
    mascot: "measuring",
  },
];

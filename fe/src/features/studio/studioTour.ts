import { hasSeenTour, markTourSeen, type TourStep } from "@/components/ui";
import type { StudioStep } from "./components/StudioStepper";

/**
 * Guided tour of the studio, written for someone who has never designed a box. Kept short on purpose: two bubbles of
 * overview (the six steps, FitCheck™), then one or two the first time each step opens. No bubble points at the
 * "next" button: it is obvious, and every extra popup makes the studio feel noisy.
 *
 * One short sentence per bubble: the highlighted part is live during the tour, so the text only names the action
 * (`**…**`, bold orange). Pressing something that leads to another step closes the current tour (it counts as skipped).
 */

export const STUDIO_INTRO_TOUR_ID = "studio-intro-v1";
export const studioStepTourId = (step: StudioStep) => `studio-step-${step}-v1`;

/**
 * The user skipped the overview: the step guides do not start on their own either (one "Bỏ qua" means "no guide"),
 * only from the "Hướng dẫn" button. Guides already seen keep their flag.
 */
export function skipStudioStepTours() {
  for (const step of [1, 2, 3, 4, 5, 6] as StudioStep[]) {
    if (!hasSeenTour(studioStepTourId(step))) markTourSeen(studioStepTourId(step), false);
  }
}


export const STUDIO_INTRO_TOUR: TourStep[] = [
  {
    target: 'nav[aria-label="Các bước thiết kế"]',
    title: "6 bước, từ trái sang phải",
    body: "**Bấm tên một bước** để quay lại sửa.",
    mascot: "presenting",
  },
  {
    target: '[data-tour="studio-fitcheck"]',
    title: "Điểm FitCheck™",
    body: "WrapFit tự chấm khuôn hộp. Từ 90 điểm là in đẹp. **Bấm vào điểm** để xem chi tiết.",
    mascot: "measuring",
  },
];

export const STUDIO_STEP_TOURS: Record<StudioStep, TourStep[]> = {
  1: [
    {
      target: '[aria-label="Cấu trúc hộp"]',
      title: "Chọn kiểu hộp",
      body: "**Bấm một kiểu hộp.** Lọc theo Hộp, Khay hoặc Thẻ ở hàng trên.",
      mascot: "presenting",
    },
  ],
  2: [
    {
      target: '[data-tour="s2-size"]',
      title: "Nhập kích thước",
      body: "Nhập **Dài, Rộng, Cao** của món quà, cộng thêm **2–3 mm**.",
      mascot: "measuring",
    },
  ],
  3: [
    {
      target: '[role="radiogroup"][aria-label="Giấy"]',
      title: "Chọn giấy",
      body: "**Bấm một dòng** để chọn. “Đề xuất” là giấy hợp với hộp của bạn.",
      mascot: "folding",
    },
  ],
  4: [
    {
      target: '[role="toolbar"][aria-label="Công cụ thiết kế"]',
      title: "Thanh công cụ",
      body: "**Bấm một mục** để mở bảng chọn bên cạnh; bấm lại để thu gọn.",
      mascot: "folding",
      placement: "right",
    },
    {
      target: '[data-tour="studio-stage"]',
      title: "Mặt hộp trải phẳng",
      body: "**Bấm một mặt** rồi thêm chữ hay ảnh. Giữ nội dung **cách mép 3 mm**.",
      mascot: "measuring",
    },
  ],
  5: [
    {
      target: '[aria-labelledby="step5-gift"]',
      title: "Lời chúc và mã QR",
      body: "**Viết lời chúc** và đặt mã QR lên hộp: người nhận quét là thấy.",
      mascot: "unboxing_pop",
    },
  ],
  6: [
    {
      target: '[data-tour="s6-status"]',
      title: "Kiểm tra lần cuối",
      body: "Cam là sẵn sàng in. Đỏ là còn lỗi: **quay lại bước Thiết kế** để sửa.",
      mascot: "measuring",
    },
    {
      target: '[data-tour="s6-export"]',
      title: "Thanh toán rồi xuất file",
      body: "**Bấm Thanh toán**; trả xong, nút đổi thành **Xuất file in**. Cần FitCheck™ đạt.",
      mascot: "celebration",
    },
  ],
};

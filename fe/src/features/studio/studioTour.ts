import { hasSeenTour, markTourSeen, type TourStep } from "@/components/ui";
import type { StudioStep } from "./components/StudioStepper";

/**
 * Guided tour of the studio, written for someone who has never designed a box. An overview of the screen first
 * (the six steps at the top, FitCheck™, export), then a short guide the first time each step opens, ending on that
 * step's real "next" button, which the user presses to go on (`clickTarget`).
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

const NEXT = '[data-tour="studio-next"]';

export const STUDIO_INTRO_TOUR: TourStep[] = [
  {
    title: "Chào mừng tới Studio!",
    body: "Làm một chiếc hộp từ đầu tới lúc in. Mình sẽ đi cùng bạn.",
    mascot: "waving",
  },
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
  {
    target: '[aria-label="Bước 6: Đặt in"]',
    title: "Thanh toán & xuất file in",
    body: "Ở bước **Đặt in**: bấm **Thanh toán**, trả xong sẽ có nút **Xuất file in**.",
    mascot: "delivery",
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
    {
      // The whole preview card, so the 3D / 2D switch is inside the lit area.
      target: '[aria-label^="Xem trước"]',
      title: "Xem trước",
      body: "**Kéo để xoay**, bấm “Khuôn” để xem khuôn phẳng.",
      mascot: "folding",
    },
    {
      target: NEXT,
      title: "Sang bước tiếp",
      body: "**Bấm nút này** để nhập kích thước.",
      mascot: "thumbs_up",
      clickTarget: true,
    },
  ],
  2: [
    {
      target: '[data-tour="s2-size"]',
      title: "Nhập kích thước",
      body: "Nhập **Dài, Rộng, Cao** của món quà, cộng thêm **2–3 mm**.",
      mascot: "measuring",
    },
    {
      target: '[data-tour="s2-presets"]',
      title: "Chưa có thước?",
      body: "**Bấm một món quà mẫu**, kích thước tự điền.",
      mascot: "measuring",
    },
    {
      target: NEXT,
      title: "Kích thước ổn rồi",
      body: "**Bấm nút này** để chọn giấy. Nút mờ là số đo chưa hợp lệ: **xem dòng báo đỏ**.",
      mascot: "thumbs_up",
      clickTarget: true,
    },
  ],
  3: [
    {
      target: '[role="radiogroup"][aria-label="Giấy"]',
      title: "Chọn giấy",
      body: "**Bấm một dòng** để chọn. “Đề xuất” là giấy hợp với hộp của bạn.",
      mascot: "folding",
    },
    {
      target: '[aria-labelledby="finish-title"]',
      title: "Hoàn thiện",
      body: "Cán màng, ép kim, UV: giá cộng thêm ghi trên từng ô. Không chắc thì **để “Không cán”**.",
      mascot: "measuring",
    },
    {
      target: NEXT,
      title: "Sang phần trang trí",
      body: "**Bấm nút này** để thêm chữ, ảnh và hoa văn.",
      mascot: "thumbs_up",
      clickTarget: true,
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
    {
      target: '[aria-label="Chế độ xem"]',
      title: "Phẳng hoặc 3D",
      body: "**Bấm “Gập hộp 3D”** để xem hình in trên hộp.",
      mascot: "folding",
    },
    {
      target: 'aside[aria-label="Bảng công cụ"]',
      title: "Bảng chọn",
      body: "**Bấm một thứ** để đặt lên mặt đang chọn.",
      mascot: "presenting",
      placement: "right",
    },
    {
      target: NEXT,
      title: "Trang trí xong?",
      body: "**Bấm nút này** để xem hộp 3D hoàn chỉnh.",
      mascot: "thumbs_up",
      clickTarget: true,
    },
  ],
  5: [
    {
      target: '[aria-labelledby="step5-gift"]',
      title: "Lời chúc và mã QR",
      body: "**Viết lời chúc** và đặt mã QR lên hộp: người nhận quét là thấy.",
      mascot: "unboxing_pop",
    },
    {
      target: '[aria-labelledby="step5-scenes"]',
      title: "Ảnh sản phẩm",
      body: "**Chọn bối cảnh**, xoay hộp rồi tải ảnh.",
      mascot: "presenting",
    },
    {
      target: NEXT,
      title: "Sang bước cuối",
      body: "**Bấm nút này** để xem báo giá và đặt in.",
      mascot: "thumbs_up",
      clickTarget: true,
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
      target: '[data-tour="s6-checks"]',
      title: "Danh sách kiểm tra",
      body: "Từng tiêu chí FitCheck™. Lỗi thường gặp có nút **Tự sửa**.",
      mascot: "measuring",
    },
    {
      target: '[data-tour="s6-quote"]',
      title: "Báo giá in",
      body: "**Chọn số hộp**: giá, cách in và số ngày làm đổi theo.",
      mascot: "delivery",
    },
    {
      target: '[data-tour="s6-export"]',
      title: "Thanh toán rồi xuất file",
      body: "**Bấm Thanh toán**; trả xong, nút đổi thành **Xuất file in**. Cần FitCheck™ đạt.",
      mascot: "celebration",
    },
  ],
};

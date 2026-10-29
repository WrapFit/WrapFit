import type { TourStep } from "@/components/ui";
import type { StudioStep } from "./components/StudioStepper";

/**
 * Guided tour of the studio, written for someone who has never designed a box. An overview of the screen first
 * (the six steps at the top, FitCheck™, export), then a short guide the first time each step opens, ending on that
 * step's real "next" button, which the user presses to go on (`clickTarget`).
 */

export const STUDIO_INTRO_TOUR_ID = "studio-intro-v1";
export const studioStepTourId = (step: StudioStep) => `studio-step-${step}-v1`;

const NEXT = '[data-tour="studio-next"]';

export const STUDIO_INTRO_TOUR: TourStep[] = [
  {
    title: "Chào mừng tới Studio thiết kế!",
    body: "Ở đây bạn làm một chiếc hộp từ đầu tới lúc in. Mình sẽ đi cùng bạn qua từng bước, bạn cứ làm theo là được.",
    mascot: "waving",
  },
  {
    target: 'nav[aria-label="Các bước thiết kế"]',
    title: "6 bước, đi từ trái sang phải",
    body: "Khởi đầu → Kích thước → Giấy & hoàn thiện → Thiết kế → Quà & mở hộp → Đặt in. Bước đang làm được tô đậm; bấm tên một bước để quay lại sửa.",
    mascot: "presenting",
  },
  {
    target: '[data-tour="studio-fitcheck"]',
    title: "Điểm FitCheck™",
    body: "WrapFit tự chấm điểm khuôn hộp: chữ có sát mép không, ảnh có đủ nét không. Từ 90 điểm trở lên là in đẹp. Bấm vào để xem chi tiết.",
    mascot: "measuring",
  },
  {
    target: '[aria-label="Xuất file in"]',
    title: "Xuất file in",
    body: "Khi xong, bấm đây để tải file PDF gửi xưởng in hoặc tự in ở nhà. Bạn chưa cần bấm bây giờ.",
    mascot: "delivery",
  },
];

export const STUDIO_STEP_TOURS: Record<StudioStep, TourStep[]> = {
  1: [
    {
      target: '[aria-labelledby="quick-start-title"]',
      title: "Bắt đầu nhanh từ một mẫu",
      body: "Chọn dịp và loại sản phẩm, rồi bấm một mẫu: hộp đã có sẵn hình in, bạn chỉ cần chỉnh kích thước và chữ.",
      mascot: "presenting",
    },
    {
      target: '[aria-label="Cấu trúc hộp"]',
      title: "Chọn kiểu hộp",
      body: "Bấm vào một kiểu trong danh sách. Hộp nắp gài hợp mỹ phẩm, nến; hộp âm dương sang cho quà tặng; hộp kéo cho trang sức; hộp gối cho phụ kiện nhỏ.",
      mascot: "presenting",
    },
    {
      target: '[data-tour="s1-preview"]',
      title: "Xem hộp trước khi làm",
      body: "Đây là kiểu hộp bạn vừa chọn. Đổi giữa “Hộp 3D” và “Khuôn bế 2D”, kéo thanh gấp để xem hộp được gấp thế nào.",
      mascot: "folding",
    },
    {
      target: NEXT,
      title: "Chọn xong thì sang bước tiếp",
      body: "Bấm nút này để nhập kích thước món quà.",
      mascot: "thumbs_up",
      clickTarget: true,
    },
  ],
  2: [
    {
      target: '[data-tour="s2-size"]',
      title: "Nhập kích thước món quà",
      body: "Đo món quà bằng thước: Dài, Rộng, Cao. Có thể chọn đơn vị mm hoặc cm. Đây là khoảng trống bên trong hộp, nên cộng thêm 2–3 mm cho dễ bỏ quà vào.",
      mascot: "measuring",
    },
    {
      target: '[data-tour="s2-presets"]',
      title: "Chưa có thước? Chọn món gần giống",
      body: "Bấm một món quà mẫu (hũ nến, chai nước hoa, hộp trang sức…) là kích thước tự điền.",
      mascot: "measuring",
    },
    {
      target: NEXT,
      title: "Kích thước ổn rồi",
      body: "Bấm để sang bước chọn giấy. Nếu nút bị mờ, một số đo đang quá nhỏ hoặc quá lớn: xem dòng báo đỏ phía trên.",
      mascot: "thumbs_up",
      clickTarget: true,
    },
  ],
  3: [
    {
      target: '[role="radiogroup"][aria-label="Giấy"]',
      title: "Chọn giấy",
      body: "Mỗi dòng là một loại giấy: mẫu giấy, độ cứng và giá mỗi hộp. Nhãn “Đề xuất” là giấy hợp với kích thước hộp của bạn.",
      mascot: "folding",
    },
    {
      target: '[aria-labelledby="finish-title"]',
      title: "Hoàn thiện ở xưởng in",
      body: "Cán màng mờ, bóng hay nhung, thêm ép kim hoặc UV. Mỗi lựa chọn ghi rõ giá cộng thêm mỗi hộp. Không chắc thì cứ để “Không cán”.",
      mascot: "measuring",
    },
    {
      target: NEXT,
      title: "Sang phần trang trí",
      body: "Bấm để tới bước Thiết kế, nơi bạn thêm chữ, ảnh và hoa văn lên hộp.",
      mascot: "thumbs_up",
      clickTarget: true,
    },
  ],
  4: [
    {
      target: '[role="toolbar"][aria-label="Công cụ thiết kế"]',
      title: "Hộp công cụ",
      body: "Từ trên xuống: chọn & di chuyển, thêm chữ, tải ảnh hoặc logo, sticker, phông & màu, hoa văn AI. Rê chuột lên mỗi nút để xem tên.",
      mascot: "folding",
      placement: "right",
    },
    {
      target: '[data-tour="studio-stage"]',
      title: "Mặt hộp trải phẳng",
      body: "Đây là hộp khi chưa gấp. Bấm vào một mặt rồi thêm chữ hay ảnh, kéo để đổi chỗ. Giữ nội dung quan trọng cách mép ít nhất 3 mm để không bị cắt mất.",
      mascot: "measuring",
    },
    {
      target: '[aria-label="Chế độ xem"]',
      title: "Xem phẳng hoặc gập 3D",
      body: "Đổi sang “Gập hộp 3D” bất cứ lúc nào để xem hình in nằm trên hộp thật ra sao.",
      mascot: "folding",
    },
    {
      target: 'aside[aria-label="Bảng thuộc tính"]',
      title: "Bảng chỉnh sửa",
      body: "Kiểu: màu nền, phông chữ. Sticker: tem, dấu sáp. Cỡ: sửa kích thước hộp. FitCheck: danh sách lỗi và nút sửa nhanh.",
      mascot: "presenting",
      placement: "left",
    },
    {
      target: NEXT,
      title: "Trang trí xong?",
      body: "Bấm để xem chiếc hộp 3D hoàn chỉnh.",
      mascot: "thumbs_up",
      clickTarget: true,
    },
  ],
  5: [
    {
      target: '[aria-labelledby="step5-gift"]',
      title: "Lời chúc và mã QR",
      body: "Viết lời chúc, rồi đặt mã QR lên hộp: người nhận quét là thấy hộp mở 3D cùng lời chúc trên điện thoại.",
      mascot: "unboxing_pop",
    },
    {
      target: '[aria-labelledby="step5-scenes"]',
      title: "Đặt hộp vào bối cảnh",
      body: "Chọn một khung cảnh để xem hộp như ảnh chụp thật, tiện gửi khách duyệt.",
      mascot: "presenting",
    },
    {
      target: NEXT,
      title: "Ưng rồi thì sang bước cuối",
      body: "Bấm để kiểm tra lần cuối, xem báo giá và đặt in.",
      mascot: "thumbs_up",
      clickTarget: true,
    },
  ],
  6: [
    {
      target: '[data-tour="s6-status"]',
      title: "Kiểm tra lần cuối",
      body: "Ô cam là đã sẵn sàng in. Ô đỏ nghĩa là còn lỗi: quay lại bước Thiết kế để sửa.",
      mascot: "measuring",
    },
    {
      target: '[data-tour="s6-checks"]',
      title: "Danh sách kiểm tra",
      body: "Từng tiêu chí FitCheck™: lề an toàn, tràn lề, độ nét ảnh… Có nút sửa tự động cho những lỗi thường gặp.",
      mascot: "measuring",
    },
    {
      target: '[data-tour="s6-quote"]',
      title: "Báo giá theo số lượng",
      body: "Chọn số hộp cần in: WrapFit tính giá mỗi hộp, cách in (in kỹ thuật số hay offset) và số ngày làm. Có thể đặt in thử 1 hộp trước.",
      mascot: "delivery",
    },
    {
      target: '[data-tour="s6-export"]',
      title: "Xuất file in",
      body: "Bấm để tải file PDF gửi xưởng in. Nút chỉ bấm được khi FitCheck™ đạt. Chúc mừng bạn đã làm xong chiếc hộp đầu tiên!",
      mascot: "celebration",
    },
  ],
};

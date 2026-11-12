// Payment terms every checkout must show and have accepted before a payment is created (export credits, Pro, xu top-ups,
// sample orders). The server refuses a payment without the current version, and stores the version it was accepted under
// in the payment's metadata. Change the version whenever the clauses below change in substance.

/** Version of the payment terms: the date it took effect. */
export const PAYMENT_TERMS_VERSION = "2026-11-12";

/** Page of the full payment terms and the legal file of the business. */
export const PAYMENT_TERMS_PATH = "/legal/payment";

export interface PaymentTermsClause {
  id: string;
  title: string;
  body: string;
}

/**
 * The clauses about the risk of losing money, shown in full inside the checkout (the user scrolls through them before
 * the "I agree" box unlocks) and on the legal page.
 */
export const PAYMENT_TERMS_CLAUSES: PaymentTermsClause[] = [
  {
    id: "dich-vu-so",
    title: "Bạn đang mua dịch vụ số",
    body:
      "Lượt xuất file, gói Pro và xu Wrap là dịch vụ số, được kích hoạt ngay khi WrapFit nhận đủ tiền. Đơn in mẫu là dịch vụ in do xưởng đối tác thực hiện.",
  },
  {
    id: "file-khong-nhu-ky-vong",
    title: "File in có thể không như kỳ vọng",
    body:
      "Khuôn bế được tính đúng theo số đo bạn nhập. Nếu số đo sai, món quà không vừa hộp: đó không phải lỗi của file. Màu màn hình (RGB) luôn khác màu in (CMYK), nhất là trên giấy Kraft; WrapFit không cam kết màu in giống hệt màn hình. Hãy xem kỹ bản 3D, chạy FitCheck và in 1 hộp mẫu trước khi in số lượng lớn.",
  },
  {
    id: "loi-he-thong",
    title: "Lỗi hệ thống và lỗi dựng file",
    body:
      "Nếu WrapFit dựng file lỗi (thiếu lớp, khuôn lệch so với số đo đã nhập, file không mở được) bạn được xuất lại miễn phí, không trừ thêm lượt. Nếu đã trả tiền mà lượt xuất, gói hoặc xu không được cộng sau 30 phút, hãy gửi mã thanh toán WF… cho WrapFit: chúng tôi kiểm tra và cộng bù hoặc hoàn tiền trong 3 ngày làm việc.",
  },
  {
    id: "chuyen-khoan",
    title: "Rủi ro khi chuyển khoản",
    body:
      "Chuyển đúng số tiền và giữ nguyên nội dung WF… để hệ thống tự khớp. Mã thanh toán chỉ dùng trong 15 phút. Chuyển thiếu, sai nội dung hoặc sau khi mã hết hạn: tiền không tự khớp và phải chờ đối soát thủ công; đừng chuyển lại lần hai.",
  },
  {
    id: "hoan-tien",
    title: "Hoàn tiền",
    body:
      "Hoàn 100% trong 7 ngày kể từ lần thanh toán đầu tiên nếu bạn chưa xuất file in sạch nào. Lượt xuất đã dùng, xu đã nạp và đơn in mẫu đã chuyển xưởng không được hoàn, trừ khi lỗi thuộc về WrapFit hoặc xưởng in. Tiền hoàn trả về đúng tài khoản đã chuyển.",
  },
  {
    id: "trach-nhiem",
    title: "Giới hạn trách nhiệm",
    body:
      "Trách nhiệm của WrapFit với một giao dịch không vượt quá số tiền của giao dịch đó. Lỗi in, cắt, gấp tại xưởng do xưởng chịu theo chính sách in lại của xưởng.",
  },
];

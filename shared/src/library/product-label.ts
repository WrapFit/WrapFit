/**
 * "Khối thông tin nhãn hàng hóa" (docs/23 S21, Q2): a fill-in text block with the fields a Vietnamese product label
 * usually carries. Only a starting point: which fields a product needs depends on its kind, so the studio shows the
 * disclaimer next to it and the seller stays responsible for what the label says.
 */

/** The fields, one per line, to be filled in by the seller. */
export const PRODUCT_LABEL_LINES: readonly string[] = [
  "Tên hàng hóa: …",
  "Tổ chức, cá nhân chịu trách nhiệm: … (tên, địa chỉ)",
  "Xuất xứ: …",
  "Định lượng: …",
  "Ngày sản xuất: …",
  "Hạn sử dụng: …",
  "Thành phần: …",
  "Hướng dẫn sử dụng, bảo quản: …",
  "Thông tin cảnh báo: …",
];

/** Shown wherever the block is offered. */
export const PRODUCT_LABEL_DISCLAIMER =
  "Mẫu điền sẵn các mục nhãn hàng hóa thường gặp (tham khảo NĐ 43/2017/NĐ-CP và NĐ 111/2021/NĐ-CP). " +
  "Mục nào bắt buộc tùy loại hàng; người bán tự chịu trách nhiệm về nội dung nhãn.";

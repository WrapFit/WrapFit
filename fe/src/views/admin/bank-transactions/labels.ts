import type { Tone } from '@/assets/styles/tokens';
import type { BankTxStatus, BankTxUnmatchedReason } from '@/api/admin/bank-transactions';

/** Why the SePay webhook could not confirm a payment on its own (docs/21 §3.3). */
export const REASON_LABELS: Record<BankTxUnmatchedReason, string> = {
  NO_REFERENCE: 'Không có mã thanh toán',
  NOT_FOUND: 'Không tìm thấy thanh toán',
  AMOUNT_MISMATCH: 'Sai số tiền',
  EXPIRED: 'Thanh toán đã hết hạn',
  ALREADY_PAID: 'Thanh toán đã được trả',
};

export const REASON_TONES: Record<BankTxUnmatchedReason, Tone> = {
  NO_REFERENCE: 'neutral',
  NOT_FOUND: 'neutral',
  AMOUNT_MISMATCH: 'warning',
  EXPIRED: 'warning',
  ALREADY_PAID: 'info',
};

export const STATUS_LABELS: Record<BankTxStatus, string> = {
  MATCHED: 'Tự khớp',
  UNMATCHED: 'Chưa khớp',
  RESOLVED: 'Đã gán',
  IGNORED: 'Đã bỏ qua',
};

export const STATUS_TONES: Record<BankTxStatus, Tone> = {
  MATCHED: 'success',
  UNMATCHED: 'warning',
  RESOLVED: 'success',
  IGNORED: 'neutral',
};

export const PURPOSE_LABELS: Record<string, string> = {
  EXPORT_1: '1 lượt xuất',
  EXPORT_5: '5 lượt xuất',
  EXPORT_15: '15 lượt xuất',
  PRO_MONTH: 'Pro 30 ngày',
  SAMPLE_ORDER: 'Đơn in mẫu',
  XU_500: '500 xu Wrap',
  XU_1050: '1.050 xu Wrap',
  XU_2200: '2.200 xu Wrap',
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Đang chờ',
  PAID: 'Đã trả',
  EXPIRED: 'Hết hạn',
  CANCELLED: 'Đã hủy',
};

export const PAYMENT_STATUS_TONES: Record<string, Tone> = {
  PENDING: 'info',
  PAID: 'success',
  EXPIRED: 'warning',
  CANCELLED: 'neutral',
};

const DATE_TIME = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
export const formatDateTime = (iso: string) => DATE_TIME.format(new Date(iso));

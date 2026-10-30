import QRCode from 'qrcode';

/**
 * VietQR transfer code built locally (docs/17 M5): the EMVCo merchant-presented QR payload with the NAPAS "transfer to
 * account" template, readable by every Vietnamese banking app. No call to img.vietqr.io, so the checkout works on a
 * weak stage network and leaks nothing to a third party.
 */

/** NAPAS application id (AID) inside tag 38. */
const NAPAS_GUID = 'A000000727';
/** Service code of a transfer to an account number (QRIBFTTC would be a transfer to a card). */
const SERVICE_TO_ACCOUNT = 'QRIBFTTA';
const CURRENCY_VND = '704';

export interface VietQrAccount {
  /** 6-digit NAPAS BIN of the bank, e.g. 970436 for Vietcombank. */
  bankBin: string;
  accountNo: string;
  accountName: string;
}

export interface VietQrTransfer extends VietQrAccount {
  amountVnd: number;
  /** Transfer content the bank statement shows: the payment reference. */
  description: string;
}

/**
 * Account shown when VIETQR_* is not set (docs/17 Q1). The QR stays scannable, but the account is a placeholder and
 * the checkout labels it "Mô phỏng".
 */
export const SAMPLE_ACCOUNT: VietQrAccount = {
  bankBin: '970436',
  accountNo: '0000000000',
  accountName: 'WRAPFIT MO PHONG',
};

/** Short names of the banks most often used; another BIN shows as "Ngân hàng <BIN>". */
const BANK_NAMES: Record<string, string> = {
  '970405': 'Agribank',
  '970403': 'Sacombank',
  '970407': 'Techcombank',
  '970415': 'VietinBank',
  '970416': 'ACB',
  '970418': 'BIDV',
  '970422': 'MB Bank',
  '970423': 'TPBank',
  '970432': 'VPBank',
  '970436': 'Vietcombank',
  '970437': 'HDBank',
  '970441': 'VIB',
  '970443': 'SHB',
  '970448': 'OCB',
};

export const bankName = (bin: string): string => BANK_NAMES[bin] ?? `Ngân hàng ${bin}`;

/** One EMVCo data object: 2-digit id, 2-digit length, value. */
function field(id: string, value: string): string {
  if (value.length > 99) throw new RangeError(`VietQR field ${id} is longer than 99 characters`);
  return `${id}${String(value.length).padStart(2, '0')}${value}`;
}

/** CRC-16/CCITT-FALSE (polynomial 0x1021, initial 0xFFFF), as EMVCo tag 63 requires, in 4 upper-case hex digits. */
export function crc16(text: string): string {
  let crc = 0xffff;
  for (const byte of Buffer.from(text, 'utf8')) {
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/** Bank apps accept only A–Z, 0–9 and spaces in the transfer content. */
const toTransferText = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'D')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, '')
    .trim();

/** The text encoded in the QR code. */
export function vietQrPayload(transfer: VietQrTransfer): string {
  if (!/^\d{6}$/.test(transfer.bankBin)) throw new RangeError(`Invalid bank BIN: ${transfer.bankBin}`);
  if (!/^[0-9A-Za-z]{1,19}$/.test(transfer.accountNo)) throw new RangeError('Invalid bank account number');
  if (!Number.isInteger(transfer.amountVnd) || transfer.amountVnd <= 0) {
    throw new RangeError(`Invalid amount: ${transfer.amountVnd}`);
  }

  const beneficiary = field('00', transfer.bankBin) + field('01', transfer.accountNo);
  const body =
    field('00', '01') + // payload format indicator
    field('01', '12') + // dynamic QR: one amount, one payment
    field('38', field('00', NAPAS_GUID) + field('01', beneficiary) + field('02', SERVICE_TO_ACCOUNT)) +
    field('53', CURRENCY_VND) +
    field('54', String(transfer.amountVnd)) +
    field('58', 'VN') +
    field('62', field('08', toTransferText(transfer.description))) +
    '6304';
  return body + crc16(body);
}

/** Vector QR code of `payload`, error correction "M" (the payload is long, a screen does not get scratched). */
export function vietQrSvg(payload: string): Promise<string> {
  return QRCode.toString(payload, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 2,
    color: { dark: '#000000', light: '#FFFFFF' },
  });
}

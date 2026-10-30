import { HttpException, HttpStatus } from '@nestjs/common';

/** 402: the user has fewer export credits than the operation needs. `balance` lets the client offer a pack. */
export function insufficientCredits(balance: number): HttpException {
  return new HttpException(
    { code: 'INSUFFICIENT_CREDITS', message: 'Bạn đã hết lượt xuất file', balance },
    HttpStatus.PAYMENT_REQUIRED,
  );
}

/**
 * 402: a clean export of this design version needs one export credit and the client did not send `useCredit: true`
 * (docs/16 §5.2). The client asks "Dùng 1 lượt? Còn N lượt" with `balance`, or offers a pack when it is 0.
 */
export function exportCreditRequired(balance: number): HttpException {
  return new HttpException(
    { code: 'EXPORT_CREDIT_REQUIRED', message: 'Xuất file sạch cần dùng 1 lượt xuất', balance },
    HttpStatus.PAYMENT_REQUIRED,
  );
}

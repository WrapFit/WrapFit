import { HttpException, HttpStatus } from '@nestjs/common';
import type { CreditKind } from '@prisma/client';

/**
 * 402: the user has fewer credits of `kind` than the operation needs (`cost`). `balance` lets the client offer a
 * pack: export credits, or xu (docs/19).
 */
export function insufficientCredits(balance: number, kind: CreditKind = 'EXPORT', cost = 1): HttpException {
  const message = kind === 'XU' ? `Cần ${cost} xu, bạn còn ${balance} xu` : 'Bạn đã hết lượt xuất file';
  return new HttpException({ code: 'INSUFFICIENT_CREDITS', kind, message, balance, cost }, HttpStatus.PAYMENT_REQUIRED);
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

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

/** The print file of this design version is sold through the print cart: no paid order holds it yet. */
export function orderPaymentRequired(): HttpException {
  return new HttpException(
    {
      code: 'ORDER_PAYMENT_REQUIRED',
      message: 'File in chỉ xuất được sau khi thanh toán đơn in của bản thiết kế này ở giỏ in mẫu',
    },
    HttpStatus.PAYMENT_REQUIRED,
  );
}

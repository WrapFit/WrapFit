import { HttpException, HttpStatus } from '@nestjs/common';

/** 402: the user has fewer export credits than the operation needs. `balance` lets the client offer a pack. */
export function insufficientCredits(balance: number): HttpException {
  return new HttpException(
    { code: 'INSUFFICIENT_CREDITS', message: 'Bạn đã hết lượt xuất file', balance },
    HttpStatus.PAYMENT_REQUIRED,
  );
}

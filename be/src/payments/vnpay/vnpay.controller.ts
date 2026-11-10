import { Controller, Get, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ACCESS_COOKIE, CurrentUser, Public } from '../../common';
import { VnpayService } from './vnpay.service';

/**
 * Two routes of the VNPay sandbox flow. The queries are typed as plain records on purpose: the global ValidationPipe
 * rejects unknown properties, and VNPay may add `vnp_*` fields at any time; `VnpayGateway.verify` reads the signed set.
 * `payments/vnpay/...` has two segments after `payments`, so `GET payments/:id` never matches it.
 */
@ApiTags('payments')
@Controller('payments/vnpay')
export class VnpayController {
  constructor(private readonly vnpay: VnpayService) {}

  /**
   * IPN: VNPay calls this by GET, server to server, no cookie. A GET that changes state breaks the project's usual
   * rule, on purpose: VNPay only sends the IPN as a GET. Authenticity rests on the HMAC-SHA512 signature alone; the
   * answer is always HTTP 200 with `{ RspCode, Message }`.
   */
  @Get('ipn')
  @Public()
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @ApiOperation({
    summary:
      'IPN của VNPay (GET, ký HMAC-SHA512): 97 sai chữ ký, 01 không thấy đơn, 04 sai số tiền, 02 đã xác nhận, 00 đã xử lý; luôn trả HTTP 200',
  })
  @ApiQuery({ name: 'vnp_*', required: false, description: 'Các tham số vnp_* và vnp_SecureHash do VNPay gửi' })
  ipn(@Query() query: Record<string, unknown>) {
    return this.vnpay.ipn(query);
  }

  @Get('return')
  @ApiCookieAuth(ACCESS_COOKIE)
  @ApiOperation({
    summary:
      'Trang trả về từ VNPay gọi route này với nguyên query vnp_*: kiểm chữ ký, nếu thành công thì xác nhận thanh toán (gọi lại vẫn an toàn). Trả { result: success | failed | invalid, payment }',
  })
  @ApiQuery({ name: 'vnp_*', required: false, description: 'Nguyên query vnp_* mà VNPay gắn vào vnp_ReturnUrl' })
  comeBack(@CurrentUser('id') userId: string, @Query() query: Record<string, unknown>) {
    return this.vnpay.returned(userId, query);
  }
}

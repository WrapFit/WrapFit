import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ACCESS_COOKIE, CurrentUser } from '../common';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@ApiCookieAuth(ACCESS_COOKIE)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Tạo thanh toán VietQR (hạn 15 phút): gói lượt xuất, Pro 30 ngày hoặc đơn in mẫu' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreatePaymentDto) {
    return this.payments.create(userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Trạng thái một thanh toán của tôi (FE hỏi mỗi 3 giây); quá hạn → EXPIRED' })
  get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
    return this.payments.get(id, userId);
  }

  @Post(':id/simulate-confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Giả lập đã chuyển khoản (chỉ khi PAYMENT_SIMULATION=true, ngược lại 404); gọi lại không cấp thêm' })
  simulateConfirm(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
    return this.payments.simulateConfirm(id, userId);
  }
}

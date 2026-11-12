import { Body, Controller, Get, HttpCode, HttpStatus, Ip, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ACCESS_COOKIE, CurrentUser } from '../common';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ListPaymentsQueryDto } from './dto/list-payments.dto';
import { SimulateTransferDto } from './dto/simulate-transfer.dto';
import { PaymentsService } from './payments.service';
import { MockTransferService } from './sepay/mock-transfer.service';

@ApiTags('payments')
@ApiCookieAuth(ACCESS_COOKIE)
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly mockTransfers: MockTransferService,
  ) {}

  @Post()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({
    summary:
      'Tạo thanh toán (hạn 15 phút): gói lượt xuất, xu, Pro 30 ngày hoặc đơn in mẫu. Tài khoản thật nhận vietqr, tài khoản demo nhận vnpay.payUrl; demo mà chưa cấu hình VNPay và không bật giả lập → 503 VNPAY_NOT_CONFIGURED',
  })
  create(@CurrentUser('id') userId: string, @Body() dto: CreatePaymentDto, @Ip() ip: string) {
    return this.payments.create(userId, dto, ip);
  }

  @Get()
  @ApiOperation({ summary: 'Lịch sử thanh toán của tôi, mới nhất trước (không kèm mã QR)' })
  listMine(@CurrentUser('id') userId: string, @Query() query: ListPaymentsQueryDto) {
    return this.payments.listMine(userId, query.limit ?? 20, query.before);
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

  @Post(':id/simulate-transfer')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({
    summary:
      'Giả lập ngân hàng báo tiền về qua webhook SePay (chỉ khi PAYMENT_SIMULATION=true): giao dịch hiện ở trang admin đối soát, tự xóa sau 30 phút',
  })
  simulateTransfer(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string, @Body() dto: SimulateTransferDto) {
    return this.mockTransfers.simulate(id, userId, dto.scenario ?? 'exact');
  }
}

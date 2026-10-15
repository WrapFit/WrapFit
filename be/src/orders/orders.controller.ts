import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ACCESS_COOKIE, CurrentUser } from '../common';
import { CreateSampleOrderDto } from './dto/create-sample-order.dto';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@ApiCookieAuth(ACCESS_COOKIE)
@Controller('orders')
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  @Post('sample')
  @ApiOperation({ summary: 'Đặt in mẫu thử (Sample Box 1–5 chiếc) chuyển tới xưởng đối tác' })
  createSample(@CurrentUser('id') userId: string, @Body() dto: CreateSampleOrderDto) {
    return this.service.createSampleOrder(userId, dto);
  }

  @Get('my-orders')
  @ApiOperation({ summary: 'Danh sách đơn đặt in & in mẫu thử của tôi' })
  listMine(@CurrentUser('id') userId: string) {
    return this.service.listUserOrders(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết đơn đặt in mẫu thử' })
  get(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.getOrder(id, userId);
  }
}

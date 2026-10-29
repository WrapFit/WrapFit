import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ACCESS_COOKIE, AuthUser, CurrentUser, Roles } from '../common';
import { CreateSampleOrderDto } from './dto/create-sample-order.dto';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@ApiCookieAuth(ACCESS_COOKIE)
@Controller('orders')
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  @Post('sample')
  @ApiOperation({ summary: 'Đặt in mẫu thử (Sample Box 1–10 chiếc) chuyển tới xưởng đối tác; đơn mới chờ thanh toán' })
  createSample(@CurrentUser('id') userId: string, @Body() dto: CreateSampleOrderDto) {
    return this.service.createSampleOrder(userId, dto);
  }

  @Get('my-orders')
  @ApiOperation({ summary: 'Danh sách đơn đặt in & in mẫu thử của tôi' })
  listMine(@CurrentUser('id') userId: string) {
    return this.service.listUserOrders(userId);
  }

  @Get()
  @Roles(Role.ADMIN, Role.PRINT_SHOP)
  @ApiOperation({ summary: 'Đơn cần xử lý: mọi xưởng (ADMIN) hoặc xưởng của tài khoản (PRINT_SHOP)' })
  listForStaff(@CurrentUser() actor: AuthUser, @Query() query: ListOrdersQueryDto) {
    return this.service.listForStaff(actor, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết đơn đặt in mẫu thử (chỉ chủ đơn)' })
  get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
    return this.service.getOrder(id, userId);
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN, Role.PRINT_SHOP)
  @ApiOperation({ summary: 'Chuyển trạng thái đơn (ADMIN, PRINT_SHOP của đúng xưởng); bước sai → 409' })
  changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthUser,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.service.changeStatus(id, actor, dto);
  }
}

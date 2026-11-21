import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ACCESS_COOKIE, AuthUser, CurrentUser, Roles } from '../common';
import { CreateSampleBundleDto } from './dto/create-sample-bundle.dto';
import { CreateSampleOrderDto } from './dto/create-sample-order.dto';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto';
import { MatchSampleShopsDto } from './dto/match-sample-shops.dto';
import { OrderMessageDto, ReassignOrderDto, RejectOrderDto } from './dto/order-flow.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderMessagesService } from './order-messages.service';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@ApiCookieAuth(ACCESS_COOKIE)
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly service: OrdersService,
    private readonly messages: OrderMessagesService,
  ) {}

  @Post('sample')
  @ApiOperation({ summary: 'Đặt in mẫu thử (Sample Box 1–10 chiếc) chuyển tới xưởng đối tác; đơn mới chờ thanh toán' })
  createSample(@CurrentUser('id') userId: string, @Body() dto: CreateSampleOrderDto) {
    return this.service.createSampleOrder(userId, dto);
  }

  @Post('sample/match')
  @ApiOperation({
    summary: 'Xưởng in được các thiết kế này, xếp hạng theo giá, ngày nhận, chất lượng, khoảng cách (docs/19 G.3); kèm xưởng bị loại và lý do',
  })
  matchSample(@CurrentUser('id') userId: string, @Body() dto: MatchSampleShopsDto) {
    return this.service.matchSampleShops(userId, dto);
  }

  @Post('sample/bundle')
  @ApiOperation({ summary: 'Đặt in mẫu nhiều thiết kế trong một đơn: một hóa đơn, thanh toán một lần' })
  createSampleBundle(@CurrentUser('id') userId: string, @Body() dto: CreateSampleBundleDto) {
    return this.service.createSampleBundle(userId, dto);
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
  @ApiOperation({ summary: 'Chi tiết đơn: chủ đơn, tài khoản của xưởng nhận đơn, admin; mỗi bên thấy phần của mình (docs/19 G.4)' })
  get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthUser) {
    return this.service.getOrder(id, actor);
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN, Role.PRINT_SHOP)
  @ApiOperation({
    summary: 'Chuyển trạng thái đơn (ADMIN, PRINT_SHOP của đúng xưởng); SHIPPED cần hãng + mã vận đơn, xưởng báo DELIVERED cần ghi bằng chứng; bước sai → 409',
  })
  changeStatus(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthUser, @Body() dto: UpdateOrderStatusDto) {
    return this.service.changeStatus(id, actor, dto);
  }

  @Post(':id/accept')
  @Roles(Role.ADMIN, Role.PRINT_SHOP)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xưởng nhận đơn đã thanh toán (docs/19 BR-A8); từ đây khách thấy số điện thoại xưởng' })
  accept(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthUser) {
    return this.service.accept(id, actor);
  }

  @Post(':id/reject')
  @Roles(Role.PRINT_SHOP)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xưởng từ chối đơn chưa nhận, kèm lý do; admin chuyển đơn sang xưởng khác' })
  reject(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthUser, @Body() dto: RejectOrderDto) {
    return this.service.reject(id, actor, dto.reason);
  }

  @Patch(':id/shop')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Admin chuyển đơn đã thanh toán, chưa xưởng nào nhận, sang xưởng khác (phí nền tảng theo xưởng mới)' })
  reassign(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthUser, @Body() dto: ReassignOrderDto) {
    return this.service.reassign(id, actor, dto);
  }

  @Post(':id/received')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Khách xác nhận đã nhận hàng: đơn đang giao chuyển sang đã giao' })
  received(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthUser) {
    return this.service.confirmReceived(id, actor);
  }

  @Get(':id/print-files')
  @ApiOperation({ summary: 'File in đã xuất của đúng phiên bản trong đơn, link tải 15 phút (xưởng, admin, chủ đơn)' })
  printFiles(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthUser) {
    return this.service.printFiles(id, actor);
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'Tin nhắn trong đơn (docs/19 G.4); đọc là đánh dấu đã đọc cho phía người xem' })
  listMessages(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthUser) {
    return this.messages.list(id, actor);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Gửi tin nhắn trong đơn; `warning` khi có số điện thoại / số tài khoản lúc xưởng chưa nhận đơn' })
  postMessage(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthUser, @Body() dto: OrderMessageDto) {
    return this.messages.post(id, actor, dto.body);
  }
}

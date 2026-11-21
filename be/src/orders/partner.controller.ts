import { Body, Controller, ForbiddenException, Get, Patch } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrderStatus, PrintShopMemberRole, Role } from '@prisma/client';
import { ACCESS_COOKIE, AuthUser, CurrentUser, Roles } from '../common';
import { PrintShopsService, toPublicShop } from '../print-shops';
import { PrismaService } from '../shared/prisma';
import { UpdatePartnerShopDto } from './dto/order-flow.dto';
import { OrdersService } from './orders.service';

/**
 * The partner portal of a print shop account (docs/19 G.1, level 1): its shop, the counters of its queue, and what the
 * OWNER may change itself (pause, capacity, contact). Orders themselves go through /orders like for the admin.
 */
@ApiTags('partner')
@ApiCookieAuth(ACCESS_COOKIE)
@Controller('partner')
export class PartnerController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
    private readonly printShops: PrintShopsService,
  ) {}

  @Get('me')
  @Roles(Role.PRINT_SHOP)
  @ApiOperation({ summary: 'Xưởng của tài khoản và vai trò trong xưởng (OWNER thấy tỷ lệ phí nền tảng)' })
  async me(@CurrentUser() actor: AuthUser) {
    const member = await this.orders.memberOf(actor.id);
    const shop = (await this.printShops.findRow(member.printShopId))!;
    const owner = member.role === PrintShopMemberRole.OWNER;
    return {
      role: member.role,
      shop: {
        ...toPublicShop(shop),
        phone: shop.phone,
        zalo: shop.zalo,
        contactEmail: shop.contactEmail,
        dailyCapacity: shop.dailyCapacity,
        ...(owner ? { platformFeeBps: shop.platformFeeBps } : {}),
      },
    };
  }

  @Get('summary')
  @Roles(Role.PRINT_SHOP)
  @ApiOperation({ summary: 'Số đơn theo việc cần làm của xưởng: chờ nhận, quá hạn nhận, đang in, đang giao, tin chưa đọc' })
  async summary(@CurrentUser() actor: AuthUser) {
    const { printShopId } = await this.orders.memberOf(actor.id);
    const now = new Date();
    const [waiting, overdue, inProduction, shipped, active] = await Promise.all([
      this.prisma.order.count({ where: { printShopId, status: OrderStatus.PAID, acceptedAt: null, rejectedAt: null } }),
      this.prisma.order.count({ where: { printShopId, status: OrderStatus.PAID, acceptedAt: null, rejectedAt: null, acceptDeadline: { lt: now } } }),
      this.prisma.order.count({ where: { printShopId, status: OrderStatus.IN_PRODUCTION } }),
      this.prisma.order.count({ where: { printShopId, status: OrderStatus.SHIPPED } }),
      this.prisma.order.findMany({ where: { printShopId, status: { not: OrderStatus.PENDING_PAYMENT } }, select: { id: true }, take: 500, orderBy: { createdAt: 'desc' } }),
    ]);
    const toStart = await this.prisma.order.count({ where: { printShopId, status: OrderStatus.PAID, acceptedAt: { not: null } } });
    const unread = await this.orders.unreadCounts(active.map((row) => row.id), 'SHOP');
    return {
      waitingAccept: waiting,
      overdueAccept: overdue,
      toStart,
      inProduction,
      shipped,
      unreadMessages: Object.values(unread).reduce((sum, n) => sum + n, 0),
    };
  }

  @Patch('shop')
  @Roles(Role.PRINT_SHOP)
  @ApiOperation({ summary: 'OWNER: tạm nghỉ đến ngày, công suất, số điện thoại, Zalo (docs/19 BR-G11)' })
  async updateShop(@CurrentUser() actor: AuthUser, @Body() dto: UpdatePartnerShopDto) {
    const member = await this.orders.memberOf(actor.id);
    if (member.role !== PrintShopMemberRole.OWNER) throw new ForbiddenException('Chỉ chủ xưởng đổi được thông tin xưởng');
    await this.printShops.update(member.printShopId, dto);
    return this.me(actor);
  }
}

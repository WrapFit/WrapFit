import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ACCESS_COOKIE, CurrentUser, Roles } from '../common';
import { BillingService } from './billing.service';
import { BillingDetailsDto } from './dto/billing-details.dto';
import { GrantCreditsDto } from './dto/grant-credits.dto';
import { XuHistoryQueryDto } from './dto/xu-history-query.dto';
import { XuWalletService } from './xu-wallet.service';

@ApiTags('billing')
@ApiCookieAuth(ACCESS_COOKIE)
@Controller('billing')
export class BillingController {
  constructor(
    private readonly billing: BillingService,
    private readonly xuWallet: XuWalletService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'My plan, its limits, export credits, xu wallet, and my live subscription' })
  me(@CurrentUser('id') userId: string) {
    return this.billing.me(userId);
  }

  @Get('details')
  @ApiOperation({ summary: 'Thông tin xuất hoá đơn VAT của tôi (chuỗi rỗng khi chưa điền)' })
  details(@CurrentUser('id') userId: string) {
    return this.billing.details(userId);
  }

  @Put('details')
  @ApiOperation({ summary: 'Lưu thông tin xuất hoá đơn VAT (cả ba trường rỗng = xoá)' })
  saveDetails(@CurrentUser('id') userId: string, @Body() dto: BillingDetailsDto) {
    return this.billing.saveDetails(userId, dto);
  }

  @Get('xu/history')
  @ApiOperation({ summary: 'Xu granted and spent, newest first (`nextBefore` continues the list)' })
  xuHistory(@CurrentUser('id') userId: string, @Query() query: XuHistoryQueryDto) {
    return this.xuWallet.history(userId, query);
  }
}

@ApiTags('billing')
@ApiCookieAuth(ACCESS_COOKIE)
@Controller('admin/users')
export class AdminCreditsController {
  constructor(private readonly billing: BillingService) {}

  @Post(':id/credits')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Grant export credits to a user by hand (admin, e.g. demo accounts)' })
  grant(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GrantCreditsDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.billing.grantByAdmin(id, dto, actorId);
  }
}

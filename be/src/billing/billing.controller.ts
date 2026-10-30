import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ACCESS_COOKIE, CurrentUser, Roles } from '../common';
import { BillingService } from './billing.service';
import { GrantCreditsDto } from './dto/grant-credits.dto';

@ApiTags('billing')
@ApiCookieAuth(ACCESS_COOKIE)
@Controller('billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('me')
  @ApiOperation({ summary: 'My plan, its limits, export credit balance and lots, and my live subscription' })
  me(@CurrentUser('id') userId: string) {
    return this.billing.me(userId);
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

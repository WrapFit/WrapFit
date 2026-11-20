import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { PROVINCES } from '@wrapfit/shared';
import { ACCESS_COOKIE, Public, Roles } from '../common';
import { CreatePrintShopDto, UpdatePrintShopDto } from './dto/admin-print-shop.dto';
import { PrintShopsService } from './print-shops.service';

@ApiTags('print-shops')
@Controller('print-shops')
export class PrintShopsController {
  constructor(private readonly service: PrintShopsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Partner print shops a customer may see (taking orders or paused); no contact details' })
  @ApiQuery({ name: 'city', required: false })
  list(@Query('city') city?: string) {
    return this.service.list(city);
  }

  @Get('provinces')
  @Public()
  @ApiOperation({ summary: 'Provinces of a structured shipping address (34 since 2025-07-01)' })
  provinces() {
    return PROVINCES.map(({ code, name, region }) => ({ code, name, region }));
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Detail of a partner print shop' })
  get(@Param('id') id: string) {
    return this.service.get(id);
  }
}

@ApiTags('print-shops')
@ApiCookieAuth(ACCESS_COOKIE)
@Controller('admin/print-shops')
export class AdminPrintShopsController {
  constructor(private readonly service: PrintShopsService) {}

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Every shop with contact, contract fee rate and current queue (admin)' })
  list() {
    return this.service.listForAdmin();
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Add a shop (admin); it starts REVIEW unless a status is sent' })
  create(@Body() dto: CreatePrintShopDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Change a shop (admin): status, capabilities, delivery area, fee rate. Orders keep the rate they were placed with' })
  update(@Param('id') id: string, @Body() dto: UpdatePrintShopDto) {
    return this.service.update(id, dto);
  }
}

import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PrintShopsService } from './print-shops.service';

@ApiTags('print-shops')
@Controller('print-shops')
export class PrintShopsController {
  constructor(private readonly service: PrintShopsService) {}

  @Get()
  @ApiOperation({ summary: 'List partner print shops (B1/B2 sheets, digital flatbed cutting, sample turnaround)' })
  @ApiQuery({ name: 'city', required: false })
  list(@Query('city') city?: string) {
    return this.service.list(city);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail of a partner print shop' })
  get(@Param('id') id: string) {
    const shop = this.service.get(id);
    if (!shop) throw new NotFoundException('Print shop partner not found');
    return shop;
  }
}

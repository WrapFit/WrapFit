import { Module } from '@nestjs/common';
import { PrintShopsController } from './print-shops.controller';
import { PrintShopsService } from './print-shops.service';

@Module({
  controllers: [PrintShopsController],
  providers: [PrintShopsService],
  exports: [PrintShopsService],
})
export class PrintShopsModule {}

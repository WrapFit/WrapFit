import { Module } from '@nestjs/common';
import { AdminPrintShopsController, PrintShopsController } from './print-shops.controller';
import { PrintShopsService } from './print-shops.service';

@Module({
  controllers: [PrintShopsController, AdminPrintShopsController],
  providers: [PrintShopsService],
  exports: [PrintShopsService],
})
export class PrintShopsModule {}

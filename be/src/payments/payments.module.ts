import { Module } from '@nestjs/common';
import { BillingCoreModule } from '../billing';
import { OrdersModule } from '../orders';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [BillingCoreModule, OrdersModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
